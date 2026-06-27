import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  CheckCircle2,
  KeyRound,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles
} from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { useLicenseStore } from '../../stores/licenseStore'
import { SARVA_ONE_WEBSITE, SARVA_ONE_WHATSAPP_NUMBER } from './planMetadata'

interface ActivationScreenProps {
  onActivated?: () => void
}

const ERROR_MESSAGES: Record<string, string> = {
  MACHINE_MISMATCH: 'This license is already activated on another device. Contact Sarva One.',
  LICENSE_NOT_FOUND: 'Invalid license key. Please check and try again.',
  LICENSE_INACTIVE: 'This license is not active. Check the admin dashboard or contact Sarva One.',
  LICENSE_EXPIRED: 'This license has expired. Contact Sarva One to renew.',
  LICENSE_SUSPENDED: 'This license has been suspended. Contact Sarva One.',
  INVALID_API_KEY: 'License server rejected the API key. Check billing .env configuration.',
  SERVER_MISCONFIGURED: 'License server is missing required configuration.',
  RATE_LIMITED: 'Too many activation attempts. Please wait and try again.',
  VALIDATION_ERROR: 'License activation request was invalid. Please try again.'
}

function formatLicenseKey(value: string): string {
  const raw = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^SARVA/, '')
    .slice(0, 16)
  const parts = raw.match(/.{1,4}/g) ?? []
  return ['SARVA', ...parts].join('-')
}

function isValidLicenseKey(value: string): boolean {
  return /^SARVA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value)
}

export function ActivationScreen({ onActivated }: ActivationScreenProps): React.JSX.Element {
  const activate = useLicenseStore((state) => state.activate)
  const isLoading = useLicenseStore((state) => state.isLoading)
  const [licenseKey, setLicenseKey] = useState('SARVA-')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const isValid = useMemo(() => isValidLicenseKey(licenseKey), [licenseKey])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => onActivated?.(), 900)
    return () => window.clearTimeout(timer)
  }, [onActivated, success])

  const handleActivate = async (): Promise<void> => {
    if (!isValid) {
      setError('Enter a valid license key in SARVA-XXXX-XXXX-XXXX-XXXX format.')
      return
    }

    setError('')
    const result = await activate(licenseKey)
    if (result.success) {
      setSuccess(true)
      return
    }

    setError(
      (result.errorCode && ERROR_MESSAGES[result.errorCode]) ||
        result.error ||
        'Activation failed. Please try again.'
    )
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
              SO
            </div>
            <div>
              <div className="text-sm font-semibold text-muted-foreground">Sarva One</div>
              <div className="text-lg font-bold leading-none">Billing Workspace</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Offline-first license activation
            </div>
            <div>
              <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
                Activate your shop billing system.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                Enter the license issued for this machine to unlock billing, inventory, reports,
                WhatsApp workflows, and plan limits for your shop.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Secure device lock', 'License is tied to this installation'],
              ['Plan aware', 'Features unlock by subscription tier'],
              ['Local cache', 'Keeps valid shops working offline']
            ].map(([title, copy]) => (
              <div key={title} className="rounded-lg border bg-card p-4 shadow-sm">
                <BadgeCheck className="h-5 w-5 text-primary" />
                <div className="mt-3 text-sm font-semibold">{title}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="w-full overflow-hidden shadow-lg">
          <CardContent className="p-0">
            <div className="border-b bg-muted/30 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">License activation</h2>
                  <p className="text-sm text-muted-foreground">Use your SARVA license key.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6">
              {success ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-8 text-center text-green-700">
                  <CheckCircle2 className="h-12 w-12 animate-in zoom-in" />
                  <div>
                    <p className="text-lg font-semibold">Activated successfully</p>
                    <p className="text-sm">Opening your billing workspace...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Input
                      value={licenseKey}
                      onChange={(event) => {
                        setLicenseKey(formatLicenseKey(event.target.value))
                        setError('')
                      }}
                      placeholder="SARVA-XXXX-XXXX-XXXX-XXXX"
                      className="h-12 text-center font-mono text-base uppercase tracking-wider"
                      maxLength={25}
                    />
                    <div className="flex min-h-5 items-center justify-between gap-3 text-xs">
                      <span className={isValid ? 'text-green-700' : 'text-muted-foreground'}>
                        {isValid ? 'Key format looks correct' : 'Format: SARVA-XXXX-XXXX-XXXX-XXXX'}
                      </span>
                      {error && <span className="text-right text-destructive">{error}</span>}
                    </div>
                  </div>
                  <Button
                    className="h-11 w-full"
                    disabled={isLoading || !isValid}
                    onClick={handleActivate}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Activate license
                  </Button>
                </>
              )}

              <div className="grid gap-3 border-t pt-5 sm:grid-cols-2">
                <a
                  className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3 text-sm hover:bg-muted/40"
                  href={`https://wa.me/${SARVA_ONE_WHATSAPP_NUMBER.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4 text-green-700" />
                  <span>
                    <span className="block font-medium">WhatsApp support</span>
                    <span className="block text-xs text-muted-foreground">
                      {SARVA_ONE_WHATSAPP_NUMBER}
                    </span>
                  </span>
                </a>
                <a
                  className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3 text-sm hover:bg-muted/40"
                  href={SARVA_ONE_WEBSITE}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>
                    <span className="block font-medium">Sarva One website</span>
                    <span className="block text-xs text-muted-foreground">{SARVA_ONE_WEBSITE}</span>
                  </span>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
