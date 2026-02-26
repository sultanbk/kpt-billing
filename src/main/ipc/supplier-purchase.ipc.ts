// ============================================================================
// KPT Billing - Supplier & Purchase IPC Handlers
// ============================================================================
import { ipcMain } from 'electron'
import { supplierRepo } from '../database/repositories/supplier.repo'
import { purchaseRepo } from '../database/repositories/purchase.repo'
import log from 'electron-log'

export function registerSupplierPurchaseIpc(): void {
  // ---- Suppliers ----
  ipcMain.handle('suppliers:getAll', (_event, activeOnly?: boolean) => {
    return supplierRepo.getAll(activeOnly)
  })

  ipcMain.handle('suppliers:getById', (_event, id: number) => {
    return supplierRepo.getById(id)
  })

  ipcMain.handle('suppliers:search', (_event, term: string) => {
    return supplierRepo.search(term)
  })

  ipcMain.handle('suppliers:create', (_event, data) => {
    const result = supplierRepo.create(data)
    log.info(`Supplier created: ${result.name}`)
    return result
  })

  ipcMain.handle('suppliers:update', (_event, id: number, data) => {
    const result = supplierRepo.update(id, data)
    log.info(`Supplier updated: ${result.name}`)
    return result
  })

  ipcMain.handle('suppliers:delete', (_event, id: number) => {
    supplierRepo.delete(id)
    log.info(`Supplier deleted: ${id}`)
    return true
  })

  ipcMain.handle('suppliers:getCities', () => {
    return supplierRepo.getCities()
  })

  // ---- Purchases ----
  ipcMain.handle('purchases:getNextNumber', () => {
    return purchaseRepo.getNextPurchaseNumber()
  })

  ipcMain.handle('purchases:create', (_event, data) => {
    const result = purchaseRepo.create(data)
    log.info(`Purchase created: ${result.purchaseNo} - ${result.grandTotal}`)
    return result
  })

  ipcMain.handle('purchases:getById', (_event, id: number) => {
    return purchaseRepo.getById(id)
  })

  ipcMain.handle('purchases:getAll', (_event, filters?) => {
    return purchaseRepo.getAll(filters)
  })

  ipcMain.handle('purchases:getRecent', (_event, limit?: number) => {
    return purchaseRepo.getRecentPurchases(limit)
  })

  ipcMain.handle('purchases:getSummary', (_event, dateFrom: string, dateTo: string) => {
    return purchaseRepo.getPurchaseSummary(dateFrom, dateTo)
  })

  ipcMain.handle('purchases:delete', (_event, id: number) => {
    purchaseRepo.delete(id)
    log.info(`Purchase deleted: ${id}`)
    return true
  })
}
