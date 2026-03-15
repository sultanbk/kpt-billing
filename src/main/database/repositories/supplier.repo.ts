// ============================================================================
// KPT Billing - Supplier Repository
// ============================================================================
import { getSqlite } from '../connection'
import { mapRow, mapRows } from '../utils'
import type { Supplier, SupplierFormData } from '../../../shared/types'

export class SupplierRepository {
  getAll(activeOnly = true): Supplier[] {
    const db = getSqlite()
    const where = activeOnly ? 'WHERE is_active = 1' : ''
    const rows = db.prepare(`SELECT * FROM suppliers ${where} ORDER BY name`).all()
    return mapRows<Supplier>(rows as Record<string, unknown>[])
  }

  getById(id: number): Supplier | null {
    const db = getSqlite()
    const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined
    return row ? mapRow<Supplier>(row) : null
  }

  search(term: string): Supplier[] {
    const db = getSqlite()
    const s = `%${term}%`
    const rows = db
      .prepare(
        `SELECT * FROM suppliers
         WHERE is_active = 1 AND (name LIKE ? OR phone LIKE ? OR city LIKE ? OR gstin LIKE ?)
         ORDER BY name LIMIT 20`
      )
      .all(s, s, s, s)
    return mapRows<Supplier>(rows as Record<string, unknown>[])
  }

  create(data: SupplierFormData): Supplier {
    const db = getSqlite()
    const result = db
      .prepare(
        `INSERT INTO suppliers (name, phone, email, address, city, gstin, bank_details, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.name,
        data.phone || null,
        data.email || null,
        data.address || null,
        data.city || null,
        data.gstin || null,
        data.bankDetails || null,
        data.isActive !== false ? 1 : 0
      )
    return this.getById(Number(result.lastInsertRowid))!
  }

  update(id: number, data: Partial<SupplierFormData>): Supplier {
    const db = getSqlite()
    const fields: string[] = []
    const values: unknown[] = []

    if (data.name !== undefined) {
      fields.push('name = ?')
      values.push(data.name)
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?')
      values.push(data.phone || null)
    }
    if (data.email !== undefined) {
      fields.push('email = ?')
      values.push(data.email || null)
    }
    if (data.address !== undefined) {
      fields.push('address = ?')
      values.push(data.address || null)
    }
    if (data.city !== undefined) {
      fields.push('city = ?')
      values.push(data.city || null)
    }
    if (data.gstin !== undefined) {
      fields.push('gstin = ?')
      values.push(data.gstin || null)
    }
    if (data.bankDetails !== undefined) {
      fields.push('bank_details = ?')
      values.push(data.bankDetails || null)
    }
    if (data.isActive !== undefined) {
      fields.push('is_active = ?')
      values.push(data.isActive ? 1 : 0)
    }

    if (fields.length === 0) return this.getById(id)!
    values.push(id)

    db.prepare(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.getById(id)!
  }

  delete(id: number): void {
    const db = getSqlite()
    db.prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?').run(id)
  }

  getCities(): string[] {
    const db = getSqlite()
    const rows = db
      .prepare(
        `SELECT DISTINCT city FROM suppliers WHERE city IS NOT NULL AND city != '' AND is_active = 1 ORDER BY city`
      )
      .all() as { city: string }[]
    return rows.map((r) => r.city)
  }
}

export const supplierRepo = new SupplierRepository()
