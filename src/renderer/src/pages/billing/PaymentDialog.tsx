import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../../components/ui/dialog'
import {
  Printer,
  Banknote,
  Smartphone,
  CreditCard,
  User,
  UserPlus,
  CheckCircle2,
  MessageCircle,
  RefreshCw
} from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { toast } from 'sonner'
import { useSearchLookup } from '../../hooks/useSearchLookup'
import { useAuthStore } from '../../stores/auth.store'
import { billingService } from '../../services/billing.service'
import { customersService } from '../../services/customers.service'
import { whatsappService } from '../../services/whatsapp.service'
import type { BillItem, BillPayment, BillCreateData, Bill, Customer } from '@shared/types'
// ---- Payment Dialog ----
export function PaymentDialog({
  open,
  onClose,
  grandTotal,
  items,
  customerName,
  customerPhone,
  customerId,
  discount,
  discountType,
  onSetCustomer,
  onBillCreated
}: {
  open: boolean
  onClose: () => void
  grandTotal: number
  items: BillItem[]
  customerName: string
  customerPhone: string
  customerId: number | null
  discount: number
  discountType: 'percentage' | 'amount'
  onSetCustomer: (name: string, phone: string, id: number | null) => void
  onBillCreated: () => void
}): React.JSX.Element {
  const [paymentMode, setPaymentMode] = useState<string>('cash')
  const [amountReceived, setAmountReceived] = useState<number>(0)
  const [upiReference, setUpiReference] = useState('')
  const [processing, setProcessing] = useState(false)
  const [creditWarning, setCreditWarning] = useState('')
  const [completedBill, setCompletedBill] = useState<Bill | null>(null)
  const [quickPhone, setQuickPhone] = useState('')
  const [sendingWA, setSendingWA] = useState(false)
  const [quickRegPhone, setQuickRegPhone] = useState('')
  const [registeringCustomer, setRegisteringCustomer] = useState(false)
  const [customerRegistered, setCustomerRegistered] = useState(false)
  // Quick-add customer inside payment form
  const [qcName, setQcName] = useState('')
  const [qcPhone, setQcPhone] = useState('')
  const [qcAdded, setQcAdded] = useState(false)
  const [qcSaving, setQcSaving] = useState(false)
  // Local customer overrides (set when user quick-adds during payment)
  const [localCustomerName, setLocalCustomerName] = useState(customerName)
  const [localCustomerPhone, setLocalCustomerPhone] = useState(customerPhone)
  const [localCustomerId, setLocalCustomerId] = useState<number | null>(customerId)
  const receivedRef = useRef<HTMLInputElement>(null)
  const quickPhoneRef = useRef<HTMLInputElement>(null)
  const quickRegPhoneRef = useRef<HTMLInputElement>(null)
  const qcLookup = useSearchLookup<Customer>({
    search: (term) => customersService.search(term.trim()),
    onSelect: (customer) => selectQcCustomer(customer),
    minQueryLength: 2,
    maxResults: 8,
    enableKeyboard: true
  })

  // Color mapping helper for payment modes
  const getModeStyles = (id: string, active: boolean): string => {
    switch (id) {
      case 'cash':
        return active
          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800 shadow-sm shadow-emerald-500/10'
          : 'border-border/60 hover:bg-emerald-50/10 hover:border-emerald-500/20'
      case 'upi':
        return active
          ? 'border-blue-500 bg-blue-50/50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800 shadow-sm shadow-blue-500/10'
          : 'border-border/60 hover:bg-blue-50/10 hover:border-blue-500/20'
      case 'card':
        return active
          ? 'border-purple-500 bg-purple-50/50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800 shadow-sm shadow-purple-500/10'
          : 'border-border/60 hover:bg-purple-50/10 hover:border-purple-500/20'
      case 'credit':
        return active
          ? 'border-amber-500 bg-amber-50/50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800 shadow-sm shadow-amber-500/10'
          : 'border-border/60 hover:bg-amber-50/10 hover:border-amber-500/20'
      default:
        return ''
    }
  }

  // Pay button custom styles based on payment mode
  const getPayButtonStyles = (mode: string): string => {
    switch (mode) {
      case 'cash':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 dark:bg-emerald-700 dark:hover:bg-emerald-600'
      case 'upi':
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 dark:bg-blue-700 dark:hover:bg-blue-600'
      case 'card':
        return 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20 dark:bg-purple-700 dark:hover:bg-purple-600'
      case 'credit':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20 dark:bg-amber-700 dark:hover:bg-amber-600'
      default:
        return 'bg-primary hover:bg-primary/95 text-primary-foreground'
    }
  }

  useEffect(() => {
    if (open) {
      setAmountReceived(Math.round(grandTotal))
      setPaymentMode('cash')
      setUpiReference('')
      setCreditWarning('')
      setCompletedBill(null)
      setQuickPhone('')
      setSendingWA(false)
      setQuickRegPhone('')
      setRegisteringCustomer(false)
      setCustomerRegistered(false)
      setQcName('')
      setQcPhone('')
      setQcAdded(false)
      setQcSaving(false)
      qcLookup.setQuery('')
      qcLookup.clearResults()
      setLocalCustomerName(customerName)
      setLocalCustomerPhone(customerPhone)
      setLocalCustomerId(customerId)
      setTimeout(() => receivedRef.current?.select(), 100)
    }
  }, [open, grandTotal])

  // Check credit limit when credit mode is selected
  useEffect(() => {
    if (paymentMode !== 'credit' || !localCustomerId) {
      setCreditWarning('')
      return
    }
    customersService.getById(Number(localCustomerId)).then((customer) => {
      if (!customer) return
      const newBalance = customer.currentBalance + grandTotal
      if (customer.creditLimit && customer.creditLimit > 0 && newBalance > customer.creditLimit) {
        setCreditWarning(
          `This will exceed credit limit! Current: â‚¹${customer.currentBalance.toLocaleString('en-IN')}, ` +
            `After: â‚¹${newBalance.toLocaleString('en-IN')}, Limit: â‚¹${customer.creditLimit.toLocaleString('en-IN')}`
        )
      } else {
        setCreditWarning('')
      }
    })
  }, [paymentMode, localCustomerId, grandTotal])

  const change = paymentMode === 'cash' ? amountReceived - grandTotal : 0

  const handlePay = async (): Promise<void> => {
    if (grandTotal <= 0) {
      toast.error('Bill total must be greater than zero')
      return
    }
    if (paymentMode === 'cash' && amountReceived < grandTotal) {
      toast.error('Amount received is less than total')
      return
    }
    if (paymentMode === 'credit' && !localCustomerName.trim()) {
      toast.error('Customer name is required for credit sales')
      return
    }
    if (paymentMode === 'credit' && !localCustomerId) {
      toast.error('Please select a registered customer for credit sales')
      return
    }

    // Check for stock underflow (warn but allow)
    const underflowItems = items.filter(
      (item) => item.productId && item.stock !== undefined && item.quantity > item.stock
    )
    if (underflowItems.length > 0) {
      const warningMessage =
        `The following items exceed available stock:\n` +
        underflowItems
          .map(
            (item) => `- ${item.productName}: selling ${item.quantity}, only ${item.stock} in stock`
          )
          .join('\n') +
        `\n\nDo you want to proceed anyway?`
      if (!window.confirm(warningMessage)) {
        return
      }
    }

    setProcessing(true)
    try {
      const payment: BillPayment = {
        mode: paymentMode as 'cash' | 'upi' | 'card' | 'credit',
        amount: grandTotal,
        received: paymentMode === 'cash' ? amountReceived : grandTotal,
        change: paymentMode === 'cash' ? Math.max(0, change) : 0,
        reference: upiReference || '',
        cashAmount: paymentMode === 'cash' ? grandTotal : 0,
        upiAmount: paymentMode === 'upi' ? grandTotal : 0,
        cardAmount: paymentMode === 'card' ? grandTotal : 0,
        creditAmount: paymentMode === 'credit' ? grandTotal : 0
      }

      const billData: BillCreateData = {
        items: items.map((item) => ({
          productId: item.productId || null,
          productName: item.productName,
          sku: item.sku,
          hsn: item.hsn,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit,
          discount: item.discount,
          discountType: item.discountType,
          gstRate: item.gstRate
        })),
        customerName: localCustomerName || 'Walk-in Customer',
        customerPhone: localCustomerPhone,
        customerId: localCustomerId,
        discount,
        discountType,
        payment,
        createdBy: useAuthStore.getState().user?.name || undefined
      }

      const bill = await billingService.createBill(billData)
      try {
        const printed = await billingService.printReceipt(bill.id)
        if (printed) {
          toast.success(`Bill ${bill.billNumber} printed successfully`)
        } else {
          toast.error(
            'Bill created, but printer did not accept the job. Check printer status and paper.'
          )
        }
      } catch {
        toast.error('Bill created, but auto-print failed.')
      }
      setCompletedBill(bill)
      if (paymentMode === 'credit' && !localCustomerId) {
        setTimeout(() => quickRegPhoneRef.current?.focus(), 150)
      } else if (!localCustomerPhone) {
        setTimeout(() => quickPhoneRef.current?.focus(), 150)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create bill')
    }
    setProcessing(false)
  }

  function selectQcCustomer(c: Customer): void {
    const phone = c.phone?.startsWith('__NOPHONE__') ? '' : c.phone || ''
    setLocalCustomerName(c.name)
    setLocalCustomerPhone(phone)
    setLocalCustomerId(c.id)
    onSetCustomer(c.name, phone, c.id)
    setQcName(c.name)
    setQcPhone(phone)
    setQcAdded(true)
    qcLookup.clearResults()
    qcLookup.setShowResults(false)
  }

  const createQcCustomer = async (): Promise<void> => {
    if (!qcName.trim() || qcPhone.length !== 10 || qcSaving) return
    setQcSaving(true)
    try {
      const newCustomer = await customersService.create({
        name: qcName.trim(),
        phone: qcPhone,
        customerType: 'regular'
      })
      setLocalCustomerName(newCustomer.name)
      setLocalCustomerPhone(newCustomer.phone)
      setLocalCustomerId(newCustomer.id)
      onSetCustomer(newCustomer.name, newCustomer.phone, newCustomer.id)
      setQcAdded(true)
      qcLookup.clearResults()
      qcLookup.setShowResults(false)
      toast.success('Customer added')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add customer')
    }
    setQcSaving(false)
  }

  const paymentModes = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'upi', label: 'UPI', icon: Smartphone },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'credit', label: 'Credit', icon: User }
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          if (completedBill) {
            onBillCreated()
          }
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-md">
        {completedBill ? (
          /* ---- Success Screen ---- */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Bill Created!
              </DialogTitle>
              <DialogDescription>
                {completedBill.billNumber} &mdash; {formatCurrency(completedBill.grandTotal)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-4 text-center dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800">
                <div className="text-xs text-muted-foreground mb-1">Bill Number</div>
                <div className="text-2xl font-bold font-amount text-green-700 dark:text-green-400">
                  {completedBill.billNumber}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {completedBill.customerName} &bull; {formatCurrency(completedBill.grandTotal)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="flex-col h-auto py-3 gap-1.5 rounded-xl border-border/60 hover:border-primary/40 hover:bg-primary/5"
                  onClick={async () => {
                    try {
                      const printed = await billingService.printReceipt(completedBill.id)
                      if (printed) {
                        toast.success(`Bill ${completedBill.billNumber} printed successfully`)
                      } else {
                        toast.error(
                          'Printer did not accept the job. Check printer status and paper.'
                        )
                      }
                    } catch {
                      toast.error('Print failed')
                    }
                  }}
                >
                  <Printer className="h-5 w-5 text-primary" />
                  <span className="text-xs">Print</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-12 p-0 rounded-xl border-border/60 hover:border-green-500/40 hover:bg-green-500/5"
                  disabled={!completedBill.customerPhone}
                  onClick={async () => {
                    if (!completedBill.customerPhone) return
                    const res = await whatsappService.sendBillReceipt(
                      completedBill.id,
                      completedBill.customerPhone
                    )
                    if (!res.success) toast.error(res.error || 'Failed to open WhatsApp')
                  }}
                >
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <span className="sr-only">WhatsApp</span>
                </Button>
                <Button
                  className="flex-col h-auto py-3 gap-1.5 rounded-xl shadow-md shadow-primary/20"
                  onClick={() => {
                    onBillCreated()
                    onClose()
                  }}
                >
                  <RefreshCw className="h-5 w-5" />
                  <span className="text-xs">New Bill</span>
                </Button>
              </div>

              {/* Quick WhatsApp for walk-in: no phone on bill */}
              {!completedBill.customerPhone && (
                <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 p-3 space-y-2">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Send bill via WhatsApp
                  </p>
                  <div className="flex gap-2">
                    <Input
                      ref={quickPhoneRef}
                      type="tel"
                      value={quickPhone}
                      onChange={(e) =>
                        setQuickPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      placeholder="Enter 10-digit phone number"
                      className="h-9 text-sm flex-1"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && quickPhone.length === 10) {
                          e.preventDefault()
                          setSendingWA(true)
                          try {
                            const res = await whatsappService.sendBillReceipt(
                              completedBill.id,
                              quickPhone
                            )
                            if (!res.success) toast.error(res.error || 'Failed to open WhatsApp')
                            else toast.success('WhatsApp opened')
                          } catch {
                            toast.error('Failed to open WhatsApp')
                          }
                          setSendingWA(false)
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-9 w-9 p-0 bg-green-600 hover:bg-green-700 text-white shrink-0"
                      disabled={quickPhone.length !== 10 || sendingWA}
                      onClick={async () => {
                        setSendingWA(true)
                        try {
                          const res = await whatsappService.sendBillReceipt(
                            completedBill.id,
                            quickPhone
                          )
                          if (!res.success) toast.error(res.error || 'Failed to open WhatsApp')
                          else toast.success('WhatsApp opened')
                        } catch {
                          toast.error('Failed to open WhatsApp')
                        }
                        setSendingWA(false)
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="sr-only">{sendingWA ? 'Opening...' : 'Send'}</span>
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Number is only used for this message â€” not saved
                  </p>
                </div>
              )}

              {/* Quick customer register for unregistered credit customers */}
              {completedBill.creditAmount > 0 && !completedBill.customerId && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800 p-3 space-y-2">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" />
                    Register customer for credit tracking
                  </p>
                  {customerRegistered ? (
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 py-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Customer registered successfully</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input
                          value={completedBill.customerName ?? ''}
                          readOnly
                          className="h-9 text-sm flex-1 bg-muted/60"
                          placeholder="Customer name"
                        />
                        <Input
                          ref={quickRegPhoneRef}
                          type="tel"
                          value={quickRegPhone}
                          onChange={(e) =>
                            setQuickRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                          }
                          placeholder="Phone number"
                          className="h-9 text-sm flex-1"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && quickRegPhone.length === 10) {
                              e.preventDefault()
                              setRegisteringCustomer(true)
                              try {
                                await customersService.create({
                                  name: completedBill.customerName ?? 'Unknown',
                                  phone: quickRegPhone,
                                  customerType: 'regular'
                                })
                                setCustomerRegistered(true)
                                toast.success('Customer registered')
                              } catch (err: unknown) {
                                toast.error(
                                  err instanceof Error ? err.message : 'Failed to register customer'
                                )
                              }
                              setRegisteringCustomer(false)
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                          disabled={quickRegPhone.length !== 10 || registeringCustomer}
                          onClick={async () => {
                            setRegisteringCustomer(true)
                            try {
                              await customersService.create({
                                name: completedBill.customerName ?? 'Unknown',
                                phone: quickRegPhone,
                                customerType: 'regular'
                              })
                              setCustomerRegistered(true)
                              toast.success('Customer registered')
                            } catch (err: unknown) {
                              toast.error(
                                err instanceof Error ? err.message : 'Failed to register customer'
                              )
                            }
                            setRegisteringCustomer(false)
                          }}
                        >
                          <UserPlus className="h-4 w-4" />
                          {registeringCustomer ? 'Saving...' : 'Register'}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Registers customer to track this credit balance
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ---- Payment Form ---- */
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">Payment</DialogTitle>
              <DialogDescription>Complete the payment for this bill</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Grand Total */}
              <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-5 text-center border border-primary/10">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Total Amount
                </div>
                <div className="text-3xl font-bold font-amount gradient-text">
                  {formatCurrency(grandTotal)}
                </div>
              </div>

              {/* Payment Mode */}
              <div className="grid grid-cols-4 gap-2">
                {paymentModes.map((mode) => (
                  <button
                    key={mode.id}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all ${getModeStyles(mode.id, paymentMode === mode.id)}`}
                    onClick={() => setPaymentMode(mode.id)}
                  >
                    <mode.icon className="h-5 w-5" />
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Amount Received (Cash only) */}
              {paymentMode === 'cash' && (
                <div className="space-y-2">
                  <Label>Amount Received (â‚¹)</Label>
                  <Input
                    ref={receivedRef}
                    type="number"
                    min={0}
                    step={1}
                    value={amountReceived || ''}
                    onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePay()}
                    className="text-lg font-amount"
                  />

                  {/* Quick amounts */}
                  <div className="flex gap-2">
                    {[
                      ...new Set([
                        Math.ceil(grandTotal),
                        Math.ceil(grandTotal / 100) * 100,
                        Math.ceil(grandTotal / 500) * 500,
                        Math.ceil(grandTotal / 1000) * 1000,
                        Math.ceil(grandTotal / 2000) * 2000
                      ])
                    ]
                      .filter((a) => a >= grandTotal)
                      .slice(0, 4)
                      .map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs font-amount"
                          onClick={() => setAmountReceived(amount)}
                        >
                          â‚¹{amount.toLocaleString('en-IN')}
                        </Button>
                      ))}
                  </div>

                  {/* Change */}
                  {amountReceived >= grandTotal && (
                    <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
                      <div className="text-sm text-muted-foreground">Change to Return</div>
                      <div className="text-xl font-bold font-amount text-green-600">
                        {formatCurrency(change)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {paymentMode === 'upi' && (
                <div className="space-y-2">
                  <Label>UPI Transaction Reference (optional)</Label>
                  <Input
                    value={upiReference}
                    onChange={(e) => setUpiReference(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePay()}
                    placeholder="e.g. UPI Ref No. / Transaction ID"
                    autoFocus
                  />
                  <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-900/20">
                    <div className="text-sm text-blue-700 dark:text-blue-400">
                      Amount:{' '}
                      <span className="font-amount font-bold">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              {paymentMode === 'card' && (
                <div className="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-900/20">
                  <div className="text-sm text-purple-700 dark:text-purple-400">
                    Swipe/Tap card for{' '}
                    <span className="font-amount font-bold">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              )}

              {paymentMode === 'credit' && (
                <div className="space-y-2">
                  {/* Quick Add Customer inline */}
                  {!localCustomerId && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800 p-3 space-y-2">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5" />
                        {qcAdded ? 'Customer linked' : 'Quick-add customer for credit'}
                      </p>
                      {qcAdded ? (
                        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 py-0.5">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            {localCustomerName} â€” {localCustomerPhone}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                            Search by name or phone. If no match, add new customer.
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                              <Input
                                value={qcName}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setQcName(value)
                                  setQcAdded(false)
                                  setLocalCustomerId(null)
                                  qcLookup.handleQueryChange(value)
                                }}
                                placeholder="Customer name"
                                className="h-9 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Tab') {
                                    e.preventDefault()
                                    ;(
                                      e.currentTarget.nextElementSibling as HTMLInputElement
                                    )?.focus()
                                    return
                                  }
                                  qcLookup.handleKeyDown(e)
                                }}
                              />
                              {qcLookup.showResults && qcLookup.results.length > 0 && (
                                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-44 overflow-auto rounded-lg border border-border/60 bg-popover/95 shadow-xl">
                                  {qcLookup.results.map((c, idx) => (
                                    <button
                                      key={c.id}
                                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                                        idx === qcLookup.selectedIndex
                                          ? 'bg-accent'
                                          : 'hover:bg-accent/50'
                                      }`}
                                      onMouseEnter={() => qcLookup.setSelectedIndex(idx)}
                                      onMouseDown={(e) => {
                                        e.preventDefault()
                                        qcLookup.selectResult(c)
                                      }}
                                    >
                                      <div>
                                        <div className="font-medium">{c.name}</div>
                                        <div className="text-[11px] text-muted-foreground">
                                          {c.phone?.startsWith('__NOPHONE__') ? '' : c.phone}
                                        </div>
                                      </div>
                                      {c.currentBalance > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] border-orange-400 text-orange-600"
                                        >
                                          â‚¹{c.currentBalance.toLocaleString('en-IN')}
                                        </Badge>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Input
                              type="tel"
                              value={qcPhone}
                              onChange={(e) =>
                                ((): void => {
                                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                                  setQcPhone(digits)
                                  if (digits.length >= 2) {
                                    qcLookup.handleQueryChange(digits)
                                  } else {
                                    qcLookup.clearResults()
                                    qcLookup.setShowResults(false)
                                  }
                                })()
                              }
                              placeholder="Phone number"
                              className="h-9 text-sm"
                              onKeyDown={(e) => {
                                if (
                                  e.key === 'Enter' &&
                                  !qcLookup.showResults &&
                                  qcLookup.results.length === 0
                                ) {
                                  e.preventDefault()
                                  void createQcCustomer()
                                }
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground">
                              Suggestions appear as you type
                            </p>
                            <Button
                              size="sm"
                              className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                              disabled={
                                qcLookup.showResults ||
                                qcLookup.results.length > 0 ||
                                !qcName.trim() ||
                                qcPhone.length !== 10 ||
                                qcSaving
                              }
                              onClick={createQcCustomer}
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              {qcSaving ? '...' : 'Add New'}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className="rounded-lg bg-yellow-50 p-3 text-center dark:bg-yellow-900/20">
                    <div className="text-sm text-yellow-700 dark:text-yellow-400">
                      {localCustomerName ? (
                        <>
                          <span className="font-amount font-bold">
                            {formatCurrency(grandTotal)}
                          </span>{' '}
                          will be added to <strong>{localCustomerName}</strong>&apos;s credit
                          balance
                        </>
                      ) : (
                        <span className="text-destructive font-medium">
                          Warning: Customer name is required for credit sales
                        </span>
                      )}
                    </div>
                  </div>
                  {creditWarning && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-center">
                      <div className="text-sm text-destructive font-medium">
                        Warning: {creditWarning}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} className="rounded-lg">
                Cancel
              </Button>
              <Button
                onClick={handlePay}
                disabled={processing}
                className={`gap-2 rounded-lg shadow-md min-w-[160px] transition-all duration-300 ${getPayButtonStyles(paymentMode)}`}
              >
                <Printer className="h-4 w-4" />
                {processing ? 'Processing...' : 'Complete & Print'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
