// ============================================================================
// KPT Billing - Purchases Page (Stock-In / Bulk Purchasing)
// Record purchases from suppliers in Surat, Bengaluru, etc.
// Full barcode scanner support for quick product entry.
// ============================================================================
import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { ScrollArea } from '../../components/ui/scroll-area'
import { Textarea } from '../../components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../../components/ui/dialog'
import {
  Search,
  Trash2,
  Plus,
  Package,
  Truck,
  MapPin,
  ScanBarcode,
  Save,
  FileText
} from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { toast } from 'sonner'
import type { PurchaseCreateData, Purchase } from '@shared/types'

import { PurchaseHistory, NewSupplierDialog } from './PurchaseHistory'
import { useBarcodeScan } from '../../hooks/purchases/useBarcodeScan'
import { useProductSearch } from '../../hooks/purchases/useProductSearch'
import { useSupplierSearch } from '../../hooks/purchases/useSupplierSearch'
import { usePurchaseForm } from '../../hooks/purchases/usePurchaseForm'
import { suppliersService } from '../../services/suppliers.service'
import { purchasesService } from '../../services/purchases.service'
import { productsService } from '../../services/products.service'
import { useAuthStore } from '../../stores/auth.store'
import { OwnerActionGuard } from '../../components/layout'

