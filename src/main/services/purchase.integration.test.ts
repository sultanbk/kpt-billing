import { beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createSeededTestDb } from '../database/__tests__/db-test-helper'

let testDb: Database.Database

vi.mock('../database/connection', () => ({
  getSqlite: () => testDb,
  getDb: () => null
}))

const { PurchaseService } = await import('./purchase.service')
const { productRepo } = await import('../database/repositories/product.repo')
const { purchaseCreateSchema } = await import('../ipc/validation')

describe('PurchaseService stock-in integration', () => {
  let service: InstanceType<typeof PurchaseService>

  beforeEach(() => {
    testDb = createSeededTestDb()
    service = new PurchaseService()
  })

  it('creates a visible active product when a manual purchase item has no productId', () => {
    const purchase = service.create({
      supplierName: 'Manual Supplier',
      paymentStatus: 'paid',
      items: [
        {
          productId: null,
          productName: 'Manual Stock-In Product',
          barcode: 'MANUAL-STOCK-001',
          hsnCode: null,
          qty: 7,
          purchaseRate: 120,
          sellingRate: 180,
          mrp: 200,
          gstRate: 5,
          gstAmount: 42,
          amount: 882
        }
      ]
    })

    const products = productRepo.getAll({ search: 'Manual Stock-In Product' })
    const product = products.data[0]

    expect(purchase.items?.[0].productId).toBe(product.id)
    expect(product.name).toBe('Manual Stock-In Product')
    expect(product.stock).toBe(7)
    expect(product.costPrice).toBe(120)
    expect(product.sellingPrice).toBe(180)
    expect(product.mrp).toBe(200)
    expect(product.isActive).toBe(true)

    const ledgerRows = testDb
      .prepare(
        'SELECT type, qty, reference_type, reference_id FROM stock_ledger WHERE product_id = ?'
      )
      .all(product.id) as Record<string, unknown>[]

    expect(ledgerRows).toEqual([
      {
        type: 'purchase',
        qty: 7,
        reference_type: 'purchase',
        reference_id: purchase.id
      }
    ])
  })

  it('increases stock, writes ledger, and reverses both on delete', () => {
    const product = productRepo.create({
      name: 'Existing Product',
      hsnCode: '5007',
      costPrice: 90,
      mrp: 140,
      sellingPrice: 120,
      gstRate: 5,
      stock: 3
    })

    const purchase = service.create({
      paymentStatus: 'paid',
      items: [
        {
          productId: product.id,
          productName: product.name,
          barcode: null,
          hsnCode: '5007',
          qty: 5,
          purchaseRate: 100,
          sellingRate: 150,
          mrp: 180,
          gstRate: 5,
          gstAmount: 25,
          amount: 525
        }
      ]
    })

    expect(productRepo.getById(product.id)?.stock).toBe(8)
    expect(
      testDb
        .prepare(
          "SELECT COUNT(*) as count FROM stock_ledger WHERE product_id = ? AND reference_type = 'purchase' AND reference_id = ?"
        )
        .get(product.id, purchase.id)
    ).toEqual({ count: 1 })

    service.delete(purchase.id)

    expect(productRepo.getById(product.id)?.stock).toBe(3)
    expect(service.getById(purchase.id)).toBeNull()
    expect(
      testDb
        .prepare(
          "SELECT COUNT(*) as count FROM stock_ledger WHERE product_id = ? AND reference_type = 'purchase' AND reference_id = ?"
        )
        .get(product.id, purchase.id)
    ).toEqual({ count: 0 })
  })

  it('blocks purchase deletion when reversal would make stock negative', () => {
    const product = productRepo.create({
      name: 'Partly Sold Product',
      hsnCode: '5007',
      costPrice: 100,
      mrp: 150,
      sellingPrice: 130,
      gstRate: 5,
      stock: 0
    })

    const purchase = service.create({
      paymentStatus: 'paid',
      items: [
        {
          productId: product.id,
          productName: product.name,
          barcode: null,
          hsnCode: '5007',
          qty: 5,
          purchaseRate: 110,
          sellingRate: 160,
          mrp: 190,
          gstRate: 5,
          gstAmount: 27.5,
          amount: 577.5
        }
      ]
    })
    testDb.prepare('UPDATE products SET current_stock = 2 WHERE id = ?').run(product.id)

    expect(() => service.delete(purchase.id)).toThrow(/Cannot delete purchase/)
    expect(productRepo.getById(product.id)?.stock).toBe(2)
    expect(service.getById(purchase.id)).not.toBeNull()
  })

  it('allows honest negative stock reversal when negative stock is enabled', () => {
    testDb
      .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('allowNegativeStock', 'true')")
      .run()
    const product = productRepo.create({
      name: 'Negative Allowed Product',
      hsnCode: '5007',
      costPrice: 100,
      mrp: 150,
      sellingPrice: 130,
      gstRate: 5,
      stock: 0
    })

    const purchase = service.create({
      paymentStatus: 'paid',
      items: [
        {
          productId: product.id,
          productName: product.name,
          barcode: null,
          hsnCode: '5007',
          qty: 5,
          purchaseRate: 110,
          sellingRate: 160,
          mrp: 190,
          gstRate: 5,
          gstAmount: 27.5,
          amount: 577.5
        }
      ]
    })
    testDb.prepare('UPDATE products SET current_stock = 2 WHERE id = ?').run(product.id)

    service.delete(purchase.id)

    expect(productRepo.getById(product.id)?.stock).toBe(-3)
    expect(service.getById(purchase.id)).toBeNull()
  })

  it('records purchase-driven product price changes in price history', () => {
    const product = productRepo.create({
      name: 'Price History Product',
      hsnCode: '5007',
      costPrice: 80,
      mrp: 120,
      sellingPrice: 100,
      gstRate: 5,
      stock: 1
    })

    service.create({
      paymentStatus: 'paid',
      items: [
        {
          productId: product.id,
          productName: product.name,
          barcode: null,
          hsnCode: '5007',
          qty: 4,
          purchaseRate: 95,
          sellingRate: 135,
          mrp: 160,
          gstRate: 5,
          gstAmount: 19,
          amount: 399
        }
      ]
    })

    const history = testDb
      .prepare(
        'SELECT field_name, old_value, new_value FROM price_history WHERE product_id = ? ORDER BY id'
      )
      .all(product.id)

    expect(history).toEqual([
      { field_name: 'purchase_price', old_value: 80, new_value: 95 },
      { field_name: 'mrp', old_value: 120, new_value: 160 },
      { field_name: 'selling_price', old_value: 100, new_value: 135 }
    ])
  })

  it('validates purchase payment status and amount consistency', () => {
    const basePurchase = {
      items: [
        {
          productId: null,
          productName: 'Validation Product',
          barcode: null,
          hsnCode: null,
          qty: 1,
          purchaseRate: 100,
          sellingRate: 150,
          mrp: 180,
          gstRate: 5,
          gstAmount: 5,
          amount: 105
        }
      ]
    }

    expect(
      purchaseCreateSchema.safeParse({ ...basePurchase, paymentStatus: 'settled' }).success
    ).toBe(false)
    expect(
      purchaseCreateSchema.safeParse({
        ...basePurchase,
        paymentStatus: 'partial',
        amountPaid: 200
      }).success
    ).toBe(false)
    expect(
      purchaseCreateSchema.safeParse({
        ...basePurchase,
        paymentStatus: 'unpaid',
        amountPaid: 1
      }).success
    ).toBe(false)
  })
})
