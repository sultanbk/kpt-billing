import { ShieldCheck, Shield } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { authService } from '../../../services/auth.service'
import { Field, SettingsSection } from './SettingsFields'

export function SecurityTab(): React.JSX.Element {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [saving, setSaving] = useState(false)

  const changePin = async (): Promise<void> => {
    if (newPin.length < 4) {
      toast.error('PIN must be at least 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      toast.error('New PIN and confirmation do not match')
      return
    }

    setSaving(true)
    try {
      const result = await authService.changePin(currentPin, newPin)
      if (result.success) {
        toast.success('PIN changed successfully')
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
      } else {
        toast.error(result.error || 'Could not change PIN')
      }
    } catch {
      toast.error('Could not change PIN')
    } finally {
      setSaving(false)
    }
  }

  // PIN strength indicator
  const pinStrength = newPin.length === 0 ? 0 : newPin.length < 4 ? 1 : newPin.length < 6 ? 2 : 3
  const strengthLabels = ['', 'Weak', 'Good', 'Strong']
  const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500']

  return (
    <SettingsSection
      title="Owner PIN"
      description="Update the PIN used for owner-protected areas and sensitive actions."
      icon={<Shield className="h-4 w-4" />}
    >
      {/* Shield Hero */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/8 scale-150" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-inner">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <Field label="Current PIN">
          <Input
            type="password"
            inputMode="numeric"
            value={currentPin}
            onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="text-center tracking-[0.4em] text-lg font-bold"
          />
        </Field>
        <Field label="New PIN">
          <Input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="text-center tracking-[0.4em] text-lg font-bold"
          />
          {/* Strength indicator */}
          {newPin.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 flex gap-1">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      level <= pinStrength ? strengthColors[pinStrength] : 'bg-muted/60'
                    }`}
                  />
                ))}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  pinStrength === 1
                    ? 'text-red-500'
                    : pinStrength === 2
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                }`}
              >
                {strengthLabels[pinStrength]}
              </span>
            </div>
          )}
        </Field>
        <Field label="Confirm New PIN">
          <Input
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="text-center tracking-[0.4em] text-lg font-bold"
          />
          {confirmPin.length > 0 && newPin.length > 0 && (
            <p
              className={`text-xs mt-1 text-center font-medium ${
                newPin === confirmPin ? 'text-emerald-500' : 'text-destructive'
              }`}
            >
              {newPin === confirmPin ? '✓ PINs match' : '✗ PINs do not match'}
            </p>
          )}
        </Field>
        <Button
          onClick={changePin}
          disabled={saving || !currentPin || !newPin || !confirmPin}
          className="w-full rounded-xl h-10"
        >
          <ShieldCheck className="h-4 w-4" />
          {saving ? 'Saving...' : 'Change PIN'}
        </Button>
      </div>
    </SettingsSection>
  )
}
