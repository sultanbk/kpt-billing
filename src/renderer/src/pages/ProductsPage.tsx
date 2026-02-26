import { useEffect, useState, useCallback } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select'
import { Label } from '../components/ui/label'
import { Separator } from '../components/ui/separator'
import { Textarea } from '../components/ui/textarea'
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
  FileDown,
  History,
  Database
} from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { toast } from 'sonner'
import type { Product, ProductFormData } from '@shared/types'
import { GST_RATES, COMMON_HSN_CODES } from '@shared/constants'
import { BulkStockUpdateDialog } from '../components/products/BulkStockUpdateDialog'
import { PriceHistoryDialog } from '../components/products/PriceHistoryDialog'

const PAGE_SIZE = 25

export default function ProductsPage(): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(false)

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

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      // Find categoryId from name for filter
      let filterCategoryId: number | undefined
      if (categoryFilter) {
        const match = categories.find((c) => c.name === categoryFilter)
        if (match) filterCategoryId = match.id
      }

      const result = await window.api.products.getAll({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        categoryId: filterCategoryId,
        sortBy: 'name',
        sortOrder: 'asc'
      })
      setProducts(result.data)
      setTotal(result.total)
    } catch (err) {
      toast.error('Failed to load products')
    }
    setLoading(false)
  }, [page, search, categoryFilter, categories])

  const loadCategories = useCallback(async () => {
    try {
      const cats = await window.api.categories.getAll()
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

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, categoryFilter])

  const handleDelete = async (): Promise<void> => {
    if (!showDelete) return
    try {
      await window.api.products.delete(showDelete.id)
      toast.success('Product deleted')
      setShowDelete(null)
      loadProducts()
    } catch (err) {
      toast.error('Failed to delete product')
    }
  }

  const handleImportCsv = async (): Promise<void> => {
    try {
      const result = await window.api.dialog.openFile({
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      })
      if (!result) return

      const importResult = await window.api.products.import(result as any)
      toast.success(`Imported ${importResult.imported} products. ${importResult.skipped} skipped.`)
      if (importResult.errors && importResult.errors.length > 0) {
        importResult.errors.slice(0, 5).forEach((e: string) => toast.warning(e))
      }
      loadProducts()
    } catch (err) {
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
      await window.api.products.adjustStock(showStockAdjust.id, qty, adjustType, adjustNotes)
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
      const result = await window.api.export.stockReport()
      if (result.success && result.path) {
        toast.success(`Exported to ${result.path}`)
      }
    } catch {
      toast.error('Export failed')
    }
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
          <Button variant="outline" onClick={() => setShowBulkUpdate(true)} className="gap-2">
            <Database className="h-4 w-4" />
            Bulk Stock Update
          </Button>
          <Button variant="outline" onClick={handleImportCsv} className="gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(null)
              setShowForm(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
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
            <option key={c.id} value={c.name}>{c.name}</option>
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
                        <Badge variant="destructive" className="text-[10px]">Out</Badge>
                      )}
                      {product.stock > 0 && product.stock <= (product.lowStockThreshold || 5) && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-[10px]">
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
                  </TableCell>
                  <TableCell className="text-right font-amount font-medium">
                    {formatCurrency(product.sellingPrice)}
                  </TableCell>
                  <TableCell className="text-right font-amount">
                    {product.stock}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-[10px]">{product.gstRate}%</Badge>
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
                          onClick={() => {
                            setEditingProduct(product)
                            setShowForm(true)
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setShowStockAdjust(product)
                            setAdjustType('purchase')
                            setAdjustQty(0)
                            setAdjustNotes('')
                          }}
                        >
                          <PackagePlus className="mr-2 h-4 w-4" />
                          Adjust Stock
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setShowPriceHistory(product)}
                        >
                          <History className="mr-2 h-4 w-4" />
                          Price History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setShowDelete(product)}
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
              {showStockAdjust?.name} — Current stock: {showStockAdjust?.stock ?? 0}
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
    </div>
  )
}

// ---- Product Form Dialog ----

