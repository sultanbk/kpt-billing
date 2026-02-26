// ============================================================================
// KPT Billing - Thermal Printer Service (ESC/POS for TVS RP 3000 Lite)
// ============================================================================
import ThermalPrinter from 'node-thermal-printer'
import log from 'electron-log'
import type { Bill } from '../../shared/types'

const { printer: Printer, types: PrinterTypes } = ThermalPrinter

export class ThermalPrinterService {
  private printerName: string = ''

  setPrinter(name: string): void {
    this.printerName = name
  }

  async getAvailablePrinters(): Promise<string[]> {
    // On Windows, list available printers
    try {
      const { execSync } = require('child_process')
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
    const p = new Printer({
      type: PrinterTypes.EPSON,
      interface: this.printerName ? `printer:${this.printerName}` : 'printer:auto',
      options: {
        timeout: 5000
      },
      width: 48, // 48 chars for 80mm paper
      characterSet: 'PC437_USA' as any
    })
    return p
  }

  async printReceipt(bill: Bill, shopInfo: Record<string, string>): Promise<boolean> {
    try {
      const p = this.createPrinter()

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
          const name =
            item.productName.length > 18
              ? item.productName.substring(0, 18) + '..'
              : item.productName
          p.tableCustom([
            { text: name, align: 'LEFT', width: 0.4 },
            { text: item.quantity.toString(), align: 'CENTER', width: 0.1 },
            { text: item.price.toFixed(0), align: 'RIGHT', width: 0.25 },
            { text: item.total.toFixed(0), align: 'RIGHT', width: 0.25 }
          ])
          // Show discount if any
          if (item.discount > 0) {
            const discText =
              item.discountType === 'percent' || item.discountType === 'percentage'
                ? `  Disc: ${item.discount}%`
                : `  Disc: -${item.discount.toFixed(0)}`
            p.println(discText)
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
        p.leftRight('GST:', `${bill.gstAmount.toFixed(2)}`)
      }
      if (bill.roundOff !== 0) {
        p.leftRight('Round Off:', `${bill.roundOff.toFixed(2)}`)
      }

      p.drawLine()
      p.bold(true)
      p.setTextDoubleHeight()
      p.leftRight('TOTAL:', `Rs.${bill.grandTotal.toFixed(0)}`)
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

      p.drawLine()

      // Footer
      p.alignCenter()
      p.println('Thank you! Visit again')
      p.println('Exchange within 7 days with bill')
      p.newLine()
      p.newLine()

      p.cut()

      await p.execute()
      log.info(`Receipt printed for bill ${bill.billNo}`)
      return true
    } catch (err) {
      log.error('Print failed:', err)
      return false
    }
  }

  async testPrint(): Promise<boolean> {
    try {
      const p = this.createPrinter()
      p.alignCenter()
      p.bold(true)
      p.setTextDoubleHeight()
      p.println('KRISHNAPRIYA TEXTILES')
      p.setTextNormal()
      p.bold(false)
      p.println('--- Test Print ---')
      p.println(new Date().toLocaleString('en-IN'))
      p.println('Printer is working!')
      p.newLine()
      p.cut()
      await p.execute()
      return true
    } catch (err) {
      log.error('Test print failed:', err)
      return false
    }
  }
}

export const thermalPrinterService = new ThermalPrinterService()
