import { useMemo, useState } from 'react'
import {
  CreditCard,
  Download,
  Edit,
  Lock,
  Plus,
  Printer,
  Trash2,
  Unlock,
  Shield,
  Wallet
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Badge } from '../../../components/ui/badge'
import { authService } from '../../../services/auth.service'
import { printerService } from '../../../services/printer.service'
import {
  parsePaymentMethods,
  serializePaymentMethods,
  syncDefaultPaymentMethod
} from '../settings-model'
import type { PaymentMethod, SettingsMap, UpdateSetting } from '../types'
import { Field, SettingsSection } from './SettingsFields'

const EMPTY_METHOD: PaymentMethod = {
  id: '',
  type: 'upi',
  name: '',
  isDefaultBilling: false,
  details: {}
}

export function PaymentsTab({
  settings,
  updateSetting
}: {
  settings: SettingsMap
  updateSetting: UpdateSetting
}): React.JSX.Element {
  const methods = useMemo(() => parsePaymentMethods(settings), [settings])
  const [unlocked, setUnlocked] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [busyMethodId, setBusyMethodId] = useState<string | null>(null)

  const persistMethods = (nextMethods: PaymentMethod[]): void => {
    const serialized = serializePaymentMethods(nextMethods)
    updateSetting('paymentMethods', serialized.paymentMethods)
    updateSetting('upiVpa', serialized.upiVpa)
    updateSetting('upiPayeeName', serialized.upiPayeeName)
  }

  const verifyOwner = async (): Promise<void> => {
    setVerifying(true)
    setPinError('')
    try {
      const result = await authService.verifyPin(pin)
      if (result.success && result.user?.role === 'owner') {
        setUnlocked(true)
        setVerifyOpen(false)
        setPin('')
        toast.success('Payment settings unlocked')
      } else {
        setPinError(result.error || 'Owner PIN required')
      }
    } catch {
      setPinError('Could not verify PIN')
    } finally {
      setVerifying(false)
    }
  }

  const saveMethod = (method: PaymentMethod): void => {
    const normalized: PaymentMethod = {
      ...method,
      id: method.id || `pm-${Date.now()}`,
      name: method.name.trim(),
      isDefaultBilling:
        method.type === 'upi' || method.type === 'scanner' ? method.isDefaultBilling : false
    }
    if (!normalized.name) {
      toast.error('Payment method name is required')
      return
    }
    if (normalized.type === 'bank' && !normalized.details.accountNo?.trim()) {
      toast.error('Bank account number is required')
      return
    }
    if (normalized.type !== 'bank' && !normalized.details.upiVpa?.trim()) {
      toast.error('UPI ID is required')
      return
    }

    const withoutCurrent = methods.filter((methodItem) => methodItem.id !== normalized.id)
    let nextMethods = [...withoutCurrent, normalized]
    if (normalized.isDefaultBilling) {
      nextMethods = syncDefaultPaymentMethod(nextMethods, normalized.id)
    }
    persistMethods(nextMethods)
    setEditing(null)
    toast.success('Payment method updated. Save settings to persist changes.')
  }

  const deleteMethod = (methodId: string): void => {
    persistMethods(methods.filter((method) => method.id !== methodId))
    toast.success('Payment method removed. Save settings to persist changes.')
  }

  const printMethod = async (method: PaymentMethod, mode: 'print' | 'download'): Promise<void> => {
    setBusyMethodId(method.id)
    try {
      const ok =
        mode === 'print'
          ? await printerService.printPaymentDetails(method)
          : await printerService.downloadPaymentDetailsPdf(method)
      toast[ok ? 'success' : 'error'](ok ? 'Payment slip ready' : 'Payment slip failed')
    } catch {
      toast.error('Payment slip failed')
    } finally {
      setBusyMethodId(null)
    }
  }

  if (!unlocked) {
    return (
      <>
        <SettingsSection
          title="Payment Settings"
          description="Owner PIN is required to view or edit payment details."
          icon={<Wallet className="h-4 w-4" />}
        >
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-20" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 shadow-inner">
                <Lock className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h3 className="mt-5 text-sm font-semibold text-foreground">
              Payments Settings Protected
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
              Verification is required to view or edit payment methods. Enter your owner PIN to
              unlock.
            </p>
            <Button
              onClick={() => setVerifyOpen(true)}
              variant="outline"
              className="mt-5 gap-2 rounded-xl hover:bg-primary/5 hover:text-primary transition-all border-primary/20 hover:border-primary/40 h-10 px-5"
            >
              <Shield className="h-4 w-4" />
              Unlock to View &amp; Edit
            </Button>
          </div>
        </SettingsSection>

        {/* Dialog for verifying PIN to unlock UPI */}
        <Dialog
          open={verifyOpen}
          onOpenChange={(open) => {
            setVerifyOpen(open)
            if (!open) {
              setPin('')
              setPinError('')
            }
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Verify Owner PIN
              </DialogTitle>
              <DialogDescription>
                Enter your owner PIN code to access payment settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="upi-pin">Owner PIN</Label>
                <Input
                  id="upi-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ''))
                    setPinError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pin.length >= 4 && !verifying) {
                      verifyOwner()
                    }
                  }}
                  placeholder="••••"
                  className="text-center font-bold tracking-[0.5em] text-lg"
                  autoFocus
                />
                {pinError && (
                  <p className="text-xs text-destructive font-medium mt-1 text-center">
                    {pinError}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setVerifyOpen(false)
                  setPin('')
                  setPinError('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={verifyOwner} disabled={verifying || pin.length < 4}>
                {verifying ? 'Verifying...' : 'Unlock'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <SettingsSection
        title="Payment Methods"
        description="Manage bank, UPI, and scanner details used on receipts."
        icon={<CreditCard className="h-4 w-4" />}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUnlocked(false)} className="rounded-xl">
              <Unlock className="h-4 w-4" />
              Lock
            </Button>
            <Button onClick={() => setEditing({ ...EMPTY_METHOD })} className="rounded-xl">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {methods.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border/60 p-8 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No payment methods configured.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Add a bank account or UPI to get started.
              </p>
            </div>
          )}
          {methods.map((method) => (
            <div
              key={method.id}
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/60 p-5 md:flex-row md:items-center md:justify-between hover:border-border hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    method.type === 'bank'
                      ? 'bg-blue-500/10 text-blue-600'
                      : method.type === 'scanner'
                        ? 'bg-purple-500/10 text-purple-600'
                        : 'bg-green-500/10 text-green-600'
                  }`}
                >
                  {method.type === 'bank' ? (
                    <CreditCard className="h-4 w-4" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-sm">{method.name}</h3>
                    <Badge variant="secondary" className="text-[10px]">
                      {method.type.toUpperCase()}
                    </Badge>
                    {method.isDefaultBilling && (
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        Billing default
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {method.type === 'bank'
                      ? `${method.details.bankName || 'Bank'} - ${method.details.accountNo || 'No account'}`
                      : `${method.details.upiVpa || 'No UPI ID'}${method.details.payeeName ? ` - ${method.details.payeeName}` : ''}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => printMethod(method, 'print')}
                  disabled={busyMethodId === method.id}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => printMethod(method, 'download')}
                  disabled={busyMethodId === method.id}
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setEditing(method)}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => deleteMethod(method.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
      {editing && (
        <PaymentMethodDialog
          method={editing}
          onClose={() => setEditing(null)}
          onSave={saveMethod}
        />
      )}
    </>
  )
}

function PaymentMethodDialog({
  method,
  onClose,
  onSave
}: {
  method: PaymentMethod
  onClose: () => void
  onSave: (method: PaymentMethod) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState<PaymentMethod>(method)
  const setDetail = (key: keyof PaymentMethod['details'], value: string): void => {
    setDraft((current) => ({ ...current, details: { ...current.details, [key]: value } }))
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{method.id ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
          <DialogDescription>
            Configure the payment details printed on receipts and payment slips.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Method Name">
            <Input
              aria-label="Method Name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </Field>
          <Field label="Type">
            <select
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={draft.type}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  type: event.target.value as PaymentMethod['type'],
                  details: {}
                })
              }
            >
              <option value="upi">UPI ID</option>
              <option value="scanner">UPI QR Scanner</option>
              <option value="bank">Bank Account</option>
            </select>
          </Field>
          {draft.type === 'bank' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Account Holder">
                <Input
                  aria-label="Account Holder"
                  value={draft.details.accountName || ''}
                  onChange={(event) => setDetail('accountName', event.target.value)}
                />
              </Field>
              <Field label="Bank Name">
                <Input
                  aria-label="Bank Name"
                  value={draft.details.bankName || ''}
                  onChange={(event) => setDetail('bankName', event.target.value)}
                />
              </Field>
              <Field label="Account Number">
                <Input
                  aria-label="Account Number"
                  value={draft.details.accountNo || ''}
                  onChange={(event) => setDetail('accountNo', event.target.value)}
                />
              </Field>
              <Field label="IFSC">
                <Input
                  aria-label="IFSC"
                  value={draft.details.ifscCode || ''}
                  onChange={(event) => setDetail('ifscCode', event.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Branch">
                <Input
                  aria-label="Branch"
                  value={draft.details.branch || ''}
                  onChange={(event) => setDetail('branch', event.target.value)}
                />
              </Field>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {draft.type === 'scanner' && (
                <Field label="Scanner Brand">
                  <Input
                    aria-label="Scanner Brand"
                    value={draft.details.scannerType || ''}
                    onChange={(event) => setDetail('scannerType', event.target.value)}
                  />
                </Field>
              )}
              <Field label="UPI ID">
                <Input
                  aria-label="UPI ID"
                  value={draft.details.upiVpa || ''}
                  onChange={(event) => setDetail('upiVpa', event.target.value)}
                />
              </Field>
              <Field label="Payee Name">
                <Input
                  aria-label="Payee Name"
                  value={draft.details.payeeName || ''}
                  onChange={(event) => setDetail('payeeName', event.target.value)}
                />
              </Field>
              <label className="flex items-center gap-2 rounded-xl border border-border/60 p-4 text-sm cursor-pointer hover:bg-accent/30 transition-colors">
                <input
                  type="checkbox"
                  checked={!!draft.isDefaultBilling}
                  onChange={(event) =>
                    setDraft({ ...draft, isDefaultBilling: event.target.checked })
                  }
                />
                Use for billing receipt QR codes
              </label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)}>Save Method</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
