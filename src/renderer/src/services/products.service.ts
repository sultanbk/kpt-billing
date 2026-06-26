import type {
  ImportResult,
  PaginatedResult,
  Product,
  ProductFilters,
  ProductFormData,
  ProductLabelPrintRequest,
  ProductLabelPrintResult
} from '@shared/types'

export interface ProductsService {
  search: (query: string) => Promise<Product[]>
  getAll: (filters?: ProductFilters) => Promise<PaginatedResult<Product>>
  getById: (id: number) => Promise<Product | null>
  getByBarcode: (barcode: string) => Promise<Product | null>
  getPriceHistory: (productId: number, limit?: number) => Promise<Record<string, unknown>[]>
  getStockLedger: (productId: number, limit?: number) => Promise<Record<string, unknown>[]>
  create: (data: ProductFormData) => Promise<Product>
  update: (id: number, data: Partial<ProductFormData>) => Promise<Product>
  delete: (id: number) => Promise<boolean>
  import: (input: string[] | ProductFormData[]) => Promise<ImportResult>
  adjustStock: (id: number, qty: number, adjustType: string, notes?: string) => Promise<Product>
  bulkStockUpdate: (
    items: { sku?: string; barcode?: string; stock: number }[]
  ) => Promise<ImportResult>
  printLabels: (data: {
    productId: number
    quantity: number
    printerName?: string
    labelSize?: '46x25' | '60x40'
  }) => Promise<ProductLabelPrintResult>
  downloadLabels: (data: {
    productId: number
    quantity: number
    labelSize?: '46x25' | '60x40'
  }) => Promise<{ success: boolean; path?: string }>
  getLowStock: () => Promise<Product[]>
}

export const productsService: ProductsService = {
  search: (query) => window.api.products.search(query),
  getAll: (filters) => window.api.products.getAll(filters),
  getById: (id) => window.api.products.getById(id),
  getByBarcode: (barcode) => window.api.products.getByBarcode(barcode),
  getPriceHistory: (productId, limit) => window.api.products.getPriceHistory(productId, limit),
  getStockLedger: (productId, limit) => window.api.products.getStockLedger(productId, limit),
  create: (data) => window.api.products.create(data),
  update: (id, data) => window.api.products.update(id, data),
  delete: (id) => window.api.products.delete(id),
  import: (input) => window.api.products.import(input),
  adjustStock: (id, qty, adjustType, notes) =>
    window.api.products.adjustStock(id, qty, adjustType, notes) as unknown as Promise<Product>,
  bulkStockUpdate: (items) => window.api.products.bulkStockUpdate(items),
  printLabels: (data) => window.api.products.printLabels(data as ProductLabelPrintRequest),
  downloadLabels: (data) => window.api.products.downloadLabels(data),
  getLowStock: () => window.api.products.getLowStock()
}
