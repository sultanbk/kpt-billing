// ============================================================================
// KPT Billing - Report Repository (GST & P&L)
// ============================================================================
import { getSqlite } from '../connection'

// ---- GST Report Types ----
export interface HsnSummary {
  hsnCode: string
  description: string
  totalQty: number
  totalTaxableAmount: number
  cgstRate: number
  cgstAmount: number
  sgstRate: number
  sgstAmount: number
  totalGst: number
  totalAmount: number
}

export interface GstSummary {
  totalTaxableAmount: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  totalGst: number
  totalInvoiceValue: number
  totalBills: number
  hsnWise: HsnSummary[]
  rateWise: { gstRate: number; taxableAmount: number; cgst: number; sgst: number; total: number }[]
  invoiceList: {
    billNo: string
    date: string
    customerName: string | null
    customerGstin: string | null
    taxableAmount: number
    cgst: number
    sgst: number
    igst: number
    total: number
  }[]
}

// ---- P&L Report Types ----
export interface ProfitLossReport {
  period: { from: string; to: string }
  revenue: {
    totalSales: number
    totalBills: number
    totalReturns: number
    netSales: number
  }
  costOfGoods: {
    totalPurchases: number
    purchaseGst: number
    netPurchases: number
  }
  grossProfit: number
  grossMarginPercent: number
  expenses: {
    total: number
    byCategory: { category: string; amount: number }[]
  }
  netProfit: number
  netMarginPercent: number
  otherInfo: {
    totalDiscount: number
    totalCreditSales: number
    totalCreditCollected: number
    avgBillValue: number
  }
}

