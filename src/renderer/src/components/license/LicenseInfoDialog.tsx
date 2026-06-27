import { CheckCircle2, ChevronDown, MessageCircle, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FeatureFlags } from '@shared/licenseTypes'
import { useLicenseStore } from '../../stores/licenseStore'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import {
  formatFeatureName,
  getWhatsAppUpgradeUrl,
  PLAN_LABELS,
  SARVA_ONE_WHATSAPP_NUMBER
} from './planMetadata'

interface LicenseInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function maskLicenseKey(key: string | null | undefined): string {
  if (!key) return 'Not available'
  const parts = key.split('-')
  if (parts.length !== 5) return `${key.slice(0, 10)}-****-****`
  return `${parts[0]}-${parts[1]}-****-****-${parts[4]}`
}

function formatDate(value: string | null): string {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))
}

function formatStatus(status: string | undefined): string {
  if (!status) return 'Unknown'
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function featureRows(features: FeatureFlags | null): string[] {
  if (!features) return []
  return (Object.keys(features) as Array<keyof FeatureFlags>)
    .filter((key) => {
      const value = features[key]
      return value === true || (typeof value === 'number' && value !== 0)
    })
    .map((key) => {
      const value = features[key]
      if (typeof value === 'number') {
        return `${formatFeatureName(key)}: ${value === -1 ? 'Unlimited' : value}`
      }
      return formatFeatureName(key)
    })
}

export function LicenseInfoDialog({
  open,
  onOpenChange
}: LicenseInfoDialogProps): React.JSX.Element {
  const licenseState = useLicenseStore((state) => state.licenseState)
  const [expanded, setExpanded] = useState(false)
  const features = useMemo(() => featureRows(licenseState?.features ?? null), [licenseState])
  const planLabel = licenseState?.plan ? PLAN_LABELS[licenseState.plan] : 'No plan'
  const days = licenseState?.daysRemaining ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader>
          <div className="border-b bg-muted/30 px-6 py-5">
            <DialogTitle>License details</DialogTitle>
            <DialogDescription className="mt-1">
              Plan, renewal, and support information for this shop.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-5 p-6">
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Current plan
                </div>
                <div className="mt-1 text-2xl font-bold">{planLabel}</div>
                {days !== null && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {days > 0 ? `${days} days remaining` : 'No days remaining'}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-700" />
                {formatStatus(licenseState?.status)}
              </Badge>
            </div>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md bg-muted/30 p-3">
                <div className="text-muted-foreground">License key</div>
                <div className="mt-1 break-all font-mono text-xs">
                  {maskLicenseKey(licenseState?.licenseKey)}
                </div>
              </div>
              <div className="rounded-md bg-muted/30 p-3">
                <div className="text-muted-foreground">Expiry date</div>
                <div className="mt-1 font-medium">
                  {formatDate(licenseState?.expiresAt ?? null)}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild className="h-10 bg-green-600 hover:bg-green-700">
              <a href={getWhatsAppUpgradeUrl(planLabel)} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" />
                WhatsApp support
              </a>
            </Button>
            <Button asChild variant="outline" className="h-10">
              <a href={getWhatsAppUpgradeUrl('Upgrade')} target="_blank" rel="noreferrer">
                <Sparkles className="h-4 w-4" />
                Upgrade plan
              </a>
            </Button>
          </div>

          <div className="rounded-lg border">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold"
              onClick={() => setExpanded((value) => !value)}
            >
              <span>
                What&apos;s included in my plan
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {features.length} active allowances
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            {expanded && (
              <div className="border-t px-4 py-3">
                {features.length > 0 ? (
                  <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    {features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Feature details are not available for this license.
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Support phone: {SARVA_ONE_WHATSAPP_NUMBER}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
