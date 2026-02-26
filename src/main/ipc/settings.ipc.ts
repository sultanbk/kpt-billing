// ============================================================================
// KPT Billing - Settings & Backup IPC Handlers
// ============================================================================
import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { createHash } from 'crypto'
import { settingsRepo } from '../database/repositories/settings.repo'
import { getSqlite } from '../database/connection'
import { backupService } from '../services/backup.service'
import { cloudBackupService } from '../services/cloud-backup.service'
import { thermalPrinterService } from '../services/thermal-printer.service'

export function registerSettingsIpc(): void {
  // Settings
  ipcMain.handle('settings:get', (_event, key: string) => {
    return settingsRepo.get(key)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    settingsRepo.set(key, value)
    return true
  })

  ipcMain.handle('settings:getAll', () => {
    return settingsRepo.getAll()
  })

  ipcMain.handle('settings:setMany', (_event, settings: Record<string, string>) => {
    settingsRepo.setMany(settings)
    return true
  })

  // Backup
  ipcMain.handle('backup:create', async (_event, customPath?: string) => {
    return backupService.createBackup(customPath)
  })

  ipcMain.handle('backup:list', () => {
    return backupService.listBackups()
  })

  ipcMain.handle('backup:clean', (_event, retention?: number) => {
    backupService.cleanOldBackups(retention)
    return true
  })

  ipcMain.handle('backup:getDir', () => {
    return backupService.getBackupDir()
  })

  ipcMain.handle('backup:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Backup Folder'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('backup:restore', async () => {
    // Let user pick a .sql backup file
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
    const restoreResult = await backupService.restoreFromSqlDump(filePath)

    // If restore succeeded, reload the renderer window
    if (restoreResult.success) {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.webContents.reload()
      }
    }

    return restoreResult
  })

  // Printers
  ipcMain.handle('printer:getAvailable', async () => {
    return thermalPrinterService.getAvailablePrinters()
  })

  ipcMain.handle('printer:setReceipt', (_event, name: string) => {
    thermalPrinterService.setPrinter(name)
    settingsRepo.set('receiptPrinterName', name)
    return true
  })

  ipcMain.handle('printer:testPrint', async () => {
    return thermalPrinterService.testPrint()
  })

  ipcMain.handle('printer:printReceipt', async (_event, billId: number) => {
    const { billRepo } = await import('../database/repositories/bill.repo')
    const bill = billRepo.getById(billId)
    if (!bill) return false
    const shopInfo = settingsRepo.getAll()
    return thermalPrinterService.printReceipt(bill, shopInfo)
  })

  // File dialogs
  ipcMain.handle('dialog:openFile', async (_event, options) => {
    const result = await dialog.showOpenDialog(options)
    return result.canceled ? null : result.filePaths
  })

  // Open folder in explorer
  ipcMain.handle('dialog:openFolder', (_event, folderPath: string) => {
    shell.openPath(folderPath)
    return true
  })

  // ---- Cloud Backup (Google Drive) ----
  ipcMain.handle('cloud:getStatus', () => {
    return cloudBackupService.getStatus()
  })

  ipcMain.handle('cloud:saveConfig', (_event, clientId: string, clientSecret: string) => {
    cloudBackupService.saveConfig(clientId, clientSecret)
    return true
  })

  ipcMain.handle('cloud:getConfig', () => {
    return cloudBackupService.getConfig()
  })

  // ---- Auth / PIN ----
  ipcMain.handle('auth:verifyPin', (_event, pin: string) => {
    const db = getSqlite()
    const hashedPin = createHash('sha256').update(pin).digest('hex')
    // Support both hashed and legacy plaintext PINs for migration
    let user = db.prepare("SELECT * FROM users WHERE pin = ? AND is_active = 1").get(hashedPin) as { id: number; name: string; role: string } | undefined
    if (!user) {
      // Fallback: check plaintext PIN (for users who haven't migrated)
      user = db.prepare("SELECT * FROM users WHERE pin = ? AND is_active = 1").get(pin) as { id: number; name: string; role: string } | undefined
      if (user) {
        // Auto-migrate: hash the plaintext PIN
        db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(hashedPin, user.id)
      }
    }
    if (user) {
      return { success: true, user: { id: user.id, name: user.name, role: user.role } }
    }
    return { success: false }
  })

  ipcMain.handle('auth:changePin', (_event, currentPin: string, newPin: string) => {
    const db = getSqlite()
    const hashedCurrent = createHash('sha256').update(currentPin).digest('hex')
    // Support both hashed and legacy plaintext PINs
    let user = db.prepare("SELECT * FROM users WHERE pin = ? AND is_active = 1").get(hashedCurrent) as { id: number } | undefined
    if (!user) {
      user = db.prepare("SELECT * FROM users WHERE pin = ? AND is_active = 1").get(currentPin) as { id: number } | undefined
    }
    if (!user) return { success: false, error: 'Current PIN is incorrect' }
    if (newPin.length < 4) return { success: false, error: 'PIN must be at least 4 digits' }
    const hashedNew = createHash('sha256').update(newPin).digest('hex')
    db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(hashedNew, user.id)
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

  ipcMain.handle('cloud:disconnect', () => {
    cloudBackupService.disconnect()
    return true
  })

  ipcMain.handle('cloud:backup', async () => {
    return cloudBackupService.backupToCloud()
  })

  ipcMain.handle('cloud:listBackups', async () => {
    return cloudBackupService.listCloudBackups()
  })

  ipcMain.handle('cloud:downloadBackup', async (_event, fileId: string, fileName: string) => {
    return cloudBackupService.downloadBackup(fileId, fileName)
  })
}
