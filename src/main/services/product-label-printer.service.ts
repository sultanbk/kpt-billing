import { BrowserWindow, app } from 'electron'
import { execSync } from 'child_process'
import log from 'electron-log'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Product, ProductLabelPrintResult, ProductLabelSize } from '../../shared/types'

type BwipJsModule = {
  toBuffer: (options: Record<string, unknown>) => Promise<Buffer>
}

type NativePrinterModule = {
  printDirect: (opts: {
    data: string | Buffer
    printer: string
    type: 'RAW'
    success?: (jobId: number) => void
    error?: (err: Error) => void
  }) => void
}

interface ProductLabelPrintOptions {
  printerName: string
  quantity: number
  labelSize: ProductLabelSize
  shopName?: string
  barcodeShowName?: boolean
  barcodeShowShopName?: boolean
  barcodeShowSaleName?: boolean
  barcodeSaleNameText?: string
  barcodeShowMrp?: boolean
  barcodeShowSellingPrice?: boolean
  barcodeStrikeMrp?: boolean
  barcodeShowDiscount?: boolean
  barcodeNudgeX?: string
  barcodeNudgeY?: string
  barcodeWidth?: string
  barcodeHeight?: string
  barcodeShopFontSize?: string
  barcodeNameFontSize?: string
  barcodePriceFontSize?: string
  barcodeCodeFontSize?: string
  barcodeShopAlign?: string
  barcodeNameAlign?: string
  barcodePriceAlign?: string
  barcodeCodeAlign?: string
  barcodePaddingX?: string
  barcodePaddingY?: string
  barcodeGap?: string
  barcodeShowCode?: boolean
}

const LABEL_PRESETS: Record<ProductLabelSize, { widthMm: number; heightMm: number }> = {
  '46x25': { widthMm: 46, heightMm: 25 },
  '60x40': { widthMm: 60, heightMm: 40 }
}

function getLabelDir(): string {
  const userDataPath = app.getPath('userData')
  const labelDir = join(userDataPath, 'labels')
  if (!existsSync(labelDir)) {
    mkdirSync(labelDir, { recursive: true })
  }
  return labelDir
}

export class ProductLabelPrinterService {
  private bwipjs: BwipJsModule | null | undefined
  private nativePrinter: NativePrinterModule | null | undefined

  private async importOptionalModule(moduleName: string): Promise<unknown> {
    const importer = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>
    return importer(moduleName)
  }

