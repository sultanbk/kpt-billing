import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock the window.api (preload bridge) globally for all renderer tests
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createMockFn = () => vi.fn().mockResolvedValue(undefined)

const mockApi = {
  products: {
    search: createMockFn(),
    getAll: createMockFn(),
    getById: createMockFn(),
    getByBarcode: createMockFn(),
    create: createMockFn(),
    update: createMockFn(),
    delete: createMockFn(),
    import: createMockFn(),
    getLowStock: createMockFn(),
    getOutOfStock: createMockFn(),
    getStockValuation: createMockFn(),
    adjustStock: createMockFn(),
    getStockLedger: createMockFn(),
    getPriceHistory: createMockFn(),
    bulkStockUpdate: createMockFn(),
    downloadLabels: createMockFn(),
    printLabels: createMockFn(),
    printTestLabel: createMockFn()
  },
  billing: {
    getNextBillNumber: createMockFn(),
    createBill: createMockFn(),
    getById: createMockFn(),
    getByBillNo: createMockFn(),
    getRecentBills: createMockFn(),
    getBillsByDate: createMockFn(),
    getDailySummary: createMockFn(),
    getWeekSummary: createMockFn(),
    getMonthSummary: createMockFn(),
    getTopSellingToday: createMockFn(),
    getAllBills: createMockFn(),
    quickSearch: createMockFn(),
    printReceipt: createMockFn(),
    generatePdfReceipt: createMockFn(),
    getReceiptsDir: createMockFn(),
    returnBill: createMockFn(),
    cancelBill: createMockFn(),
    getBillsByCustomer: createMockFn(),
    holdBill: createMockFn(),
    getHeldBills: createMockFn(),
    recallHeldBill: createMockFn(),
    deleteHeldBill: createMockFn(),
    processReturn: createMockFn(),
    getReturnHistory: createMockFn(),
    getReturnedQtyMap: createMockFn(),
    getWeeklySummary: createMockFn(),
    getMonthlySummary: createMockFn(),
    getYearlySummary: createMockFn(),
    getPeriodSummary: createMockFn()
  },
  customers: {
    search: createMockFn(),
    getAll: createMockFn(),
    getById: createMockFn(),
    create: createMockFn(),
    update: createMockFn(),
    getWithCredit: createMockFn(),
    getTotalCredit: createMockFn(),
    getTopByRevenue: createMockFn(),
    getFrequency: createMockFn(),
    getCreditRisk: createMockFn(),
    getCreditAging: createMockFn(),
    getCreditAgingSummary: createMockFn()
  },
  categories: {
    getAll: createMockFn(),
    create: createMockFn(),
    update: createMockFn(),
    delete: createMockFn()
  },
  settings: {
    get: createMockFn(),
    set: createMockFn(),
    getAll: createMockFn(),
    setMany: createMockFn()
  },
  credit: {
    recordPayment: createMockFn(),
    getById: createMockFn(),
    getByCustomer: createMockFn(),
    getAll: createMockFn(),
    getLedger: createMockFn(),
    getCollectionSummary: createMockFn(),
    deletePayment: createMockFn()
  },
  backup: {
    create: createMockFn(),
    list: createMockFn(),
    clean: createMockFn(),
    getDir: createMockFn(),
    selectFolder: createMockFn(),
    restore: createMockFn()
  },
  printer: {
    getAvailable: createMockFn(),
    setReceipt: createMockFn(),
    testPrint: createMockFn(),
    diagnostics: createMockFn(),
    printReceipt: createMockFn(),
    printPaymentDetails: createMockFn(),
    downloadPaymentDetailsPdf: createMockFn()
  },
  dialog: {
    openFile: createMockFn(),
    openFolder: createMockFn()
  },
  cloud: {
    getStatus: createMockFn(),
    saveConfig: createMockFn(),
    getConfig: createMockFn(),
    authenticate: createMockFn(),
    disconnect: createMockFn(),
    backup: createMockFn(),
    listBackups: createMockFn(),
    downloadBackup: createMockFn()
  },
  expenses: {
    create: createMockFn(),
    getAll: createMockFn(),
    getByDate: createMockFn(),
    update: createMockFn(),
    delete: createMockFn(),
    getCategories: createMockFn(),
    getSummary: createMockFn()
  },
  auth: {
    verifyPin: createMockFn(),
    changePin: createMockFn()
  },
  suppliers: {
    getAll: createMockFn(),
    getById: createMockFn(),
    search: createMockFn(),
    create: createMockFn(),
    update: createMockFn(),
    delete: createMockFn(),
    getCities: createMockFn()
  },
  purchases: {
    getNextNumber: createMockFn(),
    create: createMockFn(),
    getById: createMockFn(),
    getAll: createMockFn(),
    getRecent: createMockFn(),
    getSummary: createMockFn(),
    delete: createMockFn()
  }
}

Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true
})
