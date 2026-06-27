// Shared constants for KPT Billing

export const APP_NAME = 'KPT Billing'
export const SHOP_NAME = 'KRISHNAPRIYA TEXTILES'

export const DEFAULT_CATEGORIES = [
  'Saree',
  'Blouse Piece',
  'Dress Material',
  'Dupatta',
  'Fabric',
  'Readymade',
  'Accessories',
  'Other'
]

export const GST_RATES = [0, 5, 12, 18, 28] as const

// Common textile HSN codes
export const COMMON_HSN_CODES = [
  { code: '5007', description: 'Woven fabrics of silk' },
  { code: '5208', description: 'Woven fabrics of cotton' },
  { code: '5209', description: 'Woven fabrics of cotton (>=200g/m2)' },
  { code: '5407', description: 'Woven fabrics of synthetic filament yarn' },
  { code: '5408', description: 'Woven fabrics of artificial filament yarn' },
  { code: '5512', description: 'Woven fabrics of synthetic staple fibres' },
  { code: '5513', description: 'Woven fabrics of synthetic staple fibres (<85%)' },
  { code: '5514', description: 'Woven fabrics of synthetic staple fibres (>=85%)' },
  { code: '5801', description: 'Woven pile fabrics and chenille fabrics' },
  { code: '5806', description: 'Narrow woven fabrics' },
  { code: '6117', description: 'Made up clothing accessories, knitted' },
  { code: '6205', description: "Men's shirts" },
  { code: '6206', description: "Women's blouses, shirts" },
  { code: '6214', description: 'Shawls, scarves, veils' },
  { code: '6302', description: 'Bed/table/toilet/kitchen linen' },
  { code: '6307', description: 'Other made up articles' }
]

export const PAYMENT_MODES = ['cash', 'upi', 'card', 'credit', 'mixed'] as const

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity',
  'Salary',
  'Transport',
  'Packaging',
  'Maintenance',
  'Tea/Food',
  'Marketing',
  'Other'
]

/**
 * Get today's date as YYYY-MM-DD in local timezone.
 * IMPORTANT: Do NOT use `new Date().toISOString().split('T')[0]` — that returns UTC date
 * which will be wrong after midnight IST (UTC+5:30).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Financial year: April to March
export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = date.getMonth() // 0-indexed
  if (month >= 3) {
    // April onwards
    return `${year}-${(year + 1).toString().slice(-2)}`
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`
  }
}

export function getBillPrefix(date: Date = new Date()): string {
  return `KPT/${getFinancialYear(date)}/`
}

// Keyboard shortcuts
export const SHORTCUTS = {
  NEW_BILL: 'F1',
  FOCUS_SEARCH: 'F2',
  FOCUS_CUSTOMER: 'F3',
  APPLY_DISCOUNT: 'F4',
  PAYMENT: 'F5',
  HOLD_BILL: 'F8',
  RECALL_BILL: 'F9',
  PRINT_LAST: 'F10',
  CANCEL: 'Escape',
  DELETE_ITEM: 'Delete'
} as const

export const DEFAULT_SETTINGS: Record<string, string> = {
  shopName: 'KRISHNAPRIYA TEXTILES',
  shopAddress: 'Shidling Complex, Opposite Bus Stand, Shirahatti 582120, Karnataka',
  shopPhone: '9108455006',
  shopEmail: '',
  gstin: '',
  pan: '',
  stateCode: '29', // Karnataka
  bankDetails: '',
  logoPath: '',
  upiVpa: '',
  upiPayeeName: '',
  billPrefix: 'KPT',
  defaultTaxType: 'exclusive',
  roundOffMode: 'round1',
  defaultPaymentMode: 'cash',
  requireCustomer: 'false',
  enableSalesman: 'false',
  enableWholesale: 'false',
  autoPrintReceipt: 'true',
  receiptPrinterName: '',
  labelPrinterName: '',
  paymentMethods: '[]',
  barcodeLabelSize: '46x25',
  barcodeNudgeX: '0.0',
  barcodeNudgeY: '0.0',
  barcodeWidth: '75',
  barcodeHeight: '5.5',
  a4PrinterName: '',
  receiptPaperWidthMm: '58',
  receiptCopies: '1',
  receiptFooterType: 'default',
  receiptFooter: '',
  backupFrequency: '4hours',
  backupPath: '',
  secondaryBackupPath: '',
  backupRetention: '30',
  theme: 'light',
  fontSize: 'medium',
  barcodeShowShopName: 'true',
  barcodeShowSaleName: 'false',
  barcodeSaleNameText: '',
  barcodeShowName: 'true',
  barcodeShowMrp: 'true',
  barcodeShowSellingPrice: 'true',
  barcodeStrikeMrp: 'true',
  barcodeShowDiscount: 'true',
  barcodeShopFontSize: 'default',
  barcodeNameFontSize: 'default',
  barcodePriceFontSize: 'default',
  barcodeCodeFontSize: 'default',
  barcodeShopAlign: 'right',
  barcodeNameAlign: 'left',
  barcodePriceAlign: 'left',
  barcodeCodeAlign: 'center',
  barcodePaddingX: 'default',
  barcodePaddingY: 'default',
  barcodeGap: 'default',
  barcodeShowCode: 'true'
}
