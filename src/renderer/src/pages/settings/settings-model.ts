import { DEFAULT_SETTINGS } from '@shared/constants'
import type { PaymentMethod, SettingsMap } from './types'

export function settingValue(settings: SettingsMap, key: string): string {
  return settings[key] ?? DEFAULT_SETTINGS[key] ?? ''
}

export function settingBool(settings: SettingsMap, key: string): boolean {
  return settingValue(settings, key) === 'true'
}

export function settingNumber(settings: SettingsMap, key: string, fallback: number): number {
  const parsed = Number(settingValue(settings, key))
  return Number.isFinite(parsed) ? parsed : fallback
}

export function withSettingsDefaults(settings: SettingsMap): SettingsMap {
  return { ...DEFAULT_SETTINGS, ...settings }
}

export function parsePaymentMethods(settings: SettingsMap): PaymentMethod[] {
  const raw = settings.paymentMethods
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const methods = parsed.filter(isPaymentMethod)
        return methods.length > 0 ? methods : legacyPaymentMethods(settings)
      }
    } catch {
      return legacyPaymentMethods(settings)
    }
  }

  return legacyPaymentMethods(settings)
}

export function serializePaymentMethods(
  methods: PaymentMethod[]
): Pick<SettingsMap, 'paymentMethods' | 'upiVpa' | 'upiPayeeName'> {
  const defaultUpi = methods.find(
    (method) => method.isDefaultBilling && (method.type === 'upi' || method.type === 'scanner')
  )
  const hasUpiLikeMethod = methods.some(
    (method) => method.type === 'upi' || method.type === 'scanner'
  )

  return {
    paymentMethods: JSON.stringify(methods),
    upiVpa: defaultUpi?.details.upiVpa ?? (hasUpiLikeMethod ? '' : ''),
    upiPayeeName: defaultUpi?.details.payeeName ?? (hasUpiLikeMethod ? '' : '')
  }
}

export function syncDefaultPaymentMethod(
  methods: PaymentMethod[],
  methodId: string
): PaymentMethod[] {
  return methods.map((method) => ({
    ...method,
    isDefaultBilling: method.id === methodId
  }))
}

function legacyPaymentMethods(settings: SettingsMap): PaymentMethod[] {
  const legacyVpa = settings.upiVpa || ''
  const legacyPayee = settings.upiPayeeName || ''
  if (!legacyVpa && !legacyPayee) return []

  return [
    {
      id: 'legacy-default',
      type: 'upi',
      name: 'Default UPI',
      isDefaultBilling: true,
      details: {
        upiVpa: legacyVpa,
        payeeName: legacyPayee
      }
    }
  ]
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  if (!value || typeof value !== 'object') return false
  const candidate = value as PaymentMethod
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    (candidate.type === 'bank' || candidate.type === 'upi' || candidate.type === 'scanner') &&
    !!candidate.details &&
    typeof candidate.details === 'object'
  )
}
