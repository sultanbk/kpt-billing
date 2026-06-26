// ============================================================================
// KPT Billing - Lock Screen Overlay
// Full-screen lock triggered by Ctrl+L or sidebar lock button
// ============================================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { authService } from '../../services/auth.service'

interface LockScreenProps {
  open: boolean
  onUnlock: () => void
}

export function LockScreen({ open, onUnlock }: LockScreenProps): React.JSX.Element | null {
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [time, setTime] = useState(new Date())
  const inputRef = useRef<HTMLInputElement>(null)

  // Update clock every minute
  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setTime(new Date()), 30000)
    return () => clearInterval(timer)
  }, [open])

  // Focus input when shown
  useEffect(() => {
    if (open) {
      setPin('')
      setError('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleVerify = useCallback(async () => {
    if (!pin.trim() || pin.length < 4) {
      setError('Enter at least 4 digits')
      return
    }
    setVerifying(true)
    setError('')
    try {
      const result = await authService.verifyPin(pin)
      if (result.success) {
        setPin('')
        setError('')
        onUnlock()
      } else {
        setError('Incorrect PIN')
        setPin('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Verification failed')
    }
    setVerifying(false)
  }, [pin, onUnlock])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleVerify()
      }
    },
    [handleVerify]
  )

  if (!open) return null

  const hrs = time.getHours()
  const mins = time.getMinutes().toString().padStart(2, '0')
  const period = hrs >= 12 ? 'PM' : 'AM'
  const displayHrs = hrs % 12 || 12
  const dateStr = time.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Clock */}
      <div className="relative mb-8 text-center">
        <p className="text-7xl font-light tracking-tight text-foreground">
          {displayHrs}:{mins}
          <span className="ml-2 text-2xl text-muted-foreground">{period}</span>
        </p>
        <p className="mt-2 text-lg text-muted-foreground">{dateStr}</p>
      </div>

      {/* Lock Card */}
      <div className="relative w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 shadow-2xl">
        {/* Lock Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold">Screen Locked</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter PIN to unlock</p>
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
                setPin(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter PIN"
              maxLength={8}
              className="flex h-12 w-full rounded-lg border border-input bg-background px-4 pr-12 text-center text-2xl tracking-[0.5em] ring-offset-background placeholder:text-muted-foreground placeholder:text-base placeholder:tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="off"
              disabled={verifying}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {error && <p className="text-center text-sm text-destructive">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={verifying || pin.length < 4}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Unlock'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="relative mt-8 text-xs text-muted-foreground">
        Krishnapriya Textiles — KPT Billing
      </p>
    </div>
  )
}
