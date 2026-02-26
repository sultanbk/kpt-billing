import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../components/ui/dropdown-menu'
import {
  Calendar,
  IndianRupee,
  ShoppingCart,
  Banknote,
  Smartphone,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight,
  FileDown,
  MoreHorizontal,
  Printer,
  RotateCcw,
  XCircle,
  Eye,
  BarChart3,
  Package,
  Download,
  Receipt,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '../lib/utils'
import { toast } from 'sonner'
import type { DailySummary, Bill, BillItem } from '@shared/types'
import dayjs from 'dayjs'

// ---- Types for period reports ----
interface PeriodBreakdownRow {
  date?: string
  month?: string
  totalSales: number
  billCount: number
  cashSales: number
  upiSales: number
  cardSales: number
  creditSales: number
}

interface PeriodReport {
  totals: DailySummary
  dailyBreakdown?: PeriodBreakdownRow[]
  monthlyBreakdown?: PeriodBreakdownRow[]
  paymentBreakdown: { mode: string; total: number; count: number }[]
  topProducts: { productName: string; totalQty: number; totalAmount: number }[]
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ---- GST Report Types ----
interface HsnSummary {
  hsnCode: string
  description: string
  totalQty: number
  totalTaxableAmount: number
  cgstRate: number
  cgstAmount: number
  sgstRate: number
  sgstAmount: number
  totalGst: number
  totalAmount: number
}

interface GstSummary {
  totalTaxableAmount: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  totalGst: number
  totalInvoiceValue: number
  totalBills: number
  hsnWise: HsnSummary[]
  rateWise: { gstRate: number; taxableAmount: number; cgst: number; sgst: number; total: number }[]
  invoiceList: {
    billNo: string
    date: string
    customerName: string | null
    customerGstin: string | null
    taxableAmount: number
    cgst: number
    sgst: number
    igst: number
    total: number
  }[]
}

// ---- P&L Report Types ----
interface ProfitLossReport {
  period: { from: string; to: string }
  revenue: { totalSales: number; totalBills: number; totalReturns: number; netSales: number }
  costOfGoods: { totalPurchases: number; purchaseGst: number; netPurchases: number }
  grossProfit: number
  grossMarginPercent: number
  expenses: { total: number; byCategory: { category: string; amount: number }[] }
  netProfit: number
  netMarginPercent: number
  otherInfo: { totalDiscount: number; totalCreditSales: number; totalCreditCollected: number; avgBillValue: number }
}

function getMonthName(ym: string): string {
  const [, m] = ym.split('-')
  return MONTH_NAMES[parseInt(m, 10) - 1] || m
}

// ---- Reusable Summary Cards ----
function SummaryCards({ summary }: { summary: DailySummary }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-amount">{formatCurrency(summary.totalSales)}</div>
          <p className="text-xs text-muted-foreground">{summary.totalBills} bills</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cash Sales</CardTitle>
          <Banknote className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-amount text-green-600">{formatCurrency(summary.cashSales)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">UPI Sales</CardTitle>
          <Smartphone className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-amount text-blue-600">{formatCurrency(summary.upiSales)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Credit Sales</CardTitle>
          <FileText className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-amount text-orange-600">{formatCurrency(summary.creditSales)}</div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Reusable Payment Breakdown ----
function PaymentBreakdownCard({ data, total }: { data: { mode: string; total: number; count: number }[]; total: number }): React.JSX.Element {
  const modeConfig: Record<string, { icon: typeof Banknote; color: string }> = {
    cash: { icon: Banknote, color: 'text-green-600' },
    upi: { icon: Smartphone, color: 'text-blue-600' },
    card: { icon: CreditCard, color: 'text-purple-600' },
    credit: { icon: FileText, color: 'text-orange-600' }
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Payment Breakdown</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item) => {
            const cfg = modeConfig[item.mode] || { icon: IndianRupee, color: 'text-muted-foreground' }
            const Icon = cfg.icon
            const pct = total > 0 ? (item.total / total) * 100 : 0
            return (
              <div key={item.mode} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                  <span className="text-sm capitalize">{item.mode}</span>
                  <Badge variant="secondary" className="text-[10px]">{item.count} bills</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-28 text-right font-amount font-medium">{formatCurrency(item.total)}</span>
                </div>
              </div>
            )
          })}
          <Separator />
          <div className="flex items-center justify-between font-bold">
            <span>Total</span>
            <span className="font-amount">{formatCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Top Products ----
function TopProducts({ data }: { data: { productName: string; totalQty: number; totalAmount: number }[] }): React.JSX.Element {
  if (data.length === 0) return <></>
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Package className="h-5 w-5" />Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty Sold</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 15).map((p, idx) => (
              <TableRow key={p.productName}>
                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium">{p.productName}</TableCell>
                <TableCell className="text-right">{p.totalQty}</TableCell>
                <TableCell className="text-right font-amount">{formatCurrency(p.totalAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ---- Breakdown Table (daily rows or monthly rows) ----
function BreakdownTable({ rows, dateFormat, label }: { rows: PeriodBreakdownRow[]; dateFormat: string; label: string }): React.JSX.Element {
  const totalSales = rows.reduce((s, r) => s + r.totalSales, 0)
  const totalBills = rows.reduce((s, r) => s + r.billCount, 0)
  const totalCash = rows.reduce((s, r) => s + r.cashSales, 0)
  const totalUpi = rows.reduce((s, r) => s + r.upiSales, 0)
  const totalCard = rows.reduce((s, r) => s + r.cardSales, 0)
  const totalCredit = rows.reduce((s, r) => s + r.creditSales, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5" />{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Bills</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">UPI</TableHead>
                <TableHead className="text-right">Card</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const key = row.date || row.month || ''
                const display = row.month
                  ? `${getMonthName(row.month)} ${row.month.split('-')[0]}`
                  : dayjs(row.date).format(dateFormat)
                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{display}</TableCell>
                    <TableCell className="text-right font-amount font-bold">{formatCurrency(row.totalSales)}</TableCell>
                    <TableCell className="text-right">{row.billCount}</TableCell>
                    <TableCell className="text-right font-amount text-green-600">{formatCurrency(row.cashSales)}</TableCell>
                    <TableCell className="text-right font-amount text-blue-600">{formatCurrency(row.upiSales)}</TableCell>
                    <TableCell className="text-right font-amount text-purple-600">{formatCurrency(row.cardSales)}</TableCell>
                    <TableCell className="text-right font-amount text-orange-600">{formatCurrency(row.creditSales)}</TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-amount">{formatCurrency(totalSales)}</TableCell>
                <TableCell className="text-right">{totalBills}</TableCell>
                <TableCell className="text-right font-amount text-green-600">{formatCurrency(totalCash)}</TableCell>
                <TableCell className="text-right font-amount text-blue-600">{formatCurrency(totalUpi)}</TableCell>
                <TableCell className="text-right font-amount text-purple-600">{formatCurrency(totalCard)}</TableCell>
                <TableCell className="text-right font-amount text-orange-600">{formatCurrency(totalCredit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ==== MAIN REPORTS PAGE ====
export default function ReportsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('daily')

  // ---- Daily State ----
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [showBillDetail, setShowBillDetail] = useState(false)
  const [showReturnConfirm, setShowReturnConfirm] = useState<Bill | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState<Bill | null>(null)

  // ---- Weekly State ----
  const [weekEndDate, setWeekEndDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [weekReport, setWeekReport] = useState<PeriodReport | null>(null)
  const [weekLoading, setWeekLoading] = useState(false)

  // ---- Monthly State ----
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'))
  const [monthReport, setMonthReport] = useState<PeriodReport | null>(null)
  const [monthLoading, setMonthLoading] = useState(false)

  // ---- Yearly State ----
  const [selectedYear, setSelectedYear] = useState(dayjs().year())
  const [yearReport, setYearReport] = useState<PeriodReport | null>(null)
  const [yearLoading, setYearLoading] = useState(false)

  // ---- GST Report State ----
  const [gstDateFrom, setGstDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [gstDateTo, setGstDateTo] = useState(dayjs().format('YYYY-MM-DD'))
  const [gstReport, setGstReport] = useState<GstSummary | null>(null)
  const [gstLoading, setGstLoading] = useState(false)
  const [gstView, setGstView] = useState<'hsn' | 'ratewise' | 'invoices'>('hsn')

  // ---- P&L Report State ----
  const [plDateFrom, setPlDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [plDateTo, setPlDateTo] = useState(dayjs().format('YYYY-MM-DD'))
  const [plReport, setPlReport] = useState<ProfitLossReport | null>(null)
  const [plLoading, setPlLoading] = useState(false)

  // ==== Load Functions ====
  const loadDailyReport = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const [dailySummary, allBills] = await Promise.all([
        window.api.billing.getDailySummary(date),
        window.api.billing.getAllBills({ page: 1, pageSize: 200, dateFrom: date, dateTo: date })
      ])
      setSummary(dailySummary)
      setBills(allBills.data)
    } catch { toast.error('Failed to load daily report') }
    setLoading(false)
  }, [])

  const loadWeeklyReport = useCallback(async (endDate: string) => {
    setWeekLoading(true)
    try {
      const data = await window.api.billing.getWeeklySummary(endDate)
      setWeekReport(data as PeriodReport)
    } catch { toast.error('Failed to load weekly report') }
    setWeekLoading(false)
  }, [])

  const loadMonthlyReport = useCallback(async (yearMonth: string) => {
    setMonthLoading(true)
    try {
      const data = await window.api.billing.getMonthlySummary(yearMonth)
      setMonthReport(data as PeriodReport)
    } catch { toast.error('Failed to load monthly report') }
    setMonthLoading(false)
  }, [])

  const loadYearlyReport = useCallback(async (year: number) => {
    setYearLoading(true)
    try {
      const data = await window.api.billing.getYearlySummary(year)
      setYearReport(data as PeriodReport)
    } catch { toast.error('Failed to load yearly report') }
    setYearLoading(false)
  }, [])

  const loadGstReport = useCallback(async (dateFrom: string, dateTo: string) => {
    setGstLoading(true)
    try {
      const data = await window.api.reports.getGstReport(dateFrom, dateTo)
      setGstReport(data as GstSummary)
    } catch { toast.error('Failed to load GST report') }
    setGstLoading(false)
  }, [])

  const loadPlReport = useCallback(async (dateFrom: string, dateTo: string) => {
    setPlLoading(true)
    try {
      const data = await window.api.reports.getProfitLoss(dateFrom, dateTo)
      setPlReport(data as ProfitLossReport)
    } catch { toast.error('Failed to load P&L report') }
    setPlLoading(false)
  }, [])

  useEffect(() => {
    if (activeTab === 'daily' || activeTab === 'bills') loadDailyReport(selectedDate)
    else if (activeTab === 'weekly') loadWeeklyReport(weekEndDate)
    else if (activeTab === 'monthly') loadMonthlyReport(selectedMonth)
    else if (activeTab === 'yearly') loadYearlyReport(selectedYear)
    else if (activeTab === 'gst') loadGstReport(gstDateFrom, gstDateTo)
    else if (activeTab === 'pnl') loadPlReport(plDateFrom, plDateTo)
  }, [activeTab, selectedDate, weekEndDate, selectedMonth, selectedYear, gstDateFrom, gstDateTo, plDateFrom, plDateTo, loadDailyReport, loadWeeklyReport, loadMonthlyReport, loadYearlyReport, loadGstReport, loadPlReport])

  const goDate = (dir: number): void => {
    setSelectedDate(dayjs(selectedDate).add(dir, 'day').format('YYYY-MM-DD'))
  }
  const isToday = selectedDate === dayjs().format('YYYY-MM-DD')

  const handleViewBill = async (bill: Bill): Promise<void> => {
    try {
      const fullBill = await window.api.billing.getById(bill.id)
      if (fullBill) {
        setSelectedBill(fullBill)
        setShowBillDetail(true)
      }
    } catch {
      toast.error('Failed to load bill details')
    }
  }

  const handleReturnBill = async (): Promise<void> => {
    if (!showReturnConfirm) return
    try {
      await window.api.billing.returnBill(showReturnConfirm.id, 'Customer return')
      toast.success(`Bill ${showReturnConfirm.billNumber} returned. Stock restored.`)
      setShowReturnConfirm(null)
      loadDailyReport(selectedDate)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Return failed'
      toast.error(msg)
    }
  }

  const handleCancelBill = async (): Promise<void> => {
    if (!showCancelConfirm) return
    try {
      await window.api.billing.cancelBill(showCancelConfirm.id, 'Cancelled by user')
      toast.success(`Bill ${showCancelConfirm.billNumber} cancelled. Stock restored.`)
      setShowCancelConfirm(null)
      loadDailyReport(selectedDate)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancel failed'
      toast.error(msg)
    }
  }

  const handleReprint = async (bill: Bill): Promise<void> => {
    try {
      await window.api.billing.printReceipt(bill.id)
      toast.success('Receipt sent to printer')
    } catch {
      toast.error('Print failed')
    }
  }

  const handleDownloadBill = async (bill: Bill): Promise<void> => {
    try {
      const result = await window.api.billing.generatePdfReceipt(bill.id)
      if (result.success && result.path) {
        toast.success(`Bill saved: ${result.path}`)
      } else {
        toast.error('Failed to generate PDF')
      }
    } catch {
      toast.error('Failed to download bill')
    }
  }

  const handleExportDaily = async (): Promise<void> => {
    try {
      const result = await window.api.export.dailyReport(selectedDate)
      if (result.success && result.path) {
        toast.success(`Exported to ${result.path}`)
      }
    } catch {
      toast.error('Export failed')
    }
  }

  const handleExportBills = async (): Promise<void> => {
    try {
      const result = await window.api.export.billHistory(selectedDate, selectedDate)
      if (result.success && result.path) {
        toast.success(`Exported to ${result.path}`)
      }
    } catch {
      toast.error('Export failed')
    }
  }

  // ---- Download Report PDF Handlers ----
  const [pdfGenerating, setPdfGenerating] = useState(false)

  const handleDownloadDailyPdf = async (): Promise<void> => {
    setPdfGenerating(true)
    try {
      const result = await window.api.report.generateDailyPdf(selectedDate)
      if (result.success && result.path) {
        toast.success('Daily report PDF saved!', {
          action: { label: 'Open', onClick: () => window.api.report.openFile(result.path) }
        })
      } else {
        toast.error('Failed to generate daily report PDF')
      }
    } catch { toast.error('Failed to generate daily report PDF') }
    setPdfGenerating(false)
  }

  const handleDownloadWeeklyPdf = async (): Promise<void> => {
    setPdfGenerating(true)
    try {
      const result = await window.api.report.generateWeeklyPdf(weekEndDate)
      if (result.success && result.path) {
        toast.success('Weekly report PDF saved!', {
          action: { label: 'Open', onClick: () => window.api.report.openFile(result.path) }
        })
      } else {
        toast.error('Failed to generate weekly report PDF')
      }
    } catch { toast.error('Failed to generate weekly report PDF') }
    setPdfGenerating(false)
  }

  const handleDownloadMonthlyPdf = async (): Promise<void> => {
    setPdfGenerating(true)
    try {
      const result = await window.api.report.generateMonthlyPdf(selectedMonth)
      if (result.success && result.path) {
        toast.success('Monthly report PDF saved!', {
          action: { label: 'Open', onClick: () => window.api.report.openFile(result.path) }
        })
      } else {
        toast.error('Failed to generate monthly report PDF')
      }
    } catch { toast.error('Failed to generate monthly report PDF') }
    setPdfGenerating(false)
  }

  const handleDownloadYearlyPdf = async (): Promise<void> => {
    setPdfGenerating(true)
    try {
      const result = await window.api.report.generateYearlyPdf(selectedYear)
      if (result.success && result.path) {
        toast.success('Yearly report PDF saved!', {
          action: { label: 'Open', onClick: () => window.api.report.openFile(result.path) }
        })
      } else {
        toast.error('Failed to generate yearly report PDF')
      }
    } catch { toast.error('Failed to generate yearly report PDF') }
    setPdfGenerating(false)
  }

  return (
    <div className="h-full overflow-auto page-enter">
    <div className="space-y-6 p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Sales and billing reports</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'daily' && (
            <>
              <Button variant="outline" size="sm" onClick={handleDownloadDailyPdf} disabled={pdfGenerating || !summary}>
                <Download className="mr-2 h-4 w-4" />
                {pdfGenerating ? 'Generating...' : 'Download PDF'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportDaily}>
                <FileDown className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </>
          )}
          {activeTab === 'weekly' && (
            <Button variant="outline" size="sm" onClick={handleDownloadWeeklyPdf} disabled={pdfGenerating || !weekReport}>
              <Download className="mr-2 h-4 w-4" />
              {pdfGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
          )}
          {activeTab === 'monthly' && (
            <Button variant="outline" size="sm" onClick={handleDownloadMonthlyPdf} disabled={pdfGenerating || !monthReport}>
              <Download className="mr-2 h-4 w-4" />
              {pdfGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
          )}
          {activeTab === 'yearly' && (
            <Button variant="outline" size="sm" onClick={handleDownloadYearlyPdf} disabled={pdfGenerating || !yearReport}>
              <Download className="mr-2 h-4 w-4" />
              {pdfGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
          )}
          {activeTab === 'bills' && (
            <Button variant="outline" size="sm" onClick={handleExportBills}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Bills
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
          <TabsTrigger value="bills">Bill History</TabsTrigger>
          <TabsTrigger value="gst">GST Report</TabsTrigger>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
        </TabsList>

        {/* ==================== DAILY TAB ==================== */}
        <TabsContent value="daily" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => goDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-44" />
            </div>
            <Button variant="outline" size="sm" onClick={() => goDate(1)} disabled={isToday}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))}>Today</Button>
            )}
          </div>

          {summary && <SummaryCards summary={summary} />}

          {summary && (
            <PaymentBreakdownCard
              data={[
                { mode: 'cash', total: summary.cashSales, count: 0 },
                { mode: 'upi', total: summary.upiSales, count: 0 },
                { mode: 'card', total: summary.cardSales, count: 0 },
                { mode: 'credit', total: summary.creditSales, count: 0 }
              ].filter(d => d.total > 0)}
              total={summary.totalSales}
            />
          )}
        </TabsContent>

        {/* ==================== WEEKLY TAB ==================== */}
        <TabsContent value="weekly" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setWeekEndDate(dayjs(weekEndDate).add(-7, 'day').format('YYYY-MM-DD'))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Week ending:</span>
              <Input type="date" value={weekEndDate} onChange={(e) => setWeekEndDate(e.target.value)} className="w-44" />
            </div>
            <Button variant="outline" size="sm" onClick={() => setWeekEndDate(dayjs(weekEndDate).add(7, 'day').format('YYYY-MM-DD'))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setWeekEndDate(dayjs().format('YYYY-MM-DD'))}>This Week</Button>
          </div>

          {weekLoading && <div className="py-8 text-center text-muted-foreground">Loading...</div>}
          {weekReport && !weekLoading && (
            <>
              <SummaryCards summary={weekReport.totals} />
              {weekReport.dailyBreakdown && weekReport.dailyBreakdown.length > 0 && (
                <BreakdownTable rows={weekReport.dailyBreakdown} dateFormat="ddd, MMM D" label="Daily Breakdown" />
              )}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <PaymentBreakdownCard data={weekReport.paymentBreakdown} total={weekReport.totals.totalSales} />
                <TopProducts data={weekReport.topProducts} />
              </div>
            </>
          )}
        </TabsContent>

        {/* ==================== MONTHLY TAB ==================== */}
        <TabsContent value="monthly" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedMonth(dayjs(selectedMonth + '-01').add(-1, 'month').format('YYYY-MM'))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-48" />
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedMonth(dayjs(selectedMonth + '-01').add(1, 'month').format('YYYY-MM'))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedMonth(dayjs().format('YYYY-MM'))}>This Month</Button>
          </div>

          {monthLoading && <div className="py-8 text-center text-muted-foreground">Loading...</div>}
          {monthReport && !monthLoading && (
            <>
              <SummaryCards summary={monthReport.totals} />
              {monthReport.dailyBreakdown && monthReport.dailyBreakdown.length > 0 && (
                <BreakdownTable
                  rows={monthReport.dailyBreakdown}
                  dateFormat="ddd, MMM D"
                  label={`Daily Breakdown — ${dayjs(selectedMonth + '-01').format('MMMM YYYY')}`}
                />
              )}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <PaymentBreakdownCard data={monthReport.paymentBreakdown} total={monthReport.totals.totalSales} />
                <TopProducts data={monthReport.topProducts} />
              </div>
            </>
          )}
        </TabsContent>

        {/* ==================== YEARLY TAB ==================== */}
        <TabsContent value="yearly" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedYear((y) => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-bold">{selectedYear}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedYear((y) => y + 1)} disabled={selectedYear >= dayjs().year()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedYear(dayjs().year())}>This Year</Button>
          </div>

          {yearLoading && <div className="py-8 text-center text-muted-foreground">Loading...</div>}
          {yearReport && !yearLoading && (
            <>
              <SummaryCards summary={yearReport.totals} />
              {/* Avg stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Monthly Sales</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold font-amount">
                      {formatCurrency(yearReport.monthlyBreakdown && yearReport.monthlyBreakdown.length > 0 ? yearReport.totals.totalSales / yearReport.monthlyBreakdown.length : 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Bill Value</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold font-amount">
                      {formatCurrency(yearReport.totals.totalBills > 0 ? yearReport.totals.totalSales / yearReport.totals.totalBills : 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Discount Given</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold font-amount text-destructive">{formatCurrency(yearReport.totals.totalDiscount)}</div>
                  </CardContent>
                </Card>
              </div>
              {yearReport.monthlyBreakdown && yearReport.monthlyBreakdown.length > 0 && (
                <BreakdownTable rows={yearReport.monthlyBreakdown} dateFormat="" label={`Monthly Breakdown — ${selectedYear}`} />
              )}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <PaymentBreakdownCard data={yearReport.paymentBreakdown} total={yearReport.totals.totalSales} />
                <TopProducts data={yearReport.topProducts} />
              </div>
            </>
          )}
        </TabsContent>

        {/* ==================== BILL HISTORY TAB ==================== */}
        <TabsContent value="bills" className="mt-4">
          {/* Date nav */}
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" size="sm" onClick={() => goDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-44" />
            </div>
            <Button variant="outline" size="sm" onClick={() => goDate(1)} disabled={isToday}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))}>Today</Button>
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Bills on {formatDate(selectedDate)} ({bills.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No.</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        {loading ? 'Loading...' : 'No bills for this date'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-mono text-xs">{bill.billNumber}</TableCell>
                        <TableCell className="text-sm">{bill.time || formatTime(bill.createdAt)}</TableCell>
                        <TableCell>{bill.customerName || 'Walk-in'}</TableCell>
                        <TableCell>{bill.totalItems}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {bill.paymentMode?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              bill.status === 'completed'
                                ? 'default'
                                : bill.status === 'returned'
                                  ? 'destructive'
                                  : 'outline'
                            }
                            className="text-[10px]"
                          >
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-amount font-medium">
                          {formatCurrency(bill.grandTotal)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewBill(bill)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReprint(bill)}>
                                <Printer className="mr-2 h-4 w-4" />
                                Reprint Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadBill(bill)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Bill (PDF)
                              </DropdownMenuItem>
                              {bill.status === 'completed' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setShowReturnConfirm(bill)}
                                    className="text-orange-600"
                                  >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Return Bill
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setShowCancelConfirm(bill)}
                                    className="text-destructive"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel Bill
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== GST REPORT TAB ==================== */}
        <TabsContent value="gst" className="space-y-4 mt-4">
          {/* Date Range Picker */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">From:</span>
              <Input type="date" value={gstDateFrom} onChange={(e) => setGstDateFrom(e.target.value)} className="w-44" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">To:</span>
              <Input type="date" value={gstDateTo} onChange={(e) => setGstDateTo(e.target.value)} className="w-44" />
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => { setGstDateFrom(dayjs().startOf('month').format('YYYY-MM-DD')); setGstDateTo(dayjs().format('YYYY-MM-DD')) }}>This Month</Button>
              <Button variant="ghost" size="sm" onClick={() => { const prev = dayjs().subtract(1, 'month'); setGstDateFrom(prev.startOf('month').format('YYYY-MM-DD')); setGstDateTo(prev.endOf('month').format('YYYY-MM-DD')) }}>Last Month</Button>
              <Button variant="ghost" size="sm" onClick={() => { const q = Math.floor(dayjs().month() / 3); const qs = dayjs().month(q * 3).startOf('month'); setGstDateFrom(qs.format('YYYY-MM-DD')); setGstDateTo(dayjs().format('YYYY-MM-DD')) }}>This Quarter</Button>
              <Button variant="ghost" size="sm" onClick={() => { setGstDateFrom(dayjs().startOf('year').format('YYYY-MM-DD')); setGstDateTo(dayjs().format('YYYY-MM-DD')) }}>This Year</Button>
            </div>
          </div>

          {gstLoading && <div className="py-8 text-center text-muted-foreground">Loading GST Report...</div>}

          {gstReport && !gstLoading && (
            <>
              {/* GST Totals Overview */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Taxable Amount</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-amount">{formatCurrency(gstReport.totalTaxableAmount)}</div>
                    <p className="text-xs text-muted-foreground">{gstReport.totalBills} invoices</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">CGST</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-amount text-blue-600">{formatCurrency(gstReport.totalCgst)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">SGST</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-amount text-purple-600">{formatCurrency(gstReport.totalSgst)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total GST</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-amount text-green-600">{formatCurrency(gstReport.totalGst)}</div>
                    {gstReport.totalIgst > 0 && <p className="text-xs text-muted-foreground">Incl. IGST: {formatCurrency(gstReport.totalIgst)}</p>}
                  </CardContent>
                </Card>
              </div>

              {/* Sub-view tabs */}
              <div className="flex gap-2">
                <Button variant={gstView === 'hsn' ? 'default' : 'outline'} size="sm" onClick={() => setGstView('hsn')}>HSN-wise Summary</Button>
                <Button variant={gstView === 'ratewise' ? 'default' : 'outline'} size="sm" onClick={() => setGstView('ratewise')}>Rate-wise Summary</Button>
                <Button variant={gstView === 'invoices' ? 'default' : 'outline'} size="sm" onClick={() => setGstView('invoices')}>Invoice List (GSTR-1)</Button>
              </div>

              {/* HSN-wise Summary */}
              {gstView === 'hsn' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">HSN-wise Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[500px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>HSN Code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Taxable Amt</TableHead>
                            <TableHead className="text-right">CGST %</TableHead>
                            <TableHead className="text-right">CGST Amt</TableHead>
                            <TableHead className="text-right">SGST %</TableHead>
                            <TableHead className="text-right">SGST Amt</TableHead>
                            <TableHead className="text-right">Total GST</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gstReport.hsnWise.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">No HSN data found</TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {gstReport.hsnWise.map((row, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-mono text-sm">{row.hsnCode || '-'}</TableCell>
                                  <TableCell className="max-w-[200px] truncate">{row.description}</TableCell>
                                  <TableCell className="text-right">{row.totalQty}</TableCell>
                                  <TableCell className="text-right font-amount">{formatCurrency(row.totalTaxableAmount)}</TableCell>
                                  <TableCell className="text-right">{row.cgstRate}%</TableCell>
                                  <TableCell className="text-right font-amount">{formatCurrency(row.cgstAmount)}</TableCell>
                                  <TableCell className="text-right">{row.sgstRate}%</TableCell>
                                  <TableCell className="text-right font-amount">{formatCurrency(row.sgstAmount)}</TableCell>
                                  <TableCell className="text-right font-amount font-medium">{formatCurrency(row.totalGst)}</TableCell>
                                  <TableCell className="text-right font-amount font-bold">{formatCurrency(row.totalAmount)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/50 font-bold">
                                <TableCell colSpan={3}>Total</TableCell>
                                <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalTaxableAmount)}</TableCell>
                                <TableCell />
                                <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalCgst)}</TableCell>
                                <TableCell />
                                <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalSgst)}</TableCell>
                                <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalGst)}</TableCell>
                                <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalInvoiceValue)}</TableCell>
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rate-wise Summary */}
              {gstView === 'ratewise' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Rate-wise Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>GST Rate</TableHead>
                          <TableHead className="text-right">Taxable Amount</TableHead>
                          <TableHead className="text-right">CGST</TableHead>
                          <TableHead className="text-right">SGST</TableHead>
                          <TableHead className="text-right">Total Tax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gstReport.rateWise.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No data</TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {gstReport.rateWise.map((row, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{row.gstRate}%</TableCell>
                                <TableCell className="text-right font-amount">{formatCurrency(row.taxableAmount)}</TableCell>
                                <TableCell className="text-right font-amount">{formatCurrency(row.cgst)}</TableCell>
                                <TableCell className="text-right font-amount">{formatCurrency(row.sgst)}</TableCell>
                                <TableCell className="text-right font-amount font-bold">{formatCurrency(row.total)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell>Total</TableCell>
                              <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalTaxableAmount)}</TableCell>
                              <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalCgst)}</TableCell>
                              <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalSgst)}</TableCell>
                              <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalGst)}</TableCell>
                            </TableRow>
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Invoice List (GSTR-1 style) */}
              {gstView === 'invoices' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice List (GSTR-1 Format)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[500px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice No.</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>GSTIN</TableHead>
                            <TableHead className="text-right">Taxable Amt</TableHead>
                            <TableHead className="text-right">CGST</TableHead>
                            <TableHead className="text-right">SGST</TableHead>
                            <TableHead className="text-right">IGST</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gstReport.invoiceList.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">No invoices found</TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {gstReport.invoiceList.map((inv, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-mono text-sm">{inv.billNo}</TableCell>
                                  <TableCell className="text-sm">{formatDate(inv.date)}</TableCell>
                                  <TableCell>{inv.customerName || 'Walk-in'}</TableCell>
                                  <TableCell className="font-mono text-sm">{inv.customerGstin || '-'}</TableCell>
                                  <TableCell className="text-right font-amount">{formatCurrency(inv.taxableAmount)}</TableCell>
                                  <TableCell className="text-right font-amount">{formatCurrency(inv.cgst)}</TableCell>
                                  <TableCell className="text-right font-amount">{formatCurrency(inv.sgst)}</TableCell>
                                  <TableCell className="text-right font-amount">{formatCurrency(inv.igst)}</TableCell>
                                  <TableCell className="text-right font-amount font-bold">{formatCurrency(inv.total)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/50 font-bold">
                                <TableCell colSpan={4}>Total ({gstReport.invoiceList.length} invoices)</TableCell>
                                <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalTaxableAmount)}</TableCell>
                                <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalCgst)}</TableCell>
                                <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalSgst)}</TableCell>
                                <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalIgst)}</TableCell>
                                <TableCell className="text-right font-amount">{formatCurrency(gstReport.totalInvoiceValue)}</TableCell>
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ==================== PROFIT & LOSS TAB ==================== */}
        <TabsContent value="pnl" className="space-y-4 mt-4">
          {/* Date Range Picker */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">From:</span>
              <Input type="date" value={plDateFrom} onChange={(e) => setPlDateFrom(e.target.value)} className="w-44" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">To:</span>
              <Input type="date" value={plDateTo} onChange={(e) => setPlDateTo(e.target.value)} className="w-44" />
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => { setPlDateFrom(dayjs().startOf('month').format('YYYY-MM-DD')); setPlDateTo(dayjs().format('YYYY-MM-DD')) }}>This Month</Button>
              <Button variant="ghost" size="sm" onClick={() => { const prev = dayjs().subtract(1, 'month'); setPlDateFrom(prev.startOf('month').format('YYYY-MM-DD')); setPlDateTo(prev.endOf('month').format('YYYY-MM-DD')) }}>Last Month</Button>
              <Button variant="ghost" size="sm" onClick={() => { setPlDateFrom(dayjs().startOf('year').format('YYYY-MM-DD')); setPlDateTo(dayjs().format('YYYY-MM-DD')) }}>This Year</Button>
            </div>
          </div>

          {plLoading && <div className="py-8 text-center text-muted-foreground">Loading P&L Report...</div>}

          {plReport && !plLoading && (
            <>
              {/* P&L Summary Cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Net Sales</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-amount text-green-600">{formatCurrency(plReport.revenue.netSales)}</div>
                    <p className="text-xs text-muted-foreground">{plReport.revenue.totalBills} bills</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Cost of Goods</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-amount text-orange-600">{formatCurrency(plReport.costOfGoods.netPurchases)}</div>
                    <p className="text-xs text-muted-foreground">Purchases + GST</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold font-amount ${plReport.grossProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(plReport.grossProfit)}
                    </div>
                    <p className="text-xs text-muted-foreground">{plReport.grossMarginPercent.toFixed(1)}% margin</p>
                  </CardContent>
                </Card>
                <Card className={plReport.netProfit >= 0 ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                    {plReport.netProfit >= 0 ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold font-amount ${plReport.netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(plReport.netProfit)}
                    </div>
                    <p className="text-xs text-muted-foreground">{plReport.netMarginPercent.toFixed(1)}% margin</p>
                  </CardContent>
                </Card>
              </div>

              {/* P&L Statement */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profit & Loss Statement</CardTitle>
                  <p className="text-sm text-muted-foreground">{formatDate(plReport.period.from)} to {formatDate(plReport.period.to)}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Revenue Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Revenue</h3>
                      <div className="space-y-1">
                        <div className="flex justify-between py-1">
                          <span>Total Sales</span>
                          <span className="font-amount">{formatCurrency(plReport.revenue.totalSales)}</span>
                        </div>
                        {plReport.revenue.totalReturns > 0 && (
                          <div className="flex justify-between py-1 text-destructive">
                            <span>Less: Returns</span>
                            <span className="font-amount">-{formatCurrency(plReport.revenue.totalReturns)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between py-1 font-bold">
                          <span>Net Sales Revenue</span>
                          <span className="font-amount text-green-600">{formatCurrency(plReport.revenue.netSales)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost of Goods Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cost of Goods Sold</h3>
                      <div className="space-y-1">
                        <div className="flex justify-between py-1">
                          <span>Purchases</span>
                          <span className="font-amount">{formatCurrency(plReport.costOfGoods.totalPurchases)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>Purchase GST (Input Tax)</span>
                          <span className="font-amount">{formatCurrency(plReport.costOfGoods.purchaseGst)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between py-1 font-bold">
                          <span>Total Cost of Goods</span>
                          <span className="font-amount text-orange-600">{formatCurrency(plReport.costOfGoods.netPurchases)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gross Profit */}
                    <div className="bg-muted/50 rounded-md p-3">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Gross Profit</span>
                        <span className={`font-amount ${plReport.grossProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {formatCurrency(plReport.grossProfit)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Gross Margin: {plReport.grossMarginPercent.toFixed(1)}%</p>
                    </div>

                    {/* Expenses Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Operating Expenses</h3>
                      <div className="space-y-1">
                        {plReport.expenses.byCategory.length > 0 ? (
                          plReport.expenses.byCategory.map((cat) => (
                            <div key={cat.category} className="flex justify-between py-1">
                              <span className="capitalize">{cat.category}</span>
                              <span className="font-amount">{formatCurrency(cat.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex justify-between py-1">
                            <span className="text-muted-foreground italic">No expenses recorded</span>
                            <span className="font-amount">{formatCurrency(0)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between py-1 font-bold">
                          <span>Total Expenses</span>
                          <span className="font-amount text-destructive">{formatCurrency(plReport.expenses.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Profit */}
                    <div className={`rounded-md p-4 ${plReport.netProfit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex justify-between font-bold text-xl">
                        <span className="flex items-center gap-2">
                          {plReport.netProfit >= 0 ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
                          Net {plReport.netProfit >= 0 ? 'Profit' : 'Loss'}
                        </span>
                        <span className={`font-amount ${plReport.netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {formatCurrency(Math.abs(plReport.netProfit))}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Net Margin: {plReport.netMarginPercent.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Other Info */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Discount Given</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold font-amount text-destructive">{formatCurrency(plReport.otherInfo.totalDiscount)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Credit Sales</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold font-amount text-orange-600">{formatCurrency(plReport.otherInfo.totalCreditSales)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Credit Collected</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold font-amount text-green-600">{formatCurrency(plReport.otherInfo.totalCreditCollected)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Bill Value</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold font-amount">{formatCurrency(plReport.otherInfo.avgBillValue)}</div></CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      <Dialog open={showBillDetail} onOpenChange={setShowBillDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Bill #{selectedBill?.billNumber}</DialogTitle>
            <DialogDescription>
              {selectedBill?.date} | {selectedBill?.customerName || 'Walk-in'} |{' '}
              <Badge
                variant={selectedBill?.status === 'completed' ? 'default' : 'destructive'}
                className="text-[10px]"
              >
                {selectedBill?.status}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          {selectedBill && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Disc</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedBill.items || []).map((item: BillItem, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">{item.productName}</TableCell>
                      <TableCell className="text-right font-amount">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-amount">
                        {formatCurrency(item.discountAmount || 0)}
                      </TableCell>
                      <TableCell className="text-right font-amount">
                        {formatCurrency(item.gstAmount || 0)}
                      </TableCell>
                      <TableCell className="text-right font-amount font-medium">
                        {formatCurrency(item.total || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-amount">{formatCurrency(selectedBill.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-amount">-{formatCurrency(selectedBill.discountAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST:</span>
                    <span className="font-amount">{formatCurrency(selectedBill.gstAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Grand Total:</span>
                    <span className="font-amount">{formatCurrency(selectedBill.grandTotal)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment:</span>
                    <Badge variant="secondary">{selectedBill.paymentMode?.toUpperCase()}</Badge>
                  </div>
                  {selectedBill.cashAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cash:</span>
                      <span className="font-amount">{formatCurrency(selectedBill.cashAmount)}</span>
                    </div>
                  )}
                  {selectedBill.upiAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">UPI:</span>
                      <span className="font-amount">{formatCurrency(selectedBill.upiAmount)}</span>
                    </div>
                  )}
                  {selectedBill.cardAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Card:</span>
                      <span className="font-amount">{formatCurrency(selectedBill.cardAmount)}</span>
                    </div>
                  )}
                  {selectedBill.creditAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Credit:</span>
                      <span className="font-amount text-destructive">
                        {formatCurrency(selectedBill.creditAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBillDetail(false)}>
              Close
            </Button>
            {selectedBill && (
              <>
                {selectedBill.customerPhone && selectedBill.customerPhone.length >= 10 && (
                  <Button
                    variant="outline"
                    className="border-green-500 text-green-600 hover:bg-green-50"
                    onClick={async () => {
                      const res = await window.api.whatsapp.sendBillReceipt(
                        selectedBill.id,
                        selectedBill.customerPhone!
                      )
                      if (res.success) toast.success('WhatsApp opened')
                      else toast.error(res.error || 'Failed')
                    }}
                  >
                    📱 WhatsApp
                  </Button>
                )}
                <Button variant="outline" onClick={() => handleDownloadBill(selectedBill)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button onClick={() => handleReprint(selectedBill)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Reprint
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Confirmation */}
      <Dialog open={!!showReturnConfirm} onOpenChange={() => setShowReturnConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <RotateCcw className="h-5 w-5" />
              Return Bill
            </DialogTitle>
            <DialogDescription>
              Return bill <strong>{showReturnConfirm?.billNumber}</strong> for{' '}
              <strong>{formatCurrency(showReturnConfirm?.grandTotal || 0)}</strong>?
              This will restore stock quantities and reverse any credit charges.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReturnBill}>
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <Dialog open={!!showCancelConfirm} onOpenChange={() => setShowCancelConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Cancel Bill
            </DialogTitle>
            <DialogDescription>
              Cancel bill <strong>{showCancelConfirm?.billNumber}</strong> for{' '}
              <strong>{formatCurrency(showCancelConfirm?.grandTotal || 0)}</strong>?
              This will restore stock and void the bill permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelConfirm(null)}>
              Keep Bill
            </Button>
            <Button variant="destructive" onClick={handleCancelBill}>
              Cancel Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}
