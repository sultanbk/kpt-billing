import {
  purchaseSettingsRepo,
  type PurchaseSettingsRepository
} from '../database/repositories/purchase-settings.repo'

export class PurchaseNumberService {
  constructor(private readonly repo: PurchaseSettingsRepository = purchaseSettingsRepo) {}

  getNextNumber(): string {
    return this.repo.getNextPurchaseNumber()
  }

  getSequence(purchaseNo: string): number {
    const lastSeqStr = purchaseNo.split('/').pop() || '1'
    return parseInt(lastSeqStr)
  }

  updateLastSequence(sequence: number): void {
    this.repo.updateLastPurchaseNumber(sequence)
  }
}

export const purchaseNumberService = new PurchaseNumberService()
