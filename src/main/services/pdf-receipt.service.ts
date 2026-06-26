// ============================================================================
// KPT Billing - PDF Receipt Service
// Generates professional A4 invoice PDFs for bill download
// ============================================================================
import { BrowserWindow, app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import log from 'electron-log'
import type { Bill } from '../../shared/types'
import { getSqlite } from '../database/connection'
import QRCode from 'qrcode'

function getPdfDir(): string {
  const userDataPath = app.getPath('userData')
  const pdfDir = join(userDataPath, 'receipts')
  if (!existsSync(pdfDir)) {
    mkdirSync(pdfDir, { recursive: true })
  }
  return pdfDir
}

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

function n(val: unknown): number {
  if (val == null) return 0
  const v = Number(val)
  return isNaN(v) ? 0 : v
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen'
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function numberToWords(num: number): string {
  if (num === 0) return 'Zero'
  num = Math.round(Math.abs(num) * 100) / 100
  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)

  function convert(n: number): string {
    if (n < 20) return ONES[n]
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
    if (n < 1000)
      return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '')
    if (n < 100000)
      return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000)
      return (
        convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
      )
    return (
      convert(Math.floor(n / 10000000)) +
      ' Crore' +
      (n % 10000000 ? ' ' + convert(n % 10000000) : '')
    )
  }

  let result = 'Rupees ' + convert(rupees)
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise'
  result += ' Only'
  return result
}

function formatDate(date: string): string {
  try {
    const d = new Date(date + 'T00:00:00')
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return date
  }
}

