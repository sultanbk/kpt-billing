import type { LicenseState } from '@shared/licenseTypes'
import { AlertCircle, CheckCircle2, MessageCircle, ShoppingCart, TimerReset } from 'lucide-react'
import { Button } from './ui/button'
import { SARVA_ONE_WHATSAPP_NUMBER } from './license/planMetadata'

interface RenewalScreenProps {
  licenseState: LicenseState
  onContinueLimited?: () => void
}

function formatDate(value: string | null): string {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(value))
}

function renewalUrl(licenseState: LicenseState): string {
  const phone = SARVA_ONE_WHATSAPP_NUMBER.replace(/[^\d]/g, '')
  const message = encodeURIComponent(
    `Hi, my Sarva One license has expired. Shop: ${licenseState.shopName ?? 'Not available'}. License: ${
      licenseState.licenseKey ?? 'Not available'
    }. Please help me renew.`
  )
  return `https://wa.me/${phone}?text=${message}`
}

export function RenewalScreen({
  licenseState,
  onContinueLimited
}: RenewalScreenProps): React.JSX.Element {
  const daysRemaining = licenseState.daysRemaining ?? 0
  const withinGrace = licenseState.status === 'grace' || daysRemaining > 0

  return (
    <div className="min-h-screen overflow-y-auto bg-background animate-license-enter">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[1fr_360px] lg:items-center">
        <section className="space-y-7">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-orange-500/10 text-orange-700">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight">
              Your Sarva One license needs renewal.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              This license expired on{' '}
              <span className="font-semibold text-foreground">
                {formatDate(licenseState.expiresAt)}
              </span>
              . Renew now to restore full reports, backups, exports, integrations, and plan limits.
            </p>
          </div>

          {withinGrace && (
            <div className="flex max-w-xl items-center gap-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-5 text-orange-900">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
                <TimerReset className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-medium">Grace period remaining</div>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-4xl font-black tabular-nums">
                    {Math.max(daysRemaining, 0)}
                  </span>
                  <span className="pb-1 font-semibold">days</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 bg-green-600 hover:bg-green-700">
              <a href={renewalUrl(licenseState)} target="_blank" rel="noreferrer">
                <MessageCircle className="h-5 w-5" />
                Renew on WhatsApp
              </a>
            </Button>
            {withinGrace && onContinueLimited && (
              <Button variant="outline" size="lg" className="h-12" onClick={onContinueLimited}>
                <ShoppingCart className="h-5 w-5" />
                Continue in limited mode
              </Button>
            )}
          </div>
        </section>

        <aside className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="font-semibold">What changes after expiry</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {[
              'Limited billing access remains available only during grace period.',
              'Reports, analytics, export, backup, and integrations may be unavailable.',
              'Plan limits and premium controls resume after renewal.',
              'Support can restore full access after renewal confirmation.'
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-md border bg-muted/30 p-4 text-sm">
            <div className="text-muted-foreground">Shop</div>
            <div className="font-medium">{licenseState.shopName ?? 'Not available'}</div>
            <div className="mt-3 text-muted-foreground">License</div>
            <div className="break-all font-mono text-xs">
              {licenseState.licenseKey ?? 'Not available'}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
