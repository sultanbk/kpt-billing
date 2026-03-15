import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { BillItem, Product, HeldBill } from '@shared/types'
import { v4 as uuid } from 'uuid'

interface BillingState {
  items: BillItem[]
  customerName: string
  customerPhone: string
  customerId: string | null
  discount: number
  discountType: 'percentage' | 'amount'
  heldBills: HeldBill[]
  currentHeldBillId: string | null

  // Computed
  subtotal: number
  totalGst: number
  discountAmount: number
  grandTotal: number
  totalItems: number

  // Actions
  addItem: (product: Product, quantity?: number) => void
  addCustomItem: (name?: string, price?: number) => void
  updateItemPrice: (itemId: string, price: number) => void
  updateItemName: (itemId: string, name: string) => void
  removeItem: (itemId: string) => void
  updateItemQuantity: (itemId: string, quantity: number) => void
  updateItemDiscount: (itemId: string, discount: number, type: 'percentage' | 'amount') => void
  setCustomer: (name: string, phone: string, id?: string | null) => void
  setDiscount: (discount: number, type: 'percentage' | 'amount') => void
  clearCart: () => void
  holdBill: () => void
  recallBill: (heldBillId: string) => void
  loadHeldBills: () => Promise<void>
  deleteHeldBill: (id: string) => Promise<void>
  recalculate: () => void
}

function calculateItemTotals(item: BillItem): BillItem {
  const baseAmount = item.price * item.quantity
  let discAmt = 0
  if (item.discountType === 'percentage' || item.discountType === 'percent') {
    discAmt = (baseAmount * item.discount) / 100
  } else {
    discAmt = item.discount
  }
  const taxableAmount = baseAmount - discAmt
  const gstAmount = (taxableAmount * item.gstRate) / 100
  const total = taxableAmount + gstAmount

  return {
    ...item,
    discountAmount: discAmt,
    taxableAmount,
    gstAmount,
    total
  }
}

function recalculateTotals(
  items: BillItem[],
  discount: number,
  discountType: 'percentage' | 'amount'
): {
  subtotal: number
  totalGst: number
  discountAmount: number
  grandTotal: number
  totalItems: number
} {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalGst = items.reduce((sum, item) => sum + item.gstAmount, 0)
  const itemDiscounts = items.reduce((sum, item) => sum + item.discountAmount, 0)

  let billDiscount = 0
  if (discountType === 'percentage') {
    billDiscount = (subtotal * discount) / 100
  } else {
    billDiscount = discount
  }

  const discountAmount = itemDiscounts + billDiscount
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0) - billDiscount
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    subtotal,
    totalGst,
    discountAmount,
    grandTotal: Math.round(Math.max(0, grandTotal)),
    totalItems
  }
}

