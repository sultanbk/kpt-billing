export type PlanTier = 'starter' | 'growth' | 'pro' | 'custom'

export type LicenseStatus =
  | 'not_activated'
  | 'trial'
  | 'active'
  | 'grace'
  | 'expired'
  | 'suspended'
  | 'grace_expired'

export type FeatureFlags = {
  maxBillsPerMonth: number
  maxProducts: number
  maxCustomers: number
  whatsappIntegration: boolean
  creditManagement: boolean
  creditAging: boolean
  customerAnalytics: boolean
  expenseTracking: boolean
  estimates: boolean
  returnExchange: boolean
  barcodeLabels: boolean
  dataExport: boolean
  googleDriveBackup: boolean
  auditTrail: boolean
  profitLossReport: boolean
  gstReports: boolean
  multiUser: boolean
  maxUsers: number
}

export type LicenseState = {
  status: LicenseStatus
  licenseKey?: string | null
  plan: PlanTier | null
  shopName: string | null
  ownerName: string | null
  expiresAt: string | null
  daysRemaining: number | null
  features: FeatureFlags | null
  gracePeriodDays: number
}

export type ActivationResult = {
  success: boolean
  licenseState?: LicenseState
  error?: string
  errorCode?: string
  status?: LicenseStatus
  plan?: PlanTier | null
  shopName?: string | null
}
