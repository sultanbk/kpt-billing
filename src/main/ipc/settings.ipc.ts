// ============================================================================
// KPT Billing - Settings & Backup IPC Handlers (secured with validation & audit)
// ============================================================================
import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { createHash, pbkdf2Sync, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { settingsRepo } from '../database/repositories/settings.repo'
import { getSqlite } from '../database/connection'
import { backupService } from '../services/backup.service'
import { cloudBackupService } from '../services/cloud-backup.service'
import { thermalPrinterService } from '../services/thermal-printer.service'
import { writeAuditLog } from '../database/audit'
import { setCurrentUser } from './ipc-context'
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

const PIN_HASH_PREFIX = 'scrypt'
const PIN_SCRYPT_KEYLEN = 64

function hashPin(
  pin: string,
  salt: string = randomBytes(16).toString('hex')
): {
  hash: string
  salt: string
} {
  return {
    hash: `${PIN_HASH_PREFIX}:${scryptSync(pin, salt, PIN_SCRYPT_KEYLEN).toString('hex')}`,
    salt
  }
}

function verifyPinHash(pin: string, storedPin: string, salt: string | null): boolean {
  if (salt) {
    if (storedPin.startsWith(`${PIN_HASH_PREFIX}:`)) {
      const computed = hashPin(pin, salt).hash
      const storedBuffer = Buffer.from(storedPin)
      const computedBuffer = Buffer.from(computed)
      return (
        storedBuffer.length === computedBuffer.length &&
        timingSafeEqual(storedBuffer, computedBuffer)
      )
    }

    // Legacy salted hashes created before the scrypt migration used PBKDF2.
    const legacyPbkdf2 = pbkdf2Sync(pin, salt, 1000, 64, 'sha512').toString('hex')
    const storedBuffer = Buffer.from(storedPin)
    const legacyBuffer = Buffer.from(legacyPbkdf2)
    return (
      storedBuffer.length === legacyBuffer.length && timingSafeEqual(storedBuffer, legacyBuffer)
    )
  }

  const hashedLegacy = createHash('sha256').update(pin).digest('hex')
  return storedPin === hashedLegacy || storedPin === pin
}

export function registerSettingsIpc(): void {
  // Settings
  safeHandle('settings:get', (_event, key) => {
    return settingsRepo.get(validate(settingsKeySchema, key))
  })

  safeHandle('settings:set', (_event, key, value) => {
    const validKey = validate(settingsKeySchema, key)
    const validValue = validate(settingsValueSchema, value)
    settingsRepo.set(validKey, validValue)
    if (validKey === 'receiptPrinterName') {
      thermalPrinterService.setPrinter(validValue)
    }
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
    if (typeof validated.receiptPrinterName === 'string') {
      thermalPrinterService.setPrinter(validated.receiptPrinterName)
    }
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

  safeHandle('printer:diagnostics', async (_event, name?) => {
    const validName = name ? validate(z.string().max(200), name).trim() : ''
    const selectedPrinter = validName || (settingsRepo.get('receiptPrinterName') || '').trim()
    const configuredPrinter = thermalPrinterService.getConfiguredPrinterName().trim()
    const availablePrinters = await thermalPrinterService.getAvailablePrinters()
    const normalizedAvailable = availablePrinters.map((p) => p.trim().toLowerCase())
    const selectedInAvailable = selectedPrinter
      ? normalizedAvailable.includes(selectedPrinter.toLowerCase())
      : false
    const windowsDetails = selectedPrinter
      ? await thermalPrinterService.getWindowsPrinterDetails(selectedPrinter)
      : null

    const checks = {
      printerSelected: selectedPrinter.length > 0,
      serviceBoundToSelection:
        selectedPrinter.length > 0 &&
        configuredPrinter.length > 0 &&
        selectedPrinter.toLowerCase() === configuredPrinter.toLowerCase(),
      selectedExistsInSystem: selectedInAvailable,
      windowsReportsOffline: windowsDetails?.workOffline === true
    }

    const recommendations: string[] = []
    if (!checks.printerSelected) {
      recommendations.push('Select a receipt printer in Settings and click Save.')
    }
    if (checks.printerSelected && !checks.selectedExistsInSystem) {
      recommendations.push(
        'Selected printer is not in Windows printer list. Re-select exact printer name.'
      )
    }
    if (checks.windowsReportsOffline) {
      recommendations.push(
        'Windows reports this printer as offline. Turn it on and reconnect USB/LAN.'
      )
    }
    if (windowsDetails?.driverName && !/tvs|epson|esc|pos/i.test(windowsDetails.driverName)) {
      recommendations.push(
        'Driver may not be ESC/POS compatible. Use TVS/Epson ESC-POS driver if available.'
      )
    }

    return {
      selectedPrinter,
      configuredPrinter,
      availablePrinters,
      windowsDetails,
      checks,
      recommendations,
      checkedAt: new Date().toISOString()
    }
  })

  safeHandle('printer:printReceipt', async (_event, billId) => {
    const id = validate(idSchema, billId)
    const { billRepo } = await import('../database/repositories/bill.repo')
    const bill = billRepo.getById(id)
    if (!bill) return false
    const shopInfo = settingsRepo.getAll()
    return thermalPrinterService.printReceipt(bill, shopInfo)
  })

  safeHandle('printer:printPaymentDetails', async (_event, paymentMethod) => {
    const validPaymentMethod = validate(
      z.object({
        id: z.string(),
        type: z.enum(['bank', 'upi', 'scanner']),
        name: z.string().min(1).max(100),
        details: z
          .object({
            bankName: z.string().max(100).optional(),
            accountNo: z.string().max(50).optional(),
            ifscCode: z.string().max(20).optional(),
            branch: z.string().max(100).optional(),
            upiVpa: z.string().max(100).optional(),
            payeeName: z.string().max(100).optional(),
            scannerType: z.string().max(50).optional(),
            accountName: z.string().max(100).optional()
          })
          .optional()
      }),
      paymentMethod
    )
    const shopInfo = settingsRepo.getAll()
    return thermalPrinterService.printPaymentDetails(validPaymentMethod, shopInfo)
  })

  ipcMain.handle('printer:downloadPaymentDetailsPdf', async (_event, paymentMethod) => {
    const validPaymentMethod = validate(
      z.object({
        id: z.string(),
        type: z.enum(['bank', 'upi', 'scanner']),
        name: z.string().min(1).max(100),
        details: z
          .object({
            bankName: z.string().max(100).optional(),
            accountNo: z.string().max(50).optional(),
            ifscCode: z.string().max(20).optional(),
            branch: z.string().max(100).optional(),
            upiVpa: z.string().max(100).optional(),
            payeeName: z.string().max(100).optional(),
            scannerType: z.string().max(50).optional(),
            accountName: z.string().max(100).optional()
          })
          .optional()
      }),
      paymentMethod
    )
    const shopInfo = settingsRepo.getAll()
    const pdfBuffer = await thermalPrinterService.generatePaymentDetailsPdfBuffer(
      validPaymentMethod,
      shopInfo
    )
    if (!pdfBuffer) return false

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Download Thermal Slip PDF',
      defaultPath: `Thermal_Slip_${validPaymentMethod.name.replace(/\s+/g, '_')}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })

    if (canceled || !filePath) return false

    const fs = await import('fs')
    fs.writeFileSync(filePath, pdfBuffer)
    return true
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
    const config = cloudBackupService.getConfig()
    return {
      clientId: config?.clientId || '',
      clientSecret: config?.clientSecret || ''
    }
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

    // Fetch all active users
    const users = db.prepare('SELECT * FROM users WHERE is_active = 1').all() as Array<{
      id: number
      name: string
      pin: string
      salt: string | null
      role: string
    }>

    let authenticatedUser: (typeof users)[0] | null = null

    for (const u of users) {
      if (verifyPinHash(validPin, u.pin, u.salt)) {
        if (!u.salt || !u.pin.startsWith(`${PIN_HASH_PREFIX}:`)) {
          const migrated = hashPin(validPin)
          db.prepare('UPDATE users SET pin = ?, salt = ? WHERE id = ?').run(
            migrated.hash,
            migrated.salt,
            u.id
          )
          u.pin = migrated.hash
          u.salt = migrated.salt
        }
        authenticatedUser = u
        break
      }
    }

    if (authenticatedUser) {
      // Reset attempts on success
      pinAttempts = 0
      pinLockoutUntil = 0
      // Set IPC context so all subsequent audit entries get user attribution
      setCurrentUser({
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        role: authenticatedUser.role
      })
      writeAuditLog({
        userId: authenticatedUser.id,
        userName: authenticatedUser.name,
        action: 'login',
        entityType: 'auth'
      })
      return {
        success: true,
        user: {
          id: authenticatedUser.id,
          name: authenticatedUser.name,
          role: authenticatedUser.role
        }
      }
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

    const users = db.prepare('SELECT * FROM users WHERE is_active = 1').all() as Array<{
      id: number
      pin: string
      salt: string | null
    }>

    let targetUser: (typeof users)[0] | null = null

    for (const u of users) {
      if (verifyPinHash(validCurrent, u.pin, u.salt)) {
        targetUser = u
        break
      }
    }

    if (!targetUser) return { success: false, error: 'Current PIN is incorrect' }
    if (validNew.length < 4) return { success: false, error: 'PIN must be at least 4 digits' }

    const next = hashPin(validNew)

    db.prepare('UPDATE users SET pin = ?, salt = ? WHERE id = ?').run(
      next.hash,
      next.salt,
      targetUser.id
    )
    writeAuditLog({ userId: targetUser.id, action: 'change_pin', entityType: 'auth' })
    return { success: true }
  })

  ipcMain.handle('cloud:authenticate', async () => {
    try {
      const ok = await cloudBackupService.authenticate()
      return ok ? { success: true } : { success: false, error: 'Authentication cancelled' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: msg }
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