class ReportRepository {
  // ============================================================================
  // GST REPORT
  // ============================================================================
  getGstReport(dateFrom: string, dateTo: string): GstSummary {
    const db = getSqlite()

    // 1. HSN-wise summary from bill_items
    const hsnRows = db
      .prepare(
        `SELECT
           bi.hsn_code,
           COALESCE(MIN(p.name), bi.product_name) as description,
           SUM(bi.qty) as total_qty,
           SUM(bi.taxable_amount) as total_taxable,
           bi.cgst_rate,
           SUM(bi.cgst_amount) as total_cgst,
           bi.sgst_rate,
           SUM(bi.sgst_amount) as total_sgst,
           SUM(bi.cgst_amount + bi.sgst_amount) as total_gst,
           SUM(bi.amount) as total_amount
         FROM bill_items bi
         JOIN bills b ON bi.bill_id = b.id
         LEFT JOIN products p ON bi.product_id = p.id
         WHERE b.date >= ? AND b.date <= ? AND b.status = 'completed'
         GROUP BY bi.hsn_code, bi.cgst_rate
         ORDER BY bi.hsn_code`
      )
      .all(dateFrom, dateTo) as {
      hsn_code: string
      description: string
      total_qty: number
      total_taxable: number
      cgst_rate: number
      total_cgst: number
      sgst_rate: number
      total_sgst: number
      total_gst: number
      total_amount: number
    }[]

    // 2. Rate-wise summary
    const rateRows = db
      .prepare(
        `SELECT
           (bi.cgst_rate + bi.sgst_rate) as gst_rate,
           SUM(bi.taxable_amount) as taxable_amount,
           SUM(bi.cgst_amount) as cgst,
           SUM(bi.sgst_amount) as sgst,
           SUM(bi.amount) as total
         FROM bill_items bi
         JOIN bills b ON bi.bill_id = b.id
         WHERE b.date >= ? AND b.date <= ? AND b.status = 'completed'
         GROUP BY gst_rate
         ORDER BY gst_rate`
      )
      .all(dateFrom, dateTo) as {
      gst_rate: number
      taxable_amount: number
      cgst: number
      sgst: number
      total: number
    }[]

    // 3. Invoice list (for GSTR-1)
    const invoiceRows = db
      .prepare(
        `SELECT
           b.bill_no,
           b.date,
           b.customer_name,
           c.gstin as customer_gstin,
           b.taxable_amount,
           b.cgst_amount as cgst,
           b.sgst_amount as sgst,
           b.igst_amount as igst,
           b.grand_total as total
         FROM bills b
         LEFT JOIN customers c ON b.customer_id = c.id
         WHERE b.date >= ? AND b.date <= ? AND b.status = 'completed'
         ORDER BY b.date, b.bill_no`
      )
      .all(dateFrom, dateTo) as {
      bill_no: string
      date: string
      customer_name: string | null
      customer_gstin: string | null
      taxable_amount: number
      cgst: number
      sgst: number
      igst: number
      total: number
    }[]

    // 4. Totals
    const totals = db
      .prepare(
        `SELECT
           COALESCE(SUM(taxable_amount), 0) as total_taxable,
           COALESCE(SUM(cgst_amount), 0) as total_cgst,
           COALESCE(SUM(sgst_amount), 0) as total_sgst,
           COALESCE(SUM(igst_amount), 0) as total_igst,
           COALESCE(SUM(cgst_amount + sgst_amount + igst_amount), 0) as total_gst,
           COALESCE(SUM(grand_total), 0) as total_invoice,
           COUNT(*) as total_bills
         FROM bills
         WHERE date >= ? AND date <= ? AND status = 'completed'`
      )
      .get(dateFrom, dateTo) as {
      total_taxable: number
      total_cgst: number
      total_sgst: number
      total_igst: number
      total_gst: number
      total_invoice: number
      total_bills: number
    }

    return {
      totalTaxableAmount: totals.total_taxable,
      totalCgst: totals.total_cgst,
      totalSgst: totals.total_sgst,
      totalIgst: totals.total_igst,
      totalGst: totals.total_gst,
      totalInvoiceValue: totals.total_invoice,
      totalBills: totals.total_bills,
      hsnWise: hsnRows.map((r) => ({
        hsnCode: r.hsn_code || 'N/A',
        description: r.description || '',
        totalQty: r.total_qty,
        totalTaxableAmount: r.total_taxable,
        cgstRate: r.cgst_rate,
        cgstAmount: r.total_cgst,
        sgstRate: r.sgst_rate,
        sgstAmount: r.total_sgst,
        totalGst: r.total_gst,
        totalAmount: r.total_amount
      })),
      rateWise: rateRows.map((r) => ({
        gstRate: r.gst_rate,
        taxableAmount: r.taxable_amount,
        cgst: r.cgst,
        sgst: r.sgst,
        total: r.total
      })),
      invoiceList: invoiceRows.map((r) => ({
        billNo: r.bill_no,
        date: r.date,
        customerName: r.customer_name,
        customerGstin: r.customer_gstin,
        taxableAmount: r.taxable_amount,
        cgst: r.cgst,
        sgst: r.sgst,
        igst: r.igst,
        total: r.total
      }))
    }
  }

