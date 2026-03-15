// ============================================================================
// KPT Billing - Export Service (Excel)
// ============================================================================
import * as XLSX from 'xlsx'
import { dialog } from 'electron'
import { billRepo } from '../database/repositories/bill.repo'
import { productRepo } from '../database/repositories/product.repo'
import { customerRepo } from '../database/repositories/customer.repo'
import { creditPaymentRepo } from '../database/repositories/credit-payment.repo'
import { getSqlite } from '../database/connection'
import { getLocalDateString } from '../../shared/constants'
import log from 'electron-log'

export class ExportService {
  async exportDailyReport(date: string): Promise<string | null> {
    const summary = billRepo.getDailySummary(date)
    const bills = billRepo.getAllBills({ dateFrom: date, dateTo: date, pageSize: 1000 })

    const wb = XLSX.utils.book_new()

    // Summary sheet
    const summaryData = [
      ['Krishnapriya Textiles - Daily Report'],
      ['Date', date],
      [],
      ['Metric', 'Amount (₹)'],
      ['Total Sales', summary.totalSales],
      ['Total Bills', summary.totalBills],
      ['Cash Sales', summary.cashSales],
      ['UPI Sales', summary.upiSales],
      ['Card Sales', summary.cardSales],
      ['Credit Sales', summary.creditSales],
      ['Total Items Sold', summary.totalItems]
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

    // Bills sheet
    const billRows = bills.data.map((b) => ({
      'Bill No': b.billNumber || b.billNo,
      Date: b.date,
      Customer: b.customerName || 'Walk-in',
      Items: b.totalItems,
      Qty: b.totalQty,
      Subtotal: b.subtotal,
      Discount: b.discountAmount,
      GST: b.gstAmount,
      'Grand Total': b.grandTotal,
      'Payment Mode': b.paymentMode,
      Cash: b.cashAmount,
      UPI: b.upiAmount,
      Card: b.cardAmount,
      Credit: b.creditAmount,
      Status: b.status
    }))
    const billSheet = XLSX.utils.json_to_sheet(billRows)
    billSheet['!cols'] = Array(15).fill({ wch: 14 })
    XLSX.utils.book_append_sheet(wb, billSheet, 'Bills')

    return this.saveWorkbook(wb, `KPT_Daily_Report_${date}`)
  }

  async exportBillHistory(dateFrom: string, dateTo: string): Promise<string | null> {
    const bills = billRepo.getAllBills({ dateFrom, dateTo, pageSize: 10000 })

    const wb = XLSX.utils.book_new()
    const billRows = bills.data.map((b) => ({
      'Bill No': b.billNumber || b.billNo,
      Date: b.date,
      Time: b.time,
      Customer: b.customerName || 'Walk-in',
      Phone: b.customerPhone || '',
      Items: b.totalItems,
      Qty: b.totalQty,
      Subtotal: b.subtotal,
      Discount: b.discountAmount,
      Taxable: b.taxableAmount,
      GST: b.gstAmount,
      'Round Off': b.roundOff,
      'Grand Total': b.grandTotal,
      'Payment Mode': b.paymentMode,
      Cash: b.cashAmount,
      UPI: b.upiAmount,
      Card: b.cardAmount,
      Credit: b.creditAmount,
      Status: b.status
    }))
    const sheet = XLSX.utils.json_to_sheet(billRows)
    sheet['!cols'] = Array(19).fill({ wch: 14 })
    XLSX.utils.book_append_sheet(wb, sheet, 'Bill History')

    return this.saveWorkbook(wb, `KPT_Bills_${dateFrom}_to_${dateTo}`)
  }

  async exportStockReport(): Promise<string | null> {
    const products = productRepo.getAll({ pageSize: 10000, isActive: true })

    const wb = XLSX.utils.book_new()
    const rows = products.data.map((p) => ({
      SKU: p.sku,
      Name: p.name,
      Category: p.categoryName || p.category || '',
      Barcode: p.barcode || '',
      'HSN Code': p.hsnCode,
      'Cost Price': p.costPrice,
      'Selling Price': p.sellingPrice,
      'GST Rate': `${p.gstRate}%`,
      'Current Stock': p.stock,
      'Low Stock Alert': p.lowStockThreshold || '-',
      'Stock Value (Cost)': (p.costPrice || 0) * (p.stock || 0),
      'Stock Value (Sell)': (p.sellingPrice || 0) * (p.stock || 0),
      Unit: p.unit || 'pcs'
    }))
    const sheet = XLSX.utils.json_to_sheet(rows)
    sheet['!cols'] = Array(13).fill({ wch: 16 })
    XLSX.utils.book_append_sheet(wb, sheet, 'Stock Report')

    // Low stock sheet
    const lowStock = productRepo.getLowStock()
    if (lowStock.length > 0) {
      const lowRows = lowStock.map((p) => ({
        SKU: p.sku,
        Name: p.name,
        Category: p.categoryName || p.category || '',
        'Current Stock': p.stock,
        'Low Stock Alert': p.lowStockThreshold || '-',
        'Selling Price': p.sellingPrice
      }))
      const lowSheet = XLSX.utils.json_to_sheet(lowRows)
      lowSheet['!cols'] = Array(6).fill({ wch: 18 })
      XLSX.utils.book_append_sheet(wb, lowSheet, 'Low Stock')
    }

    return this.saveWorkbook(wb, `KPT_Stock_Report_${getLocalDateString()}`)
  }

  async exportCustomerReport(): Promise<string | null> {
    const customers = customerRepo.getAll()
    const creditCustomers = customerRepo.getWithCredit()

    const wb = XLSX.utils.book_new()

    // All customers
    const rows = customers.map((c) => ({
      Name: c.name,
      Phone: c.phone,
      Email: c.email || '',
      Address: c.address || '',
      City: c.city || '',
      GSTIN: c.gstin || '',
      Type: c.customerType,
      'Credit Limit': c.creditLimit || '-',
      'Current Balance': c.currentBalance,
      Active: c.isActive ? 'Yes' : 'No'
    }))
    const sheet = XLSX.utils.json_to_sheet(rows)
    sheet['!cols'] = Array(10).fill({ wch: 16 })
    XLSX.utils.book_append_sheet(wb, sheet, 'All Customers')

    // Credit outstanding
    if (creditCustomers.length > 0) {
      const creditRows = creditCustomers.map((c) => ({
        Name: c.name,
        Phone: c.phone,
        'Current Balance': c.currentBalance,
        'Credit Limit': c.creditLimit || 'Unlimited',
        Type: c.customerType
      }))
      const creditSheet = XLSX.utils.json_to_sheet(creditRows)
      creditSheet['!cols'] = Array(5).fill({ wch: 18 })
      XLSX.utils.book_append_sheet(wb, creditSheet, 'Credit Outstanding')
    }

    return this.saveWorkbook(wb, `KPT_Customers_${getLocalDateString()}`)
  }

  /**
   * Full data export — all tables in one Excel for accountants
   */
  async exportFullData(): Promise<string | null> {
    const db = getSqlite()
    const wb = XLSX.utils.book_new()
    const today = getLocalDateString()

    // 1. Bills
    const bills = billRepo.getAllBills({ pageSize: 100000 })
    const billRows = bills.data.map((b) => ({
      'Bill No': b.billNumber || b.billNo,
      Date: b.date,
      Time: b.time,
      Customer: b.customerName || 'Walk-in',
      Phone: b.customerPhone || '',
      Items: b.totalItems,
      Qty: b.totalQty,
      Subtotal: b.subtotal,
      Discount: b.discountAmount,
      Taxable: b.taxableAmount,
      CGST: b.cgstAmount ?? 0,
      SGST: b.sgstAmount ?? 0,
      'Round Off': b.roundOff,
      'Grand Total': b.grandTotal,
      'Payment Mode': b.paymentMode,
      Cash: b.cashAmount,
      UPI: b.upiAmount,
      Card: b.cardAmount,
      Credit: b.creditAmount,
      Status: b.status
    }))
    if (billRows.length > 0) {
      const billSheet = XLSX.utils.json_to_sheet(billRows)
      billSheet['!cols'] = Array(20).fill({ wch: 14 })
      XLSX.utils.book_append_sheet(wb, billSheet, 'Bills')
    }

    // 2. Bill Items
    const billItemRows = db
      .prepare(
        `SELECT bi.*, b.bill_no
       FROM bill_items bi
       JOIN bills b ON b.id = bi.bill_id
       ORDER BY b.date DESC, b.id DESC`
      )
      .all() as Record<string, unknown>[]
    if (billItemRows.length > 0) {
      const itemSheet = XLSX.utils.json_to_sheet(
        billItemRows.map((r) => ({
          'Bill No': r.bill_no,
          Product: r.product_name,
          'HSN Code': r.hsn_code,
          Qty: r.qty,
          Rate: r.rate,
          'Discount Type': r.discount_type,
          'Discount Value': r.discount_value,
          Taxable: r.taxable_amount,
          'CGST %': r.cgst_rate,
          CGST: r.cgst_amount,
          'SGST %': r.sgst_rate,
          SGST: r.sgst_amount,
          Amount: r.amount
        }))
      )
      itemSheet['!cols'] = Array(13).fill({ wch: 14 })
      XLSX.utils.book_append_sheet(wb, itemSheet, 'Bill Items')
    }

    // 3. Products
    const products = productRepo.getAll({ pageSize: 100000, isActive: undefined })
    const prodRows = products.data.map((p) => ({
      SKU: p.sku,
      Name: p.name,
      Barcode: p.barcode || '',
      Category: p.categoryName || p.category || '',
      'HSN Code': p.hsnCode,
      'Purchase Price': p.costPrice,
      'Selling Price': p.sellingPrice,
      'Wholesale Price': p.wholesalePrice || '',
      'GST Rate': p.gstRate,
      'Current Stock': p.stock,
      'Low Stock Alert': p.lowStockThreshold || '',
      Active: p.isActive ? 'Yes' : 'No'
    }))
    if (prodRows.length > 0) {
      const prodSheet = XLSX.utils.json_to_sheet(prodRows)
      prodSheet['!cols'] = Array(12).fill({ wch: 16 })
      XLSX.utils.book_append_sheet(wb, prodSheet, 'Products')
    }

    // 4. Customers
    const customers = customerRepo.getAll()
    const custRows = customers.map((c) => ({
      Name: c.name,
      Phone: c.phone,
      Email: c.email || '',
      Address: c.address || '',
      City: c.city || '',
      GSTIN: c.gstin || '',
      Type: c.customerType,
      'Credit Limit': c.creditLimit || '',
      'Current Balance': c.currentBalance,
      Active: c.isActive ? 'Yes' : 'No',
      'Created At': c.createdAt
    }))
    if (custRows.length > 0) {
      const custSheet = XLSX.utils.json_to_sheet(custRows)
      custSheet['!cols'] = Array(11).fill({ wch: 16 })
      XLSX.utils.book_append_sheet(wb, custSheet, 'Customers')
    }

    // 5. Credit Payments
    const creditPayments = creditPaymentRepo.getAll({ pageSize: 100000 })
    const creditRows = creditPayments.data.map((cp) => ({
      Date: cp.date,
      Customer: cp.customerName || '',
      Phone: cp.customerPhone || '',
      Amount: cp.amount,
      'Payment Mode': cp.paymentMode,
      Reference: cp.referenceNo || '',
      'Balance Before': cp.balanceBefore,
      'Balance After': cp.balanceAfter,
      Notes: cp.notes || ''
    }))
    if (creditRows.length > 0) {
      const creditSheet = XLSX.utils.json_to_sheet(creditRows)
      creditSheet['!cols'] = Array(9).fill({ wch: 16 })
      XLSX.utils.book_append_sheet(wb, creditSheet, 'Credit Payments')
    }

    // 6. Purchases
    const purchaseRows = db
      .prepare(
        `SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id ORDER BY p.date DESC`
      )
      .all() as Record<string, unknown>[]
    if (purchaseRows.length > 0) {
      const purchSheet = XLSX.utils.json_to_sheet(
        purchaseRows.map((r) => ({
          'Purchase No': r.purchase_no,
          Date: r.date,
          Supplier: r.supplier_name || '',
          'Invoice No': r.invoice_no || '',
          Items: r.total_items,
          Qty: r.total_qty,
          Subtotal: r.subtotal,
          GST: r.gst_amount,
          Discount: r.discount_amount,
          'Grand Total': r.grand_total,
          'Payment Mode': r.payment_mode,
          'Amount Paid': r.amount_paid
        }))
      )
      purchSheet['!cols'] = Array(12).fill({ wch: 14 })
      XLSX.utils.book_append_sheet(wb, purchSheet, 'Purchases')
    }

    // 7. Expenses
    const expenseRows = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all() as Record<
      string,
      unknown
    >[]
    if (expenseRows.length > 0) {
      const expSheet = XLSX.utils.json_to_sheet(
        expenseRows.map((r) => ({
          Date: r.date,
          Category: r.category,
          Amount: r.amount,
          Description: r.description || '',
          'Payment Mode': r.payment_mode
        }))
      )
      expSheet['!cols'] = Array(5).fill({ wch: 18 })
      XLSX.utils.book_append_sheet(wb, expSheet, 'Expenses')
    }

    // 8. Stock Ledger
    const stockRows = db
      .prepare(
        `SELECT sl.*, p.name as product_name, p.sku
       FROM stock_ledger sl
       LEFT JOIN products p ON p.id = sl.product_id
       ORDER BY sl.created_at DESC
       LIMIT 50000`
      )
      .all() as Record<string, unknown>[]
    if (stockRows.length > 0) {
      const stockSheet = XLSX.utils.json_to_sheet(
        stockRows.map((r) => ({
          Date: r.created_at,
          SKU: r.sku || '',
          Product: r.product_name || '',
          Type: r.type,
          Qty: r.qty,
          'Ref Type': r.reference_type || '',
          'Ref ID': r.reference_id || '',
          Notes: r.notes || ''
        }))
      )
      stockSheet['!cols'] = Array(8).fill({ wch: 16 })
      XLSX.utils.book_append_sheet(wb, stockSheet, 'Stock Ledger')
    }

    return this.saveWorkbook(wb, `KPT_Full_Data_Export_${today}`)
  }

  private async saveWorkbook(wb: XLSX.WorkBook, defaultName: string): Promise<string | null> {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Report',
      defaultPath: `${defaultName}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    })

    if (canceled || !filePath) return null

    try {
      XLSX.writeFile(wb, filePath)
      log.info(`Report exported: ${filePath}`)
      return filePath
    } catch (err) {
      log.error('Export failed:', err)
      throw err
    }
  }
}

export const exportService = new ExportService()
