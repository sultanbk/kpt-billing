// ============================================================================
// KPT Billing - Customer Analytics Page
// Top customers by revenue, purchase frequency, credit risk scoring
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table'
import {
  IndianRupee,
  TrendingUp,
  Users,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Crown,
  CalendarDays,
  Phone
} from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface TopCustomer {
  id: number
  name: string
  phone: string
  customerType: string
  currentBalance: number
  creditLimit: number | null
  totalBills: number
  totalRevenue: number
  avgBillValue: number
  lastPurchaseDate: string | null
  firstPurchaseDate: string | null
  totalItemsBought: number
}

interface FrequencyCustomer {
  id: number
  name: string
  phone: string
  customerType: string
  totalBills: number
  totalRevenue: number
  lastPurchaseDate: string | null
  daysSinceLastPurchase: number | null
  avgDaysBetweenPurchases: number | null
}

interface CreditRiskCustomer {
  id: number
  name: string
  phone: string
  customerType: string
  currentBalance: number
  creditLimit: number | null
  totalCreditBills: number
  totalCreditTaken: number
  lastCreditDate: string | null
  daysSinceLastCredit: number | null
  totalPaymentsMade: number
  paymentCount: number
  lastPaymentDate: string | null
  creditUtilizationPct: number
  riskLevel: 'none' | 'low' | 'medium' | 'high'
}

function mapRecord<T>(raw: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    // Convert snake_case to camelCase
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camel] = value
  }
  return result as T
}

