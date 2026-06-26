// ============================================================================
// KPT Billing - Product History Ledger (Stock & Price History)
// Track price changes and stock movements chronologically
// ============================================================================
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  PackagePlus,
  PackageMinus,
  Trash2,
  Database
} from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { productsService } from '../../services/products.service'

interface PriceHistoryEntry {
  id: number
  productId: number
  productName: string
  fieldName: string
  oldValue: number
  newValue: number
  changedBy: string | null
  createdAt: string
}

interface StockLedgerEntry {
  id: number
  productId: number
  productName: string
  type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'opening' | 'damage'
  qty: number
  referenceType: string | null
  referenceId: number | null
  notes: string | null
  createdBy: string | null
  createdAt: string
}

const STOCK_LEDGER_TYPES = new Set<StockLedgerEntry['type']>([
  'sale',
  'purchase',
  'adjustment',
  'return',
  'opening',
  'damage'
])

function toStockLedgerType(value: unknown): StockLedgerEntry['type'] {
  return typeof value === 'string' && STOCK_LEDGER_TYPES.has(value as StockLedgerEntry['type'])
    ? (value as StockLedgerEntry['type'])
    : 'adjustment'
}

interface PriceHistoryDialogProps {
  open: boolean
  onClose: () => void
  productId: number | null
  productName: string
}

const FIELD_LABELS: Record<string, string> = {
  selling_price: 'Selling Price',
  purchase_price: 'Purchase Price',
  wholesale_price: 'Wholesale Price'
}

const FIELD_COLORS: Record<string, string> = {
  selling_price: 'text-primary border-primary/20 bg-primary/5',
  purchase_price:
    'text-orange-600 border-orange-200 bg-orange-50/50 dark:text-orange-400 dark:border-orange-900 dark:bg-orange-950/20',
  wholesale_price:
    'text-purple-600 border-purple-200 bg-purple-50/50 dark:text-purple-400 dark:border-purple-900 dark:bg-purple-950/20'
}

