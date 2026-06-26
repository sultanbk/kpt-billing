// ============================================================================
// KPT Billing - Billing IPC Handlers (secured with validation & audit)
// ============================================================================
import { shell } from 'electron'
import { billRepo } from '../database/repositories/bill.repo'
import { mapRows } from '../database/utils'
import { customerRepo } from '../database/repositories/customer.repo'
import { creditPaymentRepo } from '../database/repositories/credit-payment.repo'
import { expenseRepo } from '../database/repositories/expense.repo'
import { reportRepo } from '../database/repositories/report.repo'
import { thermalPrinterService } from '../services/thermal-printer.service'
import { pdfReceiptService } from '../services/pdf-receipt.service'
import { pdfReportService } from '../services/pdf-report.service'
import { whatsappService } from '../services/whatsapp.service'
import { settingsRepo } from '../database/repositories/settings.repo'
import { getSqlite } from '../database/connection'
import { writeAuditLog } from '../database/audit'
import { safeHandle, validate } from './ipc-guard'
import type { Bill } from '../../shared/types'
import {
  idSchema,
  limitSchema,
  dateSchema,
  searchTermSchema,
  billCreateSchema,
  billFiltersSchema,
  billReturnSchema,
  creditPaymentSchema,
  creditFiltersSchema,
  expenseFormSchema,
  expenseFiltersSchema,
  customerFormSchema,
  holdBillDataSchema
} from './validation'
import { z } from 'zod'
import log from 'electron-log'

