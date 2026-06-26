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
import { registerSettingsIpc } from './settings.ipc'
import { settingsRepo } from '../database/repositories/settings.repo'
import { dialog } from 'electron'
import { thermalPrinterService } from '../services/thermal-printer.service'
import * as fs from 'fs'
import { createHash } from 'crypto'
import { pbkdf2Sync } from 'crypto'
import { getSqlite } from '../database/connection'

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
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: true, filePath: '' })
  },
  shell: {
    openPath: vi.fn().mockResolvedValue('')
  },
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([])
  }
}))

// Mock fs
vi.mock('fs', () => ({
  writeFileSync: vi.fn()
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
vi.mock('../database/repositories/settings.repo', () => ({
  settingsRepo: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    getAll: vi.fn().mockReturnValue({}),
    setMany: vi.fn()
  },
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
    setPrinter: vi.fn(),
    testPrint: vi.fn(),
    printReceipt: vi.fn(),
    printPaymentDetails: vi.fn(),
    generatePaymentDetailsPdfBuffer: vi.fn()
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

  it('registers all expected settings handlers', () => {
    registerSettingsIpc()

    expect(handlers.has('settings:get')).toBe(true)
    expect(handlers.has('settings:set')).toBe(true)
    expect(handlers.has('settings:getAll')).toBe(true)
    expect(handlers.has('settings:setMany')).toBe(true)
  })

  it('settings:get delegates to settingsRepo.get', async () => {
    registerSettingsIpc()

    vi.mocked(settingsRepo.get).mockReturnValue('dark')
    const handler = handlers.get('settings:get')!
    const result = await handler(null, 'theme')
    expect(settingsRepo.get).toHaveBeenCalledWith('theme')
    expect(result).toBe('dark')
  })

  it('settings:set delegates to settingsRepo.set', async () => {
    registerSettingsIpc()

    const handler = handlers.get('settings:set')!
    const result = await handler(null, 'theme', 'dark')
    expect(settingsRepo.set).toHaveBeenCalledWith('theme', 'dark')
    expect(result).toBe(true)
  })

  it('settings:getAll returns all settings', async () => {
    registerSettingsIpc()

    vi.mocked(settingsRepo.getAll).mockReturnValue({ theme: 'light', fontSize: 'medium' })
    const handler = handlers.get('settings:getAll')!
    const result = await handler(null)
    expect(result).toEqual({ theme: 'light', fontSize: 'medium' })
  })

  it('registers backup handlers', () => {
    registerSettingsIpc()

    expect(handlers.has('backup:create')).toBe(true)
    expect(handlers.has('backup:list')).toBe(true)
    expect(handlers.has('backup:clean')).toBe(true)
    expect(handlers.has('backup:getDir')).toBe(true)
  })

  describe('auth PIN handlers', () => {
    it('verifies legacy SHA-256 PINs and migrates them to scrypt hashes', async () => {
      registerSettingsIpc()

      const legacyPin = createHash('sha256').update('1234').digest('hex')
      const updateRun = vi.fn()
      const auditRun = vi.fn()
      const db = {
        prepare: vi.fn((sql: string) => {
          if (sql.includes('SELECT * FROM users')) {
            return {
              all: vi.fn().mockReturnValue([
                {
                  id: 1,
                  name: 'Owner',
                  pin: legacyPin,
                  salt: null,
                  role: 'owner'
                }
              ])
            }
          }
          if (sql.includes('UPDATE users SET pin')) {
            return { run: updateRun }
          }
          return { run: auditRun }
        })
      }
      vi.mocked(getSqlite).mockReturnValue(db as unknown as ReturnType<typeof getSqlite>)

      const handler = handlers.get('auth:verifyPin')!
      const result = await handler(null, '1234')

      expect(result).toEqual({
        success: true,
        user: { id: 1, name: 'Owner', role: 'owner' }
      })
      expect(updateRun).toHaveBeenCalledOnce()
      const [newPin, newSalt, userId] = updateRun.mock.calls[0]
      expect(newPin).toMatch(/^scrypt:/)
      expect(typeof newSalt).toBe('string')
      expect(userId).toBe(1)
    })

    it('verifies legacy salted PBKDF2 PINs and migrates them to scrypt hashes', async () => {
      registerSettingsIpc()

      const legacySalt = 'legacy-salt'
      const legacyPin = pbkdf2Sync('1234', legacySalt, 1000, 64, 'sha512').toString('hex')
      const updateRun = vi.fn()
      const db = {
        prepare: vi.fn((sql: string) => {
          if (sql.includes('SELECT * FROM users')) {
            return {
              all: vi.fn().mockReturnValue([
                {
                  id: 2,
                  name: 'Owner',
                  pin: legacyPin,
                  salt: legacySalt,
                  role: 'owner'
                }
              ])
            }
          }
          if (sql.includes('UPDATE users SET pin')) {
            return { run: updateRun }
          }
          return { run: vi.fn() }
        })
      }
      vi.mocked(getSqlite).mockReturnValue(db as unknown as ReturnType<typeof getSqlite>)

      const handler = handlers.get('auth:verifyPin')!
      const result = await handler(null, '1234')

      expect(result).toEqual({
        success: true,
        user: { id: 2, name: 'Owner', role: 'owner' }
      })
      expect(updateRun).toHaveBeenCalledOnce()
      expect(updateRun.mock.calls[0][0]).toMatch(/^scrypt:/)
    })
  })

  describe('printer payment details handlers', () => {
    const mockPaymentMethod = {
      id: 'method-1',
      type: 'upi' as const,
      name: 'GPay Shop',
      details: {
        upiVpa: 'shop@upi',
        payeeName: 'Shop Name'
      }
    }

    it('printer:printPaymentDetails processes request and calls thermalPrinterService', async () => {
      registerSettingsIpc()
      expect(handlers.has('printer:printPaymentDetails')).toBe(true)

      vi.mocked(thermalPrinterService.printPaymentDetails).mockResolvedValue(true)
      const handler = handlers.get('printer:printPaymentDetails')!

      const result = await handler(null, mockPaymentMethod)
      expect(thermalPrinterService.printPaymentDetails).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'method-1', type: 'upi' }),
        expect.any(Object)
      )
      expect(result).toBe(true)
    })

    it('printer:downloadPaymentDetailsPdf handles successful save', async () => {
      registerSettingsIpc()
      expect(handlers.has('printer:downloadPaymentDetailsPdf')).toBe(true)

      const fakePdfBuffer = Buffer.from('pdf data')
      vi.mocked(thermalPrinterService.generatePaymentDetailsPdfBuffer).mockResolvedValue(
        fakePdfBuffer
      )
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: false, filePath: 'slip.pdf' })

      const handler = handlers.get('printer:downloadPaymentDetailsPdf')!
      const result = await handler(null, mockPaymentMethod)

      expect(thermalPrinterService.generatePaymentDetailsPdfBuffer).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'method-1' }),
        expect.any(Object)
      )
      expect(dialog.showSaveDialog).toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalledWith('slip.pdf', fakePdfBuffer)
      expect(result).toBe(true)
    })

    it('printer:downloadPaymentDetailsPdf handles cancel dialog', async () => {
      registerSettingsIpc()

      const fakePdfBuffer = Buffer.from('pdf data')
      vi.mocked(thermalPrinterService.generatePaymentDetailsPdfBuffer).mockResolvedValue(
        fakePdfBuffer
      )
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: true, filePath: '' })

      const handler = handlers.get('printer:downloadPaymentDetailsPdf')!
      const result = await handler(null, mockPaymentMethod)

      expect(dialog.showSaveDialog).toHaveBeenCalled()
      expect(fs.writeFileSync).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('printer:downloadPaymentDetailsPdf returns false on generation error', async () => {
      registerSettingsIpc()

      vi.mocked(thermalPrinterService.generatePaymentDetailsPdfBuffer).mockResolvedValue(null)

      const handler = handlers.get('printer:downloadPaymentDetailsPdf')!
      const result = await handler(null, mockPaymentMethod)

      expect(result).toBe(false)
      expect(dialog.showSaveDialog).not.toHaveBeenCalled()
    })

    it('printer:printPaymentDetails validates bank accounts with accountName correctly', async () => {
      registerSettingsIpc()

      const bankPaymentMethod = {
        id: 'method-2',
        type: 'bank' as const,
        name: 'SBI Account',
        details: {
          bankName: 'SBI',
          accountNo: '1234567890',
          ifscCode: 'SBIN0001234',
          branch: 'Main Branch',
          accountName: 'Krishnapriya Textiles'
        }
      }

      vi.mocked(thermalPrinterService.printPaymentDetails).mockResolvedValue(true)
      const handler = handlers.get('printer:printPaymentDetails')!

      const result = await handler(null, bankPaymentMethod)
      expect(thermalPrinterService.printPaymentDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'method-2',
          type: 'bank',
          details: expect.objectContaining({
            accountName: 'Krishnapriya Textiles',
            bankName: 'SBI'
          })
        }),
        expect.any(Object)
      )
      expect(result).toBe(true)
    })
  })
})
