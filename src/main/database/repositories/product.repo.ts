// ============================================================================
// KPT Billing - Product Repository
// ============================================================================
import { getSqlite } from '../connection'
import { mapRow, mapRows } from '../utils'
import type {
  Product,
  ProductFormData,
  ProductFilters,
  PaginatedResult,
  ImportResult
} from '../../../shared/types'

export class ProductRepository {
  private generateSku(categoryId: number | null): string {
    const db = getSqlite()
    const prefix = 'KPT'
    // Get next sequence number
    const result = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }
    const seq = (result.count + 1).toString().padStart(5, '0')
    const catCode = categoryId
      ? (
          db.prepare('SELECT name FROM categories WHERE id = ?').get(categoryId) as {
            name: string
          }
        )?.name
          ?.substring(0, 3)
          .toUpperCase() || 'GEN'
      : 'GEN'
    return `${prefix}-${catCode}-${seq}`
  }

  search(term: string, limit: number = 20): Product[] {
    const db = getSqlite()
    const searchTerm = `%${term}%`
    const rows = db
      .prepare(
        `SELECT p.*, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = 1
           AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode = ? OR p.short_name LIKE ?)
         ORDER BY
           CASE WHEN p.barcode = ? THEN 0
                WHEN p.sku LIKE ? THEN 1
                ELSE 2
           END,
           p.name
         LIMIT ?`
      )
      .all(searchTerm, searchTerm, term, searchTerm, term, searchTerm, limit)
    return mapRows<Product>(rows as Record<string, unknown>[])
  }

  getAll(filters: ProductFilters = {}): PaginatedResult<Product> {
    const db = getSqlite()
    const {
      search,
      categoryId,
      stockStatus,
      isActive,
      page = 1,
      pageSize = 50,
      sortBy = 'name',
      sortOrder = 'asc'
    } = filters

    let where = 'WHERE 1=1'
    const params: unknown[] = []

    if (search) {
      where += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)'
      const s = `%${search}%`
      params.push(s, s, s)
    }
    if (categoryId) {
      where += ' AND p.category_id = ?'
      params.push(categoryId)
    }
    if (stockStatus === 'low') {
      where +=
        ' AND p.low_stock_alert IS NOT NULL AND p.current_stock <= p.low_stock_alert AND p.current_stock > 0'
    } else if (stockStatus === 'out') {
      where += ' AND p.current_stock <= 0'
    } else if (stockStatus === 'in') {
      where += ' AND p.current_stock > 0'
    }
    if (isActive !== undefined) {
      where += ' AND p.is_active = ?'
      params.push(isActive ? 1 : 0)
    }

    // Allowed sort columns
    const allowedSorts: Record<string, string> = {
      name: 'p.name',
      sku: 'p.sku',
      sellingPrice: 'p.selling_price',
      currentStock: 'p.current_stock',
      category: 'c.name',
      createdAt: 'p.created_at'
    }
    const sortCol = allowedSorts[sortBy] || 'p.name'
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC'

    const countResult = db
      .prepare(
        `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where}`
      )
      .get(...params) as { total: number }

    const offset = (page - 1) * pageSize
    const data = db
      .prepare(
        `SELECT p.*, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         ${where}
         ORDER BY ${sortCol} ${order}
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, offset)

    return {
      data: mapRows<Product>(data as Record<string, unknown>[]),
      total: countResult.total,
      page,
      pageSize
    }
  }

  getById(id: number): Product | null {
    const db = getSqlite()
    const result = db
      .prepare(
        `SELECT p.*, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`
      )
      .get(id) as Record<string, unknown> | undefined
    return result ? mapRow<Product>(result) : null
  }

  getByBarcode(barcode: string): Product | null {
    const db = getSqlite()
    const result = db
      .prepare(
        `SELECT p.*, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.barcode = ? AND p.is_active = 1`
      )
      .get(barcode) as Record<string, unknown> | undefined
    return result ? mapRow<Product>(result) : null
  }

  create(data: ProductFormData): Product {
    const db = getSqlite()
    const sku = this.generateSku(data.categoryId || null)

    const result = db
      .prepare(
        `INSERT INTO products (name, short_name, sku, barcode, category_id, sub_category, brand,
         hsn_code, purchase_price, selling_price, wholesale_price, gst_rate,
         opening_stock, current_stock, low_stock_alert, location, color, size, material, notes, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.name,
        data.shortName || null,
        sku,
        data.barcode || null,
        data.categoryId || null,
        data.subCategory || null,
        data.brand || null,
        data.hsnCode,
        data.costPrice,
        data.sellingPrice,
        data.wholesalePrice || null,
        data.gstRate,
        data.stock,
        data.stock, // currentStock = stock initially
        data.lowStockThreshold || null,
        data.location || null,
        data.color || null,
        data.size || null,
        data.material || null,
        data.description || null,
        data.isActive !== false ? 1 : 0
      )

    // Record opening stock in ledger
    if (data.stock > 0) {
      db.prepare(
        `INSERT INTO stock_ledger (product_id, type, qty, reference_type, notes)
         VALUES (?, 'opening', ?, 'manual', 'Opening stock')`
      ).run(result.lastInsertRowid, data.stock)
    }

    return this.getById(Number(result.lastInsertRowid))!
  }

  update(id: number, data: Partial<ProductFormData>): Product {
    const db = getSqlite()

    db.transaction(() => {
      // Fetch current product to track price changes
      const current = db
        .prepare('SELECT purchase_price, selling_price, wholesale_price FROM products WHERE id = ?')
        .get(id) as
        | { purchase_price: number; selling_price: number; wholesale_price: number | null }
        | undefined

      const fields: string[] = []
      const values: unknown[] = []

      if (data.name !== undefined) {
        fields.push('name = ?')
        values.push(data.name)
      }
      if (data.shortName !== undefined) {
        fields.push('short_name = ?')
        values.push(data.shortName || null)
      }
      if (data.barcode !== undefined) {
        fields.push('barcode = ?')
        values.push(data.barcode || null)
      }
      if (data.categoryId !== undefined) {
        fields.push('category_id = ?')
        values.push(data.categoryId || null)
      }
      if (data.subCategory !== undefined) {
        fields.push('sub_category = ?')
        values.push(data.subCategory || null)
      }
      if (data.brand !== undefined) {
        fields.push('brand = ?')
        values.push(data.brand || null)
      }
      if (data.hsnCode !== undefined) {
        fields.push('hsn_code = ?')
        values.push(data.hsnCode)
      }
      if (data.costPrice !== undefined) {
        fields.push('purchase_price = ?')
        values.push(data.costPrice)
      }
      if (data.sellingPrice !== undefined) {
        fields.push('selling_price = ?')
        values.push(data.sellingPrice)
      }
      if (data.wholesalePrice !== undefined) {
        fields.push('wholesale_price = ?')
        values.push(data.wholesalePrice || null)
      }
      if (data.gstRate !== undefined) {
        fields.push('gst_rate = ?')
        values.push(data.gstRate)
      }
      if (data.stock !== undefined) {
        // Track stock change in ledger when editing via product form
        const currentProduct = db
          .prepare('SELECT current_stock FROM products WHERE id = ?')
          .get(id) as { current_stock: number } | undefined
        const oldStock = currentProduct?.current_stock ?? 0
        const delta = data.stock - oldStock
        fields.push('current_stock = ?')
        values.push(data.stock)
        if (delta !== 0) {
          db.prepare(
            `INSERT INTO stock_ledger (product_id, type, qty, reference_type, notes)
             VALUES (?, 'adjustment', ?, 'manual', ?)`
          ).run(id, delta, `Stock adjusted from ${oldStock} to ${data.stock}`)
        }
      }
      if (data.lowStockThreshold !== undefined) {
        fields.push('low_stock_alert = ?')
        values.push(data.lowStockThreshold ?? null)
      }
      if (data.location !== undefined) {
        fields.push('location = ?')
        values.push(data.location || null)
      }
      if (data.color !== undefined) {
        fields.push('color = ?')
        values.push(data.color || null)
      }
      if (data.size !== undefined) {
        fields.push('size = ?')
        values.push(data.size || null)
      }
      if (data.material !== undefined) {
        fields.push('material = ?')
        values.push(data.material || null)
      }
      if (data.description !== undefined) {
        fields.push('notes = ?')
        values.push(data.description ?? null)
      }
      if (data.isActive !== undefined) {
        fields.push('is_active = ?')
        values.push(data.isActive ? 1 : 0)
      }

      fields.push("updated_at = datetime('now','localtime')")
      values.push(id)

      if (fields.length > 1) {
        db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }

      // Record price changes in price_history
      if (current) {
        const insertHistory = db.prepare(
          `INSERT INTO price_history (product_id, field_name, old_value, new_value)
           VALUES (?, ?, ?, ?)`
        )
        if (data.costPrice !== undefined && data.costPrice !== current.purchase_price) {
          insertHistory.run(id, 'purchase_price', current.purchase_price, data.costPrice)
        }
        if (data.sellingPrice !== undefined && data.sellingPrice !== current.selling_price) {
          insertHistory.run(id, 'selling_price', current.selling_price, data.sellingPrice)
        }
        if (
          data.wholesalePrice !== undefined &&
          (data.wholesalePrice || 0) !== (current.wholesale_price || 0)
        ) {
          insertHistory.run(
            id,
            'wholesale_price',
            current.wholesale_price || 0,
            data.wholesalePrice || 0
          )
        }
      }
    })()

    return this.getById(id)!
  }

  getLowStock(): Product[] {
    const db = getSqlite()
    const rows = db
      .prepare(
        `SELECT p.*, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = 1
           AND p.low_stock_alert IS NOT NULL
           AND p.current_stock <= p.low_stock_alert
         ORDER BY p.current_stock ASC`
      )
      .all()
    return mapRows<Product>(rows as Record<string, unknown>[])
  }

  getOutOfStock(): Product[] {
    const db = getSqlite()
    const rows = db
      .prepare(
        `SELECT p.*, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = 1 AND p.current_stock <= 0
         ORDER BY p.name`
      )
      .all()
    return mapRows<Product>(rows as Record<string, unknown>[])
  }

  getStockValuation(): { totalCostValue: number; totalSellingValue: number; totalItems: number } {
    const db = getSqlite()
    const result = db
      .prepare(
        `SELECT
           COALESCE(SUM(current_stock * purchase_price), 0) as total_cost_value,
           COALESCE(SUM(current_stock * selling_price), 0) as total_selling_value,
           COALESCE(SUM(current_stock), 0) as total_items
         FROM products
         WHERE is_active = 1 AND current_stock > 0`
      )
      .get() as { total_cost_value: number; total_selling_value: number; total_items: number }
    return {
      totalCostValue: result.total_cost_value,
      totalSellingValue: result.total_selling_value,
      totalItems: result.total_items
    }
  }

  delete(id: number): void {
    const db = getSqlite()
    db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id)
  }

  adjustStock(
    productId: number,
    quantity: number,
    type: 'purchase' | 'adjustment' | 'damage' | 'return',
    notes?: string
  ): Product {
    const db = getSqlite()
    db.transaction(() => {
      db.prepare(
        "UPDATE products SET current_stock = current_stock + ?, updated_at = datetime('now','localtime') WHERE id = ?"
      ).run(quantity, productId)
      db.prepare(
        `INSERT INTO stock_ledger (product_id, type, qty, reference_type, notes)
         VALUES (?, ?, ?, 'manual', ?)`
      ).run(productId, type, quantity, notes || null)
    })()
    return this.getById(productId)!
  }

  getStockLedger(productId: number, limit: number = 50): Record<string, unknown>[] {
    const db = getSqlite()
    return db
      .prepare(
        `SELECT sl.*, p.name as product_name
         FROM stock_ledger sl
         LEFT JOIN products p ON sl.product_id = p.id
         WHERE sl.product_id = ?
         ORDER BY sl.id DESC
         LIMIT ?`
      )
      .all(productId, limit) as Record<string, unknown>[]
  }

  getPriceHistory(productId: number, limit: number = 50): Record<string, unknown>[] {
    const db = getSqlite()
    return db
      .prepare(
        `SELECT ph.*, p.name as product_name
         FROM price_history ph
         LEFT JOIN products p ON ph.product_id = p.id
         WHERE ph.product_id = ?
         ORDER BY ph.id DESC
         LIMIT ?`
      )
      .all(productId, limit) as Record<string, unknown>[]
  }

  bulkStockUpdate(items: { sku?: string; barcode?: string; stock: number }[]): ImportResult {
    const db = getSqlite()
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    db.transaction(() => {
      for (let i = 0; i < items.length; i++) {
        try {
          const item = items[i]
          let product: Record<string, unknown> | undefined

          if (item.sku) {
            product = db
              .prepare('SELECT id, current_stock FROM products WHERE sku = ? AND is_active = 1')
              .get(item.sku) as Record<string, unknown> | undefined
          }
          if (!product && item.barcode) {
            product = db
              .prepare('SELECT id, current_stock FROM products WHERE barcode = ? AND is_active = 1')
              .get(item.barcode) as Record<string, unknown> | undefined
          }

          if (!product) {
            skipped++
            errors.push(
              `Row ${i + 1}: Product not found (SKU: ${item.sku || '-'}, Barcode: ${item.barcode || '-'})`
            )
            continue
          }

          const oldStock = product.current_stock as number
          const diff = item.stock - oldStock

          db.prepare(
            "UPDATE products SET current_stock = ?, updated_at = datetime('now','localtime') WHERE id = ?"
          ).run(item.stock, product.id)

          db.prepare(
            `INSERT INTO stock_ledger (product_id, type, qty, reference_type, notes)
             VALUES (?, 'adjustment', ?, 'bulk_update', ?)`
          ).run(product.id, diff, `Bulk stock update: ${oldStock} → ${item.stock}`)

          imported++
        } catch (err: unknown) {
          skipped++
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`Row ${i + 1}: ${msg}`)
        }
      }
    })()

    return { total: items.length, imported, skipped, errors }
  }

  bulkImport(rows: ProductFormData[]): ImportResult {
    const db = getSqlite()
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    const insertTransaction = db.transaction((rows: ProductFormData[]) => {
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i]
          if (!row.name || row.sellingPrice === undefined) {
            skipped++
            errors.push(`Row ${i + 1}: Missing required fields (name, selling price)`)
            continue
          }
          this.create(row)
          imported++
        } catch (err: unknown) {
          skipped++
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`Row ${i + 1}: ${msg}`)
        }
      }
    })

    insertTransaction(rows)

    return {
      total: rows.length,
      imported,
      skipped,
      errors
    }
  }
}

export const productRepo = new ProductRepository()