export function registerBillingIpc(): void {
  safeHandle('billing:getNextBillNumber', () => {
    return billRepo.getNextBillNumber()
  })

  safeHandle('billing:createBill', async (_event, data) => {
    const validated = validate(billCreateSchema, data)
    const bill = billRepo.create(validated as Parameters<typeof billRepo.create>[0])
    log.info(`Bill created: ${bill.billNo} - Total: ${bill.grandTotal}`)
    writeAuditLog({
      action: 'create',
      entityType: 'bill',
      entityId: bill.id,
      newValue: { billNo: bill.billNo, grandTotal: bill.grandTotal }
    })

    // Auto-print disabled — owner can download/print manually from the bill screen

    return bill
  })

  safeHandle('billing:getById', (_event, id) => {
    return billRepo.getById(validate(idSchema, id))
  })

  safeHandle('billing:getByBillNo', (_event, billNo) => {
    return billRepo.getByBillNo(validate(z.string().min(1), billNo))
  })

  safeHandle('billing:getRecentBills', (_event, limit?) => {
    return billRepo.getRecentBills(validate(limitSchema, limit))
  })

  safeHandle('billing:getBillsByDate', (_event, date) => {
    return billRepo.getBillsByDate(validate(dateSchema, date))
  })

  safeHandle('billing:getDailySummary', (_event, date) => {
    return billRepo.getDailySummary(validate(dateSchema, date))
  })

  safeHandle('billing:getWeekSummary', () => {
    return billRepo.getWeekSummary()
  })

  safeHandle('billing:getMonthSummary', () => {
    return billRepo.getMonthSummary()
  })

  safeHandle('billing:getTopSellingToday', (_event, date, limit?) => {
    return billRepo.getTopSellingToday(validate(dateSchema, date), validate(limitSchema, limit))
  })

  safeHandle('billing:getAllBills', (_event, filters) => {
    return billRepo.getAllBills(validate(billFiltersSchema, filters))
  })

  safeHandle('billing:quickSearch', (_event, term) => {
    const validTerm = validate(searchTermSchema, term)
    const db = getSqlite()
    const s = `%${validTerm}%`
    const rows = db
      .prepare(
        `SELECT * FROM bills
         WHERE bill_no LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR date LIKE ?
         ORDER BY id DESC LIMIT 20`
      )
      .all(s, s, s, s) as Record<string, unknown>[]
    return mapRows(rows)
  })

  // Print receipt for existing bill (supports PDF printers)
  safeHandle('billing:printReceipt', async (_event, billId) => {
    const id = validate(idSchema, billId)
    const bill = billRepo.getById(id)
    if (!bill) return false
    const shopInfo = settingsRepo.getAll()
    const printerName = settingsRepo.get('receiptPrinterName') || ''

    if (pdfReceiptService.isPdfPrinter(printerName)) {
      const result = await pdfReceiptService.generatePdf(bill, shopInfo)
      return result.success
    }
    thermalPrinterService.setPrinter(printerName)
    return thermalPrinterService.printReceipt(bill, shopInfo)
  })

  // Generate PDF receipt explicitly
  safeHandle('billing:generatePdfReceipt', async (_event, billId) => {
    const id = validate(idSchema, billId)
    const bill = billRepo.getById(id)
    if (!bill) return { success: false, path: '' }
    const shopInfo = settingsRepo.getAll()
    return pdfReceiptService.generatePdf(bill, shopInfo)
  })

  // Get receipts directory
  safeHandle('billing:getReceiptsDir', () => {
    return pdfReceiptService.getReceiptsDir()
  })

  // Return / Cancel
  safeHandle('billing:returnBill', (_event, billId, reason?) => {
    const id = validate(idSchema, billId)
    const validReason = reason ? validate(z.string().max(500), reason) : undefined
    const result = billRepo.returnBill(id, validReason)
    writeAuditLog({
      action: 'return',
      entityType: 'bill',
      entityId: id,
      newValue: { reason: validReason }
    })
    return result
  })

  safeHandle('billing:cancelBill', (_event, billId, reason?) => {
    const id = validate(idSchema, billId)
    const validReason = reason ? validate(z.string().max(500), reason) : undefined
    const result = billRepo.cancelBill(id, validReason)
    writeAuditLog({
      action: 'cancel',
      entityType: 'bill',
      entityId: id,
      newValue: { reason: validReason }
    })
    return result
  })

  safeHandle('billing:getBillsByCustomer', (_event, customerId, limit?) => {
    return billRepo.getBillsByCustomer(validate(idSchema, customerId), validate(limitSchema, limit))
  })

  // Period summaries (weekly / monthly / yearly)
  safeHandle('billing:getWeeklySummary', (_event, endDate?) => {
    return billRepo.getWeeklySummary(endDate ? validate(dateSchema, endDate) : undefined)
  })

  safeHandle('billing:getMonthlySummary', (_event, yearMonth?) => {
    return billRepo.getMonthlySummary(
      yearMonth ? validate(z.string().max(7), yearMonth) : undefined
    )
  })

  safeHandle('billing:getYearlySummary', (_event, year?) => {
    return billRepo.getYearlySummary(year ? validate(z.number().int().positive(), year) : undefined)
  })

  safeHandle('billing:getPeriodSummary', (_event, dateFrom, dateTo) => {
    return billRepo.getPeriodSummary(validate(dateSchema, dateFrom), validate(dateSchema, dateTo))
  })

  // Held bills
  safeHandle('billing:holdBill', (_event, id, data) => {
    const validId = validate(z.string().min(1), id)
    const validData = validate(holdBillDataSchema, data)
    const db = getSqlite()
    db.prepare(
      `INSERT OR REPLACE INTO held_bills (id, customer_name, customer_phone, items_json, held_at)
       VALUES (?, ?, ?, ?, datetime('now','localtime'))`
    ).run(validId, validData.customerName || null, validData.customerPhone || null, validData.items)
    return true
  })

  safeHandle('billing:getHeldBills', () => {
    const db = getSqlite()
    const rows = db.prepare('SELECT * FROM held_bills ORDER BY held_at DESC').all() as {
      id: string
      customer_name: string | null
      customer_phone: string | null
      items_json: string
      held_at: string
    }[]
    return rows
      .map((row) => {
        try {
          const parsedJson = JSON.parse(row.items_json || '[]')
          const isLegacy = Array.isArray(parsedJson)
          const items = isLegacy ? parsedJson : parsedJson.items || []
          const discount = isLegacy ? 0 : parsedJson.discount || 0
          const discountType = isLegacy ? 'percentage' : parsedJson.discountType || 'percentage'
          const customerId = isLegacy ? null : parsedJson.customerId || null
          const subtotal = items.reduce(
            (sum: number, i: { total?: number }) => sum + (i.total || 0),
            0
          )
          const discountAmt = discountType === 'percentage' ? (subtotal * discount) / 100 : discount
          const total = Math.max(0, subtotal - discountAmt)
          return {
            id: row.id,
            customerName: row.customer_name || '',
            customerPhone: row.customer_phone || '',
            customerId,
            items,
            discount,
            discountType,
            heldAt: row.held_at,
            total
          }
        } catch {
          log.warn(`Corrupt held bill JSON for id=${row.id}, skipping`)
          return null
        }
      })
      .filter(Boolean)
  })

  safeHandle('billing:recallHeldBill', (_event, id) => {
    const validId = validate(z.string().min(1), id)
    const db = getSqlite()
    const bill = db.prepare('SELECT * FROM held_bills WHERE id = ?').get(validId) as
      | {
          id: string
          customer_name: string
          customer_phone: string
          items_json: string
          held_at: string
        }
      | undefined
    if (bill) {
      db.prepare('DELETE FROM held_bills WHERE id = ?').run(validId)
    }
    return bill || null
  })

  safeHandle('billing:deleteHeldBill', (_event, id) => {
    const validId = validate(z.string().min(1), id)
    const db = getSqlite()
    db.prepare('DELETE FROM held_bills WHERE id = ?').run(validId)
    return true
  })

  // Customer
  // Customer
  safeHandle('customers:search', (_event, term) => {
    return customerRepo.search(validate(searchTermSchema, term))
  })

  safeHandle('customers:getAll', () => {
    return customerRepo.getAll()
  })

  safeHandle('customers:getById', (_event, id) => {
    return customerRepo.getById(validate(idSchema, id))
  })

  safeHandle('customers:create', (_event, data) => {
    const validated = validate(customerFormSchema, data)
    const result = customerRepo.create(validated as Parameters<typeof customerRepo.create>[0])
    writeAuditLog({
      action: 'create',
      entityType: 'customer',
      entityId: result.id,
      newValue: { name: result.name }
    })
    return result
  })

  safeHandle('customers:update', (_event, id, data) => {
    const validId = validate(idSchema, id)
    const validated = validate(customerFormSchema, data)
    const result = customerRepo.update(
      validId,
      validated as Parameters<typeof customerRepo.update>[1]
    )
    writeAuditLog({
      action: 'update',
      entityType: 'customer',
      entityId: validId,
      newValue: { name: result.name }
    })
    return result
  })

  safeHandle('customers:getWithCredit', () => {
    return customerRepo.getWithCredit()
  })

  safeHandle('customers:getTotalCredit', () => {
    return customerRepo.getTotalCredit()
  })

  // ---- Customer Analytics ----
  safeHandle('customers:getTopByRevenue', (_event, limit?) => {
    return customerRepo.getTopCustomersByRevenue(validate(limitSchema, limit))
  })

  safeHandle('customers:getFrequency', () => {
    return customerRepo.getCustomerFrequency()
  })

  safeHandle('customers:getCreditRisk', () => {
    return customerRepo.getCreditRiskScoring()
  })

  safeHandle('customers:getCreditAging', () => {
    return customerRepo.getCreditAging()
  })

  safeHandle('customers:getCreditAgingSummary', () => {
    return customerRepo.getCreditAgingSummary()
  })

  // ---- Credit Payments ----
  safeHandle('credit:recordPayment', (_event, data) => {
    const validated = validate(creditPaymentSchema, data)
    const result = creditPaymentRepo.recordPayment(
      validated as Parameters<typeof creditPaymentRepo.recordPayment>[0]
    )
    writeAuditLog({
      action: 'create',
      entityType: 'credit_payment',
      entityId: result.id,
      newValue: { customerId: validated.customerId, amount: validated.amount }
    })
    return result
  })

  safeHandle('credit:getById', (_event, id) => {
    return creditPaymentRepo.getById(validate(idSchema, id))
  })

  safeHandle('credit:getByCustomer', (_event, customerId, limit?) => {
    return creditPaymentRepo.getByCustomer(
      validate(idSchema, customerId),
      validate(limitSchema, limit)
    )
  })

  safeHandle('credit:getAll', (_event, filters) => {
    return creditPaymentRepo.getAll(validate(creditFiltersSchema, filters))
  })

  safeHandle('credit:getLedger', (_event, customerId) => {
    return creditPaymentRepo.getCreditLedger(validate(idSchema, customerId))
  })

  safeHandle('credit:getCollectionSummary', (_event, dateFrom, dateTo) => {
    return creditPaymentRepo.getCollectionSummary(
      validate(dateSchema, dateFrom),
      validate(dateSchema, dateTo)
    )
  })

  safeHandle('credit:deletePayment', (_event, id) => {
    const validId = validate(idSchema, id)
    writeAuditLog({ action: 'delete', entityType: 'credit_payment', entityId: validId })
    return creditPaymentRepo.deletePayment(validId)
  })

  // ---- Report PDF Generation ----
  safeHandle('report:generateDailyPdf', async (_event, date) => {
    const validDate = validate(dateSchema, date)
    const summary = billRepo.getDailySummary(validDate)
    const allBills = billRepo.getAllBills({
      page: 1,
      pageSize: 500,
      dateFrom: validDate,
      dateTo: validDate
    })
    const billRows = allBills.data.map((b) => ({
      billNumber: b.billNumber || b.billNo || '',
      time: b.time || '',
      customerName: b.customerName || null,
      totalItems: b.totalItems || 0,
      paymentMode: b.paymentMode || 'cash',
      grandTotal: b.grandTotal || 0,
      status: b.status || 'completed'
    }))
    return pdfReportService.generateDailyReport(validDate, summary, billRows)
  })

  safeHandle('report:generateWeeklyPdf', async (_event, endDate?) => {
    const ed = endDate ? validate(dateSchema, endDate) : undefined
    const report = billRepo.getWeeklySummary(ed)
    const dateStr = ed || new Date().toISOString().slice(0, 10)
    return pdfReportService.generateWeeklyReport(dateStr, report)
  })

  safeHandle('report:generateMonthlyPdf', async (_event, yearMonth?) => {
    const ym = yearMonth
      ? validate(z.string().max(7), yearMonth)
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const report = billRepo.getMonthlySummary(yearMonth ? ym : undefined)
    return pdfReportService.generateMonthlyReport(ym, report)
  })

  safeHandle('report:generateYearlyPdf', async (_event, year?) => {
    const y = year ? validate(z.number().int().positive(), year) : new Date().getFullYear()
    const report = billRepo.getYearlySummary(year ? y : undefined)
    return pdfReportService.generateYearlyReport(y, report)
  })

  safeHandle('report:openFile', async (_event, filePath) => {
    const validPath = validate(z.string().min(1).max(500), filePath)
    // Security: only allow opening files inside the reports directory
    const reportsDir = pdfReportService.getReportsDir()
    const { resolve } = await import('path')
    const resolved = resolve(validPath)
    if (!resolved.startsWith(reportsDir)) {
      throw new Error('Access denied: path outside reports directory')
    }
    await shell.openPath(resolved)
    return true
  })

  safeHandle('report:getReportsDir', () => {
    return pdfReportService.getReportsDir()
  })

  // ---- Expenses ----
  safeHandle('expenses:create', (_event, data) => {
    const validated = validate(expenseFormSchema, data)
    const result = expenseRepo.create(validated as Parameters<typeof expenseRepo.create>[0])
    writeAuditLog({
      action: 'create',
      entityType: 'expense',
      entityId: result.id,
      newValue: { category: validated.category, amount: validated.amount }
    })
    return result
  })

  safeHandle('expenses:getAll', (_event, filters) => {
    const validFilters = validate(expenseFiltersSchema, filters)
    return expenseRepo.getAll(validFilters)
  })

  safeHandle('expenses:getByDate', (_event, date) => {
    return expenseRepo.getByDate(validate(dateSchema, date))
  })

  safeHandle('expenses:update', (_event, id, data) => {
    const validId = validate(idSchema, id)
    const validated = validate(expenseFormSchema, data)
    const result = expenseRepo.update(
      validId,
      validated as Parameters<typeof expenseRepo.update>[1]
    )
    writeAuditLog({ action: 'update', entityType: 'expense', entityId: validId })
    return result
  })

  safeHandle('expenses:delete', (_event, id) => {
    const validId = validate(idSchema, id)
    writeAuditLog({ action: 'delete', entityType: 'expense', entityId: validId })
    return expenseRepo.delete(validId)
  })

  safeHandle('expenses:getCategories', () => {
    return expenseRepo.getCategories()
  })

  safeHandle('expenses:getSummary', (_event, dateFrom, dateTo) => {
    return expenseRepo.getSummary(validate(dateSchema, dateFrom), validate(dateSchema, dateTo))
  })

  // ---- GST & P&L Reports ----
  safeHandle('reports:getGstReport', (_event, dateFrom, dateTo) => {
    return reportRepo.getGstReport(validate(dateSchema, dateFrom), validate(dateSchema, dateTo))
  })

  safeHandle('reports:getProfitLoss', (_event, dateFrom, dateTo) => {
    return reportRepo.getProfitLossReport(
      validate(dateSchema, dateFrom),
      validate(dateSchema, dateTo)
    )
  })

  safeHandle('reports:getDashboardData', (_event, date) => {
    return reportRepo.getDashboardData(validate(dateSchema, date))
  })

  // ---- Bill Returns / Exchanges ----
  safeHandle('billing:processReturn', (_event, data) => {
    const validated = validate(billReturnSchema, data)
    const result = billRepo.processReturn(validated as Parameters<typeof billRepo.processReturn>[0])
    writeAuditLog({
      action: 'return',
      entityType: 'bill',
      entityId: validated.originalBillId,
      newValue: { type: validated.type, reason: validated.reason }
    })
    return result
  })

  safeHandle('billing:getReturnHistory', (_event, billId) => {
    return billRepo.getReturnHistory(validate(idSchema, billId))
  })

  safeHandle('billing:getReturnedQtyMap', (_event, billId) => {
    return billRepo.getReturnedQtyMap(validate(idSchema, billId))
  })

  // ---- WhatsApp ----
  safeHandle('whatsapp:sendBillReceipt', (_event, billId, phone) => {
    return whatsappService.sendBillReceipt(
      validate(idSchema, billId),
      validate(z.string().min(1), phone)
    )
  })

  safeHandle('whatsapp:sendCreditReminder', (_event, phone, customerName, currentBalance) => {
    return whatsappService.sendCreditReminder(
      validate(z.string().min(1), phone),
      validate(z.string().min(1), customerName),
      validate(z.number(), currentBalance)
    )
  })

  safeHandle(
    'whatsapp:sendPaymentConfirmation',
    (_event, phone, customerName, amountPaid, remainingBalance, paymentMode, date) => {
      return whatsappService.sendPaymentConfirmation(
        validate(z.string().min(1), phone),
        validate(z.string().min(1), customerName),
        validate(z.number(), amountPaid),
        validate(z.number(), remainingBalance),
        validate(z.string().min(1), paymentMode),
        validate(z.string().min(1), date)
      )
    }
  )

  safeHandle('billing:getThermalReceiptImage', async (_event, bill) => {
    const validBill = validate(z.custom<Bill>(), bill)
    const shopInfo = settingsRepo.getAll()
    return thermalPrinterService.getReceiptImageBuffer(validBill, shopInfo)
  })
}
