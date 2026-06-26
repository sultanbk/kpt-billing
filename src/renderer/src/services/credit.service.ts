import type { CreditLedgerEntry, CreditPayment, CreditPaymentCreateData } from '@shared/types'

export interface CreditService {
  getLedger: (customerId: number) => Promise<CreditLedgerEntry[]>
  getByCustomer: (customerId: number, limit?: number) => Promise<CreditPayment[]>
  recordPayment: (data: CreditPaymentCreateData) => Promise<CreditPayment>
  deletePayment: (paymentId: number) => Promise<boolean>
}

export const creditService: CreditService = {
  getLedger: (customerId) => window.api.credit.getLedger(customerId),
  getByCustomer: (customerId, limit) => window.api.credit.getByCustomer(customerId, limit),
  recordPayment: (data) => window.api.credit.recordPayment(data),
  deletePayment: (paymentId) => window.api.credit.deletePayment(paymentId)
}
