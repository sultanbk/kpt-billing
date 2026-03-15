import { describe, it, expect } from 'vitest'
import { mapRow, mapRows } from './utils'

describe('mapRow', () => {
  it('returns null/undefined as-is', () => {
    expect(mapRow(null as unknown as Record<string, unknown>)).toBeNull()
    expect(mapRow(undefined as unknown as Record<string, unknown>)).toBeUndefined()
  })

  it('keeps original snake_case keys', () => {
    const row = { id: 1, name: 'Test', purchase_price: 100 }
    const result = mapRow<Record<string, unknown>>(row)
    expect(result.id).toBe(1)
    expect(result.name).toBe('Test')
    expect(result.purchase_price).toBe(100)
  })

  it('maps single alias columns', () => {
    const row = { selling_price: 500, hsn_code: '5007' }
    const result = mapRow<Record<string, unknown>>(row)
    expect(result.sellingPrice).toBe(500)
    expect(result.hsnCode).toBe('5007')
    expect(result.hsn).toBe('5007') // hsn_code maps to both hsnCode and hsn
  })

  it('maps array alias columns (multiple aliases)', () => {
    const row = { purchase_price: 200, current_stock: 50, low_stock_alert: 5 }
    const result = mapRow<Record<string, unknown>>(row)
    // purchase_price → purchasePrice + costPrice
    expect(result.purchasePrice).toBe(200)
    expect(result.costPrice).toBe(200)
    // current_stock → currentStock + stock
    expect(result.currentStock).toBe(50)
    expect(result.stock).toBe(50)
    // low_stock_alert → lowStockAlert + lowStockThreshold
    expect(result.lowStockAlert).toBe(5)
    expect(result.lowStockThreshold).toBe(5)
  })

  it('converts is_active to boolean', () => {
    expect(mapRow<Record<string, unknown>>({ is_active: 1 }).isActive).toBe(true)
    expect(mapRow<Record<string, unknown>>({ is_active: 0 }).isActive).toBe(false)
    expect(mapRow<Record<string, unknown>>({ is_active: true }).isActive).toBe(true)
  })

  it('computes gstAmount from cgst + sgst', () => {
    const row = { cgst_amount: 25.5, sgst_amount: 25.5 }
    const result = mapRow<Record<string, unknown>>(row)
    expect(result.gstAmount).toBe(51)
  })

  it('handles gstAmount when cgst/sgst are zero or null', () => {
    const row = { cgst_amount: 0, sgst_amount: 0 }
    const result = mapRow<Record<string, unknown>>(row)
    expect(result.gstAmount).toBe(0)
  })

  it('auto-converts unmapped snake_case keys to camelCase', () => {
    const row = { some_unknown_field: 'hello' }
    const result = mapRow<Record<string, unknown>>(row)
    expect(result.someUnknownField).toBe('hello')
    expect(result.some_unknown_field).toBe('hello') // original also kept
  })

  it('maps bill-related columns', () => {
    const row = {
      bill_no: 'KPT/2025-26/001',
      customer_id: 5,
      grand_total: 1500,
      payment_mode: 'cash'
    }
    const result = mapRow<Record<string, unknown>>(row)
    expect(result.billNo).toBe('KPT/2025-26/001')
    expect(result.billNumber).toBe('KPT/2025-26/001')
    expect(result.customerId).toBe(5)
    expect(result.grandTotal).toBe(1500)
    expect(result.paymentMode).toBe('cash')
  })

  it('maps bill item columns', () => {
    const row = { qty: 3, rate: 1000, amount: 3000, discount_value: 100 }
    const result = mapRow<Record<string, unknown>>(row)
    expect(result.quantity).toBe(3)
    expect(result.price).toBe(1000)
    expect(result.total).toBe(3000)
    expect(result.discountValue).toBe(100)
    expect(result.discount).toBe(100)
  })
})

describe('mapRows', () => {
  it('maps an array of rows', () => {
    const rows = [
      { id: 1, selling_price: 100, is_active: 1 },
      { id: 2, selling_price: 200, is_active: 0 }
    ]
    const result = mapRows<Record<string, unknown>>(rows)
    expect(result).toHaveLength(2)
    expect(result[0].sellingPrice).toBe(100)
    expect(result[0].isActive).toBe(true)
    expect(result[1].sellingPrice).toBe(200)
    expect(result[1].isActive).toBe(false)
  })

  it('handles empty array', () => {
    expect(mapRows([])).toEqual([])
  })
})
