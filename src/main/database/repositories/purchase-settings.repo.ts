import { getSqlite } from '../connection'

export interface PurchaseSettingsRepository {
  getNextPurchaseNumber: () => string
  updateLastPurchaseNumber: (lastSeq: number) => void
}

export class SqlitePurchaseSettingsRepository implements PurchaseSettingsRepository {
  getNextPurchaseNumber(): string {
    const db = getSqlite()
    const year = new Date().getFullYear()
    const prefix = `PUR/${year}/`

    const lastSeq = db
      .prepare("SELECT value FROM settings WHERE key = 'lastPurchaseNumber'")
      .get() as { value: string } | undefined
    const nextSeq = (parseInt(lastSeq?.value || '0') + 1).toString().padStart(5, '0')
    return `${prefix}${nextSeq}`
  }

  updateLastPurchaseNumber(lastSeq: number): void {
    const db = getSqlite()
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('lastPurchaseNumber', ?)").run(
      lastSeq.toString()
    )
  }
}

export const purchaseSettingsRepo = new SqlitePurchaseSettingsRepository()
