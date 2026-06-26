// ============================================================================
// KPT Billing - Thermal Printer Service (ESC/POS for TVS RP 3000 Lite)
// ============================================================================
import ThermalPrinter from 'node-thermal-printer'
import { BrowserWindow } from 'electron'
import { execSync } from 'child_process'
import { createRequire } from 'module'
import log from 'electron-log'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import QRCode from 'qrcode'
import type { Bill } from '../../shared/types'

const { printer: Printer, types: PrinterTypes } = ThermalPrinter
const requireNative = createRequire(import.meta.url)

export class ThermalPrinterService {
  private printerName: string = ''

  setPrinter(name: string): void {
    this.printerName = name
  }

  getConfiguredPrinterName(): string {
    return this.printerName
  }

  async getWindowsPrinterDetails(name: string): Promise<{
    name: string
    printerStatus: number | null
    workOffline: boolean | null
    portName: string | null
    driverName: string | null
    isDefault: boolean | null
  } | null> {
    if (!name.trim()) return null
    try {
      const escaped = name.replace(/'/g, "''")
      const output = execSync(
        `powershell -Command "$p = Get-Printer -Name '${escaped}' -ErrorAction SilentlyContinue; if ($p) { $p | Select-Object Name, PrinterStatus, WorkOffline, PortName, DriverName, Default | ConvertTo-Json -Compress }"`,
        { encoding: 'utf-8' }
      )
      const raw = output.trim()
      if (!raw) return null
      const parsed = JSON.parse(raw) as {
        Name?: string
        PrinterStatus?: number
        WorkOffline?: boolean
        PortName?: string
        DriverName?: string
        Default?: boolean
      }
      return {
        name: parsed.Name || name,
        printerStatus: typeof parsed.PrinterStatus === 'number' ? parsed.PrinterStatus : null,
        workOffline: typeof parsed.WorkOffline === 'boolean' ? parsed.WorkOffline : null,
        portName: parsed.PortName || null,
        driverName: parsed.DriverName || null,
        isDefault: typeof parsed.Default === 'boolean' ? parsed.Default : null
      }
    } catch (err) {
      log.error('Failed to read Windows printer details:', err)
      return null
    }
  }

  async getAvailablePrinters(): Promise<string[]> {
    // On Windows, list available printers
    try {
      const output = execSync(
        'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"',
        { encoding: 'utf-8' }
      )
      return output
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
    } catch (err) {
      log.error('Failed to list printers:', err)
      return []
    }
  }

  private createPrinter(): InstanceType<typeof Printer> {
    if (!this.printerName) {
      throw new Error('No printer selected. Please configure a printer in Settings.')
    }

    log.info(`Creating printer connection for: ${this.printerName}`)

    try {
      // node-thermal-printer requires a driver object for printer: interfaces.
      const printerDriver = requireNative('printer')
      const p = new Printer({
        type: PrinterTypes.EPSON,
        interface: `printer:${this.printerName}`,
        driver: printerDriver,
        width: 48, // 48 chars for 80mm paper
        options: {
          timeout: 5000
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        characterSet: 'PC437_USA' as any
      })
      return p
    } catch (err) {
      log.error(`Failed to create printer instance:`, err)
      throw err
    }
  }

  private formatLine(label: string, value: string, width = 48): string {
    const left = label.slice(0, Math.max(0, width - value.length))
    const spaces = Math.max(1, width - left.length - value.length)
    return `${left}${' '.repeat(spaces)}${value}`
  }

  private validatePrinterReady(): string {
    if (!this.printerName) {
      return 'No printer selected. Please select a printer in Settings > Printer Settings.'
    }
    return ''
  }

  private escapeHtml(text: string): string {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  private renderTemplate(template: string, tokens: Record<string, string>): string {
    let output = template
    for (const [key, value] of Object.entries(tokens)) {
      output = output.replaceAll(`{{${key}}}`, value)
    }
    return output
  }

  private sanitizeThermalContent(text: string): string {
    // No substitution needed — SarvaOne branding is applied explicitly in the footer
    return text
  }

  private getPaperWidthMm(shopInfo: Record<string, string>): number {
    const parsed = Number.parseInt(shopInfo.receiptPaperWidthMm || '', 10)
    // Safe bounds for thermal receipts.
    if (Number.isFinite(parsed) && parsed >= 48 && parsed <= 80) return parsed
    // Default to 58mm profile for maximum driver compatibility.
    return 58
  }

  private getThermalFooterLines(shopInfo: Record<string, string>): string[] {
    let footerText =
      shopInfo.receiptFooter !== undefined ? shopInfo.receiptFooter : 'Thank you! Visit again'
    footerText = footerText.replace(/\\n/g, '\n')

    const userLines = footerText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    return [...userLines, '--- Powered by SarvaOne ---']
  }

  private buildUpiUrl(bill: Bill, shopInfo: Record<string, string>): string | null {
    const upiVpa = (shopInfo.upiVpa || '').trim()
    const upiPayeeName = (shopInfo.upiPayeeName || '').trim()
    if (!upiVpa || !upiPayeeName || bill.grandTotal <= 0) return null

    const billRef = String(bill.billNo || bill.billNumber || bill.id || '')
    const upiNote = `Bill ${billRef || 'Payment'}`
    const params = new URLSearchParams({
      pa: upiVpa,
      pn: upiPayeeName,
      am: bill.grandTotal.toFixed(2),
      cu: 'INR',
      tn: upiNote,
      tr: billRef
    })
    return `upi://pay?${params.toString()}`
  }

  private async buildReceiptHtml(bill: Bill, shopInfo: Record<string, string>): Promise<string> {
    const paperWidthMm = this.getPaperWidthMm(shopInfo)
    const contentWidthMm = Math.max(44, paperWidthMm - 4)
    const items = (bill.items || [])
      .map((item) => {
        const name = this.escapeHtml(item.productName)
        const qty = item.quantity.toFixed(0)
        const rate = item.price.toFixed(2)
        const amt = (item.price * item.quantity).toFixed(2)
        return `<tr><td>${name}</td><td class="c-col">${qty}</td><td class="r">${rate}</td><td class="r">${amt}</td></tr>`
      })
      .join('')

    const totals: string[] = []
    totals.push(
      `<div class="row"><span>Subtotal</span><span>${bill.subtotal.toFixed(2)}</span></div>`
    )
    if (bill.discountAmount > 0) {
      totals.push(
        `<div class="row"><span>Discount</span><span>-${bill.discountAmount.toFixed(2)}</span></div>`
      )
    }
    if (bill.gstAmount > 0) {
      const halfGst = (bill.gstAmount / 2).toFixed(2)
      totals.push(`<div class="row"><span>CGST (2.5%)</span><span>${halfGst}</span></div>`)
      totals.push(`<div class="row"><span>SGST (2.5%)</span><span>${halfGst}</span></div>`)
    }
    if (bill.roundOff !== 0) {
      totals.push(
        `<div class="row"><span>Round Off</span><span>${bill.roundOff.toFixed(2)}</span></div>`
      )
    }

    const billRef = String(bill.billNo || bill.billNumber || bill.id || '')
    const upiNote = `Bill ${billRef || 'Payment'}`
    const isCash = bill.paymentMode.toLowerCase() === 'cash'
    let qrDataUrl = ''
    let qrLabelText = 'Scan to Pay'

    if (isCash) {
      try {
        qrDataUrl = await QRCode.toDataURL('https://www.instagram.com/krishnapriyatextiles/', {
          errorCorrectionLevel: 'M',
          width: 160
        })
        qrLabelText = 'Follow us on Instagram'
      } catch (err) {
        log.error('Failed to generate Instagram QR code', err)
      }
    } else {
      const upiUrl = this.buildUpiUrl(bill, shopInfo)
      if (upiUrl) {
        try {
          qrDataUrl = await QRCode.toDataURL(upiUrl, { errorCorrectionLevel: 'M', width: 160 })
        } catch (err) {
          log.error('Failed to generate UPI QR code', err)
        }
      }
    }

    const shopName = this.escapeHtml(shopInfo.shopName || 'KRISHNAPRIYA TEXTILES')
    const shopAddress = this.escapeHtml(shopInfo.shopAddress || '')
    const shopPhone = this.escapeHtml(shopInfo.shopPhone || '')
    const gstin = this.escapeHtml(shopInfo.gstin || '')
    const customerName = this.escapeHtml(bill.customerName || '')
    const customerPhone = this.escapeHtml(bill.customerPhone || '')
    const footerLines = this.getThermalFooterLines(shopInfo)
    const receiptFooter = this.escapeHtml(footerLines.join(' | '))
    const receiptFooterHtml = footerLines
      .map((line) => `<div class="c">${this.escapeHtml(line)}</div>`)
      .join('')
    const upiVpa = this.escapeHtml(shopInfo.upiVpa || '')
    const upiPayeeName = this.escapeHtml(shopInfo.upiPayeeName || '')
    const upiAmount = bill.grandTotal.toFixed(2)
    const upiNoteEscaped = this.escapeHtml(upiNote)
    const upiRefEscaped = this.escapeHtml(billRef)
    const qrHtml = qrDataUrl
      ? `<div class="qr"><img src="${qrDataUrl}" alt="QR Code" /><div class="qr-label">${qrLabelText}</div></div>`
      : ''
    const templateHtml = (shopInfo.receiptTemplateHtml || '').trim()

    const tokenMap: Record<string, string> = {
      shopName,
      shopAddress,
      shopPhone,
      gstin,
      billNo: this.escapeHtml(bill.billNo || ''),
      date: this.escapeHtml(bill.date || ''),
      time: this.escapeHtml(bill.time || ''),
      customerName,
      customerPhone,
      itemsRows: items,
      totalsRows: totals.join(''),
      grandTotal: bill.grandTotal.toFixed(0),
      paymentMode: this.escapeHtml(bill.paymentMode.toUpperCase()),
      totalItems: String(bill.totalItems),
      totalQty: String(bill.totalQty),
      receiptFooter,
      receiptFooterHtml,
      upiQrDataUrl: qrDataUrl,
      upiQrHtml: qrHtml,
      upiVpa,
      upiPayeeName,
      upiAmount,
      upiNote: upiNoteEscaped,
      upiRef: upiRefEscaped
    }

    if (templateHtml) {
      const rendered = this.sanitizeThermalContent(this.renderTemplate(templateHtml, tokenMap))
      if (/<html[\s>]/i.test(rendered)) {
        return rendered
      }

      return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${paperWidthMm}mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; }
    * { box-sizing: border-box; }
    body {
      width: ${contentWidthMm}mm;
      margin: 0;
      padding: 2mm;
      font-family: "Courier New", monospace;
      font-size: 12px;
      color: #000;
      font-weight: 600;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow-wrap: anywhere;
    }
    .r { text-align: right; }
    .qr { text-align: center; margin: 6px 0; }
    .qr img { width: 120px; height: 120px; }
    .qr-label { font-size: 11px; font-weight: 700; }
  </style>
</head>
<body>${rendered}</body>
</html>`
    }

    return this.sanitizeThermalContent(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${paperWidthMm}mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; }
    * { box-sizing: border-box; }
    body {
      width: ${contentWidthMm}mm;
      margin: 0;
      padding: 2mm;
      font-family: "Courier New", monospace;
      font-size: 12px;
      color: #000;
      font-weight: 600;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow-wrap: anywhere;
    }
    .c { text-align: center; }
    .hr { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .row span:first-child { flex: 1; }
    .row span:last-child { flex: 0 0 auto; }
    .t { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .t th, .t td { padding: 2px 0; vertical-align: top; }
    .t th:first-child, .t td:first-child { width: 40%; word-break: break-word; }
    .t th:nth-child(2), .t td:nth-child(2) { width: 12%; text-align: center; }
    .t th:nth-child(3), .t td:nth-child(3) { width: 24%; text-align: right; }
    .t th:nth-child(4), .t td:nth-child(4) { width: 24%; text-align: right; }
    .r { text-align: right; }
    .c-col { text-align: center; }
    .tot { font-size: 16px; font-weight: 800; }
    .qr { display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 8px 0; }
    .qr img { width: 140px; height: 140px; }
    .qr-label { font-size: 11px; font-weight: 700; text-align: center; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="c" style="font-size: 16px; font-weight: 800;">${shopName}</div>
  ${shopAddress ? `<div class="c">${shopAddress}</div>` : ''}
  ${shopPhone ? `<div class="c">Ph: ${shopPhone}</div>` : ''}
  ${gstin ? `<div class="c">GSTIN: ${gstin}</div>` : ''}
  <div class="hr"></div>
  <div>Bill No: ${this.escapeHtml(bill.billNo || '')}</div>
  <div>Date: ${this.escapeHtml(bill.date || '')}&nbsp;&nbsp;Time: ${this.escapeHtml(bill.time || '')}</div>
  ${customerName ? `<div>Customer: ${customerName}</div>` : ''}
  ${customerPhone ? `<div>Phone: ${customerPhone}</div>` : ''}
  <div class="hr"></div>
  <table class="t">
    <thead>
      <tr><th>Item</th><th class="c-col">Qty</th><th class="r">Rate</th><th class="r">Amt</th></tr>
    </thead>
    <tbody>${items}</tbody>
  </table>
  <div class="hr"></div>
  ${totals.join('')}
  <div class="hr"></div>
  <div class="row tot"><span>TOTAL</span><span>Rs.${bill.grandTotal.toFixed(2)}</span></div>
  <div class="hr"></div>
  <div>Payment: ${this.escapeHtml(bill.paymentMode.toUpperCase())}</div>
  <div>Items: ${bill.totalItems} | Qty: ${bill.totalQty}</div>
  <div class="hr"></div>
  ${qrHtml}
  ${receiptFooterHtml}
  <br /><br />
</body>
</html>`)
  }

  private buildTestPrintHtml(): string {
    const paperWidthMm = 58
    const contentWidthMm = paperWidthMm - 4
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${paperWidthMm}mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body {
      width: ${contentWidthMm}mm;
      margin: 0;
      padding: 2mm;
      font-family: "Courier New", monospace;
      font-size: 14px;
      color: #000;
      font-weight: 700;
      text-align: center;
    }
  </style>
</head>
<body>
  <div>KRISHNAPRIYA TEXTILES</div>
  <div>---</div>
  <div>Test Print</div>
  <div>${this.escapeHtml(new Date().toLocaleString('en-IN'))}</div>
  <div>Printer: ${this.escapeHtml(this.printerName || 'Not selected')}</div>
  <div>Mode: Electron Silent Print</div>
  <br /><br />
</body>
</html>`
  }

  private async printHtmlViaElectron(html: string): Promise<boolean> {
    if (!this.printerName) return false

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      const ok = await new Promise<boolean>((resolve) => {
        win.webContents.print(
          {
            silent: true,
            printBackground: true,
            deviceName: this.printerName,
            margins: { marginType: 'none' }
          },
          (success, failureReason) => {
            if (!success) {
              log.error(`Electron silent print failed: ${failureReason || 'Unknown reason'}`)
            }
            resolve(success)
          }
        )
      })

      if (ok) {
        log.info(`Receipt printed via Electron silent print to '${this.printerName}'`)
      }
      return ok
    } catch (err) {
      log.error('Electron silent print pipeline failed:', err)
      return false
    } finally {
      if (!win.isDestroyed()) {
        win.destroy()
      }
    }
  }

  private async buildPlainTextReceipt(
    bill: Bill,
    shopInfo: Record<string, string>,
    includeQr = false
  ): Promise<string> {
    const lines: string[] = []
    const center = (str: string): string => str.padStart((48 + str.length) / 2, ' ').padEnd(48, ' ')
    lines.push(shopInfo.shopName || 'KRISHNAPRIYA TEXTILES')
    lines.push(shopInfo.shopAddress || '')
    lines.push(`Ph: ${shopInfo.shopPhone || ''}`)
    if (shopInfo.gstin) lines.push(`GSTIN: ${shopInfo.gstin}`)
    lines.push('-'.repeat(48))
    lines.push(`Bill No: ${bill.billNo}`)
    lines.push(`Date: ${bill.date}  Time: ${bill.time}`)
    if (bill.customerName) lines.push(`Customer: ${bill.customerName}`)
    if (bill.customerPhone) lines.push(`Phone: ${bill.customerPhone}`)
    lines.push('-'.repeat(48))
    lines.push('Item                     Qty    Rate      Amt')
    lines.push('-'.repeat(48))

    for (const item of bill.items || []) {
      const name =
        item.productName.length > 20 ? `${item.productName.slice(0, 20)}..` : item.productName
      const qty = item.quantity.toString().padStart(3, ' ')
      const rate = item.price.toFixed(2).padStart(7, ' ')
      const amt = (item.price * item.quantity).toFixed(2).padStart(8, ' ')
      lines.push(`${name.padEnd(22, ' ')} ${qty} ${rate} ${amt}`)
      if (item.discount > 0) {
        const disc =
          item.discountType === 'percent' || item.discountType === 'percentage'
            ? `${item.discount}%`
            : `Rs.${item.discount.toFixed(0)}`
        lines.push(`  Disc: ${disc}`)
      }
    }

    lines.push('-'.repeat(48))
    lines.push(this.formatLine('Subtotal:', bill.subtotal.toFixed(2)))
    if (bill.discountAmount > 0) {
      lines.push(this.formatLine('Discount:', `-${bill.discountAmount.toFixed(2)}`))
    }
    if (bill.gstAmount > 0) {
      const halfGst = (bill.gstAmount / 2).toFixed(2)
      lines.push(this.formatLine('CGST (2.5%):', halfGst))
      lines.push(this.formatLine('SGST (2.5%):', halfGst))
    }
    if (bill.roundOff !== 0) {
      lines.push(this.formatLine('Round Off:', bill.roundOff.toFixed(2)))
    }
    lines.push('-'.repeat(48))
    lines.push(this.formatLine('TOTAL:', `Rs.${bill.grandTotal.toFixed(0)}`))
    lines.push('-'.repeat(48))
    lines.push(`Payment: ${bill.paymentMode.toUpperCase()}`)
    if (bill.upiReference) lines.push(`UPI Ref: ${bill.upiReference}`)
    lines.push(`Items: ${bill.totalItems} | Qty: ${bill.totalQty}`)
    lines.push('-'.repeat(48))
    this.getThermalFooterLines(shopInfo).forEach((line) => lines.push(center(line)))

    const isCash = bill.paymentMode.toLowerCase() === 'cash'
    if (includeQr) {
      if (isCash) {
        return new Promise((resolve) => {
          QRCode.toString(
            'https://www.instagram.com/krishnapriyatextiles/',
            { type: 'terminal', small: true },
            (err, url) => {
              if (err) {
                log.error('Failed to generate Instagram QR code string', err)
              } else {
                lines.push('')
                lines.push(center('Follow us on Instagram'))
                lines.push(url)
              }
              resolve(lines.join('\n'))
            }
          )
        })
      } else {
        const upiUrl = this.buildUpiUrl(bill, shopInfo)
        if (upiUrl) {
          return new Promise((resolve) => {
            QRCode.toString(upiUrl, { type: 'terminal', small: true }, (err, url) => {
              if (err) {
                log.error('Failed to generate UPI QR code string', err)
              } else {
                lines.push('')
                lines.push(center('Scan to Pay'))
                lines.push(url)
              }
              resolve(lines.join('\n'))
            })
          })
        }
      }
    }

    return lines.join('\n')
  }

  private printViaWindowsSpooler(text: string): boolean {
    if (!this.printerName) return false
    const filePath = join(tmpdir(), `kpt-receipt-${Date.now()}.txt`)
    try {
      writeFileSync(filePath, text, 'utf8')
      const escapedPath = filePath.replace(/'/g, "''")
      const escapedPrinter = this.printerName.replace(/'/g, "''")
      execSync(
        `powershell -NoProfile -Command "Get-Content -Path '${escapedPath}' | Out-Printer -Name '${escapedPrinter}'"`,
        { stdio: 'pipe' }
      )
      log.info(`Receipt spooled via Windows driver to '${this.printerName}'`)
      return true
    } catch (err) {
      log.error('Windows spooler fallback failed:', err)
      return false
    } finally {
      try {
        unlinkSync(filePath)
      } catch {
        /* ignore */
      }
    }
  }

  private async printReceiptSimpleEscPos(
    bill: Bill,
    shopInfo: Record<string, string>
  ): Promise<boolean> {
    try {
      log.info(`Attempting simple ESC/POS print for bill ${bill.billNo}`)
      const p = this.createPrinter()
      await p.isPrinterConnected()
      const sep = '-'.repeat(48)

      p.alignCenter()
      p.bold(true)
      p.println(shopInfo.shopName || 'KRISHNAPRIYA TEXTILES')
      p.bold(false)
      if (shopInfo.shopAddress) p.println(shopInfo.shopAddress)
      if (shopInfo.shopPhone) p.println(`Ph: ${shopInfo.shopPhone}`)
      if (shopInfo.gstin) p.println(`GSTIN: ${shopInfo.gstin}`)

      p.alignLeft()
      p.println(sep)
      p.println(`Bill No: ${bill.billNo}`)
      p.println(`Date: ${bill.date}  Time: ${bill.time}`)
      if (bill.customerName) p.println(`Customer: ${bill.customerName}`)
      if (bill.customerPhone) p.println(`Phone: ${bill.customerPhone}`)
      p.println(sep)
      p.println('Item                     Qty    Rate      Amt')
      p.println(sep)

      for (const item of bill.items || []) {
        const name =
          item.productName.length > 20 ? `${item.productName.slice(0, 20)}..` : item.productName
        const qty = item.quantity.toString().padStart(3, ' ')
        const rate = item.price.toFixed(2).padStart(7, ' ')
        const amt = (item.price * item.quantity).toFixed(2).padStart(8, ' ')
        p.println(`${name.padEnd(22, ' ')} ${qty} ${rate} ${amt}`)
      }

      p.println(sep)
      p.println(this.formatLine('Subtotal:', bill.subtotal.toFixed(2)))
      if (bill.discountAmount > 0) {
        p.println(this.formatLine('Discount:', `-${bill.discountAmount.toFixed(2)}`))
      }
      if (bill.gstAmount > 0) {
        const halfGst = (bill.gstAmount / 2).toFixed(2)
        p.println(this.formatLine('CGST (2.5%):', halfGst))
        p.println(this.formatLine('SGST (2.5%):', halfGst))
      }
      p.bold(true)
      p.println(this.formatLine('TOTAL:', `Rs.${bill.grandTotal.toFixed(2)}`))
      p.bold(false)
      p.println(sep)
      p.println(`Payment: ${bill.paymentMode.toUpperCase()}`)
      p.println(`Items: ${bill.totalItems} | Qty: ${bill.totalQty}`)
      p.println(sep)

      p.alignCenter()
      for (const line of this.getThermalFooterLines(shopInfo)) {
        p.println(line)
      }

      // Print QR Code
      const isCash = bill.paymentMode.toLowerCase() === 'cash'
      let qrCodePath: string | null = null
      let qrLabelText = 'Scan to Pay'

      if (isCash) {
        qrCodePath = await this.getQrCodePath('https://www.instagram.com/krishnapriyatextiles/')
        qrLabelText = 'Follow us on Instagram'
      } else {
        const upiUrl = this.buildUpiUrl(bill, shopInfo)
        qrCodePath = upiUrl ? await this.getQrCodePath(upiUrl) : null
      }

      if (qrCodePath) {
        try {
          p.alignCenter()
          p.println(qrLabelText)
          await p.printImage(qrCodePath)
          p.newLine()
        } catch (qrErr) {
          log.error('Failed to print QR code image:', qrErr)
        }
      }

      p.newLine()
      p.newLine()

      p.cut()

      const result = await p.execute()
      log.info(`Receipt printed in simple ESC/POS mode for bill ${bill.billNo}, result:`, result)
      return true
    } catch (err) {
      log.error('Simple ESC/POS print failed:', err instanceof Error ? err.message : err)
      return false
    }
  }

  private async getQrCodePath(upiUrl: string): Promise<string | null> {
    if (!upiUrl) {
      return null
    }
    const tempDir = join(tmpdir(), 'kpt-billing')
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true })
    }
    const filePath = join(tempDir, `qr-${Date.now()}.png`)

    try {
      await QRCode.toFile(filePath, upiUrl, {
        errorCorrectionLevel: 'M',
        width: 200
      })
      return filePath
    } catch (err) {
      log.error('Failed to generate QR code file', err)
      return null
    }
  }

  private async testPrintSimpleEscPos(): Promise<boolean> {
    try {
      const p = this.createPrinter()
      await p.isPrinterConnected()
      p.alignCenter()
      p.bold(true)
      p.println('KRISHNAPRIYA TEXTILES')
      p.bold(false)
      p.println('--- Test Print ---')
      p.println(new Date().toLocaleString('en-IN'))
      p.println(`Printer: ${this.printerName || 'Not selected'}`)
      p.println('Mode: Simple ESC/POS')
      p.newLine()
      p.newLine()
      await p.execute()
      log.info('Simple ESC/POS test print succeeded')
      return true
    } catch (err) {
      log.error('Simple ESC/POS test print failed:', err)
      return false
    }
  }

  async printReceipt(bill: Bill, shopInfo: Record<string, string>): Promise<boolean> {
    const printerError = this.validatePrinterReady()
    if (printerError) {
      log.error(`Print receipt failed: ${printerError}`)
      return false
    }

    // Primary path on Windows: Electron native silent print with receipt HTML.
    const receiptHtml = await this.buildReceiptHtml(bill, shopInfo)
    const electronOk = await this.printHtmlViaElectron(receiptHtml)
    if (electronOk) return true

    let qrCodePath: string | null = null
    const isCash = bill.paymentMode.toLowerCase() === 'cash'
    let qrLabelText = 'Scan to Pay'

    try {
      if (isCash) {
        qrCodePath = await this.getQrCodePath('https://www.instagram.com/krishnapriyatextiles/')
        qrLabelText = 'Follow us on Instagram'
      } else {
        const upiUrl = this.buildUpiUrl(bill, shopInfo)
        qrCodePath = upiUrl ? await this.getQrCodePath(upiUrl) : null
      }
    } catch (err) {
      log.error('Failed to generate QR code file', err)
    }

    try {
      log.info(`Attempting rich ESC/POS print for bill ${bill.billNo}`)
      const p = this.createPrinter()
      await p.isPrinterConnected()

      // Header
      p.alignCenter()
      p.bold(true)
      p.setTextDoubleHeight()
      p.println(shopInfo.shopName || 'KRISHNAPRIYA TEXTILES')
      p.setTextNormal()
      p.bold(false)
      p.println(shopInfo.shopAddress || '')
      p.println(`Ph: ${shopInfo.shopPhone || ''}`)
      if (shopInfo.gstin) {
        p.println(`GSTIN: ${shopInfo.gstin}`)
      }

      p.drawLine()

      // Bill info
      p.alignLeft()
      p.println(`Bill No: ${bill.billNo}`)
      p.println(`Date: ${bill.date}  Time: ${bill.time}`)
      if (bill.customerName) {
        p.println(`Customer: ${bill.customerName}`)
        if (bill.customerPhone) {
          p.println(`Phone: ${bill.customerPhone}`)
        }
      }

      p.drawLine()

      // Column headers
      p.tableCustom([
        { text: 'Item', align: 'LEFT', width: 0.4 },
        { text: 'Qty', align: 'CENTER', width: 0.1 },
        { text: 'Rate', align: 'RIGHT', width: 0.25 },
        { text: 'Amt', align: 'RIGHT', width: 0.25 }
      ])
      p.drawLine()

      // Items
      if (bill.items) {
        for (const item of bill.items) {
          const returnedQty = item.returnedQty || 0
          const isFullyReturned = returnedQty >= item.quantity
          const name =
            item.productName.length > 18
              ? item.productName.substring(0, 18) + '..'
              : item.productName
          p.tableCustom([
            { text: name, align: 'LEFT', width: 0.4 },
            { text: item.quantity.toString(), align: 'CENTER', width: 0.1 },
            { text: item.price.toFixed(2), align: 'RIGHT', width: 0.25 },
            {
              text: isFullyReturned ? '0' : (item.price * item.quantity).toFixed(2),
              align: 'RIGHT',
              width: 0.25
            }
          ])
          // Show discount if any
          if (item.discount > 0) {
            const discText =
              item.discountType === 'percent' || item.discountType === 'percentage'
                ? `  Disc: ${item.discount}%`
                : `  Disc: -${item.discount.toFixed(0)}`
            p.println(discText)
          }
          // Show return info
          if (returnedQty > 0 && returnedQty < item.quantity) {
            p.println(`  ** ${returnedQty} Returned **`)
          } else if (isFullyReturned) {
            p.println('  ** RETURNED **')
          }
        }
      }

      p.drawLine()

      // Totals
      p.alignLeft()
      p.leftRight('Subtotal:', `${bill.subtotal.toFixed(2)}`)
      if (bill.discountAmount > 0) {
        p.leftRight('Discount:', `-${bill.discountAmount.toFixed(2)}`)
      }
      if (bill.gstAmount > 0) {
        const halfGst = (bill.gstAmount / 2).toFixed(2)
        p.leftRight('CGST (2.5%):', `${halfGst}`)
        p.leftRight('SGST (2.5%):', `${halfGst}`)
      }
      if (bill.roundOff !== 0) {
        p.leftRight('Round Off:', `${bill.roundOff.toFixed(2)}`)
      }

      p.drawLine()
      p.bold(true)
      p.setTextDoubleHeight()
      p.leftRight('TOTAL:', `Rs.${bill.grandTotal.toFixed(2)}`)
      p.setTextNormal()
      p.bold(false)
      p.drawLine()

      // Payment info
      const mode = bill.paymentMode.toUpperCase()
      p.println(`Payment: ${mode}`)
      if (bill.cashTendered > 0 && bill.changeAmount > 0) {
        p.leftRight('Received:', `${bill.cashTendered.toFixed(0)}`)
        p.leftRight('Change:', `${bill.changeAmount.toFixed(0)}`)
      }
      if (bill.upiReference) {
        p.println(`UPI Ref: ${bill.upiReference}`)
      }

      p.println(`Items: ${bill.totalItems} | Qty: ${bill.totalQty}`)

      // Return/Exchange history if any
      const returns = bill.returns
      if (returns && returns.length > 0) {
        p.drawLine()
        p.bold(true)
        p.println('RETURNS / EXCHANGES')
        p.bold(false)
        for (const r of returns) {
          const typeLabel = r.type === 'exchange' ? 'Exchange' : 'Return'
          p.println(`${typeLabel}: ${r.itemsSummary}`)
          p.leftRight('  Refund:', `-Rs.${r.returnAmount.toFixed(0)} (${r.refundMode})`)
        }
      }

      p.drawLine()

      // Footer
      p.alignCenter()
      for (const line of this.getThermalFooterLines(shopInfo)) {
        p.println(line)
      }
      if (qrCodePath) {
        try {
          p.alignCenter()
          p.println(qrLabelText)
          await p.printImage(qrCodePath)
        } catch (qrErr) {
          log.error('Failed to print QR code image:', qrErr)
        }
      }

      p.newLine()
      p.newLine()

      p.cut()

      const result = await p.execute()
      log.info(`Receipt printed in rich ESC/POS mode for bill ${bill.billNo}, result:`, result)
      return true
    } catch (err) {
      log.error('Rich ESC/POS print failed:', err instanceof Error ? err.message : err)
      const simpleOk = await this.printReceiptSimpleEscPos(bill, shopInfo)
      if (simpleOk) return true

      log.error('Simple ESC/POS failed, trying Windows spooler fallback')
      const plain = await this.buildPlainTextReceipt(bill, shopInfo, true)
      return this.printViaWindowsSpooler(plain)
    } finally {
      if (qrCodePath) {
        try {
          unlinkSync(qrCodePath)
        } catch (e) {
          log.warn('Failed to delete temp QR code', e)
        }
      }
    }
  }

  async testPrint(): Promise<boolean> {
    const printerError = this.validatePrinterReady()
    if (printerError) {
      log.error(`Test print failed: ${printerError}`)
      return false
    }

    // Primary path on Windows: Electron native silent print with test HTML.
    const electronOk = await this.printHtmlViaElectron(this.buildTestPrintHtml())
    if (electronOk) return true

    try {
      log.info(`Attempting rich ESC/POS test print for printer: ${this.printerName}`)
      const p = this.createPrinter()
      await p.isPrinterConnected()
      p.alignCenter()
      p.bold(true)
      p.setTextDoubleHeight()
      p.println('KRISHNAPRIYA TEXTILES')
      p.setTextNormal()
      p.bold(false)
      p.println('--- Test Print ---')
      p.println(new Date().toLocaleString('en-IN'))
      p.println(`Printer: ${this.printerName || 'Not selected'}`)
      p.println('Mode: Rich ESC/POS')
      p.newLine()
      p.cut()
      await p.execute()
      log.info('Rich ESC/POS test print succeeded')
      return true
    } catch (err) {
      log.error('Rich ESC/POS test print failed:', err instanceof Error ? err.message : err)
      const simpleOk = await this.testPrintSimpleEscPos()
      if (simpleOk) return true

      log.error('Simple ESC/POS test print failed, trying Windows spooler fallback')
      const testText = [
        'KRISHNAPRIYA TEXTILES',
        '--- Test Print ---',
        new Date().toLocaleString('en-IN'),
        `Printer: ${this.printerName || 'Not selected'}`,
        'Mode: Windows Spooler Fallback',
        '',
        '',
        ''
      ].join('\r\n')
      return this.printViaWindowsSpooler(testText)
    }
  }

  private async buildPaymentDetailsHtml(
    paymentMethod: {
      id: string
      type: 'bank' | 'upi' | 'scanner'
      name: string
      details?: {
        bankName?: string
        accountNo?: string
        ifscCode?: string
        branch?: string
        upiVpa?: string
        payeeName?: string
        scannerType?: string
        accountName?: string
      }
    },
    shopInfo: Record<string, string>
  ): Promise<{ html: string; upiUrl: string }> {
    const paperWidthMm = this.getPaperWidthMm(shopInfo)
    const contentWidthMm = Math.max(44, paperWidthMm - 4)
    const shopName = this.escapeHtml(shopInfo.shopName || 'KRISHNAPRIYA TEXTILES')
    const shopAddress = this.escapeHtml(shopInfo.shopAddress || '')
    const shopPhone = this.escapeHtml(shopInfo.shopPhone || '')

    let detailsHtml = ''
    let upiUrl = ''
    let qrDataUrl = ''

    if (paymentMethod.type === 'bank') {
      const bankName = this.escapeHtml(paymentMethod.details?.bankName || '')
      const accountNo = this.escapeHtml(paymentMethod.details?.accountNo || '')
      const ifscCode = this.escapeHtml(paymentMethod.details?.ifscCode || '')
      const branch = this.escapeHtml(paymentMethod.details?.branch || '')
      const accountName = this.escapeHtml(paymentMethod.details?.accountName || '')
      detailsHtml = `
        ${accountName ? `<div style="margin-top: 4px;"><strong>Account Name:</strong> ${accountName}</div>` : ''}
        <div style="margin-top: 4px;"><strong>Bank Name:</strong> ${bankName}</div>
        <div style="margin-top: 4px;"><strong>A/C No:</strong> ${accountNo}</div>
        <div style="margin-top: 4px;"><strong>IFSC:</strong> ${ifscCode}</div>
        ${branch ? `<div style="margin-top: 4px;"><strong>Branch:</strong> ${branch}</div>` : ''}
      `
    } else if (paymentMethod.type === 'upi' || paymentMethod.type === 'scanner') {
      const upiVpa = (paymentMethod.details?.upiVpa || '').trim()
      const payeeName = (paymentMethod.details?.payeeName || '').trim()
      detailsHtml = `
        <div style="margin-top: 4px;"><strong>Payee Name:</strong> ${this.escapeHtml(payeeName)}</div>
        <div style="margin-top: 4px;"><strong>UPI VPA:</strong> ${this.escapeHtml(upiVpa)}</div>
      `
      if (upiVpa) {
        const params = new URLSearchParams({
          pa: upiVpa,
          pn: payeeName,
          cu: 'INR'
        })
        upiUrl = `upi://pay?${params.toString()}`
        try {
          qrDataUrl = await QRCode.toDataURL(upiUrl, { errorCorrectionLevel: 'M', width: 160 })
        } catch (err) {
          log.error('Failed to generate payment QR code', err)
        }
      }
    }

    const qrHtml = qrDataUrl
      ? `<div class="qr"><img src="${qrDataUrl}" alt="QR Code" /><div class="qr-label">Scan to Pay</div></div>`
      : ''

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${paperWidthMm}mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; }
    * { box-sizing: border-box; }
    body {
      width: ${contentWidthMm}mm;
      margin: 0;
      padding: 2mm;
      font-family: "Courier New", monospace;
      font-size: 12px;
      color: #000;
      font-weight: 600;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow-wrap: anywhere;
    }
    .c { text-align: center; }
    .hr { border-top: 1px dashed #000; margin: 6px 0; }
    .qr { display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 8px 0; }
    .qr img { width: 120px; height: 120px; }
    .qr-label { font-size: 11px; font-weight: 700; text-align: center; margin-top: 4px; }
    .title { font-size: 14px; font-weight: 800; text-align: center; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="c" style="font-size: 15px; font-weight: 800;">${shopName}</div>
  ${shopAddress ? `<div class="c">${shopAddress}</div>` : ''}
  ${shopPhone ? `<div class="c">Ph: ${shopPhone}</div>` : ''}
  <div class="hr"></div>
  <div class="title">PAYMENT DETAILS</div>
  <div class="hr"></div>
  ${detailsHtml}
  ${qrHtml}
  <div class="hr"></div>
  <div class="c" style="font-size: 9px; color: #555;">Printed on ${new Date().toLocaleString('en-IN')}</div>
  <br /><br />
</body>
</html>`

    return { html, upiUrl }
  }

  async generatePaymentDetailsPdfBuffer(
    paymentMethod: {
      id: string
      type: 'bank' | 'upi' | 'scanner'
      name: string
      details?: {
        bankName?: string
        accountNo?: string
        ifscCode?: string
        branch?: string
        upiVpa?: string
        payeeName?: string
        scannerType?: string
        accountName?: string
      }
    },
    shopInfo: Record<string, string>
  ): Promise<Buffer | null> {
    try {
      const { html } = await this.buildPaymentDetailsHtml(paymentMethod, shopInfo)
      const paperWidthMm = this.getPaperWidthMm(shopInfo)

      const win = new BrowserWindow({
        width: 300,
        height: 600,
        show: false,
        webPreferences: { offscreen: true }
      })

      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      await new Promise((resolve) => setTimeout(resolve, 500))

      const widthMicrons = paperWidthMm * 1000
      const heightMicrons = 160000 // 160mm is plenty for a simple payment slip

      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: { width: widthMicrons, height: heightMicrons },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        landscape: false
      })

      win.destroy()
      return pdfBuffer
    } catch (err) {
      log.error('Failed to generate payment details PDF buffer:', err)
      return null
    }
  }

  async printPaymentDetails(
    paymentMethod: {
      id: string
      type: 'bank' | 'upi' | 'scanner'
      name: string
      details?: {
        bankName?: string
        accountNo?: string
        ifscCode?: string
        branch?: string
        upiVpa?: string
        payeeName?: string
        scannerType?: string
        accountName?: string
      }
    },
    shopInfo: Record<string, string>
  ): Promise<boolean> {
    const printerError = this.validatePrinterReady()
    if (printerError) {
      log.error(`Print payment details failed: ${printerError}`)
      return false
    }

    try {
      const { html, upiUrl } = await this.buildPaymentDetailsHtml(paymentMethod, shopInfo)

      const electronOk = await this.printHtmlViaElectron(html)
      if (electronOk) return true

      // Fallback simple ESC/POS print
      log.info(`Attempting simple ESC/POS print for payment details`)
      const p = this.createPrinter()
      await p.isPrinterConnected()
      const sep = '-'.repeat(48)

      p.alignCenter()
      p.bold(true)
      p.println(shopInfo.shopName || 'KRISHNAPRIYA TEXTILES')
      p.bold(false)
      if (shopInfo.shopAddress) p.println(shopInfo.shopAddress)
      if (shopInfo.shopPhone) p.println(`Ph: ${shopInfo.shopPhone}`)

      p.alignLeft()
      p.println(sep)
      p.println('PAYMENT DETAILS')
      p.println(sep)

      if (paymentMethod.type === 'bank') {
        if (paymentMethod.details?.accountName) {
          p.println(`Account Name: ${paymentMethod.details.accountName}`)
        }
        p.println(`Bank Name: ${paymentMethod.details?.bankName || ''}`)
        p.println(`A/C No: ${paymentMethod.details?.accountNo || ''}`)
        p.println(`IFSC: ${paymentMethod.details?.ifscCode || ''}`)
        if (paymentMethod.details?.branch) {
          p.println(`Branch: ${paymentMethod.details?.branch}`)
        }
      } else if (paymentMethod.type === 'upi' || paymentMethod.type === 'scanner') {
        p.println(`Payee Name: ${paymentMethod.details?.payeeName || ''}`)
        p.println(`UPI VPA: ${paymentMethod.details?.upiVpa || ''}`)

        if (upiUrl) {
          const qrCodePath = await this.getQrCodePath(upiUrl)
          if (qrCodePath) {
            try {
              p.alignCenter()
              p.println('Scan to Pay')
              await p.printImage(qrCodePath)
              p.newLine()
            } catch (qrErr) {
              log.error('Failed to print fallback QR code image:', qrErr)
            }
          }
        }
      }

      p.println(sep)
      p.alignCenter()
      p.println(`Printed on ${new Date().toLocaleString('en-IN')}`)
      p.newLine()
      p.newLine()
      p.cut()

      await p.execute()
      return true
    } catch (err) {
      log.error('Print payment details failed:', err)
      return false
    }
  }

  async getReceiptImageBuffer(
    bill: Bill,
    shopInfo: Record<string, string>
  ): Promise<string | null> {
    const html = await this.buildReceiptHtml(bill, shopInfo)
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      const image = await win.webContents.capturePage()
      return image.toPNG().toString('base64')
    } catch (err) {
      log.error('Failed to generate receipt image buffer:', err)
      return null
    } finally {
      if (!win.isDestroyed()) {
        win.destroy()
      }
    }
  }
}

export const thermalPrinterService = new ThermalPrinterService()
