import {
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Crown,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TimerReset
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FeatureFlags } from '@shared/licenseTypes'
import { useLicenseStore } from '../../../stores/licenseStore'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import {
  formatFeatureName,
  getWhatsAppUpgradeUrl,
  PLAN_LABELS,
  SARVA_ONE_WHATSAPP_NUMBER,
  SARVA_ONE_WEBSITE,
  UPGRADE_PLANS
} from '../../../components/license/planMetadata'

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

function StatusIcon({
  status
}: {
  status: string | undefined
}): React.JSX.Element {
  switch (status) {
    case 'active':
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    case 'trial':
      return <Clock3 className="h-5 w-5 text-amber-500" />
    case 'grace':
      return <TimerReset className="h-5 w-5 text-orange-500" />
    case 'expired':
    case 'grace_expired':
      return <ShieldAlert className="h-5 w-5 text-red-500" />
    case 'suspended':
      return <ShieldAlert className="h-5 w-5 text-red-500" />
    default:
      return <ShieldCheck className="h-5 w-5 text-muted-foreground" />
  }
}

function statusColor(status: string | undefined): string {
  switch (status) {
    case 'active':
      return 'from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/20'
    case 'trial':
      return 'from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/20'
    case 'grace':
      return 'from-orange-500/15 via-orange-500/5 to-transparent border-orange-500/20'
    case 'expired':
    case 'grace_expired':
    case 'suspended':
      return 'from-red-500/15 via-red-500/5 to-transparent border-red-500/20'
    default:
      return 'from-primary/10 via-primary/5 to-transparent border-border/60'
  }
}

function statusBadgeVariant(
  status: string | undefined
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'trial':
    case 'grace':
      return 'secondary'
    case 'expired':
    case 'grace_expired':
    case 'suspended':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function SubscriptionTab(): React.JSX.Element {
  const licenseState = useLicenseStore((state) => state.licenseState)
  const [featuresExpanded, setFeaturesExpanded] = useState(false)
  const features = useMemo(() => featureRows(licenseState?.features ?? null), [licenseState])
  const planLabel = licenseState?.plan ? PLAN_LABELS[licenseState.plan] : 'No plan'
  const days = licenseState?.daysRemaining ?? null
  const isActivated = licenseState && licenseState.status !== 'not_activated'

  return (
    <div className="space-y-6">
      {/* Current Plan Hero Card */}
      <div
        className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${statusColor(licenseState?.status)} p-1`}
      >
        <div className="rounded-xl bg-card/80 backdrop-blur-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-inner">
                <Crown className="h-7 w-7 text-primary" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Current Plan
                </div>
                <div className="mt-1 text-3xl font-bold tracking-tight">{planLabel}</div>
                {days !== null && isActivated && (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {days > 0
                      ? `${days} days remaining`
                      : 'Renewal needed'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge
                variant={statusBadgeVariant(licenseState?.status)}
                className="gap-1.5 text-xs px-3 py-1"
              >
                <StatusIcon status={licenseState?.status} />
                {formatStatus(licenseState?.status)}
              </Badge>
              {licenseState?.shopName && (
                <span className="text-xs text-muted-foreground">
                  {licenseState.shopName}
                </span>
              )}
            </div>
          </div>

          {/* Days Remaining Progress */}
          {days !== null && isActivated && days > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Subscription period</span>
                <span>{days} days left</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(5, (days / 365) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* License Details Grid */}
          {isActivated && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                <div className="text-xs font-medium text-muted-foreground">License Key</div>
                <div className="mt-1.5 break-all font-mono text-xs font-medium">
                  {maskLicenseKey(licenseState?.licenseKey)}
                </div>
              </div>
              <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                <div className="text-xs font-medium text-muted-foreground">Expiry Date</div>
                <div className="mt-1.5 text-sm font-semibold">
                  {formatDate(licenseState?.expiresAt ?? null)}
                </div>
              </div>
            </div>
          )}

          {/* Grace / Expired Warning */}
          {licenseState?.status === 'grace' && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-sm text-orange-800">
              <TimerReset className="h-4 w-4 shrink-0" />
              <span className="font-medium">
                License expired. {Math.max(days ?? 0, 0)} days left in grace period.
              </span>
              <Button
                asChild
                size="sm"
                className="ml-auto h-8 shrink-0 bg-green-600 hover:bg-green-700"
              >
                <a
                  href={`https://wa.me/${SARVA_ONE_WHATSAPP_NUMBER.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi, my Sarva One license has expired. Shop: ${licenseState.shopName ?? 'Not available'}. License: ${licenseState.licenseKey ?? 'Not available'}. Please help me renew.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Renew Now
                </a>
              </Button>
            </div>
          )}

          {(licenseState?.status === 'expired' || licenseState?.status === 'grace_expired') && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span className="font-medium">
                License has expired. Contact support to renew and restore full access.
              </span>
            </div>
          )}

          {/* Quick Actions */}
          {isActivated && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button
                asChild
                className="h-11 bg-green-600 hover:bg-green-700 rounded-xl shadow-sm"
              >
                <a
                  href={getWhatsAppUpgradeUrl(planLabel)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Support
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl"
              >
                <a href={SARVA_ONE_WEBSITE} target="_blank" rel="noreferrer">
                  <ShieldCheck className="h-4 w-4" />
                  Sarva One Website
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Plan Features — Expandable */}
      {isActivated && (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-accent/30 transition-colors duration-150"
            onClick={() => setFeaturesExpanded((v) => !v)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
                <BadgeCheck className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold">What&apos;s included in your plan</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {features.length} active allowances
                </span>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${featuresExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          {featuresExpanded && (
            <div className="border-t px-6 py-5 animate-in slide-in-from-top-2 duration-200">
              {features.length > 0 ? (
                <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  {features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 items-start">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
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
      )}

      {/* Upgrade Plans Grid */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">Compare Plans</h3>
            <p className="text-xs text-muted-foreground">
              Pick the plan that fits your shop&apos;s needs
            </p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {UPGRADE_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                plan.recommended
                  ? 'border-primary/40 shadow-md shadow-primary/5 ring-1 ring-primary/10'
                  : 'border-border/60'
              }`}
            >
              {plan.recommended && (
                <Badge className="absolute right-4 top-4 gap-1 bg-primary/10 text-primary border-primary/20 text-[10px]">
                  <ShieldCheck className="h-3 w-3" />
                  Recommended
                </Badge>
              )}
              <div className="space-y-2 pr-20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {plan.eyebrow}
                </p>
                <h4 className="text-xl font-bold tracking-tight">{plan.name}</h4>
              </div>
              <p className="mt-2 font-amount text-2xl font-bold text-primary">{plan.price}</p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {plan.description}
              </p>
              <ul className="mt-5 flex-1 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 leading-5 items-start">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-6 h-11 w-full rounded-xl" asChild>
                <a href={getWhatsAppUpgradeUrl(plan.name)} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Request {plan.name}
                </a>
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Support Footer */}
      <div className="rounded-2xl border border-border/40 bg-muted/20 px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Need help? Contact us at{' '}
          <a
            href={`https://wa.me/${SARVA_ONE_WHATSAPP_NUMBER.replace(/[^\d]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {SARVA_ONE_WHATSAPP_NUMBER}
          </a>
          {' · '}
          <a
            href={SARVA_ONE_WEBSITE}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {SARVA_ONE_WEBSITE}
          </a>
        </p>
      </div>
    </div>
  )
}
