// ============================================================================
// KPT Billing - Database Connection
// ============================================================================
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { randomBytes, scryptSync } from 'crypto'
import * as schema from './schema'
import { DEFAULT_SETTINGS, DEFAULT_CATEGORIES } from '../../shared/constants'
import log from 'electron-log'

let db: ReturnType<typeof drizzle>
let sqlite: Database.Database

export function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
  return join(dbDir, 'kpt_billing.db')
}

export function getBackupDir(): string {
  const userDataPath = app.getPath('userData')
  const backupDir = join(userDataPath, 'backups')
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
  }
  return backupDir
}

export function initializeDatabase(): ReturnType<typeof drizzle> {
  const dbPath = getDbPath()
  log.info(`Initializing database at: ${dbPath}`)

  sqlite = new Database(dbPath)

  // Performance pragmas
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('synchronous = NORMAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('busy_timeout = 5000')
  sqlite.pragma('cache_size = -20000') // 20MB cache
  sqlite.pragma('temp_store = MEMORY')

  db = drizzle(sqlite, { schema })

  // Run migrations (create tables if not exist)
  runMigrations(sqlite)

  // Seed default data
  seedDefaults(sqlite)

  log.info('Database initialized successfully')
  return db
}

function runMigrations(sqlite: Database.Database): void {
  log.info('Running database migrations...')

  sqlite.exec(`
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
      mrp REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      wholesale_price REAL,
      gst_rate REAL NOT NULL DEFAULT 5,
      price_includes_gst INTEGER NOT NULL DEFAULT 0,
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
      salt TEXT,
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

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date);
    CREATE INDEX IF NOT EXISTS idx_bills_bill_no ON bills(bill_no);
    CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_id);
    CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
    CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
    CREATE INDEX IF NOT EXISTS idx_stock_ledger_product ON stock_ledger(product_id);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
    CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
    CREATE INDEX IF NOT EXISTS idx_credit_payments_customer ON credit_payments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_credit_payments_date ON credit_payments(date);

    -- Price History table
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      field_name TEXT NOT NULL,
      old_value REAL NOT NULL DEFAULT 0,
      new_value REAL NOT NULL DEFAULT 0,
      changed_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(created_at);

    -- Return-related indexes for performance
    CREATE INDEX IF NOT EXISTS idx_bill_returns_original ON bill_returns(original_bill_id);
    CREATE INDEX IF NOT EXISTS idx_bill_return_items_return ON bill_return_items(return_id);
    CREATE INDEX IF NOT EXISTS idx_bill_return_items_bill_item ON bill_return_items(bill_item_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);
  `)

  // ---- Versioned Migrations ----
  // Each migration runs exactly once, tracked by the schema_migrations table.
  // To add a new migration post-launch, append an entry to the migrations array.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `)

  const migrations: { version: number; name: string; up: () => void }[] = [
    {
      version: 1,
      name: 'add_supplier_city_product_mrp_gst_user_salt',
      up: () => {
        // Suppliers: add city
        const supplierCols = sqlite.pragma('table_info(suppliers)') as { name: string }[]
        if (!supplierCols.find((c) => c.name === 'city')) {
          sqlite.exec('ALTER TABLE suppliers ADD COLUMN city TEXT')
        }
        // Products: add mrp, price_includes_gst
        const productCols = sqlite.pragma('table_info(products)') as { name: string }[]
        if (!productCols.find((c) => c.name === 'mrp')) {
          sqlite.exec('ALTER TABLE products ADD COLUMN mrp REAL NOT NULL DEFAULT 0')
        }
        if (!productCols.find((c) => c.name === 'price_includes_gst')) {
          sqlite.exec(
            'ALTER TABLE products ADD COLUMN price_includes_gst INTEGER NOT NULL DEFAULT 0'
          )
        }
        // Users: add salt
        const userCols = sqlite.pragma('table_info(users)') as { name: string }[]
        if (!userCols.find((c) => c.name === 'salt')) {
          sqlite.exec('ALTER TABLE users ADD COLUMN salt TEXT')
        }
      }
    }
    // Future migrations go here:
    // { version: 2, name: 'description_of_change', up: () => { ... } }
  ]

  const applied = new Set(
    (sqlite.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map(
      (r) => r.version
    )
  )

  const insertMigration = sqlite.prepare(
    'INSERT INTO schema_migrations (version, name) VALUES (?, ?)'
  )

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue
    try {
      log.info(`Running migration v${migration.version}: ${migration.name}`)
      migration.up()
      insertMigration.run(migration.version, migration.name)
      log.info(`Migration v${migration.version} completed`)
    } catch (err) {
      log.error(`Migration v${migration.version} failed:`, err)
    }
  }

  log.info(
    `Migrations completed (${migrations.length} defined, ${applied.size} previously applied)`
  )
}

function seedDefaults(sqlite: Database.Database): void {
  // Seed categories if empty
  const catCount = sqlite.prepare('SELECT COUNT(*) as count FROM categories').get() as {
    count: number
  }
  if (catCount.count === 0) {
    log.info('Seeding default categories...')
    const insert = sqlite.prepare('INSERT INTO categories (name) VALUES (?)')
    for (const cat of DEFAULT_CATEGORIES) {
      insert.run(cat)
    }
  }

  // Seed settings if empty
  const settingsCount = sqlite.prepare('SELECT COUNT(*) as count FROM settings').get() as {
    count: number
  }
  if (settingsCount.count === 0) {
    log.info('Seeding default settings...')
    const insert = sqlite.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insert.run(key, value)
    }
  }

  // Seed default owner user if no users exist
  const userCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as {
    count: number
  }
  if (userCount.count === 0) {
    log.info('Seeding default owner user...')
    // Default PIN: 1234 (users should change this)
    const salt = randomBytes(16).toString('hex')
    const hashedPin = `scrypt:${scryptSync('1234', salt, 64).toString('hex')}`
    sqlite
      .prepare('INSERT INTO users (name, pin, salt, role) VALUES (?, ?, ?, ?)')
      .run('Puneet', hashedPin, salt, 'owner')
  }

  // Seed bill number sequence
  const billSeq = sqlite
    .prepare("SELECT value FROM settings WHERE key = 'lastBillNumber'")
    .get() as { value: string } | undefined
  if (!billSeq) {
    sqlite.prepare("INSERT INTO settings (key, value) VALUES ('lastBillNumber', '0')").run()
  }
}

export function getDb(): ReturnType<typeof drizzle> {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
  }
  return db
}

export function getSqlite(): Database.Database {
  if (!sqlite) {
    throw new Error('SQLite not initialized. Call initializeDatabase() first.')
  }
  return sqlite
}

export function closeDatabase(): void {
  if (sqlite) {
    log.info('Closing database...')
    sqlite.close()
  }
}
