import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createSeededTestDb, insertTestSupplier } from '../__tests__/db-test-helper'

let testDb: Database.Database

vi.mock('../connection', () => ({
  getSqlite: () => testDb,
  getDb: () => null
}))

const { SupplierRepository } = await import('./supplier.repo')

describe('SupplierRepository', () => {
  let repo: InstanceType<typeof SupplierRepository>

  beforeEach(() => {
    testDb = createSeededTestDb()
    repo = new SupplierRepository()
  })

  describe('create', () => {
    it('creates a supplier', () => {
      const supplier = repo.create({
        name: 'Textile Traders',
        phone: '9876543210',
        city: 'Surat'
      })

      expect(supplier).toBeDefined()
      expect(supplier.name).toBe('Textile Traders')
      expect(supplier.phone).toBe('9876543210')
      expect(supplier.city).toBe('Surat')
      expect(supplier.isActive).toBe(true)
    })
  })

  describe('getAll', () => {
    it('returns only active suppliers by default', () => {
      insertTestSupplier(testDb, { name: 'Active Supplier', phone: '9000000001' })
      testDb
        .prepare(
          `INSERT INTO suppliers (name, phone, is_active) VALUES ('Inactive', '9000000002', 0)`
        )
        .run()

      const active = repo.getAll()
      expect(active.every((s) => s.isActive === true)).toBe(true)

      const all = repo.getAll(false)
      expect(all.length).toBeGreaterThan(active.length)
    })
  })

  describe('getById', () => {
    it('returns supplier by id', () => {
      const id = insertTestSupplier(testDb, { name: 'Find Me' })
      const supplier = repo.getById(id)
      expect(supplier).not.toBeNull()
      expect(supplier!.name).toBe('Find Me')
    })

    it('returns null for non-existent id', () => {
      expect(repo.getById(99999)).toBeNull()
    })
  })

  describe('search', () => {
    it('finds suppliers by name', () => {
      insertTestSupplier(testDb, { name: 'Surat Silks', phone: '9000000010' })
      insertTestSupplier(testDb, { name: 'Mumbai Fabrics', phone: '9000000011' })

      const results = repo.search('surat')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Surat Silks')
    })

    it('finds suppliers by city', () => {
      insertTestSupplier(testDb, { name: 'City Search', phone: '9000000020', city: 'Bangalore' })

      const results = repo.search('Bangalore')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('update', () => {
    it('updates supplier fields', () => {
      const id = insertTestSupplier(testDb, { name: 'Original' })
      const updated = repo.update(id, { name: 'Updated', city: 'Mumbai' })
      expect(updated.name).toBe('Updated')
      expect(updated.city).toBe('Mumbai')
    })

    it('deactivates a supplier', () => {
      const id = insertTestSupplier(testDb, { name: 'To Deactivate' })
      const updated = repo.update(id, { isActive: false })
      expect(updated.isActive).toBe(false)
    })
  })
})