export default function CustomerAnalyticsPage(): React.JSX.Element {
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [frequencyData, setFrequencyData] = useState<FrequencyCustomer[]>([])
  const [creditRisk, setCreditRisk] = useState<CreditRiskCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('revenue')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [topRaw, freqRaw, riskRaw] = await Promise.all([
        window.api.customers.getTopByRevenue(50),
        window.api.customers.getFrequency(),
        window.api.customers.getCreditRisk()
      ])
      setTopCustomers(topRaw.map((r) => mapRecord<TopCustomer>(r)))
      setFrequencyData(freqRaw.map((r) => mapRecord<FrequencyCustomer>(r)))
      setCreditRisk(riskRaw.map((r) => mapRecord<CreditRiskCustomer>(r)))
    } catch {
      toast.error('Failed to load analytics')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  // Summary cards
  const totalRevenue = topCustomers.reduce((s, c) => s + c.totalRevenue, 0)
  const totalCustomers = topCustomers.length
  const avgRevenue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0
  const highRiskCount = creditRisk.filter((c) => c.riskLevel === 'high').length
  const totalOutstanding = creditRisk.reduce((s, c) => s + c.currentBalance, 0)

  function getRiskBadge(level: string): React.JSX.Element {
    switch (level) {
      case 'high':
        return (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="h-3 w-3" /> High
          </Badge>
        )
      case 'medium':
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          >
            <Shield className="h-3 w-3" /> Medium
          </Badge>
        )
      case 'low':
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          >
            <ShieldCheck className="h-3 w-3" /> Low
          </Badge>
        )
      default:
        return <Badge variant="outline">None</Badge>
    }
  }

  function getFrequencyLabel(days: number | null): React.JSX.Element {
    if (days === null) return <span className="text-muted-foreground">-</span>
    if (days <= 7)
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Weekly
        </Badge>
      )
    if (days <= 15)
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Bi-weekly
        </Badge>
      )
    if (days <= 30)
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Monthly
        </Badge>
      )
    if (days <= 90) return <Badge variant="secondary">Quarterly</Badge>
    return <Badge variant="outline">Rare</Badge>
  }

  return (
    <div className="flex h-full flex-col page-enter">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">Customer Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Revenue analysis, purchase frequency, and credit risk scoring
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Customers</p>
                  <p className="text-xl font-bold">{totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Revenue/Customer</p>
                  <p className="text-xl font-bold">{formatCurrency(avgRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">High Risk Customers</p>
                  <p className="text-xl font-bold">{highRiskCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <IndianRupee className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Outstanding</p>
                  <p className="text-xl font-bold">{formatCurrency(totalOutstanding)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="revenue" className="gap-1.5">
              <Crown className="h-4 w-4" /> Top by Revenue
            </TabsTrigger>
            <TabsTrigger value="frequency" className="gap-1.5">
              <CalendarDays className="h-4 w-4" /> Purchase Frequency
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-1.5">
              <ShieldAlert className="h-4 w-4" /> Credit Risk
            </TabsTrigger>
          </TabsList>

          {/* Top Customers by Revenue */}
          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Customers by Revenue</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[calc(100vh-380px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Total Bills</TableHead>
                        <TableHead className="text-right">Total Revenue</TableHead>
                        <TableHead className="text-right">Avg Bill</TableHead>
                        <TableHead className="text-right">Items Bought</TableHead>
                        <TableHead>Last Purchase</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : topCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No customer data found
                          </TableCell>
                        </TableRow>
                      ) : (
                        topCustomers.map((c, i) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium text-muted-foreground">
                              {i + 1}
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{c.name}</span>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" /> {c.phone}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {c.customerType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{c.totalBills}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(c.totalRevenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(c.avgBillValue)}
                            </TableCell>
                            <TableCell className="text-right">{c.totalItemsBought}</TableCell>
                            <TableCell>
                              {c.lastPurchaseDate ? (
                                <span className="text-sm">
                                  {dayjs(c.lastPurchaseDate).fromNow()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
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
          </TabsContent>

          {/* Purchase Frequency */}
          <TabsContent value="frequency">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Purchase Frequency Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[calc(100vh-380px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Total Bills</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead className="text-right">Avg Days Between</TableHead>
                        <TableHead>Last Visit</TableHead>
                        <TableHead className="text-right">Days Since</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : frequencyData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No data found
                          </TableCell>
                        </TableRow>
                      ) : (
                        frequencyData.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{c.name}</span>
                                <div className="text-xs text-muted-foreground">{c.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {c.customerType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{c.totalBills}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(c.totalRevenue)}
                            </TableCell>
                            <TableCell>{getFrequencyLabel(c.avgDaysBetweenPurchases)}</TableCell>
                            <TableCell className="text-right">
                              {c.avgDaysBetweenPurchases !== null
                                ? `${c.avgDaysBetweenPurchases} days`
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {c.lastPurchaseDate
                                ? dayjs(c.lastPurchaseDate).format('DD MMM YYYY')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {c.daysSinceLastPurchase !== null ? (
                                <span
                                  className={
                                    c.daysSinceLastPurchase > 60
                                      ? 'text-red-600 font-medium'
                                      : c.daysSinceLastPurchase > 30
                                        ? 'text-amber-600'
                                        : ''
                                  }
                                >
                                  {c.daysSinceLastPurchase}d
                                </span>
                              ) : (
                                '-'
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
          </TabsContent>

          {/* Credit Risk */}
          <TabsContent value="risk">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Credit Risk Scoring</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[calc(100vh-380px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="text-right">Credit Limit</TableHead>
                        <TableHead className="text-right">Utilization</TableHead>
                        <TableHead className="text-right">Total Credit</TableHead>
                        <TableHead className="text-right">Total Paid</TableHead>
                        <TableHead>Last Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : creditRisk.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No customers with outstanding credit
                          </TableCell>
                        </TableRow>
                      ) : (
                        creditRisk.map((c) => (
                          <TableRow
                            key={c.id}
                            className={
                              c.riskLevel === 'high' ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                            }
                          >
                            <TableCell>
                              <div>
                                <span className="font-medium">{c.name}</span>
                                <div className="text-xs text-muted-foreground">{c.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>{getRiskBadge(c.riskLevel)}</TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              {formatCurrency(c.currentBalance)}
                            </TableCell>
                            <TableCell className="text-right">
                              {c.creditLimit ? (
                                formatCurrency(c.creditLimit)
                              ) : (
                                <span className="text-muted-foreground">No limit</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {c.creditLimit ? (
                                <span
                                  className={
                                    c.creditUtilizationPct > 80
                                      ? 'text-red-600 font-medium'
                                      : c.creditUtilizationPct > 50
                                        ? 'text-amber-600'
                                        : 'text-green-600'
                                  }
                                >
                                  {c.creditUtilizationPct}%
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(c.totalCreditTaken)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(c.totalPaymentsMade)}
                            </TableCell>
                            <TableCell>
                              {c.lastPaymentDate ? (
                                <span className="text-sm">
                                  {dayjs(c.lastPaymentDate).fromNow()}
                                </span>
                              ) : (
                                <span className="text-red-500 text-sm font-medium">Never paid</span>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
