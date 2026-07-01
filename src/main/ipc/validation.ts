// ============================================================================
// KPT Billing - IPC Input Validation Schemas (Zod)
// Validates all data coming across the IPC boundary before reaching repos
// ============================================================================
import { z } from 'zod'

// ---- Common ----
export const idSchema = z.number().int().positive()
export const optionalIdSchema = z.number().int().positive().optional()
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
export const optionalDateSchema = dateSchema.optional()
export const limitSchema = z.number().int().positive().max(10000).optional()
export const pageSchema = z.number().int().positive().optional()
export const pageSizeSchema = z.number().int().positive().max(500).optional()
export const pinSchema = z.string().min(4).max(20)

// ---- License ----
export const licenseKeySchema = z.string().min(1).max(255)
export const licenseFeatureSchema = z.enum([
  'maxBillsPerMonth',
  'maxProducts',
  'maxCustomers',
  'whatsappIntegration',
  'creditManagement',
  'creditAging',
  'customerAnalytics',
  'expenseTracking',
  'estimates',
  'returnExchange',
  'barcodeLabels',
  'dataExport',
  'googleDriveBackup',
  'auditTrail',
  'profitLossReport',
  'gstReports',
  'multiUser',
  'maxUsers'
])
export const licenseLimitKeySchema = z.enum(['maxBillsPerMonth', 'maxProducts', 'maxCustomers'])
export const licenseCountSchema = z.number().int().min(0)

// ---- Product ----
export const productFormSchema = z.object({
  name: z.string().min(1).max(255),
  shortName: z.string().max(100).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  subCategory: z.string().max(100).optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  hsnCode: z.string().max(20).optional(),
  costPrice: z.number().min(0),
  mrp: z.number().min(0).optional(),
  sellingPrice: z.number().min(0),
  wholesalePrice: z.number().min(0).optional().nullable(),
  gstRate: z.number().min(0).max(100),
  priceIncludesGst: z.boolean().optional(),
  stock: z.number().min(0),
  unit: z.string().max(20).optional().nullable(),
  lowStockThreshold: z.number().min(0).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  size: z.string().max(50).optional().nullable(),
  material: z.string().max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional()
})

export const productFiltersSchema = z
  .object({
    search: z.string().max(200).optional(),
    category: z.string().max(100).optional(),
    categoryId: z.number().int().positive().optional(),
    stockStatus: z.enum(['all', 'low', 'out', 'in']).optional(),
    isActive: z.boolean().optional(),
    page: pageSchema,
    pageSize: pageSizeSchema,
    limit: limitSchema,
    sortBy: z.string().max(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
  .optional()

export const stockAdjustTypeSchema = z.enum(['purchase', 'adjustment', 'damage', 'return'])

export const bulkStockItemSchema = z.object({
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  stock: z.number().min(0)
})

// ---- Customer ----
export const customerFormSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(1).max(20),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  gstin: z.string().max(20).optional().nullable(),
  customerType: z.enum(['regular', 'wholesale', 'walkin']).optional(),
  creditLimit: z.number().min(0).optional().nullable()
})

// ---- Supplier ----
export const supplierFormSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  gstin: z.string().max(20).optional().nullable(),
  bankDetails: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional()
})

// ---- Bill ----
const billItemSchema = z.object({
  id: z.string().optional(),
  productId: z.number().int().positive().nullable().optional(),
  productName: z.string().min(1).max(255),
  sku: z.string().max(50).optional(),
  hsn: z.string().max(20).optional(),
  price: z.number().min(0),
  quantity: z.number().positive(),
  unit: z.string().max(20).optional(),
  discount: z.number().min(0).optional().default(0),
  discountType: z.enum(['percentage', 'amount', 'flat', 'percent']).optional().default('flat'),
  discountAmount: z.number().min(0).optional().default(0),
  gstRate: z.number().min(0).max(100).optional().default(0),
  gstAmount: z.number().min(0).optional().default(0),
  taxableAmount: z.number().min(0).optional().default(0),
  total: z.number().min(0).optional().default(0)
})

const billPaymentSchema = z.object({
  mode: z.enum(['cash', 'upi', 'card', 'credit', 'mixed']),
  amount: z.number().min(0),
  received: z.number().min(0),
  change: z.number().min(0),
  reference: z.string().max(200).optional(),
  cashAmount: z.number().min(0).optional(),
  upiAmount: z.number().min(0).optional(),
  cardAmount: z.number().min(0).optional(),
  creditAmount: z.number().min(0).optional()
})

export const billCreateSchema = z.object({
  customerName: z.string().max(255).optional(),
  customerPhone: z.string().max(20).optional(),
  customerId: z
    .preprocess((val) => {
      if (val === '' || val === undefined || val === null) return null
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        return isNaN(parsed) ? null : parsed
      }
      return val
    }, z.number().int().positive().nullable())
    .optional(),
  items: z.array(billItemSchema).min(1),
  payment: billPaymentSchema,
  discount: z.number().min(0).optional(),
  discountType: z.enum(['percentage', 'amount']).optional(),
  salesmanName: z.string().max(100).optional()
})

