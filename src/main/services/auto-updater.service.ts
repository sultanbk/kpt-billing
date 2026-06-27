import { autoUpdater } from 'electron-updater'
import type { UpdateInfo, ProgressInfo } from 'electron-updater'
import { app, BrowserWindow } from 'electron'
import log from 'electron-log'
import type { UpdateStatus } from '../../shared/types'

// Configure electron-updater to use our logger
autoUpdater.logger = log

/**
 * Auto-updater service wrapping electron-updater.
 *
 * - Checks for updates on app launch (after a short delay) and periodically.
 * - Downloads updates silently in the background.
 * - Installs on next natural app restart (autoInstallOnAppQuit).
 * - Broadcasts status changes to all renderer windows via IPC.
 */

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours
const INITIAL_DELAY_MS = 10_000 // 10 seconds after app ready

let status: UpdateStatus = {
  state: 'idle',
  currentVersion: app.getVersion()
}

let checkInterval: NodeJS.Timeout | null = null

// ---- helpers ----

function broadcastStatus(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    try {
      win.webContents.send('updater:status-changed', status)
    } catch {
      // Window may already be destroyed
    }
  }
}

function setStatus(patch: Partial<UpdateStatus>): void {
  status = { ...status, ...patch }
  broadcastStatus()
}

// ---- public API ----

/** Returns the current update status snapshot. */
export function getUpdateStatus(): UpdateStatus {
  return { ...status }
}

/** Trigger a manual update check. Resolves when the check completes. */
export async function checkForUpdates(): Promise<UpdateStatus> {
  if (status.state === 'downloading') {
    log.info('[updater] Download already in progress, skipping check')
    return getUpdateStatus()
  }

  try {
    setStatus({ state: 'checking' })
    await autoUpdater.checkForUpdates()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('[updater] Check for updates failed:', message)
    setStatus({ state: 'error', error: message })
  }
  return getUpdateStatus()
}

/** Quit the app and install the downloaded update. */
export function quitAndInstall(): void {
  log.info('[updater] User requested quit-and-install')
  autoUpdater.quitAndInstall(false, true) // isSilent=false, isForceRunAfter=true
}

/** Initialise the auto-updater. Call once from the main entry point. */
export function initAutoUpdater(): void {
  // Only run in packaged builds — in dev there's nothing to update
  if (!app.isPackaged) {
    log.info('[updater] Skipping auto-updater in dev mode')
    setStatus({ state: 'idle', currentVersion: app.getVersion() })
    return
  }

  // Configure behaviour
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false

  // ---- Event handlers ----

  autoUpdater.on('checking-for-update', () => {
    log.info('[updater] Checking for update…')
    setStatus({ state: 'checking' })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info(`[updater] Update available: ${info.version}`)
    setStatus({
      state: 'available',
      availableVersion: info.version,
      lastChecked: new Date().toISOString()
    })
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    log.info(`[updater] Already on latest version (${info.version})`)
    setStatus({
      state: 'not-available',
      lastChecked: new Date().toISOString()
    })
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    log.info(
      `[updater] Download progress: ${progress.percent.toFixed(1)}% (${(progress.transferred / 1024 / 1024).toFixed(1)} / ${(progress.total / 1024 / 1024).toFixed(1)} MB)`
    )
    setStatus({
      state: 'downloading',
      downloadProgress: {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total
      }
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info(`[updater] Update downloaded: ${info.version} — will install on next restart`)
    setStatus({
      state: 'downloaded',
      availableVersion: info.version,
      lastChecked: new Date().toISOString()
    })
  })

  autoUpdater.on('error', (err: Error) => {
    log.error('[updater] Error:', err.message)
    setStatus({
      state: 'error',
      error: err.message,
      lastChecked: new Date().toISOString()
    })
  })

  // ---- Schedule checks ----

  // Initial check after a short delay (let the app finish loading)
  setTimeout(() => {
    log.info('[updater] Initial update check…')
    checkForUpdates()
  }, INITIAL_DELAY_MS)

  // Periodic checks
  checkInterval = setInterval(() => {
    log.info('[updater] Periodic update check…')
    checkForUpdates()
  }, CHECK_INTERVAL_MS)
}

/** Clean up interval on app quit. */
export function disposeAutoUpdater(): void {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
}