  // ============================================================================
  // PROFIT & LOSS REPORT
  // ============================================================================
  getProfitLossReport(dateFrom: string, dateTo: string): ProfitLossReport {
    const db = getSqlite()

    // Revenue
    const salesResult = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN status = 'completed' THEN grand_total ELSE 0 END), 0) as total_sales,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_bills,
           COALESCE(SUM(CASE WHEN status = 'returned' THEN grand_total ELSE 0 END), 0) as total_returns,
           COALESCE(SUM(CASE WHEN status = 'completed' THEN discount_amount ELSE 0 END), 0) as total_discount,
           COALESCE(SUM(CASE WHEN status = 'completed' THEN credit_amount ELSE 0 END), 0) as total_credit_sales
         FROM bills
         WHERE date >= ? AND date <= ?`
      )
      .get(dateFrom, dateTo) as {
      total_sales: number
      total_bills: number
      total_returns: number
      total_discount: number
      total_credit_sales: number
    }

    const netSales = salesResult.total_sales - salesResult.total_returns

    // Cost of Goods (Purchases) - use subtotal to exclude GST (input credit claimable)
    const purchaseResult = db
      .prepare(
        `SELECT
           COALESCE(SUM(subtotal), 0) as total_purchases,
           COALESCE(SUM(gst_amount), 0) as purchase_gst
         FROM purchases
         WHERE date >= ? AND date <= ?`
      )
      .get(dateFrom, dateTo) as { total_purchases: number; purchase_gst: number }

    const netPurchases = purchaseResult.total_purchases

    // Gross Profit
    const grossProfit = netSales - netPurchases

    // Expenses
    const expenseTotal = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM expenses WHERE date >= ? AND date <= ?`
      )
      .get(dateFrom, dateTo) as { total: number }

    const expenseByCategory = db
      .prepare(
        `SELECT category, COALESCE(SUM(amount), 0) as amount
         FROM expenses WHERE date >= ? AND date <= ?
         GROUP BY category ORDER BY amount DESC`
      )
      .all(dateFrom, dateTo) as { category: string; amount: number }[]

    // Credit collected
    const creditCollected = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM credit_payments WHERE date >= ? AND date <= ?`
      )
      .get(dateFrom, dateTo) as { total: number }

    // Net Profit
    const netProfit = grossProfit - expenseTotal.total

    return {
      period: { from: dateFrom, to: dateTo },
      revenue: {
        totalSales: salesResult.total_sales,
        totalBills: salesResult.total_bills,
        totalReturns: salesResult.total_returns,
        netSales
      },
      costOfGoods: {
        totalPurchases: purchaseResult.total_purchases,
        purchaseGst: purchaseResult.purchase_gst,
        netPurchases
      },
      grossProfit,
      grossMarginPercent: netSales > 0 ? (grossProfit / netSales) * 100 : 0,
      expenses: {
        total: expenseTotal.total,
        byCategory: expenseByCategory
      },
      netProfit,
      netMarginPercent: netSales > 0 ? (netProfit / netSales) * 100 : 0,
      otherInfo: {
        totalDiscount: salesResult.total_discount,
        totalCreditSales: salesResult.total_credit_sales,
        totalCreditCollected: creditCollected.total,
        avgBillValue:
          salesResult.total_bills > 0 ? salesResult.total_sales / salesResult.total_bills : 0
      }
    }
  }

  // ============================================================================
  // DASHBOARD ENHANCED DATA
  // ============================================================================
  getDashboardData(date: string): {
    pendingCredits: number
    pendingCreditCustomers: number
    outOfStockCount: number
    todayExpenses: number
    todayCollections: number
    yesterdaySales: number
  } {
    const db = getSqlite()

    // Pending credits
    const creditResult = db
      .prepare(
        `SELECT
           COALESCE(SUM(current_balance), 0) as total_pending,
           COUNT(CASE WHEN current_balance > 0 THEN 1 END) as customer_count
         FROM customers WHERE is_active = 1`
      )
      .get() as { total_pending: number; customer_count: number }

    // Out of stock
    const outOfStock = db
      .prepare(`SELECT COUNT(*) as count FROM products WHERE current_stock <= 0 AND is_active = 1`)
      .get() as { count: number }

    // Today's expenses
    const todayExpenses = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = ?`)
      .get(date) as { total: number }

    // Today's credit collections
    const todayCollections = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM credit_payments WHERE date = ?`)
      .get(date) as { total: number }

    // Yesterday's sales for comparison
    const yesterdaySales = db
      .prepare(
        `SELECT COALESCE(SUM(grand_total), 0) as total
         FROM bills WHERE date = date(?, '-1 day') AND status = 'completed'`
      )
      .get(date) as { total: number }

    return {
      pendingCredits: creditResult.total_pending,
      pendingCreditCustomers: creditResult.customer_count,
      outOfStockCount: outOfStock.count,
      todayExpenses: todayExpenses.total,
      todayCollections: todayCollections.total,
      yesterdaySales: yesterdaySales.total
    }
  }
}

export const reportRepo = new ReportRepository()
