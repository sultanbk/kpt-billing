// ============================================================================
// KPT Billing - Data Export Page
// Full data export to Excel for accountants
// ============================================================================
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Separator } from '../../components/ui/separator'
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Package,
  Users,
  ShoppingCart,
  Database,
  Loader2,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { exportService } from '../../services/export.service'
import { FeatureGate } from '../../components/license'

interface ExportJob {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  running: boolean
  done: boolean
}

export default function DataExportPage(): React.JSX.Element {
  const today = dayjs().format('YYYY-MM-DD')
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(today)

  const [jobs, setJobs] = useState<ExportJob[]>([
    {
      key: 'daily',
      label: 'Daily Report',
      description: 'Sales summary, bills, and payment breakdown for a specific date',
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      running: false,
      done: false
    },
    {
      key: 'bills',
      label: 'Bill History',
      description: 'All bills with items, discounts, taxes, and payment details',
      icon: <ShoppingCart className="h-5 w-5 text-green-500" />,
      running: false,
      done: false
    },
    {
      key: 'stock',
      label: 'Stock Report',
      description: 'Complete product inventory with prices, stock levels, and valuation',
      icon: <Package className="h-5 w-5 text-purple-500" />,
      running: false,
      done: false
    },
    {
      key: 'customers',
      label: 'Customer Report',
      description: 'All customers with credit outstanding and contact details',
      icon: <Users className="h-5 w-5 text-amber-500" />,
      running: false,
      done: false
    },
    {
      key: 'full',
      label: 'Full Data Export',
      description:
        'Everything — bills, items, products, customers, payments, purchases, expenses, stock ledger',
      icon: <Database className="h-5 w-5 text-red-500" />,
      running: false,
      done: false
    }
  ])

  const updateJob = (key: string, update: Partial<ExportJob>): void => {
    setJobs((prev) => prev.map((j) => (j.key === key ? { ...j, ...update } : j)))
  }

  const handleExport = async (key: string): Promise<void> => {
    updateJob(key, { running: true, done: false })
    try {
      let result: { success: boolean; path?: string | null; error?: string }
      switch (key) {
        case 'daily':
          result = await exportService.dailyReport(dateTo)
          break
        case 'bills':
          result = await exportService.billHistory(dateFrom, dateTo)
          break
        case 'stock':
          result = await exportService.stockReport()
          break
        case 'customers':
          result = await exportService.customerReport()
          break
        case 'full':
          result = await exportService.fullData()
          break
        default:
          result = { success: false, error: 'Unknown export type' }
      }

      if (result.success && result.path) {
        updateJob(key, { running: false, done: true })
        toast.success(`Exported successfully`)
      } else if (result.success && !result.path) {
        // User cancelled save dialog
        updateJob(key, { running: false })
      } else {
        updateJob(key, { running: false })
        toast.error(result.error || 'Export failed')
      }
    } catch {
      updateJob(key, { running: false })
      toast.error('Export failed')
    }
  }

  const anyRunning = jobs.some((j) => j.running)

  return (
    <FeatureGate feature="dataExport">
      <div className="flex h-full flex-col page-enter">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Data Export</h1>
              <p className="text-sm text-muted-foreground">
                Export data to Excel (.xlsx) for your accountant
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Date Range Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Date Range</CardTitle>
              <CardDescription>
                Select the period for bill history and daily reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="space-y-1.5">
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateFrom(today)
                      setDateTo(today)
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateFrom(monthStart)
                      setDateTo(today)
                    }}
                  >
                    This Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const fy = dayjs().month() >= 3 ? dayjs().year() : dayjs().year() - 1
                      setDateFrom(`${fy}-04-01`)
                      setDateTo(today)
                    }}
                  >
                    This FY
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Export Cards */}
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card key={job.key} className="transition-all hover:border-primary/30">
                <CardContent className="flex items-center justify-between py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                      {job.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{job.label}</h3>
                      <p className="text-sm text-muted-foreground">{job.description}</p>
                      {(job.key === 'daily' || job.key === 'bills') && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Period: {dayjs(dateFrom).format('DD MMM YYYY')} —{' '}
                          {dayjs(dateTo).format('DD MMM YYYY')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleExport(job.key)}
                    disabled={anyRunning}
                    variant={job.done ? 'outline' : 'default'}
                    className="gap-2 min-w-[140px]"
                  >
                    {job.running ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : job.done ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Exported
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Export
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Info */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Tips for accountants:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                <strong>Full Data Export</strong> contains all tables — ideal for year-end audit
              </li>
              <li>
                All exports are in <strong>.xlsx format</strong> compatible with Excel, Google
                Sheets, and Tally
              </li>
              <li>Stock report includes cost and selling value for inventory reconciliation</li>
              <li>
                GST-related data is available in the bill items sheet with HSN codes and tax
                breakdowns
              </li>
            </ul>
          </div>
        </div>
      </div>
    </FeatureGate>
  )
}