export default function PurchasesPage(): React.JSX.Element {
  // ---- State ----
  const [tab, setTab] = useState<'new' | 'history'>('new')

  // Owner action guard states
  const [guardOpen, setGuardOpen] = useState(false)
  const [guardAction, setGuardAction] = useState<{ label: string; callback: () => void } | null>(
    null
  )

  const checkOwnerPermission = (label: string, callback: () => void): void => {
    if (useAuthStore.getState().user?.role === 'owner') {
      callback()
    } else {
      setGuardAction({ label, callback })
      setGuardOpen(true)
    }
  }

  const [showNewSupplier, setShowNewSupplier] = useState(false)

  // History
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  // Cities
  const [cities, setCities] = useState<string[]>([])
  const [showCityDropdown, setShowCityDropdown] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  const {
    items,
    supplierId,
    supplierName,
    city,
    invoiceNo,
    invoiceDate,
    paymentMode,
    paymentStatus,
    amountPaid,
    notes,
    subtotal,
    totalGst,
    grandTotal,
    totalQty,
    addProductToItems,
    addManualItem,
    updateItemNumeric,
    updateItemName,
    removeItem,
    setSupplier,
    clearSupplier,
    resetForm,
    setCity,
    setInvoiceNo,
    setInvoiceDate,
    setPaymentMode,
    setPaymentStatus,
    setAmountPaid,
    setNotes
  } = usePurchaseForm()

  const productSearch = useProductSearch({
    searchProducts: (query) => productsService.search(query),
    onSelect: addProductToItems
  })

  const supplierSearch = useSupplierSearch({
    searchSuppliers: (query) => suppliersService.search(query),
    onSelect: setSupplier
  })

  const loadCities = useCallback(async (): Promise<void> => {
    try {
      const c = await suppliersService.getCities()
      setCities(c)
    } catch {
      /* ignore */
    }
  }, [])

  const loadPurchases = useCallback(async (): Promise<void> => {
    try {
      const result = await purchasesService.getAll({ pageSize: 100 })
      setPurchases(result.data)
    } catch {
      /* ignore */
    }
  }, [])

  // Load cities + recent purchases on mount
  useEffect(() => {
    const task = setTimeout(() => {
      void loadCities()
      if (tab === 'history') {
        void loadPurchases()
      }
    }, 0)

    return () => clearTimeout(task)
  }, [tab, loadCities, loadPurchases])

  const handleBarcodeScan = async (barcode: string): Promise<void> => {
    try {
      const product = await productsService.getByBarcode(barcode)
      if (product) {
        addProductToItems(product)
        toast.success(`Scanned: ${product.name}`)
      } else {
        toast.warning(`No product found for barcode: ${barcode}`)
        // Focus search bar and put barcode there
        await productSearch.handleQueryChange(barcode)
        searchRef.current?.focus()
      }
    } catch {
      toast.error('Barcode scan failed')
    }
  }

  useBarcodeScan({ onScan: handleBarcodeScan, allowedInputRef: searchRef })

  // ---- Save Purchase ----
  const handleSave = async (): Promise<void> => {
    if (items.length === 0) {
      toast.error('Add at least one item')
      return
    }

    const missingName = items.find((i) => !i.productId && !i.productName.trim())
    if (missingName) {
      toast.error('Enter product name for new items')
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

      const result = await purchasesService.create(data)
      toast.success(`Purchase ${result.purchaseNo} saved! Stock updated for ${items.length} items.`)

      resetForm()
    } catch (err) {
      toast.error(`Failed to save: ${err instanceof Error ? err.message : String(err)}`)
    }
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
                    value={productSearch.query}
                    onChange={(e) => productSearch.handleQueryChange(e.target.value)}
                    onKeyDown={productSearch.handleKeyDown}
                    onFocus={() =>
                      productSearch.results.length > 0 && productSearch.setShowResults(true)
                    }
                    onBlur={() => setTimeout(() => productSearch.setShowResults(false), 200)}
                    placeholder="Search product or scan barcode..."
                    className="pl-9 text-base"
                  />
                </div>
                <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                  <ScanBarcode className="h-3 w-3" />
                  Scanner Ready
                </Badge>
                <Button variant="outline" size="sm" onClick={addManualItem}>
                  <Plus className="mr-1 h-3 w-3" />
                  New Product
                </Button>
              </div>

              {/* Search Dropdown */}
              {productSearch.showResults && productSearch.results.length > 0 && (
                <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                  {productSearch.results.map((product, idx) => (
                    <button
                      key={product.id}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
                        idx === productSearch.selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        productSearch.selectResult(product)
                      }}
                      onMouseEnter={() => productSearch.setSelectedIndex(idx)}
                    >
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.sku}
                          {product.barcode && ` • ${product.barcode}`} • Stock: {product.stock}
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
                  <p className="text-sm">Search products, scan barcodes, or add manually</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr className="text-left text-xs font-medium uppercase text-muted-foreground">
                      <th className="w-[30px] px-3 py-2">#</th>
                      <th className="px-2 py-2">Product</th>
                      <th className="w-[80px] px-2 py-2 text-right">Qty</th>
                      <th className="w-[100px] px-2 py-2 text-right">Purchase ₹</th>
                      <th className="w-[100px] px-2 py-2 text-right">MRP ₹</th>
                      <th className="w-[100px] px-2 py-2 text-right">Selling ₹</th>
                      <th className="w-[60px] px-2 py-2 text-right">GST%</th>
                      <th className="w-[80px] px-2 py-2 text-right">GST ₹</th>
                      <th className="w-[100px] px-2 py-2 text-right">Amount</th>
                      <th className="w-[40px] px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item._uid} className="border-b border-border/50">
                        <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
                        <td className="px-2 py-1.5">
                          {item.productId ? (
                            <div>
                              <div className="font-medium">{item.productName}</div>
                              {item.barcode && (
                                <div className="text-xs text-muted-foreground">{item.barcode}</div>
                              )}
                            </div>
                          ) : (
                            <Input
                              value={item.productName}
                              onChange={(e) => updateItemName(item._uid, e.target.value)}
                              placeholder="Product name"
                              className="h-7 text-sm"
                            />
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0.001}
                            step="any"
                            value={item.qty}
                            onChange={(e) =>
                              updateItemNumeric(item._uid, 'qty', parseFloat(e.target.value) || 1)
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
                              updateItemNumeric(
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
                            value={item.mrp}
                            onChange={(e) =>
                              updateItemNumeric(item._uid, 'mrp', parseFloat(e.target.value) || 0)
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
                              updateItemNumeric(
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
                              updateItemNumeric(
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
                      value={supplierSearch.query}
                      onChange={(e) => supplierSearch.handleQueryChange(e.target.value)}
                      onFocus={() =>
                        supplierSearch.results.length > 0 && supplierSearch.setShowResults(true)
                      }
                      onBlur={() => setTimeout(() => supplierSearch.setShowResults(false), 200)}
                      placeholder="Search supplier..."
                      className="text-sm"
                    />
                    {supplierSearch.showResults && supplierSearch.results.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border bg-popover shadow-lg">
                        {supplierSearch.results.map((s) => (
                          <button
                            key={s.id}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              supplierSearch.selectSupplier(s)
                            }}
                          >
                            <div>
                              <div className="font-medium">{s.name}</div>
                              {s.city && (
                                <div className="text-xs text-muted-foreground">{s.city}</div>
                              )}
                            </div>
                            {s.phone && (
                              <span className="text-xs text-muted-foreground">{s.phone}</span>
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
                          clearSupplier()
                          supplierSearch.setQuery('')
                          supplierSearch.clearResults()
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
                      onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                      placeholder="Surat, Bengaluru..."
                      className="pl-8 text-sm"
                    />
                    {showCityDropdown && cities.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-36 overflow-auto rounded-lg border bg-popover shadow-lg">
                        {cities
                          .filter((c) => c.toLowerCase().includes(city.toLowerCase()))
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
                      {(['cash', 'upi', 'card', 'cheque'] as const).map((mode) => (
                        <Button
                          key={mode}
                          variant={paymentMode === mode ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs capitalize"
                          onClick={() => setPaymentMode(mode)}
                        >
                          {mode}
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['paid', 'partial', 'unpaid'] as const).map((status) => (
                        <Button
                          key={status}
                          variant={paymentStatus === status ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs capitalize"
                          onClick={() => setPaymentStatus(status)}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                    {paymentStatus === 'partial' && (
                      <div>
                        <Label className="text-xs">Amount Paid</Label>
                        <Input
                          type="number"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
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
                      <span className="text-primary">{formatCurrency(grandTotal)}</span>
                    </div>
                    {items.length > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Avg Margin</span>
                        <span>
                          {(
                            (items.reduce(
                              (s, i) => s + (i.sellingRate - i.purchaseRate) * i.qty,
                              0
                            ) /
                              Math.max(subtotal, 1)) *
                            100
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
                onClick={() => checkOwnerPermission('record purchases', handleSave)}
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
            const p = await purchasesService.getById(id)
            setViewPurchase(p)
          }}
          onDelete={(id) => {
            checkOwnerPermission('delete purchases', () => setConfirmDeleteId(id))
          }}
          onRefresh={loadPurchases}
        />
      )}

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Purchase?</DialogTitle>
            <DialogDescription>
              This will reverse the stock changes. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirmDeleteId) return
                try {
                  await purchasesService.delete(confirmDeleteId)
                  toast.success('Purchase deleted, stock reversed')
                  loadPurchases()
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : 'Failed to delete')
                }
                setConfirmDeleteId(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Purchase Dialog */}
      {viewPurchase && (
        <Dialog open onOpenChange={() => setViewPurchase(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Purchase: {viewPurchase.purchaseNo}</DialogTitle>
              <DialogDescription>
                {viewPurchase.date} • {viewPurchase.supplierName || 'No supplier'}{' '}
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
                  {(viewPurchase.items || []).map((item, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-3 py-1.5">{idx + 1}</td>
                      <td className="px-2 py-1.5">{item.productName}</td>
                      <td className="px-2 py-1.5 text-right">{item.qty}</td>
                      <td className="px-2 py-1.5 text-right">
                        {formatCurrency(item.purchaseRate)}
                      </td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency(item.sellingRate)}</td>
                      <td className="px-2 py-1.5 text-right font-medium">
                        {formatCurrency(item.amount)}
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
                  variant={viewPurchase.paymentStatus === 'paid' ? 'default' : 'destructive'}
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
          supplierSearch.selectSupplier(supplier)
          setShowNewSupplier(false)
          loadCities()
          toast.success(`Supplier "${supplier.name}" created`)
        }}
      />

      <OwnerActionGuard
        open={guardOpen}
        onClose={() => setGuardOpen(false)}
        onAuthorize={() => {
          if (guardAction) guardAction.callback()
        }}
        actionLabel={guardAction?.label || 'perform this action'}
      />
    </div>
  )
}

// ---- Purchase History Component ----
