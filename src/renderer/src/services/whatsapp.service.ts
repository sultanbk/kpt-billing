export interface WhatsappService {
  sendBillReceipt: (billId: number, phone: string) => Promise<{ success: boolean; error?: string }>
  sendCreditReminder: (
    phone: string,
    customerName: string,
    amount: number
  ) => Promise<{ success: boolean; error?: string }>
  sendPaymentConfirmation: (
    phone: string,
    customerName: string,
    amount: number,
    balanceAfter: number,
    paymentMode: string,
    date: string
  ) => Promise<{ success: boolean; error?: string }>
}

export const whatsappService: WhatsappService = {
  sendBillReceipt: (billId, phone) => window.api.whatsapp.sendBillReceipt(billId, phone),
  sendCreditReminder: (phone, customerName, amount) =>
    window.api.whatsapp.sendCreditReminder(phone, customerName, amount),
  sendPaymentConfirmation: (phone, customerName, amount, balanceAfter, paymentMode, date) =>
    window.api.whatsapp.sendPaymentConfirmation(
      phone,
      customerName,
      amount,
      balanceAfter,
      paymentMode,
      date
    )
}