function buildReturnsHtml(bill: Bill): string {
  const returns = bill.returns
  if (!returns || returns.length === 0) return ''

  const rows = returns
    .map((r) => {
      const typeLabel = r.type === 'exchange' ? 'Exchange' : 'Return'
      const dateStr = r.createdAt ? r.createdAt.split(' ')[0] || r.createdAt : ''
      const net = r.netAmount
      const netLabel =
        net > 0
          ? `<span style="color:#16a34a;font-weight:600;">+${fmt(net)}</span>`
          : net < 0
            ? `<span style="color:#dc2626;font-weight:600;">-${fmt(Math.abs(net))}</span>`
            : `<span style="color:#888;">—</span>`
      return `<tr>
      <td style="padding:4px 6px;font-size:9.5px;">${typeLabel}</td>
      <td style="padding:4px 6px;font-size:9.5px;">${r.itemsSummary || '-'}</td>
      <td style="padding:4px 6px;font-size:9.5px;" class="tr">${fmt(r.returnAmount)}</td>
      ${r.type === 'exchange' ? `<td style="padding:4px 6px;font-size:9.5px;" class="tr">${fmt(r.exchangeAmount)}</td>` : `<td style="padding:4px 6px;font-size:9.5px;color:#888;">—</td>`}
      <td style="padding:4px 6px;font-size:9.5px;" class="tr">${netLabel}</td>
      <td style="padding:4px 6px;font-size:9.5px;">${r.refundMode}</td>
      <td style="padding:4px 6px;font-size:9.5px;">${r.newBillNo ? `<span style="font-weight:600;color:#1d4ed8;">${r.newBillNo}</span>` : '-'}</td>
      <td style="padding:4px 6px;font-size:9.5px;">${dateStr}</td>
    </tr>`
    })
    .join('')

  return `<!-- Returns/Exchanges -->
  <div style="border:1px solid #fecaca;border-radius:6px;padding:10px 12px;margin-bottom:14px;background:#fef2f2;">
    <div style="font-size:8px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
      Returns / Exchanges Applied
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:1px solid #fca5a5;">
          <th style="text-align:left;font-size:8px;padding:3px 6px;color:#991b1b;">Type</th>
          <th style="text-align:left;font-size:8px;padding:3px 6px;color:#991b1b;">Items Returned</th>
          <th style="text-align:right;font-size:8px;padding:3px 6px;color:#991b1b;">Return Value</th>
          <th style="text-align:right;font-size:8px;padding:3px 6px;color:#991b1b;">Exchange Value</th>
          <th style="text-align:right;font-size:8px;padding:3px 6px;color:#991b1b;">Net</th>
          <th style="text-align:left;font-size:8px;padding:3px 6px;color:#991b1b;">Mode</th>
          <th style="text-align:left;font-size:8px;padding:3px 6px;color:#991b1b;">New Bill</th>
          <th style="text-align:left;font-size:8px;padding:3px 6px;color:#991b1b;">Date</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

async function buildInvoiceHtml(
  bill: Bill,
  shopInfo: Record<string, string>,
  exchangeFromBillNo?: string | null
): Promise<string> {
  const upiVpa = shopInfo.upiVpa
  const upiPayeeName = shopInfo.upiPayeeName
  const grandTotal = n(bill.grandTotal)
  const billRef = String(bill.billNo || bill.billNumber || bill.id || '')
  const upiNote = `Bill ${billRef || 'Payment'}`

  let qrCodeDataURL = ''
  if (upiVpa && upiPayeeName && grandTotal > 0) {
    const upiUrl = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(
      upiPayeeName
    )}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(upiNote)}&tr=${encodeURIComponent(billRef)}`
    try {
      qrCodeDataURL = await QRCode.toDataURL(upiUrl, {
        errorCorrectionLevel: 'M',
        width: 110
      })
    } catch (err) {
      log.error('Failed to generate QR code', err)
    }
  }

  const shopName = shopInfo.shopName || 'KRISHNAPRIYA TEXTILES'
  const shopAddress = shopInfo.shopAddress || ''
  const shopPhone = shopInfo.shopPhone || ''
  const gstin = shopInfo.gstin || ''
  const footer = shopInfo.receiptFooter || 'Thank you for your purchase!'

  const items = Array.isArray(bill.items) ? bill.items.filter(Boolean) : []

  // Build items rows
  let totalQty = 0
  let totalTaxable = 0
  let totalCgst = 0
  let totalSgst = 0
  const itemsHtml = items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((item: any, idx: number) => {
      if (!item) return ''
      const qty = n(item.quantity ?? item.qty)
      const returnedQty = n(item.returnedQty)
      const rate = n(item.price ?? item.rate)
      const hsnCode = item.hsnCode || item.hsn_code || item.hsn || ''
      const discVal = n(
        item.discountValue ?? item.discount_value ?? item.discount ?? item.discountAmount
      )
      const discType = item.discountType || item.discount_type || 'flat'
      const gross = qty * rate
      let discAmt = 0
      if (discType === 'percent' || discType === 'percentage') {
        discAmt = (gross * discVal) / 100
      } else {
        discAmt = discVal
      }
      const taxable = n(item.taxableAmount ?? item.taxable_amount) || gross - discAmt
      const cgstRate = n(item.cgstRate ?? item.cgst_rate)
      const sgstRate = n(item.sgstRate ?? item.sgst_rate)
      const cgstAmt = n(item.cgstAmount ?? item.cgst_amount) || (taxable * cgstRate) / 100
      const sgstAmt = n(item.sgstAmount ?? item.sgst_amount) || (taxable * sgstRate) / 100
      const total = n(item.total ?? item.amount) || taxable + cgstAmt + sgstAmt
      const name = item.productName || item.product_name || 'Unknown'

      totalQty += qty
      totalTaxable += taxable
      totalCgst += cgstAmt
      totalSgst += sgstAmt

      return `<tr${returnedQty >= qty ? ' style="opacity:0.45;text-decoration:line-through;"' : ''}>
      <td class="tc">${idx + 1}</td>
      <td>${name}${returnedQty > 0 && returnedQty < qty ? ` <span style="color:#dc2626;font-size:8.5px;font-weight:600;">(${returnedQty} returned)</span>` : ''}${returnedQty >= qty ? ' <span style="color:#dc2626;font-size:8.5px;font-weight:600;">(Returned)</span>' : ''}</td>
      <td class="tc">${hsnCode}</td>
      <td class="tr">${qty}</td>
      <td class="tr">${fmt(rate)}</td>
      <td class="tr">${discAmt > 0 ? fmt(discAmt) : '-'}</td>
      <td class="tr">${fmt(taxable)}</td>
      <td class="tc">${cgstRate > 0 ? cgstRate.toFixed(1) + '%' : '-'}</td>
      <td class="tr">${cgstAmt > 0 ? fmt(cgstAmt) : '-'}</td>
      <td class="tc">${sgstRate > 0 ? sgstRate.toFixed(1) + '%' : '-'}</td>
      <td class="tr">${sgstAmt > 0 ? fmt(sgstAmt) : '-'}</td>
      <td class="tr bold">${fmt(total)}</td>
    </tr>`
    })
    .join('')

  const subtotal = n(bill.subtotal)
  const discountAmt = n(bill.discountAmount)
  const taxableAmt = n(bill.taxableAmount) || totalTaxable
  const gstAmt = n(bill.gstAmount) || totalCgst + totalSgst
  const roundOff = n(bill.roundOff)
  const payMode = (bill.paymentMode || 'cash').toUpperCase()

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI','Arial',sans-serif; font-size:11px; color:#1a1a1a; padding:20px 28px; background:#fff; }

  .invoice-box { max-width:760px; margin:0 auto; }

  /* Header */
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:10px; border-bottom:3px solid #6b1420; margin-bottom:12px; }
  .shop-block { flex:1; }
  .shop-name { font-size:22px; font-weight:800; color:#6b1420; letter-spacing:0.5px; margin-bottom:2px; }
  .shop-detail { font-size:9.5px; color:#555; line-height:1.5; }
  .invoice-label-block { text-align:right; }
  .invoice-label { font-size:24px; font-weight:800; color:#6b1420; letter-spacing:2px; }
  .invoice-status { display:inline-block; margin-top:4px; padding:2px 10px; border-radius:3px; font-size:9px; font-weight:700; letter-spacing:0.5px; }
  .status-completed { background:#dcfce7; color:#16a34a; }
  .status-returned { background:#fee2e2; color:#dc2626; }
  .status-cancelled { background:#f3f4f6; color:#6b7280; }

  /* Bill info grid */
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
  .info-box { border:1px solid #e5e5e5; border-radius:6px; padding:10px 12px; }
  .info-box-title { font-size:8px; font-weight:700; color:#6b1420; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
  .info-row { display:flex; justify-content:space-between; font-size:10px; margin-bottom:2px; }
  .info-row .label { color:#888; }
  .info-row .val { font-weight:600; }

  /* Items table */
  table { width:100%; border-collapse:collapse; margin-bottom:14px; }
  thead th { background:#6b1420; color:#fff; font-size:8.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; padding:7px 5px; }
  thead th:first-child { border-radius:4px 0 0 0; }
  thead th:last-child { border-radius:0 4px 0 0; }
  tbody td { padding:6px 5px; border-bottom:1px solid #eee; font-size:10px; }
  tbody tr:nth-child(even) { background:#fafaf8; }
  tbody tr:hover { background:#fff5f0; }
  .tc { text-align:center; }
  .tr { text-align:right; }
  .bold { font-weight:700; }

  /* Totals footer row */
  .items-footer td { background:#f5f0eb; font-weight:700; border-top:2px solid #ccc; font-size:10px; }

  /* Summary */
  .summary-section { display:flex; gap:16px; margin-bottom:14px; }
  .amount-words { flex:1.2; border:1px solid #e5e5e5; border-radius:6px; padding:10px 12px; }
  .amount-words-title { font-size:8px; font-weight:700; color:#6b1420; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
  .amount-words-text { font-size:10px; font-style:italic; color:#333; line-height:1.4; }
  .totals-box { flex:1; }
  .totals-row { display:flex; justify-content:space-between; padding:4px 0; font-size:10.5px; border-bottom:1px dotted #ddd; }
  .totals-row .label { color:#555; }
  .totals-row .val { font-weight:600; min-width:90px; text-align:right; }
  .grand-total-row { display:flex; justify-content:space-between; padding:8px 12px; margin-top:4px; background:#6b1420; color:#fff; border-radius:6px; font-size:14px; font-weight:800; }

  /* Payment */
  .payment-box { border:1px solid #e5e5e5; border-radius:6px; padding:10px 12px; margin-bottom:14px; }
  .payment-title { font-size:8px; font-weight:700; color:#6b1420; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
  .payment-grid { display:flex; gap:16px; flex-wrap:wrap; }
  .payment-item { font-size:10px; }
  .payment-item .label { color:#888; font-size:8.5px; text-transform:uppercase; }
  .payment-item .val { font-weight:700; font-size:12px; }

  .qr-code-box { text-align: center; }
  .qr-code-box img { width: 110px; height: 110px; margin-bottom: 4px; }
  .qr-code-box .qr-label { font-size: 9px; font-weight: 600; color: #333; }

  /* Footer */
  .footer { text-align:center; padding-top:10px; border-top:2px solid #6b1420; }
  .footer-text { font-size:11px; font-weight:600; color:#6b1420; margin-bottom:2px; }
  .footer-sub { font-size:8.5px; color:#999; }

  .auth-footer { text-align:right; margin:20px 0 10px; padding-top:12px; border-top:1px dashed #ccc; }
  .auth-label { font-size:9px; color:#888; text-transform:uppercase; letter-spacing:0.5px; }
  .auth-name { font-size:12px; font-weight:700; color:#6b1420; margin-top:2px; }
  .auth-note { font-size:8px; color:#aaa; margin-top:2px; font-style:italic; }

  /* SarvaOne branding footer */
  .sarvaone-footer { margin-top:14px; padding-top:10px; border-top:1px solid #e5e5e5; text-align:center; }
  .sarvaone-footer-label { font-size:8px; color:#bbb; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:3px; }
  .sarvaone-footer-brand { font-size:11px; font-weight:800; color:#6b1420; letter-spacing:0.5px; }
  .sarvaone-footer-tagline { font-size:8px; color:#999; margin-top:1px; }
  .sarvaone-footer-contact { font-size:8px; color:#888; margin-top:3px; }
</style>
</head><body>
<div class="invoice-box">

  <!-- Header -->
  <div class="header">
    <div class="shop-block">
      <div class="shop-name">${shopName}</div>
      ${shopAddress ? `<div class="shop-detail">${shopAddress}</div>` : ''}
      ${shopPhone ? `<div class="shop-detail">Ph: ${shopPhone}</div>` : ''}
      ${gstin ? `<div class="shop-detail" style="margin-top:2px;font-weight:600;">GSTIN: ${gstin}</div>` : ''}
    </div>
    <div class="invoice-label-block">
      <div class="invoice-label">INVOICE</div>
      <div class="invoice-status status-${bill.status || 'completed'}">${(bill.status || 'completed').toUpperCase()}</div>
    </div>
  </div>

  <!-- Bill Info -->
  ${
    exchangeFromBillNo
      ? `
  <div style="background:#eff6ff;border:1.5px solid #3b82f6;border-radius:6px;padding:8px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;">
    <span style="font-size:16px;">🔄</span>
    <div>
      <div style="font-size:9px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.8px;">Exchange Bill</div>
      <div style="font-size:10px;color:#1e40af;">Against original invoice <strong>${exchangeFromBillNo}</strong></div>
    </div>
  </div>`
      : ''
  }
  <div class="info-grid">
    <div class="info-box">
      <div class="info-box-title">Invoice Details</div>
      <div class="info-row"><span class="label">Invoice No</span><span class="val">${bill.billNo || bill.billNumber || ''}</span></div>
      <div class="info-row"><span class="label">Date</span><span class="val">${formatDate(bill.date)}</span></div>
      <div class="info-row"><span class="label">Time</span><span class="val">${bill.time || ''}</span></div>
      ${bill.salesmanName ? `<div class="info-row"><span class="label">Salesman</span><span class="val">${bill.salesmanName}</span></div>` : ''}
    </div>
    <div class="info-box">
      <div class="info-box-title">Customer Details</div>
      <div class="info-row"><span class="label">Name</span><span class="val">${bill.customerName || 'Walk-in Customer'}</span></div>
      ${bill.customerPhone ? `<div class="info-row"><span class="label">Phone</span><span class="val">${bill.customerPhone}</span></div>` : ''}
    </div>
  </div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th class="tc" style="width:30px">#</th>
        <th>Item Description</th>
        <th class="tc" style="width:55px">HSN</th>
        <th class="tr" style="width:35px">Qty</th>
        <th class="tr" style="width:60px">Rate (₹)</th>
        <th class="tr" style="width:55px">Disc (₹)</th>
        <th class="tr" style="width:65px">Taxable (₹)</th>
        <th class="tc" style="width:40px">CGST</th>
        <th class="tr" style="width:55px">CGST (₹)</th>
        <th class="tc" style="width:40px">SGST</th>
        <th class="tr" style="width:55px">SGST (₹)</th>
        <th class="tr" style="width:65px">Total (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
      <tr class="items-footer">
        <td></td>
        <td>Total (${items.length} items)</td>
        <td></td>
        <td class="tr">${totalQty}</td>
        <td></td>
        <td class="tr">${discountAmt > 0 ? fmt(discountAmt) : '-'}</td>
        <td class="tr">${fmt(taxableAmt)}</td>
        <td></td>
        <td class="tr">${fmt(totalCgst)}</td>
        <td></td>
        <td class="tr">${fmt(totalSgst)}</td>
        <td class="tr">${fmt(grandTotal)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Summary Section -->
  <div class="summary-section">
    <div class="amount-words">
      <div class="amount-words-title">Amount in Words</div>
      <div class="amount-words-text">${numberToWords(grandTotal)}</div>
    </div>
    <div class="totals-box">
      <div class="totals-row"><span class="label">Subtotal</span><span class="val">${fmt(subtotal)}</span></div>
      ${discountAmt > 0 ? `<div class="totals-row"><span class="label">Discount</span><span class="val" style="color:#dc2626;">-${fmt(discountAmt)}</span></div>` : ''}
      <div class="totals-row"><span class="label">Taxable Amount</span><span class="val">${fmt(taxableAmt)}</span></div>
      ${totalCgst > 0 ? `<div class="totals-row"><span class="label">CGST</span><span class="val">${fmt(totalCgst)}</span></div>` : ''}
      ${totalSgst > 0 ? `<div class="totals-row"><span class="label">SGST</span><span class="val">${fmt(totalSgst)}</span></div>` : ''}
      ${gstAmt > 0 && totalCgst === 0 ? `<div class="totals-row"><span class="label">GST</span><span class="val">${fmt(gstAmt)}</span></div>` : ''}
      ${roundOff !== 0 ? `<div class="totals-row"><span class="label">Round Off</span><span class="val">${roundOff > 0 ? '+' : ''}${fmt(roundOff)}</span></div>` : ''}
      <div class="grand-total-row"><span>GRAND TOTAL</span><span>${fmtCurrency(grandTotal)}</span></div>
    </div>
  </div>

  <!-- Payment Info -->
  <div class="payment-box">
    <div class="payment-title">Payment Information</div>
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div class="payment-grid" style="flex: 1;">
        <div class="payment-item"><div class="label">Mode</div><div class="val">${payMode}</div></div>
        ${n(bill.cashAmount) > 0 ? `<div class="payment-item"><div class="label">Cash</div><div class="val">${fmt(n(bill.cashAmount))}</div></div>` : ''}
        ${n(bill.upiAmount) > 0 ? `<div class="payment-item"><div class="label">UPI</div><div class="val">${fmt(n(bill.upiAmount))}</div></div>` : ''}
        ${n(bill.cardAmount) > 0 ? `<div class="payment-item"><div class="label">Card</div><div class="val">${fmt(n(bill.cardAmount))}</div></div>` : ''}
        ${n(bill.creditAmount) > 0 ? `<div class="payment-item"><div class="label">Credit</div><div class="val" style="color:#dc2626;">${fmt(n(bill.creditAmount))}</div></div>` : ''}
        ${n(bill.cashTendered) > 0 ? `<div class="payment-item"><div class="label">Cash Received</div><div class="val">${fmt(n(bill.cashTendered))}</div></div>` : ''}
        ${n(bill.changeAmount) > 0 ? `<div class="payment-item"><div class="label">Change</div><div class="val">${fmt(n(bill.changeAmount))}</div></div>` : ''}
        ${bill.upiReference ? `<div class="payment-item"><div class="label">UPI Reference</div><div class="val">${bill.upiReference}</div></div>` : ''}
      </div>
      ${
        qrCodeDataURL
          ? `
        <div class="qr-code-box">
          <img src="${qrCodeDataURL}" alt="UPI QR Code" />
          <div class="qr-label">Scan to Pay</div>
        </div>
        `
          : ''
      }
    </div>
  </div>

  ${buildReturnsHtml(bill)}

  <!-- Authorized -->
  <div class="auth-footer">
    <div class="auth-label">Authorized By</div>
    <div class="auth-name">${shopName}</div>
    <div class="auth-note">This is a digitally generated invoice and does not require a physical signature.</div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-text">${footer}</div>
    <div class="footer-sub">Exchange within 7 days with bill</div>
  </div>

  <!-- SarvaOne Branding -->
  <div class="sarvaone-footer">
    <div class="sarvaone-footer-label">Billing software powered by</div>
    <div class="sarvaone-footer-brand">SarvaOne</div>
    <div class="sarvaone-footer-tagline">Easy Billing &amp; Inventory for Local Businesses</div>
    <div class="sarvaone-footer-contact">&#128222;&nbsp;9886718288 &nbsp;|&nbsp; &#9993;&nbsp;support@sarvaone.com &nbsp;|&nbsp; sarvaone.com</div>
  </div>
</div>
</body></html>`
}

export class PdfReceiptService {
  async generatePdf(
    bill: Bill,
    shopInfo: Record<string, string>
  ): Promise<{ success: boolean; path: string }> {
    // Check if this is an exchange bill (reverse lookup)
    let exchangeFromBillNo: string | null = null
    try {
      const db = getSqlite()
      const src = db
        .prepare(
          `SELECT b.bill_no FROM bill_returns br
         JOIN bills b ON b.id = br.original_bill_id
         WHERE br.new_bill_id = ? AND br.type = 'exchange' LIMIT 1`
        )
        .get(bill.id) as { bill_no: string } | undefined
      exchangeFromBillNo = src?.bill_no || null
    } catch {
      /* ignore */
    }

    const html = await buildInvoiceHtml(bill, shopInfo, exchangeFromBillNo)
    const pdfDir = getPdfDir()
    const safeNo = (bill.billNo || bill.billNumber || 'unknown').replace(/[/\\:*?"<>|]/g, '_')
    const fileName = `Invoice_${safeNo}_${bill.date}.pdf`
    const filePath = join(pdfDir, fileName)

    const win = new BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: { offscreen: true }
    })

    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      await new Promise((resolve) => setTimeout(resolve, 500))

      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0.3, bottom: 0.3, left: 0.3, right: 0.3 },
        landscape: false
      })

      writeFileSync(filePath, pdfBuffer)
      log.info(`PDF receipt saved: ${filePath}`)
      return { success: true, path: filePath }
    } catch (err) {
      log.error('PDF receipt generation failed:', err)
      return { success: false, path: '' }
    } finally {
      win.destroy()
    }
  }

  isPdfPrinter(printerName: string): boolean {
    if (!printerName) return false
    const lower = printerName.toLowerCase()
    return (
      lower.includes('pdf') ||
      lower.includes('print to pdf') ||
      lower.includes('xps') ||
      lower.includes('onenote')
    )
  }

  getReceiptsDir(): string {
    return getPdfDir()
  }
}

export const pdfReceiptService = new PdfReceiptService()
