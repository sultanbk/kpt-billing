import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initializeDatabase, closeDatabase } from './database/connection'
import { registerProductIpc } from './ipc/product.ipc'
import { registerBillingIpc } from './ipc/billing.ipc'
import { registerSettingsIpc } from './ipc/settings.ipc'
import { registerExportIpc } from './ipc/export.ipc'
import { registerSupplierPurchaseIpc } from './ipc/supplier-purchase.ipc'
import { registerLicenseIpc } from './ipc/licenseHandlers'
import { licenseManager } from './license/LicenseManager'
import { backupService } from './services/backup.service'
import { settingsRepo } from './database/repositories/settings.repo'
import { thermalPrinterService } from './services/thermal-printer.service'
import { registerUpdaterIpc } from './ipc/updater.ipc'
import { initAutoUpdater, disposeAutoUpdater } from './services/auto-updater.service'
import log from 'electron-log'

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

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

  // Run immediate backup on startup
  setTimeout(async () => {
    try {
      log.info('Running immediate startup backup...')
      await backupService.createBackup()
      const retention = parseInt(settingsRepo.get('backupRetention') || '30')
      backupService.cleanOldBackups(retention)
    } catch (err) {
      log.error('Immediate startup backup failed:', err)
    }
  }, 2000)

  backupInterval = setInterval(async () => {
    log.info('Running scheduled backup...')
    await backupService.createBackup()
    const retention = parseInt(settingsRepo.get('backupRetention') || '30')
    backupService.cleanOldBackups(retention)
  }, intervalMs)
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.krishnapriyatextiles.billing')

  app.on('browser-window-created', (_, window) => {
    // Custom window shortcuts logic to avoid F12 conflict with system shortcuts help drawer
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown') {
        // Prevent F12 from opening DevTools to avoid conflict with the system shortcuts help drawer
        if (input.code === 'F12') {
          event.preventDefault()
        }

        // Prevent default zoom shortcuts to preserve UI layout scaling
        if (input.code === 'Minus' && (input.control || input.meta)) {
          event.preventDefault()
        }
        if (input.code === 'Equal' && input.shift && (input.control || input.meta)) {
          event.preventDefault()
        }

        // Production environment protections: prevent reload and devtools
        if (app.isPackaged) {
          if (input.code === 'KeyR' && (input.control || input.meta)) {
            event.preventDefault()
          }
          if (
            input.code === 'KeyI' &&
            ((input.alt && input.meta) || (input.control && input.shift))
          ) {
            event.preventDefault()
          }
        }
      }
    })
  })

  // Initialize database
  log.info('Starting KPT Billing...')
  initializeDatabase()
  await licenseManager.initialize()

  // Register IPC handlers
  registerLicenseIpc()
  registerProductIpc()
  registerBillingIpc()
  registerSettingsIpc()
  registerSupplierPurchaseIpc()
  registerUpdaterIpc()
  registerExportIpc()

  // Set up printer from saved settings
  const printerName = settingsRepo.get('receiptPrinterName')
  if (printerName) {
    thermalPrinterService.setPrinter(printerName)
  }

  // Setup auto-backup
  setupAutoBackup()

  createWindow()

  // Initialise auto-updater (checks GitHub Releases in background)
  initAutoUpdater()

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
  disposeAutoUpdater()
  closeDatabase()
})
