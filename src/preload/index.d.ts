import { ElectronAPI } from '@electron-toolkit/preload'

interface ProductsApi {
  search(term: string): Promise<import('../shared/types').Product[]>
  getAll(
    filters?: import('../shared/types').ProductFilters
  ): Promise<import('../shared/types').PaginatedResult<import('../shared/types').Product>>
  getById(id: number): Promise<import('../shared/types').Product | null>
  getByBarcode(barcode: string): Promise<import('../shared/types').Product | null>
  create(
    data: import('../shared/types').ProductFormData
  ): Promise<import('../shared/types').Product>
  update(
    id: number,
    data: Partial<import('../shared/types').ProductFormData>
  ): Promise<import('../shared/types').Product>
  delete(id: number): Promise<boolean>
  import(
    input: string[] | import('../shared/types').ProductFormData[]
  ): Promise<import('../shared/types').ImportResult>
  getLowStock(): Promise<import('../shared/types').Product[]>
  getOutOfStock(): Promise<import('../shared/types').Product[]>
  getStockValuation(): Promise<{
    totalCostValue: number
    totalSellingValue: number
    totalItems: number
  }>
  adjustStock(
    productId: number,
    quantity: number,
    type: string,
    notes?: string
  ): Promise<import('../shared/types').Product>
  getStockLedger(productId: number, limit?: number): Promise<Record<string, unknown>[]>
  getPriceHistory(productId: number, limit?: number): Promise<Record<string, unknown>[]>
  bulkStockUpdate(
    items: { sku?: string; barcode?: string; stock: number }[]
  ): Promise<import('../shared/types').ImportResult>
  downloadLabels(payload: {
    productId: number
    quantity: number
    labelSize?: '46x25' | '60x40'
  }): Promise<{ success: boolean; path: string }>
  printLabels(
    payload: import('../shared/types').ProductLabelPrintRequest
  ): Promise<import('../shared/types').ProductLabelPrintResult>
  printTestLabel(payload: {
    printerName?: string
    labelSize?: '46x25' | '60x40'
    barcodeNudgeX?: string
    barcodeNudgeY?: string
    barcodeWidth?: string
    barcodeHeight?: string
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
  }): Promise<import('../shared/types').ProductLabelPrintResult>
}

interface CategoriesApi {
  getAll(): Promise<import('../shared/types').Category[]>
  create(name: string, parentId?: number): Promise<import('../shared/types').Category>
  update(id: number, name: string): Promise<import('../shared/types').Category>
  delete(id: number): Promise<boolean>
}

interface BillingApi {
  getNextBillNumber(): Promise<string>
  createBill(
    data: import('../shared/types').BillCreateData
  ): Promise<import('../shared/types').Bill>
  getById(id: number): Promise<import('../shared/types').Bill | null>
  getByBillNo(billNo: string): Promise<import('../shared/types').Bill | null>
  getRecentBills(limit?: number): Promise<import('../shared/types').Bill[]>
  getBillsByDate(date: string): Promise<import('../shared/types').Bill[]>
  getDailySummary(date: string): Promise<import('../shared/types').DailySummary>
  getWeekSummary(): Promise<number>
  getMonthSummary(): Promise<number>
  getTopSellingToday(
    date: string,
    limit?: number
  ): Promise<{ productName: string; totalQty: number; totalAmount: number }[]>
  getAllBills(
    filters?: import('../shared/types').BillFilters
  ): Promise<import('../shared/types').PaginatedResult<import('../shared/types').Bill>>
  quickSearch(term: string): Promise<import('../shared/types').Bill[]>
  printReceipt(billId: number): Promise<boolean>
  generatePdfReceipt(billId: number): Promise<{ success: boolean; path: string }>
  getReceiptsDir(): Promise<string>
  returnBill(billId: number, reason?: string): Promise<import('../shared/types').Bill>
  cancelBill(billId: number, reason?: string): Promise<import('../shared/types').Bill>
  getBillsByCustomer(customerId: number, limit?: number): Promise<import('../shared/types').Bill[]>
  processReturn(
    data: import('../shared/types').BillReturnData
  ): Promise<import('../shared/types').BillReturnResult>
  getReturnHistory(billId: number): Promise<Record<string, unknown>[]>
  getReturnedQtyMap(billId: number): Promise<Record<number, number>>
  holdBill(
    id: string,
    data: { customerName?: string; customerPhone?: string; items: string }
  ): Promise<boolean>
  getHeldBills(): Promise<unknown[]>
  recallHeldBill(id: string): Promise<unknown | null>
  deleteHeldBill(id: string): Promise<boolean>
  getWeeklySummary(endDate?: string): Promise<unknown>
  getMonthlySummary(yearMonth?: string): Promise<unknown>
  getYearlySummary(year?: number): Promise<unknown>
  getPeriodSummary(dateFrom: string, dateTo: string): Promise<unknown>
  getThermalReceiptImage(bill: import('../shared/types').Bill): Promise<string | null>
}

