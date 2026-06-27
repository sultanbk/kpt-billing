import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { Textarea } from '../../components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu'
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  Edit,
  MoreHorizontal,
  ShoppingCart,
  AlertTriangle,
  FileDown,
  Eye,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  Trash2
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../lib/utils'
import { toast } from 'sonner'
import type {
  Customer,
  Bill,
  CustomerFormData,
  CreditPayment,
  CreditPaymentCreateData,
  CreditLedgerEntry
} from '@shared/types'
import { billingService } from '../../services/billing.service'
import { creditService } from '../../services/credit.service'
import { customersService } from '../../services/customers.service'
import { exportService } from '../../services/export.service'
import { whatsappService } from '../../services/whatsapp.service'
import { FeatureGate } from '../../components/license'

const EMPTY_FORM: CustomerFormData = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  gstin: '',
  customerType: 'regular',
  creditLimit: 0
}

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' }
] as const

export default function CustomersPage(): React.JSX.Element {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerBills, setCustomerBills] = useState<Bill[]>([])
  const [creditLedger, setCreditLedger] = useState<CreditLedgerEntry[]>([])
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>([])
  const [formData, setFormData] = useState<CustomerFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [totalCredit, setTotalCredit] = useState(0)
  const [creditCustomers, setCreditCustomers] = useState<Customer[]>([])

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<CreditPaymentCreateData['paymentMode']>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const [all, credit, total] = await Promise.all([
        customersService.getAll(),
        customersService.getWithCredit(),
        customersService.getTotalCredit()
      ])
      setCustomers(all)
      setCreditCustomers(credit)
      setTotalCredit(total)
    } catch {
      toast.error('Failed to load customers')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const filteredCustomers = customers.filter((c) => {
    const matchSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchType =
      filterType === 'all' || filterType === 'credit' || c.customerType === filterType
    const matchCredit = filterType !== 'credit' || c.currentBalance > 0

    return matchSearch && matchType && matchCredit
  })

  const openAddDialog = (): void => {
    setEditingCustomer(null)
    setFormData(EMPTY_FORM)
    setShowFormDialog(true)
  }

  const openEditDialog = (customer: Customer): void => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      gstin: customer.gstin || '',
      customerType: customer.customerType || 'regular',
      creditLimit: customer.creditLimit || 0
    })
    setShowFormDialog(true)
  }

  const openDetailDialog = async (customer: Customer): Promise<void> => {
    setSelectedCustomer(customer)
    setShowDetailDialog(true)
    try {
      const [bills, ledger, payments] = await Promise.all([
        billingService.getBillsByCustomer(customer.id, 50),
        creditService.getLedger(customer.id),
        creditService.getByCustomer(customer.id, 50)
      ])
      setCustomerBills(bills)
      setCreditLedger(ledger)
      setCreditPayments(payments)
    } catch {
      setCustomerBills([])
      setCreditLedger([])
      setCreditPayments([])
    }
  }

  const openPaymentDialog = (customer: Customer): void => {
    setSelectedCustomer(customer)
    setPaymentAmount('')
    setPaymentMode('cash')
    setPaymentReference('')
    setPaymentNotes('')
    setShowPaymentDialog(true)
  }

  const handleCollectPayment = async (): Promise<void> => {
    if (!selectedCustomer) return
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (amount > selectedCustomer.currentBalance) {
      toast.error(
        `Amount ${formatCurrency(amount)} exceeds outstanding balance ${formatCurrency(selectedCustomer.currentBalance)}`
      )
      return
    }

    setProcessingPayment(true)
    try {
      await creditService.recordPayment({
        customerId: selectedCustomer.id,
        amount,
        paymentMode,
        referenceNo: paymentReference || undefined,
        notes: paymentNotes || undefined
      })

      const balanceAfter = Math.round((selectedCustomer.currentBalance - amount) * 100) / 100

      // Show success with WhatsApp option if phone is available
      if (selectedCustomer.phone && selectedCustomer.phone.length >= 10) {
        toast.success(`${formatCurrency(amount)} collected from ${selectedCustomer.name}`, {
          duration: 8000,
          action: {
            label: 'WhatsApp Confirmation',
            onClick: () => {
              whatsappService
                .sendPaymentConfirmation(
                  selectedCustomer.phone,
                  selectedCustomer.name,
                  amount,
                  balanceAfter,
                  paymentMode,
                  new Date().toISOString().split('T')[0]
                )
                .then((res) => {
                  if (!res.success) toast.error(res.error || 'Failed to open WhatsApp')
                })
            }
          }
        })
      } else {
        toast.success(
          `${formatCurrency(amount)} collected from ${selectedCustomer.name}. Balance: ${formatCurrency(balanceAfter)}`
        )
      }
      setShowPaymentDialog(false)
      loadCustomers()

      // Refresh detail dialog if open
      if (showDetailDialog && selectedCustomer) {
        const fresh = await customersService.getById(selectedCustomer.id)
        if (fresh) {
          setSelectedCustomer(fresh)
          const [ledger, payments] = await Promise.all([
            creditService.getLedger(fresh.id),
            creditService.getByCustomer(fresh.id, 50)
          ])
          setCreditLedger(ledger)
          setCreditPayments(payments)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment failed'
      toast.error(msg)
    }
    setProcessingPayment(false)
  }

  const handleDeletePayment = async (paymentId: number): Promise<void> => {
    if (!confirm('Delete this payment? The amount will be added back to the customer balance.'))
      return
    try {
      await creditService.deletePayment(paymentId)
      toast.success('Payment deleted and balance restored')
      loadCustomers()
      if (selectedCustomer) {
        const fresh = await customersService.getById(selectedCustomer.id)
        if (fresh) {
          setSelectedCustomer(fresh)
          const [ledger, payments] = await Promise.all([
            creditService.getLedger(fresh.id),
            creditService.getByCustomer(fresh.id, 50)
          ])
          setCreditLedger(ledger)
          setCreditPayments(payments)
        }
      }
    } catch {
      toast.error('Failed to delete payment')
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone are required')
      return
    }

    if (formData.phone.length < 10) {
      toast.error('Phone number must be at least 10 digits')
      return
    }

    setSaving(true)
    try {
      if (editingCustomer) {
        await customersService.update(editingCustomer.id, formData)
        toast.success('Customer updated')
      } else {
        await customersService.create(formData)
        toast.success('Customer added')
      }
      setShowFormDialog(false)
      loadCustomers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      toast.error(msg)
    }
    setSaving(false)
  }

  const handleExport = async (): Promise<void> => {
    try {
      const result = await exportService.customerReport()
      if (result.success && result.path) {
        toast.success(`Exported to ${result.path}`)
      }
    } catch {
      toast.error('Export failed')
    }
  }

  const handlePayFull = (): void => {
    if (selectedCustomer) {
      setPaymentAmount(String(selectedCustomer.currentBalance))
    }
  }

  return (
    <div className="h-full overflow-auto page-enter">
      <div className="space-y-6 p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage customers, credit &amp; payment collection
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Customers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Credit Outstanding
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-amount text-destructive">
                {formatCurrency(totalCredit)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Credit Accounts
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creditCustomers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="wholesale">Wholesale</SelectItem>
              <SelectItem value="walkin">Walk-in</SelectItem>
              <SelectItem value="credit">With Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Customer Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Credit Balance</TableHead>
                  <TableHead className="text-right">Credit Limit</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      {searchTerm
                        ? 'No customers found'
                        : 'No customers yet. Add your first customer!'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="cursor-pointer hover:bg-accent/50">
                      <TableCell>
                        <button className="text-left" onClick={() => openDetailDialog(customer)}>
                          <div className="font-medium">{customer.name}</div>
                          {customer.email && (
                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{customer.phone}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            customer.customerType === 'wholesale'
                              ? 'default'
                              : customer.customerType === 'walkin'
                                ? 'outline'
                                : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {customer.customerType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{customer.city || '-'}</TableCell>
                      <TableCell className="text-right">
                        {customer.currentBalance > 0 ? (
                          <span className="font-amount font-medium text-destructive">
                            {formatCurrency(customer.currentBalance)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-amount text-sm">
                        {customer.creditLimit ? formatCurrency(customer.creditLimit) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailDialog(customer)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(customer)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {customer.currentBalance > 0 && (
                              <DropdownMenuItem onClick={() => openPaymentDialog(customer)}>
                                <Banknote className="mr-2 h-4 w-4" />
                                Collect Payment
                              </DropdownMenuItem>
                            )}
                            {customer.currentBalance > 0 &&
                              customer.phone &&
                              customer.phone.length >= 10 && (
                                <FeatureGate feature="whatsappIntegration" silent>
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      const res = await whatsappService.sendCreditReminder(
                                        customer.phone,
                                        customer.name,
                                        customer.currentBalance
                                      )
                                      if (res.success) {
                                        toast.success('WhatsApp opened with reminder')
                                      } else {
                                        toast.error(res.error || 'Failed')
                                      }
                                    }}
                                  >
                                    <span className="mr-2">ðŸ“±</span>
                                    WhatsApp Reminder
                                  </DropdownMenuItem>
                                </FeatureGate>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ==================== ADD / EDIT CUSTOMER DIALOG ==================== */}
        <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? 'Update customer details below.'
                  : 'Fill in customer details to add a new customer.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Customer name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="10-digit phone"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={formData.gstin}
                    onChange={(e) =>
                      setFormData({ ...formData, gstin: e.target.value.toUpperCase() })
                    }
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="type">Customer Type</Label>
                  <Select
                    value={formData.customerType}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        customerType: v as 'regular' | 'wholesale' | 'walkin'
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                      <SelectItem value="walkin">Walk-in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="creditLimit">Credit Limit (â‚¹)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={formData.creditLimit || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0 = no limit"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFormDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingCustomer ? 'Update' : 'Add Customer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== COLLECT PAYMENT DIALOG ==================== */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-green-600" />
                Collect Credit Payment
              </DialogTitle>
              <DialogDescription>
                Record a credit clearance payment from <strong>{selectedCustomer?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            {selectedCustomer && (
              <div className="space-y-4 py-2">
                {/* Balance info */}
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Outstanding Balance</span>
                    <span className="text-xl font-bold font-amount text-destructive">
                      {formatCurrency(selectedCustomer.currentBalance)}
                    </span>
                  </div>
                  {selectedCustomer.creditLimit != null && selectedCustomer.creditLimit > 0 && (
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Credit Limit</span>
                      <span className="font-amount">
                        {formatCurrency(selectedCustomer.creditLimit)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label htmlFor="payAmount">
                    Amount (â‚¹) <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="payAmount"
                      type="number"
                      step="0.01"
                      min="1"
                      max={selectedCustomer.currentBalance}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="font-amount text-lg"
                      autoFocus
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePayFull}
                      className="whitespace-nowrap text-xs"
                    >
                      Full Amount
                    </Button>
                  </div>
                  {paymentAmount && parseFloat(paymentAmount) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Balance after payment:{' '}
                      <span className="font-amount font-medium">
                        {formatCurrency(
                          Math.max(0, selectedCustomer.currentBalance - parseFloat(paymentAmount))
                        )}
                      </span>
                      {parseFloat(paymentAmount) >= selectedCustomer.currentBalance && (
                        <Badge variant="default" className="ml-2 text-[10px]">
                          FULLY CLEARED
                        </Badge>
                      )}
                    </p>
                  )}
                </div>

                {/* Payment Mode */}
                <div className="space-y-1.5">
                  <Label>Payment Mode</Label>
                  <Select
                    value={paymentMode}
                    onValueChange={(v) =>
                      setPaymentMode(v as CreditPaymentCreateData['paymentMode'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reference (for UPI/Cheque/Bank) */}
                {(paymentMode === 'upi' ||
                  paymentMode === 'cheque' ||
                  paymentMode === 'bank_transfer') && (
                  <div className="space-y-1.5">
                    <Label htmlFor="payRef">
                      {paymentMode === 'upi'
                        ? 'UPI Reference / Transaction ID'
                        : paymentMode === 'cheque'
                          ? 'Cheque Number'
                          : 'Transaction Reference'}
                    </Label>
                    <Input
                      id="payRef"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder={
                        paymentMode === 'upi'
                          ? 'UPI transaction ID'
                          : paymentMode === 'cheque'
                            ? 'Cheque no.'
                            : 'Bank ref no.'
                      }
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="payNotes">Notes (optional)</Label>
                  <Input
                    id="payNotes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Partial settlement for Feb bills"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCollectPayment}
                disabled={processingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {processingPayment ? 'Processing...' : 'Collect Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== CUSTOMER DETAIL DIALOG ==================== */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Users className="h-5 w-5" />
                {selectedCustomer?.name}
              </DialogTitle>
              <DialogDescription>
                Customer details, credit ledger &amp; purchase history
              </DialogDescription>
            </DialogHeader>

            {selectedCustomer && (
              <Tabs defaultValue="info" className="mt-2">
                <TabsList>
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="ledger">
                    Credit Ledger
                    {selectedCustomer.currentBalance > 0 && (
                      <Badge variant="destructive" className="ml-1.5 text-[9px] px-1.5 py-0">
                        {formatCurrency(selectedCustomer.currentBalance)}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="history">Bills</TabsTrigger>
                </TabsList>

                {/* ============= INFO TAB ============= */}
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCustomer.email}</span>
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div className="flex items-center gap-2 text-sm col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>
                          {selectedCustomer.address}
                          {selectedCustomer.city && `, ${selectedCustomer.city}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Type</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge>{selectedCustomer.customerType}</Badge>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">
                          Credit Balance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <span
                          className={`text-lg font-bold font-amount ${selectedCustomer.currentBalance > 0 ? 'text-destructive' : 'text-green-600'}`}
                        >
                          {selectedCustomer.currentBalance > 0
                            ? formatCurrency(selectedCustomer.currentBalance)
                            : 'No dues'}
                        </span>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">
                          Credit Limit
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <span className="text-lg font-bold font-amount">
                          {selectedCustomer.creditLimit
                            ? formatCurrency(selectedCustomer.creditLimit)
                            : 'N/A'}
                        </span>
                      </CardContent>
                    </Card>
                    {selectedCustomer.gstin && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground">GSTIN</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <span className="text-sm font-mono">{selectedCustomer.gstin}</span>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Quick Collect Button */}
                  {selectedCustomer.currentBalance > 0 && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setShowDetailDialog(false)
                          openPaymentDialog(selectedCustomer)
                        }}
                      >
                        <Banknote className="mr-2 h-4 w-4" />
                        Collect Payment ({formatCurrency(selectedCustomer.currentBalance)}{' '}
                        outstanding)
                      </Button>
                      {selectedCustomer.phone && selectedCustomer.phone.length >= 10 && (
                        <FeatureGate feature="whatsappIntegration" silent>
                          <Button
                            variant="outline"
                            className="border-green-500 text-green-600 hover:bg-green-50"
                            onClick={async () => {
                              const res = await whatsappService.sendCreditReminder(
                                selectedCustomer.phone,
                                selectedCustomer.name,
                                selectedCustomer.currentBalance
                              )
                              if (res.success) {
                                toast.success('WhatsApp opened with reminder')
                              } else {
                                toast.error(res.error || 'Failed to open WhatsApp')
                              }
                            }}
                          >
                            ðŸ“± Remind
                          </Button>
                        </FeatureGate>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Customer since: {formatDate(selectedCustomer.createdAt)}
                  </div>
                </TabsContent>

                {/* ============= CREDIT LEDGER TAB ============= */}
                <TabsContent value="ledger" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <IndianRupee className="h-4 w-4" />
                          Credit Ledger
                        </CardTitle>
                        {selectedCustomer.currentBalance > 0 && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setShowDetailDialog(false)
                              openPaymentDialog(selectedCustomer)
                            }}
                          >
                            <Banknote className="mr-2 h-4 w-4" />
                            Collect
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead className="text-right text-destructive">
                              Credit (+)
                            </TableHead>
                            <TableHead className="text-right text-green-600">Paid (-)</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {creditLedger.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="h-20 text-center text-muted-foreground"
                              >
                                No credit transactions
                              </TableCell>
                            </TableRow>
                          ) : (
                            creditLedger.map((entry, idx) => (
                              <TableRow key={`${entry.type}-${entry.id}-${idx}`}>
                                <TableCell className="text-sm">{formatDate(entry.date)}</TableCell>
                                <TableCell>
                                  {entry.type === 'credit' ? (
                                    <span className="flex items-center text-xs text-destructive">
                                      <ArrowUpCircle className="mr-1 h-3.5 w-3.5" />
                                      Credit
                                    </span>
                                  ) : (
                                    <span className="flex items-center text-xs text-green-600">
                                      <ArrowDownCircle className="mr-1 h-3.5 w-3.5" />
                                      Payment
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm max-w-[200px] truncate">
                                  {entry.description}
                                  {entry.referenceNo && (
                                    <span className="ml-1 text-xs text-muted-foreground">
                                      (Ref: {entry.referenceNo})
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {entry.paymentMode && (
                                    <Badge variant="secondary" className="text-[10px] uppercase">
                                      {entry.paymentMode.replace('_', ' ')}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-amount">
                                  {entry.type === 'credit' ? (
                                    <span className="text-destructive">
                                      +{formatCurrency(entry.amount)}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-amount">
                                  {entry.type === 'payment' ? (
                                    <span className="text-green-600">
                                      -{formatCurrency(entry.amount)}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-amount font-medium">
                                  {formatCurrency(entry.balance)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ============= PAYMENTS TAB ============= */}
                <TabsContent value="payments" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          Credit Payments ({creditPayments.length})
                        </CardTitle>
                        {selectedCustomer.currentBalance > 0 && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setShowDetailDialog(false)
                              openPaymentDialog(selectedCustomer)
                            }}
                          >
                            <Banknote className="mr-2 h-4 w-4" />
                            Collect
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="text-right">Bal. Before</TableHead>
                            <TableHead className="text-right">Bal. After</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {creditPayments.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                className="h-20 text-center text-muted-foreground"
                              >
                                No payments recorded yet
                              </TableCell>
                            </TableRow>
                          ) : (
                            creditPayments.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell className="text-sm">{formatDate(p.date)}</TableCell>
                                <TableCell className="text-right font-amount font-bold text-green-600">
                                  {formatCurrency(p.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-[10px] uppercase">
                                    {p.paymentMode.replace('_', ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs font-mono">
                                  {p.referenceNo || '-'}
                                </TableCell>
                                <TableCell className="text-right font-amount text-sm">
                                  {formatCurrency(p.balanceBefore)}
                                </TableCell>
                                <TableCell className="text-right font-amount text-sm">
                                  {p.balanceAfter === 0 ? (
                                    <Badge variant="default" className="text-[10px] bg-green-600">
                                      CLEARED
                                    </Badge>
                                  ) : (
                                    formatCurrency(p.balanceAfter)
                                  )}
                                </TableCell>
                                <TableCell className="text-xs max-w-[120px] truncate">
                                  {p.notes || '-'}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    onClick={() => handleDeletePayment(p.id)}
                                    title="Delete payment"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ============= BILL HISTORY TAB ============= */}
                <TabsContent value="history" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Recent Purchases ({customerBills.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Bill No.</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerBills.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="h-20 text-center text-muted-foreground"
                              >
                                No purchase history
                              </TableCell>
                            </TableRow>
                          ) : (
                            customerBills.map((bill) => (
                              <TableRow key={bill.id}>
                                <TableCell className="font-mono text-xs">
                                  {bill.billNumber || bill.billNo}
                                </TableCell>
                                <TableCell className="text-sm">{formatDate(bill.date)}</TableCell>
                                <TableCell>{bill.totalItems}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {bill.paymentMode?.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-amount text-sm">
                                  {bill.creditAmount > 0 ? (
                                    <span className="text-destructive">
                                      {formatCurrency(bill.creditAmount)}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      bill.status === 'completed'
                                        ? 'default'
                                        : bill.status === 'returned'
                                          ? 'destructive'
                                          : 'outline'
                                    }
                                    className="text-[10px]"
                                  >
                                    {bill.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-amount font-medium">
                                  {formatCurrency(bill.grandTotal)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
