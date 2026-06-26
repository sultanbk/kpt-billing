import type { KeyboardEvent } from 'react'
import type { Product } from '@shared/types'
import { useSearchLookup } from '../useSearchLookup'

type UseProductSearchOptions = {
  searchProducts: (query: string) => Promise<Product[]>
  onSelect: (product: Product) => void
}

export function useProductSearch({ searchProducts, onSelect }: UseProductSearchOptions): {
  query: string
  results: Product[]
  showResults: boolean
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  setShowResults: (show: boolean) => void
  handleQueryChange: (query: string) => Promise<void>
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  selectResult: (product: Product) => void
  setQuery: (query: string) => void
  clearResults: () => void
} {
  return useSearchLookup<Product>({
    search: searchProducts,
    onSelect,
    maxResults: 10,
    enableKeyboard: true,
    clearOnSelect: true
  })
}
