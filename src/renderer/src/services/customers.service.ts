import type { Customer, CustomerFormData } from '@shared/types'

export interface CustomersService {
  getAll: () => Promise<Customer[]>
  getWithCredit: () => Promise<Customer[]>
  getTotalCredit: () => Promise<number>
  getById: (id: number) => Promise<Customer | null>
  search: (query: string) => Promise<Customer[]>
  create: (data: CustomerFormData) => Promise<Customer>
  update: (id: number, data: CustomerFormData) => Promise<Customer>
  getTopByRevenue: (limit: number) => Promise<Record<string, unknown>[]>
  getFrequency: () => Promise<Record<string, unknown>[]>
  getCreditRisk: () => Promise<Record<string, unknown>[]>
  getCreditAging: () => Promise<Record<string, unknown>[]>
  getCreditAgingSummary: () => Promise<Record<string, unknown>>
}

export const customersService: CustomersService = {
  getAll: () => window.api.customers.getAll(),
  getWithCredit: () => window.api.customers.getWithCredit(),
  getTotalCredit: () => window.api.customers.getTotalCredit(),
  getById: (id) => window.api.customers.getById(id),
  search: (query) => window.api.customers.search(query),
  create: (data) => window.api.customers.create(data),
  update: (id, data) => window.api.customers.update(id, data),
  getTopByRevenue: (limit) => window.api.customers.getTopByRevenue(limit),
  getFrequency: () => window.api.customers.getFrequency(),
  getCreditRisk: () => window.api.customers.getCreditRisk(),
  getCreditAging: () => window.api.customers.getCreditAging(),
  getCreditAgingSummary: () => window.api.customers.getCreditAgingSummary()
}
