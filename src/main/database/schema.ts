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
  mrp: real('mrp').notNull().default(0),
  sellingPrice: real('selling_price').notNull().default(0),
  wholesalePrice: real('wholesale_price'),
  gstRate: real('gst_rate').notNull().default(5),
  priceIncludesGst: integer('price_includes_gst', { mode: 'boolean' }).notNull().default(false),
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
  salt: text('salt'),
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
  city: text('city'),
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

// ---- Bill Returns ----
export const billReturns = sqliteTable('bill_returns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  originalBillId: integer('original_bill_id')
    .notNull()
    .references(() => bills.id),
  newBillId: integer('new_bill_id').references(() => bills.id),
  type: text('type').notNull().default('return'),
  reason: text('reason'),
  returnAmount: real('return_amount').notNull().default(0),
  exchangeAmount: real('exchange_amount').notNull().default(0),
  netAmount: real('net_amount').notNull().default(0),
  refundMode: text('refund_mode').notNull().default('cash'),
  status: text('status').notNull().default('completed'),
  createdBy: text('created_by'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Bill Return Items ----
export const billReturnItems = sqliteTable('bill_return_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  returnId: integer('return_id')
    .notNull()
    .references(() => billReturns.id),
  billItemId: integer('bill_item_id').notNull(),
  productId: integer('product_id'),
  productName: text('product_name').notNull(),
  originalQty: integer('original_qty').notNull().default(0),
  returnQty: integer('return_qty').notNull().default(0),
  rate: real('rate').notNull().default(0),
  gstRate: real('gst_rate').notNull().default(0),
  refundAmount: real('refund_amount').notNull().default(0)
})

// ---- Purchases ----
export const purchases = sqliteTable('purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchaseNo: text('purchase_no').notNull().unique(),
  date: text('date').notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  supplierName: text('supplier_name'),
  city: text('city'),
  invoiceNo: text('invoice_no'),
  invoiceDate: text('invoice_date'),
  totalItems: integer('total_items').notNull().default(0),
  totalQty: integer('total_qty').notNull().default(0),
  subtotal: real('subtotal').notNull().default(0),
  gstAmount: real('gst_amount').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  grandTotal: real('grand_total').notNull().default(0),
  paymentMode: text('payment_mode').notNull().default('cash'),
  paymentStatus: text('payment_status').notNull().default('paid'),
  amountPaid: real('amount_paid').notNull().default(0),
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Purchase Items ----
export const purchaseItems = sqliteTable('purchase_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchaseId: integer('purchase_id')
    .notNull()
    .references(() => purchases.id),
  productId: integer('product_id').references(() => products.id),
  productName: text('product_name').notNull(),
  barcode: text('barcode'),
  hsnCode: text('hsn_code'),
  qty: integer('qty').notNull().default(1),
  purchaseRate: real('purchase_rate').notNull().default(0),
  sellingRate: real('selling_rate').notNull().default(0),
  mrp: real('mrp').notNull().default(0),
  gstRate: real('gst_rate').notNull().default(0),
  gstAmount: real('gst_amount').notNull().default(0),
  amount: real('amount').notNull().default(0)
})

// ---- Credit Payments ----
export const creditPayments = sqliteTable('credit_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id),
  date: text('date')
    .notNull()
    .default(sql`(date('now','localtime'))`),
  amount: real('amount').notNull().default(0),
  paymentMode: text('payment_mode').notNull().default('cash'),
  referenceNo: text('reference_no'),
  balanceBefore: real('balance_before').notNull().default(0),
  balanceAfter: real('balance_after').notNull().default(0),
  billId: integer('bill_id').references(() => bills.id),
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ---- Price History ----
export const priceHistory = sqliteTable('price_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  fieldName: text('field_name').notNull(),
  oldValue: real('old_value').notNull().default(0),
  newValue: real('new_value').notNull().default(0),
  changedBy: text('changed_by'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})
