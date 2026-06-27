import { AlertTriangle, MessageCircle } from 'lucide-react'
import { useLicenseStore } from '../../stores/licenseStore'
import { Button } from '../ui/button'
import { SARVA_ONE_WHATSAPP_NUMBER } from './planMetadata'

export function RenewalBanner(): React.JSX.Element | null {
  const licenseState = useLicenseStore((state) => state.licenseState)

  if (!licenseState || licenseState.status !== 'grace') return null

  const phone = SARVA_ONE_WHATSAPP_NUMBER.replace(/[^\d]/g, '')
  const message = encodeURIComponent(
    `Hi, my Sarva One license has expired. Shop: ${licenseState.shopName ?? 'Not available'}. License: ${
      licenseState.licenseKey ?? 'Not available'
    }. Please help me renew.`
  )
  const days = Math.max(licenseState.daysRemaining ?? 0, 0)

  return (
    <div className="flex items-center justify-between gap-4 border-b border-orange-500/25 bg-orange-500/10 px-5 py-3 text-sm text-orange-900 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <span className="truncate font-medium">
          License expired. {days} days left in grace period.
        </span>
      </div>
      <Button asChild size="sm" className="h-8 shrink-0 bg-green-600 hover:bg-green-700">
        <a href={`https://wa.me/${phone}?text=${message}`} target="_blank" rel="noreferrer">
          <MessageCircle className="h-4 w-4" />
          Renew
        </a>
      </Button>
    </div>
  )
}
