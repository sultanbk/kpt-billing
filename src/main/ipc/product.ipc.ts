// ============================================================================
// KPT Billing - Product IPC Handlers
// ============================================================================
import { ipcMain } from 'electron'
import { productRepo } from '../database/repositories/product.repo'
import { categoryRepo } from '../database/repositories/category.repo'
import log from 'electron-log'

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

  ipcMain.handle('products:import', (_event, rows) => {
    const result = productRepo.bulkImport(rows)
    log.info(`Product import: ${result.imported} imported, ${result.skipped} skipped`)
    return result
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
