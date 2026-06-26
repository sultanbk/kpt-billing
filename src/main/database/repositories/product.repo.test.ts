import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createSeededTestDb, insertTestProduct } from '../__tests__/db-test-helper'

let testDb: Database.Database

vi.mock('../connection', () => ({
  getSqlite: () => testDb,
  getDb: () => null
}))

const { ProductRepository } = await import('./product.repo')

describe('ProductRepository', () => {
  let repo: InstanceType<typeof ProductRepository>

  beforeEach(() => {
    testDb = createSeededTestDb()
    repo = new ProductRepository()
  })

  describe('create', () => {
    it('creates a product with auto-generated SKU', () => {
      const product = repo.create({
        name: 'Banarasi Silk Saree',
        hsnCode: '5007',
        costPrice: 2000,
        sellingPrice: 3500,
        gstRate: 5,
        stock: 15,
        categoryId: 1
      })

      expect(product).toBeDefined()
      expect(product.name).toBe('Banarasi Silk Saree')
      expect(product.sellingPrice).toBe(3500)
      expect(product.costPrice).toBe(2000)
      expect(product.gstRate).toBe(5)
      expect(product.stock).toBe(15)
      expect(product.sku).toMatch(/^KPT-/) // auto-generated
      expect(product.isActive).toBe(true)
    })

    it('records opening stock in ledger', () => {
      const product = repo.create({
        name: 'Test Product',
        hsnCode: '5007',
        costPrice: 100,
        sellingPrice: 200,
        gstRate: 5,
        stock: 25
      })

      const ledger = testDb
        .prepare('SELECT * FROM stock_ledger WHERE product_id = ?')
        .all(product.id)
      expect(ledger).toHaveLength(1)
      expect((ledger[0] as Record<string, unknown>).type).toBe('opening')
      expect((ledger[0] as Record<string, unknown>).qty).toBe(25)
    })

    it('does not record ledger entry for zero stock', () => {
      const product = repo.create({
        name: 'Zero Stock',
        hsnCode: '5007',
        costPrice: 100,
        sellingPrice: 200,
        gstRate: 5,
        stock: 0
      })

      const ledger = testDb
        .prepare('SELECT * FROM stock_ledger WHERE product_id = ?')
        .all(product.id)
      expect(ledger).toHaveLength(0)
    })
  })

  describe('getById', () => {
    it('returns product with category name', () => {
      const id = insertTestProduct(testDb, {
        name: 'Silk Saree',
        sku: 'KPT-SLK-001',
        categoryId: 1
      })
      const product = repo.getById(id)
      expect(product).not.toBeNull()
      expect(product!.name).toBe('Silk Saree')
      expect(product!.categoryName).toBeTruthy()
    })

    it('returns null for non-existent id', () => {
      expect(repo.getById(99999)).toBeNull()
    })
  })

  describe('search', () => {
    it('finds products by name', () => {
      insertTestProduct(testDb, { name: 'Cotton Saree', sku: 'KPT-COT-001' })
      insertTestProduct(testDb, { name: 'Silk Dupatta', sku: 'KPT-SLK-002' })

      const results = repo.search('cotton')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toBe('Cotton Saree')
    })

    it('finds products by SKU', () => {
      insertTestProduct(testDb, { name: 'Test A', sku: 'KPT-UNIQUE-001' })

      const results = repo.search('UNIQUE')
      expect(results.length).toBe(1)
    })

    it('finds products by barcode exact match', () => {
      insertTestProduct(testDb, {
        name: 'Barcode Product',
        sku: 'KPT-BAR-001',
        barcode: '1234567890'
      })

      const results = repo.search('1234567890')
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Barcode Product')
    })

    it('returns empty array for no matches', () => {
      const results = repo.search('xyznonexistent')
      expect(results).toEqual([])
    })
  })

  describe('getByBarcode', () => {
    it('returns product by barcode', () => {
      insertTestProduct(testDb, {
        name: 'Barcode Test',
        sku: 'KPT-BC-001',
        barcode: '9876543210'
      })

      const product = repo.getByBarcode('9876543210')
      expect(product).not.toBeNull()
      expect(product!.name).toBe('Barcode Test')
    })

    it('returns null for inactive product', () => {
      insertTestProduct(testDb, {
        name: 'Inactive',
        sku: 'KPT-INA-001',
        barcode: '1111111111',
        isActive: 0
      })

      expect(repo.getByBarcode('1111111111')).toBeNull()
    })
  })

  describe('getAll', () => {
    it('returns paginated results', () => {
      for (let i = 0; i < 5; i++) {
        insertTestProduct(testDb, { name: `Product ${i}`, sku: `KPT-ALL-${i}` })
      }

      const result = repo.getAll({ page: 1, pageSize: 3 })
      expect(result.data).toHaveLength(3)
      expect(result.total).toBe(5)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(3)
    })

    it('filters by category', () => {
      insertTestProduct(testDb, { name: 'Cat1 Product', sku: 'KPT-C1-001', categoryId: 1 })
      insertTestProduct(testDb, { name: 'Cat2 Product', sku: 'KPT-C2-001', categoryId: 2 })

      const result = repo.getAll({ categoryId: 1 })
      expect(result.data.every((p) => p.categoryId === 1)).toBe(true)
    })

    it('filters by search term', () => {
      insertTestProduct(testDb, { name: 'Findable', sku: 'KPT-FND-001' })
      insertTestProduct(testDb, { name: 'Hidden', sku: 'KPT-HID-001' })

      const result = repo.getAll({ search: 'Findable' })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Findable')
    })

    it('excludes inactive products by default', () => {
      const activeId = insertTestProduct(testDb, { name: 'Visible', sku: 'KPT-ACT-001' })
      const inactiveId = insertTestProduct(testDb, {
        name: 'Deleted',
        sku: 'KPT-DEL-001',
        isActive: 0
      })

      const result = repo.getAll()

      expect(result.data.map((p) => p.id)).toContain(activeId)
      expect(result.data.map((p) => p.id)).not.toContain(inactiveId)
    })

    it('returns inactive products when explicitly requested', () => {
      insertTestProduct(testDb, { name: 'Visible', sku: 'KPT-ACT-001' })
      const inactiveId = insertTestProduct(testDb, {
        name: 'Deleted',
        sku: 'KPT-DEL-001',
        isActive: 0
      })

      const result = repo.getAll({ isActive: false })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe(inactiveId)
      expect(result.data[0].isActive).toBe(false)
    })
  })
})
