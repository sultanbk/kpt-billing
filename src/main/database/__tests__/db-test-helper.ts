/**
 * Database Test Helper
 *
 * Creates an in-memory SQLite database with the same schema as production.
 * Used by repository tests to test against real SQL without touching disk.
 */
import Database from 'better-sqlite3'
import { DEFAULT_SETTINGS, DEFAULT_CATEGORIES } from '../../../shared/constants'
import { createHash } from 'crypto'

/**
 * Extract the migration SQL from connection.ts logic.
 * We replicate the CREATE TABLE statements here so tests don't depend on Electron's `app` module.
 */
const MIGRATION_SQL = `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_name TEXT,
      sku TEXT NOT NULL UNIQUE,
      barcode TEXT,
      category_id INTEGER REFERENCES categories(id),
      sub_category TEXT,
      brand TEXT,
      hsn_code TEXT NOT NULL DEFAULT '5007',
      purchase_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      wholesale_price REAL,
      gst_rate REAL NOT NULL DEFAULT 5,
      opening_stock INTEGER NOT NULL DEFAULT 0,
      current_stock INTEGER NOT NULL DEFAULT 0,
      low_stock_alert INTEGER,
      location TEXT,
      supplier_id INTEGER,
      color TEXT,
      size TEXT,
      material TEXT,
      notes TEXT,
      image_path TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT,
      address TEXT,
      city TEXT,
      gstin TEXT,
      customer_type TEXT NOT NULL DEFAULT 'regular',
      credit_limit REAL,
      opening_balance REAL NOT NULL DEFAULT 0,
      current_balance REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_no TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT,
      customer_phone TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      taxable_amount REAL NOT NULL DEFAULT 0,
      cgst_amount REAL NOT NULL DEFAULT 0,
      sgst_amount REAL NOT NULL DEFAULT 0,
      igst_amount REAL NOT NULL DEFAULT 0,
      round_off REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      payment_mode TEXT NOT NULL DEFAULT 'cash',
      cash_amount REAL NOT NULL DEFAULT 0,
      upi_amount REAL NOT NULL DEFAULT 0,
      card_amount REAL NOT NULL DEFAULT 0,
      credit_amount REAL NOT NULL DEFAULT 0,
      upi_reference TEXT,
      cash_tendered REAL NOT NULL DEFAULT 0,
      change_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed',
      salesman_name TEXT,
      total_items INTEGER NOT NULL DEFAULT 0,
      total_qty INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL REFERENCES bills(id),
      product_id INTEGER,
      product_name TEXT NOT NULL,
      hsn_code TEXT NOT NULL DEFAULT '',
      qty INTEGER NOT NULL DEFAULT 1,
      rate REAL NOT NULL DEFAULT 0,
      discount_type TEXT NOT NULL DEFAULT 'flat',
      discount_value REAL NOT NULL DEFAULT 0,
      taxable_amount REAL NOT NULL DEFAULT 0,
      cgst_rate REAL NOT NULL DEFAULT 0,
      cgst_amount REAL NOT NULL DEFAULT 0,
      sgst_rate REAL NOT NULL DEFAULT 0,
      sgst_amount REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stock_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      type TEXT NOT NULL,
      qty INTEGER NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pin TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS held_bills (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      customer_phone TEXT,
      items_json TEXT NOT NULL,
      held_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS bill_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_bill_id INTEGER NOT NULL REFERENCES bills(id),
      new_bill_id INTEGER REFERENCES bills(id),
      type TEXT NOT NULL DEFAULT 'return',
      reason TEXT,
      return_amount REAL NOT NULL DEFAULT 0,
      exchange_amount REAL NOT NULL DEFAULT 0,
      net_amount REAL NOT NULL DEFAULT 0,
      refund_mode TEXT NOT NULL DEFAULT 'cash',
      status TEXT NOT NULL DEFAULT 'completed',
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS bill_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL REFERENCES bill_returns(id),
      bill_item_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      original_qty INTEGER NOT NULL DEFAULT 0,
      return_qty INTEGER NOT NULL DEFAULT 0,
      rate REAL NOT NULL DEFAULT 0,
      gst_rate REAL NOT NULL DEFAULT 0,
      refund_amount REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      gstin TEXT,
      bank_details TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_no TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id),
      supplier_name TEXT,
      city TEXT,
      invoice_no TEXT,
      invoice_date TEXT,
      total_items INTEGER NOT NULL DEFAULT 0,
      total_qty INTEGER NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      gst_amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      payment_mode TEXT NOT NULL DEFAULT 'cash',
      payment_status TEXT NOT NULL DEFAULT 'paid',
      amount_paid REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id),
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      barcode TEXT,
      hsn_code TEXT,
      qty INTEGER NOT NULL DEFAULT 1,
      purchase_rate REAL NOT NULL DEFAULT 0,
      selling_rate REAL NOT NULL DEFAULT 0,
      mrp REAL NOT NULL DEFAULT 0,
      gst_rate REAL NOT NULL DEFAULT 0,
      gst_amount REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS credit_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      date TEXT NOT NULL DEFAULT (date('now','localtime')),
      amount REAL NOT NULL DEFAULT 0,
      payment_mode TEXT NOT NULL DEFAULT 'cash',
      reference_no TEXT,
      balance_before REAL NOT NULL DEFAULT 0,
      balance_after REAL NOT NULL DEFAULT 0,
      bill_id INTEGER REFERENCES bills(id),
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      payment_mode TEXT NOT NULL DEFAULT 'cash',
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS estimates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estimate_no TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      valid_days INTEGER NOT NULL DEFAULT 15,
      status TEXT NOT NULL DEFAULT 'active',
      converted_bill_id INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS estimate_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estimate_id INTEGER NOT NULL REFERENCES estimates(id),
      product_id INTEGER,
      product_name TEXT NOT NULL,
      hsn_code TEXT NOT NULL DEFAULT '',
      qty INTEGER NOT NULL DEFAULT 1,
      rate REAL NOT NULL DEFAULT 0,
      discount_value REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      field_name TEXT NOT NULL,
      old_value REAL NOT NULL DEFAULT 0,
      new_value REAL NOT NULL DEFAULT 0,
      changed_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
`

