import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createSeededTestDb } from '../__tests__/db-test-helper'

// Mock the connection module to return our test DB
let testDb: Database.Database

vi.mock('../connection', () => ({
  getSqlite: () => testDb,
  getDb: () => null
}))

// Import after mock setup
const { SettingsRepository } = await import('./settings.repo')

describe('SettingsRepository', () => {
  let repo: InstanceType<typeof SettingsRepository>

  beforeEach(() => {
    testDb = createSeededTestDb()
    repo = new SettingsRepository()
  })

  describe('get', () => {
    it('returns value for existing key', () => {
      expect(repo.get('shopName')).toBe('KRISHNAPRIYA TEXTILES')
    })

    it('returns null for non-existent key', () => {
      expect(repo.get('nonExistentKey')).toBeNull()
    })

    it('returns default settings values', () => {
      expect(repo.get('defaultPaymentMode')).toBe('cash')
      expect(repo.get('stateCode')).toBe('29')
      expect(repo.get('theme')).toBe('light')
    })
  })

  describe('set', () => {
    it('sets a new key-value pair', () => {
      repo.set('testKey', 'testValue')
      expect(repo.get('testKey')).toBe('testValue')
    })

    it('overwrites existing value', () => {
      repo.set('shopName', 'New Name')
      expect(repo.get('shopName')).toBe('New Name')
    })
  })

  describe('getAll', () => {
    it('returns all settings as a key-value object', () => {
      const all = repo.getAll()
      expect(all).toBeDefined()
      expect(all.shopName).toBe('KRISHNAPRIYA TEXTILES')
      expect(all.theme).toBe('light')
      expect(Object.keys(all).length).toBeGreaterThan(10)
    })
  })

  describe('setMany', () => {
    it('sets multiple settings at once', () => {
      repo.setMany({
        theme: 'dark',
        fontSize: 'large',
        customKey: 'customValue'
      })
      expect(repo.get('theme')).toBe('dark')
      expect(repo.get('fontSize')).toBe('large')
      expect(repo.get('customKey')).toBe('customValue')
    })

    it('handles empty object', () => {
      expect(() => repo.setMany({})).not.toThrow()
    })
  })
})
