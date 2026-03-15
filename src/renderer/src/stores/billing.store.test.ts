import { describe, it, expect, beforeEach } from 'vitest'
import { useBillingStore } from './billing.store'
import type { Product } from '@shared/types'

// Reset store before each test
beforeEach(() => {
  useBillingStore.getState().clearCart()
})

const mockProduct: Product = {
  id: 1,
  name: 'Banarasi Silk Saree',
  shortName: null,
  sku: 'KPT-SAR-00001',
  barcode: null,
  category: 'Saree',
  categoryId: 1,
  subCategory: null,
  brand: null,
  hsnCode: '5007',
  costPrice: 2000,
  sellingPrice: 3500,
  wholesalePrice: null,
  gstRate: 5,
  stock: 10,
  lowStockThreshold: null,
  unit: 'pcs',
  location: null,
  supplierId: null,
  color: null,
  size: null,
  material: null,
  description: null,
  imagePath: null,
  isActive: true,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01'
}

const mockProduct2: Product = {
  ...mockProduct,
  id: 2,
  name: 'Cotton Dupatta',
  sku: 'KPT-DUP-00001',
  sellingPrice: 500,
  gstRate: 5,
  costPrice: 300
}

describe('BillingStore', () => {
  describe('addItem', () => {
    it('adds a product to the cart', () => {
      useBillingStore.getState().addItem(mockProduct)
      const state = useBillingStore.getState()

      expect(state.items).toHaveLength(1)
      expect(state.items[0].productName).toBe('Banarasi Silk Saree')
      expect(state.items[0].price).toBe(3500)
      expect(state.items[0].quantity).toBe(1)
      expect(state.items[0].gstRate).toBe(5)
    })

    it('increments quantity when adding same product', () => {
      useBillingStore.getState().addItem(mockProduct)
      useBillingStore.getState().addItem(mockProduct)
      const state = useBillingStore.getState()

      expect(state.items).toHaveLength(1)
      expect(state.items[0].quantity).toBe(2)
    })

    it('adds multiple different products', () => {
      useBillingStore.getState().addItem(mockProduct)
      useBillingStore.getState().addItem(mockProduct2)
      const state = useBillingStore.getState()

      expect(state.items).toHaveLength(2)
    })

    it('calculates GST correctly for an item', () => {
      useBillingStore.getState().addItem(mockProduct) // 3500 @ 5% GST
      const state = useBillingStore.getState()

      const item = state.items[0]
      // taxableAmount = 3500 * 1 = 3500
      expect(item.taxableAmount).toBe(3500)
      // gstAmount = 3500 * 5 / 100 = 175
      expect(item.gstAmount).toBe(175)
      // total = 3500 + 175 = 3675
      expect(item.total).toBe(3675)
    })

    it('recalculates totals after adding', () => {
      useBillingStore.getState().addItem(mockProduct) // 3500 + 175 GST = 3675
      const state = useBillingStore.getState()

      expect(state.subtotal).toBe(3500)
      expect(state.totalGst).toBe(175)
      expect(state.grandTotal).toBe(3675)
      expect(state.totalItems).toBe(1)
    })
  })

  describe('addCustomItem', () => {
    it('adds a custom item with zero GST', () => {
      useBillingStore.getState().addCustomItem('Alteration', 200)
      const state = useBillingStore.getState()

      expect(state.items).toHaveLength(1)
      expect(state.items[0].productName).toBe('Alteration')
      expect(state.items[0].price).toBe(200)
      expect(state.items[0].gstRate).toBe(0)
      expect(state.items[0].total).toBe(200)
    })

    it('uses default name when not provided', () => {
      useBillingStore.getState().addCustomItem()
      const state = useBillingStore.getState()
      expect(state.items[0].productName).toBe('Other Item')
    })
  })

  describe('removeItem', () => {
    it('removes an item from the cart', () => {
      useBillingStore.getState().addItem(mockProduct)
      const itemId = useBillingStore.getState().items[0].id
      useBillingStore.getState().removeItem(itemId)
      const state = useBillingStore.getState()

      expect(state.items).toHaveLength(0)
      expect(state.grandTotal).toBe(0)
      expect(state.subtotal).toBe(0)
    })
  })

  describe('updateItemQuantity', () => {
    it('updates quantity and recalculates', () => {
      useBillingStore.getState().addItem(mockProduct)
      const itemId = useBillingStore.getState().items[0].id
      useBillingStore.getState().updateItemQuantity(itemId, 3)
      const state = useBillingStore.getState()

      expect(state.items[0].quantity).toBe(3)
      expect(state.subtotal).toBe(3500 * 3)
      expect(state.totalGst).toBe(3500 * 3 * 0.05)
    })

    it('ignores zero or negative quantity', () => {
      useBillingStore.getState().addItem(mockProduct)
      const itemId = useBillingStore.getState().items[0].id
      useBillingStore.getState().updateItemQuantity(itemId, 0)
      expect(useBillingStore.getState().items[0].quantity).toBe(1) // unchanged
    })
  })

  describe('updateItemDiscount', () => {
    it('applies percentage discount to item', () => {
      useBillingStore.getState().addItem(mockProduct)
      const itemId = useBillingStore.getState().items[0].id
      useBillingStore.getState().updateItemDiscount(itemId, 10, 'percentage')
      const state = useBillingStore.getState()
      const item = state.items[0]

      // 10% of 3500 = 350
      expect(item.discountAmount).toBe(350)
      // taxable = 3500 - 350 = 3150
      expect(item.taxableAmount).toBe(3150)
      // GST = 3150 * 5% = 157.5
      expect(item.gstAmount).toBe(157.5)
      // total = 3150 + 157.5 = 3307.5
      expect(item.total).toBe(3307.5)
    })

    it('applies flat discount to item', () => {
      useBillingStore.getState().addItem(mockProduct)
      const itemId = useBillingStore.getState().items[0].id
      useBillingStore.getState().updateItemDiscount(itemId, 500, 'amount')
      const item = useBillingStore.getState().items[0]

      expect(item.discountAmount).toBe(500)
      expect(item.taxableAmount).toBe(3000)
    })
  })

  describe('updateItemPrice', () => {
    it('updates item price and recalculates', () => {
      useBillingStore.getState().addItem(mockProduct)
      const itemId = useBillingStore.getState().items[0].id
      useBillingStore.getState().updateItemPrice(itemId, 4000)
      const state = useBillingStore.getState()

      expect(state.items[0].price).toBe(4000)
      expect(state.subtotal).toBe(4000)
    })
  })

  describe('setDiscount (bill-level)', () => {
    it('applies percentage bill discount', () => {
      useBillingStore.getState().addItem(mockProduct)
      useBillingStore.getState().setDiscount(10, 'percentage')
      const state = useBillingStore.getState()

      // Bill discount = 10% of subtotal (3500) = 350
      // Total = 3675 (with GST) - 350 = 3325
      expect(state.grandTotal).toBe(Math.round(3675 - 350))
    })

    it('applies flat bill discount', () => {
      useBillingStore.getState().addItem(mockProduct)
      useBillingStore.getState().setDiscount(200, 'amount')
      const state = useBillingStore.getState()

      // grandTotal = 3675 - 200 = 3475
      expect(state.grandTotal).toBe(Math.round(3675 - 200))
    })
  })

  describe('setCustomer', () => {
    it('sets customer info', () => {
      useBillingStore.getState().setCustomer('Ramesh', '9876543210', '5')
      const state = useBillingStore.getState()

      expect(state.customerName).toBe('Ramesh')
      expect(state.customerPhone).toBe('9876543210')
      expect(state.customerId).toBe('5')
    })
  })

  describe('clearCart', () => {
    it('resets all state', () => {
      useBillingStore.getState().addItem(mockProduct)
      useBillingStore.getState().setCustomer('Test', '1234')
      useBillingStore.getState().setDiscount(10, 'percentage')
      useBillingStore.getState().clearCart()
      const state = useBillingStore.getState()

      expect(state.items).toHaveLength(0)
      expect(state.customerName).toBe('')
      expect(state.customerPhone).toBe('')
      expect(state.customerId).toBeNull()
      expect(state.discount).toBe(0)
      expect(state.grandTotal).toBe(0)
      expect(state.subtotal).toBe(0)
      expect(state.totalGst).toBe(0)
    })
  })

  describe('complex billing scenarios', () => {
    it('handles multi-item bill with mixed GST rates', () => {
      // Product 1: 3500 @ 5% GST → 3500 + 175 = 3675
      useBillingStore.getState().addItem(mockProduct)
      // Product 2: 500 @ 5% GST → 500 + 25 = 525
      useBillingStore.getState().addItem(mockProduct2)

      const state = useBillingStore.getState()
      expect(state.subtotal).toBe(4000)
      expect(state.totalGst).toBe(200) // 175 + 25
      expect(state.grandTotal).toBe(4200)
      expect(state.totalItems).toBe(2)
    })

    it('handles quantity * price correctly', () => {
      useBillingStore.getState().addItem(mockProduct, 5) // 5 × 3500 = 17500
      const state = useBillingStore.getState()

      expect(state.subtotal).toBe(17500)
      expect(state.totalGst).toBe(875) // 17500 * 5% = 875
      expect(state.grandTotal).toBe(18375)
    })

    it('grandTotal never goes negative', () => {
      useBillingStore.getState().addItem(mockProduct2) // 500 + 25 = 525
      useBillingStore.getState().setDiscount(1000, 'amount') // discount > total
      const state = useBillingStore.getState()

      expect(state.grandTotal).toBeGreaterThanOrEqual(0)
    })
  })
})
