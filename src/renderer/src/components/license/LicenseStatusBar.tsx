import { CheckCircle2, Clock3, ShieldAlert, TimerReset } from 'lucide-react'
import { Badge } from '../ui/badge'
import { useLicenseStore } from '../../stores/licenseStore'
import { PLAN_LABELS } from './planMetadata'

function formatDate(value: string | null): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))
}

export function LicenseStatusBar(): React.JSX.Element | null {
  const licenseState = useLicenseStore((state) => state.licenseState)

  if (!licenseState || licenseState.status === 'not_activated') return null

  const plan = licenseState.plan ? PLAN_LABELS[licenseState.plan] : 'License'
  const days = licenseState.daysRemaining ?? 0

  switch (licenseState.status) {
    case 'trial':
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700"
        >
          <Clock3 className="h-3.5 w-3.5" />
          Trial: {days} days left
        </Badge>
      )
    case 'active':
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-green-500/30 bg-green-500/10 text-green-700"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {plan}: active until {formatDate(licenseState.expiresAt)}
        </Badge>
      )
    case 'grace':
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-orange-500/30 bg-orange-500/10 text-orange-700"
        >
          <TimerReset className="h-3.5 w-3.5" />
          Grace period: {days} days left
        </Badge>
      )
    case 'expired':
    case 'grace_expired':
      return (
        <Badge variant="destructive" className="gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5" />
          Renew to continue
        </Badge>
      )
    case 'suspended':
      return (
        <Badge variant="destructive" className="gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5" />
          Account suspended
        </Badge>
      )
  }
}
