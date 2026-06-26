import type { Purchase, PurchaseCreateData } from '@shared/types'

type PurchaseFilters = {
  dateFrom?: string
  dateTo?: string
  supplierId?: number
  city?: string
  page?: number
  pageSize?: number
}

type PurchaseListResponse = {
  data: Purchase[]
  total: number
  page: number
  pageSize: number
}

export interface PurchasesService {
  getAll: (filters?: PurchaseFilters) => Promise<PurchaseListResponse>
  getById: (id: number) => Promise<Purchase | null>
  create: (data: PurchaseCreateData) => Promise<Purchase>
  delete: (id: number) => Promise<boolean>
  onCreated: (handler: () => void) => () => void
}

export const purchasesService: PurchasesService = {
  getAll: (filters) => window.api.purchases.getAll(filters),
  getById: (id) => window.api.purchases.getById(id) as Promise<Purchase | null>,
  create: (data) => window.api.purchases.create(data),
  delete: (id) => window.api.purchases.delete(id),
  onCreated: (handler) => window.api.purchases.onCreated(handler)
}
