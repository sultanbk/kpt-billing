import type { Purchase, PurchaseCreateData } from '../../shared/types'
import { getLocalDateString } from '../../shared/constants'
import {
  purchaseRecordRepo,
  type PurchaseRecordRepository
} from '../database/repositories/purchase-record.repo'
import { productRepo } from '../database/repositories/product.repo'
import { PurchaseNumberService } from './purchase-number.service'
import { purchaseTotalsService, type PurchaseTotalsService } from './purchase-totals.service'
import { PurchaseStockService } from './purchase-stock.service'

type PurchaseFilters = {
  dateFrom?: string
  dateTo?: string
  supplierId?: number
  city?: string
  page?: number
  pageSize?: number
}

export class PurchaseService {
  private readonly numberService: PurchaseNumberService
  private readonly totalsService: PurchaseTotalsService
  private readonly stockService: PurchaseStockService

  constructor(
    private readonly repo: PurchaseRecordRepository = purchaseRecordRepo,
    numberService?: PurchaseNumberService,
    totalsService?: PurchaseTotalsService,
    stockService?: PurchaseStockService
  ) {
    this.numberService = numberService ?? new PurchaseNumberService()
    this.totalsService = totalsService ?? purchaseTotalsService
    this.stockService = stockService ?? new PurchaseStockService()
  }

  getNextPurchaseNumber(): string {
    return this.numberService.getNextNumber()
  }

  create(data: PurchaseCreateData): Purchase {
    const purchaseNo = this.numberService.getNextNumber()
    const lastSeq = this.numberService.getSequence(purchaseNo)
    const date = getLocalDateString(new Date())
    const totals = this.totalsService.computeTotals(data.items)

    const purchaseId = this.repo.transaction(() => {
      const resolvedItems = data.items.map((item) => {
        if (item.productId) return item

        const product = productRepo.create({
          name: item.productName.trim(),
          barcode: item.barcode || undefined,
          hsnCode: item.hsnCode || undefined,
          costPrice: item.purchaseRate || 0,
          mrp: item.mrp || 0,
          sellingPrice: item.sellingRate || item.purchaseRate || 0,
          gstRate: item.gstRate || 0,
          stock: 0,
          unit: 'pcs'
        })

        return {
          ...item,
          productId: product.id,
          productName: product.name
        }
      })
      const resolvedData = { ...data, items: resolvedItems }
      const createdId = this.repo.createPurchaseRecord({
        purchaseNo,
        date,
        data: resolvedData,
        totalItems: totals.totalItems,
        totalQty: totals.totalQty,
        subtotal: totals.subtotal,
        totalGst: totals.totalGst,
        grandTotal: totals.grandTotal
      })
      this.stockService.applyPurchaseItems(createdId, purchaseNo, resolvedItems)
      this.numberService.updateLastSequence(lastSeq)
      return createdId
    })

    return this.repo.getById(purchaseId)!
  }

  getById(id: number): Purchase | null {
    return this.repo.getById(id)
  }

  getAll(filters?: PurchaseFilters): {
    data: Purchase[]
    total: number
    page: number
    pageSize: number
  } {
    return this.repo.getAll(filters)
  }

  getRecentPurchases(limit = 10): Purchase[] {
    return this.repo.getRecentPurchases(limit)
  }

  getPurchaseSummary(
    dateFrom: string,
    dateTo: string
  ): {
    totalPurchases: number
    totalAmount: number
    totalPaid: number
    totalUnpaid: number
    cityWise: { city: string; total: number; count: number }[]
    supplierWise: { supplierName: string; total: number; count: number }[]
  } {
    return this.repo.getPurchaseSummary(dateFrom, dateTo)
  }

  delete(id: number): void {
    this.repo.transaction(() => {
      this.stockService.revertPurchaseStock(id)
      this.stockService.deletePurchaseRecords(id)
    })
  }
}

export const purchaseService = new PurchaseService()
