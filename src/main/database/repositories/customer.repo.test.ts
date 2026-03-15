import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createSeededTestDb, insertTestCustomer } from '../__tests__/db-test-helper'

let testDb: Database.Database

vi.mock('../connection', () => ({
  getSqlite: () => testDb,
  getDb: () => null
}))

const { CustomerRepository } = await import('./customer.repo')

describe('CustomerRepository', () => {
  let repo: InstanceType<typeof CustomerRepository>

  beforeEach(() => {
    testDb = createSeededTestDb()
    repo = new CustomerRepository()
  })

  describe('create', () => {
    it('creates a customer', () => {
      const customer = repo.create({
        name: 'Ramesh Kumar',
        phone: '9876543210'
      })

      expect(customer).toBeDefined()
      expect(customer.name).toBe('Ramesh Kumar')
      expect(customer.phone).toBe('9876543210')
      expect(customer.customerType).toBe('regular')
      expect(customer.isActive).toBe(true)
      expect(customer.currentBalance).toBe(0)
    })

    it('creates wholesale customer with credit limit', () => {
      const customer = repo.create({
        name: 'Wholesale Buyer',
        phone: '8888888888',
        customerType: 'wholesale',
        creditLimit: 50000
      })

      expect(customer.customerType).toBe('wholesale')
      expect(customer.creditLimit).toBe(50000)
    })

    it('generates unique phone placeholder when phone is empty', () => {
      const c1 = repo.create({ name: 'No Phone 1', phone: '' })
      const c2 = repo.create({ name: 'No Phone 2', phone: '' })
      expect(c1.phone).not.toBe(c2.phone)
      expect(c1.phone).toContain('__NOPHONE__')
    })
  })

  describe('search', () => {
    it('finds customers by name', () => {
      insertTestCustomer(testDb, { name: 'Arjun Singh', phone: '9000000001' })
      insertTestCustomer(testDb, { name: 'Priya Sharma', phone: '9000000002' })

      const results = repo.search('arjun')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Arjun Singh')
    })

    it('finds customers by phone', () => {
      insertTestCustomer(testDb, { name: 'Phone Test', phone: '9123456789' })

      const results = repo.search('91234')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('getAll', () => {
    it('returns only active customers', () => {
      insertTestCustomer(testDb, { name: 'Active', phone: '9000000010' })
      testDb
        .prepare(
          `INSERT INTO customers (name, phone, is_active) VALUES ('Inactive', '9000000011', 0)`
        )
        .run()

      const all = repo.getAll()
      expect(all.every((c) => c.isActive === true)).toBe(true)
    })
  })

  describe('getById', () => {
    it('returns customer by id', () => {
      const id = insertTestCustomer(testDb, { name: 'By ID Test', phone: '9000000020' })
      const customer = repo.getById(id)
      expect(customer).not.toBeNull()
      expect(customer!.name).toBe('By ID Test')
    })

    it('returns null for non-existent id', () => {
      expect(repo.getById(99999)).toBeNull()
    })
  })

  describe('getByPhone', () => {
    it('finds customer by exact phone', () => {
      insertTestCustomer(testDb, { name: 'Phone Lookup', phone: '9555555555' })
      const customer = repo.getByPhone('9555555555')
      expect(customer).not.toBeNull()
      expect(customer!.name).toBe('Phone Lookup')
    })
  })

  describe('update', () => {
    it('updates customer fields', () => {
      const id = insertTestCustomer(testDb, { name: 'Original', phone: '9000000030' })
      const updated = repo.update(id, {
        name: 'Updated Name',
        city: 'Bangalore'
      })
      expect(updated.name).toBe('Updated Name')
      expect(updated.city).toBe('Bangalore')
    })
  })
})
