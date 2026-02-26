// ============================================================================
// KPT Billing - Product IPC Handlers
// ============================================================================
import { ipcMain } from 'electron'
import { readFileSync } from 'fs'
import { productRepo } from '../database/repositories/product.repo'
import { categoryRepo } from '../database/repositories/category.repo'
import log from 'electron-log'

/**
 * Parse a simple CSV string into an array of objects.
 * Handles quoted fields and maps common column names to ProductFormData fields.
 */
function parseCsvToProducts(csvContent: string): Record<string, unknown>[] {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const rows: Record<string, unknown>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
    const row: Record<string, unknown> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })

    // Map CSV columns to ProductFormData fields
    rows.push({
      name: row['name'] || row['product_name'] || row['product name'] || '',
      shortName: row['short_name'] || row['short name'] || null,
      barcode: row['barcode'] || null,
      hsnCode: row['hsn_code'] || row['hsn code'] || row['hsn'] || '',
      costPrice: parseFloat(String(row['cost_price'] || row['cost price'] || row['purchase_price'] || row['purchase price'] || '0')) || 0,
      sellingPrice: parseFloat(String(row['selling_price'] || row['selling price'] || row['price'] || row['mrp'] || '0')) || 0,
      wholesalePrice: parseFloat(String(row['wholesale_price'] || row['wholesale price'] || '0')) || null,
      gstRate: parseFloat(String(row['gst_rate'] || row['gst rate'] || row['gst'] || '5')) || 5,
      stock: parseFloat(String(row['stock'] || row['opening_stock'] || row['opening stock'] || row['current_stock'] || '0')) || 0,
      lowStockThreshold: parseFloat(String(row['low_stock'] || row['low stock'] || row['low_stock_alert'] || '0')) || null,
      color: row['color'] || null,
      size: row['size'] || null,
      material: row['material'] || null,
      description: row['notes'] || row['description'] || null,
      isActive: true
    })
  }
  return rows
}

export function registerProductIpc(): void {
  ipcMain.handle('products:search', (_event, term: string) => {
    return productRepo.search(term)
  })

  ipcMain.handle('products:getAll', (_event, filters) => {
    return productRepo.getAll(filters)
  })

  ipcMain.handle('products:getById', (_event, id: number) => {
    return productRepo.getById(id)
  })

  ipcMain.handle('products:getByBarcode', (_event, barcode: string) => {
    return productRepo.getByBarcode(barcode)
  })

  ipcMain.handle('products:create', (_event, data) => {
    const result = productRepo.create(data)
    log.info(`Product created: ${result.sku} - ${result.name}`)
    return result
  })

  ipcMain.handle('products:update', (_event, id: number, data) => {
    const result = productRepo.update(id, data)
    log.info(`Product updated: ${result.sku} - ${result.name}`)
    return result
  })

  ipcMain.handle('products:delete', (_event, id: number) => {
    productRepo.delete(id)
    log.info(`Product deleted: ${id}`)
    return true
  })

  ipcMain.handle('products:import', (_event, input: unknown) => {
    try {
      let rows: Record<string, unknown>[]

      if (Array.isArray(input) && input.length > 0 && typeof input[0] === 'string') {
        // Input is file paths from dialog — read and parse the CSV file
        const filePath = input[0] as string
        const csvContent = readFileSync(filePath, 'utf-8')
        rows = parseCsvToProducts(csvContent)
      } else if (Array.isArray(input)) {
        // Input is already parsed product data
        rows = input as Record<string, unknown>[]
      } else {
        return { total: 0, imported: 0, skipped: 0, errors: ['Invalid import data'] }
      }

      const result = productRepo.bulkImport(rows as any)
      log.info(`Product import: ${result.imported} imported, ${result.skipped} skipped`)
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error('Product import failed:', msg)
      return { total: 0, imported: 0, skipped: 0, errors: [msg] }
    }
  })

  ipcMain.handle('products:getLowStock', () => {
    return productRepo.getLowStock()
  })

  ipcMain.handle('products:getOutOfStock', () => {
    return productRepo.getOutOfStock()
  })

  ipcMain.handle('products:getStockValuation', () => {
    return productRepo.getStockValuation()
  })

  ipcMain.handle(
    'products:adjustStock',
    (_event, productId: number, quantity: number, type: string, notes?: string) => {
      const result = productRepo.adjustStock(
        productId,
        quantity,
        type as 'purchase' | 'adjustment' | 'damage' | 'return',
        notes
      )
      log.info(`Stock adjusted: Product ${productId}, ${type} ${quantity}`)
      return result
    }
  )

  ipcMain.handle('products:getStockLedger', (_event, productId: number, limit?: number) => {
    return productRepo.getStockLedger(productId, limit)
  })

  ipcMain.handle('products:getPriceHistory', (_event, productId: number, limit?: number) => {
    return productRepo.getPriceHistory(productId, limit)
  })

  ipcMain.handle(
    'products:bulkStockUpdate',
    (_event, items: { sku?: string; barcode?: string; stock: number }[]) => {
      const result = productRepo.bulkStockUpdate(items)
      log.info(`Bulk stock update: ${result.imported} updated, ${result.skipped} skipped`)
      return result
    }
  )

  // Categories
  ipcMain.handle('categories:getAll', () => {
    return categoryRepo.getAll()
  })

  ipcMain.handle('categories:create', (_event, name: string, parentId?: number) => {
    return categoryRepo.create(name, parentId)
  })

  ipcMain.handle('categories:update', (_event, id: number, name: string) => {
    return categoryRepo.update(id, name)
  })

  ipcMain.handle('categories:delete', (_event, id: number) => {
    categoryRepo.delete(id)
    return true
  })
}
