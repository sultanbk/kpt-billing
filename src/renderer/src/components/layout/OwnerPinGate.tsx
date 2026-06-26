import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import { ShieldAlert, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { authService } from '../../services/auth.service'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'

interface OwnerPinGateProps {
  children: React.ReactNode
}

export function OwnerPinGate({ children }: OwnerPinGateProps): React.JSX.Element {
  const { user } = useAuthStore()
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role === 'owner') {
      setAuthorized(true)
    }
  }, [user])

  useEffect(() => {
    if (!authorized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [authorized])

  const handleVerify = useCallback(async () => {
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
          setAuthorized(true)
          setPin('')
          setError('')
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
  }, [pin])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleVerify()
      }
    },
    [handleVerify]
  )

  if (authorized) {
    return <>{children}</>
  }

  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg">
        {/* Shield Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <ShieldAlert className="h-8 w-8 text-amber-600 animate-pulse" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold">Owner Authentication</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Restricted area. Enter Owner PIN to unlock.
            </p>
          </div>
        </div>

        {/* PIN Input */}
        <div className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setPin(val)
                setError('')
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter Owner PIN"
              maxLength={8}
              className="h-14 w-full rounded-lg border border-border bg-background px-4 text-center text-2xl font-bold tracking-[0.5em] placeholder:text-sm placeholder:tracking-normal placeholder:font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoComplete="off"
              disabled={verifying}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {error && <p className="text-center text-sm text-destructive font-medium">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={verifying || pin.length < 4}
            className="h-12 w-full rounded-lg bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? 'Verifying...' : 'Authorize'}
          </button>

          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="w-full gap-2 text-xs text-muted-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Go Back to Billing
          </Button>
        </div>
      </div>
    </div>
  )
}
