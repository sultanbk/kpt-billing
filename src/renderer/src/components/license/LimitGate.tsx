import * as React from 'react'
import { AlertTriangle, ArrowUpRight, Lock } from 'lucide-react'
import { Button } from '../ui/button'
import { useLicenseStore } from '../../stores/licenseStore'
import { formatLimitName, type LimitKey } from './planMetadata'
import { UpgradeDialog } from './UpgradeDialog'

interface LimitGateProps {
  limitKey: LimitKey
  currentCount: number
  children: React.ReactNode
  onLimitReached?: () => void
}

function disableChildActions(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement<{ disabled?: boolean; onClick?: React.MouseEventHandler }>(child)) {
      return child
    }

    return React.cloneElement(child, {
      disabled: true,
      onClick: undefined
    })
  })
}

export function LimitGate({
  limitKey,
  currentCount,
  children,
  onLimitReached
}: LimitGateProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false)
  const limit = useLicenseStore((state) => state.features?.[limitKey])
  const isActivated = useLicenseStore((state) => state.isActivated)

  if (!isActivated || typeof limit !== 'number' || limit === -1) {
    return <>{children}</>
  }

  const isAtLimit = currentCount >= limit
  const isNearLimit = !isAtLimit && limit > 0 && currentCount / limit >= 0.8
  const label = formatLimitName(limitKey)

  if (!isAtLimit && !isNearLimit) {
    return <>{children}</>
  }

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm ${
          isAtLimit
            ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5">
            {isAtLimit ? <Lock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </div>
          <span className="leading-5">
            {isAtLimit
              ? `Plan limit reached for ${label}. Upgrade to continue adding more.`
              : `You're near your plan limit: ${currentCount} of ${limit} ${label} used.`}
          </span>
        </div>
        <Button
          size="sm"
          variant={isAtLimit ? 'destructive' : 'outline'}
          onClick={() => {
            if (isAtLimit) onLimitReached?.()
            setOpen(true)
          }}
        >
          <ArrowUpRight className="h-4 w-4" />
          Upgrade
        </Button>
      </div>
      {isAtLimit ? disableChildActions(children) : children}
      <UpgradeDialog open={open} onOpenChange={setOpen} initialPlan="Growth" />
    </div>
  )
}
