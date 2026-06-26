// ============================================================================
// KPT Billing - WhatsApp Notification Service
// Uses wa.me URLs to open WhatsApp Web/App with pre-filled messages
// ============================================================================
import { shell } from 'electron'
import { billRepo } from '../database/repositories/bill.repo'
import { getSqlite } from '../database/connection'

// Indian number formatting: last 3 digits, then groups of 2
function formatCurrencyPlain(amount: number): string {
  const fixed = Math.abs(amount).toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  let formatted = ''
  if (intPart.length <= 3) {
    formatted = intPart
  } else {
    const last3 = intPart.slice(-3)
    const rest = intPart.slice(0, -3)
    const groups: string[] = []
    for (let i = rest.length; i > 0; i -= 2) {
      groups.unshift(rest.slice(Math.max(0, i - 2), i))
    }
    formatted = groups.join(',') + ',' + last3
  }
  return (amount < 0 ? '-' : '') + formatted + '.' + decPart
}

const SHOP_NAME = 'Krishnapriya Textiles'

function formatPhone(phone: string): string {
  // Remove spaces, dashes, brackets
  let cleaned = phone.replace(/[\s\-()]/g, '')
  // If starts with 0, replace with +91
  if (cleaned.startsWith('0')) cleaned = '+91' + cleaned.substring(1)
  // If doesn't start with +, assume Indian number
  if (!cleaned.startsWith('+')) cleaned = '+91' + cleaned
  // Remove the + for wa.me format
  return cleaned.replace('+', '')
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const encodedMsg = encodeURIComponent(message)
  return `https://wa.me/${formatPhone(phone)}?text=${encodedMsg}`
}

// ---- Message Templates ----

function billReceiptMessage(bill: {
  billNumber: string
  date: string
  customerName?: string
  items: { productName: string; quantity: number; total: number; returnedQty?: number }[]
  subtotal: number
  discountAmount: number
  gstAmount: number
  grandTotal: number
  paymentMode: string
  hasReturns?: boolean
  returns?: Array<{
    type: string
    itemsSummary: string
    returnAmount: number
    exchangeAmount: number
    netAmount: number
    refundMode: string
    newBillNo: string | null
  }>
  exchangeFromBillNo?: string | null
}): string {
  const lines: string[] = [`*${SHOP_NAME}*`, `Invoice`, `──────────────`]

  // If this is an exchange bill, show a banner at top
  if (bill.exchangeFromBillNo) {
    lines.push(`Exchange Bill (against ${bill.exchangeFromBillNo})`)
    lines.push(`──────────────`)
  }

  lines.push(`Bill No: ${bill.billNumber}`)
  lines.push(`Date: ${bill.date}`)
  if (bill.customerName) lines.push(`Customer: ${bill.customerName}`)
  lines.push(``)
  lines.push(`Items`)

  let displayIdx = 1
  bill.items.forEach((item) => {
    const returnedQty = item.returnedQty || 0
    const netQty = item.quantity - returnedQty
    const pricePerUnit = item.quantity > 0 ? item.total / item.quantity : 0

    if (returnedQty >= item.quantity) {
      // Fully returned — strikethrough in WhatsApp
      lines.push(
        `${displayIdx++}. ~${item.productName} x ${item.quantity} = ₹${formatCurrencyPlain(item.total)}~ (Returned)`
      )
    } else if (returnedQty > 0) {
      // Partial return — show net qty with note
      const netTotal = pricePerUnit * netQty
      lines.push(
        `${displayIdx++}. ${item.productName} x ${netQty} = ₹${formatCurrencyPlain(netTotal)} (${returnedQty} returned)`
      )
    } else {
      lines.push(
        `${displayIdx++}. ${item.productName} x ${item.quantity} = ₹${formatCurrencyPlain(item.total)}`
      )
    }
  })

  lines.push(``)
  lines.push(`──────────────`)
  if (bill.hasReturns) {
    lines.push(`Totals reflect post-return amounts.`)
  }
  lines.push(`Subtotal: ₹${formatCurrencyPlain(bill.subtotal)}`)
  if (bill.discountAmount > 0) {
    lines.push(`Discount: -₹${formatCurrencyPlain(bill.discountAmount)}`)
  }
  if (bill.gstAmount > 0) {
    lines.push(`GST: ₹${formatCurrencyPlain(bill.gstAmount)}`)
  }
  lines.push(`Grand Total: ₹${formatCurrencyPlain(bill.grandTotal)}`)
  lines.push(`Payment: ${bill.paymentMode.toUpperCase()}`)

  // Returns / Exchanges section
  if (bill.returns && bill.returns.length > 0) {
    lines.push(``)
    for (const r of bill.returns) {
      const isExchange = r.type === 'exchange'
      if (isExchange) {
        lines.push(`Exchange Applied`)
        if (r.itemsSummary)
          lines.push(
            `  Returned: ${r.itemsSummary} | Value: ₹${formatCurrencyPlain(r.returnAmount)}`
          )
        if (r.newBillNo) lines.push(`  New Bill: ${r.newBillNo}`)
        if (r.exchangeAmount > 0)
          lines.push(`  Exchange Items: ₹${formatCurrencyPlain(r.exchangeAmount)}`)
        const net = r.netAmount
        if (net > 0) lines.push(`  Net Paid by Customer: ₹${formatCurrencyPlain(net)}`)
        else if (net < 0)
          lines.push(
            `  Net Refund to Customer: ₹${formatCurrencyPlain(Math.abs(net))} via ${r.refundMode.toUpperCase()}`
          )
        else lines.push(`  No extra amount (net zero)`)
      } else {
        lines.push(`Return Applied`)
        if (r.itemsSummary) lines.push(`  Items: ${r.itemsSummary}`)
        lines.push(
          `  Refund: ₹${formatCurrencyPlain(r.returnAmount)} via ${r.refundMode.toUpperCase()}`
        )
      }
    }
  }

  lines.push(`──────────────`)
  lines.push(``)
  lines.push(`Thank you for shopping with us.`)
  lines.push(``)
  // lines.push(`_Powered by SarvaOne_`)

  return lines.join('\n')
}

