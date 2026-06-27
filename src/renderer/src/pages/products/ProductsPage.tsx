import { useEffect, useState, useCallback } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import {
  Plus,
  Search,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  PackagePlus,
  PackageMinus,
  Printer,
  FileDown,
  History,
  Database
} from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { toast } from 'sonner'
import type { Product } from '@shared/types'

import { ProductFormDialog } from './ProductFormDialog'
import { BulkStockUpdateDialog } from '../../components/products/BulkStockUpdateDialog'
import { PriceHistoryDialog } from '../../components/products/PriceHistoryDialog'
import { productsService } from '../../services/products.service'
import { categoriesService } from '../../services/categories.service'
import { purchasesService } from '../../services/purchases.service'
import { dialogService } from '../../services/dialog.service'
import { exportService } from '../../services/export.service'
import { printerService } from '../../services/printer.service'
import { settingsService } from '../../services/settings.service'
import { useAuthStore } from '../../stores/auth.store'
import { OwnerActionGuard } from '../../components/layout'
import { LimitGate } from '../../components/license'

const PAGE_SIZE = 25

export default function ProductsPage(): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(false)

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

  // Dialog states
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showDelete, setShowDelete] = useState<Product | null>(null)
  const [showStockAdjust, setShowStockAdjust] = useState<Product | null>(null)
  const [adjustType, setAdjustType] = useState<string>('purchase')
  const [adjustQty, setAdjustQty] = useState<number>(0)
  const [adjustNotes, setAdjustNotes] = useState<string>('')
  const [showBulkUpdate, setShowBulkUpdate] = useState(false)
  const [showPriceHistory, setShowPriceHistory] = useState<Product | null>(null)
  const [showLabelPrint, setShowLabelPrint] = useState<Product | null>(null)
  const [labelQty, setLabelQty] = useState<number>(1)
  const [labelSize, setLabelSize] = useState<'46x25' | '60x40'>('46x25')
  const [labelPrinter, setLabelPrinter] = useState<string>('')
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([])
  const [loadingPrinters, setLoadingPrinters] = useState(false)
  const [printingLabels, setPrintingLabels] = useState(false)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      // Find categoryId from name for filter
      let filterCategoryId: number | undefined
      if (categoryFilter) {
        const match = categories.find((c) => c.name === categoryFilter)
        if (match) filterCategoryId = match.id
      }

      const result = await productsService.getAll({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        categoryId: filterCategoryId,
        sortBy: 'name',
        sortOrder: 'asc'
      })
      setProducts(result.data)
      setTotal(result.total)
    } catch {
      toast.error('Failed to load products')
    }
    setLoading(false)
  }, [page, search, categoryFilter, categories])

  const loadCategories = useCallback(async () => {
    try {
      const cats = await categoriesService.getAll()
      setCategories(cats)
    } catch {
      /* use defaults */
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    const unsubscribe = purchasesService.onCreated(() => {
      loadProducts()
    })
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [loadProducts])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, categoryFilter])

  const handleDelete = async (): Promise<void> => {
    if (!showDelete) return
    try {
      await productsService.delete(showDelete.id)
      toast.success('Product deleted')
      setShowDelete(null)
      loadProducts()
    } catch {
      toast.error('Failed to delete product')
    }
  }

  const handleImportCsv = async (): Promise<void> => {
    try {
      const result = await dialogService.openFile({
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      })
      if (!result) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const importResult = await productsService.import(result as any)
      toast.success(`Imported ${importResult.imported} products. ${importResult.skipped} skipped.`)
      if (importResult.errors && importResult.errors.length > 0) {
        importResult.errors.slice(0, 5).forEach((e: string) => toast.warning(e))
      }
      loadProducts()
    } catch {
      toast.error('Import failed')
    }
  }

  const handleStockAdjust = async (): Promise<void> => {
    if (!showStockAdjust || adjustQty === 0) {
      toast.error('Quantity must not be zero')
      return
    }
    try {
      const qty = adjustType === 'damage' ? -Math.abs(adjustQty) : Math.abs(adjustQty)
      await productsService.adjustStock(showStockAdjust.id, qty, adjustType, adjustNotes)
      toast.success(`Stock ${adjustType === 'damage' ? 'reduced' : 'added'} successfully`)
      setShowStockAdjust(null)
      setAdjustQty(0)
      setAdjustNotes('')
      loadProducts()
    } catch {
      toast.error('Stock adjustment failed')
    }
  }

  const handleExportStock = async (): Promise<void> => {
    try {
      const result = await exportService.stockReport()
      if (result.success && result.path) {
        toast.success(`Exported to ${result.path}`)
      }
    } catch {
      toast.error('Export failed')
    }
  }

  const openLabelDialog = async (product: Product): Promise<void> => {
    setShowLabelPrint(product)
    setLabelQty(1)
    setLoadingPrinters(true)
    try {
      const [printers, labelConfigured, receiptConfigured, defaultSize] = await Promise.all([
        printerService.getAvailable(),
        settingsService.get('labelPrinterName'),
        settingsService.get('receiptPrinterName'),
        settingsService.get('barcodeLabelSize')
      ])
      const preferred = (labelConfigured || receiptConfigured || '').trim()
      setAvailablePrinters(printers)
      setLabelPrinter(preferred || printers[0] || '')
      setLabelSize((defaultSize as '46x25' | '60x40') || '46x25')
    } catch {
      toast.error('Failed to load available printers')
      setAvailablePrinters([])
      setLabelPrinter('')
      setLabelSize('46x25')
    }
    setLoadingPrinters(false)
  }

  const handlePrintLabels = async (): Promise<void> => {
    if (!showLabelPrint) return
    if (!labelPrinter.trim()) {
      toast.error('Select a label printer first')
      return
    }

    setPrintingLabels(true)
    try {
      const result = await productsService.printLabels({
        productId: showLabelPrint.id,
        quantity: Math.min(Math.max(Math.floor(labelQty || 1), 1), 500),
        printerName: labelPrinter.trim(),
        labelSize
      })

      if (result?.success) {
        toast.success(
          `Printed ${result.quantity} label(s) for ${showLabelPrint.name} on ${result.printerName}`
        )
        setShowLabelPrint(null)
      } else {
        toast.error('Label printing failed')
      }
    } catch {
      toast.error('Label printing failed')
    }
    setPrintingLabels(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex h-full flex-col page-enter">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">{total} products total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportStock} className="gap-2">
            <FileDown className="h-4 w-4" />
            Export Stock
          </Button>
          <Button
            variant="outline"
            onClick={() => checkOwnerPermission('bulk stock update', () => setShowBulkUpdate(true))}
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            Bulk Stock Update
          </Button>
          <Button
            variant="outline"
            onClick={() => checkOwnerPermission('import products CSV', handleImportCsv)}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <LimitGate limitKey="maxProducts" currentCount={total}>
            <Button
              onClick={() =>
                checkOwnerPermission('add products', () => {
                  setEditingProduct(null)
                  setShowForm(true)
                })
              }
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </LimitGate>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Selling</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-center">GST</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  {loading ? 'Loading...' : 'No products found'}
                </TableCell>
              </TableRow>
            ) : (
              products.map((product, idx) => (
                <TableRow key={product.id} className="group">
                  <TableCell className="text-muted-foreground">
                    {(page - 1) * PAGE_SIZE + idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{product.name}</span>
                      {product.stock <= 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                          Out
                        </Badge>
                      )}
                      {product.stock > 0 && product.stock <= (product.lowStockThreshold || 5) && (
                        <Badge
                          variant="outline"
                          className="border-yellow-500 text-yellow-600 text-[10px]"
                        >
                          Low
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {product.sku}
                  </TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="text-right font-amount">
                    {formatCurrency(product.costPrice)}
                    {product.priceIncludesGst && product.gstRate > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        base {formatCurrency(product.costPrice / (1 + product.gstRate / 100))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-amount font-medium">
                    {formatCurrency(product.sellingPrice)}
                    {product.priceIncludesGst && product.gstRate > 0 ? (
                      <div className="text-[10px] text-muted-foreground">
                        base {formatCurrency(product.sellingPrice / (1 + product.gstRate / 100))}
                      </div>
                    ) : product.gstRate > 0 ? (
                      <div className="text-[10px] text-muted-foreground">
                        +GST{' '}
                        {formatCurrency(
                          product.sellingPrice + (product.sellingPrice * product.gstRate) / 100
                        )}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-amount">{product.stock}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${product.priceIncludesGst ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}`}
                    >
                      {product.gstRate}% {product.priceIncludesGst ? 'Incl.' : 'Excl.'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            checkOwnerPermission('edit products', () => {
                              setEditingProduct(product)
                              setShowForm(true)
                            })
                          }
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            checkOwnerPermission('adjust product stock', () => {
                              setShowStockAdjust(product)
                              setAdjustType('purchase')
                              setAdjustQty(0)
                              setAdjustNotes('')
                            })
                          }
                        >
                          <PackagePlus className="mr-2 h-4 w-4" />
                          Adjust Stock
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowPriceHistory(product)}>
                          <History className="mr-2 h-4 w-4" />
                          Product History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void openLabelDialog(product)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print Labels
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            checkOwnerPermission('delete products', () => setShowDelete(product))
                          }
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-6 py-3">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} items)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Product Dialog */}
      <ProductFormDialog
        open={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingProduct(null)
        }}
        product={editingProduct}
        categories={categories}
        onCategoryCreated={(category) => {
          setCategories((prev) => {
            const next = prev.some((c) => c.id === category.id) ? prev : [...prev, category]
            return next.sort((a, b) => a.name.localeCompare(b.name))
          })
        }}
        onSaved={() => {
          setShowForm(false)
          setEditingProduct(null)
          loadProducts()
        }}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{showDelete?.name}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={!!showStockAdjust} onOpenChange={() => setShowStockAdjust(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {adjustType === 'damage' ? (
                <PackageMinus className="h-5 w-5 text-destructive" />
              ) : (
                <PackagePlus className="h-5 w-5 text-primary" />
              )}
              Adjust Stock
            </DialogTitle>
            <DialogDescription>
              {showStockAdjust?.name} Ã¢â‚¬â€ Current stock: {showStockAdjust?.stock ?? 0}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Adjustment Type</Label>
              <Select value={adjustType} onValueChange={setAdjustType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Purchase / Restock</SelectItem>
                  <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                  <SelectItem value="damage">Damage / Loss</SelectItem>
                  <SelectItem value="return">Vendor Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={adjustQty || ''}
                onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                placeholder={adjustType === 'damage' ? 'Qty to remove' : 'Qty to add'}
              />
              {adjustType === 'damage' && adjustQty > 0 && (
                <p className="text-xs text-destructive">
                  Stock will be reduced by {adjustQty}. New stock:{' '}
                  {(showStockAdjust?.stock ?? 0) - adjustQty}
                </p>
              )}
              {adjustType !== 'damage' && adjustQty > 0 && (
                <p className="text-xs text-muted-foreground">
                  Stock will increase by {adjustQty}. New stock:{' '}
                  {(showStockAdjust?.stock ?? 0) + adjustQty}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="e.g. Purchase invoice #123, Damaged in transit..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockAdjust(null)}>
              Cancel
            </Button>
            <Button onClick={handleStockAdjust} disabled={adjustQty === 0}>
              {adjustType === 'damage' ? 'Remove Stock' : 'Add Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Stock Update Dialog */}
      <BulkStockUpdateDialog
        open={showBulkUpdate}
        onClose={() => setShowBulkUpdate(false)}
        onComplete={() => {
          setShowBulkUpdate(false)
          loadProducts()
        }}
      />

      {/* Price History Dialog */}
      {showPriceHistory && (
        <PriceHistoryDialog
          open={!!showPriceHistory}
          productId={showPriceHistory.id}
          productName={showPriceHistory.name}
          onClose={() => setShowPriceHistory(null)}
        />
      )}

      {/* Label Print Dialog */}
      <Dialog open={!!showLabelPrint} onOpenChange={() => setShowLabelPrint(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Professional Barcode Labels
            </DialogTitle>
            <DialogDescription>
              {showLabelPrint?.name} ({showLabelPrint?.sku})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Label Printer</Label>
              <Select value={labelPrinter} onValueChange={setLabelPrinter}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingPrinters ? 'Loading printers...' : 'Select label printer'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availablePrinters.length === 0 ? (
                    <SelectItem value="__no_printer" disabled>
                      No printers found
                    </SelectItem>
                  ) : (
                    availablePrinters.map((printer) => (
                      <SelectItem key={printer} value={printer}>
                        {printer}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Label Size</Label>
                <Select
                  value={labelSize}
                  onValueChange={(value) => setLabelSize(value as '46x25' | '60x40')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="46x25">LP46 Standard (46 x 25 mm)</SelectItem>
                    <SelectItem value="60x40">Large (60 x 40 mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={labelQty || ''}
                  onChange={(e) => setLabelQty(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="font-medium">Label Content</div>
              <div className="text-muted-foreground">Product name and barcode only</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Barcode value: {showLabelPrint?.barcode || showLabelPrint?.sku}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLabelPrint(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!showLabelPrint) return
                try {
                  const res = await productsService.downloadLabels({
                    productId: showLabelPrint.id,
                    quantity: Math.min(Math.max(Math.floor(labelQty || 1), 1), 500),
                    labelSize
                  })
                  if (res.success && res.path) {
                    toast.success(`Saved: ${res.path}`)
                  } else {
                    toast.error('Label download failed')
                  }
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Label download failed'
                  toast.error(message)
                }
              }}
            >
              Download PDF
            </Button>
            <Button
              onClick={handlePrintLabels}
              disabled={printingLabels || loadingPrinters || !labelPrinter.trim()}
            >
              {printingLabels ? 'Printing...' : 'Print Labels'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

// ---- Product Form Dialog ----
