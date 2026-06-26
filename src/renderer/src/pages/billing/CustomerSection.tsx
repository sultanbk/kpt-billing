import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Search, User, UserPlus, Smartphone, X, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { toast } from 'sonner'
import { useSearchLookup } from '../../hooks/useSearchLookup'
import { customersService } from '../../services/customers.service'
import type { Customer } from '@shared/types'

export function CustomerSection({
  customerName,
  customerPhone,
  customerId,
  onSelect,
  openQuickAdd,
  onQuickAddOpened
}: {
  customerName: string
  customerPhone: string
  customerId: number | null
  onSelect: (name: string, phone: string, id: number | null) => void
  openQuickAdd?: boolean
  onQuickAddOpened?: () => void
}): React.JSX.Element {
  const [isLinked, setIsLinked] = useState(!!customerId)
  const [customerBalance, setCustomerBalance] = useState<number | null>(null)
  const customerLookup = useSearchLookup<Customer>({
    search: (term) => customersService.search(term),
    onSelect: (customer) => selectCustomer(customer),
    minQueryLength: 2,
    maxResults: 8,
    enableKeyboard: true,
    clearOnSelect: true
  })

  // Fetch outstanding balance when a linked customer is selected
  useEffect(() => {
    if (customerId) {
      customersService.getById(Number(customerId)).then((c) => {
        setCustomerBalance(c?.currentBalance ?? 0)
      })
    } else {
      setCustomerBalance(null)
    }
  }, [customerId])

  // Quick Add Customer state
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [addingCustomer, setAddingCustomer] = useState(false)
  const quickAddNameRef = useRef<HTMLInputElement>(null)

  // Sync isLinked if external clear
  useEffect(() => {
    setIsLinked(!!customerId || !!customerName)
  }, [customerId, customerName])

  // Open quick-add from parent (Alt+N shortcut)
  useEffect(() => {
    if (openQuickAdd) {
      setShowQuickAdd(true)
      onQuickAddOpened?.()
      setTimeout(() => quickAddNameRef.current?.focus(), 100)
    }
  }, [openQuickAdd, onQuickAddOpened])

  function selectCustomer(c: Customer): void {
    onSelect(c.name, c.phone?.startsWith('__NOPHONE__') ? '' : c.phone || '', c.id)
    setIsLinked(true)
  }

  const clearCustomer = (): void => {
    onSelect('', '', null)
    setIsLinked(false)
    customerLookup.setQuery('')
  }

  return (
    <div className="border-b border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Customer</span>
        </div>
        <div className="flex items-center gap-2">
          {!showQuickAdd && (
            <button
              onClick={() => {
                setShowQuickAdd(true)
                setTimeout(() => quickAddNameRef.current?.focus(), 100)
              }}
              className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <UserPlus className="h-3 w-3" />
              New
            </button>
          )}
          {isLinked && (
            <button
              onClick={clearCustomer}
              className="text-[10px] text-destructive hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Customer Inline Form */}
      {showQuickAdd && (
        <div className="mb-2 rounded-xl border border-primary/30 bg-gradient-to-b from-primary/5 to-primary/[0.02] p-3 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
                <UserPlus className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-semibold text-primary">New Customer</span>
            </div>
            <button
              onClick={() => {
                setShowQuickAdd(false)
                setNewName('')
                setNewPhone('')
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                ref={quickAddNameRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Customer name *"
                className="h-8 text-xs pl-7 bg-background/80 focus:bg-background transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    document.getElementById('quick-add-customer-save')?.click()
                  }
                  if (e.key === 'Escape') {
                    setShowQuickAdd(false)
                    setNewName('')
                    setNewPhone('')
                  }
                }}
              />
            </div>
            <div className="relative">
              <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="h-8 text-xs pl-7 bg-background/80 focus:bg-background transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    document.getElementById('quick-add-customer-save')?.click()
                  }
                  if (e.key === 'Escape') {
                    setShowQuickAdd(false)
                    setNewName('')
                    setNewPhone('')
                  }
                }}
              />
            </div>
          </div>
          <Button
            id="quick-add-customer-save"
            size="sm"
            className="w-full h-8 text-xs gap-1.5 rounded-lg shadow-sm"
            disabled={!newName.trim() || addingCustomer}
            onClick={async () => {
              if (!newName.trim()) return
              setAddingCustomer(true)
              try {
                const created = await customersService.create({
                  name: newName.trim(),
                  phone: newPhone.trim()
                })
                onSelect(
                  created.name,
                  created.phone?.startsWith('__NOPHONE__') ? '' : created.phone || '',
                  created.id
                )
                setIsLinked(true)
                toast.success(`Customer "${created.name}" added & selected`)
                setShowQuickAdd(false)
                setNewName('')
                setNewPhone('')
              } catch (err: unknown) {
                toast.error(
                  'Failed to add customer: ' +
                    (err instanceof Error ? err.message : 'Unknown error')
                )
              } finally {
                setAddingCustomer(false)
              }
            }}
          >
            <UserPlus className="h-3 w-3" />
            {addingCustomer ? 'Adding...' : 'Add & Select'}
          </Button>
        </div>
      )}

      {isLinked && customerName ? (
        <div className="space-y-1.5">
          <div className="rounded-md bg-accent/50 px-3 py-2 text-sm">
            <div className="font-medium">{customerName}</div>
            {customerPhone && <div className="text-xs text-muted-foreground">{customerPhone}</div>}
          </div>
          {customerBalance !== null && customerBalance > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-2 dark:border-orange-800 dark:bg-orange-900/20">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
              <span className="text-xs text-orange-700 dark:text-orange-400">
                Outstanding:{' '}
                <strong className="font-amount font-semibold">
                  {formatCurrency(customerBalance)}
                </strong>
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={customerLookup.query}
            onChange={(e) => customerLookup.handleQueryChange(e.target.value)}
            onFocus={() => customerLookup.results.length > 0 && customerLookup.setShowResults(true)}
            onBlur={() => setTimeout(() => customerLookup.setShowResults(false), 200)}
            placeholder="Search customer or type name..."
            className="h-8 pl-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                customerLookup.setShowResults(false)
                return
              }
              customerLookup.handleKeyDown(e)
            }}
          />

          {customerLookup.showResults && customerLookup.results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-md border border-border bg-popover shadow-lg">
              {customerLookup.results.map((c, idx) => (
                <button
                  key={c.id}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                    idx === customerLookup.selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  onMouseEnter={() => customerLookup.setSelectedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    customerLookup.selectResult(c)
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
                      ₹{c.currentBalance.toLocaleString('en-IN')}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Manual entry fallback */}
          {!customerLookup.showResults &&
            customerLookup.query.length >= 2 &&
            customerLookup.results.length === 0 && (
              <button
                className="mt-1 w-full rounded-md border border-dashed border-border px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
                onClick={() => {
                  onSelect(customerLookup.query, '', null)
                  customerLookup.setQuery('')
                  setIsLinked(true)
                }}
              >
                + Add as &quot;{customerLookup.query}&quot; (walk-in)
              </button>
            )}
        </div>
      )}

      {/* Phone input when customer linked by name without phone */}
      {isLinked && customerName && !customerPhone && !customerId && (
        <Input
          placeholder="Phone number (optional)"
          onChange={(e) => onSelect(customerName, e.target.value, null)}
          className="mt-2 h-7 text-xs"
        />
      )}
    </div>
  )
}
