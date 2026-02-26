// ============================================================================
// KPT Billing - PDF Report Service
// Generates detailed, professional PDF reports for daily/weekly/monthly/yearly
// ============================================================================
import { BrowserWindow, app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import log from 'electron-log'
import type { DailySummary } from '../../shared/types'
import { settingsRepo } from '../database/repositories/settings.repo'

function getReportsDir(): string {
  const userDataPath = app.getPath('userData')
  const dir = join(userDataPath, 'reports')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n)
}

function num(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n)
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return '0.0%'
  return ((part / whole) * 100).toFixed(1) + '%'
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function monthName(ym: string): string {
  const [, m] = ym.split('-')
  return MONTH_NAMES[parseInt(m, 10) - 1] || m
}

// ---- Shared HTML helpers ----

function pageShell(title: string, periodLabel: string, body: string): string {
  const shop = settingsRepo.getAll()
  const shopName = shop.shopName || 'KRISHNAPRIYA TEXTILES'
  const shopAddress = shop.shopAddress || ''
  const shopPhone = shop.shopPhone || ''
  const gstin = shop.gstin || ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI','Arial',sans-serif; font-size:11px; color:#222; padding:24px 32px; }
.header { text-align:center; margin-bottom:16px; border-bottom:2px solid #6b1420; padding-bottom:12px; }
.shop-name { font-size:20px; font-weight:700; color:#6b1420; letter-spacing:1px; }
.shop-detail { font-size:9px; color:#666; margin-top:2px; }
.report-title { font-size:15px; font-weight:700; margin-top:8px; color:#333; }
.period { font-size:11px; color:#666; margin-top:2px; }
.section { margin-top:16px; }
.section-title { font-size:12px; font-weight:700; color:#6b1420; border-bottom:1px solid #ddd; padding-bottom:3px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px; }
.summary-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px; margin-bottom:12px; }
.summary-card { border:1px solid #ddd; border-radius:6px; padding:10px; text-align:center; }
.summary-card .label { font-size:9px; color:#888; text-transform:uppercase; letter-spacing:0.3px; }
.summary-card .value { font-size:16px; font-weight:700; margin-top:2px; }
.summary-card .sub { font-size:8px; color:#999; margin-top:1px; }
.green { color:#16a34a; } .blue { color:#2563eb; } .purple { color:#7c3aed; } .orange { color:#ea580c; } .red { color:#dc2626; }
table { width:100%; border-collapse:collapse; font-size:10px; margin-top:4px; }
th { background:#f5f0eb; color:#6b1420; font-weight:600; text-align:left; padding:6px 8px; border-bottom:2px solid #ccc; font-size:9px; text-transform:uppercase; letter-spacing:0.3px; }
td { padding:5px 8px; border-bottom:1px solid #eee; }
tr:nth-child(even) { background:#fafaf8; }
.text-right { text-align:right; }
.text-center { text-align:center; }
.font-bold { font-weight:700; }
.total-row { background:#f5f0eb !important; font-weight:700; border-top:2px solid #ccc; }
.payment-bar { display:flex; align-items:center; gap:6px; margin-bottom:6px; }
.bar-label { width:60px; font-size:10px; font-weight:600; }
.bar-track { flex:1; height:14px; background:#eee; border-radius:3px; overflow:hidden; }
.bar-fill { height:100%; border-radius:3px; }
.bar-value { width:100px; text-align:right; font-size:10px; font-weight:600; }
.bar-pct { width:40px; text-align:right; font-size:9px; color:#888; }
.stats-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:12px; }
.stat-box { border:1px solid #ddd; border-radius:6px; padding:8px 12px; }
.stat-box .label { font-size:9px; color:#888; text-transform:uppercase; }
.stat-box .value { font-size:14px; font-weight:700; margin-top:2px; }
.footer { text-align:center; font-size:8px; color:#999; margin-top:20px; border-top:1px solid #ddd; padding-top:8px; }
@media print { body { padding:12px; } }
</style></head><body>
<div class="header">
  <div class="shop-name">${shopName}</div>
  ${shopAddress ? `<div class="shop-detail">${shopAddress}</div>` : ''}
  ${shopPhone ? `<div class="shop-detail">Ph: ${shopPhone}${gstin ? ` | GSTIN: ${gstin}` : ''}</div>` : ''}
  <div class="report-title">${title}</div>
  <div class="period">${periodLabel}</div>
</div>
${body}
<div class="footer">
  Generated on ${new Date().toLocaleString('en-IN')} | ${shopName}
</div>
</body></html>`
}

function summaryCardsHtml(s: DailySummary): string {
  return `<div class="summary-grid">
  <div class="summary-card"><div class="label">Total Sales</div><div class="value">${fmt(s.totalSales)}</div><div class="sub">${num(s.totalBills)} bills &bull; ${num(s.totalItems)} items</div></div>
  <div class="summary-card"><div class="label">Cash Sales</div><div class="value green">${fmt(s.cashSales)}</div><div class="sub">${pct(s.cashSales, s.totalSales)} of total</div></div>
  <div class="summary-card"><div class="label">UPI Sales</div><div class="value blue">${fmt(s.upiSales)}</div><div class="sub">${pct(s.upiSales, s.totalSales)} of total</div></div>
  <div class="summary-card"><div class="label">Credit Sales</div><div class="value orange">${fmt(s.creditSales)}</div><div class="sub">${pct(s.creditSales, s.totalSales)} of total</div></div>
</div>
<div class="summary-grid">
  <div class="summary-card"><div class="label">Card Sales</div><div class="value purple">${fmt(s.cardSales)}</div><div class="sub">${pct(s.cardSales, s.totalSales)} of total</div></div>
  <div class="summary-card"><div class="label">Total Discount</div><div class="value red">${fmt(s.totalDiscount)}</div></div>
  <div class="summary-card"><div class="label">Avg Bill Value</div><div class="value">${fmt(s.totalBills > 0 ? s.totalSales / s.totalBills : 0)}</div></div>
  <div class="summary-card"><div class="label">Net Sales</div><div class="value">${fmt(s.totalSales - s.totalDiscount)}</div></div>
</div>`
}

function paymentBreakdownHtml(data: { mode: string; total: number; count: number }[], total: number): string {
  const colors: Record<string, string> = { cash: '#16a34a', upi: '#2563eb', card: '#7c3aed', credit: '#ea580c' }
  const bars = data.map(d => {
    const w = total > 0 ? (d.total / total) * 100 : 0
    const color = colors[d.mode] || '#999'
    return `<div class="payment-bar">
      <div class="bar-label" style="color:${color}">${d.mode.toUpperCase()}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${color}"></div></div>
      <div class="bar-value">${fmt(d.total)}</div>
      <div class="bar-pct">${pct(d.total, total)}</div>
    </div>`
  }).join('')
  return `<div class="section">
  <div class="section-title">Payment Breakdown</div>
  ${bars}
  <div style="text-align:right;font-weight:700;font-size:11px;margin-top:4px;border-top:1px solid #ccc;padding-top:4px;">Total: ${fmt(total)} (${data.reduce((s, d) => s + d.count, 0)} bills)</div>
</div>`
}

function topProductsHtml(data: { productName: string; totalQty: number; totalAmount: number }[]): string {
  if (data.length === 0) return ''
  const rows = data.map((p, i) => `<tr>
    <td class="text-center">${i + 1}</td>
    <td>${p.productName}</td>
    <td class="text-right">${num(p.totalQty)}</td>
    <td class="text-right">${fmt(p.totalAmount)}</td>
    <td class="text-right">${data.length > 0 ? pct(p.totalAmount, data.reduce((s, x) => s + x.totalAmount, 0)) : '-'}</td>
  </tr>`).join('')
  const totalQty = data.reduce((s, p) => s + p.totalQty, 0)
  const totalAmt = data.reduce((s, p) => s + p.totalAmount, 0)
  return `<div class="section">
  <div class="section-title">Top Selling Products</div>
  <table>
    <thead><tr><th class="text-center">#</th><th>Product</th><th class="text-right">Qty Sold</th><th class="text-right">Revenue</th><th class="text-right">Share</th></tr></thead>
    <tbody>${rows}
    <tr class="total-row"><td></td><td>Total</td><td class="text-right">${num(totalQty)}</td><td class="text-right">${fmt(totalAmt)}</td><td></td></tr>
    </tbody>
  </table></div>`
}

interface DayRow { date: string; totalSales: number; billCount: number; cashSales: number; upiSales: number; cardSales: number; creditSales: number }
interface MonthRow { month: string; totalSales: number; billCount: number; cashSales: number; upiSales: number; cardSales: number; creditSales: number }

function dailyBreakdownHtml(rows: DayRow[], title: string): string {
  if (!rows || rows.length === 0) return ''
  const body = rows.map(d => {
    const dt = new Date(d.date + 'T00:00:00')
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()]
    const label = `${dayName}, ${dt.getDate()} ${MONTH_NAMES[dt.getMonth()]?.substring(0, 3)}`
    return `<tr>
      <td>${label}</td>
      <td class="text-right font-bold">${fmt(d.totalSales)}</td>
      <td class="text-center">${d.billCount}</td>
      <td class="text-right green">${fmt(d.cashSales)}</td>
      <td class="text-right blue">${fmt(d.upiSales)}</td>
      <td class="text-right purple">${fmt(d.cardSales)}</td>
      <td class="text-right orange">${fmt(d.creditSales)}</td>
    </tr>`
  }).join('')
  const ts = rows.reduce((s, r) => s + r.totalSales, 0)
  const tb = rows.reduce((s, r) => s + r.billCount, 0)
  const tc = rows.reduce((s, r) => s + r.cashSales, 0)
  const tu = rows.reduce((s, r) => s + r.upiSales, 0)
  const td2 = rows.reduce((s, r) => s + r.cardSales, 0)
  const tcr = rows.reduce((s, r) => s + r.creditSales, 0)
  return `<div class="section">
  <div class="section-title">${title}</div>
  <table>
    <thead><tr><th>Date</th><th class="text-right">Sales</th><th class="text-center">Bills</th><th class="text-right">Cash</th><th class="text-right">UPI</th><th class="text-right">Card</th><th class="text-right">Credit</th></tr></thead>
    <tbody>${body}
    <tr class="total-row"><td>Total</td><td class="text-right">${fmt(ts)}</td><td class="text-center">${tb}</td><td class="text-right">${fmt(tc)}</td><td class="text-right">${fmt(tu)}</td><td class="text-right">${fmt(td2)}</td><td class="text-right">${fmt(tcr)}</td></tr>
    </tbody>
  </table></div>`
}

function monthlyBreakdownHtml(rows: MonthRow[]): string {
  if (!rows || rows.length === 0) return ''
  const body = rows.map(m => {
    const label = `${monthName(m.month)} ${m.month.split('-')[0]}`
    return `<tr>
      <td>${label}</td>
      <td class="text-right font-bold">${fmt(m.totalSales)}</td>
      <td class="text-center">${m.billCount}</td>
      <td class="text-right green">${fmt(m.cashSales)}</td>
      <td class="text-right blue">${fmt(m.upiSales)}</td>
      <td class="text-right purple">${fmt(m.cardSales)}</td>
      <td class="text-right orange">${fmt(m.creditSales)}</td>
    </tr>`
  }).join('')
  const ts = rows.reduce((s, r) => s + r.totalSales, 0)
  const tb = rows.reduce((s, r) => s + r.billCount, 0)
  const tc = rows.reduce((s, r) => s + r.cashSales, 0)
  const tu = rows.reduce((s, r) => s + r.upiSales, 0)
  const td2 = rows.reduce((s, r) => s + r.cardSales, 0)
  const tcr = rows.reduce((s, r) => s + r.creditSales, 0)
  return `<div class="section">
  <div class="section-title">Monthly Breakdown</div>
  <table>
    <thead><tr><th>Month</th><th class="text-right">Sales</th><th class="text-center">Bills</th><th class="text-right">Cash</th><th class="text-right">UPI</th><th class="text-right">Card</th><th class="text-right">Credit</th></tr></thead>
    <tbody>${body}
    <tr class="total-row"><td>Total</td><td class="text-right">${fmt(ts)}</td><td class="text-center">${tb}</td><td class="text-right">${fmt(tc)}</td><td class="text-right">${fmt(tu)}</td><td class="text-right">${fmt(td2)}</td><td class="text-right">${fmt(tcr)}</td></tr>
    </tbody>
  </table></div>`
}

function yearlyStatsHtml(totals: DailySummary, monthCount: number): string {
  const avgMonthly = monthCount > 0 ? totals.totalSales / monthCount : 0
  const avgBill = totals.totalBills > 0 ? totals.totalSales / totals.totalBills : 0
  const avgDaily = monthCount > 0 ? totals.totalSales / (monthCount * 30) : 0
  return `<div class="stats-row">
    <div class="stat-box"><div class="label">Avg Monthly Sales</div><div class="value">${fmt(avgMonthly)}</div></div>
    <div class="stat-box"><div class="label">Avg Daily Sales (est.)</div><div class="value">${fmt(avgDaily)}</div></div>
    <div class="stat-box"><div class="label">Avg Bill Value</div><div class="value">${fmt(avgBill)}</div></div>
  </div>`
}

// ---- Main class ----

export class PdfReportService {
  private async renderPdf(html: string, fileName: string, landscape = false): Promise<{ success: boolean; path: string }> {
    const dir = getReportsDir()
    const filePath = join(dir, fileName)

    const win = new BrowserWindow({
      width: landscape ? 1123 : 794,
      height: landscape ? 794 : 1123,
      show: false,
      webPreferences: { offscreen: true }
    })

    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      await new Promise(r => setTimeout(r, 500))

      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
        landscape
      })

      writeFileSync(filePath, pdfBuffer)
      log.info(`Report PDF saved: ${filePath}`)
      return { success: true, path: filePath }
    } catch (err) {
      log.error('Report PDF generation failed:', err)
      return { success: false, path: '' }
    } finally {
      win.destroy()
    }
  }

  async generateDailyReport(
    date: string,
    summary: DailySummary,
    bills: { billNumber: string; time: string; customerName: string | null; totalItems: number; paymentMode: string; grandTotal: number; status: string }[]
  ): Promise<{ success: boolean; path: string }> {
    const dt = new Date(date + 'T00:00:00')
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dt.getDay()]
    const periodLabel = `${dayName}, ${dt.getDate()} ${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`

    const billRows = bills.map((b, i) =>
      `<tr>
        <td class="text-center">${i + 1}</td>
        <td>${b.billNumber}</td>
        <td class="text-center">${b.time || '-'}</td>
        <td>${b.customerName || 'Walk-in'}</td>
        <td class="text-center">${b.totalItems}</td>
        <td class="text-center">${b.paymentMode?.toUpperCase()}</td>
        <td style="text-align:center;"><span style="padding:2px 6px;border-radius:3px;font-size:8px;font-weight:600;background:${b.status === 'completed' ? '#dcfce7;color:#16a34a' : b.status === 'returned' ? '#fee2e2;color:#dc2626' : '#f3f4f6;color:#6b7280'}">${b.status}</span></td>
        <td class="text-right font-bold">${fmt(b.grandTotal)}</td>
      </tr>`
    ).join('')

    const body = `
${summaryCardsHtml(summary)}
${paymentBreakdownHtml(
  [
    { mode: 'cash', total: summary.cashSales, count: 0 },
    { mode: 'upi', total: summary.upiSales, count: 0 },
    { mode: 'card', total: summary.cardSales, count: 0 },
    { mode: 'credit', total: summary.creditSales, count: 0 }
  ].filter(d => d.total > 0),
  summary.totalSales
)}
<div class="section">
  <div class="section-title">All Bills (${bills.length})</div>
  <table>
    <thead><tr><th class="text-center">#</th><th>Bill No</th><th class="text-center">Time</th><th>Customer</th><th class="text-center">Items</th><th class="text-center">Payment</th><th class="text-center">Status</th><th class="text-right">Amount</th></tr></thead>
    <tbody>${billRows}
    <tr class="total-row"><td></td><td colspan="6">Grand Total (${bills.filter(b => b.status === 'completed').length} completed)</td><td class="text-right">${fmt(summary.totalSales)}</td></tr>
    </tbody>
  </table>
</div>`

    const html = pageShell('Daily Sales Report', periodLabel, body)
    const safeDate = date.replace(/-/g, '')
    return this.renderPdf(html, `Daily_Report_${safeDate}.pdf`)
  }

  async generateWeeklyReport(
    endDate: string,
    report: {
      totals: DailySummary
      dailyBreakdown: DayRow[]
      paymentBreakdown: { mode: string; total: number; count: number }[]
      topProducts: { productName: string; totalQty: number; totalAmount: number }[]
    }
  ): Promise<{ success: boolean; path: string }> {
    const end = new Date(endDate + 'T00:00:00')
    const start = new Date(end.getTime() - 6 * 86400000)
    const periodLabel = `${start.getDate()} ${MONTH_NAMES[start.getMonth()]?.substring(0, 3)} ${start.getFullYear()} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]?.substring(0, 3)} ${end.getFullYear()}`

    const body = `
${summaryCardsHtml(report.totals)}
${dailyBreakdownHtml(report.dailyBreakdown, 'Day-by-Day Breakdown')}
${paymentBreakdownHtml(report.paymentBreakdown, report.totals.totalSales)}
${topProductsHtml(report.topProducts)}`

    const html = pageShell('Weekly Sales Report', periodLabel, body)
    const safeDate = endDate.replace(/-/g, '')
    return this.renderPdf(html, `Weekly_Report_${safeDate}.pdf`)
  }

  async generateMonthlyReport(
    yearMonth: string,
    report: {
      totals: DailySummary
      dailyBreakdown: DayRow[]
      paymentBreakdown: { mode: string; total: number; count: number }[]
      topProducts: { productName: string; totalQty: number; totalAmount: number }[]
    }
  ): Promise<{ success: boolean; path: string }> {
    const [y, m] = yearMonth.split('-').map(Number)
    const periodLabel = `${MONTH_NAMES[m - 1]} ${y}`

    // Additional monthly stats
    const activeDays = report.dailyBreakdown.length
    const avgDailySales = activeDays > 0 ? report.totals.totalSales / activeDays : 0
    const bestDay = report.dailyBreakdown.reduce((best, d) => d.totalSales > best.totalSales ? d : best, report.dailyBreakdown[0] || { date: '-', totalSales: 0 })
    const worstDay = report.dailyBreakdown.reduce((worst, d) => d.totalSales < worst.totalSales ? d : worst, report.dailyBreakdown[0] || { date: '-', totalSales: 0 })

    const statsHtml = `<div class="stats-row">
      <div class="stat-box"><div class="label">Active Business Days</div><div class="value">${activeDays}</div></div>
      <div class="stat-box"><div class="label">Avg Daily Sales</div><div class="value">${fmt(avgDailySales)}</div></div>
      <div class="stat-box"><div class="label">Avg Bill Value</div><div class="value">${fmt(report.totals.totalBills > 0 ? report.totals.totalSales / report.totals.totalBills : 0)}</div></div>
    </div>
    <div class="stats-row">
      <div class="stat-box"><div class="label">Best Day</div><div class="value green">${bestDay.date ? new Date(bestDay.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}</div><div class="sub" style="font-size:9px;color:#888">${fmt(bestDay.totalSales)}</div></div>
      <div class="stat-box"><div class="label">Slowest Day</div><div class="value orange">${worstDay.date ? new Date(worstDay.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}</div><div class="sub" style="font-size:9px;color:#888">${fmt(worstDay.totalSales)}</div></div>
      <div class="stat-box"><div class="label">Total Discount</div><div class="value red">${fmt(report.totals.totalDiscount)}</div></div>
    </div>`

    const body = `
${summaryCardsHtml(report.totals)}
${statsHtml}
${dailyBreakdownHtml(report.dailyBreakdown, `Daily Breakdown — ${periodLabel}`)}
${paymentBreakdownHtml(report.paymentBreakdown, report.totals.totalSales)}
${topProductsHtml(report.topProducts)}`

    const html = pageShell('Monthly Sales Report', periodLabel, body)
    return this.renderPdf(html, `Monthly_Report_${yearMonth.replace('-', '')}.pdf`)
  }

  async generateYearlyReport(
    year: number,
    report: {
      totals: DailySummary
      monthlyBreakdown: MonthRow[]
      paymentBreakdown: { mode: string; total: number; count: number }[]
      topProducts: { productName: string; totalQty: number; totalAmount: number }[]
    }
  ): Promise<{ success: boolean; path: string }> {
    const periodLabel = `Financial Year ${year}`

    // Best/worst month
    const bestMonth = report.monthlyBreakdown.reduce((best, m) => m.totalSales > best.totalSales ? m : best, report.monthlyBreakdown[0] || { month: '-', totalSales: 0 } as MonthRow)
    const worstMonth = report.monthlyBreakdown.reduce((worst, m) => m.totalSales < worst.totalSales ? m : worst, report.monthlyBreakdown[0] || { month: '-', totalSales: 0 } as MonthRow)

    const extraStats = `<div class="stats-row">
      <div class="stat-box"><div class="label">Best Month</div><div class="value green">${bestMonth.month ? monthName(bestMonth.month) : '-'}</div><div class="sub" style="font-size:9px;color:#888">${fmt(bestMonth.totalSales)}</div></div>
      <div class="stat-box"><div class="label">Slowest Month</div><div class="value orange">${worstMonth.month ? monthName(worstMonth.month) : '-'}</div><div class="sub" style="font-size:9px;color:#888">${fmt(worstMonth.totalSales)}</div></div>
      <div class="stat-box"><div class="label">Total Discount</div><div class="value red">${fmt(report.totals.totalDiscount)}</div></div>
    </div>`

    const body = `
${summaryCardsHtml(report.totals)}
${yearlyStatsHtml(report.totals, report.monthlyBreakdown.length)}
${extraStats}
${monthlyBreakdownHtml(report.monthlyBreakdown)}
${paymentBreakdownHtml(report.paymentBreakdown, report.totals.totalSales)}
${topProductsHtml(report.topProducts)}`

    const html = pageShell('Yearly Sales Report', periodLabel, body)
    return this.renderPdf(html, `Yearly_Report_${year}.pdf`)
  }

  getReportsDir(): string {
    return getReportsDir()
  }
}

export const pdfReportService = new PdfReportService()
