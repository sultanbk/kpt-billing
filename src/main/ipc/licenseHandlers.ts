import { licenseManager } from '../license/LicenseManager'
import { safeHandle, validate } from './ipc-guard'
import {
  licenseCountSchema,
  licenseFeatureSchema,
  licenseKeySchema,
  licenseLimitKeySchema
} from './validation'

export function registerLicenseIpc(): void {
  safeHandle('license:get-state', () => {
    return licenseManager.getLicenseState()
  })

  safeHandle('license:activate', (_event, key) => {
    return licenseManager.activate(validate(licenseKeySchema, key))
  })

  safeHandle('license:is-feature-enabled', (_event, feature) => {
    return licenseManager.isFeatureEnabled(validate(licenseFeatureSchema, feature))
  })

  safeHandle('license:check-limit', (_event, limitKey, currentCount) => {
    return licenseManager.checkLimit(
      validate(licenseLimitKeySchema, limitKey),
      validate(licenseCountSchema, currentCount)
    )
  })
}