interface CustomersApi {
  search(term: string): Promise<import('../shared/types').Customer[]>
  getAll(): Promise<import('../shared/types').Customer[]>
  getById(id: number): Promise<import('../shared/types').Customer | null>
  create(
    data: import('../shared/types').CustomerFormData
  ): Promise<import('../shared/types').Customer>
  update(
    id: number,
    data: Partial<import('../shared/types').CustomerFormData>
  ): Promise<import('../shared/types').Customer>
  getWithCredit(): Promise<import('../shared/types').Customer[]>
  getTotalCredit(): Promise<number>
  getTopByRevenue(limit?: number): Promise<Record<string, unknown>[]>
  getFrequency(): Promise<Record<string, unknown>[]>
  getCreditRisk(): Promise<Record<string, unknown>[]>
  getCreditAging(): Promise<Record<string, unknown>[]>
  getCreditAgingSummary(): Promise<Record<string, unknown>>
}

interface CreditApi {
  onCreated(callback: (payload: { purchaseId: number; productIds: number[] }) => void): () => void
  recordPayment(
    data: import('../shared/types').CreditPaymentCreateData
  ): Promise<import('../shared/types').CreditPayment>
  getById(id: number): Promise<import('../shared/types').CreditPayment | null>
  getByCustomer(
    customerId: number,
    limit?: number
  ): Promise<import('../shared/types').CreditPayment[]>
  getAll(filters?: {
    dateFrom?: string
    dateTo?: string
    customerId?: number
    paymentMode?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: import('../shared/types').CreditPayment[]; total: number }>
  getLedger(customerId: number): Promise<import('../shared/types').CreditLedgerEntry[]>
  getCollectionSummary(
    dateFrom: string,
    dateTo: string
  ): Promise<{
    totalCollected: number
    totalPayments: number
    byCash: number
    byUpi: number
    byCard: number
    byCheque: number
    byBankTransfer: number
  }>
  deletePayment(id: number): Promise<boolean>
}

interface SettingsApi {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<boolean>
  getAll(): Promise<Record<string, string>>
  setMany(settings: Record<string, string>): Promise<boolean>
}

interface BackupApi {
  create(customPath?: string): Promise<import('../shared/types').BackupResult>
  list(): Promise<{ name: string; path: string; date: string; size: number }[]>
  clean(retention?: number): Promise<boolean>
  getDir(): Promise<string>
  selectFolder(): Promise<string | null>
  restore(): Promise<{ success: boolean; error?: string; safetyBackupPath?: string }>
}

interface PrinterApi {
  getAvailable(): Promise<string[]>
  setReceipt(name: string): Promise<boolean>
  testPrint(): Promise<boolean>
  diagnostics(name?: string): Promise<{
    selectedPrinter: string
    configuredPrinter: string
    availablePrinters: string[]
    windowsDetails: {
      name: string
      printerStatus: number | null
      workOffline: boolean | null
      portName: string | null
      driverName: string | null
      isDefault: boolean | null
    } | null
    checks: {
      printerSelected: boolean
      serviceBoundToSelection: boolean
      selectedExistsInSystem: boolean
      windowsReportsOffline: boolean
    }
    recommendations: string[]
    checkedAt: string
  }>
  printReceipt(billId: number): Promise<boolean>
  printPaymentDetails(paymentMethod: unknown): Promise<boolean>
  downloadPaymentDetailsPdf(paymentMethod: unknown): Promise<boolean>
}

interface DialogApi {
  openFile(options?: unknown): Promise<string[] | null>
  openFolder(folderPath: string): Promise<boolean>
}

interface ExportApi {
  dailyReport(date: string): Promise<import('../shared/types').ExportResult>
  billHistory(dateFrom: string, dateTo: string): Promise<import('../shared/types').ExportResult>
  stockReport(): Promise<import('../shared/types').ExportResult>
  customerReport(): Promise<import('../shared/types').ExportResult>
  fullData(): Promise<import('../shared/types').ExportResult>
}

interface ReportApi {
  generateDailyPdf(date: string): Promise<{ success: boolean; path: string }>
  generateWeeklyPdf(endDate?: string): Promise<{ success: boolean; path: string }>
  generateMonthlyPdf(yearMonth?: string): Promise<{ success: boolean; path: string }>
  generateYearlyPdf(year?: number): Promise<{ success: boolean; path: string }>
  openFile(filePath: string): Promise<boolean>
  getReportsDir(): Promise<string>
}

interface SuppliersApi {
  getAll(activeOnly?: boolean): Promise<import('../shared/types').Supplier[]>
  getById(id: number): Promise<import('../shared/types').Supplier | null>
  search(term: string): Promise<import('../shared/types').Supplier[]>
  create(
    data: import('../shared/types').SupplierFormData
  ): Promise<import('../shared/types').Supplier>
  update(
    id: number,
    data: Partial<import('../shared/types').SupplierFormData>
  ): Promise<import('../shared/types').Supplier>
  delete(id: number): Promise<boolean>
  getCities(): Promise<string[]>
}

interface PurchasesApi {
  getNextNumber(): Promise<string>
  onCreated(callback: (payload: { purchaseId: number; productIds: number[] }) => void): () => void
  create(
    data: import('../shared/types').PurchaseCreateData
  ): Promise<import('../shared/types').Purchase>
  getById(id: number): Promise<import('../shared/types').Purchase | null>
  getAll(filters?: unknown): Promise<{
    data: import('../shared/types').Purchase[]
    total: number
    page: number
    pageSize: number
  }>
  getRecent(limit?: number): Promise<import('../shared/types').Purchase[]>
  getSummary(dateFrom: string, dateTo: string): Promise<unknown>
  delete(id: number): Promise<boolean>
}

interface CloudApi {
  getStatus(): Promise<{ configured: boolean; authenticated: boolean; hasRefreshToken: boolean }>
  saveConfig(clientId: string, clientSecret: string): Promise<boolean>
  getConfig(): Promise<{ clientId: string; clientSecret: string }>
  authenticate(): Promise<{ success: boolean; error?: string }>
  disconnect(): Promise<boolean>
  backup(): Promise<{ success: boolean; error?: string }>
  listBackups(): Promise<{ id: string; name: string; modifiedTime: string; size: string }[]>
  downloadBackup(
    fileId: string,
    fileName: string
  ): Promise<{ success: boolean; path?: string; error?: string }>
}

interface ExpensesApi {
  create(data: {
    date?: string
    category: string
    amount: number
    description?: string
    paymentMode?: string
  }): Promise<unknown>
  getAll(filters?: {
    dateFrom?: string
    dateTo?: string
    category?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: unknown[]; total: number }>
  getByDate(date: string): Promise<unknown[]>
  update(
    id: number,
    data: {
      date?: string
      category?: string
      amount?: number
      description?: string
      paymentMode?: string
    }
  ): Promise<unknown>
  delete(id: number): Promise<boolean>
  getCategories(): Promise<string[]>
  getSummary(
    dateFrom: string,
    dateTo: string
  ): Promise<{
    total: number
    byCategory: { category: string; total: number; count: number }[]
    byPaymentMode: { mode: string; total: number }[]
  }>
}

interface ReportsApi {
  getGstReport(dateFrom: string, dateTo: string): Promise<unknown>
  getProfitLoss(dateFrom: string, dateTo: string): Promise<unknown>
  getDashboardData(date: string): Promise<{
    pendingCredits: number
    pendingCreditCustomers: number
    outOfStockCount: number
    todayExpenses: number
    todayCollections: number
    yesterdaySales: number
  }>
}

interface WhatsAppApi {
  sendBillReceipt(billId: number, phone: string): Promise<{ success: boolean; error?: string }>
  sendCreditReminder(
    phone: string,
    customerName: string,
    currentBalance: number
  ): Promise<{ success: boolean; error?: string }>
  sendPaymentConfirmation(
    phone: string,
    customerName: string,
    amountPaid: number,
    remainingBalance: number,
    paymentMode: string,
    date: string
  ): Promise<{ success: boolean; error?: string }>
}

interface AuthApi {
  verifyPin(
    pin: string
  ): Promise<{ success: boolean; user?: { id: number; name: string; role: string } }>
  changePin(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }>
}

interface UpdaterApi {
  check(): Promise<import('../shared/types').UpdateStatus>
  install(): Promise<void>
  getStatus(): Promise<import('../shared/types').UpdateStatus>
  onStatusChanged(callback: (status: import('../shared/types').UpdateStatus) => void): () => void
}

interface LicenseApi {
  getState(): Promise<import('../shared/licenseTypes').LicenseState>
  activate(key: string): Promise<import('../shared/licenseTypes').ActivationResult>
  isFeatureEnabled(feature: string): Promise<boolean>
  checkLimit(key: string, count: number): Promise<boolean>
}

interface KptApi {
  license: LicenseApi
  products: ProductsApi
  suppliers: SuppliersApi
  purchases: PurchasesApi
  categories: CategoriesApi
  billing: BillingApi
  customers: CustomersApi
  credit: CreditApi
  settings: SettingsApi
  backup: BackupApi
  printer: PrinterApi
  dialog: DialogApi
  export: ExportApi
  report: ReportApi
  cloud: CloudApi
  expenses: ExpensesApi
  reports: ReportsApi
  whatsapp: WhatsAppApi
  auth: AuthApi
  updater: UpdaterApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: KptApi
    license: LicenseApi
  }
}
