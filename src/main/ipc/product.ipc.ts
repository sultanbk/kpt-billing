// ============================================================================
// KPT Billing - Product IPC Handlers (secured with validation & audit)
// ============================================================================
import { readFileSync } from 'fs'
import { productRepo } from '../database/repositories/product.repo'
import { categoryRepo } from '../database/repositories/category.repo'
import { writeAuditLog } from '../database/audit'
import { safeHandle, validate } from './ipc-guard'
import {
  idSchema,
  limitSchema,
  searchTermSchema,
  productFormSchema,
  productFiltersSchema,
  stockAdjustTypeSchema,
  bulkStockItemSchema
} from './validation'
import { z } from 'zod'
import log from 'electron-log'
import type { ProductFormData } from '../../shared/types'

/**
 * Parse a simple CSV string into an array of objects.
 * Handles quoted fields and maps common column names to ProductFormData fields.
 */
/**
 * Parse a single CSV line respecting quoted fields (handles commas and quotes inside quotes).
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++ // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current.trim())
  return result
}

function parseCsvToProducts(csvContent: string): Record<string, unknown>[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/['"]/g, ''))
  const rows: Record<string, unknown>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, unknown> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ''
    })

    // Map CSV columns to ProductFormData fields
    rows.push({
      name: row['name'] || row['product_name'] || row['product name'] || '',
      shortName: row['short_name'] || row['short name'] || null,
      barcode: row['barcode'] || null,
      hsnCode: row['hsn_code'] || row['hsn code'] || row['hsn'] || '',
      costPrice:
        parseFloat(
          String(
            row['cost_price'] ||
              row['cost price'] ||
              row['purchase_price'] ||
              row['purchase price'] ||
              '0'
          )
        ) || 0,
      sellingPrice:
        parseFloat(
          String(row['selling_price'] || row['selling price'] || row['price'] || row['mrp'] || '0')
        ) || 0,
      wholesalePrice:
        parseFloat(String(row['wholesale_price'] || row['wholesale price'] || '0')) || null,
      gstRate: parseFloat(String(row['gst_rate'] || row['gst rate'] || row['gst'] || '5')) || 5,
      stock:
        parseFloat(
          String(
            row['stock'] ||
              row['opening_stock'] ||
              row['opening stock'] ||
              row['current_stock'] ||
              '0'
          )
        ) || 0,
      lowStockThreshold:
        parseFloat(String(row['low_stock'] || row['low stock'] || row['low_stock_alert'] || '0')) ||
        null,
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
  safeHandle('products:search', (_event, term) => {
    return productRepo.search(validate(searchTermSchema, term))
  })

  safeHandle('products:getAll', (_event, filters) => {
    return productRepo.getAll(validate(productFiltersSchema, filters))
  })

  safeHandle('products:getById', (_event, id) => {
    return productRepo.getById(validate(idSchema, id))
  })

  safeHandle('products:getByBarcode', (_event, barcode) => {
    return productRepo.getByBarcode(validate(z.string().min(1).max(50), barcode))
  })

  safeHandle('products:create', (_event, data) => {
    const validated = validate(productFormSchema, data)
    const result = productRepo.create(validated as Parameters<typeof productRepo.create>[0])
    log.info(`Product created: ${result.sku} - ${result.name}`)
    writeAuditLog({
      action: 'create',
      entityType: 'product',
      entityId: result.id,
      newValue: { sku: result.sku, name: result.name }
    })
    return result
  })

  safeHandle('products:update', (_event, id, data) => {
    const validId = validate(idSchema, id)
    const validated = validate(productFormSchema, data)
    const result = productRepo.update(
      validId,
      validated as Parameters<typeof productRepo.update>[1]
    )
    log.info(`Product updated: ${result.sku} - ${result.name}`)
    writeAuditLog({
      action: 'update',
      entityType: 'product',
      entityId: validId,
      newValue: { sku: result.sku, name: result.name }
    })
    return result
  })

  safeHandle('products:delete', (_event, id) => {
    const validId = validate(idSchema, id)
    writeAuditLog({ action: 'delete', entityType: 'product', entityId: validId })
    productRepo.delete(validId)
    log.info(`Product deleted: ${validId}`)
    return true
  })

  safeHandle('products:import', (_event, input) => {
    try {
      let rows: Record<string, unknown>[]

      if (Array.isArray(input) && input.length > 0 && typeof input[0] === 'string') {
        // Input is file paths from dialog — read and parse the CSV file
        const filePath = input[0] as string
        // Security: only allow .csv files
        if (!filePath.toLowerCase().endsWith('.csv')) {
          return { total: 0, imported: 0, skipped: 0, errors: ['Only .csv files are supported'] }
        }
        const csvContent = readFileSync(filePath, 'utf-8')
        rows = parseCsvToProducts(csvContent)
      } else if (Array.isArray(input)) {
        // Input is already parsed product data
        rows = input as Record<string, unknown>[]
      } else {
        return { total: 0, imported: 0, skipped: 0, errors: ['Invalid import data'] }
      }

      const result = productRepo.bulkImport(rows as unknown as ProductFormData[])
      log.info(`Product import: ${result.imported} imported, ${result.skipped} skipped`)
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error('Product import failed:', msg)
      return { total: 0, imported: 0, skipped: 0, errors: [msg] }
    }
  })

  safeHandle('products:getLowStock', () => {
    return productRepo.getLowStock()
  })

  safeHandle('products:getOutOfStock', () => {
    return productRepo.getOutOfStock()
  })

  safeHandle('products:getStockValuation', () => {
    return productRepo.getStockValuation()
  })

  safeHandle('products:adjustStock', (_event, productId, quantity, type, notes?) => {
    const validId = validate(idSchema, productId)
    const validQty = validate(z.number().int(), quantity)
    const validType = validate(stockAdjustTypeSchema, type)
    const validNotes = notes ? validate(z.string().max(500), notes) : undefined
    const result = productRepo.adjustStock(validId, validQty, validType, validNotes)
    log.info(`Stock adjusted: Product ${validId}, ${validType} ${validQty}`)
    writeAuditLog({
      action: 'adjust_stock',
      entityType: 'product',
      entityId: validId,
      newValue: { type: validType, qty: validQty }
    })
    return result
  })

  safeHandle('products:getStockLedger', (_event, productId, limit?) => {
    return productRepo.getStockLedger(validate(idSchema, productId), validate(limitSchema, limit))
  })

  safeHandle('products:getPriceHistory', (_event, productId, limit?) => {
    return productRepo.getPriceHistory(validate(idSchema, productId), validate(limitSchema, limit))
  })

  safeHandle('products:bulkStockUpdate', (_event, items) => {
    const validated = validate(z.array(bulkStockItemSchema).min(1), items)
    const result = productRepo.bulkStockUpdate(validated)
    log.info(`Bulk stock update: ${result.imported} updated, ${result.skipped} skipped`)
    return result
  })

  // Categories
  safeHandle('categories:getAll', () => {
    return categoryRepo.getAll()
  })

  safeHandle('categories:create', (_event, name, parentId?) => {
    const validName = validate(z.string().min(1).max(100), name)
    const validParentId = parentId ? validate(idSchema, parentId) : undefined
    const result = categoryRepo.create(validName, validParentId)
    writeAuditLog({
      action: 'create',
      entityType: 'category',
      entityId: result.id,
      newValue: { name: validName }
    })
    return result
  })

  safeHandle('categories:update', (_event, id, name) => {
    const validId = validate(idSchema, id)
    const validName = validate(z.string().min(1).max(100), name)
    const result = categoryRepo.update(validId, validName)
    writeAuditLog({
      action: 'update',
      entityType: 'category',
      entityId: validId,
      newValue: { name: validName }
    })
    return result
  })

  safeHandle('categories:delete', (_event, id) => {
    const validId = validate(idSchema, id)
    writeAuditLog({ action: 'delete', entityType: 'category', entityId: validId })
    categoryRepo.delete(validId)
    return true
  })
}
