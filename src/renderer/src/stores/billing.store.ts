import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { BillItem, Product, HeldBill } from '@shared/types'
import { v4 as uuid } from 'uuid'
import { billingService } from '../services/billing.service'

const LOCAL_STORAGE_KEY = 'kpt_active_cart'

export interface CartTab {
  id: string
  name: string
  defaultName: string
  items: BillItem[]
  customerName: string
  customerPhone: string
  customerId: number | null
  discount: number
  discountType: 'percentage' | 'amount'
  currentHeldBillId: string | null
}

interface SavedCartTabs {
  tabs: CartTab[]
  activeTabId: string
}

type LegacySavedCart = Partial<CartTab> & {
  items: BillItem[]
}

function loadCartTabsFromLocalStorage(): SavedCartTabs | null {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      // Check if it's in the new format (has tabs array)
      if (parsed && Array.isArray(parsed.tabs)) {
        const loaded = parsed as SavedCartTabs
        // Populate defaultName if missing (for legacy tab formats)
        loaded.tabs = loaded.tabs.map((t, idx) => ({
          ...t,
          defaultName: t.defaultName || (t.name.startsWith('Cart ') ? t.name : `Cart ${idx + 1}`)
        }))
        return loaded
      }
      // Backward compatibility: legacy format (single saved cart)
      if (parsed && Array.isArray(parsed.items)) {
        const legacyCart = parsed as LegacySavedCart
        const tabId = 'tab-1'
        const tab: CartTab = {
          id: tabId,
          name: legacyCart.customerName ? legacyCart.customerName : 'Cart 1',
          defaultName: 'Cart 1',
          items: legacyCart.items,
          customerName: legacyCart.customerName || '',
          customerPhone: legacyCart.customerPhone || '',
          customerId: legacyCart.customerId || null,
          discount: legacyCart.discount || 0,
          discountType: legacyCart.discountType || 'percentage',
          currentHeldBillId: legacyCart.currentHeldBillId || null
        }
        return {
          tabs: [tab],
          activeTabId: tabId
        }
      }
    }
  } catch (err) {
    console.error('Failed to load auto-recovered cart tabs:', err)
  }
  return null
}

interface BillingState {
  tabs: CartTab[]
  activeTabId: string
  items: BillItem[]
  customerName: string
  customerPhone: string
  customerId: number | null
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
  switchTab: (tabId: string) => void
  addTab: () => void
  closeTab: (tabId: string) => void
  addItem: (product: Product, quantity?: number) => void
  addCustomItem: (name?: string, price?: number) => void
  updateItemPrice: (itemId: string, price: number) => void
  updateItemName: (itemId: string, name: string) => void
  removeItem: (itemId: string) => void
  updateItemQuantity: (itemId: string, quantity: number) => void
  updateItemDiscount: (itemId: string, discount: number, type: 'percentage' | 'amount') => void
  setCustomer: (name: string, phone: string, id?: number | null) => void
  setDiscount: (discount: number, type: 'percentage' | 'amount') => void
  clearCart: () => void
  holdBill: () => void
  recallBill: (heldBillId: string) => Promise<void>
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
  const taxableBeforeBillDiscount = items.reduce((sum, item) => sum + item.taxableAmount, 0)
  const itemDiscounts = items.reduce((sum, item) => sum + item.discountAmount, 0)

  let billDiscount = 0
  if (discountType === 'percentage') {
    billDiscount = (subtotal * discount) / 100
  } else {
    billDiscount = discount
  }
  billDiscount = Math.round(billDiscount * 100) / 100

  const discountAmount = itemDiscounts + billDiscount

  // Distribute bill-level discount proportionally per item and recalculate GST
  // per-slab. This matches the backend bill.repo.ts logic exactly (Section 15(3)
  // of CGST Act: discount distributed proportionally to each item's taxable amount).
  let totalTaxable = 0
  let totalGst = 0

  for (const item of items) {
    let itemBillDiscount = 0
    if (billDiscount > 0 && taxableBeforeBillDiscount > 0) {
      itemBillDiscount = (billDiscount * item.taxableAmount) / taxableBeforeBillDiscount
    }
    const adjustedTaxable =
      Math.round(Math.max(0, item.taxableAmount - itemBillDiscount) * 100) / 100
    const cgst = Math.round(((adjustedTaxable * (item.gstRate / 2)) / 100) * 100) / 100
    const sgst = Math.round(((adjustedTaxable * (item.gstRate / 2)) / 100) * 100) / 100
    totalTaxable += adjustedTaxable
    totalGst += cgst + sgst
  }

  totalGst = Math.round(totalGst * 100) / 100
  const grandTotal = totalTaxable + totalGst
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    subtotal,
    totalGst,
    discountAmount,
    grandTotal: Math.round(Math.max(0, grandTotal)),
    totalItems
  }
}

