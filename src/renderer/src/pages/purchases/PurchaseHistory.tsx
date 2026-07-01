import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog'
import { Eye, Trash2, Truck } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { toast } from 'sonner'
import { suppliersService } from '../../services/suppliers.service'
import type { Supplier } from '@shared/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Purchase = any

export function PurchaseHistory({
  purchases,
  onView,
  onDelete
}: {
  purchases: Purchase[]
  onView: (id: number) => void
  onDelete: (id: number) => void
  onRefresh: () => void
}): React.JSX.Element {
  return (
    <div className="flex-1 overflow-auto p-4">
      {purchases.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <Truck className="mb-3 h-12 w-12 opacity-20" />
          <p className="text-lg font-medium">No purchases recorded yet</p>
          <p className="text-sm">
            Switch to &quot;New Purchase&quot; to record your first stock-in
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {purchases.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">{p.purchaseNo}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.date}
                    {p.supplierName && ` • ${p.supplierName}`}
                    {p.city && ` • ${p.city}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(p.grandTotal)}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.totalItems} items • {p.totalQty} qty
                  </div>
                </div>
                <Badge
                  variant={p.paymentStatus === 'paid' ? 'default' : 'destructive'}
                  className="capitalize"
                >
                  {p.paymentStatus}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => onView(p.id)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => onDelete(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- New Supplier Dialog ----
export function NewSupplierDialog({
  open,
  defaultCity,
  onClose,
  onCreated
}: {
  open: boolean
  defaultCity: string
  onClose: () => void
  onCreated: (supplier: Supplier) => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [dialogCity, setDialogCity] = useState(defaultCity)
  const [address, setAddress] = useState('')
  const [gstin, setGstin] = useState('')

  useEffect(() => {
    if (open) setDialogCity(defaultCity)
  }, [open, defaultCity])

  const handleCreate = async (): Promise<void> => {
    if (!name.trim()) {
      toast.error('Supplier name is required')
      return
    }
    try {
      const supplier = await suppliersService.create({
        name: name.trim(),
        phone: phone || undefined,
        city: dialogCity || undefined,
        address: address || undefined,
        gstin: gstin || undefined
      })
      onCreated(supplier)
      // Reset
      setName('')
      setPhone('')
      setDialogCity('')
      setAddress('')
      setGstin('')
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
          <DialogDescription>
            Add a supplier from any city (Surat, Bengaluru, etc.)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Supplier name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={dialogCity}
                onChange={(e) => setDialogCity(e.target.value)}
                placeholder="Surat, Bengaluru..."
              />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
            />
          </div>
          <div>
            <Label>GSTIN</Label>
            <Input
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="GSTIN number"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Supplier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
