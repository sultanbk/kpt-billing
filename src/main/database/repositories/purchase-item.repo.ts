import { getSqlite } from '../connection'
import type { PurchaseItem } from '../../../shared/types'

export interface PurchaseItemRepository {
  insertPurchaseItem: (purchaseId: number, item: PurchaseItem, lineAmount: number) => void
  getPurchaseItemsForDeletion: (id: number) => {
    productId: number
    qty: number
    purchaseRate: number
    sellingRate: number
    mrp: number
  }[]
  deletePurchaseItems: (id: number) => void
}

export class SqlitePurchaseItemRepository implements PurchaseItemRepository {
  insertPurchaseItem(purchaseId: number, item: PurchaseItem, lineAmount: number): void {
    const db = getSqlite()
    db.prepare(
      `INSERT INTO purchase_items (purchase_id, product_id, product_name, barcode, hsn_code,
       qty, purchase_rate, selling_rate, mrp, gst_rate, gst_amount, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
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
  }

  getPurchaseItemsForDeletion(id: number): {
    productId: number
    qty: number
    purchaseRate: number
    sellingRate: number
    mrp: number
  }[] {
    const db = getSqlite()
    const rows = db
      .prepare(
        'SELECT product_id, qty, purchase_rate, selling_rate, mrp FROM purchase_items WHERE purchase_id = ?'
      )
      .all(id) as {
      product_id: number
      qty: number
      purchase_rate: number
      selling_rate: number
      mrp: number
    }[]

    return rows.map((row) => ({
      productId: row.product_id,
      qty: row.qty,
      purchaseRate: row.purchase_rate,
      sellingRate: row.selling_rate,
      mrp: row.mrp
    }))
  }

  deletePurchaseItems(id: number): void {
    const db = getSqlite()
    db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(id)
  }
}

export const purchaseItemRepo = new SqlitePurchaseItemRepository()