  private async getBwipJs(): Promise<BwipJsModule> {
    if (this.bwipjs) return this.bwipjs

    try {
      const imported = (await this.importOptionalModule('bwip-js')) as
        | BwipJsModule
        | { default: BwipJsModule }
      this.bwipjs = 'default' in imported ? imported.default : imported
      return this.bwipjs
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to load barcode engine: ${message}`)
    }
  }

  private async getNativePrinter(): Promise<NativePrinterModule | null> {
    if (this.nativePrinter !== undefined) {
      return this.nativePrinter
    }

    try {
      const imported = (await this.importOptionalModule('printer')) as
        | NativePrinterModule
        | { default: NativePrinterModule }
      this.nativePrinter = 'default' in imported ? imported.default : imported
      return this.nativePrinter
    } catch (err) {
      this.nativePrinter = null
      const message = err instanceof Error ? err.message : String(err)
      if (/not a valid Win32 application/i.test(message)) {
        log.warn('Native printer module ABI mismatch; RAW label fallback disabled')
      } else {
        log.warn(`Native printer module unavailable; RAW label fallback disabled: ${message}`)
      }
      return null
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private getWindowsJobCountSinceReset(printerName: string): number | null {
    try {
      const escaped = printerName.replace(/'/g, "''")
      const output = execSync(
        `powershell -Command "$p = Get-Printer -Name '${escaped}' -ErrorAction SilentlyContinue; if ($p) { $p.JobCountSinceLastReset }"`,
        { encoding: 'utf-8' }
      )
      const value = output.trim()
      const parsed = Number.parseInt(value, 10)
      return Number.isFinite(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  private getWindowsQueueJobIds(printerName: string): Set<number> {
    try {
      const escaped = printerName.replace(/'/g, "''")
      const output = execSync(
        `powershell -Command "Get-PrintJob -PrinterName '${escaped}' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ID"`,
        { encoding: 'utf-8' }
      )
      return new Set(
        output
          .split(/\r?\n/)
          .map((line) => Number.parseInt(line.trim(), 10))
          .filter((n) => Number.isFinite(n))
      )
    } catch {
      return new Set<number>()
    }
  }

  private async verifyWindowsSpoolerObserved(printerName: string): Promise<boolean> {
    await this.sleep(1400)

    const afterCount = this.getWindowsJobCountSinceReset(printerName)
    const afterJobIds = this.getWindowsQueueJobIds(printerName)

    // Primary evidence: cumulative job counter increments.
    if (this._beforeJobCount !== null && afterCount !== null && afterCount > this._beforeJobCount) {
      return true
    }

    // Secondary evidence: queue has at least one new job id.
    for (const id of afterJobIds) {
      if (!this._beforeJobIds.has(id)) {
        return true
      }
    }

    return false
  }

  private isLp46DualColumn(printerName: string, labelSize: ProductLabelSize): boolean {
    return labelSize === '46x25' && /(lp46|snbc|tvse)/i.test(printerName)
  }

  private _beforeJobCount: number | null = null
  private _beforeJobIds: Set<number> = new Set<number>()

  private shouldPreferRawLabel(printerName: string): boolean {
    return /(lp46|label|snbc|tvse)/i.test(printerName)
  }

  private sanitizeRawText(text: string, maxLen: number): string {
    return text
      .replace(/[^\x20-\x7E]/g, ' ')
      .replaceAll('"', "'")
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLen)
  }

  private buildTsplLabelCommand(
    product: Product,
    barcodeValue: string,
    options: ProductLabelPrintOptions
  ): string {
    const preset = LABEL_PRESETS[options.labelSize]

    const name = this.sanitizeRawText(product.shortName?.trim() || product.name, 30)
    const barcode = this.sanitizeRawText(barcodeValue, 40)

    const nudgeX = Number.parseFloat(options.barcodeNudgeX || '0.0') || 0
    const nudgeY = Number.parseFloat(options.barcodeNudgeY || '0.0') || 0
    const nudgeXDots = Math.round(nudgeX * 8)
    const nudgeYDots = Math.round(nudgeY * 8)

    const defaultHeightMm = options.labelSize === '46x25' ? 5.5 : 13.0
    const rawHeightMm = Number.parseFloat(options.barcodeHeight || '') || defaultHeightMm
    const barcodeHeightDots = Math.round(rawHeightMm * 8)

    const lines: string[] = [
      `SIZE ${preset.widthMm} mm,${preset.heightMm} mm`,
      'GAP 2 mm,0 mm',
      'DIRECTION 1,0',
      'REFERENCE 0,0',
      'CLS'
    ]

    let currentY = 8

    let headerText = ''
    if (options.barcodeShowSaleName === true && options.barcodeSaleNameText) {
      headerText = options.barcodeSaleNameText
    } else if (options.barcodeShowShopName === true && options.shopName) {
      headerText = options.shopName
    }

    if (headerText) {
      const header = this.sanitizeRawText(headerText, 30)
      lines.push(`TEXT ${8 + nudgeXDots},${currentY + nudgeYDots},"0",0,1,1,"${header}"`)
      currentY += 28
    }

    if (options.barcodeShowName !== false) {
      lines.push(`TEXT ${8 + nudgeXDots},${currentY + nudgeYDots},"0",0,1,1,"${name}"`)
      currentY += 28
    }

    const showMrp = options.barcodeShowMrp && product.mrp != null && product.mrp > 0
    const showSellingPrice =
      options.barcodeShowSellingPrice && product.sellingPrice != null && product.sellingPrice > 0

    if (showMrp || showSellingPrice) {
      let priceStr = ''
      if (showMrp) {
        priceStr += `MRP:${product.mrp?.toFixed(2)} `
      }
      if (showSellingPrice) {
        priceStr += `SP:${product.sellingPrice?.toFixed(2)} `
      }
      if (
        options.barcodeShowDiscount &&
        product.mrp &&
        product.sellingPrice &&
        product.mrp > product.sellingPrice
      ) {
        const discountPercent = Math.round(
          ((product.mrp - product.sellingPrice) / product.mrp) * 100
        )
        priceStr += `(${discountPercent}%OFF)`
      }
      lines.push(`TEXT ${8 + nudgeXDots},${currentY + nudgeYDots},"0",0,1,1,"${priceStr.trim()}"`)

      // If strike-through MRP is requested, TSPL doesn't have a direct command.
      // We could try drawing a line over it, but calculating text width is complex in TSPL.
      // We skip strike-through for raw TSPL and only apply it to HTML.

      currentY += 28
    }

    lines.push(
      `BARCODE ${8 + nudgeXDots},${currentY + nudgeYDots},"128",${barcodeHeightDots},1,0,2,2,"${barcode}"`
    )
    currentY += barcodeHeightDots + 8
    lines.push(`TEXT ${8 + nudgeXDots},${currentY + nudgeYDots},"0",0,1,1,"${barcode}"`)

    lines.push(`PRINT ${Math.min(Math.max(options.quantity, 1), 500)},1`)

    return `${lines.join('\r\n')}\r\n`
  }

  private async printRawTspl(
    printerName: string,
    product: Product,
    barcodeValue: string,
    options: ProductLabelPrintOptions
  ): Promise<boolean> {
    try {
      const printerModule = await this.getNativePrinter()
      if (!printerModule) {
        return false
      }

      const command = this.buildTsplLabelCommand(product, barcodeValue, options)
      return await new Promise<boolean>((resolve) => {
        printerModule.printDirect({
          data: command,
          printer: printerName,
          type: 'RAW',
          success: (jobId) => {
            log.info(`RAW label job submitted to '${printerName}' with jobId=${jobId}`)
            resolve(true)
          },
          error: (err) => {
            log.error(`RAW label print failed on '${printerName}':`, err)
            resolve(false)
          }
        })
      })
    } catch (err) {
      log.error(`RAW label print exception on '${printerName}':`, err)
      return false
    }
  }

  private getPageSizeMicrons(labelSize: ProductLabelSize): { width: number; height: number } {
    const preset = LABEL_PRESETS[labelSize]
    return {
      width: Math.round(preset.widthMm * 1000),
      height: Math.round(preset.heightMm * 1000)
    }
  }

  private async resolvePrinterName(win: BrowserWindow, requestedName: string): Promise<string> {
    const requested = requestedName.trim().toLowerCase()
    const printers = await win.webContents.getPrintersAsync()
    const match = printers.find((p) => p.name.trim().toLowerCase() === requested)
    if (match) return match.name

    const available = printers.map((p) => p.name)
    throw new Error(
      `Selected label printer not found in system printers: '${requestedName}'. Available: ${available.join(', ')}`
    )
  }

  private escapeHtml(text: string): string {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  private async buildBarcodeDataUri(value: string): Promise<string> {
    const bwipjs = await this.getBwipJs()
    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: value,
      scale: 2,
      height: 10,
      includetext: false,
      backgroundcolor: 'FFFFFF'
    })
    return `data:image/png;base64,${pngBuffer.toString('base64')}`
  }

  private buildLabelHtml(
    product: Product,
    barcodeValue: string,
    barcodeDataUri: string,
    options: ProductLabelPrintOptions
  ): string {
    const preset = LABEL_PRESETS[options.labelSize]
    const dualColumn = this.isLp46DualColumn(options.printerName, options.labelSize)
    const pageWidthMm = dualColumn ? preset.widthMm * 2 : preset.widthMm
    const labelWidthMm = dualColumn ? preset.widthMm - 1.2 : preset.widthMm
    const labelNudgeMm = dualColumn ? 0.35 : 0
    const nudgeX = Number.parseFloat(options.barcodeNudgeX || '0.0') || 0
    const nudgeY = Number.parseFloat(options.barcodeNudgeY || '0.0') || 0
    const productName = this.escapeHtml(product.shortName?.trim() || product.name)

    const showName = options.barcodeShowName !== false
    const showMrp = options.barcodeShowMrp && product.mrp != null && product.mrp > 0
    const showSellingPrice =
      options.barcodeShowSellingPrice && product.sellingPrice != null && product.sellingPrice > 0
    const strikeMrp = options.barcodeStrikeMrp

    const isSmall = options.labelSize === '46x25'

    // Paddings & Gaps
    const paddingX =
      options.barcodePaddingX && options.barcodePaddingX !== 'default'
        ? `${options.barcodePaddingX}mm`
        : isSmall
          ? '1.5mm'
          : '3mm'
    const paddingY =
      options.barcodePaddingY && options.barcodePaddingY !== 'default'
        ? `${options.barcodePaddingY}mm`
        : isSmall
          ? '1mm'
          : '2mm'
    const padding = `${paddingY} ${paddingX}`
    const gap =
      options.barcodeGap && options.barcodeGap !== 'default'
        ? `${options.barcodeGap}mm`
        : isSmall
          ? '0.8mm'
          : '1.5mm'

    // Font Sizes
    const shopFontSize =
      options.barcodeShopFontSize && options.barcodeShopFontSize !== 'default'
        ? `${options.barcodeShopFontSize}pt`
        : isSmall
          ? '8.5pt'
          : '11pt'
    const nameFontSize =
      options.barcodeNameFontSize && options.barcodeNameFontSize !== 'default'
        ? `${options.barcodeNameFontSize}pt`
        : isSmall
          ? '10.5pt'
          : '14pt'

    const priceRowFontSize =
      options.barcodePriceFontSize && options.barcodePriceFontSize !== 'default'
        ? `${options.barcodePriceFontSize}pt`
        : isSmall
          ? '9.5pt'
          : '13pt'
    const parsedPriceSize = Number.parseFloat(
      options.barcodePriceFontSize || (isSmall ? '9.5' : '13')
    )
    const mrpFontSize =
      options.barcodePriceFontSize && options.barcodePriceFontSize !== 'default'
        ? `${parsedPriceSize * 0.85}pt`
        : isSmall
          ? '8.5pt'
          : '11pt'
    const spFontSize =
      options.barcodePriceFontSize && options.barcodePriceFontSize !== 'default'
        ? `${parsedPriceSize * 1.15}pt`
        : isSmall
          ? '11.5pt'
          : '15pt'
    const discountFontSize =
      options.barcodePriceFontSize && options.barcodePriceFontSize !== 'default'
        ? `${parsedPriceSize * 0.85}pt`
        : isSmall
          ? '8.5pt'
          : '11pt'

    const codeFontSize =
      options.barcodeCodeFontSize && options.barcodeCodeFontSize !== 'default'
        ? `${options.barcodeCodeFontSize}pt`
        : isSmall
          ? '8.5pt'
          : '11pt'

    const customWidthPercent = options.barcodeWidth || '75'
    const defaultHeightMm = isSmall ? '5.5' : '13.0'
    const customHeightMm = `${options.barcodeHeight || defaultHeightMm}mm`

    let discountStr = ''
    if (
      options.barcodeShowDiscount &&
      product.mrp &&
      product.sellingPrice &&
      product.mrp > product.sellingPrice
    ) {
      const discountPercent = Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
      discountStr = ` <span class="discount">(${discountPercent}% OFF)</span>`
    }

    let priceHtml = ''
    if (showMrp || showSellingPrice) {
      priceHtml = '<div class="price-row">'
      if (showMrp) {
        priceHtml += `<span class="mrp ${strikeMrp ? 'strike' : ''}"><span class="mrp-text">₹${product.mrp?.toFixed(2)}</span>${strikeMrp ? '<span class="strike-line"></span>' : ''}</span>`
      }
      if (showSellingPrice) {
        priceHtml += `<span class="sp">₹${product.sellingPrice?.toFixed(2)}</span>`
      }
      priceHtml += discountStr
      priceHtml += '</div>'
    }

    let headerHtml = ''
    if (options.barcodeShowSaleName === true && options.barcodeSaleNameText) {
      headerHtml = `<div class="shop-name">${this.escapeHtml(options.barcodeSaleNameText)}</div>`
    } else if (options.barcodeShowShopName === true && options.shopName) {
      headerHtml = `<div class="shop-name">${this.escapeHtml(options.shopName)}</div>`
    }

    const oneLabel = `
      <section class="label-card">
        ${headerHtml}
        ${showName ? `<div class="name">${productName}</div>` : ''}
        ${priceHtml}
        <div class="barcode-wrapper">
          <img class="barcode" src="${barcodeDataUri}" alt="Barcode" />
        </div>
        ${options.barcodeShowCode !== false ? `<div class="code">${this.escapeHtml(barcodeValue)}</div>` : ''}
      </section>
    `

    const quantity = Math.min(Math.max(Math.floor(options.quantity), 1), 500)
    const labelCards = Array.from({ length: quantity }, () => oneLabel)

    const labels = dualColumn
      ? Array.from({ length: Math.ceil(labelCards.length / 2) }, (_, pageIndex) => {
          const left = labelCards[pageIndex * 2] || '<section class="label-card empty"></section>'
          const right =
            labelCards[pageIndex * 2 + 1] || '<section class="label-card empty"></section>'
          return `<section class="sheet"><div class="cell">${left}</div><div class="cell">${right}</div></section>`
        }).join('')
      : labelCards.join('')

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      size: ${pageWidthMm}mm ${preset.heightMm}mm;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #000;
    }
    body {
      width: ${pageWidthMm}mm;
    }
    .label-card {
      width: ${labelWidthMm}mm;
      height: ${preset.heightMm}mm;
      padding: ${padding};
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;
      gap: ${gap};
      page-break-after: ${dualColumn ? 'auto' : 'always'};
      overflow: hidden;
      border: 0;
      background: #fff;
      transform: translate(calc(${labelNudgeMm}mm + ${nudgeX}mm), ${nudgeY}mm);
    }
    .label-card:last-child {
      page-break-after: auto;
    }
    .label-card.empty {
      visibility: hidden;
    }
    .sheet {
      width: ${pageWidthMm}mm;
      height: ${preset.heightMm}mm;
      display: ${dualColumn ? 'grid' : 'block'};
      grid-template-columns: ${dualColumn ? `${preset.widthMm}mm ${preset.widthMm}mm` : 'none'};
      page-break-after: ${dualColumn ? 'always' : 'auto'};
      overflow: hidden;
    }
    .sheet:last-child {
      page-break-after: auto;
    }
    .cell {
      width: ${preset.widthMm}mm;
      height: ${preset.heightMm}mm;
      overflow: hidden;
    }
    .shop-name {
      font-family: inherit;
      font-size: ${shopFontSize};
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      text-align: ${options.barcodeShopAlign || 'right'};
      line-height: 1;
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 0;
    }
    .name {
      font-family: inherit;
      font-size: ${nameFontSize};
      font-weight: 700;
      text-align: ${options.barcodeNameAlign || 'left'};
      line-height: 1.1;
      width: 100%;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex-shrink: 0;
    }
    .price-row {
      font-size: ${priceRowFontSize};
      line-height: 1.2;
      display: flex;
      justify-content: ${options.barcodePriceAlign === 'center' ? 'center' : options.barcodePriceAlign === 'right' ? 'flex-end' : 'flex-start'};
      align-items: baseline;
      gap: 6px;
      width: 100%;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .mrp {
      font-size: ${mrpFontSize};
      font-weight: 500;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .mrp.strike {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .strike-line {
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      background-color: #000;
      pointer-events: none;
    }
    .sp {
      font-size: ${spFontSize};
      font-weight: 800;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .discount {
      font-size: ${discountFontSize};
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .barcode-wrapper {
      width: 100%;
      height: ${customHeightMm};
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .barcode {
      width: ${customWidthPercent}%;
      height: 100%;
      object-fit: fill;
      image-rendering: crisp-edges;
    }
    .code {
      font-family: Consolas, "Courier New", monospace;
      font-size: ${codeFontSize};
      font-weight: 700;
      text-align: ${options.barcodeCodeAlign || 'center'};
      line-height: 1;
      letter-spacing: 0.5px;
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  ${labels}
</body>
</html>`
  }

  private async printHtml(
    printerName: string,
    html: string,
    labelSize: ProductLabelSize
  ): Promise<boolean> {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    try {
      const resolvedPrinterName = await this.resolvePrinterName(win, printerName)
      const pageSize = this.isLp46DualColumn(resolvedPrinterName, labelSize)
        ? {
            width: Math.round(LABEL_PRESETS[labelSize].widthMm * 2 * 1000),
            height: Math.round(LABEL_PRESETS[labelSize].heightMm * 1000)
          }
        : this.getPageSizeMicrons(labelSize)
      this._beforeJobCount = this.getWindowsJobCountSinceReset(resolvedPrinterName)
      this._beforeJobIds = this.getWindowsQueueJobIds(resolvedPrinterName)
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      return await new Promise<boolean>((resolve) => {
        win.webContents.print(
          {
            silent: true,
            printBackground: true,
            deviceName: resolvedPrinterName,
            pageSize,
            margins: { marginType: 'none' }
          },
          (success, failureReason) => {
            if (!success) {
              log.error(`Label print failed: ${failureReason || 'Unknown reason'}`)
              resolve(false)
            } else {
              log.info(
                `Label print submitted: printer='${resolvedPrinterName}', pageSize=${pageSize.width}x${pageSize.height} microns`
              )
              void this.verifyWindowsSpoolerObserved(resolvedPrinterName).then((observed) => {
                if (!observed) {
                  log.warn(
                    `Label submission was not observed in Windows spooler for '${resolvedPrinterName}'`
                  )
                }
                resolve(true)
              })
            }
          }
        )
      })
    } finally {
      if (!win.isDestroyed()) {
        win.destroy()
      }
    }
  }

  private async generateLabelPdf(
    product: Product,
    options: ProductLabelPrintOptions
  ): Promise<{ success: boolean; path: string }> {
    const quantity = Math.min(Math.max(Math.floor(options.quantity), 1), 500)
    const labelSize = options.labelSize in LABEL_PRESETS ? options.labelSize : '46x25'
    const barcodeValue = (product.barcode || product.sku || '').trim()
    if (!barcodeValue) {
      throw new Error('This product does not have barcode/SKU value for label printing.')
    }

    const barcodeDataUri = await this.buildBarcodeDataUri(barcodeValue)
    const html = this.buildLabelHtml(product, barcodeValue, barcodeDataUri, {
      ...options,
      printerName: options.printerName || '',
      quantity,
      labelSize
    })

    const fileSafeName = (product.sku || product.name || 'label').replace(/[^a-zA-Z0-9-_]/g, '_')
    const fileName = `Label_${fileSafeName}_${Date.now()}.pdf`
    const filePath = join(getLabelDir(), fileName)

    const win = new BrowserWindow({
      width: 600,
      height: 800,
      show: false,
      webPreferences: {
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      await win.webContents.executeJavaScript(
        `new Promise((resolve) => {
          if (document.readyState === 'complete') {
            const imgs = Array.from(document.images || [])
            if (!imgs.length) return resolve(true)
            let pending = imgs.length
            const done = () => {
              pending -= 1
              if (pending <= 0) resolve(true)
            }
            imgs.forEach((img) => {
              if (img.complete) return done()
              img.addEventListener('load', done)
              img.addEventListener('error', done)
            })
            return
          }
          window.addEventListener('load', () => resolve(true))
        })`
      )
      await this.sleep(150)
      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
        pageSize: {
          width: LABEL_PRESETS[labelSize].widthMm / 25.4,
          height: LABEL_PRESETS[labelSize].heightMm / 25.4
        },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        landscape: false
      })
      writeFileSync(filePath, pdfBuffer)
      return { success: true, path: filePath }
    } catch (err) {
      log.error('Label PDF generation failed:', err)
      return { success: false, path: '' }
    } finally {
      if (!win.isDestroyed()) {
        win.destroy()
      }
    }
  }

  async printProductLabels(
    product: Product,
    options: ProductLabelPrintOptions
  ): Promise<ProductLabelPrintResult> {
    const printerName = options.printerName.trim()
    if (!printerName) {
      throw new Error('No label printer selected. Please configure label printer in Settings.')
    }

    const quantity = Math.min(Math.max(Math.floor(options.quantity), 1), 500)
    const labelSize = options.labelSize in LABEL_PRESETS ? options.labelSize : '46x25'
    const barcodeValue = (product.barcode || product.sku || '').trim()
    if (!barcodeValue) {
      throw new Error('This product does not have barcode/SKU value for label printing.')
    }

    const barcodeDataUri = await this.buildBarcodeDataUri(barcodeValue)
    const html = this.buildLabelHtml(product, barcodeValue, barcodeDataUri, {
      ...options,
      quantity,
      labelSize
    })

    let printed = false

    if (this.shouldPreferRawLabel(printerName)) {
      printed = await this.printRawTspl(printerName, product, barcodeValue, {
        ...options,
        quantity,
        labelSize
      })
      if (!printed) {
        log.warn(`RAW label path failed for '${printerName}', trying Electron HTML fallback`)
      }
    }

    if (!printed) {
      printed = await this.printHtml(printerName, html, labelSize)
      if (!printed) {
        log.warn(`Electron label path failed for '${printerName}', trying RAW fallback`)
        printed = await this.printRawTspl(printerName, product, barcodeValue, {
          ...options,
          quantity,
          labelSize
        })
      }
    }

    if (!printed) {
      throw new Error(
        'Label print job failed on both Electron and RAW paths. Check printer status/driver and LP46 command mode.'
      )
    }

    log.info(
      `Printed ${quantity} label(s) for ${product.sku} on '${printerName}' (${labelSize}mm profile)`
    )

    return {
      success: true,
      printerName,
      quantity,
      labelSize,
      barcodeValue
    }
  }

  async downloadProductLabels(
    product: Product,
    options: ProductLabelPrintOptions
  ): Promise<{ success: boolean; path: string }> {
    return this.generateLabelPdf(product, options)
  }
}

export const productLabelPrinterService = new ProductLabelPrinterService()
