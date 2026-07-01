import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import type { BillItem } from '@shared/types'

export function CartRow({
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
    <tr className="border-b border-border/30 text-sm group hover:bg-accent/40 transition-colors odd:bg-muted/10">
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
            min={0.001}
            step="any"
            value={item.quantity}
            onChange={(e) => onUpdateQty(Math.max(0.001, parseFloat(e.target.value) || 1))}
            className="h-7 w-12 text-center text-sm px-1 font-semibold rounded-lg bg-background/90"
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
            onUpdateDiscount(
              parseFloat(e.target.value) || 0,
              item.discountType === 'percent'
                ? 'percentage'
                : item.discountType === 'flat'
                  ? 'amount'
                  : item.discountType
            )
          }
          className="h-7 w-16 text-right text-sm ml-auto bg-background/90"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-2 text-right font-amount font-medium">{formatCurrency(item.total)}</td>
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
