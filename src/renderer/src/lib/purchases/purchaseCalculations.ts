import type { PurchaseItem } from '@shared/types'

export interface PurchaseLineItem extends PurchaseItem {
  _uid: string
}

export function recalcPurchaseItem(item: PurchaseLineItem): PurchaseLineItem {
  const lineTotal = item.purchaseRate * item.qty
  const gstAmount = (lineTotal * item.gstRate) / 100
  return { ...item, gstAmount, amount: lineTotal + gstAmount }
}

export function computePurchaseTotals(items: PurchaseLineItem[]): {
  subtotal: number
  totalGst: number
  grandTotal: number
  totalQty: number
} {
  const subtotal = items.reduce((sum, item) => sum + item.purchaseRate * item.qty, 0)
  const totalGst = items.reduce((sum, item) => sum + item.gstAmount, 0)
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0)

  return {
    subtotal,
    totalGst,
    grandTotal: subtotal + totalGst,
    totalQty
  }
}
