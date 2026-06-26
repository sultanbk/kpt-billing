// ============================================================================
// KPT Billing - Quick Bill Search & Command Palette (Ctrl+K)
// Full-featured bill search with view, print, PDF, WhatsApp, return/exchange
// ============================================================================
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search,
  FileText,
  X,
  Calendar,
  User,
  Phone,
  IndianRupee,
  Printer,
  Download,
  MessageSquare,
  RotateCcw,
  Eye,
  ArrowLeft,
  ChevronRight,
  Clock,
  Hash,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { toast } from 'sonner'
import { EditBillDialog } from '../billing/EditBillDialog'
import type { Bill } from '@shared/types'
import { billingService } from '../../services/billing.service'
import { reportService } from '../../services/report.service'
import { whatsappService } from '../../services/whatsapp.service'

interface QuickBillSearchProps {
  open: boolean
  onClose: () => void
}

type Mode = 'list' | 'actions' | 'view'

interface Action {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  shortcut?: string
  disabled?: boolean
  color?: string
}

export function QuickBillSearch({ open, onClose }: QuickBillSearchProps): React.JSX.Element | null {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Bill[]>([])
  const [recentBills, setRecentBills] = useState<Bill[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [selectedActionIdx, setSelectedActionIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('list')
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [fullBill, setFullBill] = useState<Bill | null>(null)
  const [loadingBill, setLoadingBill] = useState(false)
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const bills = query.length >= 2 ? results : recentBills

  // Load recent bills when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIdx(0)
      setSelectedActionIdx(0)
      setMode('list')
      setSelectedBill(null)
      setFullBill(null)
      setShowReturnDialog(false)
      setTimeout(() => inputRef.current?.focus(), 50)
      billingService
        .getRecentBills(15)
        .then(setRecentBills)
        .catch(() => {})
    }
  }, [open])

  // Manage focus when switching modes
  useEffect(() => {
    if (!open) return
    if (mode === 'list') {
      setTimeout(() => inputRef.current?.focus(), 30)
    } else {
      setTimeout(() => panelRef.current?.focus(), 30)
    }
  }, [mode, open])

  const handleSearch = useCallback(async (term: string) => {
    setQuery(term)
    setMode('list')
    setSelectedIdx(0)
    if (term.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const found = await billingService.quickSearch(term)
      setResults(found)
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [])

  const getActions = useCallback(
    (bill: Bill): Action[] => [
      {
        id: 'view',
        label: 'View Bill Details',
        icon: Eye,
        description: 'View complete bill with items and totals',
        shortcut: 'V',
        color: 'text-blue-500'
      },
      {
        id: 'print',
        label: 'Print Receipt',
        icon: Printer,
        description: 'Print thermal receipt',
        shortcut: 'P',
        color: 'text-green-500'
      },
      {
        id: 'download',
        label: 'Download PDF',
        icon: Download,
        description: 'Generate and open PDF invoice',
        shortcut: 'D',
        color: 'text-purple-500'
      },
      {
        id: 'thermal',
        label: 'Download Thermal',
        icon: Download,
        description: 'Download thermal receipt image',
        shortcut: 'T',
        color: 'text-slate-500'
      },
      {
        id: 'whatsapp',
        label: 'Send via WhatsApp',
        icon: MessageSquare,
        description: bill.customerPhone
          ? `Send to ${bill.customerPhone}`
          : 'No phone number available',
        shortcut: 'W',
        disabled: !bill.customerPhone,
        color: 'text-emerald-500'
      },
      {
        id: 'return',
        label: 'Return / Exchange',
        icon: RotateCcw,
        description: 'Process return or exchange for this bill',
        shortcut: 'R',
        color: 'text-orange-500'
      }
    ],
    []
  )

  const openActions = useCallback((bill: Bill) => {
    setSelectedBill(bill)
    setSelectedActionIdx(0)
    setMode('actions')
  }, [])

  const downloadThermal = useCallback(async (bill: Bill) => {
    try {
      toast.loading('Preparing thermal receipt...', { id: 'qbs-thermal' })
      const full = await billingService.getById(bill.id)
      if (!full) throw new Error('missing bill')
      const base64 = await billingService.getThermalReceiptImage(full)
      if (!base64) throw new Error('missing buffer')
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'image/png' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `thermal-receipt-${full.billNumber || full.billNo}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Thermal receipt downloaded', { id: 'qbs-thermal' })
    } catch {
      toast.error('Failed to download thermal receipt', { id: 'qbs-thermal' })
    }
  }, [])

  const executeAction = useCallback(
    async (actionId: string, bill: Bill) => {
      switch (actionId) {
        case 'view': {
          setLoadingBill(true)
          setMode('view')
          try {
            const full = await billingService.getById(bill.id)
            setFullBill(full)
          } catch {
            toast.error('Failed to load bill details')
            setMode('actions')
          }
          setLoadingBill(false)
          break
        }
        case 'print': {
          try {
            toast.loading('Printing receipt...', { id: 'qbs-print' })
            await billingService.printReceipt(bill.id)
            toast.success('Receipt sent to printer', { id: 'qbs-print' })
          } catch {
            toast.error('Failed to print receipt', { id: 'qbs-print' })
          }
          break
        }
        case 'download': {
          try {
            toast.loading('Generating PDF...', { id: 'qbs-pdf' })
            const result = await billingService.generatePdfReceipt(bill.id)
            if (result.success && result.path) {
              await reportService.openFile(result.path)
              toast.success('PDF opened', { id: 'qbs-pdf' })
            }
          } catch {
            toast.error('Failed to generate PDF', { id: 'qbs-pdf' })
          }
          break
        }
        case 'thermal': {
          await downloadThermal(bill)
          break
        }
        case 'whatsapp': {
          if (bill.customerPhone) {
            try {
              toast.loading('Sending via WhatsApp...', { id: 'qbs-wa' })
              await whatsappService.sendBillReceipt(bill.id, bill.customerPhone)
              toast.success('Sent via WhatsApp', { id: 'qbs-wa' })
            } catch {
              toast.error('Failed to send via WhatsApp', { id: 'qbs-wa' })
            }
          }
          break
        }
        case 'return': {
          setShowReturnDialog(true)
          break
        }
      }
    },
    [downloadThermal]
  )

  const goBack = useCallback(() => {
    if (mode === 'view') {
      setMode('actions')
      setFullBill(null)
    } else if (mode === 'actions') {
      setMode('list')
      setSelectedBill(null)
    }
  }, [mode])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      // Don't handle keys when return dialog is open
      if (showReturnDialog) return

      if (mode === 'list') {
        if (e.key === 'ArrowDown' && bills.length > 0) {
          e.preventDefault()
          setSelectedIdx((i) => {
            const next = Math.min(i + 1, bills.length - 1)
            listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
            return next
          })
        } else if (e.key === 'ArrowUp' && bills.length > 0) {
          e.preventDefault()
          setSelectedIdx((i) => {
            const next = Math.max(i - 1, 0)
            listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
            return next
          })
        } else if ((e.key === 'Enter' || e.key === 'ArrowRight') && bills.length > 0) {
          e.preventDefault()
          openActions(bills[selectedIdx])
        } else if (e.key === 'Escape') {
          onClose()
        }
      } else if (mode === 'actions' && selectedBill) {
        const actions = getActions(selectedBill)
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedActionIdx((i) => {
            let next = i + 1
            while (next < actions.length && actions[next].disabled) next++
            return next < actions.length ? next : i
          })
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedActionIdx((i) => {
            let next = i - 1
            while (next >= 0 && actions[next].disabled) next--
            return next >= 0 ? next : i
          })
        } else if (e.key === 'Enter') {
          e.preventDefault()
          const action = actions[selectedActionIdx]
          if (!action.disabled) executeAction(action.id, selectedBill)
        } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
          e.preventDefault()
          goBack()
        } else {
          // Shortcut keys for actions
          const key = e.key.toUpperCase()
          const action = actions.find((a) => a.shortcut === key && !a.disabled)
          if (action) {
            e.preventDefault()
            executeAction(action.id, selectedBill)
          }
        }
      } else if (mode === 'view') {
        if (e.key === 'Escape' || e.key === 'ArrowLeft' || e.key === 'Backspace') {
          e.preventDefault()
          goBack()
        }
        if (selectedBill) {
          const key = e.key.toUpperCase()
          if (key === 'P') {
            e.preventDefault()
            executeAction('print', selectedBill)
          } else if (key === 'D') {
            e.preventDefault()
            executeAction('download', selectedBill)
          } else if (key === 'W' && selectedBill.customerPhone) {
            e.preventDefault()
            executeAction('whatsapp', selectedBill)
          }
        }
      }
    },
    [
      mode,
      bills,
      selectedIdx,
      selectedActionIdx,
      selectedBill,
      showReturnDialog,
      openActions,
      getActions,
      executeAction,
      goBack,
      onClose
    ]
  )

  if (!open) return null

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] ${showReturnDialog ? 'hidden' : ''}`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        {/* Search Panel */}
        <div
          ref={panelRef}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={`relative z-10 w-full rounded-xl border border-border bg-popover shadow-2xl outline-none transition-all duration-200 ${
            mode === 'view' ? 'max-w-3xl' : 'max-w-xl'
          }`}
        >
          {/* ---- Header ---- */}
          {mode === 'list' ? (
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search bills by number, customer, phone..."
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button onClick={() => handleSearch('')} className="rounded-md p-1 hover:bg-accent">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <button
                onClick={goBack}
                className="rounded-md p-1.5 hover:bg-accent transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold">
                    {selectedBill?.billNumber || selectedBill?.billNo}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedBill?.customerName || 'Walk-in Customer'}
                  </span>
                  <span className="text-xs font-semibold text-primary flex items-center gap-0.5">
                    <IndianRupee className="h-3 w-3" />
                    {formatCurrency(selectedBill?.grandTotal || 0).replace('₹', '')}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {mode === 'actions' ? 'Actions' : 'Details'}
              </span>
              <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* ---- Content ---- */}
          <div className="max-h-[55vh] overflow-auto">
            {/* LIST MODE */}
            {mode === 'list' && (
              <div className="p-1">
                {loading && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                )}

                {!loading && query.length >= 2 && results.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No bills found for &ldquo;{query}&rdquo;
                  </div>
                )}

                {!loading && bills.length > 0 && (
                  <>
                    {query.length < 2 && (
                      <div className="px-3 pt-2 pb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          Recent Bills
                        </span>
                      </div>
                    )}
                    <div ref={listRef}>
                      {bills.map((bill, idx) => (
                        <button
                          key={bill.id}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                            idx === selectedIdx ? 'bg-accent' : 'hover:bg-accent/50'
                          }`}
                          onClick={() => openActions(bill)}
                          onMouseEnter={() => setSelectedIdx(idx)}
                        >
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium font-mono text-xs">
                                {bill.billNumber || bill.billNo}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  bill.status === 'completed'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : bill.status === 'returned'
                                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {bill.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1 truncate">
                                <User className="h-3 w-3 shrink-0" />
                                {bill.customerName || 'Walk-in'}
                              </span>
                              {bill.customerPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  {bill.customerPhone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 shrink-0" />
                                {bill.date}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <div>
                              <div className="font-amount font-medium flex items-center gap-0.5">
                                <IndianRupee className="h-3 w-3" />
                                {formatCurrency(bill.grandTotal).replace('₹', '')}
                              </div>
                              <div className="text-[10px] text-muted-foreground capitalize">
                                {bill.paymentMode}
                              </div>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {!loading && query.length < 2 && recentBills.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    <div className="mb-2">Search for bills by number, customer, or phone</div>
                    <div className="text-xs opacity-60">No recent bills found</div>
                  </div>
                )}
              </div>
            )}

            {/* ACTIONS MODE */}
            {mode === 'actions' && selectedBill && (
              <div className="p-1">
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Quick Actions
                  </span>
                </div>
                {getActions(selectedBill).map((action, idx) => (
                  <button
                    key={action.id}
                    disabled={action.disabled}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      action.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : idx === selectedActionIdx
                          ? 'bg-accent'
                          : 'hover:bg-accent/50'
                    }`}
                    onClick={() => !action.disabled && executeAction(action.id, selectedBill)}
                    onMouseEnter={() => !action.disabled && setSelectedActionIdx(idx)}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg bg-accent/80 ${action.color || ''}`}
                    >
                      <action.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{action.label}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                    {action.shortcut && !action.disabled && (
                      <kbd className="rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70">
                        {action.shortcut}
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* VIEW MODE */}
            {mode === 'view' && (
              <div className="p-4">
                {loadingBill ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Loading bill details...
                  </div>
                ) : fullBill ? (
                  <div className="space-y-4">
                    {/* Bill header info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono font-semibold">
                            {fullBill.billNumber || fullBill.billNo}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              fullBill.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : fullBill.status === 'returned'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {fullBill.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {fullBill.date} at {fullBill.time}
                          </span>
                        </div>
                        {fullBill.salesmanName && (
                          <div className="text-xs text-muted-foreground">
                            Salesman: {fullBill.salesmanName}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{fullBill.customerName || 'Walk-in Customer'}</span>
                        </div>
                        {fullBill.customerPhone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{fullBill.customerPhone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {fullBill.paymentMode === 'cash' ? (
                            <Banknote className="h-3.5 w-3.5" />
                          ) : fullBill.paymentMode === 'upi' ? (
                            <Smartphone className="h-3.5 w-3.5" />
                          ) : (
                            <CreditCard className="h-3.5 w-3.5" />
                          )}
                          <span className="capitalize">{fullBill.paymentMode}</span>
                          {fullBill.paymentMode === 'upi' && fullBill.upiReference && (
                            <span className="text-xs text-muted-foreground/70">
                              Ref: {fullBill.upiReference}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Items table */}
                    {fullBill.items && fullBill.items.length > 0 && (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border">
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                Item
                              </th>
                              <th className="text-center px-2 py-2 font-medium text-muted-foreground">
                                Qty
                              </th>
                              <th className="text-right px-2 py-2 font-medium text-muted-foreground">
                                Price
                              </th>
                              <th className="text-right px-2 py-2 font-medium text-muted-foreground">
                                GST
                              </th>
                              <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {fullBill.items.map((item, i) => {
                              const isFullReturn =
                                item.returnedQty != null && item.returnedQty >= item.quantity
                              return (
                                <tr
                                  key={i}
                                  className={`border-b border-border/50 last:border-0 ${isFullReturn ? 'opacity-45 line-through' : ''}`}
                                >
                                  <td className="px-3 py-2">
                                    <div className="font-medium">{item.productName}</div>
                                    {item.sku && (
                                      <div className="text-muted-foreground">{item.sku}</div>
                                    )}
                                    {item.returnedQty != null && item.returnedQty > 0 && (
                                      <span className="text-[10px] text-orange-500 font-medium">
                                        (
                                        {isFullReturn ? 'Returned' : `${item.returnedQty} returned`}
                                        )
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    {item.quantity}
                                    {item.unit ? ` ${item.unit}` : ''}
                                  </td>
                                  <td className="px-2 py-2 text-right font-mono">
                                    {formatCurrency(item.price)}
                                  </td>
                                  <td className="px-2 py-2 text-right">{item.gstRate}%</td>
                                  <td className="px-3 py-2 text-right font-mono font-medium">
                                    {formatCurrency(item.total)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Totals */}
                    <div className="rounded-lg bg-muted/30 p-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Subtotal ({fullBill.totalItems} items, {fullBill.totalQty} qty)
                        </span>
                        <span className="font-mono">{formatCurrency(fullBill.subtotal)}</span>
                      </div>
                      {fullBill.discountAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Discount</span>
                          <span className="font-mono text-red-500">
                            -{formatCurrency(fullBill.discountAmount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">GST</span>
                        <span className="font-mono">{formatCurrency(fullBill.gstAmount)}</span>
                      </div>
                      {fullBill.roundOff !== 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Round Off</span>
                          <span className="font-mono">
                            {fullBill.roundOff > 0 ? '+' : ''}
                            {formatCurrency(fullBill.roundOff)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-semibold border-t border-border pt-1.5">
                        <span>Grand Total</span>
                        <span className="font-mono flex items-center gap-0.5">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {formatCurrency(fullBill.grandTotal).replace('₹', '')}
                        </span>
                      </div>
                    </div>

                    {/* Return history */}
                    {fullBill.returns && fullBill.returns.length > 0 && (
                      <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:border-orange-900/30 dark:bg-orange-950/20 p-3">
                        <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1.5">
                          <RotateCcw className="h-3 w-3" />
                          Returns / Exchanges
                        </div>
                        {fullBill.returns.map((ret, i) => (
                          <div key={i} className="text-xs space-y-0.5 mt-1.5 first:mt-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                  ret.type === 'return'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}
                              >
                                {ret.type}
                              </span>
                              <span className="font-mono font-medium">
                                {formatCurrency(ret.netAmount)}
                              </span>
                              <span className="text-muted-foreground">{ret.createdAt}</span>
                              {ret.newBillNo && (
                                <span className="text-muted-foreground">→ {ret.newBillNo}</span>
                              )}
                            </div>
                            <div className="text-muted-foreground pl-1">{ret.itemsSummary}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick action buttons in view mode */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => selectedBill && executeAction('print', selectedBill)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent/80 transition-colors"
                      >
                        <Printer className="h-3 w-3" /> Print
                        <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px] font-mono text-muted-foreground">
                          P
                        </kbd>
                      </button>
                      <button
                        onClick={() => selectedBill && executeAction('download', selectedBill)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent/80 transition-colors"
                      >
                        <Download className="h-3 w-3" /> PDF
                        <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px] font-mono text-muted-foreground">
                          D
                        </kbd>
                      </button>
                      <button
                        onClick={() => selectedBill && executeAction('thermal', selectedBill)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent/80 transition-colors"
                      >
                        <Download className="h-3 w-3" /> Thermal
                        <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px] font-mono text-muted-foreground">
                          T
                        </kbd>
                      </button>
                      {selectedBill?.customerPhone && (
                        <button
                          onClick={() => selectedBill && executeAction('whatsapp', selectedBill)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent/80 transition-colors"
                        >
                          <MessageSquare className="h-3 w-3" /> WhatsApp
                          <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px] font-mono text-muted-foreground">
                            W
                          </kbd>
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* ---- Footer ---- */}
          <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            {mode === 'list' && (
              <>
                <span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">↑↓</kbd> Navigate
                </span>
                <span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Enter</kbd> Open
                </span>
                <span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Esc</kbd> Close
                </span>
              </>
            )}
            {mode === 'actions' && (
              <>
                <span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">↑↓</kbd> Navigate
                </span>
                <span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Enter</kbd> Execute
                </span>
                <span>
                  or press <kbd className="rounded bg-muted px-1 py-0.5 font-mono">V</kbd>{' '}
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">P</kbd>{' '}
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">D</kbd>{' '}
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">T</kbd>{' '}
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">W</kbd>{' '}
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">R</kbd>
                </span>
                <span className="ml-auto">
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Esc</kbd> Back
                </span>
              </>
            )}
            {mode === 'view' && (
              <>
                <span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">P</kbd> Print
                </span>
                <span>
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">D</kbd> Download
                </span>
                {selectedBill?.customerPhone && (
                  <span>
                    <kbd className="rounded bg-muted px-1 py-0.5 font-mono">W</kbd> WhatsApp
                  </span>
                )}
                <span className="ml-auto">
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Esc</kbd> Back
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Return/Exchange Dialog */}
      {showReturnDialog && selectedBill && (
        <EditBillDialog
          open={showReturnDialog}
          onClose={() => {
            setShowReturnDialog(false)
            onClose()
          }}
          initialBillId={selectedBill.id}
        />
      )}
    </>
  )
}
