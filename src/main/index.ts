import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initializeDatabase, closeDatabase } from './database/connection'
import { registerProductIpc } from './ipc/product.ipc'
import { registerBillingIpc } from './ipc/billing.ipc'
import { registerSettingsIpc } from './ipc/settings.ipc'
import { registerExportIpc } from './ipc/export.ipc'
import { registerSupplierPurchaseIpc } from './ipc/supplier-purchase.ipc'
import { backupService } from './services/backup.service'
import { settingsRepo } from './database/repositories/settings.repo'
import { thermalPrinterService } from './services/thermal-printer.service'
import log from 'electron-log'

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

// ---- Global error handlers ----
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason)
})

let backupInterval: NodeJS.Timeout | null = null

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'KPT Billing - Krishnapriya Textiles',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function setupAutoBackup(): void {
  // Get backup frequency from settings
  const freq = settingsRepo.get('backupFrequency') || '4hours'
  const intervalMs = freq === 'hourly' ? 3600000 : freq === '4hours' ? 14400000 : 86400000

  if (backupInterval) clearInterval(backupInterval)

  backupInterval = setInterval(async () => {
    log.info('Running scheduled backup...')
    await backupService.createBackup()
    const retention = parseInt(settingsRepo.get('backupRetention') || '30')
    backupService.cleanOldBackups(retention)
  }, intervalMs)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.krishnapriyatextiles.billing')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database
  log.info('Starting KPT Billing...')
  initializeDatabase()

  // Register IPC handlers
  registerProductIpc()
  registerBillingIpc()
  registerSettingsIpc()
  registerSupplierPurchaseIpc()
  registerExportIpc()

  // Set up printer from saved settings
  const printerName = settingsRepo.get('receiptPrinterName')
  if (printerName) {
    thermalPrinterService.setPrinter(printerName)
  }

  // Setup auto-backup
  setupAutoBackup()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  log.info('Shutting down KPT Billing...')
  if (backupInterval) clearInterval(backupInterval)
  closeDatabase()
})