export const useBillingStore = create<BillingState>()(
  immer((set, get) => ({
    items: [],
    customerName: '',
    customerPhone: '',
    customerId: null,
    discount: 0,
    discountType: 'percentage' as const,
    heldBills: [],
    currentHeldBillId: null,
    subtotal: 0,
    totalGst: 0,
    discountAmount: 0,
    grandTotal: 0,
    totalItems: 0,

    addItem: (product: Product, quantity = 1) => {
      set((state) => {
        const existingIdx = state.items.findIndex((i) => i.productId === product.id)

        if (existingIdx >= 0) {
          state.items[existingIdx].quantity += quantity
          state.items[existingIdx] = calculateItemTotals(state.items[existingIdx])
        } else {
          const newItem: BillItem = {
            id: uuid(),
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            hsn: product.hsnCode || '',
            price: product.sellingPrice,
            quantity,
            unit: product.unit || 'pcs',
            discount: 0,
            discountType: 'percentage',
            discountAmount: 0,
            gstRate: product.gstRate,
            gstAmount: 0,
            taxableAmount: product.sellingPrice * quantity,
            total: 0
          }
          state.items.push(calculateItemTotals(newItem))
        }

        const totals = recalculateTotals(state.items, state.discount, state.discountType)
        Object.assign(state, totals)
      })
    },

    addCustomItem: (name = 'Other Item', price = 0) => {
      set((state) => {
        const newItem: BillItem = {
          id: uuid(),
          productId: 0,
          productName: name,
          sku: '',
          hsn: '',
          price,
          quantity: 1,
          unit: 'pcs',
          discount: 0,
          discountType: 'amount',
          discountAmount: 0,
          gstRate: 0,
          gstAmount: 0,
          taxableAmount: price,
          total: price
        }
        state.items.push(calculateItemTotals(newItem))
        const totals = recalculateTotals(state.items, state.discount, state.discountType)
        Object.assign(state, totals)
      })
    },

    updateItemPrice: (itemId: string, price: number) => {
      set((state) => {
        const idx = state.items.findIndex((i) => i.id === itemId)
        if (idx >= 0) {
          state.items[idx].price = price
          state.items[idx] = calculateItemTotals(state.items[idx])
          const totals = recalculateTotals(state.items, state.discount, state.discountType)
          Object.assign(state, totals)
        }
      })
    },

    updateItemName: (itemId: string, name: string) => {
      set((state) => {
        const idx = state.items.findIndex((i) => i.id === itemId)
        if (idx >= 0) {
          state.items[idx].productName = name
        }
      })
    },

    removeItem: (itemId: string) => {
      set((state) => {
        state.items = state.items.filter((i) => i.id !== itemId)
        const totals = recalculateTotals(state.items, state.discount, state.discountType)
        Object.assign(state, totals)
      })
    },

    updateItemQuantity: (itemId: string, quantity: number) => {
      set((state) => {
        const idx = state.items.findIndex((i) => i.id === itemId)
        if (idx >= 0 && quantity > 0) {
          state.items[idx].quantity = quantity
          state.items[idx] = calculateItemTotals(state.items[idx])
          const totals = recalculateTotals(state.items, state.discount, state.discountType)
          Object.assign(state, totals)
        }
      })
    },

    updateItemDiscount: (itemId: string, discount: number, type: 'percentage' | 'amount') => {
      set((state) => {
        const idx = state.items.findIndex((i) => i.id === itemId)
        if (idx >= 0) {
          state.items[idx].discount = discount
          state.items[idx].discountType = type
          state.items[idx] = calculateItemTotals(state.items[idx])
          const totals = recalculateTotals(state.items, state.discount, state.discountType)
          Object.assign(state, totals)
        }
      })
    },

    setCustomer: (name: string, phone: string, id: string | null = null) => {
      set((state) => {
        state.customerName = name
        state.customerPhone = phone
        state.customerId = id
      })
    },

    setDiscount: (discount: number, type: 'percentage' | 'amount') => {
      set((state) => {
        state.discount = discount
        state.discountType = type
        const totals = recalculateTotals(state.items, discount, type)
        Object.assign(state, totals)
      })
    },

    clearCart: () => {
      set((state) => {
        state.items = []
        state.customerName = ''
        state.customerPhone = ''
        state.customerId = null
        state.discount = 0
        state.discountType = 'percentage'
        state.currentHeldBillId = null
        state.subtotal = 0
        state.totalGst = 0
        state.discountAmount = 0
        state.grandTotal = 0
        state.totalItems = 0
      })
    },

    holdBill: async () => {
      const state = get()
      if (state.items.length === 0) return

      const held: HeldBill = {
        id: uuid(),
        items: JSON.parse(JSON.stringify(state.items)),
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        customerId: state.customerId,
        discount: state.discount,
        discountType: state.discountType,
        heldAt: new Date().toISOString(),
        total: state.grandTotal
      }

      try {
        await window.api.billing.holdBill(held.id, {
          customerName: held.customerName,
          customerPhone: held.customerPhone,
          items: JSON.stringify({
            items: held.items,
            discount: held.discount,
            discountType: held.discountType,
            customerId: held.customerId
          })
        })
      } catch {
        // If DB write fails, still hold in memory for current session
      }

      set((state) => {
        state.heldBills.push(held)
        // clear cart
        state.items = []
        state.customerName = ''
        state.customerPhone = ''
        state.customerId = null
        state.discount = 0
        state.discountType = 'percentage'
        state.currentHeldBillId = null
        state.subtotal = 0
        state.totalGst = 0
        state.discountAmount = 0
        state.grandTotal = 0
        state.totalItems = 0
      })
    },

    recallBill: (heldBillId: string) => {
      set((state) => {
        const heldIndex = state.heldBills.findIndex((h) => h.id === heldBillId)
        if (heldIndex === -1) return
        const held = state.heldBills[heldIndex]

        state.items = held.items.map((i) => calculateItemTotals(i))
        state.customerName = held.customerName || ''
        state.customerPhone = held.customerPhone || ''
        state.customerId = held.customerId || null
        state.discount = held.discount || 0
        state.discountType = held.discountType || 'percentage'
        state.currentHeldBillId = heldBillId
        const totals = recalculateTotals(state.items, state.discount, state.discountType)
        Object.assign(state, totals)

        // Remove from held bills list to prevent duplicate recall
        state.heldBills.splice(heldIndex, 1)
      })
      // Delete from DB
      window.api.billing.deleteHeldBill(heldBillId).catch(() => {})
    },

    loadHeldBills: async () => {
      try {
        const held = await window.api.billing.getHeldBills()
        set((state) => {
          state.heldBills = held as HeldBill[]
        })
      } catch {
        /* ignore */
      }
    },

    deleteHeldBill: async (id: string) => {
      try {
        await window.api.billing.deleteHeldBill(id)
        set((state) => {
          state.heldBills = state.heldBills.filter((h) => h.id !== id)
        })
      } catch {
        /* ignore */
      }
    },

    recalculate: () => {
      set((state) => {
        state.items = state.items.map((i) => calculateItemTotals(i))
        const totals = recalculateTotals(state.items, state.discount, state.discountType)
        Object.assign(state, totals)
      })
    }
  }))
)
