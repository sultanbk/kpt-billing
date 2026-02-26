// ============================================================================
// KPT Billing - Expense Repository
// ============================================================================
import { getSqlite } from '../connection'
import { mapRow, mapRows } from '../utils'
import { getLocalDateString } from '../../../shared/constants'

export interface Expense {
  id: number
  date: string
  category: string
  amount: number
  description: string | null
  paymentMode: string
  createdBy: string | null
  createdAt: string
}

export interface ExpenseCreateData {
  date?: string
  category: string
  amount: number
  description?: string
  paymentMode?: string
}

class ExpenseRepository {
  create(data: ExpenseCreateData): Expense {
    const db = getSqlite()
    const date = data.date || getLocalDateString()
    const result = db
      .prepare(
        `INSERT INTO expenses (date, category, amount, description, payment_mode)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(date, data.category, data.amount, data.description || null, data.paymentMode || 'cash')
    return this.getById(Number(result.lastInsertRowid))!
  }

  getById(id: number): Expense | null {
    const db = getSqlite()
    const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? mapRow<Expense>(row) : null
  }

  getAll(filters: {
    dateFrom?: string
    dateTo?: string
    category?: string
    page?: number
    pageSize?: number
  } = {}): { data: Expense[]; total: number } {
    const db = getSqlite()
    const { dateFrom, dateTo, category, page = 1, pageSize = 50 } = filters

    let where = 'WHERE 1=1'
    const params: unknown[] = []
    if (dateFrom) { where += ' AND date >= ?'; params.push(dateFrom) }
    if (dateTo) { where += ' AND date <= ?'; params.push(dateTo) }
    if (category) { where += ' AND category = ?'; params.push(category) }

    const countResult = db
      .prepare(`SELECT COUNT(*) as total FROM expenses ${where}`)
      .get(...params) as { total: number }

    const offset = (page - 1) * pageSize
    const rows = db
      .prepare(`SELECT * FROM expenses ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset) as Record<string, unknown>[]

    return { data: mapRows<Expense>(rows), total: countResult.total }
  }

  getByDate(date: string): Expense[] {
    const db = getSqlite()
    const rows = db
      .prepare('SELECT * FROM expenses WHERE date = ? ORDER BY id DESC')
      .all(date) as Record<string, unknown>[]
    return mapRows<Expense>(rows)
  }

  update(id: number, data: Partial<ExpenseCreateData>): Expense {
    const db = getSqlite()
    const fields: string[] = []
    const values: unknown[] = []

    if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date) }
    if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category) }
    if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description || null) }
    if (data.paymentMode !== undefined) { fields.push('payment_mode = ?'); values.push(data.paymentMode) }

    if (fields.length === 0) return this.getById(id)!

    values.push(id)
    db.prepare(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.getById(id)!
  }

  delete(id: number): boolean {
    const db = getSqlite()
    const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
    return result.changes > 0
  }

  getCategories(): string[] {
    const db = getSqlite()
    const rows = db
      .prepare('SELECT DISTINCT category FROM expenses ORDER BY category')
      .all() as { category: string }[]
    return rows.map((r) => r.category)
  }

  getSummary(dateFrom: string, dateTo: string): {
    total: number
    byCategory: { category: string; total: number; count: number }[]
    byPaymentMode: { mode: string; total: number }[]
  } {
    const db = getSqlite()

    const totalResult = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM expenses WHERE date >= ? AND date <= ?`
      )
      .get(dateFrom, dateTo) as { total: number }

    const byCategory = db
      .prepare(
        `SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
         FROM expenses WHERE date >= ? AND date <= ?
         GROUP BY category ORDER BY total DESC`
      )
      .all(dateFrom, dateTo) as { category: string; total: number; count: number }[]

    const byPaymentMode = db
      .prepare(
        `SELECT payment_mode as mode, COALESCE(SUM(amount), 0) as total
         FROM expenses WHERE date >= ? AND date <= ?
         GROUP BY payment_mode ORDER BY total DESC`
      )
      .all(dateFrom, dateTo) as { mode: string; total: number }[]

    return { total: totalResult.total, byCategory, byPaymentMode }
  }

  /** Get total expenses for P&L report */
  getTotalForPeriod(dateFrom: string, dateTo: string): number {
    const db = getSqlite()
    const result = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM expenses WHERE date >= ? AND date <= ?`
      )
      .get(dateFrom, dateTo) as { total: number }
    return result.total
  }
}

export const expenseRepo = new ExpenseRepository()
