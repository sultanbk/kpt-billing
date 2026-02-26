import { useEffect, useRef, useState, useCallback } from 'react'
import { useBillingStore } from '../stores/billing.store'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { ScrollArea } from '../components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../components/ui/dialog'
import {
  Search,
  Trash2,
  Minus,
  Plus,
  ShoppingCart,
  PauseCircle,
  PlayCircle,
  Printer,
  X,
  IndianRupee,
  CreditCard,
  Smartphone,
  Banknote,
  User,
  UserPlus,
  PackagePlus
} from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { toast } from 'sonner'
import type { Product, BillPayment, BillItem, BillCreateData, Customer } from '@shared/types'

export default function BillingPage(): React.JSX.Element {
  const store = useBillingStore()
  const searchRef = useRef<HTMLInputElement>(null)
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showHeldBills, setShowHeldBills] = useState(false)
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false)
  const [selectedResultIdx, setSelectedResultIdx] = useState(0)

  // Custom shortcut settings
  const [shortcutOther, setShortcutOther] = useState('Alt+O')
  const [shortcutNewCustomer, setShortcutNewCustomer] = useState('Alt+N')

  // Load custom shortcut settings
  useEffect(() => {
    window.api.settings.getAll().then((all: Record<string, string>) => {
      if (all.shortcut_addOther) setShortcutOther(all.shortcut_addOther)
      if (all.shortcut_newCustomer) setShortcutNewCustomer(all.shortcut_newCustomer)
    }).catch(() => {})
  }, [])

  // Barcode scanner detection
  const scanBufferRef = useRef('')
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastKeypressRef = useRef(0)

  // Focus search on mount and F2
  useEffect(() => {
    searchRef.current?.focus()
    store.loadHeldBills()
  }, [])

  // Barcode scanner global listener
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      const isSearchBar = target === searchRef.current
      // Only intercept when focus is on the search bar or the page body
      if (!isSearchBar && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      const now = Date.now()

      // If Enter and we have a barcode-length buffer
      if (e.key === 'Enter' && scanBufferRef.current.length >= 4) {
        const timeSinceLastKey = now - lastKeypressRef.current
        // Only treat as barcode if keys came fast (scanner speed)
        if (timeSinceLastKey < 100) {
          e.preventDefault()
          e.stopPropagation()
          const barcode = scanBufferRef.current.trim()
          scanBufferRef.current = ''
          // Clear the search field if it has the partial scan
          setSearchQuery('')
          setSearchResults([])
          setShowResults(false)
          // Direct barcode lookup
          window.api.products.getByBarcode(barcode).then((product) => {
            if (product) {
              store.addItem(product)
              toast.success(`Scanned: ${product.name}`)
            } else {
              toast.warning(`No product for barcode: ${barcode}`)
            }
          })
          return
        }
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const elapsed = now - lastKeypressRef.current
        lastKeypressRef.current = now
        if (elapsed > 200) scanBufferRef.current = ''
        scanBufferRef.current += e.key
        if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
        scanTimerRef.current = setTimeout(() => { scanBufferRef.current = '' }, 300)
      }
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    // Helper to check if a KeyboardEvent matches a shortcut string like "Alt+O"
    const matchesShortcut = (e: KeyboardEvent, shortcut: string): boolean => {
      const parts = shortcut.split('+')
      const key = parts[parts.length - 1].toLowerCase()
      const needAlt = parts.includes('Alt')
      const needCtrl = parts.includes('Ctrl')
      const needShift = parts.includes('Shift')
      return (
        e.key.toLowerCase() === key &&
        e.altKey === needAlt &&
        e.ctrlKey === needCtrl &&
        e.shiftKey === needShift &&
        !e.metaKey
      )
    }

    const handler = (e: KeyboardEvent): void => {
      // F11: Payment
      if (e.key === 'F11' && store.items.length > 0) {
        e.preventDefault()
        setShowPayment(true)
      }
      // F6: Hold bill
      if (e.key === 'F6' && store.items.length > 0) {
        e.preventDefault()
        store.holdBill()
        toast.info('Bill held')
      }
      // F8: Recall held bill
      if (e.key === 'F8') {
        e.preventDefault()
        setShowHeldBills(true)
      }
      // Custom shortcut: Add Other (custom) item
      if (matchesShortcut(e, shortcutOther)) {
        e.preventDefault()
        store.addCustomItem()
        toast.success('Custom item added — edit name & price in cart')
        setTimeout(() => {
          const priceInputs = document.querySelectorAll<HTMLInputElement>('input[placeholder="₹ Price"]')
          if (priceInputs.length > 0) {
            priceInputs[priceInputs.length - 1].focus()
            priceInputs[priceInputs.length - 1].select()
          }
        }, 100)
      }
      // Custom shortcut: Quick add new customer
      if (matchesShortcut(e, shortcutNewCustomer)) {
        e.preventDefault()
        setShowQuickAddCustomer(true)
      }
      // F9: Clear cart
      if (e.key === 'F9') {
        e.preventDefault()
        store.clearCart()
      }
      // Escape: Focus search
      if (e.key === 'Escape') {
        setShowResults(false)
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store.items.length, shortcutOther, shortcutNewCustomer])

  // Search products
  const handleSearch = useCallback(
    async (query: string): Promise<void> => {
      setSearchQuery(query)
      if (query.length < 1) {
        setSearchResults([])
        setShowResults(false)
        return
      }
      try {
        const results = await window.api.products.search(query)
        setSearchResults(results.slice(0, 10))
        setShowResults(true)
        setSelectedResultIdx(0)
      } catch {
        setSearchResults([])
      }
    },
    []
  )

  const handleSearchKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedResultIdx((i) => Math.min(i + 1, searchResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedResultIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault()
      addProduct(searchResults[selectedResultIdx])
    }
  }

  const addProduct = (product: Product): void => {
    if (product.stock <= 0) {
      toast.warning(`${product.name} is out of stock`)
    }
    store.addItem(product)
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
    searchRef.current?.focus()
  }

  return (
    <div className="flex h-full">
      {/* Left: Product Search + Cart */}
      <div className="flex flex-1 flex-col border-r border-border">
        {/* Search Bar */}
        <div className="relative border-b border-border bg-muted/30 p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                placeholder="Search product or scan barcode... (Esc to focus)"
                className="pl-10 h-11 text-base rounded-xl border-border/60 bg-background shadow-sm focus:shadow-md transition-shadow"
                autoFocus
              />
            </div>
            <Button
              variant="outline"
              className="h-11 gap-1.5 rounded-xl border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all shrink-0"
              onClick={() => {
                store.addCustomItem()
                toast.success('Custom item added — edit name & price in cart')
                setTimeout(() => {
                  const priceInputs = document.querySelectorAll<HTMLInputElement>('input[placeholder="₹ Price"]')
                  if (priceInputs.length > 0) {
                    priceInputs[priceInputs.length - 1].focus()
                    priceInputs[priceInputs.length - 1].select()
                  }
                }, 100)
              }}
            >
              <PackagePlus className="h-4 w-4" />
              <span className="hidden sm:inline">+ Other</span>
              <kbd className="ml-0.5 rounded bg-muted px-1 py-0.5 text-[9px] font-mono hidden sm:inline">{shortcutOther}</kbd>
            </Button>
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-80 overflow-auto rounded-xl border border-border bg-popover shadow-xl">
              {searchResults.map((product, idx) => (
                <button
                  key={product.id}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-all ${
                    idx === selectedResultIdx ? 'bg-primary/8 text-foreground' : 'hover:bg-accent/50'
                  } ${idx > 0 ? 'border-t border-border/40' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    addProduct(product)
                  }}
                  onMouseEnter={() => setSelectedResultIdx(idx)}
                >
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {product.sku} • {product.category} • Stock: <span className={product.stock <= 5 ? 'text-orange-500 font-medium' : ''}>{product.stock}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-amount font-semibold">
                      {formatCurrency(product.sellingPrice)}
                    </div>
                    {product.stock <= 0 && (
                      <Badge variant="destructive" className="text-[10px] mt-0.5">Out of stock</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart Table */}
        <div className="flex-1 overflow-auto">
          {store.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <div className="rounded-full bg-muted/50 p-6 mb-4">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <p className="text-lg font-semibold text-foreground/60">Cart is empty</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Search and add products to start billing</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm border-b border-border/50">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  <th className="px-4 py-2.5 w-[40px]">#</th>
                  <th className="px-2 py-2.5">Product</th>
                  <th className="px-2 py-2.5 text-right w-[100px]">Price</th>
                  <th className="px-2 py-2.5 text-center w-[130px]">Qty</th>
                  <th className="px-2 py-2.5 text-right w-[80px]">Disc</th>
                  <th className="px-2 py-2.5 text-right w-[100px]">Total</th>
                  <th className="px-2 py-2.5 w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {store.items.map((item, idx) => (
                  <CartRow
                    key={item.id}
                    item={item}
                    index={idx}
                    onUpdateQty={(qty) => store.updateItemQuantity(item.id, qty)}
                    onUpdateDiscount={(disc, type) =>
                      store.updateItemDiscount(item.id, disc, type)
                    }
                    onUpdatePrice={(price) => store.updateItemPrice(item.id, price)}
                    onUpdateName={(name) => store.updateItemName(item.id, name)}
                    onRemove={() => store.removeItem(item.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center gap-2 border-t border-border bg-muted/20 px-4 py-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => store.holdBill()}
            disabled={store.items.length === 0}
            className="gap-1.5 rounded-lg"
          >
            <PauseCircle className="h-4 w-4" />
            Hold <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px] font-mono">F6</kbd>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHeldBills(true)}
            className="gap-1.5 rounded-lg"
          >
            <PlayCircle className="h-4 w-4" />
            Recall <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px] font-mono">F8</kbd>
            {store.heldBills.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] bg-primary/10 text-primary">
                {store.heldBills.length}
              </Badge>
            )}
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => store.clearCart()}
            disabled={store.items.length === 0}
            className="gap-1.5 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
            Clear <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px] font-mono">F9</kbd>
          </Button>
        </div>
      </div>

      {/* Right: Bill Summary */}
      <div className="flex w-[340px] min-w-[300px] flex-col bg-card/80">
        {/* Customer */}
        <CustomerSection
          customerName={store.customerName}
          customerPhone={store.customerPhone}
          customerId={store.customerId}
          onSelect={(name, phone, id) => store.setCustomer(name, phone, id)}
          openQuickAdd={showQuickAddCustomer}
          onQuickAddOpened={() => setShowQuickAddCustomer(false)}
        />

        {/* Summary */}
        <div className="flex-1 overflow-auto p-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items</span>
              <span>{store.totalItems} ({store.items.length} lines)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-amount">{formatCurrency(store.subtotal)}</span>
            </div>
            {store.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span className="font-amount">-{formatCurrency(store.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GST</span>
              <span className="font-amount">{formatCurrency(store.totalGst)}</span>
            </div>

            <Separator />

            {/* Bill Discount */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Bill Discount</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  value={store.discount || ''}
                  onChange={(e) =>
                    store.setDiscount(parseFloat(e.target.value) || 0, store.discountType)
                  }
                  className="h-8 text-sm"
                  placeholder="0"
                />
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={store.discountType}
                  onChange={(e) =>
                    store.setDiscount(
                      store.discount,
                      e.target.value as 'percentage' | 'amount'
                    )
                  }
                >
                  <option value="percentage">%</option>
                  <option value="amount">₹</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Grand Total + Pay Button */}
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Grand Total</span>
            <span className="text-2xl font-bold font-amount gradient-text">
              {formatCurrency(store.grandTotal)}
            </span>
          </div>
          <Button
            className="w-full gap-2 text-base h-12 rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
            size="lg"
            disabled={store.items.length === 0}
            onClick={() => setShowPayment(true)}
          >
            <IndianRupee className="h-5 w-5" />
            Pay & Print
            <kbd className="ml-2 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-mono">F11</kbd>
          </Button>
        </div>
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={showPayment}
        onClose={() => setShowPayment(false)}
        grandTotal={store.grandTotal}
        items={store.items}
        customerName={store.customerName}
        customerPhone={store.customerPhone}
        customerId={store.customerId}
        discount={store.discount}
        discountType={store.discountType}
        onBillCreated={() => {
          store.clearCart()
          searchRef.current?.focus()
        }}
      />

      {/* Held Bills Dialog */}
      <HeldBillsDialog
        open={showHeldBills}
        onClose={() => setShowHeldBills(false)}
        heldBills={store.heldBills}
        onRecall={(id) => {
          store.recallBill(id)
          setShowHeldBills(false)
        }}
        onDelete={(id) => store.deleteHeldBill(id)}
      />
    </div>
  )
}

// ---- Cart Row ----
function CartRow({
  item,
  index,
  onUpdateQty,
  onUpdateDiscount,
  onUpdatePrice,
  onUpdateName,
  onRemove
}: {
  item: BillItem
  index: number
  onUpdateQty: (qty: number) => void
  onUpdateDiscount: (disc: number, type: 'percentage' | 'amount') => void
  onUpdatePrice: (price: number) => void
  onUpdateName: (name: string) => void
  onRemove: () => void
}): React.JSX.Element {
  const isCustom = !item.productId
  return (
    <tr className="border-b border-border/30 text-sm group hover:bg-accent/30 transition-colors">
      <td className="px-4 py-2.5 text-muted-foreground/60 text-xs font-mono">{index + 1}</td>
      <td className="px-2 py-2.5">
        {isCustom ? (
          <Input
            value={item.productName}
            onChange={(e) => onUpdateName(e.target.value)}
            className="h-7 text-sm font-medium border-dashed border-primary/30 bg-primary/5 rounded-lg"
            placeholder="Enter item name"
          />
        ) : (
          <>
            <div className="font-medium leading-tight">{item.productName}</div>
            <div className="text-[11px] text-muted-foreground/60">{item.sku}</div>
          </>
        )}
      </td>
      <td className="px-2 py-2.5 text-right">
        {isCustom ? (
          <Input
            type="number"
            min={0}
            value={item.price || ''}
            onChange={(e) => onUpdatePrice(parseFloat(e.target.value) || 0)}
            className="h-7 w-24 text-right text-sm font-amount ml-auto border-dashed border-primary/30 bg-primary/5 rounded-lg"
            placeholder="₹ Price"
          />
        ) : (
          <span className="font-amount text-muted-foreground">{formatCurrency(item.price)}</span>
        )}
      </td>
      <td className="px-2 py-2.5">
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 rounded-lg"
            onClick={() => onUpdateQty(Math.max(1, item.quantity - 1))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => onUpdateQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-7 w-12 text-center text-sm px-1 font-semibold rounded-lg"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 rounded-lg"
            onClick={() => onUpdateQty(item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          min={0}
          value={item.discount || ''}
          onChange={(e) =>
            onUpdateDiscount(parseFloat(e.target.value) || 0, item.discountType === 'percent' ? 'percentage' : item.discountType === 'flat' ? 'amount' : item.discountType)
          }
          className="h-7 w-16 text-right text-sm ml-auto"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-2 text-right font-amount font-medium">
        {formatCurrency(item.total)}
      </td>
      <td className="px-2 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  )
}

// ---- Payment Dialog ----
function PaymentDialog({
  open,
  onClose,
  grandTotal,
  items,
  customerName,
  customerPhone,
  customerId,
  discount,
  discountType,
  onBillCreated
}: {
  open: boolean
  onClose: () => void
  grandTotal: number
  items: BillItem[]
  customerName: string
  customerPhone: string
  customerId: string | null
  discount: number
  discountType: 'percentage' | 'amount'
  onBillCreated: () => void
}): React.JSX.Element {
  const [paymentMode, setPaymentMode] = useState<string>('cash')
  const [amountReceived, setAmountReceived] = useState<number>(0)
  const [upiReference, setUpiReference] = useState('')
  const [processing, setProcessing] = useState(false)
  const [creditWarning, setCreditWarning] = useState('')
  const receivedRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setAmountReceived(Math.ceil(grandTotal))
      setPaymentMode('cash')
      setUpiReference('')
      setCreditWarning('')
      setTimeout(() => receivedRef.current?.select(), 100)
    }
  }, [open, grandTotal])

  // Check credit limit when credit mode is selected
  useEffect(() => {
    if (paymentMode !== 'credit' || !customerId) {
      setCreditWarning('')
      return
    }
    window.api.customers.getById(Number(customerId)).then((customer) => {
      if (!customer) return
      const newBalance = customer.currentBalance + grandTotal
      if (customer.creditLimit && customer.creditLimit > 0 && newBalance > customer.creditLimit) {
        setCreditWarning(
          `This will exceed credit limit! Current: ₹${customer.currentBalance.toLocaleString('en-IN')}, ` +
          `After: ₹${newBalance.toLocaleString('en-IN')}, Limit: ₹${customer.creditLimit.toLocaleString('en-IN')}`
        )
      } else {
        setCreditWarning('')
      }
    })
  }, [paymentMode, customerId, grandTotal])

  const change = paymentMode === 'cash' ? amountReceived - grandTotal : 0

  const handlePay = async (): Promise<void> => {
    if (paymentMode === 'cash' && amountReceived < grandTotal) {
      toast.error('Amount received is less than total')
      return
    }
    if (paymentMode === 'upi' && !upiReference.trim()) {
      toast.error('Please enter UPI transaction reference')
      return
    }
    if (paymentMode === 'credit' && !customerName.trim()) {
      toast.error('Customer name is required for credit sales')
      return
    }

    setProcessing(true)
    try {
      const payment: BillPayment = {
        mode: paymentMode as 'cash' | 'upi' | 'card' | 'credit',
        amount: grandTotal,
        received: paymentMode === 'cash' ? amountReceived : grandTotal,
        change: paymentMode === 'cash' ? Math.max(0, change) : 0,
        reference: upiReference || '',
        cashAmount: paymentMode === 'cash' ? grandTotal : 0,
        upiAmount: paymentMode === 'upi' ? grandTotal : 0,
        cardAmount: paymentMode === 'card' ? grandTotal : 0,
        creditAmount: paymentMode === 'credit' ? grandTotal : 0
      }

      const billData: BillCreateData = {
        items: items.map((item) => ({
          productId: item.productId,
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
        customerName: customerName || 'Walk-in Customer',
        customerPhone,
        customerId,
        discount,
        discountType,
        payment
      }

      const bill = await window.api.billing.createBill(billData)

      // Show success with WhatsApp option if phone is available
      if (customerPhone && customerPhone.length >= 10) {
        toast.success(`Bill ${bill.billNumber} created!`, {
          duration: 8000,
          action: {
            label: '📱 WhatsApp Receipt',
            onClick: () => {
              window.api.whatsapp.sendBillReceipt(bill.id, customerPhone).then((res) => {
                if (!res.success) toast.error(res.error || 'Failed to open WhatsApp')
              })
            }
          }
        })
      } else {
        toast.success(`Bill ${bill.billNumber} created successfully!`)
      }

      onBillCreated()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create bill')
    }
    setProcessing(false)
  }

  const paymentModes = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'upi', label: 'UPI', icon: Smartphone },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'credit', label: 'Credit', icon: User }
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Payment</DialogTitle>
          <DialogDescription>Complete the payment for this bill</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Grand Total */}
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-5 text-center border border-primary/10">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Total Amount</div>
            <div className="text-3xl font-bold font-amount gradient-text">
              {formatCurrency(grandTotal)}
            </div>
          </div>

          {/* Payment Mode */}
          <div className="grid grid-cols-4 gap-2">
            {paymentModes.map((mode) => (
              <button
                key={mode.id}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all ${
                  paymentMode === mode.id
                    ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10'
                    : 'border-border/60 hover:bg-accent hover:border-accent-foreground/20'
                }`}
                onClick={() => setPaymentMode(mode.id)}
              >
                <mode.icon className="h-5 w-5" />
                {mode.label}
              </button>
            ))}
          </div>

          {/* Amount Received (Cash only) */}
          {paymentMode === 'cash' && (
            <div className="space-y-2">
              <Label>Amount Received (₹)</Label>
              <Input
                ref={receivedRef}
                type="number"
                min={0}
                step={1}
                value={amountReceived || ''}
                onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                onKeyDown={(e) => e.key === 'Enter' && handlePay()}
                className="text-lg font-amount"
              />

              {/* Quick amounts */}
              <div className="flex gap-2">
                {[...new Set([
                  Math.ceil(grandTotal),
                  Math.ceil(grandTotal / 100) * 100,
                  Math.ceil(grandTotal / 500) * 500,
                  Math.ceil(grandTotal / 1000) * 1000,
                  Math.ceil(grandTotal / 2000) * 2000
                ])]
                  .filter((a) => a >= grandTotal)
                  .slice(0, 4)
                  .map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs font-amount"
                      onClick={() => setAmountReceived(amount)}
                    >
                      ₹{amount.toLocaleString('en-IN')}
                    </Button>
                  ))}
              </div>

              {/* Change */}
              {amountReceived >= grandTotal && (
                <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
                  <div className="text-sm text-muted-foreground">Change to Return</div>
                  <div className="text-xl font-bold font-amount text-green-600">
                    {formatCurrency(change)}
                  </div>
                </div>
              )}
            </div>
          )}

          {paymentMode === 'upi' && (
            <div className="space-y-2">
              <Label>UPI Transaction Reference *</Label>
              <Input
                value={upiReference}
                onChange={(e) => setUpiReference(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && upiReference.trim() && handlePay()}
                placeholder="e.g. UPI Ref No. / Transaction ID"
                autoFocus
              />
              <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-900/20">
                <div className="text-sm text-blue-700 dark:text-blue-400">
                  Amount: <span className="font-amount font-bold">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {paymentMode === 'card' && (
            <div className="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-900/20">
              <div className="text-sm text-purple-700 dark:text-purple-400">
                Swipe/Tap card for <span className="font-amount font-bold">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          )}

          {paymentMode === 'credit' && (
            <div className="space-y-2">
              <div className="rounded-lg bg-yellow-50 p-3 text-center dark:bg-yellow-900/20">
                <div className="text-sm text-yellow-700 dark:text-yellow-400">
                  {customerName ? (
                    <>
                      <span className="font-amount font-bold">{formatCurrency(grandTotal)}</span> will be added to{' '}
                      <strong>{customerName}</strong>&apos;s credit balance
                    </>
                  ) : (
                    <span className="text-destructive font-medium">
                      ⚠ Customer name is required for credit sales
                    </span>
                  )}
                </div>
              </div>
              {creditWarning && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-center">
                  <div className="text-sm text-destructive font-medium">
                    ⚠ {creditWarning}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-lg">
            Cancel
          </Button>
          <Button
            onClick={handlePay}
            disabled={processing}
            className="gap-2 rounded-lg shadow-md shadow-primary/20 min-w-[160px]"
          >
            <Printer className="h-4 w-4" />
            {processing ? 'Processing...' : 'Complete & Print'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Held Bills Dialog ----
function HeldBillsDialog({
  open,
  onClose,
  heldBills,
  onRecall,
  onDelete
}: {
  open: boolean
  onClose: () => void
  heldBills: any[]
  onRecall: (id: string) => void
  onDelete: (id: string) => void
}): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Held Bills ({heldBills.length})</DialogTitle>
          <DialogDescription>Select a bill to recall</DialogDescription>
        </DialogHeader>
        {heldBills.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No held bills
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {heldBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <div className="font-medium">
                      {bill.customerName || 'Walk-in Customer'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(bill.heldAt).toLocaleString('en-IN')} •{' '}
                      {bill.items?.length || 0} items
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-amount font-medium">
                      {formatCurrency(bill.total || 0)}
                    </span>
                    <Button size="sm" onClick={() => onRecall(bill.id)}>
                      Recall
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => onDelete(bill.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---- Customer Search Section ----
function CustomerSection({
  customerName,
  customerPhone,
  customerId,
  onSelect,
  openQuickAdd,
  onQuickAddOpened
}: {
  customerName: string
  customerPhone: string
  customerId: string | null
  onSelect: (name: string, phone: string, id: string | null) => void
  openQuickAdd?: boolean
  onQuickAddOpened?: () => void
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isLinked, setIsLinked] = useState(!!customerId)

  // Quick Add Customer state
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [addingCustomer, setAddingCustomer] = useState(false)
  const quickAddNameRef = useRef<HTMLInputElement>(null)

  // Sync isLinked if external clear
  useEffect(() => {
    setIsLinked(!!customerId || !!customerName)
  }, [customerId, customerName])

  // Open quick-add from parent (Alt+N shortcut)
  useEffect(() => {
    if (openQuickAdd) {
      setShowQuickAdd(true)
      onQuickAddOpened?.()
      setTimeout(() => quickAddNameRef.current?.focus(), 100)
    }
  }, [openQuickAdd, onQuickAddOpened])

  const handleSearch = useCallback(async (term: string) => {
    setQuery(term)
    if (term.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }
    try {
      const found = await window.api.customers.search(term)
      setResults(found.slice(0, 8))
      setShowResults(found.length > 0)
    } catch {
      setResults([])
    }
  }, [])

  const selectCustomer = (c: Customer): void => {
    onSelect(c.name, c.phone, c.id.toString())
    setQuery('')
    setResults([])
    setShowResults(false)
    setIsLinked(true)
  }

  const clearCustomer = (): void => {
    onSelect('', '', null)
    setIsLinked(false)
    setQuery('')
  }

  return (
    <div className="border-b border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Customer</span>
        </div>
        <div className="flex items-center gap-2">
          {!showQuickAdd && (
            <button
              onClick={() => {
                setShowQuickAdd(true)
                setTimeout(() => quickAddNameRef.current?.focus(), 100)
              }}
              className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <UserPlus className="h-3 w-3" />
              New
            </button>
          )}
          {isLinked && (
            <button
              onClick={clearCustomer}
              className="text-[10px] text-destructive hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Customer Inline Form */}
      {showQuickAdd && (
        <div className="mb-2 rounded-xl border border-primary/30 bg-gradient-to-b from-primary/5 to-primary/[0.02] p-3 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
                <UserPlus className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-semibold text-primary">New Customer</span>
            </div>
            <button
              onClick={() => { setShowQuickAdd(false); setNewName(''); setNewPhone('') }}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                ref={quickAddNameRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Customer name *"
                className="h-8 text-xs pl-7 bg-background/80 focus:bg-background transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    document.getElementById('quick-add-customer-save')?.click()
                  }
                  if (e.key === 'Escape') {
                    setShowQuickAdd(false)
                    setNewName('')
                    setNewPhone('')
                  }
                }}
              />
            </div>
            <div className="relative">
              <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="h-8 text-xs pl-7 bg-background/80 focus:bg-background transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    document.getElementById('quick-add-customer-save')?.click()
                  }
                  if (e.key === 'Escape') {
                    setShowQuickAdd(false)
                    setNewName('')
                    setNewPhone('')
                  }
                }}
              />
            </div>
          </div>
          <Button
            id="quick-add-customer-save"
            size="sm"
            className="w-full h-8 text-xs gap-1.5 rounded-lg shadow-sm"
            disabled={!newName.trim() || addingCustomer}
            onClick={async () => {
              if (!newName.trim()) return
              setAddingCustomer(true)
              try {
                const created = await window.api.customers.create({
                  name: newName.trim(),
                  phone: newPhone.trim()
                })
                onSelect(created.name, created.phone, created.id.toString())
                setIsLinked(true)
                toast.success(`Customer "${created.name}" added & selected`)
                setShowQuickAdd(false)
                setNewName('')
                setNewPhone('')
              } catch (err: unknown) {
                toast.error('Failed to add customer: ' + (err instanceof Error ? err.message : 'Unknown error'))
              } finally {
                setAddingCustomer(false)
              }
            }}
          >
            <UserPlus className="h-3 w-3" />
            {addingCustomer ? 'Adding...' : 'Add & Select'}
          </Button>
        </div>
      )}

      {isLinked && customerName ? (
        <div className="rounded-md bg-accent/50 px-3 py-2 text-sm">
          <div className="font-medium">{customerName}</div>
          {customerPhone && (
            <div className="text-xs text-muted-foreground">{customerPhone}</div>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            placeholder="Search customer or type name..."
            className="h-8 pl-8 text-sm"
          />

          {showResults && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-md border border-border bg-popover shadow-lg">
              {results.map((c) => (
                <button
                  key={c.id}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectCustomer(c)
                  }}
                >
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.phone}</div>
                  </div>
                  {c.currentBalance > 0 && (
                    <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-600">
                      ₹{c.currentBalance.toLocaleString('en-IN')}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Manual entry fallback */}
          {!showResults && query.length >= 2 && results.length === 0 && (
            <button
              className="mt-1 w-full rounded-md border border-dashed border-border px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
              onClick={() => {
                onSelect(query, '', null)
                setQuery('')
                setIsLinked(true)
              }}
            >
              + Add as &quot;{query}&quot; (walk-in)
            </button>
          )}
        </div>
      )}

      {/* Phone input when customer linked by name without phone */}
      {isLinked && customerName && !customerPhone && !customerId && (
        <Input
          placeholder="Phone number (optional)"
          onChange={(e) => onSelect(customerName, e.target.value, null)}
          className="mt-2 h-7 text-xs"
        />
      )}
    </div>
  )
}