// ============================================================================
// KPT Billing - Supplier & Purchase IPC Handlers (secured with validation & audit)
// ============================================================================
import { BrowserWindow } from 'electron'
import { supplierRepo } from '../database/repositories/supplier.repo'
import { purchaseService } from '../services/purchase.service'
import { writeAuditLog } from '../database/audit'
import { safeHandle, validate } from './ipc-guard'
import {
  idSchema,
  limitSchema,
  dateSchema,
  searchTermSchema,
  supplierFormSchema,
  purchaseCreateSchema,
  purchaseFiltersSchema
} from './validation'
import { z } from 'zod'
import log from 'electron-log'

export function registerSupplierPurchaseIpc(): void {
  // ---- Suppliers ----
  safeHandle('suppliers:getAll', (_event, activeOnly?) => {
    return supplierRepo.getAll(activeOnly ? validate(z.boolean(), activeOnly) : undefined)
  })

  safeHandle('suppliers:getById', (_event, id) => {
    return supplierRepo.getById(validate(idSchema, id))
  })

  safeHandle('suppliers:search', (_event, term) => {
    return supplierRepo.search(validate(searchTermSchema, term))
  })

  safeHandle('suppliers:create', (_event, data) => {
    const validated = validate(supplierFormSchema, data)
    const result = supplierRepo.create(validated as Parameters<typeof supplierRepo.create>[0])
    log.info(`Supplier created: ${result.name}`)
    writeAuditLog({
      action: 'create',
      entityType: 'supplier',
      entityId: result.id,
      newValue: { name: result.name }
    })
    return result
  })

  safeHandle('suppliers:update', (_event, id, data) => {
    const validId = validate(idSchema, id)
    const validated = validate(supplierFormSchema, data)
    const result = supplierRepo.update(
      validId,
      validated as Parameters<typeof supplierRepo.update>[1]
    )
    log.info(`Supplier updated: ${result.name}`)
    writeAuditLog({
      action: 'update',
      entityType: 'supplier',
      entityId: validId,
      newValue: { name: result.name }
    })
    return result
  })

  safeHandle('suppliers:delete', (_event, id) => {
    const validId = validate(idSchema, id)
    writeAuditLog({ action: 'delete', entityType: 'supplier', entityId: validId })
    supplierRepo.delete(validId)
    log.info(`Supplier deleted: ${validId}`)
    return true
  })

  safeHandle('suppliers:getCities', () => {
    return supplierRepo.getCities()
  })

  // ---- Purchases ----
  safeHandle('purchases:getNextNumber', () => {
    return purchaseService.getNextPurchaseNumber()
  })

  safeHandle('purchases:create', (_event, data) => {
    const validated = validate(purchaseCreateSchema, data)
    const result = purchaseService.create(validated as Parameters<typeof purchaseService.create>[0])
    log.info(`Purchase created: ${result.purchaseNo} - ${result.grandTotal}`)
    writeAuditLog({
      action: 'create',
      entityType: 'purchase',
      entityId: result.id,
      newValue: { purchaseNo: result.purchaseNo, grandTotal: result.grandTotal }
    })

    const productIds = (result.items ?? [])
      .map((item) => item.productId)
      .filter((id): id is number => typeof id === 'number')
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('purchases:created', { purchaseId: result.id, productIds })
    })
    return result
  })

  safeHandle('purchases:getById', (_event, id) => {
    return purchaseService.getById(validate(idSchema, id))
  })

  safeHandle('purchases:getAll', (_event, filters?) => {
    return purchaseService.getAll(validate(purchaseFiltersSchema, filters))
  })

  safeHandle('purchases:getRecent', (_event, limit?) => {
    return purchaseService.getRecentPurchases(validate(limitSchema, limit))
  })

  safeHandle('purchases:getSummary', (_event, dateFrom, dateTo) => {
    return purchaseService.getPurchaseSummary(
      validate(dateSchema, dateFrom),
      validate(dateSchema, dateTo)
    )
  })

  safeHandle('purchases:delete', (_event, id) => {
    const validId = validate(idSchema, id)
    writeAuditLog({ action: 'delete', entityType: 'purchase', entityId: validId })
    purchaseService.delete(validId)
    log.info(`Purchase deleted: ${validId}`)
    return true
  })
}
