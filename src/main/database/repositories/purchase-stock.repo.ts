import { getSqlite } from '../connection'
import type { PurchaseItem } from '../../../shared/types'

export interface PurchaseStockRepository {
  updateProductFromPurchase: (item: PurchaseItem) => void
  insertStockLedgerEntry: (
    productId: number,
    qty: number,
    purchaseId: number,
    purchaseNo: string
  ) => void
  revertProductStock: (
    item: { productId: number; qty: number; purchaseRate: number; sellingRate: number },
    purchaseId: number
  ) => void
  deleteStockLedgerByPurchase: (id: number) => void
}

export class SqlitePurchaseStockRepository implements PurchaseStockRepository {
  updateProductFromPurchase(item: PurchaseItem): void {
    if (!item.productId) return
    const db = getSqlite()
    db.prepare(
      `UPDATE products SET
        current_stock = current_stock + ?,
        purchase_price = ?,
        mrp = CASE WHEN ? > 0 THEN ? ELSE mrp END,
        selling_price = CASE WHEN ? > 0 THEN ? ELSE selling_price END,
        updated_at = datetime('now','localtime')
      WHERE id = ?`
    ).run(
      item.qty || 0,
      item.purchaseRate || 0,
      item.mrp || 0,
      item.mrp || 0,
      item.sellingRate || 0,
      item.sellingRate || 0,
      item.productId
    )
  }

  insertStockLedgerEntry(
    productId: number,
    qty: number,
    purchaseId: number,
    purchaseNo: string
  ): void {
    const db = getSqlite()
    db.prepare(
      `INSERT INTO stock_ledger (product_id, type, qty, reference_type, reference_id, notes)
       VALUES (?, 'purchase', ?, 'purchase', ?, ?)`
    ).run(productId, qty, purchaseId, `Purchase ${purchaseNo}`)
  }

  revertProductStock(
    item: { productId: number; qty: number; purchaseRate: number; sellingRate: number },
    purchaseId: number
  ): void {
    const db = getSqlite()
    db.prepare('UPDATE products SET current_stock = MAX(0, current_stock - ?) WHERE id = ?').run(
      item.qty,
      item.productId
    )

    const prevPurchase = db
      .prepare(
        `SELECT pi.purchase_rate, pi.selling_rate
         FROM purchase_items pi
         JOIN purchases p ON pi.purchase_id = p.id
         WHERE pi.product_id = ? AND pi.purchase_id != ?
         ORDER BY p.id DESC LIMIT 1`
      )
      .get(item.productId, purchaseId) as
      | { purchase_rate: number; selling_rate: number }
      | undefined

    if (prevPurchase) {
      db.prepare(
        `UPDATE products SET
          purchase_price = ?,
          selling_price = CASE WHEN ? > 0 THEN ? ELSE selling_price END,
          updated_at = datetime('now','localtime')
        WHERE id = ?`
      ).run(
        prevPurchase.purchase_rate,
        prevPurchase.selling_rate,
        prevPurchase.selling_rate,
        item.productId
      )
    }
  }

  deleteStockLedgerByPurchase(id: number): void {
    const db = getSqlite()
    db.prepare(
      "DELETE FROM stock_ledger WHERE reference_type = 'purchase' AND reference_id = ?"
    ).run(id)
  }
}

export const purchaseStockRepo = new SqlitePurchaseStockRepository()
