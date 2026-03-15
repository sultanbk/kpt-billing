// ============================================================================
// KPT Billing - Edit Bill Dialog (Return / Exchange)
// ============================================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../ui/dialog'
import {
  Search,
  RotateCcw,
  ArrowLeftRight,
  Minus,
  Plus,
  Package,
  AlertCircle,
  Check,
  FileText,
  Trash2,
  History,
  PackagePlus,
  Printer,
  Download,
  Smartphone
} from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { toast } from 'sonner'
import type {
  Bill,
  BillItem,
  Product,
  ReturnItem,
  ExchangeItem,
  BillReturnData,
  BillReturnResult
} from '@shared/types'

interface EditBillDialogProps {
  open: boolean
  onClose: () => void
  /** When set, auto-loads this bill and skips the search step */
  initialBillId?: number
}

type Step = 'search' | 'edit' | 'confirm' | 'done'
type Mode = 'return' | 'exchange'

export function EditBillDialog({
  open,
  onClose,
  initialBillId
}: EditBillDialogProps): React.JSX.Element {
  // Steps
  const [step, setStep] = useState<Step>('search')

  // Bill search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Bill[]>([])
  const [selectedBillIdx, setSelectedBillIdx] = useState(0)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const billListRef = useRef<HTMLDivElement>(null)

  // Selected bill
  const [bill, setBill] = useState<Bill | null>(null)
  const [returnedQtyMap, setReturnedQtyMap] = useState<Record<number, number>>({})
  const [returnHistory, setReturnHistory] = useState<Record<string, unknown>[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Return items state: keyed by bill_item id
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({})

  // Mode & reason
  const [mode, setMode] = useState<Mode>('return')
  const [reason, setReason] = useState('')
  const [refundMode, setRefundMode] = useState<'cash' | 'credit' | 'adjust'>('cash')

  // Exchange items
  const [exchangeItems, setExchangeItems] = useState<ExchangeItem[]>([])
  const [exSearchQuery, setExSearchQuery] = useState('')
  const [exSearchResults, setExSearchResults] = useState<Product[]>([])
  const [exSearchSelectedIdx, setExSearchSelectedIdx] = useState(0)
  const [showExSearch, setShowExSearch] = useState(false)

  // Processing
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<BillReturnResult | null>(null)

  // Reset everything when dialog opens/closes
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchQuery('')
      setSearchResults([])
      setSelectedBillIdx(0)
      setBill(null)
      setReturnQtys({})
      setMode('return')
      setReason('')
      setRefundMode('cash')
      setExchangeItems([])
      setExSearchQuery('')
      setExSearchResults([])
      setExSearchSelectedIdx(0)
      setResult(null)
      setReturnedQtyMap({})
      setReturnHistory([])
      setShowHistory(false)

      // If initialBillId is provided, auto-load that bill
      if (initialBillId) {
        setStep('search') // brief loading state
        window.api.billing.getById(initialBillId).then((full) => {
          if (full && full.items?.length) {
            // Use selectBill-like logic inline
            setBill(full)
            window.api.billing.getReturnedQtyMap(full.id).then(setReturnedQtyMap)
            window.api.billing.getReturnHistory(full.id).then(setReturnHistory)
            const qtys: Record<number, number> = {}
            for (const item of full.items) qtys[Number(item.id)] = 0
            setReturnQtys(qtys)
            // Default refund mode to match how the customer originally paid
            if (full.paymentMode === 'credit' && full.customerId) setRefundMode('credit')
            else setRefundMode('cash') // cash, UPI, card → refund in cash
            setStep('edit')
          } else {
            toast.error('Could not load bill details')
            setStep('search')
            setTimeout(() => searchRef.current?.focus(), 100)
          }
        })
      } else {
        setStep('search')
        setTimeout(() => searchRef.current?.focus(), 100)
      }
    }
  }, [open, initialBillId])

  // ---- Bill Search ----
  const handleBillSearch = useCallback(async (term: string) => {
    setSearchQuery(term)
    setSelectedBillIdx(0)
    if (term.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const bills = await window.api.billing.quickSearch(term)
      // Only show completed / partially returned bills
      setSearchResults(bills.filter((b) => b.status !== 'cancelled'))
    } catch {
      setSearchResults([])
    }
    setSearching(false)
  }, [])

  const selectBill = useCallback(async (b: Bill) => {
    // Load full bill with items
    const full = await window.api.billing.getById(b.id)
    if (!full || !full.items?.length) {
      toast.error('Could not load bill details')
      return
    }
    setBill(full)

    // Load already-returned quantities
    const qtyMap = await window.api.billing.getReturnedQtyMap(full.id)
    setReturnedQtyMap(qtyMap)

    // Load return history
    const history = await window.api.billing.getReturnHistory(full.id)
    setReturnHistory(history)

    // Init return qtys to 0
    const qtys: Record<number, number> = {}
    for (const item of full.items) {
      qtys[Number(item.id)] = 0
    }
    setReturnQtys(qtys)

    // Default refund mode to match how the customer originally paid
    if (full.paymentMode === 'credit' && full.customerId) setRefundMode('credit')
    else setRefundMode('cash') // cash, UPI, card → refund in cash

    setStep('edit')
  }, [])

  // ---- Exchange Product Search ----
  const handleExSearch = useCallback(async (term: string) => {
    setExSearchQuery(term)
    setExSearchSelectedIdx(0)
    if (term.length < 2) {
      setExSearchResults([])
      setShowExSearch(false)
      return
    }
    try {
      const products = await window.api.products.search(term)
      setExSearchResults(products.slice(0, 10))
      setShowExSearch(products.length > 0)
    } catch {
      setExSearchResults([])
    }
  }, [])

  const addExchangeItem = (product: Product): void => {
    // Check if already in exchange list
    const existing = exchangeItems.findIndex((e) => e.productId === product.id)
    if (existing >= 0) {
      const updated = [...exchangeItems]
      updated[existing].quantity += 1
      setExchangeItems(updated)
    } else {
      setExchangeItems([
        ...exchangeItems,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku || '',
          hsn: product.hsnCode || '',
          price: product.sellingPrice,
          quantity: 1,
          discount: 0,
          discountType: 'percentage',
          gstRate: product.gstRate
        }
      ])
    }
    setExSearchQuery('')
    setExSearchResults([])
    setShowExSearch(false)
  }

  const addCustomExchangeItem = (): void => {
    setExchangeItems([
      ...exchangeItems,
      {
        productId: null,
        productName: 'Custom Item',
        sku: '',
        hsn: '',
        price: 0,
        quantity: 1,
        discount: 0,
        discountType: 'percentage',
        gstRate: 0
      }
    ])
  }

  const updateExchangeQty = (idx: number, qty: number): void => {
    const updated = [...exchangeItems]
    updated[idx].quantity = Math.max(1, qty)
    setExchangeItems(updated)
  }

  const updateExchangePrice = (idx: number, price: number): void => {
    const updated = [...exchangeItems]
    updated[idx].price = Math.max(0, price)
    setExchangeItems(updated)
  }

  const updateExchangeDiscount = (idx: number, disc: number): void => {
    const updated = [...exchangeItems]
    updated[idx].discount = Math.max(0, disc)
    setExchangeItems(updated)
  }

  const updateExchangeName = (idx: number, name: string): void => {
    const updated = [...exchangeItems]
    updated[idx].productName = name
    setExchangeItems(updated)
  }

  const updateExchangeGst = (idx: number, gst: number): void => {
    const updated = [...exchangeItems]
    updated[idx].gstRate = Math.max(0, gst)
    setExchangeItems(updated)
  }

  const updateExchangeDiscType = (idx: number, type: 'percentage' | 'amount'): void => {
    const updated = [...exchangeItems]
    updated[idx].discountType = type
    updated[idx].discount = 0
    setExchangeItems(updated)
  }

  const removeExchangeItem = (idx: number): void => {
    setExchangeItems(exchangeItems.filter((_, i) => i !== idx))
  }

  // ---- Calculations ----
  // bill_items in DB only has cgst_rate & sgst_rate, not gst_rate.
  // mapRow produces cgstRate & sgstRate but NOT gstRate for bill items.
  const getItemGstRate = (item: BillItem): number => {
    if (item.gstRate != null && !isNaN(item.gstRate)) return item.gstRate
    return (item.cgstRate || 0) + (item.sgstRate || 0)
  }

  const calculateItemRefund = (item: BillItem, returnQty: number): number => {
    if (returnQty <= 0) return 0
    const lineTotal = item.price * returnQty
    let disc = 0
    const dt =
      item.discountType === 'percent'
        ? 'percentage'
        : item.discountType === 'flat'
          ? 'amount'
          : item.discountType
    if (dt === 'percentage') {
      disc = (lineTotal * (item.discount || 0)) / 100
    } else {
      // flat discount: proportion by qty
      const totalDiscountValue = item.discountAmount || item.discount || 0
      disc = item.quantity > 0 ? (totalDiscountValue / item.quantity) * returnQty : 0
    }
    const taxable = lineTotal - disc
    const gstRate = getItemGstRate(item)
    const gst = (taxable * gstRate) / 100
    return Math.round((taxable + gst) * 100) / 100
  }

  const totalReturnAmount =
    bill?.items?.reduce((sum, item) => {
      const qty = returnQtys[Number(item.id)] || 0
      return sum + calculateItemRefund(item, qty)
    }, 0) || 0

  const totalExchangeAmount = exchangeItems.reduce((sum, ei) => {
    const lineTotal = ei.price * ei.quantity
    let disc = 0
    if (ei.discountType === 'percentage') {
      disc = (lineTotal * ei.discount) / 100
    } else {
      disc = ei.discount
    }
    const taxable = lineTotal - disc
    const gst = (taxable * ei.gstRate) / 100
    return sum + taxable + gst
  }, 0)

  const netAmount = Math.round(totalExchangeAmount) - Math.round(totalReturnAmount)

  const hasReturnItems = Object.values(returnQtys).some((q) => q > 0)

  // ---- Submit ----
  const handleSubmit = async (): Promise<void> => {
    if (!bill) return
    if (!hasReturnItems) {
      toast.error('Please select at least one item to return')
      return
    }
    if (mode === 'exchange' && exchangeItems.length === 0) {
      toast.error(
        'Exchange mode requires at least one exchange item — add a product or switch to Return Only'
      )
      return
    }

    setProcessing(true)
    try {
      const returnItems: ReturnItem[] = (bill.items || [])
        .filter((item) => (returnQtys[Number(item.id)] || 0) > 0)
        .map((item) => ({
          billItemId: Number(item.id),
          productId: item.productId,
          productName: item.productName,
          originalQty: item.quantity,
          returnQty: returnQtys[Number(item.id)],
          rate: item.price,
          gstRate: getItemGstRate(item),
          refundAmount: calculateItemRefund(item, returnQtys[Number(item.id)])
        }))

      const data: BillReturnData = {
        originalBillId: bill.id,
        type: mode,
        reason: reason.trim() || 'Customer return',
        returnItems,
        exchangeItems: mode === 'exchange' ? exchangeItems : [],
        refundMode
      }

      const res = await window.api.billing.processReturn(data)
      if (res.success) {
        setResult(res)
        setStep('done')
        toast.success('Return processed successfully!')
      } else {
        toast.error((res as unknown as { error: string }).error || 'Failed to process return')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to process return')
    }
    setProcessing(false)
  }

  // ---- Render ----
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            {step === 'search' && 'Edit Bill — Search'}
            {step === 'edit' && `Edit Bill — ${bill?.billNumber || bill?.billNo}`}
            {step === 'confirm' && 'Confirm Return / Exchange'}
            {step === 'done' && (mode === 'exchange' ? 'Exchange Complete' : 'Return Complete')}
          </DialogTitle>
          <DialogDescription>
            {step === 'search' && 'Search for a bill by number, customer name, or phone'}
            {step === 'edit' && 'Select items to return and optionally add exchange items'}
            {step === 'confirm' && 'Review the return/exchange details before confirming'}
            {step === 'done' && 'The return has been processed successfully'}
          </DialogDescription>
        </DialogHeader>

        {/* ==================== STEP 1: SEARCH ==================== */}
        {step === 'search' && (
          <div className="flex-1 space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => handleBillSearch(e.target.value)}
                placeholder="Search by bill number, customer name, or phone..."
                className="pl-9 h-10"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setSelectedBillIdx((i) => {
                      const next = Math.min(i + 1, searchResults.length - 1)
                      billListRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
                      return next
                    })
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setSelectedBillIdx((i) => {
                      const next = Math.max(i - 1, 0)
                      billListRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
                      return next
                    })
                  } else if (e.key === 'Enter' && searchResults.length > 0) {
                    e.preventDefault()
                    selectBill(searchResults[selectedBillIdx])
                  }
                }}
              />
            </div>

            <ScrollArea className="h-[400px]">
              {searching && (
                <div className="text-center py-8 text-sm text-muted-foreground">Searching...</div>
              )}
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No bills found for &ldquo;{searchQuery}&rdquo;
                </div>
              )}
              <div ref={billListRef}>
                {searchResults.map((b, idx) => (
                  <button
                    key={b.id}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors border-b border-border/30 ${
                      idx === selectedBillIdx ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => selectBill(b)}
                    onMouseEnter={() => setSelectedBillIdx(idx)}
                  >
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium font-mono text-xs">
                          {b.billNumber || b.billNo}
                        </span>
                        <Badge
                          variant={b.status === 'completed' ? 'default' : 'secondary'}
                          className={`text-[10px] ${
                            b.status === 'completed'
                              ? 'bg-green-100 text-green-700 hover:bg-green-100'
                              : b.status === 'returned'
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {b.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{b.customerName || 'Walk-in'}</span>
                        <span>{b.date}</span>
                        <span>{b.totalItems} items</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-amount font-medium">{formatCurrency(b.grandTotal)}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">
                        {b.paymentMode}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* ==================== STEP 2: EDIT ==================== */}
        {step === 'edit' && bill && (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden py-1">
            {/* Bill Info Bar */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <div className="flex items-center gap-4">
                <span className="font-mono font-medium text-primary">
                  {bill.billNumber || bill.billNo}
                </span>
                <span>{bill.customerName || 'Walk-in'}</span>
                <span className="text-muted-foreground">{bill.date}</span>
                <span
                  className={`text-[11px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                    bill.paymentMode === 'credit'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : bill.paymentMode === 'upi'
                        ? 'bg-blue-100 text-blue-700'
                        : bill.paymentMode === 'card'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-green-100 text-green-700'
                  }`}
                >
                  {bill.paymentMode}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-amount font-medium">{formatCurrency(bill.grandTotal)}</span>
                {returnHistory.length > 0 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <History className="h-3 w-3" />
                    {returnHistory.length} prior return{returnHistory.length > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>

            {/* Return History (collapsible) */}
            {showHistory && returnHistory.length > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/10 p-3 space-y-1">
                <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">
                  Previous Returns
                </div>
                {returnHistory.map((rh, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-xs text-orange-600 dark:text-orange-300"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`uppercase font-bold tracking-wide ${
                          rh.type === 'exchange' ? 'text-blue-600 dark:text-blue-400' : ''
                        }`}
                      >
                        [{rh.type as string}]
                      </span>
                      <span>{rh.items_summary as string}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {(rh.return_amount as number) > 0 && (
                        <span className="font-amount">
                          Refund: {formatCurrency(rh.return_amount as number)}
                        </span>
                      )}
                      {(rh.exchange_amount as number) > 0 && (
                        <span className="font-amount text-blue-600">
                          Exchange: {formatCurrency(rh.exchange_amount as number)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMode('return')
                  // Reset adjust mode since it's only for exchange
                  if (refundMode === 'adjust') setRefundMode('cash')
                }}
                className={`flex items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                  mode === 'return'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                Return Only
              </button>
              <button
                onClick={() => setMode('exchange')}
                className={`flex items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                  mode === 'exchange'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Exchange
                {exchangeItems.length > 0 && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {exchangeItems.length}
                  </span>
                )}
              </button>

              <div className="flex-1" />

              {/* Refund Mode */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Refund via:</span>
                {(['cash', 'credit', 'adjust'] as const)
                  .filter((rm) => {
                    // Credit only available for customers with linked accounts
                    if (rm === 'credit' && !bill.customerId) return false
                    // If original was a credit sale, only allow credit refund (cannot give cash for credit owed)
                    if (rm === 'cash' && bill.paymentMode === 'credit') return false
                    // Net-off only makes sense in exchange mode
                    if (rm === 'adjust' && mode !== 'exchange') return false
                    return true
                  })
                  .map((rm) => (
                    <button
                      key={rm}
                      onClick={() => setRefundMode(rm)}
                      title={
                        rm === 'cash'
                          ? 'Give cash back to the customer'
                          : rm === 'credit'
                            ? 'Reduce the outstanding credit balance by the return amount'
                            : 'Net off: customer pays only the difference between exchange total and return value'
                      }
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        refundMode === rm
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-accent text-muted-foreground'
                      }`}
                    >
                      {rm === 'cash' ? 'Cash' : rm === 'credit' ? 'Credit Account' : 'Net Off'}
                    </button>
                  ))}
              </div>
            </div>

            {/* Two-pane layout for return items + exchange items */}
            <div className={`flex-1 overflow-hidden flex gap-3 ${mode === 'return' ? '' : ''}`}>
              {/* Left: Return Items */}
              <div
                className={`flex flex-col overflow-hidden ${mode === 'exchange' ? 'w-1/2' : 'w-full'}`}
              >
                <div className="flex items-center justify-between mb-1 px-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Return Items
                  </div>
                  <button
                    className="text-[10px] text-primary hover:underline font-medium"
                    onClick={() => {
                      const allMax: Record<number, number> = {}
                      for (const item of bill.items || []) {
                        const itemId = Number(item.id)
                        const alreadyReturned = returnedQtyMap[itemId] || 0
                        allMax[itemId] = Math.max(0, item.quantity - alreadyReturned)
                      }
                      setReturnQtys(allMax)
                    }}
                  >
                    Return All
                  </button>
                </div>
                <ScrollArea className="flex-1 rounded-lg border border-border">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b text-[11px] uppercase tracking-wider text-muted-foreground/70">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-2 py-2 text-right w-[80px]">Price</th>
                        <th className="px-2 py-2 text-center w-[80px]">Qty</th>
                        <th className="px-2 py-2 text-center w-[130px]">Return Qty</th>
                        <th className="px-2 py-2 text-right w-[90px]">Refund</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.items?.map((item) => {
                        const itemId = Number(item.id)
                        const alreadyReturned = returnedQtyMap[itemId] || 0
                        const available = item.quantity - alreadyReturned
                        const returnQty = returnQtys[itemId] || 0
                        const refund = calculateItemRefund(item, returnQty)

                        return (
                          <tr
                            key={item.id}
                            className={`border-b border-border/30 text-sm transition-colors ${
                              returnQty > 0 ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-accent/30'
                            } ${available <= 0 ? 'opacity-40' : ''}`}
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-sm leading-tight">
                                {item.productName}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {item.sku && <span>{item.sku} · </span>}
                                GST: {getItemGstRate(item)}%
                                {item.discount > 0 && (
                                  <span>
                                    {' '}
                                    · Disc: {item.discount}
                                    {item.discountType === 'percentage' ||
                                    item.discountType === 'percent'
                                      ? '%'
                                      : '₹'}
                                  </span>
                                )}
                              </div>
                              {alreadyReturned > 0 && (
                                <div className="text-[10px] text-orange-500 font-medium mt-0.5">
                                  {alreadyReturned} already returned
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2.5 text-right font-amount text-muted-foreground">
                              {formatCurrency(item.price)}
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <div className="font-medium">{item.quantity}</div>
                              {alreadyReturned > 0 && (
                                <div className="text-[10px] text-orange-500 font-medium">
                                  {available} left
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2.5">
                              {available > 0 ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0 rounded-lg"
                                    disabled={returnQty <= 0}
                                    onClick={() =>
                                      setReturnQtys({ ...returnQtys, [itemId]: returnQty - 1 })
                                    }
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={available}
                                    value={returnQty}
                                    onChange={(e) => {
                                      const v = Math.max(
                                        0,
                                        Math.min(available, parseInt(e.target.value) || 0)
                                      )
                                      setReturnQtys({ ...returnQtys, [itemId]: v })
                                    }}
                                    className="h-7 w-12 text-center text-sm px-1 font-semibold rounded-lg"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0 rounded-lg"
                                    disabled={returnQty >= available}
                                    onClick={() =>
                                      setReturnQtys({ ...returnQtys, [itemId]: returnQty + 1 })
                                    }
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  {available > 1 && (
                                    <button
                                      className="text-[10px] text-primary hover:underline ml-1"
                                      onClick={() =>
                                        setReturnQtys({ ...returnQtys, [itemId]: available })
                                      }
                                    >
                                      All
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-center text-muted-foreground">
                                  Fully returned
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2.5 text-right font-amount font-medium">
                              {returnQty > 0 ? (
                                <span className="text-red-600 dark:text-red-400">
                                  -{formatCurrency(refund)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              {/* Right: Exchange Items (only in exchange mode) */}
              {mode === 'exchange' && (
                <div className="w-1/2 flex flex-col overflow-hidden">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
                    Exchange Items (New)
                  </div>
                  <div className="flex-1 rounded-lg border border-border flex flex-col overflow-hidden">
                    {/* Product search for exchange */}
                    <div className="p-2 border-b border-border relative">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            value={exSearchQuery}
                            onChange={(e) => handleExSearch(e.target.value)}
                            onFocus={() => exSearchResults.length > 0 && setShowExSearch(true)}
                            onBlur={() => setTimeout(() => setShowExSearch(false), 200)}
                            placeholder="Search product to add..."
                            className="h-8 pl-8 text-sm"
                            onKeyDown={(e) => {
                              if (!showExSearch || exSearchResults.length === 0) return
                              if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                setExSearchSelectedIdx((i) =>
                                  Math.min(i + 1, exSearchResults.length - 1)
                                )
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                setExSearchSelectedIdx((i) => Math.max(i - 1, 0))
                              } else if (e.key === 'Enter') {
                                e.preventDefault()
                                addExchangeItem(exSearchResults[exSearchSelectedIdx])
                              } else if (e.key === 'Escape') {
                                setShowExSearch(false)
                              }
                            }}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 border-dashed border-primary/40 text-primary hover:bg-primary/5 shrink-0"
                          onClick={addCustomExchangeItem}
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                          Other
                        </Button>
                      </div>
                      {showExSearch && exSearchResults.length > 0 && (
                        <div className="absolute left-2 right-2 top-full z-50 mt-1 max-h-48 overflow-auto rounded-md border border-border bg-popover shadow-lg">
                          {exSearchResults.map((p, idx) => (
                            <button
                              key={p.id}
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                                idx === exSearchSelectedIdx ? 'bg-accent' : 'hover:bg-accent/50'
                              }`}
                              onMouseEnter={() => setExSearchSelectedIdx(idx)}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                addExchangeItem(p)
                              }}
                            >
                              <div>
                                <div className="font-medium">{p.name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {p.sku} · Stock: {p.stock}
                                </div>
                              </div>
                              <span className="font-amount text-sm">
                                {formatCurrency(p.sellingPrice)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Exchange items list */}
                    <ScrollArea className="flex-1">
                      {exchangeItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                          <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
                          <p className="text-sm">No exchange items added</p>
                          <p className="text-xs text-muted-foreground/60">Search products above</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/30">
                          {exchangeItems.map((ei, idx) => {
                            const lineTotal = ei.price * ei.quantity
                            let disc = 0
                            if (ei.discountType === 'percentage')
                              disc = (lineTotal * ei.discount) / 100
                            else disc = ei.discount
                            const taxable = lineTotal - disc
                            const gst = (taxable * ei.gstRate) / 100
                            const itemTotal = taxable + gst

                            return (
                              <div key={idx} className="px-3 py-2.5 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  {ei.productId === null ? (
                                    <Input
                                      value={ei.productName}
                                      onChange={(e) => updateExchangeName(idx, e.target.value)}
                                      placeholder="Enter item name"
                                      className="h-7 text-sm font-medium border-dashed border-primary/30 bg-primary/5 rounded-lg max-w-[200px]"
                                    />
                                  ) : (
                                    <div className="font-medium text-sm">{ei.productName}</div>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-destructive"
                                    onClick={() => removeExchangeItem(idx)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <Label className="text-[10px]">Qty</Label>
                                    <div className="flex items-center gap-0.5">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 w-6 p-0 rounded"
                                        onClick={() => updateExchangeQty(idx, ei.quantity - 1)}
                                      >
                                        <Minus className="h-2.5 w-2.5" />
                                      </Button>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={ei.quantity}
                                        onChange={(e) =>
                                          updateExchangeQty(idx, parseInt(e.target.value) || 1)
                                        }
                                        className="h-6 w-10 text-center text-xs px-0.5"
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 w-6 p-0 rounded"
                                        onClick={() => updateExchangeQty(idx, ei.quantity + 1)}
                                      >
                                        <Plus className="h-2.5 w-2.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Label className="text-[10px]">Price</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={ei.price || ''}
                                      onChange={(e) =>
                                        updateExchangePrice(idx, parseFloat(e.target.value) || 0)
                                      }
                                      className="h-6 w-20 text-xs font-amount text-right"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Label className="text-[10px]">
                                      <button
                                        onClick={() =>
                                          updateExchangeDiscType(
                                            idx,
                                            ei.discountType === 'percentage'
                                              ? 'amount'
                                              : 'percentage'
                                          )
                                        }
                                        className="text-[10px] text-primary hover:underline font-medium"
                                        title="Toggle between percentage and flat discount"
                                      >
                                        Disc{ei.discountType === 'percentage' ? '%' : '₹'}
                                      </button>
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={ei.discount || ''}
                                      onChange={(e) =>
                                        updateExchangeDiscount(idx, parseFloat(e.target.value) || 0)
                                      }
                                      className="h-6 w-14 text-xs text-right"
                                    />
                                  </div>
                                  {ei.productId === null && (
                                    <div className="flex items-center gap-1">
                                      <Label className="text-[10px]">GST%</Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={ei.gstRate || ''}
                                        onChange={(e) =>
                                          updateExchangeGst(idx, parseFloat(e.target.value) || 0)
                                        }
                                        className="h-6 w-14 text-xs text-right"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 text-right font-amount font-medium text-sm text-green-600">
                                    {formatCurrency(itemTotal)}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>

            {/* Reason Input */}
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground shrink-0">
                Reason <span className="text-muted-foreground/50">(optional)</span>
              </Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Customer didn't like the color, defective product..."
                className="h-8 text-sm flex-1"
              />
            </div>

            {/* Summary Bar */}
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-muted/80 to-muted/40 px-4 py-3 border border-border/50">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Return</div>
                  <div className="font-amount font-semibold text-red-600">
                    -{formatCurrency(totalReturnAmount)}
                  </div>
                </div>
                {mode === 'exchange' && (
                  <>
                    <div className="text-muted-foreground/40">+</div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Exchange</div>
                      <div className="font-amount font-semibold text-green-600">
                        {formatCurrency(Math.round(totalExchangeAmount))}
                      </div>
                    </div>
                    <div className="text-muted-foreground/40">=</div>
                  </>
                )}
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">
                    {netAmount > 0 ? 'Customer Pays' : netAmount < 0 ? 'Refund' : 'Net'}
                  </div>
                  <div
                    className={`font-amount font-bold text-lg ${
                      netAmount > 0
                        ? 'text-green-600'
                        : netAmount < 0
                          ? 'text-red-600'
                          : 'text-foreground'
                    }`}
                  >
                    {netAmount > 0
                      ? formatCurrency(netAmount)
                      : netAmount < 0
                        ? `-${formatCurrency(Math.abs(netAmount))}`
                        : formatCurrency(0)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (initialBillId) {
                      onClose() // Close dialog if opened from bill history
                    } else {
                      setStep('search')
                      setBill(null)
                    }
                  }}
                  className="rounded-lg"
                >
                  {initialBillId ? 'Cancel' : 'Back'}
                </Button>
                <Button
                  disabled={
                    !hasReturnItems ||
                    (mode === 'exchange' && exchangeItems.length === 0) ||
                    processing
                  }
                  onClick={() => setStep('confirm')}
                  className="gap-2 rounded-lg shadow-md min-w-[140px]"
                  title={
                    !hasReturnItems
                      ? 'Select at least one item to return'
                      : mode === 'exchange' && exchangeItems.length === 0
                        ? 'Add at least one exchange item'
                        : 'Review before confirming'
                  }
                >
                  {mode === 'exchange' && hasReturnItems && exchangeItems.length === 0
                    ? 'Add Exchange Items'
                    : 'Review'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== STEP 3: CONFIRM ==================== */}
        {step === 'confirm' && bill && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden py-2 gap-3">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-3 pr-1">
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div className="text-sm font-semibold">
                    Bill: {bill.billNumber || bill.billNo}
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>
                      Customer:{' '}
                      <span className="font-medium text-foreground">
                        {bill.customerName || 'Walk-in'}
                      </span>
                    </span>
                    <span>
                      Mode:{' '}
                      <span className="font-medium text-foreground">
                        {mode === 'return' ? 'Return Only' : 'Exchange'}
                      </span>
                    </span>
                    {netAmount < 0 && (
                      <span>
                        Refund via:{' '}
                        <span className="font-medium text-foreground">
                          {refundMode === 'cash'
                            ? 'Cash to Customer'
                            : refundMode === 'credit'
                              ? 'Credit Account'
                              : 'Net Off'}
                        </span>
                      </span>
                    )}
                  </div>
                  {reason && <div className="text-sm text-muted-foreground">Reason: {reason}</div>}

                  <Separator />

                  {/* Return items summary */}
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    Items Being Returned
                  </div>
                  {bill.items
                    ?.filter((item) => (returnQtys[Number(item.id)] || 0) > 0)
                    .map((item) => {
                      const qty = returnQtys[Number(item.id)]
                      const refund = calculateItemRefund(item, qty)
                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.productName} × {qty}
                          </span>
                          <span className="font-amount text-red-600">
                            -{formatCurrency(refund)}
                          </span>
                        </div>
                      )
                    })}

                  {/* Exchange items summary */}
                  {mode === 'exchange' && exchangeItems.length > 0 && (
                    <>
                      <Separator />
                      <div className="text-xs font-semibold text-muted-foreground uppercase">
                        Exchange Items (New)
                      </div>
                      {exchangeItems.map((ei, idx) => {
                        const lineTotal = ei.price * ei.quantity
                        let disc = 0
                        if (ei.discountType === 'percentage') disc = (lineTotal * ei.discount) / 100
                        else disc = ei.discount
                        const taxable = lineTotal - disc
                        const gst = (taxable * ei.gstRate) / 100
                        return (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>
                              {ei.productName} × {ei.quantity}
                            </span>
                            <span className="font-amount text-green-600">
                              {formatCurrency(taxable + gst)}
                            </span>
                          </div>
                        )
                      })}
                    </>
                  )}

                  <Separator />

                  {/* Net summary */}
                  <div className="flex justify-between font-semibold text-base">
                    <span>Return Refund</span>
                    <span className="font-amount text-red-600">
                      -{formatCurrency(totalReturnAmount)}
                    </span>
                  </div>
                  {mode === 'exchange' && (
                    <div className="flex justify-between font-semibold text-base">
                      <span>Exchange Total</span>
                      <span className="font-amount text-green-600">
                        {formatCurrency(Math.round(totalExchangeAmount))}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                    <span>
                      {netAmount > 0
                        ? 'Customer Pays'
                        : netAmount < 0
                          ? 'Refund to Customer'
                          : 'Net Settlement'}
                    </span>
                    <span
                      className={`font-amount ${
                        netAmount > 0 ? 'text-green-600' : netAmount < 0 ? 'text-red-600' : ''
                      }`}
                    >
                      {netAmount > 0
                        ? formatCurrency(netAmount)
                        : netAmount < 0
                          ? `-${formatCurrency(Math.abs(netAmount))}`
                          : formatCurrency(0)}
                    </span>
                  </div>

                  {/* Cashier action instruction */}
                  <div
                    className={`mt-1 p-3 rounded-lg text-sm font-medium ${
                      netAmount > 0
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                        : netAmount < 0
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                          : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {netAmount > 0 && (
                      <span>
                        🏪 Collect <strong>{formatCurrency(netAmount)}</strong> from customer
                      </span>
                    )}
                    {netAmount < 0 &&
                      (refundMode === 'credit' ? (
                        <span>
                          📋 Credit account will be reduced by{' '}
                          <strong>{formatCurrency(Math.abs(netAmount))}</strong> — no cash needed
                        </span>
                      ) : (
                        <span>
                          💵 Pay back <strong>{formatCurrency(Math.abs(netAmount))}</strong> cash to
                          customer
                        </span>
                      ))}
                    {netAmount === 0 && (
                      <span>✅ Equal value exchange — no money exchange needed</span>
                    )}
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-3">
                  <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    This action cannot be undone. Stock will be adjusted and bill records will be
                    updated.
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-border pt-3">
              <Button variant="outline" onClick={() => setStep('edit')} className="rounded-lg">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={processing}
                className="gap-2 rounded-lg shadow-md min-w-[180px]"
              >
                {processing ? (
                  'Processing...'
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirm {mode === 'return' ? 'Return' : 'Exchange'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ==================== STEP 4: DONE ==================== */}
        {step === 'done' && result && (
          <div className="flex-1 flex flex-col items-center justify-center py-6 gap-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-lg font-semibold">
              {mode === 'exchange' ? 'Exchange' : 'Return'} Processed Successfully!
            </div>

            <div className="rounded-xl border border-border p-4 space-y-2 w-full max-w-sm">
              {/* Original bill reference */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Original Bill</span>
                <span className="font-mono text-xs">{bill?.billNumber || bill?.billNo}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Return Amount</span>
                <span className="font-amount text-red-600">
                  -{formatCurrency(result.returnAmount)}
                </span>
              </div>
              {result.exchangeAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exchange Amount</span>
                  <span className="font-amount text-green-600">
                    {formatCurrency(result.exchangeAmount)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>
                  {result.netAmount > 0 ? 'Customer Pays' : result.netAmount < 0 ? 'Refund' : 'Net'}
                </span>
                <span
                  className={`font-amount ${
                    result.netAmount > 0
                      ? 'text-green-600'
                      : result.netAmount < 0
                        ? 'text-red-600'
                        : ''
                  }`}
                >
                  {result.netAmount > 0
                    ? formatCurrency(result.netAmount)
                    : result.netAmount < 0
                      ? `-${formatCurrency(Math.abs(result.netAmount))}`
                      : formatCurrency(0)}
                </span>
              </div>
              {result.newBillNo && (
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">New Exchange Bill</span>
                  <span className="font-mono text-primary">{result.newBillNo}</span>
                </div>
              )}
            </div>

            {/* ---- Print / PDF / WhatsApp Actions ---- */}
            <div className="w-full max-w-sm space-y-2">
              {/* For exchange: print the NEW exchange bill */}
              {result.newBillId && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 rounded-lg"
                    onClick={async () => {
                      try {
                        await window.api.billing.printReceipt(result.newBillId!)
                        toast.success('Exchange bill sent to printer')
                      } catch {
                        toast.error('Print failed')
                      }
                    }}
                  >
                    <Printer className="h-4 w-4" />
                    Print Exchange Bill
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 rounded-lg"
                    onClick={async () => {
                      try {
                        const r = await window.api.billing.generatePdfReceipt(result.newBillId!)
                        if (r.success && r.path) toast.success(`Saved: ${r.path}`)
                        else toast.error('PDF generation failed')
                      } catch {
                        toast.error('PDF generation failed')
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              )}

              {/* Always offer to print/download the original bill (which is now updated) */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 rounded-lg"
                  onClick={async () => {
                    try {
                      await window.api.billing.printReceipt(bill!.id)
                      toast.success('Original bill receipt sent to printer')
                    } catch {
                      toast.error('Print failed')
                    }
                  }}
                >
                  <Printer className="h-4 w-4" />
                  {result.newBillId ? 'Reprint Original' : 'Print Receipt'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 rounded-lg"
                  onClick={async () => {
                    try {
                      const r = await window.api.billing.generatePdfReceipt(bill!.id)
                      if (r.success && r.path) toast.success(`Saved: ${r.path}`)
                      else toast.error('PDF generation failed')
                    } catch {
                      toast.error('PDF generation failed')
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                  {result.newBillId ? 'Download Original' : 'Download PDF'}
                </Button>
              </div>

              {/* WhatsApp receipt if customer has phone */}
              {bill?.customerPhone &&
                bill.customerPhone.length >= 10 &&
                (result.newBillId ? (
                  // Exchange: offer WhatsApp for both original (with return) and new exchange bill
                  <>
                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-lg text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/10"
                      onClick={async () => {
                        try {
                          const res = await window.api.whatsapp.sendBillReceipt(
                            bill!.id,
                            bill!.customerPhone!
                          )
                          if (!res.success) toast.error(res.error || 'Failed to open WhatsApp')
                          else toast.success('WhatsApp opened — original bill')
                        } catch {
                          toast.error('Failed to open WhatsApp')
                        }
                      }}
                    >
                      <Smartphone className="h-4 w-4" />
                      WhatsApp: Original Bill (with return)
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-lg text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/10"
                      onClick={async () => {
                        try {
                          const res = await window.api.whatsapp.sendBillReceipt(
                            result.newBillId!,
                            bill!.customerPhone!
                          )
                          if (!res.success) toast.error(res.error || 'Failed to open WhatsApp')
                          else toast.success('WhatsApp opened — exchange bill')
                        } catch {
                          toast.error('Failed to open WhatsApp')
                        }
                      }}
                    >
                      <Smartphone className="h-4 w-4" />
                      WhatsApp: Exchange Bill (new items)
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-lg text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/10"
                    onClick={async () => {
                      try {
                        const res = await window.api.whatsapp.sendBillReceipt(
                          bill!.id,
                          bill!.customerPhone!
                        )
                        if (!res.success) toast.error(res.error || 'Failed to open WhatsApp')
                        else toast.success('WhatsApp opened')
                      } catch {
                        toast.error('Failed to open WhatsApp')
                      }
                    }}
                  >
                    <Smartphone className="h-4 w-4" />
                    Send via WhatsApp to {bill.customerPhone}
                  </Button>
                ))}
            </div>

            <Button onClick={onClose} className="mt-2 rounded-lg min-w-[120px]">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
