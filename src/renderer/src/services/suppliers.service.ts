import type { Supplier, SupplierFormData } from '@shared/types'

export interface SuppliersService {
  search: (query: string) => Promise<Supplier[]>
  getCities: () => Promise<string[]>
  create: (data: SupplierFormData) => Promise<Supplier>
}

export const suppliersService: SuppliersService = {
  search: (query) => window.api.suppliers.search(query),
  getCities: () => window.api.suppliers.getCities(),
  create: (data) => window.api.suppliers.create(data)
}
