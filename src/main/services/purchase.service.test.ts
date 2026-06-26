import { describe, expect, it, vi } from 'vitest'
import type { Purchase, PurchaseCreateData } from '../../shared/types'
import { PurchaseService } from './purchase.service'
import type { PurchaseRecordRepository } from '../database/repositories/purchase-record.repo'
import type { PurchaseTotalsService } from './purchase-totals.service'
import { PurchaseNumberService } from './purchase-number.service'
import { PurchaseStockService } from './purchase-stock.service'

describe('PurchaseService', () => {
  it('creates a purchase and updates stock records', () => {
    const purchase: Purchase = {
      id: 101,
      purchaseNo: 'PUR/2026/00010',
      date: '2026-05-27',
      supplierId: null,
      supplierName: null,
      city: null,
      invoiceNo: null,
      invoiceDate: null,
      totalItems: 2,
      totalQty: 3,
      subtotal: 140,
      gstAmount: 9,
      discountAmount: 0,
      grandTotal: 149,
      paymentMode: 'cash',
      paymentStatus: 'paid',
      amountPaid: 149,
      notes: null,
      createdBy: null,
      createdAt: '2026-05-27',
      items: []
    }

    const data: PurchaseCreateData = {
      items: [
        {
          productId: 1,
          productName: 'Item A',
          barcode: null,
          hsnCode: null,
          qty: 2,
          purchaseRate: 50,
          sellingRate: 70,
          mrp: 75,
          gstRate: 5,
          gstAmount: 5,
          amount: 105
        },
        {
          productId: 2,
          productName: 'Item B',
          barcode: null,
          hsnCode: null,
          qty: 1,
          purchaseRate: 40,
          sellingRate: 60,
          mrp: 65,
          gstRate: 10,
          gstAmount: 4,
          amount: 44
        }
      ]
    }

    const repo = {
      transaction: (fn: () => number) => fn(),
      createPurchaseRecord: vi.fn().mockReturnValue(101),
      getById: vi.fn().mockReturnValue(purchase)
    }

    const numberService = {
      getNextNumber: vi.fn().mockReturnValue('PUR/2026/00010'),
      getSequence: vi.fn().mockReturnValue(10),
      updateLastSequence: vi.fn()
    }

    const totalsService = {
      computeTotals: vi.fn().mockReturnValue({
        subtotal: 140,
        totalGst: 9,
        totalQty: 3,
        totalItems: 2,
        grandTotal: 149
      })
    }

    const stockService = {
      applyPurchaseItems: vi.fn()
    }

    const service = new PurchaseService(
      repo as unknown as PurchaseRecordRepository,
      numberService as unknown as PurchaseNumberService,
      totalsService as unknown as PurchaseTotalsService,
      stockService as unknown as PurchaseStockService
    )
    const result = service.create(data)

    expect(result).toBe(purchase)
    expect(repo.createPurchaseRecord).toHaveBeenCalledOnce()
    const args = repo.createPurchaseRecord.mock.calls[0][0]
    expect(args.totalItems).toBe(2)
    expect(args.totalQty).toBe(3)
    expect(args.subtotal).toBe(140)
    expect(args.totalGst).toBe(9)
    expect(args.grandTotal).toBe(149)

    expect(stockService.applyPurchaseItems).toHaveBeenCalledTimes(1)
    expect(numberService.updateLastSequence).toHaveBeenCalledWith(10)
  })

  it('reverts stock and deletes purchase records', () => {
    const repo = {
      transaction: (fn: () => void) => fn(),
      getById: vi.fn()
    }

    const stockService = {
      revertPurchaseStock: vi.fn(),
      deletePurchaseRecords: vi.fn()
    }

    const service = new PurchaseService(
      repo as unknown as PurchaseRecordRepository,
      undefined,
      undefined,
      stockService as unknown as PurchaseStockService
    )
    service.delete(55)

    expect(stockService.revertPurchaseStock).toHaveBeenCalledWith(55)
    expect(stockService.deletePurchaseRecords).toHaveBeenCalledWith(55)
  })
})
