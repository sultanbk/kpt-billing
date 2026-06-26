import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import {
  createSeededTestDb,
  insertTestCustomer,
  insertTestProduct
} from '../__tests__/db-test-helper'

let testDb: Database.Database

vi.mock('../connection', () => ({
  getSqlite: () => testDb,
  getDb: () => null
}))

vi.mock('electron-log', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

const { BillRepository } = await import('./bill.repo')

describe('BillRepository', () => {
  let repo: InstanceType<typeof BillRepository>

  beforeEach(() => {
    testDb = createSeededTestDb()
    repo = new BillRepository()
  })

  it('stores customerId as a numeric customer reference', () => {
    const productId = insertTestProduct(testDb, { name: 'Saree', stock: 5, sellingPrice: 1000 })
    const customerId = insertTestCustomer(testDb, { name: 'Ramesh', phone: '9000000001' })

    const bill = repo.create({
      customerId,
      customerName: 'Ramesh',
      customerPhone: '9000000001',
      items: [
        {
          productId,
          productName: 'Saree',
          hsn: '5007',
          price: 1000,
          quantity: 1,
          discount: 0,
          discountType: 'percentage',
          gstRate: 5
        }
      ],
      payment: {
        mode: 'cash',
        amount: 1050,
        received: 1050,
        change: 0,
        cashAmount: 1050
      }
    })

    const row = testDb.prepare('SELECT customer_id FROM bills WHERE id = ?').get(bill.id) as {
      customer_id: number
    }
    expect(row.customer_id).toBe(customerId)
  })

  it('blocks stock underflow by default', () => {
    const productId = insertTestProduct(testDb, { name: 'Low Stock Saree', stock: 1 })

    expect(() =>
      repo.create({
        items: [
          {
            productId,
            productName: 'Low Stock Saree',
            hsn: '5007',
            price: 1000,
            quantity: 2,
            discount: 0,
            discountType: 'percentage',
            gstRate: 5
          }
        ],
        payment: {
          mode: 'cash',
          amount: 2100,
          received: 2100,
          change: 0,
          cashAmount: 2100
        }
      })
    ).toThrow(/Insufficient stock/)
  })

  it('allows stock underflow when explicitly enabled in settings', () => {
    testDb
      .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('allowNegativeStock', 'true')")
      .run()
    const productId = insertTestProduct(testDb, { name: 'Allowed Negative Stock', stock: 1 })

    repo.create({
      items: [
        {
          productId,
          productName: 'Allowed Negative Stock',
          hsn: '5007',
          price: 1000,
          quantity: 2,
          discount: 0,
          discountType: 'percentage',
          gstRate: 5
        }
      ],
      payment: {
        mode: 'cash',
        amount: 2100,
        received: 2100,
        change: 0,
        cashAmount: 2100
      }
    })

    const row = testDb
      .prepare('SELECT current_stock FROM products WHERE id = ?')
      .get(productId) as {
      current_stock: number
    }
    expect(row.current_stock).toBe(-1)
  })
})