/**
 * Create a fresh in-memory SQLite database with full schema.
 * Each call returns a new isolated database.
 */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Run schema migration
  db.exec(MIGRATION_SQL)

  return db
}

/**
 * Create a test DB and seed it with minimal default data
 * (categories, settings, a default user).
 */
export function createSeededTestDb(): Database.Database {
  const db = createTestDb()

  // Seed categories
  const insertCat = db.prepare('INSERT INTO categories (name) VALUES (?)')
  for (const cat of DEFAULT_CATEGORIES) {
    insertCat.run(cat)
  }

  // Seed settings
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    insertSetting.run(key, value)
  }
  // Also seed bill number sequence
  insertSetting.run('lastBillNumber', '0')

  // Seed default user
  const hashedPin = createHash('sha256').update('1234').digest('hex')
  db.prepare('INSERT INTO users (name, pin, role) VALUES (?, ?, ?)').run(
    'TestUser',
    hashedPin,
    'owner'
  )

  return db
}

/**
 * Insert a test product into the database and return its ID.
 */
export function insertTestProduct(
  db: Database.Database,
  overrides: Partial<{
    name: string
    sku: string
    barcode: string
    categoryId: number
    hsnCode: string
    purchasePrice: number
    sellingPrice: number
    gstRate: number
    stock: number
    isActive: number
  }> = {}
): number {
  const result = db
    .prepare(
      `INSERT INTO products (name, sku, barcode, category_id, hsn_code, purchase_price, selling_price, gst_rate, opening_stock, current_stock, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      overrides.name ?? 'Test Saree',
      overrides.sku ?? `KPT-TST-${Date.now()}`,
      overrides.barcode ?? null,
      overrides.categoryId ?? 1,
      overrides.hsnCode ?? '5007',
      overrides.purchasePrice ?? 500,
      overrides.sellingPrice ?? 1000,
      overrides.gstRate ?? 5,
      overrides.stock ?? 10,
      overrides.stock ?? 10,
      overrides.isActive ?? 1
    )
  return Number(result.lastInsertRowid)
}

/**
 * Insert a test customer and return their ID.
 */
export function insertTestCustomer(
  db: Database.Database,
  overrides: Partial<{
    name: string
    phone: string
    customerType: string
    creditLimit: number
    currentBalance: number
  }> = {}
): number {
  const result = db
    .prepare(
      `INSERT INTO customers (name, phone, customer_type, credit_limit, current_balance)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      overrides.name ?? 'Test Customer',
      overrides.phone ?? `9${Date.now().toString().slice(-9)}`,
      overrides.customerType ?? 'regular',
      overrides.creditLimit ?? null,
      overrides.currentBalance ?? 0
    )
  return Number(result.lastInsertRowid)
}

/**
 * Insert a test supplier and return their ID.
 */
export function insertTestSupplier(
  db: Database.Database,
  overrides: Partial<{
    name: string
    phone: string
    city: string
  }> = {}
): number {
  const result = db
    .prepare(
      `INSERT INTO suppliers (name, phone, city)
       VALUES (?, ?, ?)`
    )
    .run(
      overrides.name ?? 'Test Supplier',
      overrides.phone ?? '9876543210',
      overrides.city ?? 'Hubli'
    )
  return Number(result.lastInsertRowid)
}
