// ============================================================================
// KPT Billing - Bulk Bill Dialog
// Generate the same bill for multiple customers at once
// Features: per-customer payment mode, inline customer add, print all, WhatsApp
// ============================================================================
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { Separator } from '../ui/separator'
import {
  Search,
  Users,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Printer,
  CreditCard,
  Smartphone,
  Banknote,
  User,
  Copy,
  UserPlus,
  MessageCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '../../lib/utils'
import type { BillItem, BillPayment, BillCreateData, Customer, Bill } from '@shared/types'
import { billingService } from '../../services/billing.service'
import { customersService } from '../../services/customers.service'
import { productsService } from '../../services/products.service'
import { whatsappService } from '../../services/whatsapp.service'

type PaymentMode = 'cash' | 'upi' | 'card' | 'credit'

interface BulkBillDialogProps {
  open: boolean
  onClose: () => void
  items: BillItem[]
  discount: number
  discountType: 'percentage' | 'amount'
  grandTotal: number
  onAllDone: () => void
}

type BillResult = {
  customer: Customer
  paymentMode: PaymentMode
  status: 'pending' | 'creating' | 'done' | 'error'
  bill?: Bill
  error?: string
}

const PAYMENT_MODES: { id: PaymentMode; label: string; icon: typeof Banknote }[] = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'credit', label: 'Credit', icon: User }
]

