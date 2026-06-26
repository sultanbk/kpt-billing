import type {
  Bill,
  BillCreateData,
  BillFilters,
  BillReturnData,
  BillReturnInfo,
  BillReturnResult,
  DailySummary,
  HeldBill,
  PaginatedResult
} from '@shared/types'
import { z } from 'zod'

// Zod Schemas for runtime validation of data from the main process
const billItemSchema = z.object({
  id: z.string(),
  productId: z.number().nullable(),
  productName: z.string(),
  sku: z.string().optional().nullable(),
  hsn: z.string(),
  price: z.number(),
  quantity: z.number(),
  unit: z.string().optional().nullable(),
  discount: z.number(),
  discountType: z.enum(['percentage', 'amount', 'flat', 'percent']),
  discountAmount: z.number(),
  gstRate: z.number(),
  gstAmount: z.number(),
  cgstRate: z.number().optional(),
  sgstRate: z.number().optional(),
  taxableAmount: z.number(),
  total: z.number(),
  returnedQty: z.number().optional(),
  stock: z.number().optional()
})

const heldBillSchema = z.object({
  id: z.string(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerId: z.number().nullable().optional(),
  items: z.array(billItemSchema),
  discount: z.number().optional(),
  discountType: z.enum(['percentage', 'amount']).optional(),
  heldAt: z.string(),
  total: z.number().optional()
})

const billReturnInfoSchema = z.object({
  id: z.number(),
  type: z.enum(['return', 'exchange']),
  reason: z.string(),
  returnAmount: z.number(),
  exchangeAmount: z.number(),
  netAmount: z.number(),
  refundMode: z.string(),
  newBillId: z.number().nullable(),
  newBillNo: z.string().nullable(),
  createdAt: z.string(),
  itemsSummary: z.string()
})

export interface BillingService {
  createBill: (data: BillCreateData) => Promise<Bill>
  printReceipt: (billId: number) => Promise<boolean>
  getById: (billId: number) => Promise<Bill | null>
  getBillsByCustomer: (customerId: number, limit?: number) => Promise<Bill[]>
  getDailySummary: (date: string) => Promise<DailySummary>
  getWeekSummary: () => Promise<number>
  getMonthSummary: () => Promise<number>
  getWeeklySummary: (endDate: string) => Promise<unknown>
  getMonthlySummary: (yearMonth: string) => Promise<unknown>
  getYearlySummary: (year: number) => Promise<unknown>
  getTopSellingToday: (
    date: string
  ) => Promise<{ productName: string; totalQty: number; totalAmount: number }[]>
  getRecentBills: (limit: number) => Promise<Bill[]>
  getAllBills: (filters: BillFilters) => Promise<PaginatedResult<Bill>>
  returnBill: (billId: number, reason: string) => Promise<Bill>
  cancelBill: (billId: number, reason: string) => Promise<Bill>
  quickSearch: (term: string) => Promise<Bill[]>
  getReturnedQtyMap: (billId: number) => Promise<Record<number, number>>
  getReturnHistory: (billId: number) => Promise<BillReturnInfo[]>
  processReturn: (data: BillReturnData) => Promise<BillReturnResult>
  generatePdfReceipt: (billId: number) => Promise<{ success: boolean; path?: string }>
  getThermalReceiptImage: (bill: Bill) => Promise<string | null>
  getReceiptsDir: () => Promise<string>
  getHeldBills: () => Promise<HeldBill[]>
  holdBill: (
    id: string,
    data: { customerName?: string; customerPhone?: string; items: string }
  ) => Promise<boolean>
  deleteHeldBill: (id: string) => Promise<boolean>
}

export const billingService: BillingService = {
  createBill: (data) => window.api.billing.createBill(data),
  printReceipt: (billId) => window.api.billing.printReceipt(billId),
  getById: (billId) => window.api.billing.getById(billId),
  getBillsByCustomer: (customerId, limit) =>
    window.api.billing.getBillsByCustomer(customerId, limit),
  getDailySummary: (date) => window.api.billing.getDailySummary(date),
  getWeekSummary: () => window.api.billing.getWeekSummary(),
  getMonthSummary: () => window.api.billing.getMonthSummary(),
  getWeeklySummary: (endDate) => window.api.billing.getWeeklySummary(endDate),
  getMonthlySummary: (yearMonth) => window.api.billing.getMonthlySummary(yearMonth),
  getYearlySummary: (year) => window.api.billing.getYearlySummary(year),
  getTopSellingToday: (date) => window.api.billing.getTopSellingToday(date),
  getRecentBills: (limit) => window.api.billing.getRecentBills(limit),
  getAllBills: (filters) => window.api.billing.getAllBills(filters),
  returnBill: (billId, reason) => window.api.billing.returnBill(billId, reason),
  cancelBill: (billId, reason) => window.api.billing.cancelBill(billId, reason),
  quickSearch: (term) => window.api.billing.quickSearch(term),
  getReturnedQtyMap: (billId) => window.api.billing.getReturnedQtyMap(billId),
  getReturnHistory: async (billId) => {
    const data = await window.api.billing.getReturnHistory(billId)
    return z.array(billReturnInfoSchema).parse(data)
  },
  processReturn: (data) => window.api.billing.processReturn(data),
  generatePdfReceipt: (billId) => window.api.billing.generatePdfReceipt(billId),
  getThermalReceiptImage: (bill) => window.api.billing.getThermalReceiptImage(bill),
  getReceiptsDir: () => window.api.billing.getReceiptsDir(),
  getHeldBills: async () => {
    const data = await window.api.billing.getHeldBills()
    return z
      .array(heldBillSchema)
      .parse(data)
      .map((held) => ({
        ...held,
        customerName: held.customerName ?? undefined,
        customerPhone: held.customerPhone ?? undefined,
        items: held.items.map((item) => ({
          ...item,
          sku: item.sku ?? undefined,
          unit: item.unit ?? undefined
        }))
      }))
  },
  holdBill: (id, data) => window.api.billing.holdBill(id, data),
  deleteHeldBill: (id) => window.api.billing.deleteHeldBill(id)
}
