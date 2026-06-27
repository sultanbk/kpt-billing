import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const license = {
  getState: () => ipcRenderer.invoke('license:get-state'),
  activate: (key: string) => ipcRenderer.invoke('license:activate', key),
  isFeatureEnabled: (feature: string) => ipcRenderer.invoke('license:is-feature-enabled', feature),
  checkLimit: (key: string, count: number) => ipcRenderer.invoke('license:check-limit', key, count)
}

// Typed API exposed to renderer
const api = {
  license,
  // Products
  products: {
    search: (term: string) => ipcRenderer.invoke('products:search', term),
    getAll: (filters?: unknown) => ipcRenderer.invoke('products:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('products:getById', id),
    getByBarcode: (barcode: string) => ipcRenderer.invoke('products:getByBarcode', barcode),
    create: (data: unknown) => ipcRenderer.invoke('products:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('products:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('products:delete', id),
    import: (rows: unknown[]) => ipcRenderer.invoke('products:import', rows),
    getLowStock: () => ipcRenderer.invoke('products:getLowStock'),
    getOutOfStock: () => ipcRenderer.invoke('products:getOutOfStock'),
    getStockValuation: () => ipcRenderer.invoke('products:getStockValuation'),
    adjustStock: (productId: number, quantity: number, type: string, notes?: string) =>
      ipcRenderer.invoke('products:adjustStock', productId, quantity, type, notes),
    getStockLedger: (productId: number, limit?: number) =>
      ipcRenderer.invoke('products:getStockLedger', productId, limit),
    getPriceHistory: (productId: number, limit?: number) =>
      ipcRenderer.invoke('products:getPriceHistory', productId, limit),
    bulkStockUpdate: (items: { sku?: string; barcode?: string; stock: number }[]) =>
      ipcRenderer.invoke('products:bulkStockUpdate', items),
    downloadLabels: (payload: {
      productId: number
      quantity: number
      labelSize?: '46x25' | '60x40'
    }) => ipcRenderer.invoke('products:downloadLabels', payload),
    printLabels: (payload: {
      productId: number
      quantity: number
      printerName?: string
      labelSize?: '46x25' | '60x40'
    }) => ipcRenderer.invoke('products:printLabels', payload),
    printTestLabel: (payload: {
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
    }) => ipcRenderer.invoke('products:printTestLabel', payload)
  },
  // Suppliers
  suppliers: {
    getAll: (activeOnly?: boolean) => ipcRenderer.invoke('suppliers:getAll', activeOnly),
    getById: (id: number) => ipcRenderer.invoke('suppliers:getById', id),
    search: (term: string) => ipcRenderer.invoke('suppliers:search', term),
    create: (data: unknown) => ipcRenderer.invoke('suppliers:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('suppliers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('suppliers:delete', id),
    getCities: () => ipcRenderer.invoke('suppliers:getCities')
  },
  // Purchases (Stock-In)
  purchases: {
    getNextNumber: () => ipcRenderer.invoke('purchases:getNextNumber'),
    create: (data: unknown) => ipcRenderer.invoke('purchases:create', data),
    getById: (id: number) => ipcRenderer.invoke('purchases:getById', id),
    getAll: (filters?: unknown) => ipcRenderer.invoke('purchases:getAll', filters),
    getRecent: (limit?: number) => ipcRenderer.invoke('purchases:getRecent', limit),
    getSummary: (dateFrom: string, dateTo: string) =>
      ipcRenderer.invoke('purchases:getSummary', dateFrom, dateTo),
    delete: (id: number) => ipcRenderer.invoke('purchases:delete', id),
    onCreated: (
      callback: (payload: { purchaseId: number; productIds: number[] }) => void
    ): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { purchaseId: number; productIds: number[] }
      ): void => {
        callback(payload)
      }
      ipcRenderer.on('purchases:created', listener)
      return () => ipcRenderer.removeListener('purchases:created', listener)
    }
  },
  // Categories
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    create: (name: string, parentId?: number) =>
      ipcRenderer.invoke('categories:create', name, parentId),
    update: (id: number, name: string) => ipcRenderer.invoke('categories:update', id, name),
    delete: (id: number) => ipcRenderer.invoke('categories:delete', id)
  },
  // Billing
  billing: {
    getNextBillNumber: () => ipcRenderer.invoke('billing:getNextBillNumber'),
    createBill: (data: unknown) => ipcRenderer.invoke('billing:createBill', data),
    getById: (id: number) => ipcRenderer.invoke('billing:getById', id),
    getByBillNo: (billNo: string) => ipcRenderer.invoke('billing:getByBillNo', billNo),
    getRecentBills: (limit?: number) => ipcRenderer.invoke('billing:getRecentBills', limit),
    getBillsByDate: (date: string) => ipcRenderer.invoke('billing:getBillsByDate', date),
    getDailySummary: (date: string) => ipcRenderer.invoke('billing:getDailySummary', date),
    getWeekSummary: () => ipcRenderer.invoke('billing:getWeekSummary'),
    getMonthSummary: () => ipcRenderer.invoke('billing:getMonthSummary'),
    getTopSellingToday: (date: string, limit?: number) =>
      ipcRenderer.invoke('billing:getTopSellingToday', date, limit),
    getAllBills: (filters?: unknown) => ipcRenderer.invoke('billing:getAllBills', filters),
    quickSearch: (term: string) => ipcRenderer.invoke('billing:quickSearch', term),
    printReceipt: (billId: number) => ipcRenderer.invoke('billing:printReceipt', billId),
    generatePdfReceipt: (billId: number) =>
      ipcRenderer.invoke('billing:generatePdfReceipt', billId),
    getThermalReceiptImage: (bill: unknown) =>
      ipcRenderer.invoke('billing:getThermalReceiptImage', bill),
    getReceiptsDir: () => ipcRenderer.invoke('billing:getReceiptsDir'),
    returnBill: (billId: number, reason?: string) =>
      ipcRenderer.invoke('billing:returnBill', billId, reason),
    cancelBill: (billId: number, reason?: string) =>
      ipcRenderer.invoke('billing:cancelBill', billId, reason),
    getBillsByCustomer: (customerId: number, limit?: number) =>
      ipcRenderer.invoke('billing:getBillsByCustomer', customerId, limit),
    holdBill: (id: string, data: unknown) => ipcRenderer.invoke('billing:holdBill', id, data),
    getHeldBills: () => ipcRenderer.invoke('billing:getHeldBills'),
    recallHeldBill: (id: string) => ipcRenderer.invoke('billing:recallHeldBill', id),
    deleteHeldBill: (id: string) => ipcRenderer.invoke('billing:deleteHeldBill', id),
    // Return / Exchange
    processReturn: (data: unknown) => ipcRenderer.invoke('billing:processReturn', data),
    getReturnHistory: (billId: number) => ipcRenderer.invoke('billing:getReturnHistory', billId),
    getReturnedQtyMap: (billId: number) => ipcRenderer.invoke('billing:getReturnedQtyMap', billId),
    // Period summaries
    getWeeklySummary: (endDate?: string) => ipcRenderer.invoke('billing:getWeeklySummary', endDate),
    getMonthlySummary: (yearMonth?: string) =>
      ipcRenderer.invoke('billing:getMonthlySummary', yearMonth),
    getYearlySummary: (year?: number) => ipcRenderer.invoke('billing:getYearlySummary', year),
    getPeriodSummary: (dateFrom: string, dateTo: string) =>
      ipcRenderer.invoke('billing:getPeriodSummary', dateFrom, dateTo)
  },
  // Customers
  customers: {
    search: (term: string) => ipcRenderer.invoke('customers:search', term),
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    getById: (id: number) => ipcRenderer.invoke('customers:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('customers:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('customers:update', id, data),
    getWithCredit: () => ipcRenderer.invoke('customers:getWithCredit'),
    getTotalCredit: () => ipcRenderer.invoke('customers:getTotalCredit'),
    getTopByRevenue: (limit?: number) => ipcRenderer.invoke('customers:getTopByRevenue', limit),
    getFrequency: () => ipcRenderer.invoke('customers:getFrequency'),
    getCreditRisk: () => ipcRenderer.invoke('customers:getCreditRisk'),
    getCreditAging: () => ipcRenderer.invoke('customers:getCreditAging'),
    getCreditAgingSummary: () => ipcRenderer.invoke('customers:getCreditAgingSummary')
  },
  // Credit Payments
  credit: {
    recordPayment: (data: unknown) => ipcRenderer.invoke('credit:recordPayment', data),
    getById: (id: number) => ipcRenderer.invoke('credit:getById', id),
    getByCustomer: (customerId: number, limit?: number) =>
      ipcRenderer.invoke('credit:getByCustomer', customerId, limit),
    getAll: (filters?: unknown) => ipcRenderer.invoke('credit:getAll', filters),
    getLedger: (customerId: number) => ipcRenderer.invoke('credit:getLedger', customerId),
    getCollectionSummary: (dateFrom: string, dateTo: string) =>
      ipcRenderer.invoke('credit:getCollectionSummary', dateFrom, dateTo),
    deletePayment: (id: number) => ipcRenderer.invoke('credit:deletePayment', id)
  },
  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    setMany: (settings: Record<string, string>) => ipcRenderer.invoke('settings:setMany', settings)
  },
  // Backup
  backup: {
    create: (customPath?: string) => ipcRenderer.invoke('backup:create', customPath),
    list: () => ipcRenderer.invoke('backup:list'),
    clean: (retention?: number) => ipcRenderer.invoke('backup:clean', retention),
    getDir: () => ipcRenderer.invoke('backup:getDir'),
    selectFolder: () => ipcRenderer.invoke('backup:selectFolder'),
    restore: () => ipcRenderer.invoke('backup:restore')
  },
  // Cloud Backup (Google Drive)
  cloud: {
    getStatus: () => ipcRenderer.invoke('cloud:getStatus'),
    saveConfig: (clientId: string, clientSecret: string) =>
      ipcRenderer.invoke('cloud:saveConfig', clientId, clientSecret),
    getConfig: () => ipcRenderer.invoke('cloud:getConfig'),
    authenticate: () => ipcRenderer.invoke('cloud:authenticate'),
    disconnect: () => ipcRenderer.invoke('cloud:disconnect'),
    backup: () => ipcRenderer.invoke('cloud:backup'),
    listBackups: () => ipcRenderer.invoke('cloud:listBackups'),
    downloadBackup: (fileId: string, fileName: string) =>
      ipcRenderer.invoke('cloud:downloadBackup', fileId, fileName)
  },
  // Printers
  printer: {
    getAvailable: () => ipcRenderer.invoke('printer:getAvailable'),
    setReceipt: (name: string) => ipcRenderer.invoke('printer:setReceipt', name),
    testPrint: () => ipcRenderer.invoke('printer:testPrint'),
    diagnostics: (name?: string) => ipcRenderer.invoke('printer:diagnostics', name),
    printReceipt: (billId: number) => ipcRenderer.invoke('printer:printReceipt', billId),
    printPaymentDetails: (paymentMethod: unknown) =>
      ipcRenderer.invoke('printer:printPaymentDetails', paymentMethod),
    downloadPaymentDetailsPdf: (paymentMethod: unknown) =>
      ipcRenderer.invoke('printer:downloadPaymentDetailsPdf', paymentMethod)
  },
  // Dialogs
  dialog: {
    openFile: (options?: unknown) => ipcRenderer.invoke('dialog:openFile', options),
    openFolder: (folderPath: string) => ipcRenderer.invoke('dialog:openFolder', folderPath)
  },
  // Export
  export: {
    dailyReport: (date: string) => ipcRenderer.invoke('export:dailyReport', date),
    billHistory: (dateFrom: string, dateTo: string) =>
      ipcRenderer.invoke('export:billHistory', dateFrom, dateTo),
    stockReport: () => ipcRenderer.invoke('export:stockReport'),
    customerReport: () => ipcRenderer.invoke('export:customerReport'),
    fullData: () => ipcRenderer.invoke('export:fullData')
  },
  // Report PDF Generation
  report: {
    generateDailyPdf: (date: string) => ipcRenderer.invoke('report:generateDailyPdf', date),
    generateWeeklyPdf: (endDate?: string) =>
      ipcRenderer.invoke('report:generateWeeklyPdf', endDate),
    generateMonthlyPdf: (yearMonth?: string) =>
      ipcRenderer.invoke('report:generateMonthlyPdf', yearMonth),
    generateYearlyPdf: (year?: number) => ipcRenderer.invoke('report:generateYearlyPdf', year),
    openFile: (filePath: string) => ipcRenderer.invoke('report:openFile', filePath),
    getReportsDir: () => ipcRenderer.invoke('report:getReportsDir')
  },
  // Expenses
  expenses: {
    create: (data: unknown) => ipcRenderer.invoke('expenses:create', data),
    getAll: (filters?: unknown) => ipcRenderer.invoke('expenses:getAll', filters),
    getByDate: (date: string) => ipcRenderer.invoke('expenses:getByDate', date),
    update: (id: number, data: unknown) => ipcRenderer.invoke('expenses:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('expenses:delete', id),
    getCategories: () => ipcRenderer.invoke('expenses:getCategories'),
    getSummary: (dateFrom: string, dateTo: string) =>
      ipcRenderer.invoke('expenses:getSummary', dateFrom, dateTo)
  },
  // Advanced Reports (GST, P&L, Dashboard)
  reports: {
    getGstReport: (dateFrom: string, dateTo: string) =>
      ipcRenderer.invoke('reports:getGstReport', dateFrom, dateTo),
    getProfitLoss: (dateFrom: string, dateTo: string) =>
      ipcRenderer.invoke('reports:getProfitLoss', dateFrom, dateTo),
    getDashboardData: (date: string) => ipcRenderer.invoke('reports:getDashboardData', date)
  },
  // WhatsApp Notifications
  whatsapp: {
    sendBillReceipt: (billId: number, phone: string) =>
      ipcRenderer.invoke('whatsapp:sendBillReceipt', billId, phone),
    sendCreditReminder: (phone: string, customerName: string, currentBalance: number) =>
      ipcRenderer.invoke('whatsapp:sendCreditReminder', phone, customerName, currentBalance),
    sendPaymentConfirmation: (
      phone: string,
      customerName: string,
      amountPaid: number,
      remainingBalance: number,
      paymentMode: string,
      date: string
    ) =>
      ipcRenderer.invoke(
        'whatsapp:sendPaymentConfirmation',
        phone,
        customerName,
        amountPaid,
        remainingBalance,
        paymentMode,
        date
      )
  },
  // Auth
  auth: {
    verifyPin: (pin: string) => ipcRenderer.invoke('auth:verifyPin', pin),
    changePin: (currentPin: string, newPin: string) =>
      ipcRenderer.invoke('auth:changePin', currentPin, newPin)
  },
  // Auto-Updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    install: () => ipcRenderer.invoke('updater:install'),
    getStatus: () => ipcRenderer.invoke('updater:getStatus'),
    onStatusChanged: (
      callback: (status: import('../shared/types').UpdateStatus) => void
    ): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        status: import('../shared/types').UpdateStatus
      ): void => {
        callback(status)
      }
      ipcRenderer.on('updater:status-changed', listener)
      return () => ipcRenderer.removeListener('updater:status-changed', listener)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('license', license)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.license = license
}