export function BulkBillDialog({
  open,
  onClose,
  items,
  discount,
  discountType,
  grandTotal,
  onAllDone
}: BulkBillDialogProps): React.JSX.Element {
  // Steps: 'select' â†’ 'review' â†’ 'processing' â†’ 'done'
  const [step, setStep] = useState<'select' | 'review' | 'processing' | 'done'>('select')

  // Customer selection
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([])
  const [highlightIdx, setHighlightIdx] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Per-customer payment mode (default: cash)
  const [defaultPaymentMode, setDefaultPaymentMode] = useState<PaymentMode>('cash')
  const [customerPaymentModes, setCustomerPaymentModes] = useState<Record<number, PaymentMode>>({})

  // Quick-add customer
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [addingCustomer, setAddingCustomer] = useState(false)
  const newCustNameRef = useRef<HTMLInputElement>(null)

  // Processing & results
  const [results, setResults] = useState<BillResult[]>([])
  const [processingIdx, setProcessingIdx] = useState(0)

  // Done screen
  const [printingAll, setPrintingAll] = useState(false)

  // Stock warnings for bulk
  const [stockWarnings, setStockWarnings] = useState<string[]>([])

  const checkStockAvailability = useCallback(async (): Promise<string[]> => {
    const warnings: string[] = []
    for (const item of items) {
      if (!item.productId) continue
      try {
        const product = await productsService.getById(item.productId)
        if (product) {
          const totalNeeded = item.quantity * selectedCustomers.length
          if (product.stock < totalNeeded) {
            warnings.push(
              `${item.productName}: need ${totalNeeded}, only ${product.stock} in stock`
            )
          }
        }
      } catch {
        warnings.push(`${item.productName}: could not verify current stock`)
      }
    }
    return warnings
  }, [items, selectedCustomers.length])

  // Helper: get payment mode for a customer
  const getPaymentMode = useCallback(
    (customerId: number): PaymentMode => {
      return customerPaymentModes[customerId] || defaultPaymentMode
    },
    [customerPaymentModes, defaultPaymentMode]
  )

  // Set per-customer payment mode
  const setCustomerPaymentMode = useCallback((customerId: number, mode: PaymentMode) => {
    setCustomerPaymentModes((prev) => ({ ...prev, [customerId]: mode }))
  }, [])

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('select')
      setSearchQuery('')
      setSearchResults([])
      setSelectedCustomers([])
      setHighlightIdx(0)
      setDefaultPaymentMode('cash')
      setCustomerPaymentModes({})
      setShowQuickAdd(false)
      setNewCustName('')
      setNewCustPhone('')
      setAddingCustomer(false)
      setResults([])
      setProcessingIdx(0)
      setPrintingAll(false)
      setTimeout(() => searchRef.current?.focus(), 150)
    }
  }, [open])

  // Search customers
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.trim().length < 1) {
      setSearchResults([])
      return
    }
    try {
      const res = await customersService.search(query.trim())
      setSearchResults(res as Customer[])
      setHighlightIdx(0)
    } catch {
      setSearchResults([])
    }
  }, [])

  const toggleCustomer = useCallback((customer: Customer) => {
    setSelectedCustomers((prev) => {
      const exists = prev.find((c) => c.id === customer.id)
      if (exists) return prev.filter((c) => c.id !== customer.id)
      return [...prev, customer]
    })
  }, [])

  const removeCustomer = useCallback((id: number) => {
    setSelectedCustomers((prev) => prev.filter((c) => c.id !== id))
    setCustomerPaymentModes((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const isSelected = useCallback(
    (id: number) => {
      return selectedCustomers.some((c) => c.id === id)
    },
    [selectedCustomers]
  )

  // Keyboard nav in search results
  const handleSearchKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(i + 1, searchResults.length - 1))
      const items = listRef.current?.querySelectorAll('[data-customer-row]')
      items?.[Math.min(highlightIdx + 1, searchResults.length - 1)]?.scrollIntoView({
        block: 'nearest'
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, 0))
      const items = listRef.current?.querySelectorAll('[data-customer-row]')
      items?.[Math.max(highlightIdx - 1, 0)]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault()
      toggleCustomer(searchResults[highlightIdx])
    }
  }

  // Quick-add new customer
  const handleQuickAdd = async (): Promise<void> => {
    if (!newCustName.trim() || addingCustomer) return
    setAddingCustomer(true)
    try {
      const created = await customersService.create({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        customerType: 'regular'
      })
      setSelectedCustomers((prev) => [...prev, created as Customer])
      toast.success(`"${created.name}" added & selected`)
      setNewCustName('')
      setNewCustPhone('')
      setShowQuickAdd(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add customer')
    } finally {
      setAddingCustomer(false)
    }
  }

  // Apply default payment mode to all selected customers
  const applyDefaultToAll = useCallback((mode: PaymentMode) => {
    setDefaultPaymentMode(mode)
    setCustomerPaymentModes({})
  }, [])

  // Generate all bills
  const handleGenerate = async (): Promise<void> => {
    if (selectedCustomers.length === 0) return

    const warnings = await checkStockAvailability()
    setStockWarnings(warnings)
    if (warnings.length > 0) {
      toast.error('Resolve insufficient stock before generating bulk bills')
      setStep('review')
      return
    }

    setStep('processing')
    const billResults: BillResult[] = selectedCustomers.map((c) => ({
      customer: c,
      paymentMode: getPaymentMode(c.id),
      status: 'pending' as const
    }))
    setResults(billResults)

    for (let i = 0; i < billResults.length; i++) {
      setProcessingIdx(i)
      billResults[i] = { ...billResults[i], status: 'creating' }
      setResults([...billResults])

      try {
        const customer = billResults[i].customer
        const mode = billResults[i].paymentMode
        const payment: BillPayment = {
          mode,
          amount: grandTotal,
          received: grandTotal,
          change: 0,
          reference: '',
          cashAmount: mode === 'cash' ? grandTotal : 0,
          upiAmount: mode === 'upi' ? grandTotal : 0,
          cardAmount: mode === 'card' ? grandTotal : 0,
          creditAmount: mode === 'credit' ? grandTotal : 0
        }

        const billData: BillCreateData = {
          items: items.map((item) => ({
            productId: item.productId || null,
            productName: item.productName,
            sku: item.sku,
            hsn: item.hsn,
            price: item.price,
            quantity: item.quantity,
            unit: item.unit,
            discount: item.discount,
            discountType: item.discountType,
            gstRate: item.gstRate
          })),
          customerName: customer.name,
          customerPhone: customer.phone,
          customerId: customer.id,
          discount,
          discountType,
          payment
        }

        const bill = await billingService.createBill(billData)
        billResults[i] = { ...billResults[i], status: 'done', bill }
      } catch (err: unknown) {
        billResults[i] = {
          ...billResults[i],
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed'
        }
      }
      setResults([...billResults])
    }

    setStep('done')
  }

  // Print all successful bills
  const handlePrintAll = async (): Promise<void> => {
    const doneBills = results.filter((r) => r.status === 'done' && r.bill)
    if (doneBills.length === 0) return
    setPrintingAll(true)
    let successCount = 0
    for (let i = 0; i < doneBills.length; i++) {
      try {
        const printed = await billingService.printReceipt(doneBills[i].bill!.id)
        if (printed) successCount++
      } catch {
        /* continue */
      }
      if (i < doneBills.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
    setPrintingAll(false)
    if (successCount === doneBills.length) {
      toast.success(`Printed ${doneBills.length} bills`)
    } else {
      toast.error(`Printed ${successCount}/${doneBills.length} bills. Check printer status.`)
    }
  }

  // WhatsApp share for a bill
  const handleWhatsApp = async (billId: number, phone: string): Promise<void> => {
    try {
      const res = await whatsappService.sendBillReceipt(billId, phone)
      if (!res.success) toast.error(res.error || 'Failed to open WhatsApp')
    } catch {
      toast.error('Failed to open WhatsApp')
    }
  }

  const doneCount = results.filter((r) => r.status === 'done').length
  const errorCount = results.filter((r) => r.status === 'error').length

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && step !== 'processing') onClose()
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        {/* ===== Step 1: Select Customers ===== */}
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5 text-primary" />
                Bulk Bill — Select Customers
              </DialogTitle>
              <DialogDescription>
                {items.length} items • {formatCurrency(grandTotal)} per bill
              </DialogDescription>
            </DialogHeader>

            <div
              className="flex-1 min-h-0 overflow-y-auto pr-1"
              style={{ maxHeight: 'calc(90vh - 160px)' }}
            >
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search customers by name or phone..."
                    className="pl-9 h-10"
                  />
                </div>

                {/* Search results dropdown */}
                {searchResults.length > 0 && searchQuery.trim() && (
                  <div
                    ref={listRef}
                    className="border rounded-xl overflow-hidden max-h-[180px] overflow-y-auto bg-card"
                  >
                    {searchResults.map((customer, idx) => (
                      <div
                        key={customer.id}
                        data-customer-row
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors border-b border-border/40 last:border-0 ${
                          idx === highlightIdx ? 'bg-accent' : 'hover:bg-accent/50'
                        } ${isSelected(customer.id) ? 'bg-primary/5' : ''}`}
                        onClick={() => toggleCustomer(customer)}
                        onMouseEnter={() => setHighlightIdx(idx)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected(customer.id)}
                          readOnly
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{customer.name}</div>
                          <div className="text-xs text-muted-foreground">{customer.phone}</div>
                        </div>
                        {customer.currentBalance > 0 && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            Bal: {formatCurrency(customer.currentBalance)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick-add new customer */}
                <div className="space-y-2">
                  <button
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    onClick={() => {
                      setShowQuickAdd(!showQuickAdd)
                      if (!showQuickAdd) setTimeout(() => newCustNameRef.current?.focus(), 100)
                    }}
                  >
                    {showQuickAdd ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    <UserPlus className="h-3.5 w-3.5" />
                    Add New Customer
                  </button>
                  {showQuickAdd && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl border border-primary/20 bg-primary/5">
                      <Input
                        ref={newCustNameRef}
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        placeholder="Name *"
                        className="h-8 text-sm flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newCustName.trim()) handleQuickAdd()
                        }}
                      />
                      <Input
                        type="tel"
                        value={newCustPhone}
                        onChange={(e) =>
                          setNewCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                        }
                        placeholder="Phone"
                        className="h-8 text-sm w-28"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newCustName.trim()) handleQuickAdd()
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-8 gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                        disabled={!newCustName.trim() || addingCustomer}
                        onClick={handleQuickAdd}
                      >
                        {addingCustomer ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        Add
                      </Button>
                    </div>
                  )}
                </div>

                {/* Selected customers */}
                {selectedCustomers.length > 0 && (
                  <div className="border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        Selected Customers ({selectedCustomers.length})
                      </span>
                      <button
                        className="text-xs text-destructive hover:underline font-medium"
                        onClick={() => {
                          setSelectedCustomers([])
                          setCustomerPaymentModes({})
                        }}
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="p-1.5 space-y-1">
                      {selectedCustomers.map((c, idx) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5 text-sm"
                        >
                          <span className="text-[10px] text-muted-foreground font-mono w-5 shrink-0">
                            {idx + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground">{c.phone}</div>
                          </div>
                          {/* Per-customer payment mode toggle */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            {PAYMENT_MODES.map((mode) => {
                              const active = getPaymentMode(c.id) === mode.id
                              return (
                                <button
                                  key={mode.id}
                                  title={mode.label}
                                  className={`rounded-md p-1 transition-all ${
                                    active
                                      ? 'bg-primary/15 text-primary'
                                      : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent'
                                  }`}
                                  onClick={() => setCustomerPaymentMode(c.id, mode.id)}
                                >
                                  <mode.icon className="h-3 w-3" />
                                </button>
                              )
                            })}
                          </div>
                          <button
                            onClick={() => removeCustomer(c.id)}
                            className="rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Default payment mode */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Default Payment Mode
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PAYMENT_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-2 text-xs font-medium transition-all ${
                          defaultPaymentMode === mode.id
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border/60 hover:bg-accent'
                        }`}
                        onClick={() => applyDefaultToAll(mode.id)}
                      >
                        <mode.icon className="h-3.5 w-3.5" />
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Per bill</span>
                    <span className="font-amount font-semibold">{formatCurrency(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customers</span>
                    <span className="font-semibold">{selectedCustomers.length}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total</span>
                    <span className="font-amount gradient-text">
                      {formatCurrency(grandTotal * selectedCustomers.length)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={selectedCustomers.length === 0}
                onClick={async () => {
                  const warnings = await checkStockAvailability()
                  setStockWarnings(warnings)
                  setStep('review')
                }}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Review ({selectedCustomers.length} bills)
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ===== Step 2: Review ===== */}
        {step === 'review' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5 text-primary" />
                Confirm Bulk Bill
              </DialogTitle>
              <DialogDescription>
                {selectedCustomers.length} bills — {formatCurrency(grandTotal)} each ={' '}
                {formatCurrency(grandTotal * selectedCustomers.length)}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 space-y-3">
              {/* Stock warnings */}
              {stockWarnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-3 space-y-1">
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Insufficient stock for {selectedCustomers.length} bills
                  </div>
                  {stockWarnings.map((w, i) => (
                    <div key={i} className="text-xs text-amber-600 dark:text-amber-300 pl-5">
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Items summary */}
              <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Items in each bill</div>
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="truncate flex-1">
                      {item.productName} — {item.quantity}
                    </span>
                    <span className="font-amount shrink-0 ml-2">{formatCurrency(item.total)}</span>
                  </div>
                ))}
                <Separator className="my-1" />
                <div className="flex justify-between text-sm font-bold">
                  <span>Grand Total</span>
                  <span className="font-amount">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Payment mode badge */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Default Payment:</span>
                <Badge variant="outline" className="capitalize">
                  {defaultPaymentMode}
                </Badge>
              </div>

              {/* Customer list with payment modes */}
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">
                  Customers ({selectedCustomers.length})
                </div>
                <ScrollArea className="max-h-[180px]">
                  <div className="space-y-1">
                    {selectedCustomers.map((c, idx) => {
                      const mode = getPaymentMode(c.id)
                      const ModeIcon = PAYMENT_MODES.find((m) => m.id === mode)?.icon || Banknote
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2 text-sm"
                        >
                          <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                          <span className="font-medium flex-1 truncate">{c.name}</span>
                          <Badge
                            variant="outline"
                            className="gap-1 text-[10px] capitalize shrink-0"
                          >
                            <ModeIcon className="h-3 w-3" />
                            {mode}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={stockWarnings.length > 0}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Generate {selectedCustomers.length} Bills
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ===== Step 3: Processing ===== */}
        {step === 'processing' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Generating Bills...
              </DialogTitle>
              <DialogDescription>
                {processingIdx + 1} of {results.length}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0">
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-1.5 p-1">
                  {results.map((r, idx) => (
                    <div
                      key={r.customer.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-all ${
                        r.status === 'creating'
                          ? 'border-primary/40 bg-primary/5'
                          : r.status === 'done'
                            ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10'
                            : r.status === 'error'
                              ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10'
                              : 'border-border/40'
                      }`}
                    >
                      <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                      <span className="flex-1 truncate font-medium">{r.customer.name}</span>
                      <Badge variant="outline" className="text-[9px] capitalize shrink-0">
                        {r.paymentMode}
                      </Badge>
                      {r.status === 'pending' && (
                        <span className="text-xs text-muted-foreground">Waiting</span>
                      )}
                      {r.status === 'creating' && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {r.status === 'done' && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {r.bill?.billNumber}
                        </span>
                      )}
                      {r.status === 'error' && (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Failed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((processingIdx + 1) / results.length) * 100}%` }}
              />
            </div>
          </>
        )}

        {/* ===== Step 4: Done ===== */}
        {step === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Bulk Bills Complete
              </DialogTitle>
              <DialogDescription>
                {doneCount} of {results.length} bills created successfully
                {errorCount > 0 && ` â€¢ ${errorCount} failed`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0">
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1.5 p-1">
                  {results.map((r, idx) => (
                    <div
                      key={r.customer.id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        r.status === 'done'
                          ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10'
                          : 'border-red-200 bg-red-50/50 dark:bg-red-900/10'
                      }`}
                    >
                      <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{r.customer.name}</span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {r.paymentMode}
                        </span>
                      </div>
                      {r.status === 'done' && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-green-600 font-mono">
                            {r.bill?.billNumber}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Print"
                            onClick={async () => {
                              if (!r.bill) return
                              try {
                                const printed = await billingService.printReceipt(r.bill.id)
                                if (printed) {
                                  toast.success(`Bill ${r.bill.billNumber} printed successfully`)
                                } else {
                                  toast.error(
                                    'Printer did not accept the job. Check printer status.'
                                  )
                                }
                              } catch {
                                toast.error('Print failed')
                              }
                            }}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          {r.customer.phone && !r.customer.phone.startsWith('__NOPHONE__') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="WhatsApp"
                              onClick={() => r.bill && handleWhatsApp(r.bill.id, r.customer.phone)}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                      {r.status === 'error' && (
                        <span className="text-xs text-destructive shrink-0">{r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Summary card */}
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800 p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Total Billed</div>
              <div className="text-2xl font-bold font-amount text-green-700 dark:text-green-400">
                {formatCurrency(grandTotal * doneCount)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{doneCount} bills</div>
            </div>

            <DialogFooter className="flex-row gap-2 sm:justify-between">
              <div className="flex gap-2">
                {doneCount > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={printingAll}
                    onClick={handlePrintAll}
                  >
                    {printingAll ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Printer className="h-3.5 w-3.5" />
                    )}
                    Print All ({doneCount})
                  </Button>
                )}
              </div>
              <Button
                onClick={() => {
                  onAllDone()
                  onClose()
                }}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
