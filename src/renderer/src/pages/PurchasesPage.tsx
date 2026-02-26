// ============================================================================
// KPT Billing - Purchases Page (Stock-In / Bulk Purchasing)
// Record purchases from suppliers in Surat, Bengaluru, etc.
// Full barcode scanner support for quick product entry.
// ============================================================================
import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { ScrollArea } from '../components/ui/scroll-area'
import { Textarea } from '../components/ui/textarea'
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
  Plus,
  Package,
  Truck,
  MapPin,
  ScanBarcode,
  Save,
  Eye,
  FileText
} from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { toast } from 'sonner'
import type {
  Product,
  Supplier,
  PurchaseItem,
  PurchaseCreateData,
  Purchase
} from '@shared/types'

// Barcode scanner detection - scanners type fast then press Enter
const BARCODE_THRESHOLD_MS = 80
const BARCODE_MIN_LENGTH = 4

interface PurchaseLineItem extends PurchaseItem {
  _uid: string
}

function uid(): string {
  return Math.random().toString(36).substring(2, 10)
}

export default function PurchasesPage(): React.JSX.Element {
  // ---- State ----
  const [tab, setTab] = useState<'new' | 'history'>('new')

  // New Purchase form state
  const [items, setItems] = useState<PurchaseLineItem[]>([])
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [supplierName, setSupplierName] = useState('')
  const [city, setCity] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [paymentMode, setPaymentMode] = useState('cash')
  const [paymentStatus, setPaymentStatus] = useState('paid')
  const [amountPaid, setAmountPaid] = useState(0)
  const [notes, setNotes] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedResultIdx, setSelectedResultIdx] = useState(0)

  // Supplier search
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierResults, setSupplierResults] = useState<Supplier[]>([])
  const [showSupplierResults, setShowSupplierResults] = useState(false)
  const [showNewSupplier, setShowNewSupplier] = useState(false)

  // History
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null)

  // Cities
  const [cities, setCities] = useState<string[]>([])
  const [showCityDropdown, setShowCityDropdown] = useState(false)

  // Barcode scanner detection
  const scanBufferRef = useRef('')
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastKeypressRef = useRef(0)
  const searchRef = useRef<HTMLInputElement>(null)

  // Load cities + recent purchases on mount
  useEffect(() => {
    loadCities()
    if (tab === 'history') loadPurchases()
  }, [tab])

  const loadCities = async (): Promise<void> => {
    try {
      const c = await window.api.suppliers.getCities()
      setCities(c)
    } catch {
      /* ignore */
    }
  }

  const loadPurchases = async (): Promise<void> => {
    try {
      const result = await window.api.purchases.getAll({ pageSize: 100 })
      setPurchases(result.data)
    } catch {
      /* ignore */
    }
  }

  // ---- Barcode Scanner Detection (global keydown) ----
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      // Don't capture if typing in an input/textarea (except the search bar)
      const target = e.target as HTMLElement
      const isSearchBar = target === searchRef.current
      if (
        !isSearchBar &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return
      }

      const now = Date.now()

      // If the key is Enter and we have a buffer, process it as barcode
      if (e.key === 'Enter' && scanBufferRef.current.length >= BARCODE_MIN_LENGTH) {
        e.preventDefault()
        const barcode = scanBufferRef.current.trim()
        scanBufferRef.current = ''
        handleBarcodeScan(barcode)
        return
      }

      // Single printable character
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const timeSinceLastKey = now - lastKeypressRef.current
        lastKeypressRef.current = now

        if (timeSinceLastKey > BARCODE_THRESHOLD_MS * 3) {
          // Too slow, reset buffer (probably manual typing)
          scanBufferRef.current = ''
        }

        scanBufferRef.current += e.key

        // Clear any pending timer
        if (scanTimerRef.current) clearTimeout(scanTimerRef.current)

        // After 300ms of no input, clear buffer
        scanTimerRef.current = setTimeout(() => {
          scanBufferRef.current = ''
        }, 300)
      }
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [items])

  const handleBarcodeScan = async (barcode: string): Promise<void> => {
    try {
      const product = await window.api.products.getByBarcode(barcode)
      if (product) {
        addProductToItems(product)
        toast.success(`Scanned: ${product.name}`)
      } else {
        toast.warning(`No product found for barcode: ${barcode}`)
        // Focus search bar and put barcode there
        setSearchQuery(barcode)
        searchRef.current?.focus()
      }
    } catch {
      toast.error('Barcode scan failed')
    }
  }

  // ---- Product Search ----
  const handleSearch = useCallback(async (query: string): Promise<void> => {
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
  }, [])

  const handleSearchKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedResultIdx((i) => Math.min(i + 1, searchResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedResultIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault()
      addProductToItems(searchResults[selectedResultIdx])
    }
  }

  const addProductToItems = (product: Product): void => {
    // Check if already in items
    const existing = items.find((i) => i.productId === product.id)
    if (existing) {
      setItems(
        items.map((i) =>
          i._uid === existing._uid ? { ...i, qty: i.qty + 1 } : i
        )
      )
    } else {
      const newItem: PurchaseLineItem = {
        _uid: uid(),
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        hsnCode: product.hsnCode,
        qty: 1,
        purchaseRate: product.costPrice || 0,
        sellingRate: product.sellingPrice || 0,
        mrp: product.sellingPrice || 0,
        gstRate: product.gstRate || 0,
        gstAmount: 0,
        amount: 0
      }
      // Compute amounts
      const updated = recalcItem(newItem)
      setItems([...items, updated])
    }
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
    searchRef.current?.focus()
  }

  const recalcItem = (item: PurchaseLineItem): PurchaseLineItem => {
    const lineTotal = item.purchaseRate * item.qty
    const gstAmount = (lineTotal * item.gstRate) / 100
    return { ...item, gstAmount, amount: lineTotal + gstAmount }
  }

  const updateItem = (uid: string, field: string, value: number): void => {
    setItems(
      items.map((item) => {
        if (item._uid !== uid) return item
        const updated = { ...item, [field]: value }
        return recalcItem(updated)
      })
    )
  }

  const removeItem = (uid: string): void => {
    setItems(items.filter((i) => i._uid !== uid))
  }

  // ---- Supplier Search ----
  const handleSupplierSearch = useCallback(async (query: string): Promise<void> => {
    setSupplierSearch(query)
    if (query.length < 1) {
      setSupplierResults([])
      setShowSupplierResults(false)
      return
    }
    try {
      const results = await window.api.suppliers.search(query)
      setSupplierResults(results)
      setShowSupplierResults(true)
    } catch {
      setSupplierResults([])
    }
  }, [])

  const selectSupplier = (supplier: Supplier): void => {
    setSupplierId(supplier.id)
    setSupplierName(supplier.name)
    setCity(supplier.city || '')
    setSupplierSearch(supplier.name)
    setShowSupplierResults(false)
  }

  // ---- Totals ----
  const subtotal = items.reduce((s, i) => s + i.purchaseRate * i.qty, 0)
  const totalGst = items.reduce((s, i) => s + i.gstAmount, 0)
  const grandTotal = subtotal + totalGst
  const totalQty = items.reduce((s, i) => s + i.qty, 0)

  // ---- Save Purchase ----
  const handleSave = async (): Promise<void> => {
    if (items.length === 0) {
      toast.error('Add at least one item')
      return
    }

    try {
      const data: PurchaseCreateData = {
        supplierId: supplierId ?? undefined,
        supplierName: supplierName || undefined,
        city: city || undefined,
        invoiceNo: invoiceNo || undefined,
        invoiceDate: invoiceDate || undefined,
        paymentMode,
        paymentStatus,
        amountPaid: paymentStatus === 'paid' ? grandTotal : amountPaid,
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          barcode: i.barcode,
          hsnCode: i.hsnCode,
          qty: i.qty,
          purchaseRate: i.purchaseRate,
          sellingRate: i.sellingRate,
          mrp: i.mrp,
          gstRate: i.gstRate,
          gstAmount: i.gstAmount,
          amount: i.amount
        }))
      }

      const result = await window.api.purchases.create(data)
      toast.success(`Purchase ${result.purchaseNo} saved! Stock updated for ${items.length} items.`)

      // Reset form
      setItems([])
      setSupplierId(null)
      setSupplierName('')
      setCity('')
      setInvoiceNo('')
      setInvoiceDate(new Date().toISOString().split('T')[0])
      setPaymentMode('cash')
      setPaymentStatus('paid')
      setAmountPaid(0)
      setNotes('')
    } catch (err) {
      toast.error(`Failed to save: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ---- Add manual (non-product) item ----
  const addManualItem = (): void => {
    const newItem: PurchaseLineItem = {
      _uid: uid(),
      productId: null,
      productName: '',
      barcode: null,
      hsnCode: null,
      qty: 1,
      purchaseRate: 0,
      sellingRate: 0,
      mrp: 0,
      gstRate: 5,
      gstAmount: 0,
      amount: 0
    }
    setItems([...items, newItem])
  }

  // ---- Render ----
  return (
    <div className="flex h-full flex-col page-enter">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-3">
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Purchases / Stock-In</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={tab === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('new')}
          >
            <Plus className="mr-1 h-4 w-4" />
            New Purchase
          </Button>
          <Button
            variant={tab === 'history' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('history')}
          >
            <FileText className="mr-1 h-4 w-4" />
            History
          </Button>
        </div>
      </div>

      {tab === 'new' ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Items */}
          <div className="flex flex-1 flex-col border-r border-border">
            {/* Search Bar with barcode indicator */}
            <div className="relative border-b border-border p-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() =>
                      searchResults.length > 0 && setShowResults(true)
                    }
                    onBlur={() =>
                      setTimeout(() => setShowResults(false), 200)
                    }
                    placeholder="Search product or scan barcode..."
                    className="pl-9 text-base"
                  />
                </div>
                <Badge
                  variant="outline"
                  className="gap-1 text-xs text-muted-foreground"
                >
                  <ScanBarcode className="h-3 w-3" />
                  Scanner Ready
                </Badge>
                <Button variant="outline" size="sm" onClick={addManualItem}>
                  <Plus className="mr-1 h-3 w-3" />
                  Manual
                </Button>
              </div>

              {/* Search Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                  {searchResults.map((product, idx) => (
                    <button
                      key={product.id}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
                        idx === selectedResultIdx
                          ? 'bg-accent'
                          : 'hover:bg-accent/50'
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        addProductToItems(product)
                      }}
                      onMouseEnter={() => setSelectedResultIdx(idx)}
                    >
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.sku}
                          {product.barcode && ` • ${product.barcode}`} • Stock:{' '}
                          {product.stock}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div>Cost: {formatCurrency(product.costPrice)}</div>
                        <div className="text-muted-foreground">
                          Sell: {formatCurrency(product.sellingPrice)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="flex-1 overflow-auto">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                  <Package className="mb-3 h-12 w-12 opacity-20" />
                  <p className="text-lg font-medium">No items added</p>
                  <p className="text-sm">
                    Search products, scan barcodes, or add manually
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr className="text-left text-xs font-medium uppercase text-muted-foreground">
                      <th className="w-[30px] px-3 py-2">#</th>
                      <th className="px-2 py-2">Product</th>
                      <th className="w-[80px] px-2 py-2 text-right">
                        Qty
                      </th>
                      <th className="w-[100px] px-2 py-2 text-right">
                        Purchase ₹
                      </th>
                      <th className="w-[100px] px-2 py-2 text-right">
                        Selling ₹
                      </th>
                      <th className="w-[60px] px-2 py-2 text-right">
                        GST%
                      </th>
                      <th className="w-[80px] px-2 py-2 text-right">
                        GST ₹
                      </th>
                      <th className="w-[100px] px-2 py-2 text-right">
                        Amount
                      </th>
                      <th className="w-[40px] px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr
                        key={item._uid}
                        className="border-b border-border/50"
                      >
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-1.5">
                          {item.productId ? (
                            <div>
                              <div className="font-medium">
                                {item.productName}
                              </div>
                              {item.barcode && (
                                <div className="text-xs text-muted-foreground">
                                  {item.barcode}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Input
                              value={item.productName}
                              onChange={(e) =>
                                setItems(
                                  items.map((i) =>
                                    i._uid === item._uid
                                      ? { ...i, productName: e.target.value }
                                      : i
                                  )
                                )
                              }
                              placeholder="Product name"
                              className="h-7 text-sm"
                            />
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) =>
                              updateItem(
                                item._uid,
                                'qty',
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="h-7 w-full text-right text-sm"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.purchaseRate}
                            onChange={(e) =>
                              updateItem(
                                item._uid,
                                'purchaseRate',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-7 w-full text-right text-sm"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.sellingRate}
                            onChange={(e) =>
                              updateItem(
                                item._uid,
                                'sellingRate',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-7 w-full text-right text-sm"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            step="0.5"
                            value={item.gstRate}
                            onChange={(e) =>
                              updateItem(
                                item._uid,
                                'gstRate',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-7 w-full text-right text-sm"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right text-muted-foreground">
                          {formatCurrency(item.gstAmount)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-2 py-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeItem(item._uid)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Summary Bar */}
            {items.length > 0 && (
              <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-sm">
                <span>
                  {items.length} items • {totalQty} qty
                </span>
                <div className="flex items-center gap-4">
                  <span>
                    Subtotal: <b>{formatCurrency(subtotal)}</b>
                  </span>
                  <span>
                    GST: <b>{formatCurrency(totalGst)}</b>
                  </span>
                  <span className="text-base font-bold text-primary">
                    Total: {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Supplier & Purchase Details */}
          <div className="flex w-[320px] min-w-[280px] flex-col bg-card">
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-4">
                {/* Supplier */}
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Supplier
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      value={supplierSearch}
                      onChange={(e) => handleSupplierSearch(e.target.value)}
                      onFocus={() =>
                        supplierResults.length > 0 &&
                        setShowSupplierResults(true)
                      }
                      onBlur={() =>
                        setTimeout(() => setShowSupplierResults(false), 200)
                      }
                      placeholder="Search supplier..."
                      className="text-sm"
                    />
                    {showSupplierResults && supplierResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border bg-popover shadow-lg">
                        {supplierResults.map((s) => (
                          <button
                            key={s.id}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectSupplier(s)
                            }}
                          >
                            <div>
                              <div className="font-medium">{s.name}</div>
                              {s.city && (
                                <div className="text-xs text-muted-foreground">
                                  {s.city}
                                </div>
                              )}
                            </div>
                            {s.phone && (
                              <span className="text-xs text-muted-foreground">
                                {s.phone}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 flex gap-1">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setShowNewSupplier(true)}
                    >
                      + New Supplier
                    </Button>
                    {supplierId && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-destructive"
                        onClick={() => {
                          setSupplierId(null)
                          setSupplierName('')
                          setSupplierSearch('')
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {/* City */}
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Purchase City
                  </Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      onFocus={() => cities.length > 0 && setShowCityDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowCityDropdown(false), 200)
                      }
                      placeholder="Surat, Bengaluru..."
                      className="pl-8 text-sm"
                    />
                    {showCityDropdown && cities.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-36 overflow-auto rounded-lg border bg-popover shadow-lg">
                        {cities
                          .filter((c) =>
                            c.toLowerCase().includes(city.toLowerCase())
                          )
                          .map((c) => (
                            <button
                              key={c}
                              className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setCity(c)
                                setShowCityDropdown(false)
                              }}
                            >
                              {c}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Invoice Details */}
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Supplier Invoice
                  </Label>
                  <div className="mt-1 space-y-2">
                    <Input
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="Invoice number"
                      className="text-sm"
                    />
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>

                <Separator />

                {/* Payment */}
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Payment
                  </Label>
                  <div className="mt-1 space-y-2">
                    <div className="grid grid-cols-2 gap-1">
                      {(['cash', 'upi', 'card', 'cheque'] as const).map(
                        (mode) => (
                          <Button
                            key={mode}
                            variant={
                              paymentMode === mode ? 'default' : 'outline'
                            }
                            size="sm"
                            className="text-xs capitalize"
                            onClick={() => setPaymentMode(mode)}
                          >
                            {mode}
                          </Button>
                        )
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['paid', 'partial', 'unpaid'] as const).map(
                        (status) => (
                          <Button
                            key={status}
                            variant={
                              paymentStatus === status ? 'default' : 'outline'
                            }
                            size="sm"
                            className="text-xs capitalize"
                            onClick={() => setPaymentStatus(status)}
                          >
                            {status}
                          </Button>
                        )
                      )}
                    </div>
                    {paymentStatus === 'partial' && (
                      <div>
                        <Label className="text-xs">Amount Paid</Label>
                        <Input
                          type="number"
                          value={amountPaid}
                          onChange={(e) =>
                            setAmountPaid(parseFloat(e.target.value) || 0)
                          }
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Notes */}
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Notes
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Purchase notes..."
                    rows={2}
                    className="mt-1 text-sm"
                  />
                </div>

                {/* Summary */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items</span>
                      <span>{items.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Qty</span>
                      <span>{totalQty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST</span>
                      <span>{formatCurrency(totalGst)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span>Grand Total</span>
                      <span className="text-primary">
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>
                    {items.length > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Avg Margin</span>
                        <span>
                          {(
                            ((items.reduce(
                              (s, i) => s + (i.sellingRate - i.purchaseRate) * i.qty,
                              0
                            ) /
                              Math.max(subtotal, 1)) *
                              100)
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Save Button */}
            <div className="border-t border-border p-3">
              <Button
                className="w-full gap-2"
                size="lg"
                disabled={items.length === 0}
                onClick={handleSave}
              >
                <Save className="h-4 w-4" />
                Save Purchase & Update Stock
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Purchase History Tab */
        <PurchaseHistory
          purchases={purchases}
          onView={async (id) => {
            const p = await window.api.purchases.getById(id)
            setViewPurchase(p)
          }}
          onDelete={async (id) => {
            if (confirm('Delete this purchase? Stock will be reversed.')) {
              await window.api.purchases.delete(id)
              toast.success('Purchase deleted, stock reversed')
              loadPurchases()
            }
          }}
          onRefresh={loadPurchases}
        />
      )}

      {/* View Purchase Dialog */}
      {viewPurchase && (
        <Dialog open onOpenChange={() => setViewPurchase(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Purchase: {viewPurchase.purchaseNo}</DialogTitle>
              <DialogDescription>
                {viewPurchase.date} •{' '}
                {viewPurchase.supplierName || 'No supplier'}{' '}
                {viewPurchase.city && `• ${viewPurchase.city}`}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2">#</th>
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2 text-right">Qty</th>
                    <th className="px-2 py-2 text-right">Purchase ₹</th>
                    <th className="px-2 py-2 text-right">Selling ₹</th>
                    <th className="px-2 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewPurchase.items || []).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-3 py-1.5">{idx + 1}</td>
                      <td className="px-2 py-1.5">
                        {item.productName || item.product_name}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {item.qty || item.quantity}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatCurrency(
                          item.purchaseRate || item.purchase_rate || 0
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatCurrency(
                          item.sellingRate || item.selling_rate || 0
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium">
                        {formatCurrency(item.amount || item.total || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Payment: </span>
                <Badge variant="outline" className="capitalize">
                  {viewPurchase.paymentMode}
                </Badge>
                <Badge
                  variant={
                    viewPurchase.paymentStatus === 'paid'
                      ? 'default'
                      : 'destructive'
                  }
                  className="ml-1 capitalize"
                >
                  {viewPurchase.paymentStatus}
                </Badge>
              </div>
              <div className="text-lg font-bold text-primary">
                {formatCurrency(viewPurchase.grandTotal)}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New Supplier Dialog */}
      <NewSupplierDialog
        open={showNewSupplier}
        defaultCity={city}
        onClose={() => setShowNewSupplier(false)}
        onCreated={(supplier) => {
          selectSupplier(supplier)
          setShowNewSupplier(false)
          loadCities()
          toast.success(`Supplier "${supplier.name}" created`)
        }}
      />
    </div>
  )
}

// ---- Purchase History Component ----
function PurchaseHistory({
  purchases,
  onView,
  onDelete,
  onRefresh: _onRefresh
}: {
  purchases: Purchase[]
  onView: (id: number) => void
  onDelete: (id: number) => void
  onRefresh: () => void
}): React.JSX.Element {
  return (
    <div className="flex-1 overflow-auto p-4">
      {purchases.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <Truck className="mb-3 h-12 w-12 opacity-20" />
          <p className="text-lg font-medium">No purchases recorded yet</p>
          <p className="text-sm">
            Switch to "New Purchase" to record your first stock-in
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {purchases.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">{p.purchaseNo}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.date}
                    {p.supplierName && ` • ${p.supplierName}`}
                    {p.city && ` • ${p.city}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-medium">
                    {formatCurrency(p.grandTotal)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.totalItems} items • {p.totalQty} qty
                  </div>
                </div>
                <Badge
                  variant={
                    p.paymentStatus === 'paid' ? 'default' : 'destructive'
                  }
                  className="capitalize"
                >
                  {p.paymentStatus}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView(p.id)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => onDelete(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- New Supplier Dialog ----
function NewSupplierDialog({
  open,
  defaultCity,
  onClose,
  onCreated
}: {
  open: boolean
  defaultCity: string
  onClose: () => void
  onCreated: (supplier: Supplier) => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [dialogCity, setDialogCity] = useState(defaultCity)
  const [address, setAddress] = useState('')
  const [gstin, setGstin] = useState('')

  useEffect(() => {
    if (open) setDialogCity(defaultCity)
  }, [open, defaultCity])

  const handleCreate = async (): Promise<void> => {
    if (!name.trim()) {
      toast.error('Supplier name is required')
      return
    }
    try {
      const supplier = await window.api.suppliers.create({
        name: name.trim(),
        phone: phone || undefined,
        city: dialogCity || undefined,
        address: address || undefined,
        gstin: gstin || undefined
      })
      onCreated(supplier)
      // Reset
      setName('')
      setPhone('')
      setDialogCity('')
      setAddress('')
      setGstin('')
    } catch (err) {
      toast.error(
        `Failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
          <DialogDescription>
            Add a supplier from any city (Surat, Bengaluru, etc.)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Supplier name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={dialogCity}
                onChange={(e) => setDialogCity(e.target.value)}
                placeholder="Surat, Bengaluru..."
              />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
            />
          </div>
          <div>
            <Label>GSTIN</Label>
            <Input
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="GSTIN number"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Supplier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
