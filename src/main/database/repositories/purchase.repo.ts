// ============================================================================
// KPT Billing - Purchase Repository Facade (delegates to focused repositories)
// ============================================================================
import type { Purchase, PurchaseItem, PurchaseCreateData } from '../../../shared/types'
import { purchaseRecordRepo, type PurchaseRecordRepository } from './purchase-record.repo'
import { purchaseItemRepo, type PurchaseItemRepository } from './purchase-item.repo'
import { purchaseStockRepo, type PurchaseStockRepository } from './purchase-stock.repo'
import { purchaseSettingsRepo, type PurchaseSettingsRepository } from './purchase-settings.repo'

export class PurchaseRepository {
  constructor(
    private readonly recordRepo: PurchaseRecordRepository = purchaseRecordRepo,
    private readonly itemRepo: PurchaseItemRepository = purchaseItemRepo,
    private readonly stockRepo: PurchaseStockRepository = purchaseStockRepo,
    private readonly settingsRepo: PurchaseSettingsRepository = purchaseSettingsRepo
  ) {}

  transaction<T>(fn: () => T): T {
    return this.recordRepo.transaction(fn)
  }

  getNextPurchaseNumber(): string {
    return this.settingsRepo.getNextPurchaseNumber()
  }

  updateLastPurchaseNumber(lastSeq: number): void {
    this.settingsRepo.updateLastPurchaseNumber(lastSeq)
  }

  createPurchaseRecord(args: {
    purchaseNo: string
    date: string
    data: PurchaseCreateData
    totalItems: number
    totalQty: number
    subtotal: number
    totalGst: number
    grandTotal: number
  }): number {
    return this.recordRepo.createPurchaseRecord(args)
  }

  insertPurchaseItem(purchaseId: number, item: PurchaseItem, lineAmount: number): void {
    this.itemRepo.insertPurchaseItem(purchaseId, item, lineAmount)
  }

  getPurchaseItemsForDeletion(id: number): {
    productId: number
    qty: number
    purchaseRate: number
    sellingRate: number
  }[] {
    return this.itemRepo.getPurchaseItemsForDeletion(id)
  }

  deletePurchaseItems(id: number): void {
    this.itemRepo.deletePurchaseItems(id)
  }

  updateProductFromPurchase(item: PurchaseItem): void {
    this.stockRepo.updateProductFromPurchase(item)
  }

  insertStockLedgerEntry(
    productId: number,
    qty: number,
    purchaseId: number,
    purchaseNo: string
  ): void {
    this.stockRepo.insertStockLedgerEntry(productId, qty, purchaseId, purchaseNo)
  }

  revertProductStock(
    item: { productId: number; qty: number; purchaseRate: number; sellingRate: number },
    purchaseId: number
  ): void {
    this.stockRepo.revertProductStock(item, purchaseId)
  }

  deleteStockLedgerByPurchase(id: number): void {
    this.stockRepo.deleteStockLedgerByPurchase(id)
  }

  getById(id: number): Purchase | null {
    return this.recordRepo.getById(id)
  }

  getAll(
    filters: {
      dateFrom?: string
      dateTo?: string
      supplierId?: number
      city?: string
      page?: number
      pageSize?: number
    } = {}
  ): { data: Purchase[]; total: number; page: number; pageSize: number } {
    return this.recordRepo.getAll(filters)
  }

  getRecentPurchases(limit = 10): Purchase[] {
    return this.recordRepo.getRecentPurchases(limit)
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
    return this.recordRepo.getPurchaseSummary(dateFrom, dateTo)
  }

  deletePurchase(id: number): void {
    this.recordRepo.deletePurchase(id)
  }
}

export const purchaseRepo = new PurchaseRepository()
