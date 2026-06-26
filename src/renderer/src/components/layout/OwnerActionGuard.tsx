import { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ShieldAlert, Eye, EyeOff } from 'lucide-react'
import { authService } from '../../services/auth.service'
import { useAuthStore } from '../../stores/auth.store'

interface OwnerActionGuardProps {
  open: boolean
  onClose: () => void
  onAuthorize: () => void
  actionLabel?: string
}

export function OwnerActionGuard({
  open,
  onClose,
  onAuthorize,
  actionLabel = 'perform this action'
}: OwnerActionGuardProps): React.JSX.Element {
  const { user } = useAuthStore()
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setPin('')
      setError('')
      setShowPin(false)
      // If currently logged in user is owner, bypass immediately
      if (user?.role === 'owner') {
        onAuthorize()
        onClose()
      } else {
        setTimeout(() => inputRef.current?.focus(), 150)
      }
    }
  }, [open, user, onAuthorize, onClose])

  const handleVerify = async (): Promise<void> => {
    if (!pin.trim() || pin.length < 4) {
      setError('Enter at least 4 digits')
      return
    }
    setVerifying(true)
    setError('')
    try {
      const result = await authService.verifyPin(pin)
      if (result.success && result.user) {
        if (result.user.role === 'owner') {
          onAuthorize()
          onClose()
        } else {
          setError('Access denied: Owner PIN required')
          setPin('')
          inputRef.current?.focus()
        }
      } else {
        setError('Incorrect PIN')
        setPin('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Verification failed')
    }
    setVerifying(false)
  }

  // Handle dialog state correctly when closed by clicking outside
  if (user?.role === 'owner') {
    return <></>
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
            Owner PIN Required
          </DialogTitle>
          <DialogDescription>You need owner permissions to {actionLabel}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative">
            <Input
              ref={inputRef}
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setPin(val)
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pin.length >= 4) {
                  e.preventDefault()
                  void handleVerify()
                }
              }}
              placeholder="Enter Owner PIN"
              maxLength={8}
              className="h-12 text-center text-xl font-bold tracking-[0.3em] placeholder:text-sm placeholder:tracking-normal placeholder:font-normal"
              autoComplete="off"
              disabled={verifying}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && <p className="text-center text-xs text-destructive font-medium">{error}</p>}
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={verifying || pin.length < 4}>
            {verifying ? 'Verifying...' : 'Authorize'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
