import { create } from 'zustand'
import type { ActivationResult, FeatureFlags, LicenseState, PlanTier } from '@shared/licenseTypes'

type LimitKey = 'maxBillsPerMonth' | 'maxProducts' | 'maxCustomers'

interface LicenseStoreState {
  licenseState: LicenseState | null
  isLoading: boolean
  isActivated: boolean
  plan: PlanTier | null
  features: FeatureFlags | null
  initialize: () => Promise<void>
  activate: (key: string) => Promise<ActivationResult>
  isFeatureEnabled: (feature: keyof FeatureFlags) => boolean
  checkLimit: (key: LimitKey, count: number) => boolean
}

const activatedStatuses = new Set(['trial', 'active', 'grace'])

function deriveState(
  licenseState: LicenseState | null
): Pick<LicenseStoreState, 'licenseState' | 'isActivated' | 'plan' | 'features'> {
  return {
    licenseState,
    isActivated: licenseState ? activatedStatuses.has(licenseState.status) : false,
    plan: licenseState?.plan ?? null,
    features: licenseState?.features ?? null
  }
}

export const useLicenseStore = create<LicenseStoreState>((set, get) => ({
  licenseState: null,
  isLoading: false,
  isActivated: false,
  plan: null,
  features: null,

  initialize: async () => {
    set({ isLoading: true })
    try {
      const licenseState = await window.license.getState()
      set({ ...deriveState(licenseState), isLoading: false })
    } catch {
      set({ ...deriveState(null), isLoading: false })
    }
  },

  activate: async (key) => {
    set({ isLoading: true })
    try {
      const result = await window.license.activate(key)
      if (result.success && result.licenseState) {
        set({ ...deriveState(result.licenseState), isLoading: false })
      } else {
        set({ isLoading: false })
      }
      return result
    } catch (error) {
      set({ isLoading: false })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Activation failed'
      }
    }
  },

  isFeatureEnabled: (feature) => {
    if (!get().isActivated) return false
    return Boolean(get().features?.[feature])
  },

  checkLimit: (key, count) => {
    if (!get().isActivated) return false
    const limit = get().features?.[key]
    if (typeof limit !== 'number') return false
    if (limit === -1) return true
    return count <= limit
  }
}))

export const useLicense = useLicenseStore
