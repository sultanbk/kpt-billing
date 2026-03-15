// ============================================================================
// KPT Billing - Credit Payment Repository
// Tracks credit clearance payments from customers
// ============================================================================
import { getSqlite } from '../connection'
import { mapRow, mapRows } from '../utils'
import type {
  CreditPayment,
  CreditPaymentCreateData,
  CreditLedgerEntry
} from '../../../shared/types'
import { getLocalDateString } from '../../../shared/constants'

export class CreditPaymentRepository {
  /**
   * Record a credit payment — deducts from customer's current_balance
   */
  recordPayment(data: CreditPaymentCreateData): CreditPayment {
    const db = getSqlite()

    const txn = db.transaction(() => {
      // 1. Get customer's current balance
      const customer = db
        .prepare('SELECT id, current_balance FROM customers WHERE id = ?')
        .get(data.customerId) as { id: number; current_balance: number } | undefined

      if (!customer) throw new Error('Customer not found')

      const balanceBefore = customer.current_balance
      if (balanceBefore <= 0) throw new Error('Customer has no outstanding credit')
      if (data.amount <= 0) throw new Error('Payment amount must be positive')
      if (data.amount > balanceBefore) {
        throw new Error(`Payment ₹${data.amount} exceeds outstanding balance ₹${balanceBefore}`)
      }

      const balanceAfter = Math.round((balanceBefore - data.amount) * 100) / 100
      const today = getLocalDateString()

      // 2. Insert credit_payments record
      const result = db
        .prepare(
          `INSERT INTO credit_payments
           (customer_id, date, amount, payment_mode, reference_no, balance_before, balance_after, bill_id, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.customerId,
          today,
          data.amount,
          data.paymentMode || 'cash',
          data.referenceNo || null,
          balanceBefore,
          balanceAfter,
          data.billId || null,
          data.notes || null
        )

      // 3. Update customer balance
      db.prepare(
        "UPDATE customers SET current_balance = ?, updated_at = datetime('now','localtime') WHERE id = ?"
      ).run(balanceAfter, data.customerId)

      return Number(result.lastInsertRowid)
    })

    const paymentId = txn()
    return this.getById(paymentId)!
  }

  getById(id: number): CreditPayment | null {
    const db = getSqlite()
    const row = db
      .prepare(
        `SELECT cp.*, c.name AS customer_name, c.phone AS customer_phone
         FROM credit_payments cp
         JOIN customers c ON c.id = cp.customer_id
         WHERE cp.id = ?`
      )
      .get(id) as Record<string, unknown> | undefined
    return row ? mapRow<CreditPayment>(row) : null
  }

  /**
   * Get all payments for a specific customer, newest first
   */
  getByCustomer(customerId: number, limit: number = 50): CreditPayment[] {
    const db = getSqlite()
    const rows = db
      .prepare(
        `SELECT cp.*, c.name AS customer_name, c.phone AS customer_phone
         FROM credit_payments cp
         JOIN customers c ON c.id = cp.customer_id
         WHERE cp.customer_id = ?
         ORDER BY cp.created_at DESC LIMIT ?`
      )
      .all(customerId, limit) as Record<string, unknown>[]
    return mapRows<CreditPayment>(rows)
  }

  /**
   * Get all payments optionally filtered by date range, newest first
   */
  getAll(filters?: {
    dateFrom?: string
    dateTo?: string
    customerId?: number
    paymentMode?: string
    page?: number
    pageSize?: number
  }): { data: CreditPayment[]; total: number } {
    const db = getSqlite()
    const wheres: string[] = []
    const params: unknown[] = []

    if (filters?.dateFrom) {
      wheres.push('cp.date >= ?')
      params.push(filters.dateFrom)
    }
    if (filters?.dateTo) {
      wheres.push('cp.date <= ?')
      params.push(filters.dateTo)
    }
    if (filters?.customerId) {
      wheres.push('cp.customer_id = ?')
      params.push(filters.customerId)
    }
    if (filters?.paymentMode) {
      wheres.push('cp.payment_mode = ?')
      params.push(filters.paymentMode)
    }

    const whereClause = wheres.length ? `WHERE ${wheres.join(' AND ')}` : ''
    const page = filters?.page || 1
    const pageSize = filters?.pageSize || 50

    const countResult = db
      .prepare(`SELECT COUNT(*) as total FROM credit_payments cp ${whereClause}`)
      .get(...params) as { total: number }

    const rows = db
      .prepare(
        `SELECT cp.*, c.name AS customer_name, c.phone AS customer_phone
         FROM credit_payments cp
         JOIN customers c ON c.id = cp.customer_id
         ${whereClause}
         ORDER BY cp.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as Record<string, unknown>[]

    return {
      data: mapRows<CreditPayment>(rows),
      total: countResult.total
    }
  }

  /**
   * Build a full credit ledger for a customer — combines credit (from bills)
   * and payments into a single chronological list
   */
  getCreditLedger(customerId: number): CreditLedgerEntry[] {
    const db = getSqlite()

    // Credit entries from bills
    const billCredits = db
      .prepare(
        `SELECT b.id, b.date, b.bill_no, b.credit_amount, b.payment_mode
         FROM bills b
         WHERE b.customer_id = ? AND b.credit_amount > 0 AND b.status = 'completed'
         ORDER BY b.created_at ASC`
      )
      .all(customerId) as {
      id: number
      date: string
      bill_no: string
      credit_amount: number
      payment_mode: string
    }[]

    // Payment entries
    const payments = db
      .prepare(
        `SELECT id, date, amount, payment_mode, reference_no, balance_before, balance_after, notes
         FROM credit_payments
         WHERE customer_id = ?
         ORDER BY created_at ASC`
      )
      .all(customerId) as {
      id: number
      date: string
      amount: number
      payment_mode: string
      reference_no: string | null
      balance_before: number
      balance_after: number
      notes: string | null
    }[]

    // Merge and sort chronologically
    const entries: CreditLedgerEntry[] = []

    for (const bc of billCredits) {
      entries.push({
        id: bc.id,
        date: bc.date,
        type: 'credit',
        description: `Bill ${bc.bill_no}`,
        billNo: bc.bill_no,
        amount: bc.credit_amount,
        balance: 0, // will be recomputed
        paymentMode: bc.payment_mode
      })
    }

    for (const p of payments) {
      entries.push({
        id: p.id + 1000000, // offset to avoid id collision with bills
        date: p.date,
        type: 'payment',
        description: p.notes || 'Credit Payment',
        amount: p.amount,
        balance: 0,
        paymentMode: p.payment_mode,
        referenceNo: p.reference_no || undefined
      })
    }

    // Sort by date
    entries.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)

    // Get customer opening balance
    const customer = db
      .prepare('SELECT opening_balance FROM customers WHERE id = ?')
      .get(customerId) as { opening_balance: number } | undefined
    const openingBalance = customer?.opening_balance || 0

    // Compute running balance starting from opening balance
    let balance = openingBalance
    if (openingBalance > 0) {
      entries.unshift({
        id: 0,
        date: '',
        type: 'credit',
        description: 'Opening Balance',
        amount: openingBalance,
        balance: openingBalance,
        paymentMode: ''
      })
    }
    // Recompute balances for non-opening entries
    for (const entry of entries) {
      if (entry.id === 0) continue // skip opening balance, already set
      if (entry.type === 'credit') {
        balance += entry.amount
      } else {
        balance -= entry.amount
      }
      entry.balance = Math.round(balance * 100) / 100
    }

    return entries
  }

  /**
   * Summary of credit collections for a date range
   */
  getCollectionSummary(
    dateFrom: string,
    dateTo: string
  ): {
    totalCollected: number
    totalPayments: number
    byCash: number
    byUpi: number
    byCard: number
    byCheque: number
    byBankTransfer: number
  } {
    const db = getSqlite()
    const result = db
      .prepare(
        `SELECT
           COUNT(*) as total_payments,
           COALESCE(SUM(amount), 0) as total_collected,
           COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN amount END), 0) as by_cash,
           COALESCE(SUM(CASE WHEN payment_mode = 'upi' THEN amount END), 0) as by_upi,
           COALESCE(SUM(CASE WHEN payment_mode = 'card' THEN amount END), 0) as by_card,
           COALESCE(SUM(CASE WHEN payment_mode = 'cheque' THEN amount END), 0) as by_cheque,
           COALESCE(SUM(CASE WHEN payment_mode = 'bank_transfer' THEN amount END), 0) as by_bank_transfer
         FROM credit_payments
         WHERE date >= ? AND date <= ?`
      )
      .get(dateFrom, dateTo) as Record<string, number>

    return {
      totalCollected: result.total_collected,
      totalPayments: result.total_payments,
      byCash: result.by_cash,
      byUpi: result.by_upi,
      byCard: result.by_card,
      byCheque: result.by_cheque,
      byBankTransfer: result.by_bank_transfer
    }
  }

  /**
   * Delete a payment (reverse the balance change)
   */
  deletePayment(id: number): boolean {
    const db = getSqlite()
    const txn = db.transaction(() => {
      const payment = db.prepare('SELECT * FROM credit_payments WHERE id = ?').get(id) as
        | Record<string, unknown>
        | undefined
      if (!payment) throw new Error('Payment not found')

      // Restore customer balance
      db.prepare(
        "UPDATE customers SET current_balance = current_balance + ?, updated_at = datetime('now','localtime') WHERE id = ?"
      ).run(payment.amount, payment.customer_id)

      db.prepare('DELETE FROM credit_payments WHERE id = ?').run(id)
    })
    txn()
    return true
  }
}

export const creditPaymentRepo = new CreditPaymentRepository()