export function PriceHistoryDialog({
  open,
  onClose,
  productId,
  productName
}: PriceHistoryDialogProps): React.JSX.Element {
  const [priceEntries, setPriceEntries] = useState<PriceHistoryEntry[]>([])
  const [stockEntries, setStockEntries] = useState<StockLedgerEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && productId) {
      setLoading(true)
      Promise.all([
        productsService.getPriceHistory(productId, 100),
        productsService.getStockLedger(productId, 100)
      ])
        .then(([priceRows, stockRows]) => {
          setPriceEntries(
            priceRows.map((r) => ({
              id: r.id as number,
              productId: r.productId as number,
              productName: (r.productName as string) || '',
              fieldName: (r.fieldName as string) || '',
              oldValue: (r.oldValue as number) || 0,
              newValue: (r.newValue as number) || 0,
              changedBy: (r.changedBy as string) || null,
              createdAt: (r.createdAt as string) || ''
            }))
          )

          setStockEntries(
            stockRows.map((r) => ({
              id: r.id as number,
              productId: r.productId as number,
              productName: (r.productName as string) || '',
              type: toStockLedgerType(r.type),
              qty: (r.qty as number) || 0,
              referenceType: (r.referenceType as string) || null,
              referenceId: (r.referenceId as number) || null,
              notes: (r.notes as string) || null,
              createdBy: (r.createdBy as string) || null,
              createdAt: (r.createdAt as string) || ''
            }))
          )
        })
        .catch(() => {
          setPriceEntries([])
          setStockEntries([])
        })
        .finally(() => setLoading(false))
    }
  }, [open, productId])

  const getChangeIndicator = (
    oldVal: number,
    newVal: number
  ): { icon: typeof TrendingUp; color: string; label: string } => {
    if (newVal > oldVal) {
      return {
        icon: TrendingUp,
        color: 'text-red-500',
        label: `+${formatCurrency(newVal - oldVal)}`
      }
    } else if (newVal < oldVal) {
      return {
        icon: TrendingDown,
        color: 'text-green-500',
        label: `-${formatCurrency(oldVal - newVal)}`
      }
    }
    return { icon: Minus, color: 'text-muted-foreground', label: 'No change' }
  }

  const getStockLedgerTypeDetails = (
    type: string,
    qty: number
  ): { label: string; bgClass: string; icon: typeof History } => {
    switch (type) {
      case 'opening':
        return {
          label: 'Opening Stock',
          bgClass:
            'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/30 dark:border-slate-800 dark:text-slate-400',
          icon: History
        }
      case 'purchase':
        return {
          label: 'Purchase / Restock',
          bgClass:
            'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400',
          icon: PackagePlus
        }
      case 'sale':
        return {
          label: 'Sale',
          bgClass:
            'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-400',
          icon: PackageMinus
        }
      case 'adjustment':
        return {
          label: 'Adjustment',
          bgClass:
            'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400',
          icon: qty >= 0 ? PackagePlus : PackageMinus
        }
      case 'return':
        return {
          label: 'Customer Return',
          bgClass:
            'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400',
          icon: PackagePlus
        }
      case 'damage':
        return {
          label: 'Damage / Loss',
          bgClass:
            'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400',
          icon: Trash2
        }
      default:
        return {
          label: type.charAt(0).toUpperCase() + type.slice(1),
          bgClass: 'bg-muted border-border text-muted-foreground',
          icon: History
        }
    }
  }

  const getReferenceText = (entry: StockLedgerEntry): string => {
    if (entry.type === 'opening') {
      return entry.notes || 'Initial inventory seed'
    }

    let refPrefix = ''
    if (entry.referenceType === 'bill') {
      refPrefix = 'Sale Bill'
    } else if (entry.referenceType === 'purchase') {
      refPrefix = 'Purchase Invoice'
    }

    const details = [refPrefix, entry.notes].filter(Boolean).join(' ')
    return details || entry.notes || 'Manual Update'
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Product History Ledger
          </DialogTitle>
          <DialogDescription className="font-medium text-foreground">
            {productName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading history data...
            </div>
          )}

          {!loading && (
            <Tabs defaultValue="stock" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/60 p-1 rounded-xl">
                <TabsTrigger value="stock" className="flex items-center gap-1.5 rounded-lg py-1.5">
                  <Database className="h-3.5 w-3.5" />
                  Stock Movements
                </TabsTrigger>
                <TabsTrigger value="price" className="flex items-center gap-1.5 rounded-lg py-1.5">
                  <History className="h-3.5 w-3.5" />
                  Price History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stock" className="mt-0 outline-none">
                {stockEntries.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                    No stock movements recorded for this product.
                  </div>
                ) : (
                  <ScrollArea className="max-h-[360px] pr-2">
                    <div className="space-y-2">
                      {stockEntries.map((entry) => {
                        const details = getStockLedgerTypeDetails(entry.type, entry.qty)
                        const Icon = details.icon
                        const isQtyPositive = entry.qty >= 0

                        return (
                          <div
                            key={entry.id}
                            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-colors hover:bg-muted/10"
                          >
                            <div className={`rounded-xl p-2.5 ${details.bgClass} shrink-0 border`}>
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] py-0 px-1.5 ${details.bgClass}`}
                                >
                                  {details.label}
                                </Badge>
                                <span
                                  className={`text-xs font-semibold ${isQtyPositive ? 'text-green-600' : 'text-red-500'}`}
                                >
                                  {isQtyPositive ? '+' : ''}
                                  {entry.qty} pcs
                                </span>
                              </div>
                              <div className="text-sm font-medium mt-1 truncate text-foreground/80">
                                {getReferenceText(entry)}
                              </div>
                              {entry.createdBy && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  recorded by {entry.createdBy}
                                </div>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground text-right shrink-0">
                              {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                              <br />
                              {new Date(entry.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="price" className="mt-0 outline-none">
                {priceEntries.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                    No price changes recorded yet for this product.
                  </div>
                ) : (
                  <ScrollArea className="max-h-[360px] pr-2">
                    <div className="space-y-2">
                      {priceEntries.map((entry) => {
                        const change = getChangeIndicator(entry.oldValue, entry.newValue)
                        const ChangeIcon = change.icon

                        return (
                          <div
                            key={entry.id}
                            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-colors hover:bg-muted/10"
                          >
                            <div
                              className={`shrink-0 rounded-xl p-2 border ${change.color} bg-background`}
                            >
                              <ChangeIcon className="h-4 w-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] py-0 px-1.5 ${FIELD_COLORS[entry.fieldName] || ''}`}
                                >
                                  {FIELD_LABELS[entry.fieldName] || entry.fieldName}
                                </Badge>
                                <span className={`text-xs font-semibold ${change.color}`}>
                                  {change.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 text-sm">
                                <span className="font-amount text-muted-foreground line-through">
                                  {formatCurrency(entry.oldValue)}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-amount font-semibold text-foreground/80">
                                  {formatCurrency(entry.newValue)}
                                </span>
                              </div>
                              {entry.changedBy && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  changed by {entry.changedBy}
                                </div>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground text-right shrink-0">
                              {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                              <br />
                              {new Date(entry.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
