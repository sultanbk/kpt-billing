import { useState } from 'react'
import { ArrowUpRight, Lock, Sparkles } from 'lucide-react'
import type { FeatureFlags } from '@shared/licenseTypes'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { formatFeatureName, getUnlockPlan, getUpgradePlanName, PLAN_LABELS } from './planMetadata'
import { UpgradeDialog } from './UpgradeDialog'

interface UpgradePromptProps {
  feature: keyof FeatureFlags
  compact?: boolean
}

export function UpgradePrompt({ feature, compact = false }: UpgradePromptProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const plan = getUnlockPlan(feature)
  const planLabel = PLAN_LABELS[plan]
  const upgradePlan = getUpgradePlanName(plan)
  const featureName = formatFeatureName(feature)

  if (compact) {
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex">
          <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
            <Lock className="h-3 w-3" />
            {featureName}
          </Badge>
        </button>
        <UpgradeDialog open={open} onOpenChange={setOpen} initialPlan={upgradePlan} />
      </>
    )
  }

  return (
    <>
      <Card className="overflow-hidden border-primary/20 bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
            <div className="flex flex-col gap-5 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{featureName}</h2>
                    <Badge variant="secondary">{planLabel} plan</Badge>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    This workspace is running on a plan that does not include{' '}
                    {featureName.toLowerCase()}. Upgrade to keep this screen connected to live shop
                    data.
                  </p>
                </div>
              </div>
              <Button className="w-fit" onClick={() => setOpen(true)}>
                <Sparkles className="h-4 w-4" />
                Compare plans
              </Button>
            </div>
            <div className="border-t bg-muted/30 p-6 lg:border-l lg:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Unlocks on {planLabel}
              </p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>Higher limits for growing shops</p>
                <p>Premium reports and operational controls</p>
                <p>WhatsApp support for plan changes</p>
              </div>
              <button
                type="button"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                onClick={() => setOpen(true)}
              >
                View upgrade options
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      <UpgradeDialog open={open} onOpenChange={setOpen} initialPlan={upgradePlan} />
    </>
  )
}
