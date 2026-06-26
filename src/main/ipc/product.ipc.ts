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
import type {
  Product,
  ProductFormData,
  ProductLabelPrintRequest,
  ProductLabelSize
} from '../../shared/types'
import { settingsRepo } from '../database/repositories/settings.repo'
import { productLabelPrinterService } from '../services/product-label-printer.service'

function getConfiguredLabelSize(): ProductLabelSize {
  const configured = settingsRepo.get('barcodeLabelSize')
  return configured === '60x40' ? '60x40' : '46x25'
}

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

  safeHandle('products:printLabels', async (_event, payload) => {
    const validated = validate(
      z.object({
        productId: idSchema,
        quantity: z.number().int().min(1).max(500),
        printerName: z.string().max(200).optional(),
        labelSize: z.enum(['46x25', '60x40']).optional()
      }),
      payload
    ) as ProductLabelPrintRequest

    const product = productRepo.getById(validated.productId)
    if (!product) {
      throw new Error('Product not found for label printing')
    }

    const resolvedPrinterName =
      validated.printerName?.trim() ||
      settingsRepo.get('labelPrinterName')?.trim() ||
      settingsRepo.get('receiptPrinterName')?.trim() ||
      ''

    const result = await productLabelPrinterService.printProductLabels(product, {
      printerName: resolvedPrinterName,
      quantity: validated.quantity,
      labelSize: validated.labelSize || getConfiguredLabelSize(),
      shopName: settingsRepo.get('shopName') || '',
      barcodeShowShopName: settingsRepo.get('barcodeShowShopName') !== 'false',
      barcodeShowSaleName: settingsRepo.get('barcodeShowSaleName') === 'true',
      barcodeSaleNameText: settingsRepo.get('barcodeSaleNameText') || '',
      barcodeShowName: settingsRepo.get('barcodeShowName') !== 'false',
      barcodeShowMrp: settingsRepo.get('barcodeShowMrp') !== 'false',
      barcodeShowSellingPrice: settingsRepo.get('barcodeShowSellingPrice') !== 'false',
      barcodeStrikeMrp: settingsRepo.get('barcodeStrikeMrp') !== 'false',
      barcodeShowDiscount: settingsRepo.get('barcodeShowDiscount') !== 'false',
      barcodeNudgeX: settingsRepo.get('barcodeNudgeX') || '0.0',
      barcodeNudgeY: settingsRepo.get('barcodeNudgeY') || '0.0',
      barcodeWidth: settingsRepo.get('barcodeWidth') || '75',
      barcodeHeight: settingsRepo.get('barcodeHeight') || '5.5',
      barcodeShopFontSize: settingsRepo.get('barcodeShopFontSize') || 'default',
      barcodeNameFontSize: settingsRepo.get('barcodeNameFontSize') || 'default',
      barcodePriceFontSize: settingsRepo.get('barcodePriceFontSize') || 'default',
      barcodeCodeFontSize: settingsRepo.get('barcodeCodeFontSize') || 'default',
      barcodeShopAlign: settingsRepo.get('barcodeShopAlign') || 'right',
      barcodeNameAlign: settingsRepo.get('barcodeNameAlign') || 'left',
      barcodePriceAlign: settingsRepo.get('barcodePriceAlign') || 'left',
      barcodeCodeAlign: settingsRepo.get('barcodeCodeAlign') || 'center',
      barcodePaddingX: settingsRepo.get('barcodePaddingX') || 'default',
      barcodePaddingY: settingsRepo.get('barcodePaddingY') || 'default',
      barcodeGap: settingsRepo.get('barcodeGap') || 'default',
      barcodeShowCode: settingsRepo.get('barcodeShowCode') !== 'false'
    })

    writeAuditLog({
      action: 'print_labels',
      entityType: 'product',
      entityId: validated.productId,
      newValue: {
        qty: validated.quantity,
        printer: result.printerName,
        labelSize: result.labelSize
      }
    })

    return result
  })

  safeHandle('products:printTestLabel', async (_event, payload) => {
    const validated = validate(
      z.object({
        printerName: z.string().max(200).optional(),
        labelSize: z.enum(['46x25', '60x40']).optional(),
        barcodeNudgeX: z.string().max(10).optional(),
        barcodeNudgeY: z.string().max(10).optional(),
        barcodeWidth: z.string().max(10).optional(),
        barcodeHeight: z.string().max(10).optional(),
        barcodeShopFontSize: z.string().max(10).optional(),
        barcodeNameFontSize: z.string().max(10).optional(),
        barcodePriceFontSize: z.string().max(10).optional(),
        barcodeCodeFontSize: z.string().max(10).optional(),
        barcodeShopAlign: z.string().max(15).optional(),
        barcodeNameAlign: z.string().max(15).optional(),
        barcodePriceAlign: z.string().max(15).optional(),
        barcodeCodeAlign: z.string().max(15).optional(),
        barcodePaddingX: z.string().max(10).optional(),
        barcodePaddingY: z.string().max(10).optional(),
        barcodeGap: z.string().max(10).optional(),
        barcodeShowCode: z.boolean().optional()
      }),
      payload
    )

    const dummyProduct: Product = {
      id: 999999,
      name: 'Cotton Saree Sample',
      shortName: 'Cotton Saree',
      sku: 'KPT-GEN-00004',
      barcode: 'KPT-GEN-00004',
      category: 'Test',
      categoryId: null,
      subCategory: null,
      hsnCode: '',
      costPrice: 1000,
      mrp: 2000,
      sellingPrice: 1799,
      wholesalePrice: 1500,
      gstRate: 5,
      priceIncludesGst: true,
      stock: 10,
      lowStockThreshold: 5,
      unit: 'pcs',
      location: 'A1',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      brand: 'Test',
      color: 'Red',
      material: 'Cotton',
      description: 'Test description',
      imagePath: null,
      size: 'Free',
      supplierId: null
    }

    const resolvedPrinterName =
      validated.printerName?.trim() ||
      settingsRepo.get('labelPrinterName')?.trim() ||
      settingsRepo.get('receiptPrinterName')?.trim() ||
      ''

    return productLabelPrinterService.printProductLabels(dummyProduct, {
      printerName: resolvedPrinterName,
      quantity: 1,
      labelSize: validated.labelSize || getConfiguredLabelSize(),
      shopName: settingsRepo.get('shopName') || '',
      barcodeShowShopName: settingsRepo.get('barcodeShowShopName') !== 'false',
      barcodeShowSaleName: settingsRepo.get('barcodeShowSaleName') === 'true',
      barcodeSaleNameText: settingsRepo.get('barcodeSaleNameText') || '',
      barcodeShowName: settingsRepo.get('barcodeShowName') !== 'false',
      barcodeShowMrp: settingsRepo.get('barcodeShowMrp') !== 'false',
      barcodeShowSellingPrice: settingsRepo.get('barcodeShowSellingPrice') !== 'false',
      barcodeStrikeMrp: settingsRepo.get('barcodeStrikeMrp') !== 'false',
      barcodeShowDiscount: settingsRepo.get('barcodeShowDiscount') !== 'false',
      barcodeNudgeX: validated.barcodeNudgeX || settingsRepo.get('barcodeNudgeX') || '0.0',
      barcodeNudgeY: validated.barcodeNudgeY || settingsRepo.get('barcodeNudgeY') || '0.0',
      barcodeWidth: validated.barcodeWidth || settingsRepo.get('barcodeWidth') || '75',
      barcodeHeight: validated.barcodeHeight || settingsRepo.get('barcodeHeight') || '5.5',
      barcodeShopFontSize:
        validated.barcodeShopFontSize || settingsRepo.get('barcodeShopFontSize') || 'default',
      barcodeNameFontSize:
        validated.barcodeNameFontSize || settingsRepo.get('barcodeNameFontSize') || 'default',
      barcodePriceFontSize:
        validated.barcodePriceFontSize || settingsRepo.get('barcodePriceFontSize') || 'default',
      barcodeCodeFontSize:
        validated.barcodeCodeFontSize || settingsRepo.get('barcodeCodeFontSize') || 'default',
      barcodeShopAlign:
        validated.barcodeShopAlign || settingsRepo.get('barcodeShopAlign') || 'right',
      barcodeNameAlign:
        validated.barcodeNameAlign || settingsRepo.get('barcodeNameAlign') || 'left',
      barcodePriceAlign:
        validated.barcodePriceAlign || settingsRepo.get('barcodePriceAlign') || 'left',
      barcodeCodeAlign:
        validated.barcodeCodeAlign || settingsRepo.get('barcodeCodeAlign') || 'center',
      barcodePaddingX:
        validated.barcodePaddingX || settingsRepo.get('barcodePaddingX') || 'default',
      barcodePaddingY:
        validated.barcodePaddingY || settingsRepo.get('barcodePaddingY') || 'default',
      barcodeGap: validated.barcodeGap || settingsRepo.get('barcodeGap') || 'default',
      barcodeShowCode:
        validated.barcodeShowCode !== undefined
          ? validated.barcodeShowCode
          : settingsRepo.get('barcodeShowCode') !== 'false'
    })
  })

  safeHandle('products:downloadLabels', async (_event, payload) => {
    const validated = validate(
      z.object({
        productId: idSchema,
        quantity: z.number().int().min(1).max(500),
        labelSize: z.enum(['46x25', '60x40']).optional()
      }),
      payload
    )

    const product = productRepo.getById(validated.productId)
    if (!product) {
      throw new Error('Product not found for label download')
    }

    return productLabelPrinterService.downloadProductLabels(product, {
      printerName: '',
      quantity: validated.quantity,
      labelSize: validated.labelSize || getConfiguredLabelSize(),
      shopName: settingsRepo.get('shopName') || '',
      barcodeShowShopName: settingsRepo.get('barcodeShowShopName') !== 'false',
      barcodeShowSaleName: settingsRepo.get('barcodeShowSaleName') === 'true',
      barcodeSaleNameText: settingsRepo.get('barcodeSaleNameText') || '',
      barcodeShowName: settingsRepo.get('barcodeShowName') !== 'false',
      barcodeShowMrp: settingsRepo.get('barcodeShowMrp') !== 'false',
      barcodeShowSellingPrice: settingsRepo.get('barcodeShowSellingPrice') !== 'false',
      barcodeStrikeMrp: settingsRepo.get('barcodeStrikeMrp') !== 'false',
      barcodeShowDiscount: settingsRepo.get('barcodeShowDiscount') !== 'false',
      barcodeNudgeX: settingsRepo.get('barcodeNudgeX') || '0.0',
      barcodeNudgeY: settingsRepo.get('barcodeNudgeY') || '0.0',
      barcodeWidth: settingsRepo.get('barcodeWidth') || '75',
      barcodeHeight: settingsRepo.get('barcodeHeight') || '5.5',
      barcodeShopFontSize: settingsRepo.get('barcodeShopFontSize') || 'default',
      barcodeNameFontSize: settingsRepo.get('barcodeNameFontSize') || 'default',
      barcodePriceFontSize: settingsRepo.get('barcodePriceFontSize') || 'default',
      barcodeCodeFontSize: settingsRepo.get('barcodeCodeFontSize') || 'default',
      barcodeShopAlign: settingsRepo.get('barcodeShopAlign') || 'right',
      barcodeNameAlign: settingsRepo.get('barcodeNameAlign') || 'left',
      barcodePriceAlign: settingsRepo.get('barcodePriceAlign') || 'left',
      barcodeCodeAlign: settingsRepo.get('barcodeCodeAlign') || 'center',
      barcodePaddingX: settingsRepo.get('barcodePaddingX') || 'default',
      barcodePaddingY: settingsRepo.get('barcodePaddingY') || 'default',
      barcodeGap: settingsRepo.get('barcodeGap') || 'default',
      barcodeShowCode: settingsRepo.get('barcodeShowCode') !== 'false'
    })
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
