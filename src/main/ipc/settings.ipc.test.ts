/**
 * IPC Handler Tests
 *
 * These tests verify that IPC handlers are correctly registered
 * and delegate to the proper repository/service methods.
 *
 * Since IPC handlers depend heavily on Electron's ipcMain module,
 * we mock it and verify the handler registrations and callbacks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Store registered handlers so we can invoke them in tests
const handlers = new Map<string, (...args: unknown[]) => unknown>()

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler)
    })
  },
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] })
  },
  shell: {
    openPath: vi.fn().mockResolvedValue('')
  },
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([])
  }
}))

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock repositories
const mockSettingsRepo = {
  get: vi.fn().mockReturnValue(null),
  set: vi.fn(),
  getAll: vi.fn().mockReturnValue({}),
  setMany: vi.fn()
}

vi.mock('../database/repositories/settings.repo', () => ({
  settingsRepo: mockSettingsRepo,
  SettingsRepository: vi.fn()
}))

// Mock services
vi.mock('../services/backup.service', () => ({
  backupService: {
    createBackup: vi.fn().mockResolvedValue({ success: true }),
    listBackups: vi.fn().mockReturnValue([]),
    cleanOldBackups: vi.fn(),
    getBackupDir: vi.fn().mockReturnValue('/backup'),
    restoreFromSqlDump: vi.fn().mockResolvedValue({ success: true })
  }
}))

vi.mock('../services/cloud-backup.service', () => ({
  cloudBackupService: {
    getStatus: vi.fn(),
    saveConfig: vi.fn(),
    getConfig: vi.fn(),
    authenticate: vi.fn(),
    disconnect: vi.fn(),
    backup: vi.fn(),
    listBackups: vi.fn(),
    downloadBackup: vi.fn()
  }
}))

vi.mock('../services/thermal-printer.service', () => ({
  thermalPrinterService: {
    getAvailablePrinters: vi.fn().mockResolvedValue([]),
    setReceiptPrinter: vi.fn(),
    testPrint: vi.fn(),
    printReceipt: vi.fn()
  }
}))

vi.mock('../database/connection', () => ({
  getSqlite: vi.fn()
}))

describe('Settings IPC Handlers', () => {
  beforeEach(() => {
    handlers.clear()
    vi.clearAllMocks()
  })

  it('registers all expected settings handlers', async () => {
    const { registerSettingsIpc } = await import('./settings.ipc')
    registerSettingsIpc()

    expect(handlers.has('settings:get')).toBe(true)
    expect(handlers.has('settings:set')).toBe(true)
    expect(handlers.has('settings:getAll')).toBe(true)
    expect(handlers.has('settings:setMany')).toBe(true)
  })

  it('settings:get delegates to settingsRepo.get', async () => {
    const { registerSettingsIpc } = await import('./settings.ipc')
    registerSettingsIpc()

    mockSettingsRepo.get.mockReturnValue('dark')
    const handler = handlers.get('settings:get')!
    const result = await handler(null, 'theme')
    expect(mockSettingsRepo.get).toHaveBeenCalledWith('theme')
    expect(result).toBe('dark')
  })

  it('settings:set delegates to settingsRepo.set', async () => {
    const { registerSettingsIpc } = await import('./settings.ipc')
    registerSettingsIpc()

    const handler = handlers.get('settings:set')!
    const result = await handler(null, 'theme', 'dark')
    expect(mockSettingsRepo.set).toHaveBeenCalledWith('theme', 'dark')
    expect(result).toBe(true)
  })

  it('settings:getAll returns all settings', async () => {
    const { registerSettingsIpc } = await import('./settings.ipc')
    registerSettingsIpc()

    mockSettingsRepo.getAll.mockReturnValue({ theme: 'light', fontSize: 'medium' })
    const handler = handlers.get('settings:getAll')!
    const result = await handler(null)
    expect(result).toEqual({ theme: 'light', fontSize: 'medium' })
  })

  it('registers backup handlers', async () => {
    const { registerSettingsIpc } = await import('./settings.ipc')
    registerSettingsIpc()

    expect(handlers.has('backup:create')).toBe(true)
    expect(handlers.has('backup:list')).toBe(true)
    expect(handlers.has('backup:clean')).toBe(true)
    expect(handlers.has('backup:getDir')).toBe(true)
  })
})
