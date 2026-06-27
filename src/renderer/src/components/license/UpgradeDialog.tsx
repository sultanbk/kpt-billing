import { Check, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { UPGRADE_PLANS, getWhatsAppUpgradeUrl, type UpgradePlanName } from './planMetadata'

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPlan?: UpgradePlanName
}

export function UpgradeDialog({
  open,
  onOpenChange,
  initialPlan = 'Growth'
}: UpgradeDialogProps): React.JSX.Element {
  const selectedPlan = UPGRADE_PLANS.find((plan) => plan.name === initialPlan) ?? UPGRADE_PLANS[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto p-0">
        <DialogHeader>
          <div className="border-b bg-muted/30 px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Upgrade Sarva One Billing</DialogTitle>
                <DialogDescription className="mt-1 max-w-2xl">
                  Pick the plan that opens the reports, limits, communication tools, and controls
                  your shop needs next.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 px-6 py-5 lg:grid-cols-3">
          {UPGRADE_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex min-h-[360px] flex-col rounded-lg border bg-card p-5 shadow-sm',
                plan.name === selectedPlan.name && 'border-primary shadow-md shadow-primary/10'
              )}
            >
              {plan.recommended && (
                <Badge className="absolute right-4 top-4 gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Recommended
                </Badge>
              )}
              <div className="space-y-3 pr-28">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {plan.eyebrow}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">{plan.name}</h3>
                </div>
                <p className="font-amount text-2xl font-bold">{plan.price}</p>
              </div>
              <p className="mt-3 min-h-12 text-sm text-muted-foreground">{plan.description}</p>
              <ul className="mt-5 flex-1 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 leading-5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-6 h-10 w-full" asChild>
                <a href={getWhatsAppUpgradeUrl(plan.name)} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Request {plan.name}
                </a>
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t bg-muted/20 px-6 py-4 text-sm text-muted-foreground">
          WhatsApp will open a pre-filled upgrade request for the {selectedPlan.name} plan.
        </div>
      </DialogContent>
    </Dialog>
  )
}
