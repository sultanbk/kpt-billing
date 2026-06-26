import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Separator } from '../../components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog'
import { Plus } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { toast } from 'sonner'
import { productsService } from '../../services/products.service'
import { categoriesService } from '../../services/categories.service'
import { GST_RATES, COMMON_HSN_CODES } from '@shared/constants'
import type { Product, ProductFormData } from '@shared/types'

/** Helper: given an entered price and mode, compute the exclusive base price */
export function toBasePrice(price: number, gstRate: number, inclusive: boolean): number {
  if (!inclusive || gstRate === 0) return price
  return price / (1 + gstRate / 100)
}

/** Helper: given a base price and GST rate, compute the GST amount */
export function gstOn(basePrice: number, gstRate: number): number {
  return (basePrice * gstRate) / 100
}

export function ProductFormDialog({
  open,
  onClose,
  product,
  categories,
  onCategoryCreated,
  onSaved
}: {
  open: boolean
  onClose: () => void
  product: Product | null
  categories: { id: number; name: string }[]
  onCategoryCreated: (category: { id: number; name: string }) => void
  onSaved: () => void
}): React.JSX.Element {
  const [form, setForm] = useState<ProductFormData>({
    name: '',
    category: '',
    costPrice: 0,
    mrp: 0,
    sellingPrice: 0,
    wholesalePrice: 0,
    gstRate: 5,
    priceIncludesGst: false,
    hsnCode: '',
    stock: 0,
    unit: 'pcs',
    lowStockThreshold: 5,
    barcode: '',
    description: ''
  })
  const [saving, setSaving] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        category: product.category || undefined,
        categoryId: product.categoryId || undefined,
        costPrice: product.costPrice,
        mrp: product.mrp || 0,
        sellingPrice: product.sellingPrice,
        wholesalePrice: product.wholesalePrice || 0,
        gstRate: product.gstRate,
        priceIncludesGst: product.priceIncludesGst || false,
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
        categoryId: categories[0]?.id,
        costPrice: 0,
        mrp: 0,
        sellingPrice: 0,
        wholesalePrice: 0,
        gstRate: 5,
        priceIncludesGst: false,
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
        await productsService.update(product.id, form)
        toast.success('Product updated')
      } else {
        await productsService.create(form)
        toast.success('Product created')
      }
      onSaved()
    } catch {
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

  const handleCreateCategory = async (): Promise<void> => {
    const name = newCategoryName.trim()
    if (!name) {
      toast.error('Category name is required')
      return
    }

    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      updateField('category', existing.name)
      updateField('categoryId', existing.id)
      setShowNewCategory(false)
      setNewCategoryName('')
      toast.info('Category already exists')
      return
    }

    setCreatingCategory(true)
    try {
      const category = await categoriesService.create(name)
      onCategoryCreated(category)
      updateField('category', category.name)
      updateField('categoryId', category.id)
      setShowNewCategory(false)
      setNewCategoryName('')
      toast.success('Category added')
    } catch {
      toast.error('Failed to add category')
    }
    setCreatingCategory(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
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
              <div className="flex items-center justify-between gap-2">
                <Label>Category</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setShowNewCategory((value) => !value)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New
                </Button>
              </div>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => {
                  const categoryName = e.target.value
                  const category = categories.find((c) => c.name === categoryName)
                  updateField('category', categoryName)
                  updateField('categoryId', category?.id)
                }}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {showNewCategory && (
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleCreateCategory()
                      }
                    }}
                    placeholder="New category name"
                    className="h-9"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 shrink-0"
                    disabled={creatingCategory}
                    onClick={() => void handleCreateCategory()}
                  >
                    {creatingCategory ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              )}
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

            {/* GST Settings: Rate + Inclusive/Exclusive toggle Ã¢â‚¬â€ shown BEFORE price fields */}
            <div className="col-span-2">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  {/* GST Rate */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Label className="text-sm font-medium shrink-0">GST Rate</Label>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm w-24"
                      value={form.gstRate}
                      onChange={(e) => updateField('gstRate', parseInt(e.target.value))}
                    >
                      {GST_RATES.map((r) => (
                        <option key={r} value={r}>
                          {r}%
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Incl / Excl toggle Ã¢â‚¬â€ clean two-button pill */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium shrink-0">Price Mode</Label>
                    <div className="flex rounded-md border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateField('priceIncludesGst', false)}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          !form.priceIncludesGst
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Excl. GST
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('priceIncludesGst', true)}
                        className={`px-3 py-1 text-xs font-medium transition-colors border-l border-border ${
                          form.priceIncludesGst
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Incl. GST
                      </button>
                    </div>
                  </div>
                </div>

                {/* Context line */}
                <p className="text-xs text-muted-foreground">
                  {form.priceIncludesGst
                    ? 'Prices you enter already include GST - the base taxable amount will be back-calculated.'
                    : 'Prices you enter are before GST - GST will be added on top when billing.'}
                </p>
              </div>
            </div>

            {/* Cost Price */}
            <div className="space-y-1.5">
              <Label>
                Cost Price (INR){' '}
                <span
                  className={`text-xs ${
                    form.priceIncludesGst
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  {form.priceIncludesGst ? '(incl. GST)' : '(excl. GST)'}
                </span>
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.costPrice || ''}
                onChange={(e) => updateField('costPrice', parseFloat(e.target.value) || 0)}
              />
              {form.priceIncludesGst && form.gstRate > 0 && form.costPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  Base: {formatCurrency(toBasePrice(form.costPrice, form.gstRate, true))} + GST{' '}
                  {formatCurrency(
                    gstOn(toBasePrice(form.costPrice, form.gstRate, true), form.gstRate)
                  )}
                </p>
              )}
            </div>

            {/* MRP */}
            <div className="space-y-1.5">
              <Label>
                MRP (INR){' '}
                <span
                  className={`text-xs ${
                    form.priceIncludesGst
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  {form.priceIncludesGst ? '(incl. GST)' : '(excl. GST)'}
                </span>
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.mrp || ''}
                onChange={(e) => updateField('mrp', parseFloat(e.target.value) || 0)}
              />
              {form.priceIncludesGst && form.gstRate > 0 && (form.mrp || 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Base: {formatCurrency(toBasePrice(form.mrp!, form.gstRate, true))} + GST{' '}
                  {formatCurrency(gstOn(toBasePrice(form.mrp!, form.gstRate, true), form.gstRate))}
                </p>
              )}
            </div>

            {/* Selling Price */}
            <div className="space-y-1.5">
              <Label>
                Selling Price (INR) <span className="text-destructive">*</span>{' '}
                <span
                  className={`text-xs ${
                    form.priceIncludesGst
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  {form.priceIncludesGst ? '(incl. GST)' : '(excl. GST)'}
                </span>
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.sellingPrice || ''}
                onChange={(e) => updateField('sellingPrice', parseFloat(e.target.value) || 0)}
              />
              {form.priceIncludesGst && form.gstRate > 0 && form.sellingPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  Base: {formatCurrency(toBasePrice(form.sellingPrice, form.gstRate, true))} + GST{' '}
                  {formatCurrency(
                    gstOn(toBasePrice(form.sellingPrice, form.gstRate, true), form.gstRate)
                  )}
                </p>
              )}
              {!form.priceIncludesGst && form.gstRate > 0 && form.sellingPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  Customer pays:{' '}
                  {formatCurrency(form.sellingPrice + gstOn(form.sellingPrice, form.gstRate))}
                </p>
              )}
            </div>

            {/* Wholesale Price (INR) */}
            <div className="space-y-1.5">
              <Label>
                Wholesale Price (INR){' '}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.wholesalePrice || ''}
                onChange={(e) => updateField('wholesalePrice', parseFloat(e.target.value) || 0)}
                placeholder="Leave blank if not applicable"
              />
            </div>

            {/* GST Price Breakdown */}
            {form.sellingPrice > 0 && form.gstRate > 0 && (
              <div className="col-span-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  GST Breakdown - Selling Price
                </div>
                {(() => {
                  const base = toBasePrice(form.sellingPrice, form.gstRate, !!form.priceIncludesGst)
                  const gstTotal = gstOn(base, form.gstRate)
                  const cgst = gstTotal / 2
                  const sgst = gstTotal / 2
                  const final = base + gstTotal
                  return (
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">Taxable Base</div>
                        <div className="font-medium font-amount">{formatCurrency(base)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">
                          CGST ({form.gstRate / 2}%)
                        </div>
                        <div className="font-medium font-amount">{formatCurrency(cgst)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">
                          SGST ({form.gstRate / 2}%)
                        </div>
                        <div className="font-medium font-amount">{formatCurrency(sgst)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Final (incl. GST)</div>
                        <div className="font-semibold font-amount text-primary">
                          {formatCurrency(final)}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

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
                onChange={(e) => updateField('lowStockThreshold', parseInt(e.target.value) || 0)}
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

          {/* Margin preview Ã¢â‚¬â€ always computed on BASE (excl. GST) prices for accuracy */}
          {form.costPrice > 0 && form.sellingPrice > 0 && (
            <div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              {(() => {
                const baseSell = toBasePrice(
                  form.sellingPrice,
                  form.gstRate,
                  !!form.priceIncludesGst
                )
                const baseCost = toBasePrice(form.costPrice, form.gstRate, !!form.priceIncludesGst)
                const marginAmt = baseSell - baseCost
                const marginPct = baseCost > 0 ? (marginAmt / baseCost) * 100 : 0
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Margin (on base price excl. GST)
                      </span>
                      <span
                        className={`font-semibold ${
                          marginAmt >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                        }`}
                      >
                        {formatCurrency(marginAmt)}{' '}
                        <span className="font-normal text-muted-foreground text-xs">
                          ({marginPct.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    {form.priceIncludesGst && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">
                          Gross margin (prices as entered)
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(form.sellingPrice - form.costPrice)}
                        </span>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border pt-4">
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