export const billFiltersSchema = z
  .object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    status: z.string().max(20).optional(),
    paymentMode: z.string().max(20).optional(),
    search: z.string().max(200).optional(),
    page: pageSchema,
    pageSize: pageSizeSchema,
    limit: limitSchema,
    sortBy: z.string().max(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
  .optional()

// ---- Bill Return / Exchange ----
const returnItemSchema = z.object({
  billItemId: z.number().int().positive(),
  productId: z.number().int().positive().nullable(),
  productName: z.string().min(1).max(255),
  originalQty: z.number().min(0),
  returnQty: z.number().positive(),
  rate: z.number().min(0),
  gstRate: z.number().min(0).max(100),
  refundAmount: z.number().min(0)
})

const exchangeItemSchema = z.object({
  productId: z.number().int().positive().nullable(),
  productName: z.string().min(1).max(255),
  sku: z.string().max(50).optional(),
  hsn: z.string().max(20),
  price: z.number().min(0),
  quantity: z.number().positive(),
  discount: z.number().min(0),
  discountType: z.enum(['percentage', 'amount']),
  gstRate: z.number().min(0).max(100)
})

export const billReturnSchema = z.object({
  originalBillId: z.number().int().positive(),
  type: z.enum(['return', 'exchange']),
  reason: z.string().min(1).max(500),
  returnItems: z.array(returnItemSchema).min(1),
  exchangeItems: z.array(exchangeItemSchema).default([]),
  refundMode: z.enum(['cash', 'credit', 'adjust'])
})

// ---- Purchase ----
const purchaseItemSchema = z.object({
  id: z.number().int().positive().optional(),
  purchaseId: z.number().int().positive().optional(),
  productId: z.number().int().positive().nullable(),
  productName: z.string().min(1).max(255),
  barcode: z.string().max(50).optional().nullable(),
  hsnCode: z.string().max(20).optional().nullable(),
  qty: z.number().positive(),
  purchaseRate: z.number().min(0),
  sellingRate: z.number().min(0),
  mrp: z.number().min(0),
  gstRate: z.number().min(0).max(100),
  gstAmount: z.number().min(0),
  amount: z.number().min(0)
})

export const purchaseCreateSchema = z
  .object({
    supplierId: z.number().int().positive().optional(),
    supplierName: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    invoiceNo: z.string().max(100).optional(),
    invoiceDate: dateSchema.optional(),
    paymentMode: z.enum(['cash', 'upi', 'card', 'cheque']).optional(),
    paymentStatus: z.enum(['paid', 'partial', 'unpaid']).optional(),
    amountPaid: z.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
    items: z.array(purchaseItemSchema).min(1)
  })
  .superRefine((data, ctx) => {
    const grandTotal = data.items.reduce((sum, item) => {
      const lineTotal = item.purchaseRate * item.qty
      return sum + lineTotal + (lineTotal * item.gstRate) / 100
    }, 0)
    const amountPaid = data.amountPaid ?? 0

    if (amountPaid > grandTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amountPaid'],
        message: 'Amount paid cannot exceed purchase total'
      })
    }

    if (data.paymentStatus === 'unpaid' && amountPaid > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amountPaid'],
        message: 'Unpaid purchases cannot have an amount paid'
      })
    }
  })

export const purchaseFiltersSchema = z
  .object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    supplierId: z.number().int().positive().optional(),
    page: pageSchema,
    pageSize: pageSizeSchema,
    search: z.string().max(200).optional()
  })
  .optional()

// ---- Credit Payment ----
export const creditPaymentSchema = z.object({
  customerId: z.number().int().positive(),
  amount: z.number().positive(),
  paymentMode: z.enum(['cash', 'upi', 'card', 'cheque', 'bank_transfer']),
  referenceNo: z.string().max(200).optional(),
  billId: z.number().int().positive().optional(),
  notes: z.string().max(500).optional()
})

export const creditFiltersSchema = z
  .object({
    customerId: z.number().int().positive().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: pageSchema,
    pageSize: pageSizeSchema
  })
  .optional()

// ---- Expense ----
export const expenseFormSchema = z.object({
  date: dateSchema,
  category: z.string().min(1).max(100),
  amount: z.number().positive(),
  description: z.string().max(500).optional().nullable(),
  paymentMode: z.string().max(20).optional()
})

export const expenseFiltersSchema = z
  .object({
    dateFrom: optionalDateSchema,
    dateTo: optionalDateSchema,
    category: z.string().max(100).optional(),
    page: pageSchema,
    pageSize: pageSizeSchema
  })
  .optional()
  .default({})

// ---- Held Bill ----
export const holdBillDataSchema = z.object({
  customerName: z.string().max(255).optional(),
  customerPhone: z.string().max(20).optional(),
  items: z.string() // JSON string
})

// ---- Settings ----
export const settingsKeySchema = z.string().min(1).max(100)
export const settingsValueSchema = z.string().max(10000)
export const settingsManySchema = z.record(z.string().max(100), z.string().max(10000))

// ---- Search ----
export const searchTermSchema = z.string().max(200)

// ---- Validation helper ----
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}
