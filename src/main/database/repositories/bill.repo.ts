// ============================================================================
// KPT Billing - Bill Repository
// ============================================================================
import { getSqlite } from '../connection'
import { mapRow, mapRows } from '../utils'
import type {
  Bill,
  BillCreateData,
  BillItem,
  DailySummary,
  BillFilters,
  PaginatedResult,
  BillReturnData,
  BillReturnResult
} from '../../../shared/types'
import { getFinancialYear, getLocalDateString } from '../../../shared/constants'

export class BillRepository {
  getNextBillNumber(): string {
    const db = getSqlite()
    const fy = getFinancialYear(new Date())
    const prefix = `KPT/${fy}/`
    const fyKey = `lastBillNumber_${fy}`

    // Get last bill number for this financial year (resets each FY)
    const lastSeq = db.prepare('SELECT value FROM settings WHERE key = ?').get(fyKey) as
      | { value: string }
      | undefined

    // Fallback: if no FY-specific key, try legacy global key for migration
    if (!lastSeq) {
      const legacySeq = db
        .prepare("SELECT value FROM settings WHERE key = 'lastBillNumber'")
        .get() as { value: string } | undefined

      // Check if any bills exist for this FY already
      const existingBill = db
        .prepare('SELECT bill_no FROM bills WHERE bill_no LIKE ? ORDER BY id DESC LIMIT 1')
        .get(`${prefix}%`) as { bill_no: string } | undefined

      if (existingBill) {
        // Extract sequence from most recent bill of this FY
        const seq = parseInt(existingBill.bill_no.split('/').pop() || '0')
        const nextSeq = (seq + 1).toString().padStart(5, '0')
        return `${prefix}${nextSeq}`
      }

      // New FY with no bills — if legacy key exists with a value, start fresh at 1
      if (legacySeq && parseInt(legacySeq.value) > 0) {
        return `${prefix}00001`
      }
    }

    const nextSeq = (parseInt(lastSeq?.value || '0') + 1).toString().padStart(5, '0')
    return `${prefix}${nextSeq}`
  }