function ProductFormDialog({
  open,
  onClose,
  product,
  categories,
  onSaved
}: {
  open: boolean
  onClose: () => void
  product: Product | null
  categories: { id: number; name: string }[]
  onSaved: () => void
}): React.JSX.Element {
  const [form, setForm] = useState<ProductFormData>({
    name: '',
    category: '',
    costPrice: 0,
    sellingPrice: 0,
    gstRate: 5,
    hsnCode: '',
    stock: 0,
    unit: 'pcs',
    lowStockThreshold: 5,
    barcode: '',
    description: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        category: product.category || undefined,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        gstRate: product.gstRate,
        hsnCode: product.hsnCode || '',
        stock: product.stock,
        unit: product.unit || 'pcs',
        lowStockThreshold: product.lowStockThreshold || 5,
        barcode: product.barcode || '',
        description: product.description || ''
      })
    } else {
      setForm({
        name: '',
        category: categories[0]?.name || '',
        costPrice: 0,
        sellingPrice: 0,
        gstRate: 5,
        hsnCode: '',
        stock: 0,
        unit: 'pcs',
        lowStockThreshold: 5,
        barcode: '',
        description: ''
      })
    }
  }, [product, open, categories])

  const handleSave = async (): Promise<void> => {
    if (!form.name.trim()) {
      toast.error('Product name is required')
      return
    }
    if (form.sellingPrice <= 0) {
      toast.error('Selling price must be greater than 0')
      return
    }

    setSaving(true)
    try {
      if (product) {
        await window.api.products.update(product.id, form)
        toast.success('Product updated')
      } else {
        await window.api.products.create(form)
        toast.success('Product created')
      }
      onSaved()
    } catch (err) {
      toast.error('Failed to save product')
    }
    setSaving(false)
  }

  const updateField = <K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K]
  ): void => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Name */}
          <div className="col-span-2 space-y-2">
            <Label>
              Product Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Kanchipuram Silk Saree - Red"
              autoFocus
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* HSN Code */}
          <div className="space-y-2">
            <Label>HSN Code</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.hsnCode}
              onChange={(e) => updateField('hsnCode', e.target.value)}
            >
              <option value="">Select HSN</option>
              {COMMON_HSN_CODES.map((h) => (
                <option key={h.code} value={h.code}>
                  {h.code} - {h.description}
                </option>
              ))}
            </select>
          </div>

          <Separator className="col-span-2" />

          {/* Cost Price */}
          <div className="space-y-2">
            <Label>Cost Price (₹)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.costPrice || ''}
              onChange={(e) => updateField('costPrice', parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Selling Price */}
          <div className="space-y-2">
            <Label>
              Selling Price (₹) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.sellingPrice || ''}
              onChange={(e) => updateField('sellingPrice', parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* GST Rate */}
          <div className="space-y-2">
            <Label>GST Rate (%)</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.gstRate}
              onChange={(e) => updateField('gstRate', parseInt(e.target.value))}
            >
              {GST_RATES.map((r) => (
                <option key={r} value={r}>{r}%</option>
              ))}
            </select>
          </div>

          {/* Unit */}
          <div className="space-y-2">
            <Label>Unit</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.unit}
              onChange={(e) => updateField('unit', e.target.value)}
            >
              <option value="pcs">Pieces</option>
              <option value="mtr">Meters</option>
              <option value="kg">Kilograms</option>
              <option value="set">Set</option>
              <option value="box">Box</option>
            </select>
          </div>

          <Separator className="col-span-2" />

          {/* Stock */}
          <div className="space-y-2">
            <Label>Opening Stock</Label>
            <Input
              type="number"
              min={0}
              value={form.stock || ''}
              onChange={(e) => updateField('stock', parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Low Stock Threshold */}
          <div className="space-y-2">
            <Label>Low Stock Alert</Label>
            <Input
              type="number"
              min={0}
              value={form.lowStockThreshold || ''}
              onChange={(e) =>
                updateField('lowStockThreshold', parseInt(e.target.value) || 0)
              }
            />
          </div>

          {/* Barcode */}
          <div className="space-y-2">
            <Label>Barcode</Label>
            <Input
              value={form.barcode || ''}
              onChange={(e) => updateField('barcode', e.target.value)}
              placeholder="Scan or enter barcode"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </div>

        {/* Margin preview */}
        {form.costPrice > 0 && form.sellingPrice > 0 && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <span className="text-muted-foreground">Margin: </span>
            <span className="font-medium">
              {formatCurrency(form.sellingPrice - form.costPrice)}
            </span>
            <span className="text-muted-foreground"> ({((form.sellingPrice - form.costPrice) / form.costPrice * 100).toFixed(1)}%)</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
