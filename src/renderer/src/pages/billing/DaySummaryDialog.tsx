import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../../components/ui/dialog'
import {
  Banknote,
  Smartphone,
  CreditCard,
  User,
  TrendingUp,
  BarChart3,
  Wallet,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { billingService } from '../../services/billing.service'
import { expensesService } from '../../services/expenses.service'
import type { DailySummary } from '@shared/types'

export function DaySummaryDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): React.JSX.Element {
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

    setLoading(true)
    Promise.all([billingService.getDailySummary(today), expensesService.getByDate(today)])
      .then(([s, exps]) => {
        setSummary(s)
        setTotalExpenses(
          (exps as { amount: number }[]).reduce((acc, e) => acc + (e.amount ?? 0), 0)
        )
      })
      .finally(() => setLoading(false))
  }, [open])

  const netIncome = summary ? summary.totalSales - totalExpenses : 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Today&apos;s Summary
          </DialogTitle>
          <DialogDescription>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </DialogDescription>
        </DialogHeader>

        {loading || !summary ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {/* Total Sales */}
            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 p-4 text-center">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Total Sales
              </div>
              <div className="text-3xl font-bold font-amount gradient-text">
                {formatCurrency(summary.totalSales)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {summary.totalBills} bill{summary.totalBills !== 1 ? 's' : ''} &bull;{' '}
                {summary.totalItems} items
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/60 bg-green-50/50 dark:bg-green-900/10 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Banknote className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-[11px] font-medium text-muted-foreground">Cash</span>
                </div>
                <div className="font-amount font-bold text-sm">
                  {formatCurrency(summary.cashSales)}
                </div>
                <div className="text-[10px] text-muted-foreground">{summary.cashBills} bills</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-blue-50/50 dark:bg-blue-900/10 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-[11px] font-medium text-muted-foreground">UPI</span>
                </div>
                <div className="font-amount font-bold text-sm">
                  {formatCurrency(summary.upiSales)}
                </div>
                <div className="text-[10px] text-muted-foreground">{summary.upiBills} bills</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-purple-50/50 dark:bg-purple-900/10 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <CreditCard className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-[11px] font-medium text-muted-foreground">Card</span>
                </div>
                <div className="font-amount font-bold text-sm">
                  {formatCurrency(summary.cardSales)}
                </div>
                <div className="text-[10px] text-muted-foreground">{summary.cardBills} bills</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-yellow-50/50 dark:bg-yellow-900/10 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <User className="h-3.5 w-3.5 text-yellow-600" />
                  <span className="text-[11px] font-medium text-muted-foreground">Credit</span>
                </div>
                <div className="font-amount font-bold text-sm">
                  {formatCurrency(summary.creditSales)}
                </div>
                <div className="text-[10px] text-muted-foreground">{summary.creditBills} bills</div>
              </div>
            </div>

            {/* Expenses + Net */}
            <div className="rounded-lg border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" />
                  Expenses
                </div>
                <span className="font-amount font-medium text-destructive">
                  &minus; {formatCurrency(totalExpenses)}
                </span>
              </div>
              <div className="border-t border-border/60 pt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-sm">
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  Net Income
                </div>
                <span
                  className={`font-amount font-bold text-sm ${netIncome >= 0 ? 'text-green-600' : 'text-destructive'}`}
                >
                  {formatCurrency(netIncome)}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
