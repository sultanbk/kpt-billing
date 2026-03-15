// ============================================================================
// KPT Billing - Product Price History Dialog
// Track when prices changed and by how much
// ============================================================================
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { TrendingUp, TrendingDown, Minus, History } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'

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
  selling_price: 'text-primary',
  purchase_price: 'text-orange-600',
  wholesale_price: 'text-purple-600'
}

export function PriceHistoryDialog({
  open,
  onClose,
  productId,
  productName
}: PriceHistoryDialogProps): React.JSX.Element {
  const [entries, setEntries] = useState<PriceHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && productId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true)
      window.api.products
        .getPriceHistory(productId, 100)
        .then((rows) => {
          setEntries(
            rows.map((r: Record<string, unknown>) => ({
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
        })
        .catch(() => setEntries([]))
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Price History
          </DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          )}

          {!loading && entries.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No price changes recorded yet for this product.
            </div>
          )}

          {!loading && entries.length > 0 && (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {entries.map((entry) => {
                  const change = getChangeIndicator(entry.oldValue, entry.newValue)
                  const ChangeIcon = change.icon

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <div className={`shrink-0 ${change.color}`}>
                        <ChangeIcon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${FIELD_COLORS[entry.fieldName] || ''}`}
                          >
                            {FIELD_LABELS[entry.fieldName] || entry.fieldName}
                          </Badge>
                          <span className={`text-xs font-medium ${change.color}`}>
                            {change.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span className="font-amount text-muted-foreground line-through">
                            {formatCurrency(entry.oldValue)}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-amount font-medium">
                            {formatCurrency(entry.newValue)}
                          </span>
                        </div>
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
