import type { FeatureFlags, PlanTier } from '@shared/licenseTypes'

export type LimitKey = 'maxBillsPerMonth' | 'maxProducts' | 'maxCustomers'

export const SARVA_ONE_WHATSAPP_NUMBER = '+919886718288'
export const SARVA_ONE_WEBSITE = 'https://sarvaone.com'

const FEATURE_PLAN_MAP: Partial<Record<keyof FeatureFlags, PlanTier>> = {
  whatsappIntegration: 'growth',
  creditManagement: 'growth',
  creditAging: 'pro',
  customerAnalytics: 'pro',
  expenseTracking: 'growth',
  estimates: 'growth',
  returnExchange: 'growth',
  barcodeLabels: 'growth',
  dataExport: 'growth',
  googleDriveBackup: 'growth',
  auditTrail: 'pro',
  profitLossReport: 'pro',
  gstReports: 'growth',
  multiUser: 'growth',
  maxUsers: 'pro',
  maxBillsPerMonth: 'growth',
  maxProducts: 'growth',
  maxCustomers: 'growth'
}

export const PLAN_LABELS: Record<PlanTier, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  custom: 'Custom'
}

export type UpgradePlanName = 'Growth' | 'Pro' | 'Custom'

export const UPGRADE_PLANS: Array<{
  name: UpgradePlanName
  eyebrow: string
  price: string
  description: string
  recommended?: boolean
  features: string[]
}> = [
  {
    name: 'Growth',
    eyebrow: 'Best for active shops',
    price: 'Rs 799/month',
    description: 'Unlock daily operating reports, customer follow-up, and higher shop limits.',
    recommended: true,
    features: [
      'Credit aging and customer analytics',
      'Profit & loss and GST reports',
      'WhatsApp reminders and receipts',
      'Expanded products, customers, and bills'
    ]
  },
  {
    name: 'Pro',
    eyebrow: 'For managed teams',
    price: 'Rs 1,499/month',
    description: 'Add backup, audit history, and multi-user controls for a growing operation.',
    features: ['Everything in Growth', 'Google Drive backup', 'Audit trail', 'Multi-user access']
  },
  {
    name: 'Custom',
    eyebrow: 'For special workflows',
    price: 'Contact us',
    description: 'Shape plan limits, onboarding, and support around your business setup.',
    features: [
      'Custom limits and workflows',
      'Priority setup support',
      'Branch or team-specific configuration',
      'Dedicated commercial terms'
    ]
  }
]

export function getUnlockPlan(feature: keyof FeatureFlags): PlanTier {
  return FEATURE_PLAN_MAP[feature] ?? 'growth'
}

export function getUpgradePlanName(plan: PlanTier): UpgradePlanName {
  if (plan === 'pro') return 'Pro'
  if (plan === 'custom') return 'Custom'
  return 'Growth'
}

export function formatFeatureName(feature: keyof FeatureFlags): string {
  const names: Partial<Record<keyof FeatureFlags, string>> = {
    whatsappIntegration: 'WhatsApp Integration',
    creditManagement: 'Credit Management',
    creditAging: 'Credit Aging Report',
    customerAnalytics: 'Customer Analytics',
    expenseTracking: 'Expense Tracking',
    dataExport: 'Data Export',
    googleDriveBackup: 'Google Drive Backup',
    profitLossReport: 'Profit & Loss Report',
    gstReports: 'GST Reports',
    multiUser: 'Multi User',
    maxBillsPerMonth: 'Monthly Bill Limit',
    maxProducts: 'Product Limit',
    maxCustomers: 'Customer Limit',
    maxUsers: 'User Limit'
  }

  return (
    names[feature] ??
    String(feature)
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (char) => char.toUpperCase())
  )
}

export function formatLimitName(limitKey: LimitKey): string {
  switch (limitKey) {
    case 'maxBillsPerMonth':
      return 'bills this month'
    case 'maxProducts':
      return 'products'
    case 'maxCustomers':
      return 'customers'
  }
}

export function getWhatsAppUpgradeUrl(planName: string): string {
  const phone = SARVA_ONE_WHATSAPP_NUMBER.replace(/[^\d]/g, '')
  const message = encodeURIComponent(`Hi, I want to upgrade my Sarva One plan to ${planName}`)
  return `https://wa.me/${phone}?text=${message}`
}
