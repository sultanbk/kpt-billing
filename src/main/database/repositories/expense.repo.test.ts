import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createSeededTestDb } from '../__tests__/db-test-helper'

let testDb: Database.Database

vi.mock('../connection', () => ({
  getSqlite: () => testDb,
  getDb: () => null
}))

// We need to import dynamically after mocking
const expenseModule = await import('./expense.repo')

describe('ExpenseRepository', () => {
  let repo: typeof expenseModule.expenseRepo

  beforeEach(() => {
    testDb = createSeededTestDb()
    // Re-use the singleton but it uses our mocked getSqlite
    repo = expenseModule.expenseRepo
  })

  describe('create', () => {
    it('creates an expense', () => {
      const expense = repo.create({
        category: 'Rent',
        amount: 15000,
        description: 'Monthly rent',
        date: '2025-06-01'
      })

      expect(expense).toBeDefined()
      expect(expense.category).toBe('Rent')
      expect(expense.amount).toBe(15000)
      expect(expense.description).toBe('Monthly rent')
      expect(expense.date).toBe('2025-06-01')
      expect(expense.paymentMode).toBe('cash')
    })

    it('defaults to today when no date provided', () => {
      const expense = repo.create({
        category: 'Tea/Food',
        amount: 500
      })
      expect(expense.date).toBeTruthy()
      expect(expense.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('getById', () => {
    it('returns expense by id', () => {
      const created = repo.create({ category: 'Salary', amount: 20000 })
      const found = repo.getById(created.id)
      expect(found).not.toBeNull()
      expect(found!.amount).toBe(20000)
    })

    it('returns null for non-existent id', () => {
      expect(repo.getById(99999)).toBeNull()
    })
  })

  describe('getAll', () => {
    it('returns paginated expenses', () => {
      for (let i = 0; i < 5; i++) {
        repo.create({ category: 'Rent', amount: 1000 * (i + 1), date: '2025-06-01' })
      }

      const result = repo.getAll({ page: 1, pageSize: 3 })
      expect(result.data).toHaveLength(3)
      expect(result.total).toBe(5)
    })

    it('filters by date range', () => {
      repo.create({ category: 'Rent', amount: 1000, date: '2025-05-01' })
      repo.create({ category: 'Rent', amount: 2000, date: '2025-06-01' })
      repo.create({ category: 'Rent', amount: 3000, date: '2025-07-01' })

      const result = repo.getAll({ dateFrom: '2025-06-01', dateTo: '2025-06-30' })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].amount).toBe(2000)
    })

    it('filters by category', () => {
      repo.create({ category: 'Rent', amount: 1000, date: '2025-06-01' })
      repo.create({ category: 'Salary', amount: 5000, date: '2025-06-01' })

      const result = repo.getAll({ category: 'Salary' })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].category).toBe('Salary')
    })
  })

  describe('getByDate', () => {
    it('returns expenses for a specific date', () => {
      repo.create({ category: 'Rent', amount: 1000, date: '2025-06-15' })
      repo.create({ category: 'Tea/Food', amount: 200, date: '2025-06-15' })
      repo.create({ category: 'Salary', amount: 3000, date: '2025-06-16' })

      const expenses = repo.getByDate('2025-06-15')
      expect(expenses).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('updates expense fields', () => {
      const created = repo.create({ category: 'Rent', amount: 1000, date: '2025-06-01' })
      const updated = repo.update(created.id, { amount: 1500, category: 'Maintenance' })
      expect(updated.amount).toBe(1500)
      expect(updated.category).toBe('Maintenance')
    })
  })

  describe('delete', () => {
    it('deletes an expense', () => {
      const created = repo.create({ category: 'Rent', amount: 1000, date: '2025-06-01' })
      repo.delete(created.id)
      expect(repo.getById(created.id)).toBeNull()
    })
  })
})
