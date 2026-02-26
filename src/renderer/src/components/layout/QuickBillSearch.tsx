// ============================================================================
// KPT Billing - Quick Bill Search (Ctrl+K)
// Global command-palette style search for bills
// ============================================================================
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, FileText, X, Calendar, User, Phone, IndianRupee } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import type { Bill } from '@shared/types'

interface QuickBillSearchProps {
  open: boolean
  onClose: () => void
}

export function QuickBillSearch({ open, onClose }: QuickBillSearchProps): React.JSX.Element | null {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Bill[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleSearch = useCallback(async (term: string) => {
    setQuery(term)
    if (term.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const bills = await window.api.billing.quickSearch(term)
      setResults(bills)
      setSelectedIdx(0)
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [])

  const handleDownloadPdf = async (bill: Bill): Promise<void> => {
    try {
      const result = await window.api.billing.generatePdfReceipt(bill.id)
      if (result.success) {
        await window.api.report.openFile(result.path)
      }
    } catch { /* ignore */ }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      handleDownloadPdf(results[selectedIdx])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Search Panel */}
      <div className="relative z-10 w-full max-w-xl rounded-xl border border-border bg-popover shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search bills by number, customer, phone, or date..."
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-auto p-1">
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No bills found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              <div className="mb-2">Type at least 2 characters to search</div>
              <div className="text-xs space-y-1">
                <div>Try: bill number, customer name, phone, or date (YYYY-MM-DD)</div>
              </div>
            </div>
          )}

          {results.map((bill, idx) => (
            <button
              key={bill.id}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                idx === selectedIdx ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
              onClick={() => handleDownloadPdf(bill)}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium font-mono text-xs">
                    {bill.billNumber || bill.billNo}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    bill.status === 'completed' ? 'bg-green-100 text-green-700' :
                    bill.status === 'returned' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {bill.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {bill.customerName || 'Walk-in'}
                  </span>
                  {bill.customerPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {bill.customerPhone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {bill.date}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-amount font-medium flex items-center gap-0.5">
                  <IndianRupee className="h-3 w-3" />
                  {formatCurrency(bill.grandTotal).replace('₹', '')}
                </div>
                <div className="text-[10px] text-muted-foreground capitalize">
                  {bill.paymentMode}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <span><kbd className="rounded bg-muted px-1 py-0.5 font-mono">↑↓</kbd> Navigate</span>
          <span><kbd className="rounded bg-muted px-1 py-0.5 font-mono">Enter</kbd> Download PDF</span>
          <span><kbd className="rounded bg-muted px-1 py-0.5 font-mono">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
