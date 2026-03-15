// ============================================================================
// KPT Billing - Credit Aging Report Page
// 30/60/90 day overdue credit breakdowns
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table'
import { IndianRupee, AlertTriangle, Clock, TrendingDown, Phone, Download } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { toast } from 'sonner'
import dayjs from 'dayjs'

interface AgingCustomer {
  id: number
  name: string
  phone: string
  customerType: string
  currentBalance: number
  creditLimit: number | null
  lastCreditDate: string | null
  firstCreditDate: string | null
  lastPaymentDate: string | null
  daysOverdue: number
  agingBucket: 'current' | '31-60' | '61-90' | '90+'
}

interface AgingSummary {
  totalCustomers: number
  totalOutstanding: number
  currentAmount: number
  days3160: number
  days6190: number
  days90Plus: number
  currentCount: number
  count3160: number
  count6190: number
  count90Plus: number
}

function mapRecord<T>(raw: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camel] = value
  }
  return result as T
}

export default function CreditAgingPage(): React.JSX.Element {
  const [customers, setCustomers] = useState<AgingCustomer[]>([])
  const [summary, setSummary] = useState<AgingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterBucket, setFilterBucket] = useState<string>('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [agingRaw, summaryRaw] = await Promise.all([
        window.api.customers.getCreditAging(),
        window.api.customers.getCreditAgingSummary()
      ])
      setCustomers(agingRaw.map((r) => mapRecord<AgingCustomer>(r)))
      setSummary(mapRecord<AgingSummary>(summaryRaw))
    } catch {
      toast.error('Failed to load credit aging data')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  const filtered =
    filterBucket === 'all' ? customers : customers.filter((c) => c.agingBucket === filterBucket)

  function getBucketBadge(bucket: string): React.JSX.Element {
    switch (bucket) {
      case 'current':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Current (0-30d)
          </Badge>
        )
      case '31-60':
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            31-60 days
          </Badge>
        )
      case '61-90':
        return (
          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            61-90 days
          </Badge>
        )
      case '90+':
        return <Badge variant="destructive">90+ days</Badge>
      default:
        return <Badge variant="outline">{bucket}</Badge>
    }
  }

  const handleExport = async (): Promise<void> => {
    try {
      const result = await window.api.export.customerReport()
      if (result.success && result.path) {
        toast.success('Credit report exported')
      }
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="flex h-full flex-col page-enter">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Credit Aging Report</h1>
          <p className="text-sm text-muted-foreground">30/60/90 day overdue credit breakdown</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Aging Bucket Summary Cards */}
        {summary && (
          <div className="grid grid-cols-5 gap-4">
            <Card
              className={`cursor-pointer transition-all ${filterBucket === 'all' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
              onClick={() => setFilterBucket('all')}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <IndianRupee className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Outstanding</p>
                    <p className="text-lg font-bold">{formatCurrency(summary.totalOutstanding)}</p>
                    <p className="text-xs text-muted-foreground">
                      {summary.totalCustomers} customers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${filterBucket === 'current' ? 'ring-2 ring-green-500' : 'hover:border-green-500/50'}`}
              onClick={() => setFilterBucket(filterBucket === 'current' ? 'all' : 'current')}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current (0-30d)</p>
                    <p className="text-lg font-bold">{formatCurrency(summary.currentAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {summary.currentCount} customers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${filterBucket === '31-60' ? 'ring-2 ring-amber-500' : 'hover:border-amber-500/50'}`}
              onClick={() => setFilterBucket(filterBucket === '31-60' ? 'all' : '31-60')}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">31-60 Days</p>
                    <p className="text-lg font-bold">{formatCurrency(summary.days3160)}</p>
                    <p className="text-xs text-muted-foreground">{summary.count3160} customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${filterBucket === '61-90' ? 'ring-2 ring-orange-500' : 'hover:border-orange-500/50'}`}
              onClick={() => setFilterBucket(filterBucket === '61-90' ? 'all' : '61-90')}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">61-90 Days</p>
                    <p className="text-lg font-bold">{formatCurrency(summary.days6190)}</p>
                    <p className="text-xs text-muted-foreground">{summary.count6190} customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${filterBucket === '90+' ? 'ring-2 ring-red-500' : 'hover:border-red-500/50'}`}
              onClick={() => setFilterBucket(filterBucket === '90+' ? 'all' : '90+')}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">90+ Days</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(summary.days90Plus)}
                    </p>
                    <p className="text-xs text-muted-foreground">{summary.count90Plus} customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aging Breakdown Visual Bar */}
        {summary && summary.totalOutstanding > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aging Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-8 w-full overflow-hidden rounded-lg">
                {summary.currentAmount > 0 && (
                  <div
                    className="bg-green-500 flex items-center justify-center text-xs font-medium text-white"
                    style={{
                      width: `${(summary.currentAmount / summary.totalOutstanding) * 100}%`
                    }}
                    title={`Current: ${formatCurrency(summary.currentAmount)}`}
                  >
                    {((summary.currentAmount / summary.totalOutstanding) * 100).toFixed(0)}%
                  </div>
                )}
                {summary.days3160 > 0 && (
                  <div
                    className="bg-amber-500 flex items-center justify-center text-xs font-medium text-white"
                    style={{ width: `${(summary.days3160 / summary.totalOutstanding) * 100}%` }}
                    title={`31-60d: ${formatCurrency(summary.days3160)}`}
                  >
                    {((summary.days3160 / summary.totalOutstanding) * 100).toFixed(0)}%
                  </div>
                )}
                {summary.days6190 > 0 && (
                  <div
                    className="bg-orange-500 flex items-center justify-center text-xs font-medium text-white"
                    style={{ width: `${(summary.days6190 / summary.totalOutstanding) * 100}%` }}
                    title={`61-90d: ${formatCurrency(summary.days6190)}`}
                  >
                    {((summary.days6190 / summary.totalOutstanding) * 100).toFixed(0)}%
                  </div>
                )}
                {summary.days90Plus > 0 && (
                  <div
                    className="bg-red-500 flex items-center justify-center text-xs font-medium text-white"
                    style={{ width: `${(summary.days90Plus / summary.totalOutstanding) * 100}%` }}
                    title={`90+d: ${formatCurrency(summary.days90Plus)}`}
                  >
                    {((summary.days90Plus / summary.totalOutstanding) * 100).toFixed(0)}%
                  </div>
                )}
              </div>
              <div className="mt-3 flex gap-6 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-green-500" /> Current (0-30d)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-amber-500" /> 31-60 days
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-orange-500" /> 61-90 days
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-red-500" /> 90+ days
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filterBucket === 'all'
                ? 'All'
                : filterBucket === 'current'
                  ? 'Current (0-30d)'
                  : filterBucket}{' '}
              Overdue Customers
              <Badge variant="secondary" className="ml-2">
                {filtered.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[calc(100vh-520px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                    <TableHead>First Credit</TableHead>
                    <TableHead>Last Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No overdue customers {filterBucket !== 'all' ? 'in this bucket' : ''}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow
                        key={c.id}
                        className={
                          c.agingBucket === '90+'
                            ? 'bg-red-50/50 dark:bg-red-900/10'
                            : c.agingBucket === '61-90'
                              ? 'bg-orange-50/50 dark:bg-orange-900/10'
                              : ''
                        }
                      >
                        <TableCell>
                          <div>
                            <span className="font-medium">{c.name}</span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" /> {c.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getBucketBadge(c.agingBucket)}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {formatCurrency(c.currentBalance)}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.creditLimit ? (
                            formatCurrency(c.creditLimit)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              c.daysOverdue > 90
                                ? 'text-red-600 font-bold'
                                : c.daysOverdue > 60
                                  ? 'text-orange-600 font-medium'
                                  : c.daysOverdue > 30
                                    ? 'text-amber-600'
                                    : ''
                            }
                          >
                            {c.daysOverdue} days
                          </span>
                        </TableCell>
                        <TableCell>
                          {c.firstCreditDate ? dayjs(c.firstCreditDate).format('DD MMM YYYY') : '-'}
                        </TableCell>
                        <TableCell>
                          {c.lastPaymentDate ? (
                            dayjs(c.lastPaymentDate).format('DD MMM YYYY')
                          ) : (
                            <span className="text-red-500 text-sm font-medium">Never</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
