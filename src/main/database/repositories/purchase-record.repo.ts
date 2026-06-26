import { getSqlite } from '../connection'
import { mapRow, mapRows } from '../utils'
import type { Purchase, PurchaseItem, PurchaseCreateData } from '../../../shared/types'

type PurchaseFilters = {
  dateFrom?: string
  dateTo?: string
  supplierId?: number
  city?: string
  page?: number
  pageSize?: number
}

export interface PurchaseRecordRepository {
  transaction: <T>(fn: () => T) => T
  createPurchaseRecord: (args: {
    purchaseNo: string
    date: string
    data: PurchaseCreateData
    totalItems: number
    totalQty: number
    subtotal: number
    totalGst: number
    grandTotal: number
  }) => number
  getById: (id: number) => Purchase | null
  getAll: (filters?: PurchaseFilters) => {
    data: Purchase[]
    total: number
    page: number
    pageSize: number
  }
  getRecentPurchases: (limit?: number) => Purchase[]
  getPurchaseSummary: (
    dateFrom: string,
    dateTo: string
  ) => {
    totalPurchases: number
    totalAmount: number
    totalPaid: number
    totalUnpaid: number
    cityWise: { city: string; total: number; count: number }[]
    supplierWise: { supplierName: string; total: number; count: number }[]
  }
  deletePurchase: (id: number) => void
}

export class SqlitePurchaseRecordRepository implements PurchaseRecordRepository {
  transaction<T>(fn: () => T): T {
    const db = getSqlite()
    return db.transaction(fn)()
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
    const db = getSqlite()
    const result = db
      .prepare(
        `INSERT INTO purchases (purchase_no, date, supplier_id, supplier_name, city,
         invoice_no, invoice_date, total_items, total_qty, subtotal, gst_amount,
         discount_amount, grand_total, payment_mode, payment_status, amount_paid, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        args.purchaseNo,
        args.date,
        args.data.supplierId || null,
        args.data.supplierName || null,
        args.data.city || null,
        args.data.invoiceNo || null,
        args.data.invoiceDate || null,
        args.totalItems,
        args.totalQty,
        Math.round(args.subtotal * 100) / 100,
        Math.round(args.totalGst * 100) / 100,
        0,
        Math.round(args.grandTotal * 100) / 100,
        args.data.paymentMode || 'cash',
        args.data.paymentStatus || 'paid',
        args.data.amountPaid ?? args.grandTotal,
        args.data.notes || null
      )

    return Number(result.lastInsertRowid)
  }

  getById(id: number): Purchase | null {
    const db = getSqlite()
    const row = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined
    if (!row) return null

    const items = db
      .prepare('SELECT * FROM purchase_items WHERE purchase_id = ?')
      .all(id) as Record<string, unknown>[]

    return { ...mapRow<Purchase>(row), items: mapRows<PurchaseItem>(items) }
  }

  getAll(filters: PurchaseFilters = {}): {
    data: Purchase[]
    total: number
    page: number
    pageSize: number
  } {
    const db = getSqlite()
    const { dateFrom, dateTo, supplierId, city, page = 1, pageSize = 50 } = filters

    let where = 'WHERE 1=1'
    const params: unknown[] = []

    if (dateFrom) {
      where += ' AND p.date >= ?'
      params.push(dateFrom)
    }
    if (dateTo) {
      where += ' AND p.date <= ?'
      params.push(dateTo)
    }
    if (supplierId) {
      where += ' AND p.supplier_id = ?'
      params.push(supplierId)
    }
    if (city) {
      where += ' AND p.city = ?'
      params.push(city)
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as total FROM purchases p ${where}`)
      .get(...params) as { total: number }

    const offset = (page - 1) * pageSize
    const rows = db
      .prepare(
        `SELECT p.* FROM purchases p ${where}
         ORDER BY p.id DESC LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, offset)

    return {
      data: mapRows<Purchase>(rows as Record<string, unknown>[]),
      total: countResult.total,
      page,
      pageSize
    }
  }

  getRecentPurchases(limit = 10): Purchase[] {
    const db = getSqlite()
    const rows = db.prepare('SELECT * FROM purchases ORDER BY id DESC LIMIT ?').all(limit)
    return mapRows<Purchase>(rows as Record<string, unknown>[])
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
    const db = getSqlite()

    const summary = db
      .prepare(
        `SELECT
           COUNT(*) as total_purchases,
           COALESCE(SUM(grand_total), 0) as total_amount,
           COALESCE(SUM(amount_paid), 0) as total_paid,
           COALESCE(SUM(CASE WHEN payment_status != 'paid' THEN grand_total - amount_paid ELSE 0 END), 0) as total_unpaid
         FROM purchases WHERE date >= ? AND date <= ?`
      )
      .get(dateFrom, dateTo) as Record<string, number>

    const cityWise = db
      .prepare(
        `SELECT COALESCE(city, 'Unknown') as city,
           COALESCE(SUM(grand_total), 0) as total,
           COUNT(*) as count
         FROM purchases WHERE date >= ? AND date <= ?
         GROUP BY city ORDER BY total DESC`
      )
      .all(dateFrom, dateTo) as { city: string; total: number; count: number }[]

    const supplierWise = db
      .prepare(
        `SELECT COALESCE(supplier_name, 'Unknown') as supplier_name,
           COALESCE(SUM(grand_total), 0) as total,
           COUNT(*) as count
         FROM purchases WHERE date >= ? AND date <= ?
         GROUP BY supplier_name ORDER BY total DESC`
      )
      .all(dateFrom, dateTo) as { supplier_name: string; total: number; count: number }[]

    return {
      totalPurchases: summary.total_purchases ?? 0,
      totalAmount: summary.total_amount ?? 0,
      totalPaid: summary.total_paid ?? 0,
      totalUnpaid: summary.total_unpaid ?? 0,
      cityWise,
      supplierWise: supplierWise.map((s) => ({
        supplierName: s.supplier_name,
        total: s.total,
        count: s.count
      }))
    }
  }

  deletePurchase(id: number): void {
    const db = getSqlite()
    db.prepare('DELETE FROM purchases WHERE id = ?').run(id)
  }
}

export const purchaseRecordRepo = new SqlitePurchaseRecordRepository()
