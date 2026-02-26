// ============================================================================
// KPT Billing - Purchase Repository (Stock-In / Bulk Purchasing)
// ============================================================================
import { getSqlite } from '../connection'
import { mapRow, mapRows } from '../utils'
import type { Purchase, PurchaseItem, PurchaseCreateData } from '../../../shared/types'
import { getLocalDateString } from '../../../shared/constants'

export class PurchaseRepository {
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

  create(data: PurchaseCreateData): Purchase {
    const db = getSqlite()
    const now = new Date()
    const date = getLocalDateString(now)

    const result = db.transaction(() => {
      const purchaseNo = this.getNextPurchaseNumber()
      const lastSeqStr = purchaseNo.split('/').pop() || '1'
      const lastSeq = parseInt(lastSeqStr)

      let subtotal = 0
      let totalGst = 0
      let totalQty = 0
      const totalItems = data.items.length

      for (const item of data.items) {
        const lineTotal = (item.purchaseRate || 0) * (item.qty || 0)
        const gst = (item.gstAmount || 0)
        subtotal += lineTotal
        totalGst += gst
        totalQty += (item.qty || 0)
      }

      const grandTotal = subtotal + totalGst - (0) // no purchase-level discount for now

      const purchaseResult = db
        .prepare(
          `INSERT INTO purchases (purchase_no, date, supplier_id, supplier_name, city,
           invoice_no, invoice_date, total_items, total_qty, subtotal, gst_amount,
           discount_amount, grand_total, payment_mode, payment_status, amount_paid, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          purchaseNo,
          date,
          data.supplierId || null,
          data.supplierName || null,
          data.city || null,
          data.invoiceNo || null,
          data.invoiceDate || null,
          totalItems,
          totalQty,
          Math.round(subtotal * 100) / 100,
          Math.round(totalGst * 100) / 100,
          0,
          Math.round(grandTotal * 100) / 100,
          data.paymentMode || 'cash',
          data.paymentStatus || 'paid',
          data.amountPaid ?? grandTotal,
          data.notes || null
        )

      const purchaseId = Number(purchaseResult.lastInsertRowid)

      // Insert purchase items + update product stock & purchase price
      const insertItem = db.prepare(
        `INSERT INTO purchase_items (purchase_id, product_id, product_name, barcode, hsn_code,
         qty, purchase_rate, selling_rate, mrp, gst_rate, gst_amount, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )

      for (const item of data.items) {
        const lineAmount = (item.purchaseRate || 0) * (item.qty || 0) + (item.gstAmount || 0)

        insertItem.run(
          purchaseId,
          item.productId || null,
          item.productName,
          item.barcode || null,
          item.hsnCode || null,
          item.qty || 0,
          item.purchaseRate || 0,
          item.sellingRate || 0,
          item.mrp || 0,
          item.gstRate || 0,
          Math.round((item.gstAmount || 0) * 100) / 100,
          Math.round(lineAmount * 100) / 100
        )

        // Update product stock + purchase price + selling price
        if (item.productId) {
          db.prepare(
            `UPDATE products SET
              current_stock = current_stock + ?,
              purchase_price = ?,
              selling_price = CASE WHEN ? > 0 THEN ? ELSE selling_price END,
              updated_at = datetime('now','localtime')
            WHERE id = ?`
          ).run(
            item.qty || 0,
            item.purchaseRate || 0,
            item.sellingRate || 0,
            item.sellingRate || 0,
            item.productId
          )

          // Record in stock ledger
          db.prepare(
            `INSERT INTO stock_ledger (product_id, type, qty, reference_type, reference_id, notes)
             VALUES (?, 'purchase', ?, 'purchase', ?, ?)`
          ).run(item.productId, item.qty || 0, purchaseId, `Purchase ${purchaseNo}`)
        }
      }

      // Update purchase number sequence
      db.prepare(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('lastPurchaseNumber', ?)"
      ).run(lastSeq.toString())

      return purchaseId
    })()

    return this.getById(result)!
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

  getAll(filters: {
    dateFrom?: string
    dateTo?: string
    supplierId?: number
    city?: string
    page?: number
    pageSize?: number
  } = {}): { data: Purchase[]; total: number; page: number; pageSize: number } {
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
    const rows = db
      .prepare('SELECT * FROM purchases ORDER BY id DESC LIMIT ?')
      .all(limit)
    return mapRows<Purchase>(rows as Record<string, unknown>[])
  }

  getPurchaseSummary(dateFrom: string, dateTo: string): {
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
      .all(dateFrom, dateTo) as { supplierName: string; total: number; count: number }[]

    return {
      totalPurchases: summary.total_purchases ?? 0,
      totalAmount: summary.total_amount ?? 0,
      totalPaid: summary.total_paid ?? 0,
      totalUnpaid: summary.total_unpaid ?? 0,
      cityWise,
      supplierWise
    }
  }

  delete(id: number): void {
    const db = getSqlite()
    db.transaction(() => {
      // Reverse stock additions
      const items = db
        .prepare('SELECT product_id, qty FROM purchase_items WHERE purchase_id = ?')
        .all(id) as { product_id: number; qty: number }[]

      for (const item of items) {
        if (item.product_id) {
          db.prepare(
            'UPDATE products SET current_stock = MAX(0, current_stock - ?) WHERE id = ?'
          ).run(item.qty, item.product_id)
        }
      }

      // Delete stock ledger entries
      db.prepare(
        "DELETE FROM stock_ledger WHERE reference_type = 'purchase' AND reference_id = ?"
      ).run(id)

      // Delete items and purchase
      db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(id)
      db.prepare('DELETE FROM purchases WHERE id = ?').run(id)
    })()
  }
}

export const purchaseRepo = new PurchaseRepository()
