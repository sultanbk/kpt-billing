// ============================================================================
// KPT Billing - Billing IPC Handlers
// ============================================================================
import { ipcMain, shell } from 'electron'
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
import log from 'electron-log'

export function registerBillingIpc(): void {
  ipcMain.handle('billing:getNextBillNumber', () => {
    return billRepo.getNextBillNumber()
  })

  ipcMain.handle('billing:createBill', async (_event, data) => {
    const bill = billRepo.create(data)
    log.info(`Bill created: ${bill.billNo} - Total: ${bill.grandTotal}`)

    // Auto-print if enabled
    const autoPrint = settingsRepo.get('autoPrintReceipt')
    if (autoPrint === 'true') {
      const shopInfo = settingsRepo.getAll()
      const printerName = settingsRepo.get('receiptPrinterName') || ''

      try {
        // Check if using a PDF printer
        if (pdfReceiptService.isPdfPrinter(printerName)) {
          const result = await pdfReceiptService.generatePdf(bill, shopInfo)
          if (result.success) {
            log.info(`PDF receipt saved: ${result.path}`)
          }
        } else {
          await thermalPrinterService.printReceipt(bill, shopInfo)
        }
      } catch (err) {
        log.error('Auto-print failed:', err)
      }
    }

    return bill
  })

  ipcMain.handle('billing:getById', (_event, id: number) => {
    return billRepo.getById(id)
  })

  ipcMain.handle('billing:getByBillNo', (_event, billNo: string) => {
    return billRepo.getByBillNo(billNo)
  })

  ipcMain.handle('billing:getRecentBills', (_event, limit?: number) => {
    return billRepo.getRecentBills(limit)
  })

  ipcMain.handle('billing:getBillsByDate', (_event, date: string) => {
    return billRepo.getBillsByDate(date)
  })

  ipcMain.handle('billing:getDailySummary', (_event, date: string) => {
    return billRepo.getDailySummary(date)
  })

  ipcMain.handle('billing:getWeekSummary', () => {
    return billRepo.getWeekSummary()
  })

  ipcMain.handle('billing:getMonthSummary', () => {
    return billRepo.getMonthSummary()
  })

  ipcMain.handle('billing:getTopSellingToday', (_event, date: string, limit?: number) => {
    return billRepo.getTopSellingToday(date, limit)
  })

  ipcMain.handle('billing:getAllBills', (_event, filters) => {
    return billRepo.getAllBills(filters)
  })

  ipcMain.handle('billing:quickSearch', (_event, term: string) => {
    const db = getSqlite()
    const s = `%${term}%`
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
  ipcMain.handle('billing:printReceipt', async (_event, billId: number) => {
    const bill = billRepo.getById(billId)
    if (!bill) return false
    const shopInfo = settingsRepo.getAll()
    const printerName = settingsRepo.get('receiptPrinterName') || ''

    // If it's a PDF printer, generate PDF instead
    if (pdfReceiptService.isPdfPrinter(printerName)) {
      const result = await pdfReceiptService.generatePdf(bill, shopInfo)
      return result.success
    }
    return thermalPrinterService.printReceipt(bill, shopInfo)
  })

  // Generate PDF receipt explicitly
  ipcMain.handle('billing:generatePdfReceipt', async (_event, billId: number) => {
    const bill = billRepo.getById(billId)
    if (!bill) return { success: false, path: '' }
    const shopInfo = settingsRepo.getAll()
    return pdfReceiptService.generatePdf(bill, shopInfo)
  })

  // Get receipts directory
  ipcMain.handle('billing:getReceiptsDir', () => {
    return pdfReceiptService.getReceiptsDir()
  })

  // Return / Cancel
  ipcMain.handle('billing:returnBill', (_event, billId: number, reason?: string) => {
    try {
      return billRepo.returnBill(billId, reason)
    } catch (err) {
      log.error('Return bill failed:', err)
      throw err
    }
  })

  ipcMain.handle('billing:cancelBill', (_event, billId: number, reason?: string) => {
    try {
      return billRepo.cancelBill(billId, reason)
    } catch (err) {
      log.error('Cancel bill failed:', err)
      throw err
    }
  })

  ipcMain.handle('billing:getBillsByCustomer', (_event, customerId: number, limit?: number) => {
    return billRepo.getBillsByCustomer(customerId, limit)
  })

  // Period summaries (weekly / monthly / yearly)
  ipcMain.handle('billing:getWeeklySummary', (_event, endDate?: string) => {
    return billRepo.getWeeklySummary(endDate)
  })

  ipcMain.handle('billing:getMonthlySummary', (_event, yearMonth?: string) => {
    return billRepo.getMonthlySummary(yearMonth)
  })

  ipcMain.handle('billing:getYearlySummary', (_event, year?: number) => {
    return billRepo.getYearlySummary(year)
  })

  ipcMain.handle('billing:getPeriodSummary', (_event, dateFrom: string, dateTo: string) => {
    return billRepo.getPeriodSummary(dateFrom, dateTo)
  })

  // Held bills
  ipcMain.handle('billing:holdBill', (_event, id: string, data: { customerName?: string; customerPhone?: string; items: string }) => {
    const db = getSqlite()
    db.prepare(
      `INSERT OR REPLACE INTO held_bills (id, customer_name, customer_phone, items_json, held_at)
       VALUES (?, ?, ?, ?, datetime('now','localtime'))`
    ).run(id, data.customerName || null, data.customerPhone || null, data.items)
    return true
  })

  ipcMain.handle('billing:getHeldBills', () => {
    const db = getSqlite()
    return db.prepare('SELECT * FROM held_bills ORDER BY held_at DESC').all()
  })

  ipcMain.handle('billing:recallHeldBill', (_event, id: string) => {
    const db = getSqlite()
    const bill = db.prepare('SELECT * FROM held_bills WHERE id = ?').get(id) as {
      id: string
      customer_name: string
      customer_phone: string
      items_json: string
      held_at: string
    } | undefined
    if (bill) {
      db.prepare('DELETE FROM held_bills WHERE id = ?').run(id)
    }
    return bill || null
  })

  ipcMain.handle('billing:deleteHeldBill', (_event, id: string) => {
    const db = getSqlite()
    db.prepare('DELETE FROM held_bills WHERE id = ?').run(id)
    return true
  })

  // Customer
  ipcMain.handle('customers:search', (_event, term: string) => {
    return customerRepo.search(term)
  })

  ipcMain.handle('customers:getAll', () => {
    return customerRepo.getAll()
  })

  ipcMain.handle('customers:getById', (_event, id: number) => {
    return customerRepo.getById(id)
  })

  ipcMain.handle('customers:create', (_event, data) => {
    return customerRepo.create(data)
  })

  ipcMain.handle('customers:update', (_event, id: number, data) => {
    return customerRepo.update(id, data)
  })

  ipcMain.handle('customers:getWithCredit', () => {
    return customerRepo.getWithCredit()
  })

  ipcMain.handle('customers:getTotalCredit', () => {
    return customerRepo.getTotalCredit()
  })

  // ---- Customer Analytics ----
  ipcMain.handle('customers:getTopByRevenue', (_event, limit?: number) => {
    return customerRepo.getTopCustomersByRevenue(limit)
  })

  ipcMain.handle('customers:getFrequency', () => {
    return customerRepo.getCustomerFrequency()
  })

  ipcMain.handle('customers:getCreditRisk', () => {
    return customerRepo.getCreditRiskScoring()
  })

  ipcMain.handle('customers:getCreditAging', () => {
    return customerRepo.getCreditAging()
  })

  ipcMain.handle('customers:getCreditAgingSummary', () => {
    return customerRepo.getCreditAgingSummary()
  })

  // ---- Credit Payments ----
  ipcMain.handle('credit:recordPayment', (_event, data) => {
    return creditPaymentRepo.recordPayment(data)
  })

  ipcMain.handle('credit:getById', (_event, id: number) => {
    return creditPaymentRepo.getById(id)
  })

  ipcMain.handle('credit:getByCustomer', (_event, customerId: number, limit?: number) => {
    return creditPaymentRepo.getByCustomer(customerId, limit)
  })

  ipcMain.handle('credit:getAll', (_event, filters) => {
    return creditPaymentRepo.getAll(filters)
  })

  ipcMain.handle('credit:getLedger', (_event, customerId: number) => {
    return creditPaymentRepo.getCreditLedger(customerId)
  })

  ipcMain.handle('credit:getCollectionSummary', (_event, dateFrom: string, dateTo: string) => {
    return creditPaymentRepo.getCollectionSummary(dateFrom, dateTo)
  })

  ipcMain.handle('credit:deletePayment', (_event, id: number) => {
    return creditPaymentRepo.deletePayment(id)
  })

  // ---- Report PDF Generation ----
  ipcMain.handle('report:generateDailyPdf', async (_event, date: string) => {
    try {
      const summary = billRepo.getDailySummary(date)
      const allBills = billRepo.getAllBills({ page: 1, pageSize: 500, dateFrom: date, dateTo: date })
      const billRows = allBills.data.map((b) => ({
        billNumber: b.billNumber || b.billNo || '',
        time: b.time || '',
        customerName: b.customerName || null,
        totalItems: b.totalItems || 0,
        paymentMode: b.paymentMode || 'cash',
        grandTotal: b.grandTotal || 0,
        status: b.status || 'completed'
      }))
      return pdfReportService.generateDailyReport(date, summary, billRows)
    } catch (err) {
      log.error('Daily PDF report failed:', err)
      return { success: false, path: '' }
    }
  })

  ipcMain.handle('report:generateWeeklyPdf', async (_event, endDate?: string) => {
    try {
      const report = billRepo.getWeeklySummary(endDate)
      const ed = endDate || new Date().toISOString().slice(0, 10)
      return pdfReportService.generateWeeklyReport(ed, report)
    } catch (err) {
      log.error('Weekly PDF report failed:', err)
      return { success: false, path: '' }
    }
  })

  ipcMain.handle('report:generateMonthlyPdf', async (_event, yearMonth?: string) => {
    try {
      const ym = yearMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const report = billRepo.getMonthlySummary(yearMonth)
      return pdfReportService.generateMonthlyReport(ym, report)
    } catch (err) {
      log.error('Monthly PDF report failed:', err)
      return { success: false, path: '' }
    }
  })

  ipcMain.handle('report:generateYearlyPdf', async (_event, year?: number) => {
    try {
      const y = year || new Date().getFullYear()
      const report = billRepo.getYearlySummary(year)
      return pdfReportService.generateYearlyReport(y, report)
    } catch (err) {
      log.error('Yearly PDF report failed:', err)
      return { success: false, path: '' }
    }
  })

  ipcMain.handle('report:openFile', async (_event, filePath: string) => {
    try {
      await shell.openPath(filePath)
      return true
    } catch (err) {
      log.error('Failed to open file:', err)
      return false
    }
  })

  ipcMain.handle('report:getReportsDir', () => {
    return pdfReportService.getReportsDir()
  })

  // ---- Expenses ----
  ipcMain.handle('expenses:create', (_event, data) => {
    return expenseRepo.create(data)
  })

  ipcMain.handle('expenses:getAll', (_event, filters) => {
    return expenseRepo.getAll(filters)
  })

  ipcMain.handle('expenses:getByDate', (_event, date: string) => {
    return expenseRepo.getByDate(date)
  })

  ipcMain.handle('expenses:update', (_event, id: number, data) => {
    return expenseRepo.update(id, data)
  })

  ipcMain.handle('expenses:delete', (_event, id: number) => {
    return expenseRepo.delete(id)
  })

  ipcMain.handle('expenses:getCategories', () => {
    return expenseRepo.getCategories()
  })

  ipcMain.handle('expenses:getSummary', (_event, dateFrom: string, dateTo: string) => {
    return expenseRepo.getSummary(dateFrom, dateTo)
  })

  // ---- GST & P&L Reports ----
  ipcMain.handle('reports:getGstReport', (_event, dateFrom: string, dateTo: string) => {
    return reportRepo.getGstReport(dateFrom, dateTo)
  })

  ipcMain.handle('reports:getProfitLoss', (_event, dateFrom: string, dateTo: string) => {
    return reportRepo.getProfitLossReport(dateFrom, dateTo)
  })

  ipcMain.handle('reports:getDashboardData', (_event, date: string) => {
    return reportRepo.getDashboardData(date)
  })

  // ---- WhatsApp ----
  ipcMain.handle('whatsapp:sendBillReceipt', (_event, billId: number, phone: string) => {
    return whatsappService.sendBillReceipt(billId, phone)
  })

  ipcMain.handle('whatsapp:sendCreditReminder', (_event, phone: string, customerName: string, currentBalance: number) => {
    return whatsappService.sendCreditReminder(phone, customerName, currentBalance)
  })

  ipcMain.handle('whatsapp:sendPaymentConfirmation', (_event, phone: string, customerName: string, amountPaid: number, remainingBalance: number, paymentMode: string, date: string) => {
    return whatsappService.sendPaymentConfirmation(phone, customerName, amountPaid, remainingBalance, paymentMode, date)
  })
}
