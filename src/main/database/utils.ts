// ============================================================================
// KPT Billing - Database Utility Functions
// ============================================================================

/**
 * Convert a snake_case DB row to camelCase + apply column renames
 * e.g. { purchase_price: 100, current_stock: 5 } → { purchasePrice: 100, costPrice: 100, currentStock: 5, stock: 5 }
 */

// Mapping from snake_case DB column to camelCase TS property
const COLUMN_ALIASES: Record<string, string | string[]> = {
  // Products
  purchase_price: ['purchasePrice', 'costPrice'],
  current_stock: ['currentStock', 'stock'],
  low_stock_alert: ['lowStockAlert', 'lowStockThreshold'],
  opening_stock: 'openingStock',
  category_id: 'categoryId',
  category_name: ['categoryName', 'category'],
  sub_category: 'subCategory',
  short_name: 'shortName',
  hsn_code: ['hsnCode', 'hsn'],
  selling_price: 'sellingPrice',
  wholesale_price: 'wholesalePrice',
  gst_rate: 'gstRate',
  image_path: 'imagePath',
  is_active: 'isActive',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  supplier_id: 'supplierId',
  price_includes_gst: 'priceIncludesGst',

  // Bills
  bill_no: ['billNo', 'billNumber'],
  customer_id: 'customerId',
  customer_name: 'customerName',
  customer_phone: 'customerPhone',
  discount_amount: 'discountAmount',
  taxable_amount: 'taxableAmount',
  cgst_amount: 'cgstAmount',
  sgst_amount: 'sgstAmount',
  igst_amount: 'igstAmount',
  round_off: 'roundOff',
  grand_total: 'grandTotal',
  payment_mode: 'paymentMode',
  cash_amount: 'cashAmount',
  upi_amount: 'upiAmount',
  card_amount: 'cardAmount',
  credit_amount: 'creditAmount',
  upi_reference: 'upiReference',
  cash_tendered: 'cashTendered',
  change_amount: 'changeAmount',
  salesman_name: 'salesmanName',
  total_items: 'totalItems',
  total_qty: 'totalQty',
  created_by: 'createdBy',

  // Bill items
  bill_id: 'billId',
  product_id: 'productId',
  product_name: 'productName',
  qty: 'quantity',
  rate: 'price',
  amount: 'total',
  discount_type: 'discountType',
  discount_value: ['discountValue', 'discount'],
  cgst_rate: 'cgstRate',
  sgst_rate: 'sgstRate',

  // Customers
  customer_type: 'customerType',
  credit_limit: 'creditLimit',
  opening_balance: 'openingBalance',
  current_balance: 'currentBalance',

  // Stock ledger
  reference_type: 'referenceType',
  reference_id: 'referenceId',

  // Categories
  parent_id: 'parentId',

  // Credit payments
  balance_before: 'balanceBefore',
  balance_after: 'balanceAfter',
  reference_no: 'referenceNo',

  // Purchases
  purchase_no: 'purchaseNo',
  invoice_no: 'invoiceNo',
  invoice_date: 'invoiceDate',
  purchase_rate: 'purchaseRate',
  selling_rate: 'sellingRate',
  payment_status: 'paymentStatus',
  amount_paid: 'amountPaid',
  bank_details: 'bankDetails',
  purchase_id: 'purchaseId'
}

/**
 * Map a single database row's snake_case keys to camelCase properties
 */
export function mapRow<T>(row: Record<string, unknown>): T {
  if (!row) return row as T
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(row)) {
    // Always keep original key
    result[key] = value

    // Apply alias mappings
    const alias = COLUMN_ALIASES[key]
    if (alias) {
      if (Array.isArray(alias)) {
        for (const a of alias) {
          result[a] = value
        }
      } else {
        result[alias] = value
      }
    } else {
      // Auto-convert snake_case to camelCase for unmapped keys
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      if (camel !== key) {
        result[camel] = camel in result ? result[camel] : value
      }
    }
  }

  // Special: map is_active from 0/1 to boolean
  if ('is_active' in row) {
    result['isActive'] = row['is_active'] === 1 || row['is_active'] === true
  }

  // Special: map price_includes_gst from 0/1 to boolean
  if ('price_includes_gst' in row) {
    result['priceIncludesGst'] =
      row['price_includes_gst'] === 1 || row['price_includes_gst'] === true
  }

  // Special: compute gstAmount from cgst + sgst for bills
  if ('cgst_amount' in row && 'sgst_amount' in row) {
    result['gstAmount'] =
      ((row['cgst_amount'] as number) || 0) + ((row['sgst_amount'] as number) || 0)
  }

  return result as T
}

/**
 * Map an array of database rows
 */
export function mapRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => mapRow<T>(r))
}
