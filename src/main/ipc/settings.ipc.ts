// ============================================================================
// KPT Billing - Settings & Backup IPC Handlers (secured with validation & audit)
// ============================================================================
import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { createHash } from 'crypto'
import { settingsRepo } from '../database/repositories/settings.repo'
import { getSqlite } from '../database/connection'
import { backupService } from '../services/backup.service'
import { cloudBackupService } from '../services/cloud-backup.service'
import { thermalPrinterService } from '../services/thermal-printer.service'
import { writeAuditLog } from '../database/audit'
import { safeHandle, validate } from './ipc-guard'
import {
  idSchema,
  settingsKeySchema,
  settingsValueSchema,
  settingsManySchema,
  pinSchema
} from './validation'
import { z } from 'zod'
import log from 'electron-log'

// ---- Brute-force protection ----
const PIN_MAX_ATTEMPTS = 5
const PIN_LOCKOUT_MS = 5 * 60 * 1000 // 5 minutes
let pinAttempts = 0
let pinLockoutUntil = 0

export function registerSettingsIpc(): void {
  // Settings
  safeHandle('settings:get', (_event, key) => {
    return settingsRepo.get(validate(settingsKeySchema, key))
  })

  safeHandle('settings:set', (_event, key, value) => {
    const validKey = validate(settingsKeySchema, key)
    const validValue = validate(settingsValueSchema, value)
    settingsRepo.set(validKey, validValue)
    writeAuditLog({
      action: 'update',
      entityType: 'settings',
      newValue: { [validKey]: validValue }
    })
    return true
  })

  safeHandle('settings:getAll', () => {
    return settingsRepo.getAll()
  })

  safeHandle('settings:setMany', (_event, settings) => {
    const validated = validate(settingsManySchema, settings)
    settingsRepo.setMany(validated)
    writeAuditLog({ action: 'update', entityType: 'settings', newValue: validated })
    return true
  })

  // Backup
  safeHandle('backup:create', async (_event, customPath?) => {
    const path = customPath ? validate(z.string().max(500), customPath) : undefined
    const result = await backupService.createBackup(path)
    writeAuditLog({ action: 'create', entityType: 'backup', newValue: { path: result.path } })
    return result
  })

  safeHandle('backup:list', () => {
    return backupService.listBackups()
  })

  safeHandle('backup:clean', (_event, retention?) => {
    const validRetention = retention ? validate(z.number().int().positive(), retention) : undefined
    backupService.cleanOldBackups(validRetention)
    return true
  })

  safeHandle('backup:getDir', () => {
    return backupService.getBackupDir()
  })

  // These handlers use Electron dialog APIs which need ipcMain directly
  ipcMain.handle('backup:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Backup Folder'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('backup:restore', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Select Backup File to Restore',
      filters: [
        { name: 'SQL Backup', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (result.canceled || !result.filePaths.length) {
      return { success: false, error: 'No file selected' }
    }
    const filePath = result.filePaths[0]
    writeAuditLog({ action: 'restore', entityType: 'backup', newValue: { path: filePath } })
    const restoreResult = await backupService.restoreFromSqlDump(filePath)

    if (restoreResult.success) {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.webContents.reload()
      }
    }

    return restoreResult
  })

  // Printers
  safeHandle('printer:getAvailable', async () => {
    return thermalPrinterService.getAvailablePrinters()
  })

  safeHandle('printer:setReceipt', (_event, name) => {
    const validName = validate(z.string().min(1).max(200), name)
    thermalPrinterService.setPrinter(validName)
    settingsRepo.set('receiptPrinterName', validName)
    return true
  })

  safeHandle('printer:testPrint', async () => {
    return thermalPrinterService.testPrint()
  })

  safeHandle('printer:printReceipt', async (_event, billId) => {
    const id = validate(idSchema, billId)
    const { billRepo } = await import('../database/repositories/bill.repo')
    const bill = billRepo.getById(id)
    if (!bill) return false
    const shopInfo = settingsRepo.getAll()
    return thermalPrinterService.printReceipt(bill, shopInfo)
  })

  // File dialogs
  ipcMain.handle('dialog:openFile', async (_event, options) => {
    const result = await dialog.showOpenDialog(options)
    return result.canceled ? null : result.filePaths
  })

  safeHandle('dialog:openFolder', (_event, folderPath) => {
    const validPath = validate(z.string().min(1).max(500), folderPath)
    shell.openPath(validPath)
    return true
  })

  // ---- Cloud Backup (Google Drive) ----
  safeHandle('cloud:getStatus', () => {
    return cloudBackupService.getStatus()
  })

  safeHandle('cloud:saveConfig', (_event, clientId, clientSecret) => {
    const validId = validate(z.string().min(1).max(200), clientId)
    const validSecret = validate(z.string().min(1).max(200), clientSecret)
    cloudBackupService.saveConfig(validId, validSecret)
    return true
  })

  safeHandle('cloud:getConfig', () => {
    return cloudBackupService.getConfig()
  })

  // ---- Auth / PIN (with brute-force protection) ----
  safeHandle('auth:verifyPin', (_event, pin) => {
    // Check lockout
    if (pinLockoutUntil > Date.now()) {
      const remaining = Math.ceil((pinLockoutUntil - Date.now()) / 1000)
      log.warn(`PIN verification locked out. ${remaining}s remaining.`)
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${remaining} seconds.`
      }
    }

    const validPin = validate(pinSchema, pin)
    const db = getSqlite()
    const hashedPin = createHash('sha256').update(validPin).digest('hex')
    // Support both hashed and legacy plaintext PINs for migration
    let user = db.prepare('SELECT * FROM users WHERE pin = ? AND is_active = 1').get(hashedPin) as
      | { id: number; name: string; role: string }
      | undefined
    if (!user) {
      // Fallback: check plaintext PIN (for users who haven't migrated)
      user = db.prepare('SELECT * FROM users WHERE pin = ? AND is_active = 1').get(validPin) as
        | { id: number; name: string; role: string }
        | undefined
      if (user) {
        // Auto-migrate: hash the plaintext PIN
        db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(hashedPin, user.id)
      }
    }
    if (user) {
      // Reset attempts on success
      pinAttempts = 0
      pinLockoutUntil = 0
      writeAuditLog({ userId: user.id, userName: user.name, action: 'login', entityType: 'auth' })
      return { success: true, user: { id: user.id, name: user.name, role: user.role } }
    }

    // Failed attempt — increment counter
    pinAttempts++
    if (pinAttempts >= PIN_MAX_ATTEMPTS) {
      pinLockoutUntil = Date.now() + PIN_LOCKOUT_MS
      log.warn(`PIN brute-force lockout triggered after ${pinAttempts} attempts`)
      writeAuditLog({ action: 'lockout', entityType: 'auth', newValue: { attempts: pinAttempts } })
      pinAttempts = 0
      return { success: false, error: 'Too many failed attempts. Locked for 5 minutes.' }
    }

    return { success: false }
  })

  safeHandle('auth:changePin', (_event, currentPin, newPin) => {
    const validCurrent = validate(pinSchema, currentPin)
    const validNew = validate(pinSchema, newPin)
    const db = getSqlite()
    const hashedCurrent = createHash('sha256').update(validCurrent).digest('hex')
    let user = db
      .prepare('SELECT * FROM users WHERE pin = ? AND is_active = 1')
      .get(hashedCurrent) as { id: number } | undefined
    if (!user) {
      user = db.prepare('SELECT * FROM users WHERE pin = ? AND is_active = 1').get(validCurrent) as
        | { id: number }
        | undefined
    }
    if (!user) return { success: false, error: 'Current PIN is incorrect' }
    if (validNew.length < 4) return { success: false, error: 'PIN must be at least 4 digits' }
    const hashedNew = createHash('sha256').update(validNew).digest('hex')
    db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(hashedNew, user.id)
    writeAuditLog({ userId: user.id, action: 'change_pin', entityType: 'auth' })
    return { success: true }
  })

  ipcMain.handle('cloud:authenticate', async () => {
    try {
      return await cloudBackupService.authenticate()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(msg)
    }
  })

  safeHandle('cloud:disconnect', () => {
    cloudBackupService.disconnect()
    return true
  })

  safeHandle('cloud:backup', async () => {
    const result = await cloudBackupService.backupToCloud()
    writeAuditLog({ action: 'cloud_backup', entityType: 'backup' })
    return result
  })

  safeHandle('cloud:listBackups', async () => {
    return cloudBackupService.listCloudBackups()
  })

  safeHandle('cloud:downloadBackup', async (_event, fileId, fileName) => {
    const validFileId = validate(z.string().min(1), fileId)
    const validFileName = validate(z.string().min(1).max(255), fileName)
    return cloudBackupService.downloadBackup(validFileId, validFileName)
  })
}
