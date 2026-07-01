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
    item: {
      productId: number
      qty: number
      purchaseRate: number
      sellingRate: number
      mrp: number
    },
    purchaseId: number
  ) => void
  deleteStockLedgerByPurchase: (id: number) => void
}

export class SqlitePurchaseStockRepository implements PurchaseStockRepository {
  updateProductFromPurchase(item: PurchaseItem): void {
    if (!item.productId) return
    const db = getSqlite()
    const current = db
      .prepare('SELECT purchase_price, mrp, selling_price FROM products WHERE id = ?')
      .get(item.productId) as
      | { purchase_price: number; mrp: number; selling_price: number }
      | undefined

    const nextPurchasePrice = item.purchaseRate || 0
    const nextMrp = item.mrp && item.mrp > 0 ? item.mrp : current?.mrp
    const nextSellingPrice =
      item.sellingRate && item.sellingRate > 0 ? item.sellingRate : current?.selling_price

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

    if (current) {
      this.insertPriceHistory(
        item.productId,
        'purchase_price',
        current.purchase_price,
        nextPurchasePrice
      )
      if (typeof nextMrp === 'number') {
        this.insertPriceHistory(item.productId, 'mrp', current.mrp, nextMrp)
      }
      if (typeof nextSellingPrice === 'number') {
        this.insertPriceHistory(
          item.productId,
          'selling_price',
          current.selling_price,
          nextSellingPrice
        )
      }
    }
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
    item: {
      productId: number
      qty: number
      purchaseRate: number
      sellingRate: number
      mrp: number
    },
    purchaseId: number
  ): void {
    const db = getSqlite()
    const current = db
      .prepare(
        `SELECT name, current_stock, purchase_price, mrp, selling_price
         FROM products WHERE id = ?`
      )
      .get(item.productId) as
      | {
          name: string
          current_stock: number
          purchase_price: number
          mrp: number
          selling_price: number
        }
      | undefined

    if (!current) {
      throw new Error(`Cannot reverse purchase stock: product ${item.productId} was not found.`)
    }

    if (!this.allowsNegativeStock() && current.current_stock < item.qty) {
      throw new Error(
        `Cannot delete purchase: "${current.name}" has only ${current.current_stock} in stock, but this purchase added ${item.qty}. Some stock may already be sold.`
      )
    }

    db.prepare(
      "UPDATE products SET current_stock = current_stock - ?, updated_at = datetime('now','localtime') WHERE id = ?"
    ).run(item.qty, item.productId)

    const prevPurchase = db
      .prepare(
        `SELECT pi.purchase_rate, pi.selling_rate, pi.mrp
         FROM purchase_items pi
         JOIN purchases p ON pi.purchase_id = p.id
         WHERE pi.product_id = ? AND pi.purchase_id != ?
         ORDER BY p.id DESC LIMIT 1`
      )
      .get(item.productId, purchaseId) as
      | { purchase_rate: number; selling_rate: number; mrp: number }
      | undefined

    if (prevPurchase) {
      const nextMrp = prevPurchase.mrp > 0 ? prevPurchase.mrp : current.mrp
      const nextSellingPrice =
        prevPurchase.selling_rate > 0 ? prevPurchase.selling_rate : current.selling_price

      db.prepare(
        `UPDATE products SET
          purchase_price = ?,
          mrp = CASE WHEN ? > 0 THEN ? ELSE mrp END,
          selling_price = CASE WHEN ? > 0 THEN ? ELSE selling_price END,
          updated_at = datetime('now','localtime')
        WHERE id = ?`
      ).run(
        prevPurchase.purchase_rate,
        prevPurchase.mrp,
        prevPurchase.mrp,
        prevPurchase.selling_rate,
        prevPurchase.selling_rate,
        item.productId
      )

      this.insertPriceHistory(
        item.productId,
        'purchase_price',
        current.purchase_price,
        prevPurchase.purchase_rate
      )
      this.insertPriceHistory(item.productId, 'mrp', current.mrp, nextMrp)
      this.insertPriceHistory(
        item.productId,
        'selling_price',
        current.selling_price,
        nextSellingPrice
      )
    }
  }

  deleteStockLedgerByPurchase(id: number): void {
    const db = getSqlite()
    db.prepare(
      "DELETE FROM stock_ledger WHERE reference_type = 'purchase' AND reference_id = ?"
    ).run(id)
  }

  private allowsNegativeStock(): boolean {
    const db = getSqlite()
    const setting = db
      .prepare("SELECT value FROM settings WHERE key = 'allowNegativeStock'")
      .get() as { value: string } | undefined
    return setting?.value === 'true'
  }

  private insertPriceHistory(
    productId: number,
    fieldName: 'purchase_price' | 'mrp' | 'selling_price',
    oldValue: number,
    newValue: number
  ): void {
    if (oldValue === newValue) return
    const db = getSqlite()
    db.prepare(
      `INSERT INTO price_history (product_id, field_name, old_value, new_value)
       VALUES (?, ?, ?, ?)`
    ).run(productId, fieldName, oldValue, newValue)
  }
}

export const purchaseStockRepo = new SqlitePurchaseStockRepository()
