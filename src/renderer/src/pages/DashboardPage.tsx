import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { formatCurrency, formatTime } from '../lib/utils'
import { getLocalDateString } from '@shared/constants'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table'
import {
  ShoppingCart,
  Package,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CalendarDays,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CreditCard,
  Banknote
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'
import type { QuickStats, DailySummary, Bill, Product } from '@shared/types'

export default function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [lowStockItems, setLowStockItems] = useState<Product[]>([])
  const [recentBills, setRecentBills] = useState<Bill[]>([])
  const [weekSales, setWeekSales] = useState(0)
  const [monthSales, setMonthSales] = useState(0)

  // Enhanced dashboard data
  const [dashData, setDashData] = useState<{
    pendingCredits: number
    pendingCreditCustomers: number
    outOfStockCount: number
    todayExpenses: number
    todayCollections: number
    yesterdaySales: number
  } | null>(null)

  const loadData = useCallback(async () => {
    try {
      const today = getLocalDateString()
      const [dailySummary, weekTotal, monthTotal, lowStock, topSelling, recent, enhanced] =
        await Promise.all([
          window.api.billing.getDailySummary(today),
          window.api.billing.getWeekSummary(),
          window.api.billing.getMonthSummary(),
          window.api.products.getLowStock(),
          window.api.billing.getTopSellingToday(today),
          window.api.billing.getRecentBills(10),
          window.api.reports.getDashboardData(today)
        ])
      setSummary(dailySummary)
      setWeekSales(weekTotal)
      setMonthSales(monthTotal)
      setLowStockItems(lowStock.slice(0, 8))
      setLowStockCount(lowStock.length)
      setRecentBills(recent)
      setDashData(enhanced)
      setStats({
        todaySales: dailySummary.totalSales,
        todayBills: dailySummary.totalBills,
        todayProfit: dailySummary.totalSales - (dailySummary.totalDiscount || 0),
        weekSales: weekTotal,
        lowStockItems: lowStock.length,
        topSellingToday: topSelling
      })
    } catch (err) {
      console.error('Dashboard load error:', err)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [loadData])

  const salesChange = dashData && dashData.yesterdaySales > 0
    ? ((summary?.totalSales ?? 0) - dashData.yesterdaySales) / dashData.yesterdaySales * 100
    : null

  return (
    <div className="h-full overflow-auto">
    <div className="space-y-6 p-6 max-w-[1400px] mx-auto page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button onClick={() => navigate('/')} size="lg" className="gap-2 rounded-xl shadow-md shadow-primary/20 hover:shadow-lg transition-all">
          <ShoppingCart className="h-4 w-4" />
          New Bill
          <kbd className="rounded bg-primary-foreground/20 px-1.5 py-0.5 text-xs">F2</kbd>
        </Button>
      </div>

      {/* Primary Stats Row — 4 Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Sales */}
        <Card className="stat-card stat-card-primary card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Sales
            </CardTitle>
            <div className="rounded-full bg-primary/10 p-2">
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-amount">
              {formatCurrency(summary?.totalSales ?? 0)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {summary?.totalBills ?? 0} bills
              </span>
              {salesChange !== null && (
                <span className={`flex items-center text-xs font-medium ${salesChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {salesChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(salesChange).toFixed(0)}% vs yesterday
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cash In Hand */}
        <Card className="stat-card stat-card-emerald card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash In Hand
            </CardTitle>
            <div className="rounded-full bg-emerald-100 p-2">
              <Banknote className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-amount text-emerald-600">
              {formatCurrency(summary?.cashSales ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              UPI: {formatCurrency(summary?.upiSales ?? 0)} · Card: {formatCurrency(summary?.cardSales ?? 0)}
            </p>
          </CardContent>
        </Card>

        {/* Pending Credits */}
        <Card className={`stat-card stat-card-orange card-hover ${dashData && dashData.pendingCredits > 0 ? 'border-orange-200' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Credits
            </CardTitle>
            <div className="rounded-full bg-orange-100 p-2">
              <CreditCard className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-amount text-orange-600">
              {formatCurrency(dashData?.pendingCredits ?? 0)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {dashData?.pendingCreditCustomers ?? 0} customers
              </span>
              {dashData && dashData.todayCollections > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">
                  +{formatCurrency(dashData.todayCollections)} collected today
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock + Out of Stock */}
        <Card className={`stat-card stat-card-red card-hover ${lowStockCount > 0 || (dashData?.outOfStockCount ?? 0) > 0 ? 'border-destructive/50' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock Alerts
            </CardTitle>
            <div className={`rounded-full p-2 ${lowStockCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              {lowStockCount > 0 ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <Package className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <div>
                <span className="text-2xl font-bold">{lowStockCount}</span>
                <span className="text-xs text-muted-foreground ml-1">low</span>
              </div>
              {(dashData?.outOfStockCount ?? 0) > 0 && (
                <div>
                  <span className="text-2xl font-bold text-destructive">{dashData?.outOfStockCount}</span>
                  <span className="text-xs text-destructive ml-1">out</span>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/products?filter=low-stock')}
              className="text-xs text-primary hover:underline mt-1"
            >
              View details →
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Week Sales</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-amount">{formatCurrency(weekSales)}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Month Sales</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-amount">{formatCurrency(monthSales)}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Bill Value</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-amount">
              {formatCurrency(summary?.totalBills ? summary.totalSales / summary.totalBills : 0)}
            </div>
            <p className="text-xs text-muted-foreground">Today&apos;s average</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Expenses</CardTitle>
            <Wallet className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-amount text-red-500">
              {formatCurrency(dashData?.todayExpenses ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Net: {formatCurrency((summary?.totalSales ?? 0) - (dashData?.todayExpenses ?? 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Mode Breakdown (today) */}
      {summary && summary.totalSales > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today&apos;s Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Cash', amount: summary.cashSales, bills: summary.cashBills || 0, color: 'bg-green-500', textColor: 'text-green-600' },
                { label: 'UPI', amount: summary.upiSales, bills: summary.upiBills || 0, color: 'bg-blue-500', textColor: 'text-blue-600' },
                { label: 'Card', amount: summary.cardSales, bills: summary.cardBills || 0, color: 'bg-purple-500', textColor: 'text-purple-600' },
                { label: 'Credit', amount: summary.creditSales, bills: summary.creditBills || 0, color: 'bg-orange-500', textColor: 'text-orange-600' }
              ].map((mode) => {
                const pct = summary.totalSales > 0 ? (mode.amount / summary.totalSales) * 100 : 0
                return (
                  <div key={mode.label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{mode.label}</span>
                      <span className={`font-amount font-medium ${mode.textColor}`}>
                        {formatCurrency(mode.amount)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${mode.color} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">{mode.bills} bill{mode.bills !== 1 ? 's' : ''}</span>
                      <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {/* <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all"
              onClick={() => navigate('/')}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-xs font-medium">New Bill</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all"
              onClick={() => navigate('/products')}
            >
              <Package className="h-5 w-5" />
              <span className="text-xs font-medium">Products</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all"
              onClick={() => navigate('/customers')}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs font-medium">Customers</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all"
              onClick={() => navigate('/purchases')}
            >
              <PackageX className="h-5 w-5" />
              <span className="text-xs font-medium">Purchases</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all"
              onClick={() => navigate('/reports')}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs font-medium">Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card> */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Bills */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Bills</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
              View all →
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      No bills yet today
                    </TableCell>
                  </TableRow>
                ) : (
                  recentBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>
                        <div className="font-mono text-xs">{bill.billNumber}</div>
                        <div className="text-[10px] text-muted-foreground">{bill.time || formatTime(bill.createdAt)}</div>
                      </TableCell>
                      <TableCell className="text-sm">{bill.customerName || 'Walk-in'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {bill.paymentMode?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-amount text-sm font-medium">
                        {formatCurrency(bill.grandTotal)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Selling + Low Stock */}
        <div className="space-y-6">
          {/* Top Selling Today */}
          {stats?.topSellingToday && stats.topSellingToday.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Top Selling Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topSellingToday.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        <span className="text-sm truncate max-w-[200px]">{item.productName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium font-amount">
                          {formatCurrency(item.totalAmount)}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({item.totalQty} pcs)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Stock Alerts */}
          {lowStockItems.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Low Stock Alerts
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/products?filter=low-stock')}
                >
                  View all →
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStockItems.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div>
                        <span className="text-sm font-medium">{product.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{product.sku}</span>
                      </div>
                      <Badge
                        variant={product.stock <= 0 ? 'destructive' : 'outline'}
                        className={`text-[10px] ${product.stock > 0 ? 'border-yellow-500 text-yellow-600' : ''}`}
                      >
                        {product.stock <= 0 ? 'OUT OF STOCK' : `${product.stock} left`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Credit Sales Today */}
          {summary && summary.creditSales > 0 && (
            <Card className="border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                  Credit Sales Today
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
                  Manage →
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold font-amount text-orange-600">
                      {formatCurrency(summary.creditSales)}
                    </div>
                    <p className="text-xs text-muted-foreground">Given on credit today</p>
                  </div>
                  {dashData && dashData.todayCollections > 0 && (
                    <div className="text-right">
                      <div className="text-xl font-bold font-amount text-green-600">
                        {formatCurrency(dashData.todayCollections)}
                      </div>
                      <p className="text-xs text-muted-foreground">Collected today</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}
