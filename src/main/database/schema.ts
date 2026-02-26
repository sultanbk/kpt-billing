// ============================================================================
// KPT Billing - Database Schema (Drizzle ORM)
// ============================================================================
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ---- Settings (key-value store) ----
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Categories ----
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Products ----
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  shortName: text('short_name'),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode'),
  categoryId: integer('category_id').references(() => categories.id),
  subCategory: text('sub_category'),
  brand: text('brand'),
  hsnCode: text('hsn_code').notNull().default('5007'),
  purchasePrice: real('purchase_price').notNull().default(0),
  sellingPrice: real('selling_price').notNull().default(0),
  wholesalePrice: real('wholesale_price'),
  gstRate: real('gst_rate').notNull().default(5),
  openingStock: integer('opening_stock').notNull().default(0),
  currentStock: integer('current_stock').notNull().default(0),
  lowStockAlert: integer('low_stock_alert'),
  location: text('location'),
  supplierId: integer('supplier_id'),
  color: text('color'),
  size: text('size'),
  material: text('material'),
  notes: text('notes'),
  imagePath: text('image_path'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Customers ----
export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  gstin: text('gstin'),
  customerType: text('customer_type').notNull().default('regular'), // regular, wholesale, walkin
  creditLimit: real('credit_limit'),
  openingBalance: real('opening_balance').notNull().default(0),
  currentBalance: real('current_balance').notNull().default(0), // positive = customer owes
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Bills ----
export const bills = sqliteTable('bills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  billNo: text('bill_no').notNull().unique(),
  date: text('date').notNull(), // YYYY-MM-DD
  time: text('time').notNull(), // HH:mm:ss
  customerId: integer('customer_id').references(() => customers.id),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  subtotal: real('subtotal').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  taxableAmount: real('taxable_amount').notNull().default(0),
  cgstAmount: real('cgst_amount').notNull().default(0),
  sgstAmount: real('sgst_amount').notNull().default(0),
  igstAmount: real('igst_amount').notNull().default(0),
  roundOff: real('round_off').notNull().default(0),
  grandTotal: real('grand_total').notNull().default(0),
  paymentMode: text('payment_mode').notNull().default('cash'),
  cashAmount: real('cash_amount').notNull().default(0),
  upiAmount: real('upi_amount').notNull().default(0),
  cardAmount: real('card_amount').notNull().default(0),
  creditAmount: real('credit_amount').notNull().default(0),
  upiReference: text('upi_reference'),
  cashTendered: real('cash_tendered').notNull().default(0),
  changeAmount: real('change_amount').notNull().default(0),
  status: text('status').notNull().default('completed'), // completed, returned, cancelled
  salesmanName: text('salesman_name'),
  totalItems: integer('total_items').notNull().default(0),
  totalQty: integer('total_qty').notNull().default(0),
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Bill Items ----
export const billItems = sqliteTable('bill_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  billId: integer('bill_id')
    .notNull()
    .references(() => bills.id),
  productId: integer('product_id'),
  productName: text('product_name').notNull(),
  hsnCode: text('hsn_code').notNull().default(''),
  qty: integer('qty').notNull().default(1),
  rate: real('rate').notNull().default(0),
  discountType: text('discount_type').notNull().default('flat'), // flat, percent
  discountValue: real('discount_value').notNull().default(0),
  taxableAmount: real('taxable_amount').notNull().default(0),
  cgstRate: real('cgst_rate').notNull().default(0),
  cgstAmount: real('cgst_amount').notNull().default(0),
  sgstRate: real('sgst_rate').notNull().default(0),
  sgstAmount: real('sgst_amount').notNull().default(0),
  amount: real('amount').notNull().default(0)
})

// ---- Stock Ledger ----
export const stockLedger = sqliteTable('stock_ledger', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  type: text('type').notNull(), // sale, purchase, adjustment, return, opening, damage
  qty: integer('qty').notNull(), // positive for in, negative for out
  referenceType: text('reference_type'), // bill, purchase, manual
  referenceId: integer('reference_id'),
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Users ----
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  pin: text('pin').notNull(), // hashed PIN
  role: text('role').notNull().default('cashier'), // owner, manager, cashier
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Audit Log ----
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id'),
  userName: text('user_name'),
  action: text('action').notNull(), // create, update, delete, print, login, etc.
  entityType: text('entity_type').notNull(), // product, bill, customer, settings, etc.
  entityId: integer('entity_id'),
  oldValue: text('old_value'), // JSON
  newValue: text('new_value'), // JSON
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Held Bills (for parking) ----
export const heldBills = sqliteTable('held_bills', {
  id: text('id').primaryKey(), // UUID
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  itemsJson: text('items_json').notNull(), // JSON serialized bill items
  heldAt: text('held_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Suppliers ----
export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  gstin: text('gstin'),
  bankDetails: text('bank_details'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Expenses ----
export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  description: text('description'),
  paymentMode: text('payment_mode').notNull().default('cash'),
  createdBy: text('created_by'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Estimates ----
export const estimates = sqliteTable('estimates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  estimateNo: text('estimate_no').notNull().unique(),
  date: text('date').notNull(),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  subtotal: real('subtotal').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  grandTotal: real('grand_total').notNull().default(0),
  validDays: integer('valid_days').notNull().default(15),
  status: text('status').notNull().default('active'), // active, converted, expired
  convertedBillId: integer('converted_bill_id'),
  notes: text('notes'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

export const estimateItems = sqliteTable('estimate_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  estimateId: integer('estimate_id')
    .notNull()
    .references(() => estimates.id),
  productId: integer('product_id'),
  productName: text('product_name').notNull(),
  hsnCode: text('hsn_code').notNull().default(''),
  qty: integer('qty').notNull().default(1),
  rate: real('rate').notNull().default(0),
  discountValue: real('discount_value').notNull().default(0),
  amount: real('amount').notNull().default(0)
})
