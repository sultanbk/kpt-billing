import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createSeededTestDb } from '../__tests__/db-test-helper'

let testDb: Database.Database

vi.mock('../connection', () => ({
  getSqlite: () => testDb,
  getDb: () => null
}))

const { CategoryRepository } = await import('./category.repo')

describe('CategoryRepository', () => {
  let repo: InstanceType<typeof CategoryRepository>

  beforeEach(() => {
    testDb = createSeededTestDb()
    repo = new CategoryRepository()
  })

  describe('getAll', () => {
    it('returns all default categories', () => {
      const categories = repo.getAll()
      expect(categories.length).toBeGreaterThan(0)
      const names = categories.map((c) => c.name)
      expect(names).toContain('Saree')
      expect(names).toContain('Fabric')
      expect(names).toContain('Other')
    })
  })

  describe('getById', () => {
    it('returns a category by id', () => {
      const all = repo.getAll()
      const cat = repo.getById(all[0].id)
      expect(cat).not.toBeNull()
      expect(cat!.name).toBe(all[0].name)
    })

    it('returns null for non-existent id', () => {
      expect(repo.getById(9999)).toBeNull()
    })
  })

  describe('create', () => {
    it('creates a new category', () => {
      const cat = repo.create('Silk Special')
      expect(cat.name).toBe('Silk Special')
      expect(cat.id).toBeGreaterThan(0)
    })

    it('creates a category with parent', () => {
      const parent = repo.getAll()[0]
      const child = repo.create('Sub Category', parent.id)
      expect(child.name).toBe('Sub Category')
      expect(child.parentId).toBe(parent.id)
    })
  })

  describe('update', () => {
    it('updates category name', () => {
      const all = repo.getAll()
      const updated = repo.update(all[0].id, 'Updated Name')
      expect(updated.name).toBe('Updated Name')
    })
  })

  describe('delete', () => {
    it('deletes a category with no products', () => {
      const cat = repo.create('ToDelete')
      expect(() => repo.delete(cat.id)).not.toThrow()
      expect(repo.getById(cat.id)).toBeNull()
    })

    it('throws when deleting category with products', () => {
      const cats = repo.getAll()
      const catId = cats[0].id

      // Insert a product referencing this category
      testDb
        .prepare(
          `INSERT INTO products (name, sku, category_id, hsn_code, selling_price, gst_rate)
           VALUES ('Test', 'SKU-001', ?, '5007', 100, 5)`
        )
        .run(catId)

      expect(() => repo.delete(catId)).toThrow('Cannot delete category with existing products')
    })
  })
})
