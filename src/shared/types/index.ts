// ============================================================================
// KPT Billing - Shared Types
// ============================================================================

// ---- Suppliers ----
export interface Supplier {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  gstin: string | null
  bankDetails: string | null
  isActive: boolean
  createdAt: string
}

export interface SupplierFormData {
  name: string
  phone?: string
  email?: string
  address?: string
  city?: string
  gstin?: string
  bankDetails?: string
  isActive?: boolean
}

// ---- Purchases (Stock-In) ----
export interface Purchase {
  id: number
  purchaseNo: string
  date: string
  supplierId: number | null
  supplierName: string | null
  city: string | null
  invoiceNo: string | null
  invoiceDate: string | null
  totalItems: number
  totalQty: number
  subtotal: number
  gstAmount: number
  discountAmount: number
  grandTotal: number
  paymentMode: string
  paymentStatus: string
  amountPaid: number
  notes: string | null
  createdBy: string | null
  createdAt: string
  items?: PurchaseItem[]
}

export interface PurchaseItem {
  id?: number
  purchaseId?: number
  productId: number | null
  productName: string
  barcode: string | null
  hsnCode: string | null
  qty: number
  purchaseRate: number
  sellingRate: number
  mrp: number
  gstRate: number
  gstAmount: number
  amount: number
}

export interface PurchaseCreateData {
  supplierId?: number
  supplierName?: string
  city?: string
  invoiceNo?: string
  invoiceDate?: string
  paymentMode?: string
  paymentStatus?: string
  amountPaid?: number
  notes?: string
  items: PurchaseItem[]
}

// ---- Categories ----
export interface Category {
  id: number
  name: string
  parentId: number | null
  createdAt: string
}