// Load recovered state or default to empty values
const savedCartState = loadCartTabsFromLocalStorage()
const defaultTabId = 'tab-1'
const defaultTabs: CartTab[] = [
  {
    id: defaultTabId,
    name: 'Cart 1',
    defaultName: 'Cart 1',
    items: [],
    customerName: '',
    customerPhone: '',
    customerId: null,
    discount: 0,
    discountType: 'percentage',
    currentHeldBillId: null
  }
]

const initialTabs = savedCartState?.tabs || defaultTabs
const initialActiveTabId = savedCartState?.activeTabId || defaultTabId
const activeTab = initialTabs.find((t) => t.id === initialActiveTabId) || initialTabs[0]

const initialItems = activeTab.items || []
const initialDiscount = activeTab.discount || 0
const initialDiscountType = activeTab.discountType || 'percentage'
const initialTotals = recalculateTotals(initialItems, initialDiscount, initialDiscountType)

export const useBillingStore = create<BillingState>()(
  immer((set, get) => ({
    tabs: initialTabs,
    activeTabId: activeTab.id,
    items: initialItems,
    customerName: activeTab.customerName || '',
    customerPhone: activeTab.customerPhone || '',
    customerId: activeTab.customerId || null,
    discount: initialDiscount,
    discountType: initialDiscountType as 'percentage' | 'amount',
    heldBills: [],
    currentHeldBillId: activeTab.currentHeldBillId || null,
    subtotal: initialTotals.subtotal,
    totalGst: initialTotals.totalGst,
    discountAmount: initialTotals.discountAmount,
    grandTotal: initialTotals.grandTotal,
    totalItems: initialTotals.totalItems,

    switchTab: (tabId: string) => {
      set((state) => {
        // Save current active state to the current active tab
        const currentIdx = state.tabs.findIndex((t) => t.id === state.activeTabId)
        if (currentIdx >= 0) {
          state.tabs[currentIdx].items = state.items
          state.tabs[currentIdx].customerName = state.customerName
          state.tabs[currentIdx].customerPhone = state.customerPhone
          state.tabs[currentIdx].customerId = state.customerId
          state.tabs[currentIdx].discount = state.discount
          state.tabs[currentIdx].discountType = state.discountType
          state.tabs[currentIdx].currentHeldBillId = state.currentHeldBillId
          // Maintain active custom tab name if no customer is bound
          if (!state.customerName) {
            state.tabs[currentIdx].name =
              state.tabs[currentIdx].name || state.tabs[currentIdx].defaultName
          }
        }

        // Switch to new tab
        state.activeTabId = tabId
        const newTab = state.tabs.find((t) => t.id === tabId)
        if (newTab) {
          state.items = newTab.items
          state.customerName = newTab.customerName
          state.customerPhone = newTab.customerPhone
          state.customerId = newTab.customerId
          state.discount = newTab.discount
          state.discountType = newTab.discountType
          state.currentHeldBillId = newTab.currentHeldBillId

          // Recalculate totals for the newly focused tab
          const totals = recalculateTotals(state.items, state.discount, state.discountType)
          Object.assign(state, totals)
        }
      })
    },

    addTab: () => {
      set((state) => {
        // Save current active state first
        const currentIdx = state.tabs.findIndex((t) => t.id === state.activeTabId)
        if (currentIdx >= 0) {
          state.tabs[currentIdx].items = state.items
          state.tabs[currentIdx].customerName = state.customerName
          state.tabs[currentIdx].customerPhone = state.customerPhone
          state.tabs[currentIdx].customerId = state.customerId
          state.tabs[currentIdx].discount = state.discount
          state.tabs[currentIdx].discountType = state.discountType
          state.tabs[currentIdx].currentHeldBillId = state.currentHeldBillId
        }

        // Add new tab
        const newId = uuid()

        // Compute next unique Cart number
        let nextNum = 1
        const cartNumbers = state.tabs
          .map((t) => {
            const match = t.defaultName?.match(/^Cart\s+(\d+)$/) || t.name.match(/^Cart\s+(\d+)$/)
            return match ? parseInt(match[1], 10) : null
          })
          .filter((n): n is number => n !== null)

        if (cartNumbers.length > 0) {
          nextNum = Math.max(...cartNumbers) + 1
        }

        const defaultName = `Cart ${nextNum}`
        const newTab: CartTab = {
          id: newId,
          name: defaultName,
          defaultName,
          items: [],
          customerName: '',
          customerPhone: '',
          customerId: null,
          discount: 0,
          discountType: 'percentage',
          currentHeldBillId: null
        }
        state.tabs.push(newTab)
        state.activeTabId = newId

        // Clear active cart fields
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

    closeTab: (tabId: string) => {
      set((state) => {
        // Cannot close if only 1 tab is left
        if (state.tabs.length <= 1) return

        const index = state.tabs.findIndex((t) => t.id === tabId)
        if (index === -1) return

        state.tabs.splice(index, 1)

        // If only 1 tab remains, reset its default name to 'Cart 1'
        if (state.tabs.length === 1) {
          const soleTab = state.tabs[0]
          soleTab.defaultName = 'Cart 1'
          if (!soleTab.customerName) {
            soleTab.name = 'Cart 1'
          }
        }

        // If we closed the active tab, switch to another tab
        if (state.activeTabId === tabId) {
          const nextActiveIdx = Math.max(0, index - 1)
          const nextActiveId = state.tabs[nextActiveIdx].id
          state.activeTabId = nextActiveId

          const newTab = state.tabs[nextActiveIdx]
          state.items = newTab.items
          state.customerName = newTab.customerName
          state.customerPhone = newTab.customerPhone
          state.customerId = newTab.customerId
          state.discount = newTab.discount
          state.discountType = newTab.discountType
          state.currentHeldBillId = newTab.currentHeldBillId

          const totals = recalculateTotals(state.items, state.discount, state.discountType)
          Object.assign(state, totals)
        }
      })
    },

    addItem: (product: Product, quantity = 1) => {
      set((state) => {
        const existingIdx =
          product.id > 0 ? state.items.findIndex((i) => i.productId === product.id) : -1

        if (existingIdx >= 0) {
          state.items[existingIdx].quantity += quantity
          state.items[existingIdx] = calculateItemTotals(state.items[existingIdx])
        } else {
          const basePrice =
            product.priceIncludesGst && product.gstRate > 0
              ? product.sellingPrice / (1 + product.gstRate / 100)
              : product.sellingPrice

          const newItem: BillItem = {
            id: uuid(),
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            hsn: product.hsnCode || '',
            price: Math.round(basePrice * 100) / 100,
            quantity,
            unit: product.unit || 'pcs',
            discount: 0,
            discountType: 'percentage',
            discountAmount: 0,
            gstRate: product.gstRate,
            gstAmount: 0,
            taxableAmount: (Math.round(basePrice * 100) / 100) * quantity,
            total: 0,
            stock: product.stock
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

    setCustomer: (name: string, phone: string, id: number | null = null) => {
      set((state) => {
        state.customerName = name
        state.customerPhone = phone
        state.customerId = id

        // Dynamically update the active tab's title to the customer's name
        const currentIdx = state.tabs.findIndex((t) => t.id === state.activeTabId)
        if (currentIdx >= 0) {
          state.tabs[currentIdx].name = name ? name : state.tabs[currentIdx].defaultName
        }
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

        // Reset active tab title back to default name
        const currentIdx = state.tabs.findIndex((t) => t.id === state.activeTabId)
        if (currentIdx >= 0) {
          state.tabs[currentIdx].name = state.tabs[currentIdx].defaultName
        }
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
        await billingService.holdBill(held.id, {
          customerName: held.customerName,
          customerPhone: held.customerPhone,
          items: JSON.stringify({
            items: held.items,
            discount: held.discount,
            discountType: held.discountType,
            customerId: held.customerId
          })
        })

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

          const currentIdx = state.tabs.findIndex((t) => t.id === state.activeTabId)
          if (currentIdx >= 0) {
            state.tabs[currentIdx].name = state.tabs[currentIdx].defaultName
          }
        })
      } catch (err) {
        console.error('Failed to hold bill:', err)
        // Re-throw the error to be caught by the UI layer for user notification
        throw err
      }
    },

    recallBill: async (heldBillId: string) => {
      await billingService.deleteHeldBill(heldBillId)

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

        state.heldBills.splice(heldIndex, 1)

        const currentIdx = state.tabs.findIndex((t) => t.id === state.activeTabId)
        if (currentIdx >= 0) {
          state.tabs[currentIdx].name = state.customerName
            ? state.customerName
            : state.tabs[currentIdx].defaultName
        }
      })
    },

    loadHeldBills: async () => {
      try {
        const held = await billingService.getHeldBills()
        set((state) => {
          state.heldBills = held as HeldBill[]
        })
      } catch {
        /* ignore */
      }
    },

    deleteHeldBill: async (id: string) => {
      try {
        await billingService.deleteHeldBill(id)
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

// Auto-save store updates to localStorage
useBillingStore.subscribe((state) => {
  try {
    // Synchronize the active cart state into the active tab object
    const syncedTabs = state.tabs.map((t) => {
      if (t.id === state.activeTabId) {
        return {
          ...t,
          name: state.customerName ? state.customerName : t.name,
          items: state.items,
          customerName: state.customerName,
          customerPhone: state.customerPhone,
          customerId: state.customerId,
          discount: state.discount,
          discountType: state.discountType,
          currentHeldBillId: state.currentHeldBillId
        }
      }
      return t
    })

    const saved: SavedCartTabs = {
      tabs: syncedTabs,
      activeTabId: state.activeTabId
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(saved))
  } catch (err) {
    console.error('Failed to auto-save cart tabs to localStorage:', err)
  }
})
