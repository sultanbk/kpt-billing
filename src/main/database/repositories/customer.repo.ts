// ============================================================================
// KPT Billing - Customer Repository
// ============================================================================
import { getSqlite } from '../connection'
import { mapRow, mapRows } from '../utils'
import type { Customer } from '../../../shared/types'

export class CustomerRepository {
  search(term: string, limit: number = 20): Customer[] {
    const db = getSqlite()
    const searchTerm = `%${term}%`
    const rows = db
      .prepare(
        `SELECT * FROM customers
         WHERE is_active = 1 AND (name LIKE ? OR phone LIKE ?)
         ORDER BY name LIMIT ?`
      )
      .all(searchTerm, searchTerm, limit) as Record<string, unknown>[]
    return mapRows<Customer>(rows)
  }

  getAll(): Customer[] {
    const db = getSqlite()
    return mapRows<Customer>(db.prepare('SELECT * FROM customers WHERE is_active = 1 ORDER BY name').all() as Record<string, unknown>[])
  }

  getById(id: number): Customer | null {
    const db = getSqlite()
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? mapRow<Customer>(row) : null
  }

  getByPhone(phone: string): Customer | null {
    const db = getSqlite()
    const row = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone) as Record<string, unknown> | undefined
    return row ? mapRow<Customer>(row) : null
  }

  create(data: {
    name: string
    phone: string
    email?: string
    address?: string
    city?: string
    gstin?: string
    customerType?: string
    creditLimit?: number
  }): Customer {
    const db = getSqlite()
    const result = db
      .prepare(
        `INSERT INTO customers (name, phone, email, address, city, gstin, customer_type, credit_limit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.name,
        data.phone,
        data.email || null,
        data.address || null,
        data.city || null,
        data.gstin || null,
        data.customerType || 'regular',
        data.creditLimit || null
      )
    return this.getById(Number(result.lastInsertRowid))!
  }

  update(
    id: number,
    data: Partial<{
      name: string
      phone: string
      email: string
      address: string
      city: string
      gstin: string
      customerType: string
      creditLimit: number
    }>
  ): Customer {
    const db = getSqlite()
    const fields: string[] = []
    const values: unknown[] = []

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone) }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email) }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address) }
    if (data.city !== undefined) { fields.push('city = ?'); values.push(data.city) }
    if (data.gstin !== undefined) { fields.push('gstin = ?'); values.push(data.gstin) }
    if (data.customerType !== undefined) { fields.push('customer_type = ?'); values.push(data.customerType) }
    if (data.creditLimit !== undefined) { fields.push('credit_limit = ?'); values.push(data.creditLimit) }

    if (fields.length === 0) return this.getById(id)!

    fields.push("updated_at = datetime('now','localtime')")
    values.push(id)

    db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.getById(id)!
  }

  getWithCredit(): Customer[] {
    const db = getSqlite()
    const rows = db
      .prepare(
        'SELECT * FROM customers WHERE current_balance > 0 AND is_active = 1 ORDER BY current_balance DESC'
      )
      .all() as Record<string, unknown>[]
    return mapRows<Customer>(rows)
  }

  getTotalCredit(): number {
    const db = getSqlite()
    const result = db
      .prepare('SELECT COALESCE(SUM(current_balance), 0) as total FROM customers WHERE current_balance > 0')
      .get() as { total: number }
    return result.total
  }

  // ---- Customer Analytics ----

  /**
   * Top customers by revenue with purchase frequency
   */
  getTopCustomersByRevenue(limit: number = 20): Record<string, unknown>[] {
    const db = getSqlite()
    return db
      .prepare(
        `SELECT
           c.id, c.name, c.phone, c.customer_type, c.current_balance, c.credit_limit,
           COUNT(b.id) as total_bills,
           COALESCE(SUM(b.grand_total), 0) as total_revenue,
           COALESCE(AVG(b.grand_total), 0) as avg_bill_value,
           MAX(b.date) as last_purchase_date,
           MIN(b.date) as first_purchase_date,
           COALESCE(SUM(b.total_qty), 0) as total_items_bought
         FROM customers c
         LEFT JOIN bills b ON b.customer_id = c.id AND b.status = 'completed'
         WHERE c.is_active = 1
         GROUP BY c.id
         ORDER BY total_revenue DESC
         LIMIT ?`
      )
      .all(limit) as Record<string, unknown>[]
  }

  /**
   * Customer purchase frequency analysis
   */
  getCustomerFrequency(): Record<string, unknown>[] {
    const db = getSqlite()
    return db
      .prepare(
        `SELECT
           c.id, c.name, c.phone, c.customer_type,
           COUNT(b.id) as total_bills,
           COALESCE(SUM(b.grand_total), 0) as total_revenue,
           MAX(b.date) as last_purchase_date,
           CAST(julianday('now','localtime') - julianday(MAX(b.date)) AS INTEGER) as days_since_last_purchase,
           CASE
             WHEN COUNT(b.id) >= 2 THEN
               CAST((julianday(MAX(b.date)) - julianday(MIN(b.date))) / (COUNT(b.id) - 1) AS INTEGER)
             ELSE NULL
           END as avg_days_between_purchases
         FROM customers c
         LEFT JOIN bills b ON b.customer_id = c.id AND b.status = 'completed'
         WHERE c.is_active = 1
         GROUP BY c.id
         HAVING total_bills > 0
         ORDER BY total_bills DESC`
      )
      .all() as Record<string, unknown>[]
  }

  /**
   * Credit risk scoring — customers with credit, scored by risk factors
   */
  getCreditRiskScoring(): Record<string, unknown>[] {
    const db = getSqlite()
    return db
      .prepare(
        `SELECT
           c.id, c.name, c.phone, c.customer_type,
           c.current_balance, c.credit_limit,
           COUNT(b.id) as total_credit_bills,
           COALESCE(SUM(b.credit_amount), 0) as total_credit_taken,
           MAX(b.date) as last_credit_date,
           CAST(julianday('now','localtime') - julianday(MAX(b.date)) AS INTEGER) as days_since_last_credit,
           (SELECT COALESCE(SUM(cp.amount), 0) FROM credit_payments cp WHERE cp.customer_id = c.id) as total_payments_made,
           (SELECT COUNT(*) FROM credit_payments cp WHERE cp.customer_id = c.id) as payment_count,
           (SELECT MAX(cp.date) FROM credit_payments cp WHERE cp.customer_id = c.id) as last_payment_date,
           CASE
             WHEN c.credit_limit > 0 THEN ROUND(c.current_balance * 100.0 / c.credit_limit, 1)
             ELSE 0
           END as credit_utilization_pct,
           CASE
             WHEN c.current_balance <= 0 THEN 'none'
             WHEN CAST(julianday('now','localtime') - julianday(COALESCE(
               (SELECT MAX(cp.date) FROM credit_payments cp WHERE cp.customer_id = c.id),
               MAX(b.date)
             )) AS INTEGER) > 90 THEN 'high'
             WHEN CAST(julianday('now','localtime') - julianday(COALESCE(
               (SELECT MAX(cp.date) FROM credit_payments cp WHERE cp.customer_id = c.id),
               MAX(b.date)
             )) AS INTEGER) > 60 THEN 'medium'
             WHEN c.credit_limit > 0 AND c.current_balance > c.credit_limit * 0.8 THEN 'medium'
             ELSE 'low'
           END as risk_level
         FROM customers c
         LEFT JOIN bills b ON b.customer_id = c.id AND b.status = 'completed' AND b.credit_amount > 0
         WHERE c.is_active = 1 AND c.current_balance > 0
         GROUP BY c.id
         ORDER BY c.current_balance DESC`
      )
      .all() as Record<string, unknown>[]
  }

  // ---- Credit Aging Report ----

  /**
   * Get credit aging breakdown: current, 30, 60, 90+ days
   */
  getCreditAging(): Record<string, unknown>[] {
    const db = getSqlite()
    // For each customer with credit, find the oldest unpaid bill dates
    // and classify into aging buckets
    return db
      .prepare(
        `WITH customer_credit AS (
           SELECT
             c.id, c.name, c.phone, c.customer_type,
             c.current_balance, c.credit_limit,
             (SELECT MAX(b2.date) FROM bills b2
              WHERE b2.customer_id = c.id AND b2.credit_amount > 0 AND b2.status = 'completed') as last_credit_date,
             (SELECT MIN(b3.date) FROM bills b3
              WHERE b3.customer_id = c.id AND b3.credit_amount > 0 AND b3.status = 'completed') as first_credit_date,
             (SELECT MAX(cp.date) FROM credit_payments cp WHERE cp.customer_id = c.id) as last_payment_date
           FROM customers c
           WHERE c.is_active = 1 AND c.current_balance > 0
         )
         SELECT
           cc.*,
           CAST(julianday('now','localtime') - julianday(COALESCE(cc.last_payment_date, cc.first_credit_date)) AS INTEGER) as days_overdue,
           CASE
             WHEN CAST(julianday('now','localtime') - julianday(COALESCE(cc.last_payment_date, cc.first_credit_date)) AS INTEGER) <= 30 THEN 'current'
             WHEN CAST(julianday('now','localtime') - julianday(COALESCE(cc.last_payment_date, cc.first_credit_date)) AS INTEGER) <= 60 THEN '31-60'
             WHEN CAST(julianday('now','localtime') - julianday(COALESCE(cc.last_payment_date, cc.first_credit_date)) AS INTEGER) <= 90 THEN '61-90'
             ELSE '90+'
           END as aging_bucket
         FROM customer_credit cc
         ORDER BY cc.current_balance DESC`
      )
      .all() as Record<string, unknown>[]
  }

  /**
   * Credit aging summary — totals per bucket
   */
  getCreditAgingSummary(): Record<string, unknown> {
    const db = getSqlite()
    return db
      .prepare(
        `WITH customer_aging AS (
           SELECT
             c.current_balance,
             CAST(julianday('now','localtime') - julianday(
               COALESCE(
                 (SELECT MAX(cp.date) FROM credit_payments cp WHERE cp.customer_id = c.id),
                 (SELECT MIN(b.date) FROM bills b WHERE b.customer_id = c.id AND b.credit_amount > 0 AND b.status = 'completed')
               )
             ) AS INTEGER) as days_overdue
           FROM customers c
           WHERE c.is_active = 1 AND c.current_balance > 0
         )
         SELECT
           COUNT(*) as total_customers,
           COALESCE(SUM(current_balance), 0) as total_outstanding,
           COALESCE(SUM(CASE WHEN days_overdue <= 30 THEN current_balance ELSE 0 END), 0) as current_amount,
           COALESCE(SUM(CASE WHEN days_overdue > 30 AND days_overdue <= 60 THEN current_balance ELSE 0 END), 0) as days_31_60,
           COALESCE(SUM(CASE WHEN days_overdue > 60 AND days_overdue <= 90 THEN current_balance ELSE 0 END), 0) as days_61_90,
           COALESCE(SUM(CASE WHEN days_overdue > 90 THEN current_balance ELSE 0 END), 0) as days_90_plus,
           COUNT(CASE WHEN days_overdue <= 30 THEN 1 END) as current_count,
           COUNT(CASE WHEN days_overdue > 30 AND days_overdue <= 60 THEN 1 END) as count_31_60,
           COUNT(CASE WHEN days_overdue > 60 AND days_overdue <= 90 THEN 1 END) as count_61_90,
           COUNT(CASE WHEN days_overdue > 90 THEN 1 END) as count_90_plus
         FROM customer_aging`
      )
      .get() as Record<string, unknown>
  }
}

export const customerRepo = new CustomerRepository()