// ---- Products ----
export interface Product {
  id: number
  name: string
  shortName: string | null
  sku: string
  barcode: string | null
  category: string | null
  categoryId: number | null
  categoryName?: string
  subCategory: string | null
  brand: string | null
  hsnCode: string
  costPrice: number
  mrp?: number
  sellingPrice: number
  wholesalePrice: number | null
  gstRate: number // 0, 5, 12, 18, 28
  priceIncludesGst: boolean // true = prices are GST-inclusive
  stock: number
  lowStockThreshold: number | null
  unit: string | null
  location: string | null
  supplierId: number | null
  color: string | null
  size: string | null
  material: string | null
  description: string | null
  imagePath: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductFormData {
  name: string
  shortName?: string
  barcode?: string
  category?: string
  categoryId?: number
  subCategory?: string
  brand?: string
  hsnCode?: string
  costPrice: number
  mrp?: number
  sellingPrice: number
  wholesalePrice?: number
  gstRate: number
  priceIncludesGst?: boolean
  stock: number
  unit?: string
  lowStockThreshold?: number
  location?: string
  color?: string
  size?: string
  material?: string
  description?: string
  isActive?: boolean
}

export type ProductLabelSize = '46x25' | '60x40'

export interface ProductLabelPrintRequest {
  productId: number
  quantity: number
  printerName?: string
  labelSize?: ProductLabelSize
}

export interface ProductLabelPrintResult {
  success: boolean
  printerName: string
  quantity: number
  labelSize: ProductLabelSize
  barcodeValue: string
}

// ---- Billing ----
export interface BillItem {
  id: string
  productId: number | null
  productName: string
  sku?: string
  hsn: string
  price: number
  quantity: number
  unit?: string
  discount: number
  discountType: 'percentage' | 'amount' | 'flat' | 'percent'
  discountAmount: number
  gstRate: number
  gstAmount: number
  cgstRate?: number
  sgstRate?: number
  taxableAmount: number
  total: number
  /** Quantity already returned for this line item (populated by getById) */
  returnedQty?: number
  stock?: number
}

export interface BillPayment {
  mode: 'cash' | 'upi' | 'card' | 'credit' | 'mixed'
  amount: number
  received: number
  change: number
  reference?: string
  cashAmount?: number
  upiAmount?: number
  cardAmount?: number
  creditAmount?: number
}

export interface Bill {
  id: number
  billNumber: string
  billNo?: string
  date: string
  time: string
  customerName: string | null
  customerPhone: string | null
  customerId: number | null
  subtotal: number
  discountAmount: number
  taxableAmount: number
  gstAmount: number
  cgstAmount?: number
  sgstAmount?: number
  igstAmount?: number
  roundOff: number
  grandTotal: number
  paymentMode: string
  cashAmount: number
  upiAmount: number
  cardAmount: number
  creditAmount: number
  upiReference: string | null
  cashTendered: number
  changeAmount: number
  status: 'completed' | 'returned' | 'cancelled'
  salesmanName: string | null
  totalItems: number
  totalQty: number
  notes?: string | null
  createdBy: string | null
  createdAt: string
  items?: BillItem[]
  /** Return/exchange history for this bill (populated by getById) */
  returns?: BillReturnInfo[]
}

/** Summary of a return/exchange for display in bill detail */
export interface BillReturnInfo {
  id: number
  type: 'return' | 'exchange'
  reason: string
  returnAmount: number
  exchangeAmount: number
  netAmount: number
  refundMode: string
  newBillId: number | null
  newBillNo: string | null
  createdAt: string
  itemsSummary: string
}

export interface BillCreateData {
  customerName?: string
  customerPhone?: string
  customerId?: number | null
  items: Partial<BillItem>[]
  payment: BillPayment
  discount?: number
  discountType?: 'percentage' | 'amount'
  salesmanName?: string
  createdBy?: string
}

export interface HeldBill {
  id: string
  customerName?: string
  customerPhone?: string
  customerId?: number | null
  items: BillItem[]
  discount?: number
  discountType?: 'percentage' | 'amount'
  heldAt: string
  total?: number
}

// ---- Bill Return / Exchange ----

/** An individual item being returned from a bill */
export interface ReturnItem {
  billItemId: number
  productId: number | null
  productName: string
  originalQty: number
  returnQty: number
  rate: number
  gstRate: number
  refundAmount: number // Calculated: (rate * returnQty) + GST on that, minus discount proportion
}

/** An individual new item being exchanged for returned items */
export interface ExchangeItem {
  productId: number | null
  productName: string
  sku?: string
  hsn: string
  price: number
  quantity: number
  discount: number
  discountType: 'percentage' | 'amount'
  gstRate: number
}

/** Data required to process a return/exchange */
export interface BillReturnData {
  originalBillId: number
  type: 'return' | 'exchange'
  reason: string
  returnItems: ReturnItem[]
  exchangeItems: ExchangeItem[] // Only for exchange type
  refundMode: 'cash' | 'credit' | 'adjust' // adjust = net off against exchange
}

/** Result of a return/exchange operation */
export interface BillReturnResult {
  success: boolean
  returnAmount: number
  exchangeAmount: number
  netAmount: number // positive = customer owes, negative = refund to customer
  newBillId?: number // If exchange created a new bill
  newBillNo?: string
}

// ---- Customers ----
export interface Customer {
  id: number
  name: string
  phone: string
  email: string | null
  address: string | null
  city: string | null
  gstin: string | null
  customerType: 'regular' | 'wholesale' | 'walkin'
  creditLimit: number | null
  openingBalance: number
  currentBalance: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ---- Credit Payments ----
export interface CreditPayment {
  id: number
  customerId: number
  customerName?: string
  customerPhone?: string
  date: string
  amount: number
  paymentMode: 'cash' | 'upi' | 'card' | 'cheque' | 'bank_transfer'
  referenceNo: string | null
  balanceBefore: number
  balanceAfter: number
  billId: number | null
  notes: string | null
  createdBy: string | null
  createdAt: string
}

export interface CreditPaymentCreateData {
  customerId: number
  amount: number
  paymentMode: 'cash' | 'upi' | 'card' | 'cheque' | 'bank_transfer'
  referenceNo?: string
  billId?: number
  notes?: string
}

export interface CreditLedgerEntry {
  id: number
  date: string
  type: 'credit' | 'payment'
  description: string
  billNo?: string
  amount: number
  balance: number
  paymentMode?: string
  referenceNo?: string
}

// ---- Dashboard ----
export interface DailySummary {
  totalSales: number
  totalBills: number
  cashSales: number
  upiSales: number
  cardSales: number
  creditSales: number
  totalDiscount: number
  totalItems: number
  cashBills: number
  upiBills: number
  cardBills: number
  creditBills: number
}

export interface QuickStats {
  todaySales: number
  todayBills: number
  todayNetSales: number
  weekSales: number
  lowStockItems: number
  topSellingToday: {
    productName: string
    totalQty: number
    totalAmount: number
    quantity?: number
  }[]
}

// ---- Settings ----
export interface AppSettings {
  shopName: string
  shopAddress: string
  shopPhone: string
  shopEmail: string
  gstin: string
  pan: string
  stateCode: string
  bankDetails: string
  logoPath: string
  upiVpa: string
  upiPayeeName: string
  billPrefix: string
  financialYearStart: string
  defaultTaxType: 'inclusive' | 'exclusive'
  roundOffMode: 'none' | 'round1' | 'round050'
  defaultPaymentMode: string
  requireCustomer: boolean
  enableSalesman: boolean
  enableWholesale: boolean
  autoPrintReceipt: boolean
  receiptPrinterName: string
  labelPrinterName: string
  barcodeLabelSize?: string
  barcodeNudgeX?: string
  barcodeNudgeY?: string
  barcodeWidth?: string
  barcodeHeight?: string
  a4PrinterName: string
  receiptCopies: number
  backupFrequency: 'hourly' | '4hours' | 'daily'
  backupPath: string
  secondaryBackupPath: string
  backupRetention: number
  theme: 'light' | 'dark'
  fontSize: 'small' | 'medium' | 'large'
  barcodeShowName?: boolean
  barcodeShowShopName?: boolean
  barcodeShowSaleName?: boolean
  barcodeSaleNameText?: string
  barcodeShowMrp?: boolean
  barcodeShowSellingPrice?: boolean
  barcodeStrikeMrp?: boolean
  barcodeShowDiscount?: boolean
  barcodeShopFontSize?: string
  barcodeNameFontSize?: string
  barcodePriceFontSize?: string
  barcodeCodeFontSize?: string
  barcodeShopAlign?: string
  barcodeNameAlign?: string
  barcodePriceAlign?: string
  barcodeCodeAlign?: string
  barcodePaddingX?: string
  barcodePaddingY?: string
  barcodeGap?: string
  barcodeShowCode?: boolean
}

// ---- Stock Ledger ----
export interface StockLedgerEntry {
  id: number
  productId: number
  productName?: string
  type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'opening' | 'damage'
  qty: number
  referenceType: string | null
  referenceId: number | null
  notes: string | null
  createdAt: string
}

// ---- Stock Adjustment ----
export interface StockAdjustment {
  productId: number
  type: 'purchase' | 'adjustment' | 'damage' | 'return'
  quantity: number
  notes?: string
}

// ---- Customer Form ----
export interface CustomerFormData {
  name: string
  phone: string
  email?: string
  address?: string
  city?: string
  gstin?: string
  customerType?: 'regular' | 'wholesale' | 'walkin'
  creditLimit?: number
}

// ---- Export ----
export interface ExportResult {
  success: boolean
  path?: string | null
  error?: string
}

// ---- IPC API Types ----
export interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: string[]
}

export interface BackupResult {
  success: boolean
  path: string
  timestamp: string
  size: number
  error?: string
}

// ---- Pagination ----
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ProductFilters {
  search?: string
  category?: string
  categoryId?: number
  stockStatus?: 'all' | 'low' | 'out' | 'in'
  isActive?: boolean
  page?: number
  pageSize?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface BillFilters {
  dateFrom?: string
  dateTo?: string
  status?: string
  paymentMode?: string
  search?: string
  page?: number
  pageSize?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
