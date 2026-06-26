import { describe, expect, it } from 'vitest'
import {
  computePurchaseTotals,
  recalcPurchaseItem,
  type PurchaseLineItem
} from './purchaseCalculations'

describe('purchaseCalculations', () => {
  it('recalculates gst and amount for a line item', () => {
    const item: PurchaseLineItem = {
      _uid: 'test',
      productId: 1,
      productName: 'Sample',
      barcode: null,
      hsnCode: null,
      qty: 2,
      purchaseRate: 50,
      sellingRate: 70,
      mrp: 80,
      gstRate: 5,
      gstAmount: 0,
      amount: 0
    }

    const updated = recalcPurchaseItem(item)

    expect(updated.gstAmount).toBe(5)
    expect(updated.amount).toBe(105)
  })

  it('computes totals from purchase items', () => {
    const items: PurchaseLineItem[] = [
      recalcPurchaseItem({
        _uid: 'a',
        productId: 1,
        productName: 'A',
        barcode: null,
        hsnCode: null,
        qty: 1,
        purchaseRate: 100,
        sellingRate: 120,
        mrp: 130,
        gstRate: 12,
        gstAmount: 0,
        amount: 0
      }),
      recalcPurchaseItem({
        _uid: 'b',
        productId: 2,
        productName: 'B',
        barcode: null,
        hsnCode: null,
        qty: 3,
        purchaseRate: 20,
        sellingRate: 30,
        mrp: 35,
        gstRate: 5,
        gstAmount: 0,
        amount: 0
      })
    ]

    const totals = computePurchaseTotals(items)

    expect(totals.subtotal).toBe(160)
    expect(totals.totalGst).toBe(15)
    expect(totals.grandTotal).toBe(175)
    expect(totals.totalQty).toBe(4)
  })
})
