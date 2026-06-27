import { ipcMain } from 'electron'
import { getUpdateStatus, checkForUpdates, quitAndInstall } from '../services/auto-updater.service'
import log from 'electron-log'

/**
 * Register IPC handlers for the auto-updater.
 *
 * Channels:
 *   updater:getStatus  → returns current UpdateStatus
 *   updater:check      → triggers a manual update check
 *   updater:install     → quits and installs the downloaded update
 *
 * The updater service also pushes `updater:status-changed` events to the renderer.
 */
export function registerUpdaterIpc(): void {
  ipcMain.handle('updater:getStatus', () => {
    return getUpdateStatus()
  })

  ipcMain.handle('updater:check', async () => {
    log.info('[updater-ipc] Manual update check requested')
    return await checkForUpdates()
  })

  ipcMain.handle('updater:install', () => {
    log.info('[updater-ipc] Install requested')
    quitAndInstall()
  })
}