  create(data: BillCreateData): Bill {
    const db = getSqlite()
    const now = new Date()
    const date = getLocalDateString(now)
    const time = now.toLocaleTimeString('en-IN', { hour12: false })

    const result = db.transaction(() => {
      // Generate bill number
      const billNo = this.getNextBillNumber()
      const lastSeqStr = billNo.split('/').pop() || '1'
      const lastSeq = parseInt(lastSeqStr)

      // Calculate totals from items
      let subtotal = 0
      let totalDiscount = 0
      let totalTaxable = 0
      let totalCgst = 0
      let totalSgst = 0
      const totalItems = data.items.length
      let totalQty = 0

      for (const item of data.items) {
        const itemTotal = (item.price || 0) * (item.quantity || 0)
        let discount = 0
        if (item.discountType === 'percent' || item.discountType === 'percentage') {
          discount = (itemTotal * (item.discount || 0)) / 100
        } else {
          discount = item.discount || 0
        }
        const taxable = itemTotal - discount
        const gstRate = item.gstRate || 0
        const cgst = (taxable * (gstRate / 2)) / 100
        const sgst = (taxable * (gstRate / 2)) / 100

        subtotal += itemTotal
        totalDiscount += discount
        totalTaxable += taxable
        totalCgst += cgst
        totalSgst += sgst
        totalQty += item.quantity || 0
      }

      // Apply bill-level discount (on top of item-level discounts)
      // Per CGST Act Section 15(3), bill-level discount reduces taxable value before GST
      let billLevelDiscount = 0
      if (data.discount && data.discount > 0) {
        if (data.discountType === 'percentage') {
          billLevelDiscount = (subtotal * data.discount) / 100
        } else {
          billLevelDiscount = data.discount
        }
        billLevelDiscount = Math.round(billLevelDiscount * 100) / 100
      }
      totalDiscount += billLevelDiscount

      // Recompute GST on the reduced taxable amount after bill-level discount
      if (billLevelDiscount > 0) {
        // Proportionally distribute bill discount across items and recompute GST
        const discountRatio =
          totalTaxable > 0 ? (totalTaxable - billLevelDiscount) / totalTaxable : 1
        totalTaxable = Math.max(0, totalTaxable - billLevelDiscount)
        totalCgst = Math.round(totalCgst * discountRatio * 100) / 100
        totalSgst = Math.round(totalSgst * discountRatio * 100) / 100
      }

      const grandTotalRaw = totalTaxable + totalCgst + totalSgst
      const grandTotal = Math.round(Math.max(0, grandTotalRaw))
      const roundOff = grandTotal - grandTotalRaw

      // Insert bill header
      const billResult = db
        .prepare(
          `INSERT INTO bills (bill_no, date, time, customer_id, customer_name, customer_phone,
           subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount,
           round_off, grand_total, payment_mode, cash_amount, upi_amount, card_amount,
           credit_amount, upi_reference, cash_tendered, change_amount, status,
           salesman_name, total_items, total_qty, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          billNo,
          date,
          time,
          data.customerId || null,
          data.customerName || null,
          data.customerPhone || null,
          Math.round(subtotal * 100) / 100,
          Math.round(totalDiscount * 100) / 100,
          Math.round(totalTaxable * 100) / 100,
          Math.round(totalCgst * 100) / 100,
          Math.round(totalSgst * 100) / 100,
          0, // IGST (for intra-state, always 0)
          Math.round(roundOff * 100) / 100,
          grandTotal,
          data.payment.mode,
          data.payment.cashAmount || 0,
          data.payment.upiAmount || 0,
          data.payment.cardAmount || 0,
          data.payment.creditAmount || 0,
          data.payment.reference || null,
          data.payment.received || 0,
          data.payment.change || 0,
          'completed',
          data.salesmanName || null,
          totalItems,
          totalQty,
          null // TODO: current user
        )

      const billId = Number(billResult.lastInsertRowid)

      // Insert bill items
      const insertItem = db.prepare(
        `INSERT INTO bill_items (bill_id, product_id, product_name, hsn_code, qty, rate,
         discount_type, discount_value, taxable_amount, cgst_rate, cgst_amount, sgst_rate, sgst_amount, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )

      for (const item of data.items) {
        const itemTotal = (item.price || 0) * (item.quantity || 0)
        let discount = 0
        if (item.discountType === 'percent' || item.discountType === 'percentage') {
          discount = (itemTotal * (item.discount || 0)) / 100
        } else {
          discount = item.discount || 0
        }
        const taxable = itemTotal - discount
        const gstRate = item.gstRate || 0
        const cgstRate = gstRate / 2
        const sgstRate = gstRate / 2
        const cgst = (taxable * cgstRate) / 100
        const sgst = (taxable * sgstRate) / 100
        const amount = taxable + cgst + sgst

        insertItem.run(
          billId,
          item.productId,
          item.productName,
          item.hsn || '',
          item.quantity || 0,
          item.price || 0,
          item.discountType,
          item.discount || 0,
          Math.round(taxable * 100) / 100,
          cgstRate,
          Math.round(cgst * 100) / 100,
          sgstRate,
          Math.round(sgst * 100) / 100,
          Math.round(amount * 100) / 100
        )

        // Deduct stock
        if (item.productId) {
          db.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?').run(
            item.quantity || 0,
            item.productId
          )
          db.prepare(
            `INSERT INTO stock_ledger (product_id, type, qty, reference_type, reference_id, notes)
             VALUES (?, 'sale', ?, 'bill', ?, ?)`
          ).run(item.productId, -(item.quantity || 0), billId, `Bill ${billNo}`)
        }
      }

      // Update bill number sequence (per financial year)
      const fy = getFinancialYear(new Date())
      const fyKey = `lastBillNumber_${fy}`
      db.prepare(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))"
      ).run(fyKey, lastSeq.toString())

      // Update customer balance if credit
      if ((data.payment.creditAmount || 0) > 0 && data.customerId) {
        db.prepare('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?').run(
          data.payment.creditAmount,
          data.customerId
        )
      }

      return billId
    })()

    return this.getById(result)!
  }

  getById(id: number): Bill | null {
    const db = getSqlite()
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined
    if (!bill) return null

    const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(id) as Record<
      string,
      unknown
    >[]
    const mappedItems = mapRows<BillItem>(items)

    // Attach returned qty to each item
    const returnedQtyMap = this.getReturnedQtyMap(id)
    for (const item of mappedItems) {
      item.returnedQty = returnedQtyMap[Number(item.id)] || 0
    }

    // Load return history
    const returnRows = db
      .prepare(
        `SELECT br.id, br.type, br.reason, br.return_amount, br.exchange_amount,
              br.net_amount, br.refund_mode, br.new_bill_id, br.created_at,
              GROUP_CONCAT(bri.product_name || ' x' || bri.return_qty, ', ') as items_summary
       FROM bill_returns br
       LEFT JOIN bill_return_items bri ON bri.return_id = br.id
       WHERE br.original_bill_id = ? AND br.status = 'completed'
       GROUP BY br.id
       ORDER BY br.created_at DESC`
      )
      .all(id) as Record<string, unknown>[]

    // Get new bill numbers for exchange returns
    const returns = returnRows.map((r) => {
      let newBillNo: string | null = null
      if (r.new_bill_id) {
        const nb = db.prepare('SELECT bill_no FROM bills WHERE id = ?').get(r.new_bill_id) as
          | { bill_no: string }
          | undefined
        newBillNo = nb?.bill_no || null
      }
      return {
        id: r.id as number,
        type: r.type as 'return' | 'exchange',
        reason: r.reason as string,
        returnAmount: r.return_amount as number,
        exchangeAmount: r.exchange_amount as number,
        netAmount: r.net_amount as number,
        refundMode: r.refund_mode as string,
        newBillId: (r.new_bill_id as number) || null,
        newBillNo,
        createdAt: r.created_at as string,
        itemsSummary: (r.items_summary as string) || ''
      }
    })

    const result = { ...mapRow<Bill>(bill), items: mappedItems } as Bill
    if (returns.length > 0) {
      result.returns = returns
    }
    return result
  }

  getByBillNo(billNo: string): Bill | null {
    const db = getSqlite()
    const bill = db.prepare('SELECT * FROM bills WHERE bill_no = ?').get(billNo) as
      | Record<string, unknown>
      | undefined
    if (!bill) return null

    const items = db
      .prepare('SELECT * FROM bill_items WHERE bill_id = ?')
      .all(bill.id as number) as Record<string, unknown>[]
    return { ...mapRow<Bill>(bill), items: mapRows<BillItem>(items) }
  }

  getRecentBills(limit: number = 10): Bill[] {
    const db = getSqlite()
    const rows = db
      .prepare('SELECT * FROM bills WHERE status = ? ORDER BY id DESC LIMIT ?')
      .all('completed', limit) as Record<string, unknown>[]
    return mapRows<Bill>(rows)
  }

  getBillsByDate(date: string): Bill[] {
    const db = getSqlite()
    const rows = db
      .prepare('SELECT * FROM bills WHERE date = ? AND status = ? ORDER BY id DESC')
      .all(date, 'completed') as Record<string, unknown>[]
    return mapRows<Bill>(rows)
  }

  getDailySummary(date: string): DailySummary {
    const db = getSqlite()
    const result = db
      .prepare(
        `SELECT
           COALESCE(SUM(grand_total), 0) as total_sales,
           COUNT(*) as total_bills,
           COALESCE(SUM(cash_amount), 0) as cash_collected,
           COALESCE(SUM(upi_amount), 0) as upi_collected,
           COALESCE(SUM(card_amount), 0) as card_collected,
           COALESCE(SUM(credit_amount), 0) as credit_given,
           COALESCE(SUM(discount_amount), 0) as total_discount,
           COALESCE(SUM(total_qty), 0) as total_items,
           SUM(CASE WHEN cash_amount > 0 THEN 1 ELSE 0 END) as cash_bills,
           SUM(CASE WHEN upi_amount > 0 THEN 1 ELSE 0 END) as upi_bills,
           SUM(CASE WHEN card_amount > 0 THEN 1 ELSE 0 END) as card_bills,
           SUM(CASE WHEN credit_amount > 0 THEN 1 ELSE 0 END) as credit_bills
         FROM bills
         WHERE date = ? AND status = 'completed'`
      )
      .get(date) as {
      total_sales: number
      total_bills: number
      cash_collected: number
      upi_collected: number
      card_collected: number
      credit_given: number
      total_discount: number
      total_items: number
      cash_bills: number
      upi_bills: number
      card_bills: number
      credit_bills: number
    }

    return {
      totalSales: result.total_sales,
      totalBills: result.total_bills,
      cashSales: result.cash_collected,
      upiSales: result.upi_collected,
      cardSales: result.card_collected,
      creditSales: result.credit_given,
      totalDiscount: result.total_discount,
      totalItems: result.total_items,
      cashBills: result.cash_bills || 0,
      upiBills: result.upi_bills || 0,
      cardBills: result.card_bills || 0,
      creditBills: result.credit_bills || 0
    }
  }

  getWeekSummary(): number {
    const db = getSqlite()
    const result = db
      .prepare(
        `SELECT COALESCE(SUM(grand_total), 0) as total
         FROM bills
         WHERE date >= date('now', '-7 days', 'localtime') AND status = 'completed'`
      )
      .get() as { total: number }
    return result.total
  }

  getMonthSummary(): number {
    const db = getSqlite()
    const result = db
      .prepare(
        `SELECT COALESCE(SUM(grand_total), 0) as total
         FROM bills
         WHERE date >= date('now', 'start of month', 'localtime') AND status = 'completed'`
      )
      .get() as { total: number }
    return result.total
  }

  getTopSellingToday(
    date: string,
    limit: number = 5
  ): { productName: string; totalQty: number; totalAmount: number }[] {
    const db = getSqlite()
    const rows = db
      .prepare(
        `SELECT bi.product_name, SUM(bi.qty) as total_qty, SUM(bi.amount) as total_amount
         FROM bill_items bi
         JOIN bills b ON bi.bill_id = b.id
         WHERE b.date = ? AND b.status = 'completed'
         GROUP BY bi.product_name
         ORDER BY total_qty DESC
         LIMIT ?`
      )
      .all(date, limit) as { product_name: string; total_qty: number; total_amount: number }[]
    return rows.map((r) => ({
      productName: r.product_name,
      totalQty: r.total_qty,
      totalAmount: r.total_amount
    }))
  }

  getAllBills(filters: BillFilters = {}): PaginatedResult<Bill> {
    const db = getSqlite()
    const { dateFrom, dateTo, status, paymentMode, search, page = 1, pageSize = 50 } = filters

    let where = 'WHERE 1=1'
    const params: unknown[] = []

    if (dateFrom) {
      where += ' AND date >= ?'
      params.push(dateFrom)
    }
    if (dateTo) {
      where += ' AND date <= ?'
      params.push(dateTo)
    }
    if (status) {
      where += ' AND status = ?'
      params.push(status)
    }
    if (paymentMode) {
      where += ' AND payment_mode = ?'
      params.push(paymentMode)
    }
    if (search) {
      where += ' AND (bill_no LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)'
      const s = `%${search}%`
      params.push(s, s, s)
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as total FROM bills ${where}`)
      .get(...params) as { total: number }

    const offset = (page - 1) * pageSize
    const data = db
      .prepare(`SELECT * FROM bills ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset) as Record<string, unknown>[]

    return { data: mapRows<Bill>(data), total: countResult.total, page, pageSize }
  }

  returnBill(billId: number, reason?: string): Bill {
    const db = getSqlite()
    db.transaction(() => {
      const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId) as
        | Record<string, unknown>
        | undefined
      if (!bill) throw new Error('Bill not found')
      if (bill.status === 'returned') throw new Error('Bill already returned')
      if (bill.status === 'cancelled') throw new Error('Bill is cancelled')

      // Reverse stock for all items
      const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(billId) as Record<
        string,
        unknown
      >[]
      for (const item of items) {
        if (item.product_id) {
          db.prepare('UPDATE products SET current_stock = current_stock + ? WHERE id = ?').run(
            item.qty,
            item.product_id
          )
          db.prepare(
            `INSERT INTO stock_ledger (product_id, type, qty, reference_type, reference_id, notes)
             VALUES (?, 'return', ?, 'bill', ?, ?)`
          ).run(item.product_id, item.qty, billId, reason || 'Bill return')
        }
      }

      // Reverse customer credit balance if applicable (clamp to actual balance to prevent negatives)
      if ((bill.credit_amount as number) > 0 && bill.customer_id) {
        const customer = db
          .prepare('SELECT current_balance FROM customers WHERE id = ?')
          .get(bill.customer_id) as { current_balance: number } | undefined
        const actualReversal = Math.min(
          bill.credit_amount as number,
          customer?.current_balance ?? 0
        )
        if (actualReversal > 0) {
          db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?').run(
            actualReversal,
            bill.customer_id
          )
        }
      }

      db.prepare("UPDATE bills SET status = 'returned' WHERE id = ?").run(billId)
    })()
    return this.getById(billId)!
  }

  cancelBill(billId: number, reason?: string): Bill {
    const db = getSqlite()
    db.transaction(() => {
      const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId) as
        | Record<string, unknown>
        | undefined
      if (!bill) throw new Error('Bill not found')
      if (bill.status === 'cancelled') throw new Error('Bill already cancelled')
      if (bill.status === 'returned') throw new Error('Bill is returned, cannot cancel')

      // Reverse stock
      const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(billId) as Record<
        string,
        unknown
      >[]
      for (const item of items) {
        if (item.product_id) {
          db.prepare('UPDATE products SET current_stock = current_stock + ? WHERE id = ?').run(
            item.qty,
            item.product_id
          )
          db.prepare(
            `INSERT INTO stock_ledger (product_id, type, qty, reference_type, reference_id, notes)
             VALUES (?, 'return', ?, 'bill', ?, ?)`
          ).run(item.product_id, item.qty, billId, reason || 'Bill cancelled')
        }
      }

      // Reverse customer credit (clamp to actual balance to prevent negatives)
      if ((bill.credit_amount as number) > 0 && bill.customer_id) {
        const customer = db
          .prepare('SELECT current_balance FROM customers WHERE id = ?')
          .get(bill.customer_id) as { current_balance: number } | undefined
        const actualReversal = Math.min(
          bill.credit_amount as number,
          customer?.current_balance ?? 0
        )
        if (actualReversal > 0) {
          db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?').run(
            actualReversal,
            bill.customer_id
          )
        }
      }

      db.prepare("UPDATE bills SET status = 'cancelled' WHERE id = ?").run(billId)
    })()
    return this.getById(billId)!
  }

  getBillsByCustomer(customerId: number, limit: number = 50): Bill[] {
    const db = getSqlite()
    const rows = db
      .prepare('SELECT * FROM bills WHERE customer_id = ? ORDER BY id DESC LIMIT ?')
      .all(customerId, limit) as Record<string, unknown>[]
    return mapRows<Bill>(rows)
  }

  // ---- Period Summary (weekly / monthly / yearly) ----

  /**
   * Get detailed summary for a date range with day-by-day breakdown.
   */
  getPeriodSummary(
    dateFrom: string,
    dateTo: string
  ): {
    totals: DailySummary
    dailyBreakdown: {
      date: string
      totalSales: number
      billCount: number
      cashSales: number
      upiSales: number
      cardSales: number
      creditSales: number
    }[]
    paymentBreakdown: { mode: string; total: number; count: number }[]
    topProducts: { productName: string; totalQty: number; totalAmount: number }[]
  } {
    const db = getSqlite()

    // Aggregate totals
    const totals = db
      .prepare(
        `SELECT
         COALESCE(SUM(grand_total), 0) as total_sales,
         COUNT(*) as total_bills,
         COALESCE(SUM(cash_amount), 0) as cash_collected,
         COALESCE(SUM(upi_amount), 0) as upi_collected,
         COALESCE(SUM(card_amount), 0) as card_collected,
         COALESCE(SUM(credit_amount), 0) as credit_given,
         COALESCE(SUM(discount_amount), 0) as total_discount,
         COALESCE(SUM(total_qty), 0) as total_items
       FROM bills
       WHERE date >= ? AND date <= ? AND status = 'completed'`
      )
      .get(dateFrom, dateTo) as {
      total_sales: number
      total_bills: number
      cash_collected: number
      upi_collected: number
      card_collected: number
      credit_given: number
      total_discount: number
      total_items: number
    }

    // Day-by-day breakdown
    const daily = db
      .prepare(
        `SELECT
         date,
         COALESCE(SUM(grand_total), 0) as total_sales,
         COUNT(*) as bill_count,
         COALESCE(SUM(cash_amount), 0) as cash_sales,
         COALESCE(SUM(upi_amount), 0) as upi_sales,
         COALESCE(SUM(card_amount), 0) as card_sales,
         COALESCE(SUM(credit_amount), 0) as credit_sales
       FROM bills
       WHERE date >= ? AND date <= ? AND status = 'completed'
       GROUP BY date
       ORDER BY date ASC`
      )
      .all(dateFrom, dateTo) as {
      date: string
      total_sales: number
      bill_count: number
      cash_sales: number
      upi_sales: number
      card_sales: number
      credit_sales: number
    }[]

    // Payment mode breakdown
    const payments = db
      .prepare(
        `SELECT
         payment_mode as mode,
         COALESCE(SUM(grand_total), 0) as total,
         COUNT(*) as count
       FROM bills
       WHERE date >= ? AND date <= ? AND status = 'completed'
       GROUP BY payment_mode
       ORDER BY total DESC`
      )
      .all(dateFrom, dateTo) as { mode: string; total: number; count: number }[]

    // Top products
    const products = db
      .prepare(
        `SELECT
         bi.product_name,
         SUM(bi.qty) as total_qty,
         SUM(bi.amount) as total_amount
       FROM bill_items bi
       JOIN bills b ON bi.bill_id = b.id
       WHERE b.date >= ? AND b.date <= ? AND b.status = 'completed'
       GROUP BY bi.product_name
       ORDER BY total_qty DESC
       LIMIT 20`
      )
      .all(dateFrom, dateTo) as { product_name: string; total_qty: number; total_amount: number }[]

    return {
      totals: {
        totalSales: totals.total_sales,
        totalBills: totals.total_bills,
        cashSales: totals.cash_collected,
        upiSales: totals.upi_collected,
        cardSales: totals.card_collected,
        creditSales: totals.credit_given,
        totalDiscount: totals.total_discount,
        totalItems: totals.total_items,
        cashBills: 0,
        upiBills: 0,
        cardBills: 0,
        creditBills: 0
      },
      dailyBreakdown: daily.map((d) => ({
        date: d.date,
        totalSales: d.total_sales,
        billCount: d.bill_count,
        cashSales: d.cash_sales,
        upiSales: d.upi_sales,
        cardSales: d.card_sales,
        creditSales: d.credit_sales
      })),
      paymentBreakdown: payments,
      topProducts: products.map((p) => ({
        productName: p.product_name,
        totalQty: p.total_qty,
        totalAmount: p.total_amount
      }))
    }
  }

  /**
   * Get weekly summary (last 7 days from given date)
   */
  getWeeklySummary(endDate?: string): ReturnType<BillRepository['getPeriodSummary']> {
    const end = endDate || getLocalDateString()
    const start = getLocalDateString(new Date(new Date(end + 'T00:00:00').getTime() - 6 * 86400000))
    return this.getPeriodSummary(start, end)
  }

  /**
   * Get monthly summary for a given month (YYYY-MM)
   */
  getMonthlySummary(yearMonth?: string): ReturnType<BillRepository['getPeriodSummary']> {
    const now = new Date()
    const ym = yearMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [year, month] = ym.split('-').map(Number)
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return this.getPeriodSummary(start, end)
  }

  /**
   * Get yearly summary for a given year
   */
  getYearlySummary(year?: number): {
    totals: DailySummary
    monthlyBreakdown: {
      month: string
      totalSales: number
      billCount: number
      cashSales: number
      upiSales: number
      cardSales: number
      creditSales: number
    }[]
    paymentBreakdown: { mode: string; total: number; count: number }[]
    topProducts: { productName: string; totalQty: number; totalAmount: number }[]
  } {
    const db = getSqlite()
    const y = year || new Date().getFullYear()
    const dateFrom = `${y}-01-01`
    const dateTo = `${y}-12-31`

    // Aggregate totals
    const totals = db
      .prepare(
        `SELECT
         COALESCE(SUM(grand_total), 0) as total_sales,
         COUNT(*) as total_bills,
         COALESCE(SUM(cash_amount), 0) as cash_collected,
         COALESCE(SUM(upi_amount), 0) as upi_collected,
         COALESCE(SUM(card_amount), 0) as card_collected,
         COALESCE(SUM(credit_amount), 0) as credit_given,
         COALESCE(SUM(discount_amount), 0) as total_discount,
         COALESCE(SUM(total_qty), 0) as total_items
       FROM bills
       WHERE date >= ? AND date <= ? AND status = 'completed'`
      )
      .get(dateFrom, dateTo) as {
      total_sales: number
      total_bills: number
      cash_collected: number
      upi_collected: number
      card_collected: number
      credit_given: number
      total_discount: number
      total_items: number
    }

    // Month-by-month breakdown
    const monthly = db
      .prepare(
        `SELECT
         strftime('%Y-%m', date) as month,
         COALESCE(SUM(grand_total), 0) as total_sales,
         COUNT(*) as bill_count,
         COALESCE(SUM(cash_amount), 0) as cash_sales,
         COALESCE(SUM(upi_amount), 0) as upi_sales,
         COALESCE(SUM(card_amount), 0) as card_sales,
         COALESCE(SUM(credit_amount), 0) as credit_sales
       FROM bills
       WHERE date >= ? AND date <= ? AND status = 'completed'
       GROUP BY strftime('%Y-%m', date)
       ORDER BY month ASC`
      )
      .all(dateFrom, dateTo) as {
      month: string
      total_sales: number
      bill_count: number
      cash_sales: number
      upi_sales: number
      card_sales: number
      credit_sales: number
    }[]

    // Payment mode breakdown
    const payments = db
      .prepare(
        `SELECT
         payment_mode as mode,
         COALESCE(SUM(grand_total), 0) as total,
         COUNT(*) as count
       FROM bills
       WHERE date >= ? AND date <= ? AND status = 'completed'
       GROUP BY payment_mode
       ORDER BY total DESC`
      )
      .all(dateFrom, dateTo) as { mode: string; total: number; count: number }[]

    // Top 20 products
    const products = db
      .prepare(
        `SELECT
         bi.product_name,
         SUM(bi.qty) as total_qty,
         SUM(bi.amount) as total_amount
       FROM bill_items bi
       JOIN bills b ON bi.bill_id = b.id
       WHERE b.date >= ? AND b.date <= ? AND b.status = 'completed'
       GROUP BY bi.product_name
       ORDER BY total_qty DESC
       LIMIT 20`
      )
      .all(dateFrom, dateTo) as { product_name: string; total_qty: number; total_amount: number }[]

    return {
      totals: {
        totalSales: totals.total_sales,
        totalBills: totals.total_bills,
        cashSales: totals.cash_collected,
        upiSales: totals.upi_collected,
        cardSales: totals.card_collected,
        creditSales: totals.credit_given,
        totalDiscount: totals.total_discount,
        totalItems: totals.total_items,
        cashBills: 0,
        upiBills: 0,
        cardBills: 0,
        creditBills: 0
      },
      monthlyBreakdown: monthly.map((m) => ({
        month: m.month,
        totalSales: m.total_sales,
        billCount: m.bill_count,
        cashSales: m.cash_sales,
        upiSales: m.upi_sales,
        cardSales: m.card_sales,
        creditSales: m.credit_sales
      })),
      paymentBreakdown: payments,
      topProducts: products.map((p) => ({
        productName: p.product_name,
        totalQty: p.total_qty,
        totalAmount: p.total_amount
      }))
    }
  }

  // ============================================================================
  // Bill Return / Exchange
  // ============================================================================

  /**
   * Process a partial or full return/exchange on an existing bill.
   * - RETURN: Refunds selected items, restores stock, adjusts credit if applicable.
   * - EXCHANGE: Returns selected items AND creates a new bill for exchange items.
   *   Net amount = exchange total - return refund. Positive = customer pays; negative = refund.
   */
  processReturn(data: BillReturnData): BillReturnResult {
    const db = getSqlite()

    const result = db.transaction(() => {
      // 1. Validate original bill
      const originalBill = db
        .prepare('SELECT * FROM bills WHERE id = ?')
        .get(data.originalBillId) as Record<string, unknown> | undefined
      if (!originalBill) throw new Error('Original bill not found')
      if (originalBill.status === 'cancelled') throw new Error('Cannot return a cancelled bill')

      // 2. Calculate return amounts for each item
      let totalReturnAmount = 0
      for (const ri of data.returnItems) {
        if (ri.returnQty <= 0) continue

        // Get original bill item for validation
        const origItem = db
          .prepare('SELECT * FROM bill_items WHERE id = ? AND bill_id = ?')
          .get(ri.billItemId, data.originalBillId) as Record<string, unknown> | undefined
        if (!origItem) throw new Error(`Bill item #${ri.billItemId} not found`)

        const origQty = origItem.qty as number
        // Check already-returned qty for this item
        const alreadyReturned = db
          .prepare(
            `SELECT COALESCE(SUM(bri.return_qty), 0) as returned
           FROM bill_return_items bri
           JOIN bill_returns br ON bri.return_id = br.id
           WHERE bri.bill_item_id = ? AND br.status = 'completed'`
          )
          .get(ri.billItemId) as { returned: number }

        const availableQty = origQty - alreadyReturned.returned
        if (ri.returnQty > availableQty) {
          throw new Error(
            `Cannot return ${ri.returnQty} of "${ri.productName}" — only ${availableQty} available`
          )
        }

        // Calculate proportional refund (preserving per-item discount ratio)
        const origRate = origItem.rate as number
        const origDiscType = origItem.discount_type as string
        const origDiscValue = origItem.discount_value as number
        const origGstRate = (origItem.cgst_rate as number) + (origItem.sgst_rate as number)

        const returnLineTotal = origRate * ri.returnQty
        let returnDiscount = 0
        if (origDiscType === 'percent' || origDiscType === 'percentage') {
          returnDiscount = (returnLineTotal * origDiscValue) / 100
        } else {
          // Flat discount proportioned by qty
          returnDiscount = origQty > 0 ? (origDiscValue / origQty) * ri.returnQty : 0
        }
        const returnTaxable = returnLineTotal - returnDiscount
        const returnGst = (returnTaxable * origGstRate) / 100
        const refundAmount = Math.round((returnTaxable + returnGst) * 100) / 100

        ri.refundAmount = refundAmount
        totalReturnAmount += refundAmount
      }

      // 3. Calculate exchange amounts (if exchange type)
      let totalExchangeAmount = 0
      let newBillId: number | undefined
      let newBillNo: string | undefined

      if (data.type === 'exchange' && data.exchangeItems.length > 0) {
        // Create a new bill for exchange items
        const exchangeBillData: BillCreateData = {
          customerName: (originalBill.customer_name as string) || undefined,
          customerPhone: (originalBill.customer_phone as string) || undefined,
          customerId: (originalBill.customer_id as number) || undefined,
          items: data.exchangeItems.map((ei) => ({
            productId: ei.productId,
            productName: ei.productName,
            sku: ei.sku || '',
            hsn: ei.hsn || '',
            price: ei.price,
            quantity: ei.quantity,
            discount: ei.discount,
            discountType: ei.discountType,
            gstRate: ei.gstRate
          })),
          payment: {
            mode: 'cash' as const,
            amount: 0, // Will be calculated
            received: 0,
            change: 0,
            cashAmount: 0,
            upiAmount: 0,
            cardAmount: 0,
            creditAmount: 0
          },
          salesmanName: (originalBill.salesman_name as string) || undefined
        }

        // Calculate exchange total from items
        for (const ei of data.exchangeItems) {
          const lineTotal = ei.price * ei.quantity
          let disc = 0
          if (ei.discountType === 'percentage') {
            disc = (lineTotal * ei.discount) / 100
          } else {
            disc = ei.discount
          }
          const taxable = lineTotal - disc
          const gst = (taxable * ei.gstRate) / 100
          totalExchangeAmount += taxable + gst
        }
        totalExchangeAmount = Math.round(totalExchangeAmount)

        // Net: positive = customer pays more, negative = refund
        const netAmount = totalExchangeAmount - Math.round(totalReturnAmount)

        // Set payment based on net
        if (netAmount > 0) {
          // Customer owes the difference
          if (data.refundMode === 'credit' && originalBill.customer_id) {
            exchangeBillData.payment.mode = 'credit'
            exchangeBillData.payment.creditAmount = netAmount
          } else {
            exchangeBillData.payment.mode = 'cash'
            exchangeBillData.payment.cashAmount = netAmount
          }
          exchangeBillData.payment.amount = netAmount
          exchangeBillData.payment.received = netAmount
        } else {
          // Return value fully covers exchange items; record exchange bill as cash-paid
          // (the returned goods are the "payment"; any net refund goes back to customer)
          const exAmt = Math.round(Math.max(0, totalExchangeAmount))
          exchangeBillData.payment.mode = 'cash'
          exchangeBillData.payment.amount = exAmt
          exchangeBillData.payment.cashAmount = exAmt
          exchangeBillData.payment.received = exAmt
        }

        const newBill = this.create(exchangeBillData)
        newBillId = newBill.id
        newBillNo = newBill.billNo || newBill.billNumber
      }

      // 4. Restore stock for returned items
      for (const ri of data.returnItems) {
        if (ri.returnQty <= 0) continue
        if (ri.productId) {
          db.prepare('UPDATE products SET current_stock = current_stock + ? WHERE id = ?').run(
            ri.returnQty,
            ri.productId
          )
          db.prepare(
            `INSERT INTO stock_ledger (product_id, type, qty, reference_type, reference_id, notes)
             VALUES (?, 'return', ?, 'bill_return', ?, ?)`
          ).run(ri.productId, ri.returnQty, data.originalBillId, data.reason || 'Item return')
        }
      }

      // 5. Handle refund/credit adjustment
      const netAmount = Math.round(totalExchangeAmount) - Math.round(totalReturnAmount)

      // Reduce customer credit balance whenever the original bill had credit component
      // (regardless of refundMode — credit_amount on the bill is being unwound)
      const origCreditAmt = (originalBill.credit_amount as number) || 0

      if (data.type === 'return' && totalReturnAmount > 0 && originalBill.customer_id) {
        if (origCreditAmt > 0) {
          // Original bill had credit: reverse the credit portion (capped to what was on credit)
          const actualReversal = Math.min(Math.round(totalReturnAmount), origCreditAmt)
          if (actualReversal > 0) {
            db.prepare(
              'UPDATE customers SET current_balance = current_balance - ? WHERE id = ?'
            ).run(actualReversal, originalBill.customer_id)
          }
        } else if (data.refundMode === 'credit') {
          // Original bill was cash/upi/card but customer chose credit refund:
          // Give customer store credit (reduce balance, may go negative = shop owes customer)
          db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?').run(
            Math.round(totalReturnAmount),
            originalBill.customer_id
          )
        }
      }
      // For exchange with net < 0 (return value > exchange value — shop refunds the difference)
      if (data.type === 'exchange' && netAmount < 0 && originalBill.customer_id) {
        const refundAmt = Math.abs(netAmount)
        if (origCreditAmt > 0) {
          const actualReversal = Math.min(refundAmt, origCreditAmt)
          if (actualReversal > 0) {
            db.prepare(
              'UPDATE customers SET current_balance = current_balance - ? WHERE id = ?'
            ).run(actualReversal, originalBill.customer_id)
          }
        } else if (data.refundMode === 'credit') {
          db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?').run(
            refundAmt,
            originalBill.customer_id
          )
        }
      }

      // 6. Create return record
      const returnResult = db
        .prepare(
          `INSERT INTO bill_returns (original_bill_id, new_bill_id, type, reason, return_amount,
         exchange_amount, net_amount, refund_mode, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')`
        )
        .run(
          data.originalBillId,
          newBillId || null,
          data.type,
          data.reason || '',
          Math.round(totalReturnAmount * 100) / 100,
          Math.round(totalExchangeAmount * 100) / 100,
          Math.round(netAmount * 100) / 100,
          data.refundMode
        )
      const returnId = Number(returnResult.lastInsertRowid)

      // 7. Insert return items
      const insertReturnItem = db.prepare(
        `INSERT INTO bill_return_items (return_id, bill_item_id, product_id, product_name,
         original_qty, return_qty, rate, gst_rate, refund_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      for (const ri of data.returnItems) {
        if (ri.returnQty <= 0) continue
        insertReturnItem.run(
          returnId,
          ri.billItemId,
          ri.productId || null,
          ri.productName,
          ri.originalQty,
          ri.returnQty,
          ri.rate,
          ri.gstRate,
          ri.refundAmount
        )
      }

      // 8. Check if FULL return — if all items fully returned, mark original bill as 'returned'
      const allItems = db
        .prepare('SELECT id, qty FROM bill_items WHERE bill_id = ?')
        .all(data.originalBillId) as { id: number; qty: number }[]

      let allFullyReturned = true
      for (const ai of allItems) {
        const totalReturned = db
          .prepare(
            `SELECT COALESCE(SUM(bri.return_qty), 0) as returned
           FROM bill_return_items bri
           JOIN bill_returns br ON bri.return_id = br.id
           WHERE bri.bill_item_id = ? AND br.status = 'completed'`
          )
          .get(ai.id) as { returned: number }
        if (totalReturned.returned < ai.qty) {
          allFullyReturned = false
          break
        }
      }
      if (allFullyReturned) {
        db.prepare("UPDATE bills SET status = 'returned' WHERE id = ?").run(data.originalBillId)
      }

      // 9. Recalculate original bill totals based on remaining (non-returned) quantities
      //    This ensures the invoice reflects current state when reprinted/viewed.
      const billItems = db
        .prepare('SELECT * FROM bill_items WHERE bill_id = ?')
        .all(data.originalBillId) as Record<string, unknown>[]

      let newSubtotal = 0
      let newDiscount = 0
      let newTaxable = 0
      let newCgst = 0
      let newSgst = 0
      let newTotalItems = 0
      let newTotalQty = 0

      for (const bi of billItems) {
        const biId = bi.id as number
        const origQty = bi.qty as number
        const rate = bi.rate as number
        const discType = bi.discount_type as string
        const discValue = bi.discount_value as number
        const cgstRate = bi.cgst_rate as number
        const sgstRate = bi.sgst_rate as number

        // Get total returned for this item across all returns
        const retRow = db
          .prepare(
            `SELECT COALESCE(SUM(bri.return_qty), 0) as returned
           FROM bill_return_items bri
           JOIN bill_returns br ON bri.return_id = br.id
           WHERE bri.bill_item_id = ? AND br.status = 'completed'`
          )
          .get(biId) as { returned: number }
        const returnedQty = retRow.returned
        const effectiveQty = origQty - returnedQty

        if (effectiveQty <= 0) continue // fully returned item

        newTotalItems += 1
        newTotalQty += effectiveQty

        const lineTotal = rate * effectiveQty
        let itemDisc = 0
        if (discType === 'percent' || discType === 'percentage') {
          itemDisc = (lineTotal * discValue) / 100
        } else {
          // Flat discount proportioned by qty
          itemDisc = origQty > 0 ? (discValue / origQty) * effectiveQty : 0
        }
        const itemTaxable = lineTotal - itemDisc
        const itemCgst = (itemTaxable * cgstRate) / 100
        const itemSgst = (itemTaxable * sgstRate) / 100

        newSubtotal += lineTotal
        newDiscount += itemDisc
        newTaxable += itemTaxable
        newCgst += itemCgst
        newSgst += itemSgst
      }

      const newGstAmount = newCgst + newSgst
      const preRound = newTaxable + newGstAmount
      const newGrandTotal = Math.round(preRound)
      const newRoundOff = Math.round((newGrandTotal - preRound) * 100) / 100

      // 10. Recalculate payment breakdown proportionally so dashboard/report
      //     SUM(cash_amount), SUM(upi_amount), etc. stay accurate after returns.
      const origCashAmt = (originalBill.cash_amount as number) || 0
      const origUpiAmt = (originalBill.upi_amount as number) || 0
      const origCardAmt = (originalBill.card_amount as number) || 0
      const origCreditAmtPay = (originalBill.credit_amount as number) || 0
      const totalPayments = origCashAmt + origUpiAmt + origCardAmt + origCreditAmtPay

      let newCashAmt = 0
      let newUpiAmt = 0
      let newCardAmt = 0
      let newCreditAmt = 0

      if (newGrandTotal > 0 && totalPayments > 0) {
        // Distribute newGrandTotal across payment modes in original proportions
        newCashAmt = Math.round(newGrandTotal * (origCashAmt / totalPayments) * 100) / 100
        newUpiAmt = Math.round(newGrandTotal * (origUpiAmt / totalPayments) * 100) / 100
        newCardAmt = Math.round(newGrandTotal * (origCardAmt / totalPayments) * 100) / 100
        // Credit gets remainder so amounts always sum exactly to newGrandTotal
        newCreditAmt = Math.round((newGrandTotal - newCashAmt - newUpiAmt - newCardAmt) * 100) / 100

        // If original had no credit, push any rounding artifact to the largest component
        if (origCreditAmtPay === 0 && newCreditAmt !== 0) {
          if (newCashAmt >= newUpiAmt && newCashAmt >= newCardAmt) {
            newCashAmt = Math.round((newCashAmt + newCreditAmt) * 100) / 100
          } else if (newUpiAmt >= newCardAmt) {
            newUpiAmt = Math.round((newUpiAmt + newCreditAmt) * 100) / 100
          } else {
            newCardAmt = Math.round((newCardAmt + newCreditAmt) * 100) / 100
          }
          newCreditAmt = 0
        }
      }
      // Full return (newGrandTotal === 0): all amounts stay 0

      // After return adjustment cash_tendered = exact cash amount, no excess change
      const newCashTendered = newCashAmt
      const newChangeAmt = 0

      db.prepare(
        `UPDATE bills SET
          subtotal = ?, discount_amount = ?, taxable_amount = ?,
          cgst_amount = ?, sgst_amount = ?, round_off = ?, grand_total = ?,
          total_items = ?, total_qty = ?,
          cash_amount = ?, upi_amount = ?, card_amount = ?, credit_amount = ?,
          cash_tendered = ?, change_amount = ?
         WHERE id = ?`
      ).run(
        Math.round(newSubtotal * 100) / 100,
        Math.round(newDiscount * 100) / 100,
        Math.round(newTaxable * 100) / 100,
        Math.round(newCgst * 100) / 100,
        Math.round(newSgst * 100) / 100,
        newRoundOff,
        newGrandTotal,
        newTotalItems,
        newTotalQty,
        newCashAmt,
        newUpiAmt,
        newCardAmt,
        newCreditAmt,
        newCashTendered,
        newChangeAmt,
        data.originalBillId
      )

      return {
        success: true,
        returnAmount: Math.round(totalReturnAmount * 100) / 100,
        exchangeAmount: Math.round(totalExchangeAmount * 100) / 100,
        netAmount: Math.round(netAmount * 100) / 100,
        newBillId,
        newBillNo
      } as BillReturnResult
    })()

    return result
  }

  /**
   * Get return history for a bill
   */
  getReturnHistory(billId: number): Record<string, unknown>[] {
    const db = getSqlite()
    return db
      .prepare(
        `SELECT br.*, GROUP_CONCAT(bri.product_name || ' x' || bri.return_qty, ', ') as items_summary
       FROM bill_returns br
       LEFT JOIN bill_return_items bri ON bri.return_id = br.id
       WHERE br.original_bill_id = ?
       GROUP BY br.id
       ORDER BY br.created_at DESC`
      )
      .all(billId) as Record<string, unknown>[]
  }

  /**
   * Get already-returned quantities for each bill_item of a given bill
   */
  getReturnedQtyMap(billId: number): Record<number, number> {
    const db = getSqlite()
    const rows = db
      .prepare(
        `SELECT bri.bill_item_id, COALESCE(SUM(bri.return_qty), 0) as returned
       FROM bill_return_items bri
       JOIN bill_returns br ON bri.return_id = br.id
       WHERE br.original_bill_id = ? AND br.status = 'completed'
       GROUP BY bri.bill_item_id`
      )
      .all(billId) as { bill_item_id: number; returned: number }[]

    const map: Record<number, number> = {}
    for (const r of rows) {
      map[r.bill_item_id] = r.returned
    }
    return map
  }
}

export const billRepo = new BillRepository()
