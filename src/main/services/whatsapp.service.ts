// ============================================================================
// KPT Billing - WhatsApp Notification Service
// Uses wa.me URLs to open WhatsApp Web/App with pre-filled messages
// ============================================================================
import { shell } from 'electron'
import { billRepo } from '../database/repositories/bill.repo'

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
  items: { productName: string; quantity: number; total: number }[]
  subtotal: number
  discountAmount: number
  gstAmount: number
  grandTotal: number
  paymentMode: string
}): string {
  const lines: string[] = [
    `🧾 *${SHOP_NAME}*`,
    `──────────────`,
    `*Bill No:* ${bill.billNumber}`,
    `*Date:* ${bill.date}`,
    bill.customerName ? `*Customer:* ${bill.customerName}` : '',
    ``,
    `*Items:*`
  ].filter(Boolean)

  bill.items.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.productName} × ${item.quantity} = ₹${formatCurrencyPlain(item.total)}`)
  })

  lines.push(``)
  lines.push(`──────────────`)
  lines.push(`*Subtotal:* ₹${formatCurrencyPlain(bill.subtotal)}`)
  if (bill.discountAmount > 0) {
    lines.push(`*Discount:* -₹${formatCurrencyPlain(bill.discountAmount)}`)
  }
  if (bill.gstAmount > 0) {
    lines.push(`*GST:* ₹${formatCurrencyPlain(bill.gstAmount)}`)
  }
  lines.push(`*Grand Total:* ₹${formatCurrencyPlain(bill.grandTotal)}`)
  lines.push(`*Payment:* ${bill.paymentMode.toUpperCase()}`)
  lines.push(`──────────────`)
  lines.push(``)
  lines.push(`Thank you for shopping with us! 🙏`)

  return lines.join('\n')
}

function creditReminderMessage(customer: {
  name: string
  currentBalance: number
}): string {
  return [
    `🔔 *Payment Reminder*`,
    ``,
    `Dear ${customer.name},`,
    ``,
    `This is a gentle reminder that you have a pending balance of *₹${formatCurrencyPlain(customer.currentBalance)}* at *${SHOP_NAME}*.`,
    ``,
    `Request you to kindly clear the dues at your earliest convenience.`,
    ``,
    `Thank you! 🙏`,
    `— ${SHOP_NAME}`
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
    `✅ *Payment Received*`,
    ``,
    `Dear ${data.customerName},`,
    ``,
    `We have received your payment of *₹${formatCurrencyPlain(data.amountPaid)}* via ${data.paymentMode.toUpperCase()} on ${data.date}.`,
    ``,
    data.remainingBalance > 0
      ? `Remaining balance: *₹${formatCurrencyPlain(data.remainingBalance)}*`
      : `Your account is now fully settled. ✨`,
    ``,
    `Thank you! 🙏`,
    `— ${SHOP_NAME}`
  ].join('\n')
}

// ---- Public API ----

export const whatsappService = {
  async sendBillReceipt(billId: number, phone: string): Promise<{ success: boolean; error?: string }> {
    try {
      const bill = billRepo.getById(billId)
      if (!bill) return { success: false, error: 'Bill not found' }

      const message = billReceiptMessage({
        billNumber: bill.billNumber,
        date: bill.date,
        customerName: bill.customerName || undefined,
        items: (bill.items || []).map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          total: i.total || 0
        })),
        subtotal: bill.subtotal,
        discountAmount: bill.discountAmount,
        gstAmount: bill.gstAmount,
        grandTotal: bill.grandTotal,
        paymentMode: bill.paymentMode
      })

      const url = buildWhatsAppUrl(phone, message)
      await shell.openExternal(url)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to open WhatsApp'
      return { success: false, error: msg }
    }
  },

  async sendCreditReminder(phone: string, customerName: string, currentBalance: number): Promise<{ success: boolean; error?: string }> {
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
