// ============================================================================
// KPT Billing - Category Repository
// ============================================================================
import { getSqlite } from '../connection'
import { mapRow, mapRows } from '../utils'
import type { Category } from '../../../shared/types'

export class CategoryRepository {
  getAll(): Category[] {
    const db = getSqlite()
    return mapRows<Category>(
      db.prepare('SELECT * FROM categories ORDER BY name').all() as Record<string, unknown>[]
    )
  }

  getById(id: number): Category | null {
    const db = getSqlite()
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined
    return row ? mapRow<Category>(row) : null
  }

  create(name: string, parentId?: number): Category {
    const db = getSqlite()
    const result = db
      .prepare('INSERT INTO categories (name, parent_id) VALUES (?, ?)')
      .run(name, parentId || null)
    return this.getById(Number(result.lastInsertRowid))!
  }

  update(id: number, name: string): Category {
    const db = getSqlite()
    db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id)
    return this.getById(id)!
  }

  delete(id: number): void {
    const db = getSqlite()
    // Only delete if no products reference this category
    const productCount = db
      .prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?')
      .get(id) as { count: number }
    if (productCount.count > 0) {
      throw new Error('Cannot delete category with existing products')
    }
    // Only delete if no child categories reference this category
    const childCount = db
      .prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?')
      .get(id) as { count: number }
    if (childCount.count > 0) {
      throw new Error('Cannot delete category with child categories')
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  }
}

export const categoryRepo = new CategoryRepository()
