import type { FeatureFlags } from '@shared/licenseTypes'
import { useLicenseStore } from '../../stores/licenseStore'
import { UpgradePrompt } from './UpgradePrompt'

interface FeatureGateProps {
  feature: keyof FeatureFlags
  children: React.ReactNode
  fallback?: React.ReactNode
  silent?: boolean
}

export function FeatureGate({
  feature,
  children,
  fallback,
  silent = false
}: FeatureGateProps): React.JSX.Element | null {
  const isEnabled = useLicenseStore((state) => state.isFeatureEnabled(feature))

  if (isEnabled) return <>{children}</>
  if (fallback) return <>{fallback}</>
  if (silent) return null

  return <UpgradePrompt feature={feature} />
}
