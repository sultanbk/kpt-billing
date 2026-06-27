import type { LicenseState } from '@shared/licenseTypes'
import { MessageCircle, ShieldAlert } from 'lucide-react'
import { Button } from './ui/button'
import { SARVA_ONE_WHATSAPP_NUMBER } from './license/planMetadata'

function supportUrl(licenseState: LicenseState): string {
  const phone = SARVA_ONE_WHATSAPP_NUMBER.replace(/[^\d]/g, '')
  const message = encodeURIComponent(
    `Hi, my Sarva One account is suspended. Shop: ${licenseState.shopName ?? 'Not available'}. License: ${
      licenseState.licenseKey ?? 'Not available'
    }. Please help me resolve this.`
  )
  return `https://wa.me/${phone}?text=${message}`
}

export function SuspendedScreen({
  licenseState
}: {
  licenseState: LicenseState
}): React.JSX.Element {
  return (
    <div className="min-h-screen overflow-y-auto bg-background animate-license-enter">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-8">
        <section className="w-full rounded-lg border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">Account access is paused</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            This license is suspended. Contact Sarva One support to review the account and restore
            access.
          </p>
          <div className="mx-auto mt-6 grid max-w-xl gap-3 rounded-lg border bg-muted/30 p-4 text-left text-sm sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground">Support phone</div>
              <div className="mt-1 font-semibold">{SARVA_ONE_WHATSAPP_NUMBER}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Shop</div>
              <div className="mt-1 font-semibold">{licenseState.shopName ?? 'Not available'}</div>
            </div>
          </div>
          <Button asChild size="lg" className="mt-6 h-12 bg-green-600 hover:bg-green-700">
            <a href={supportUrl(licenseState)} target="_blank" rel="noreferrer">
              <MessageCircle className="h-5 w-5" />
              Contact support on WhatsApp
            </a>
          </Button>
        </section>
      </div>
    </div>
  )
}
