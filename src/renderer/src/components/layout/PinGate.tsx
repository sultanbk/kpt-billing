import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import { Lock, Eye, EyeOff } from 'lucide-react'

interface PinGateProps {
  children: React.ReactNode
}

export function PinGate({ children }: PinGateProps): React.JSX.Element {
  const { isUnlocked, unlock } = useAuthStore()
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isUnlocked) {
      // Focus the input when shown
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isUnlocked])

  const handleVerify = useCallback(async () => {
    if (!pin.trim() || pin.length < 4) {
      setError('Enter at least 4 digits')
      return
    }
    setVerifying(true)
    setError('')
    try {
      const result = await window.api.auth.verifyPin(pin)
      if (result.success && result.user) {
        unlock(result.user)
        setPin('')
        setError('')
      } else {
        setError('Incorrect PIN')
        setPin('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Verification failed')
    }
    setVerifying(false)
  }, [pin, unlock])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleVerify()
      }
    },
    [handleVerify]
  )

  if (isUnlocked) {
    return <>{children}</>
  }

  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg">
        {/* Lock Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold">Owner Access</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your PIN to access this section
            </p>
          </div>
        </div>

        {/* PIN Input */}
        <div className="space-y-3">
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
              placeholder="Enter PIN"
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
            {verifying ? 'Verifying...' : 'Unlock'}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {/* Default PIN: 1234 (change in Settings) */}
        </p>
      </div>
    </div>
  )
}
