import { useEffect, useRef, useState } from 'react'
import { useBillingStore } from '../../stores/billing.store'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import {
  Search,
  Plus,
  ShoppingCart,
  PauseCircle,
  PlayCircle,
  X,
  IndianRupee,
  PackagePlus,
  RotateCcw
} from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { toast } from 'sonner'
import { EditBillDialog } from '../../components/billing/EditBillDialog'
import { BulkBillDialog } from '../../components/billing/BulkBillDialog'
import { useSearchLookup } from '../../hooks/useSearchLookup'
import { productsService } from '../../services/products.service'
import { settingsService } from '../../services/settings.service'
import type { Product } from '@shared/types'
import { LimitGate } from '../../components/license'
import { billingService } from '../../services/billing.service'

// Sub-components extracted from the original monolith
import { CartRow } from './CartRow'
import { PaymentDialog } from './PaymentDialog'
import { HeldBillsDialog } from './HeldBillsDialog'
import { CustomerSection } from './CustomerSection'
import { DaySummaryDialog } from './DaySummaryDialog'

export default function BillingPage(): React.JSX.Element {
  const store = useBillingStore()
  const searchRef = useRef<HTMLInputElement>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [showHeldBills, setShowHeldBills] = useState(false)
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false)
  const [showEditBill, setShowEditBill] = useState(false)
  const [showDaySummary, setShowDaySummary] = useState(false)
  const [showBulkBill, setShowBulkBill] = useState(false)
  const [monthlyBillCount, setMonthlyBillCount] = useState(0)

  const productLookup = useSearchLookup<Product>({
    search: (query) => productsService.search(query),
    onSelect: (product) => {
      if (product.stock <= 0) {
        toast.warning(`${product.name} is out of stock`)
      }
      store.addItem(product)
      searchRef.current?.focus()
    },
    maxResults: 10,
    enableKeyboard: true,
    clearOnSelect: true
  })

  // Custom shortcut settings
  const [shortcutOther, setShortcutOther] = useState('Alt+O')
  const [shortcutNewCustomer, setShortcutNewCustomer] = useState('Alt+N')

  // Load custom shortcut settings
  useEffect(() => {
    settingsService
      .getAll()
      .then((all: Record<string, string>) => {
        if (all.shortcut_addOther) setShortcutOther(all.shortcut_addOther)
        if (all.shortcut_newCustomer) setShortcutNewCustomer(all.shortcut_newCustomer)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    billingService
      .getMonthSummary()
      .then(setMonthlyBillCount)
      .catch(() => setMonthlyBillCount(0))
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
          productLookup.setQuery('')
          productLookup.clearResults()
          productLookup.setShowResults(false)
          // Direct barcode lookup
          productsService.getByBarcode(barcode).then((product) => {
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
        scanTimerRef.current = setTimeout(() => {
          scanBufferRef.current = ''
        }, 300)
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
      // Ctrl+R: Edit/Return bill
      if (e.key === 'r' && e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        setShowEditBill(true)
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
        toast.success('Custom item added â€” edit name & price in cart')
        setTimeout(() => {
          const priceInputs = document.querySelectorAll<HTMLInputElement>(
            'input[placeholder="â‚¹ Price"]'
          )
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
      // Ctrl+D: Day Summary popup
      if (e.key === 'd' && e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        setShowDaySummary(true)
      }
      // Escape: Focus search
      if (e.key === 'Escape') {
        productLookup.setShowResults(false)
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store.items.length, shortcutOther, shortcutNewCustomer])

  // Redirect click on empty layout spaces to focus search bar
  const handlePageMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement
    const isInteractive =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'OPTION' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('a') ||
      target.closest('[role="dialog"]') ||
      target.closest('[role="menu"]') ||
      target.closest('.no-focus-redirect')

    if (!isInteractive) {
      e.preventDefault()
      searchRef.current?.focus()
    }
  }

  // Redirect typing on body to search input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent): void => {
      const activeEl = document.activeElement
      const isInputActive =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)

      if (!isInputActive) {
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          searchRef.current?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  return (
    <div className="flex h-full" onMouseDown={handlePageMouseDown}>
      {/* Left: Product Search + Cart */}
      <div className="flex flex-1 flex-col border-r border-border bg-gradient-to-b from-muted/10 to-background">
        {/* Cart Tabs Bar */}
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 h-11 shrink-0 select-none">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar h-full py-1">
            {store.tabs.map((tab) => {
              const isActive = store.activeTabId === tab.id
              const tabItems = isActive ? store.items : tab.items
              const itemCount = tabItems.length
              return (
                <div
                  key={tab.id}
                  onClick={() => store.switchTab(tab.id)}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 h-8 text-xs font-medium rounded-lg cursor-pointer transition-all duration-150 ${
                    isActive
                      ? 'bg-background text-foreground shadow-sm border border-border/80 font-semibold'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <span className="truncate max-w-[100px]">{tab.name}</span>
                  {itemCount > 0 && (
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted-foreground/20 text-muted-foreground group-hover:text-foreground'
                      }`}
                    >
                      {itemCount}
                    </span>
                  )}
                  {store.tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        store.closeTab(tab.id)
                      }}
                      className="rounded-full p-0.5 text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-colors animate-in fade-in zoom-in-95 duration-150"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
              onClick={() => {
                store.addTab()
                toast.success('New billing cart opened')
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative border-b border-border bg-muted/40 p-3 backdrop-blur-sm z-30">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={productLookup.query}
                onChange={(e) => productLookup.handleQueryChange(e.target.value)}
                onKeyDown={productLookup.handleKeyDown}
                onFocus={() =>
                  productLookup.results.length > 0 && productLookup.setShowResults(true)
                }
                onBlur={() => setTimeout(() => productLookup.setShowResults(false), 200)}
                placeholder="Search product or scan barcode... (Esc to focus)"
                className="pl-10 pr-12 h-11 text-base rounded-xl border-border/60 bg-background/90 shadow-sm focus:shadow-md transition-shadow"
                autoFocus
              />
              {!productLookup.query && (
                <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded bg-muted/60 border px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground/80 pointer-events-none select-none hidden md:inline">
                  Esc
                </kbd>
              )}
            </div>
            <Button
              variant="outline"
              className="h-11 gap-1.5 rounded-xl border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all shrink-0"
              onClick={() => {
                store.addCustomItem()
                toast.success('Custom item added â€” edit name & price in cart')
                setTimeout(() => {
                  const priceInputs = document.querySelectorAll<HTMLInputElement>(
                    'input[placeholder="â‚¹ Price"]'
                  )
                  if (priceInputs.length > 0) {
                    priceInputs[priceInputs.length - 1].focus()
                    priceInputs[priceInputs.length - 1].select()
                  }
                }, 100)
              }}
            >
              <PackagePlus className="h-4 w-4" />
              <span className="hidden sm:inline">+ Other</span>
              <kbd className="ml-0.5 rounded bg-muted px-1 py-0.5 text-[9px] font-mono hidden sm:inline">
                {shortcutOther}
              </kbd>
            </Button>
          </div>

          {/* Search Results Dropdown */}
          {productLookup.showResults && productLookup.results.length > 0 && (
            <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-80 overflow-auto rounded-xl border border-border bg-popover shadow-xl">
              {productLookup.results.map((product, idx) => (
                <button
                  key={product.id}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-all first:rounded-t-xl last:rounded-b-xl ${
                    idx === productLookup.selectedIndex
                      ? 'bg-primary/10 text-foreground'
                      : 'hover:bg-accent/60'
                  } ${idx > 0 ? 'border-t border-border/40' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    productLookup.selectResult(product)
                  }}
                  onMouseEnter={() => productLookup.setSelectedIndex(idx)}
                >
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {product.sku} â€¢ {product.category} â€¢ Stock:{' '}
                      <span className={product.stock <= 5 ? 'text-orange-500 font-medium' : ''}>
                        {product.stock}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-amount font-semibold">
                      {formatCurrency(product.sellingPrice)}
                    </div>
                    {product.stock <= 0 && (
                      <Badge variant="destructive" className="text-[10px] mt-0.5">
                        Out of stock
                      </Badge>
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
              <p className="text-sm text-muted-foreground/60 mt-1">
                Search and add products to start billing
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border/60 shadow-sm">
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
                    onUpdateDiscount={(disc, type) => store.updateItemDiscount(item.id, disc, type)}
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
        <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
          <LimitGate limitKey="maxBillsPerMonth" currentCount={monthlyBillCount}>
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
          </LimitGate>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditBill(true)}
            className="gap-1.5 rounded-lg border-orange-300/50 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10"
          >
            <RotateCcw className="h-4 w-4" />
            Return/Exchange{' '}
            <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px] font-mono">Ctrl+R</kbd>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkBill(true)}
            disabled={store.items.length === 0}
            className="gap-1.5 rounded-lg border-blue-300/50 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10"
          >
            <PackagePlus className="h-4 w-4" />
            Bulk Bill
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
      <div className="flex w-[340px] min-w-[300px] flex-col border-l border-border bg-gradient-to-b from-muted/20 to-background">
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
          <div className="rounded-xl border border-border/60 bg-card/90 p-3 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Bill Summary
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span>
                  {store.totalItems} ({store.items.length} lines)
                </span>
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
                    className="h-8 text-sm bg-background/90"
                    placeholder="0"
                  />
                  <select
                    className="h-8 rounded-md border border-input bg-background/90 px-2 text-xs"
                    value={store.discountType}
                    onChange={(e) =>
                      store.setDiscount(store.discount, e.target.value as 'percentage' | 'amount')
                    }
                  >
                    <option value="percentage">%</option>
                    <option value="amount">â‚¹</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grand Total + Pay Button */}
        <div className="border-t border-border p-4 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Grand Total
            </span>
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
            <kbd className="ml-2 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-mono">
              F11
            </kbd>
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
        onSetCustomer={(name, phone, id) => store.setCustomer(name, phone, id)}
        onBillCreated={() => {
          setMonthlyBillCount((count) => count + 1)
          store.clearCart()
          searchRef.current?.focus()
        }}
      />

      {/* Bulk Bill Dialog */}
      <BulkBillDialog
        open={showBulkBill}
        onClose={() => setShowBulkBill(false)}
        items={store.items}
        discount={store.discount}
        discountType={store.discountType}
        grandTotal={store.grandTotal}
        onAllDone={() => {
          billingService
            .getMonthSummary()
            .then(setMonthlyBillCount)
            .catch(() => {})
          store.clearCart()
          searchRef.current?.focus()
        }}
      />

      {/* Held Bills Dialog */}
      <HeldBillsDialog
        open={showHeldBills}
        onClose={() => setShowHeldBills(false)}
        heldBills={store.heldBills}
        onRecall={async (id) => {
          try {
            await store.recallBill(id)
            setShowHeldBills(false)
            toast.success('Held bill recalled')
          } catch {
            toast.error('Failed to recall held bill. Please try again.')
          }
        }}
        onDelete={(id) => store.deleteHeldBill(id)}
      />

      {/* Edit Bill (Return/Exchange) Dialog */}
      <EditBillDialog open={showEditBill} onClose={() => setShowEditBill(false)} />

      {/* Day Summary Dialog (Ctrl+D) */}
      <DaySummaryDialog open={showDaySummary} onClose={() => setShowDaySummary(false)} />
    </div>
  )
}
