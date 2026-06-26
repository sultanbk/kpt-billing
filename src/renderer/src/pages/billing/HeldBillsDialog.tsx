import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../../components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import type { HeldBill } from '@shared/types'

export function HeldBillsDialog({
  open,
  onClose,
  heldBills,
  onRecall,
  onDelete
}: {
  open: boolean
  onClose: () => void
  heldBills: HeldBill[]
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
          <div className="py-8 text-center text-muted-foreground">No held bills</div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {heldBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <div className="font-medium">{bill.customerName || 'Walk-in Customer'}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(bill.heldAt).toLocaleString('en-IN')} • {bill.items?.length || 0}{' '}
                      items
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
