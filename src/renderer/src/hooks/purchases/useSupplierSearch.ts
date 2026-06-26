import type { KeyboardEvent } from 'react'
import type { Supplier } from '@shared/types'
import { useSearchLookup } from '../useSearchLookup'

type UseSupplierSearchOptions = {
  searchSuppliers: (query: string) => Promise<Supplier[]>
  onSelect: (supplier: Supplier) => void
}

export function useSupplierSearch({ searchSuppliers, onSelect }: UseSupplierSearchOptions): {
  query: string
  results: Supplier[]
  showResults: boolean
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  setShowResults: (show: boolean) => void
  handleQueryChange: (query: string) => Promise<void>
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  selectSupplier: (supplier: Supplier) => void
  setQuery: (query: string) => void
  clearResults: () => void
} {
  const lookup = useSearchLookup<Supplier>({
    search: searchSuppliers,
    onSelect,
    getQueryOnSelect: (supplier) => supplier.name
  })

  return {
    ...lookup,
    selectSupplier: lookup.selectResult
  }
}
