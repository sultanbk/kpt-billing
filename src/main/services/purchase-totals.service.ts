import type { PurchaseItem } from '../../shared/types'

export type PurchaseTotals = {
  subtotal: number
  totalGst: number
  totalQty: number
  totalItems: number
  grandTotal: number
}

export class PurchaseTotalsService {
  computeTotals(items: PurchaseItem[]): PurchaseTotals {
    let subtotal = 0
    let totalGst = 0
    let totalQty = 0

    for (const item of items) {
      const lineTotal = (item.purchaseRate || 0) * (item.qty || 0)
      const gst = (lineTotal * (item.gstRate || 0)) / 100
      subtotal += lineTotal
      totalGst += gst
      totalQty += item.qty || 0
    }

    return {
      subtotal,
      totalGst,
      totalQty,
      totalItems: items.length,
      grandTotal: subtotal + totalGst
    }
  }
}

export const purchaseTotalsService = new PurchaseTotalsService()