function creditReminderMessage(customer: { name: string; currentBalance: number }): string {
  return [
    `Payment Reminder`,
    ``,
    `Dear ${customer.name},`,
    ``,
    `This is a gentle reminder that your outstanding balance is ₹${formatCurrencyPlain(customer.currentBalance)} at ${SHOP_NAME}.`,
    ``,
    `Kindly clear the dues at your earliest convenience.`,
    ``,
    `Thank you.`,
    `${SHOP_NAME}`
  ].join('\n')
}

function paymentConfirmationMessage(data: {
  customerName: string
  amountPaid: number
  remainingBalance: number
  paymentMode: string
  date: string
}): string {
  return [
    `Payment Received`,
    ``,
    `Dear ${data.customerName},`,
    ``,
    `We have received your payment of ₹${formatCurrencyPlain(data.amountPaid)} via ${data.paymentMode.toUpperCase()} on ${data.date}.`,
    ``,
    data.remainingBalance > 0
      ? `Remaining balance: ₹${formatCurrencyPlain(data.remainingBalance)}`
      : `Your account is now fully settled.`,
    ``,
    `Thank you.`,
    `${SHOP_NAME}`
  ].join('\n')
}

// ---- Public API ----

export const whatsappService = {
  async sendBillReceipt(
    billId: number,
    phone: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const bill = billRepo.getById(billId)
      if (!bill) return { success: false, error: 'Bill not found' }

      const hasReturns = !!(bill.returns && bill.returns.length > 0)

      // Check if this bill was created as part of an exchange (reverse lookup)
      let exchangeFromBillNo: string | null = null
      try {
        const db = getSqlite()
        const exchangeSource = db
          .prepare(
            `SELECT b.bill_no FROM bill_returns br
           JOIN bills b ON b.id = br.original_bill_id
           WHERE br.new_bill_id = ? AND br.type = 'exchange' LIMIT 1`
          )
          .get(billId) as { bill_no: string } | undefined
        exchangeFromBillNo = exchangeSource?.bill_no || null
      } catch {
        /* ignore */
      }

      const message = billReceiptMessage({
        billNumber: bill.billNumber,
        date: bill.date,
        customerName: bill.customerName || undefined,
        items: (bill.items || []).map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          total: i.total || 0,
          returnedQty: i.returnedQty || 0
        })),
        subtotal: bill.subtotal,
        discountAmount: bill.discountAmount,
        gstAmount: bill.gstAmount,
        grandTotal: bill.grandTotal,
        paymentMode: bill.paymentMode,
        hasReturns,
        returns: (bill.returns || []).map((r) => ({
          type: r.type,
          itemsSummary: r.itemsSummary || '',
          returnAmount: r.returnAmount,
          exchangeAmount: r.exchangeAmount,
          netAmount: r.netAmount,
          refundMode: r.refundMode,
          newBillNo: r.newBillNo || null
        })),
        exchangeFromBillNo
      })

      const url = buildWhatsAppUrl(phone, message)
      await shell.openExternal(url)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to open WhatsApp'
      return { success: false, error: msg }
    }
  },

  async sendCreditReminder(
    phone: string,
    customerName: string,
    currentBalance: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const message = creditReminderMessage({ name: customerName, currentBalance })
      const url = buildWhatsAppUrl(phone, message)
      await shell.openExternal(url)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to open WhatsApp'
      return { success: false, error: msg }
    }
  },

  async sendPaymentConfirmation(
    phone: string,
    customerName: string,
    amountPaid: number,
    remainingBalance: number,
    paymentMode: string,
    date: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const message = paymentConfirmationMessage({
        customerName,
        amountPaid,
        remainingBalance,
        paymentMode,
        date
      })
      const url = buildWhatsAppUrl(phone, message)
      await shell.openExternal(url)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to open WhatsApp'
      return { success: false, error: msg }
    }
  }
}
