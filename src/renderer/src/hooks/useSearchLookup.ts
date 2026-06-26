import { useCallback, useState, useRef, useMemo } from 'react'
import type { KeyboardEvent } from 'react'

// A simple debounce implementation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<F extends (...args: any[]) => void | Promise<void>>(
  func: F,
  waitFor: number
): (...args: Parameters<F>) => Promise<void> {
  let timeout: NodeJS.Timeout | null = null

  const debounced = (...args: Parameters<F>): Promise<void> => {
    return new Promise((resolve) => {
      if (timeout) {
        clearTimeout(timeout)
      }
      timeout = setTimeout(() => {
        Promise.resolve(func(...args)).then(() => resolve())
      }, waitFor)
    })
  }

  return debounced
}

type UseSearchLookupOptions<T> = {
  search: (query: string) => Promise<T[]>
  onSelect: (item: T) => void
  minQueryLength?: number
  maxResults?: number
  enableKeyboard?: boolean
  clearOnSelect?: boolean
  debounceMs?: number
  getQueryOnSelect?: (item: T) => string
}

export function useSearchLookup<T>({
  search,
  onSelect,
  minQueryLength = 1,
  maxResults,
  enableKeyboard = false,
  clearOnSelect = false,
  debounceMs = 300,
  getQueryOnSelect
}: UseSearchLookupOptions<T>): {
  query: string
  results: T[]
  showResults: boolean
  selectedIndex: number
  loading: boolean
  setSelectedIndex: (index: number) => void
  setShowResults: (show: boolean) => void
  handleQueryChange: (query: string) => Promise<void>
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  selectResult: (item: T) => void
  setQuery: (query: string) => void
  clearResults: () => void
} {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  // Ref to track the latest search request to prevent race conditions
  const searchCounter = useRef(0)

  const clearResults = useCallback((): void => {
    setResults([])
    setShowResults(false)
    setSelectedIndex(0)
    setLoading(false)
  }, [])

  const debouncedSearch = useMemo(
    () =>
      debounce(async (searchQuery: string, currentSearchId: number) => {
        // If the search ID has changed, this is a stale request.
        if (currentSearchId !== searchCounter.current) {
          return
        }

        try {
          const found = await search(searchQuery)

          // Double-check after the await.
          if (currentSearchId !== searchCounter.current) {
            return
          }

          const sliced = typeof maxResults === 'number' ? found.slice(0, maxResults) : found
          setResults(sliced)
          setShowResults(sliced.length > 0)
          setSelectedIndex(0)
        } catch (err) {
          console.error('Search failed:', err)
          clearResults()
        } finally {
          if (currentSearchId === searchCounter.current) {
            setLoading(false)
          }
        }
      }, debounceMs),
    [search, maxResults, clearResults, debounceMs]
  )

  const handleQueryChange = useCallback(
    async (nextQuery: string): Promise<void> => {
      setQuery(nextQuery)
      if (nextQuery.length < minQueryLength) {
        clearResults()
        return
      }

      setLoading(true)
      // Increment the counter for each new query change.
      searchCounter.current += 1
      await debouncedSearch(nextQuery, searchCounter.current)
    },
    [minQueryLength, clearResults, debouncedSearch]
  )

  const selectResult = useCallback(
    (item: T): void => {
      onSelect(item)
      if (clearOnSelect) {
        setQuery('')
      } else if (getQueryOnSelect) {
        setQuery(getQueryOnSelect(item))
      }
      setShowResults(false)
      setSelectedIndex(0)
    },
    [clearOnSelect, getQueryOnSelect, onSelect]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (!enableKeyboard) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((idx) => Math.min(idx + 1, results.length - 1))
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((idx) => Math.max(idx - 1, 0))
        return
      }

      if (event.key === 'Enter' && results.length > 0) {
        event.preventDefault()
        if (results[selectedIndex]) {
          selectResult(results[selectedIndex])
        }
      }
    },
    [enableKeyboard, results, selectedIndex, selectResult]
  )

  return {
    query,
    results,
    showResults,
    selectedIndex,
    loading,
    setSelectedIndex,
    setShowResults,
    handleQueryChange,
    handleKeyDown,
    selectResult,
    setQuery,
    clearResults
  }
}
