import type { PurchaseItem } from '../../shared/types'
import {
  purchaseItemRepo,
  type PurchaseItemRepository
} from '../database/repositories/purchase-item.repo'
import {
  purchaseStockRepo,
  type PurchaseStockRepository
} from '../database/repositories/purchase-stock.repo'
import {
  purchaseRecordRepo,
  type PurchaseRecordRepository
} from '../database/repositories/purchase-record.repo'

export class PurchaseStockService {
  constructor(
    private readonly itemRepo: PurchaseItemRepository = purchaseItemRepo,
    private readonly stockRepo: PurchaseStockRepository = purchaseStockRepo,
    private readonly recordRepo: PurchaseRecordRepository = purchaseRecordRepo
  ) {}

  applyPurchaseItems(purchaseId: number, purchaseNo: string, items: PurchaseItem[]): void {
    for (const item of items) {
      const lineTotal = (item.purchaseRate || 0) * (item.qty || 0)
      const gstAmount = (lineTotal * (item.gstRate || 0)) / 100
      const lineAmount = lineTotal + gstAmount
      this.itemRepo.insertPurchaseItem(
        purchaseId,
        { ...item, gstAmount, amount: lineAmount },
        lineAmount
      )

      if (item.productId) {
        this.stockRepo.updateProductFromPurchase(item)
        this.stockRepo.insertStockLedgerEntry(item.productId, item.qty || 0, purchaseId, purchaseNo)
      }
    }
  }

  revertPurchaseStock(purchaseId: number): void {
    const items = this.itemRepo.getPurchaseItemsForDeletion(purchaseId)
    for (const item of items) {
      if (item.productId) {
        this.stockRepo.revertProductStock(item, purchaseId)
      }
    }
  }

  deletePurchaseRecords(purchaseId: number): void {
    this.stockRepo.deleteStockLedgerByPurchase(purchaseId)
    this.itemRepo.deletePurchaseItems(purchaseId)
    this.recordRepo.deletePurchase(purchaseId)
  }
}

export const purchaseStockService = new PurchaseStockService()
