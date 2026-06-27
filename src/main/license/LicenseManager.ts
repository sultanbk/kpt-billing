import { app } from 'electron'
import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { machineIdSync } from 'node-machine-id'
import { getSqlite } from '../database/connection'
import log from 'electron-log'
import type {
  ActivationResult,
  FeatureFlags,
  LicenseState,
  LicenseStatus,
  PlanTier
} from '../../shared/licenseTypes'

type LicenseCache = {
  id: number
  license_key: string
  plan: PlanTier
  status: LicenseStatus
  shop_name: string | null
  owner_name: string | null
  expires_at: string | null
  grace_period_days: number | null
  features: string | null
  machine_id: string | null
  last_validated: string | null
  created_at: string
}

type LicenseLimitKey = 'maxBillsPerMonth' | 'maxProducts' | 'maxCustomers'

const DEFAULT_GRACE_PERIOD_DAYS = 7
const REQUEST_TIMEOUT_MS = 10000
const HEARTBEAT_INTERVAL_MS = 6 * 60 * 60 * 1000
const ONLINE_STATUSES = new Set<LicenseStatus>(['trial', 'active', 'grace'])
const SERVER_ERROR_CODES = new Set([
  'LICENSE_NOT_FOUND',
  'LICENSE_INACTIVE',
  'MACHINE_MISMATCH',
  'LICENSE_EXPIRED',
  'LICENSE_SUSPENDED',
  'VALIDATION_ERROR',
  'INVALID_API_KEY',
  'RATE_LIMITED',
  'SERVER_MISCONFIGURED'
])

function getLicenseServerUrl(): string | undefined {
  const viteEnv = import.meta.env as unknown as Record<string, string | undefined>
  return process.env.VITE_LICENSE_SERVER_URL || viteEnv.VITE_LICENSE_SERVER_URL
}

function getLicenseApiKey(): string | undefined {
  const viteEnv = import.meta.env as unknown as Record<string, string | undefined>
  return (
    process.env.VITE_LICENSE_API_KEY ||
    process.env.LICENSE_API_KEY ||
    process.env.API_KEY ||
    viteEnv.VITE_LICENSE_API_KEY
  )
}

const DEFAULT_STATE: LicenseState = {
  status: 'not_activated',
  licenseKey: null,
  plan: null,
  shopName: null,
  ownerName: null,
  expiresAt: null,
  daysRemaining: null,
  features: null,
  gracePeriodDays: DEFAULT_GRACE_PERIOD_DAYS
}

export class LicenseManager {
  private state: LicenseState = DEFAULT_STATE
  private cache: LicenseCache | null = null
  private machineId: string | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null

  async initialize(): Promise<LicenseState> {
    try {
      const cache = this.loadCache()
      if (!cache) {
        this.state = { ...DEFAULT_STATE }
        return this.state
      }

      this.cache = cache
      this.state = await this.validateWithServer(cache.license_key)
      return this.state
    } catch (error) {
      this.log('License initialization failed', error)
      this.state = this.cache ? this.validateFromCache(this.cache) : { ...DEFAULT_STATE }
      return this.state
    } finally {
      this.startHeartbeat()
    }
  }

  async activate(key: string): Promise<ActivationResult> {
    try {
      const response = await this.postToServer('/api/license/activate', {
        key,
        machineId: this.getMachineId(),
        appVersion: app.getVersion()
      })

      if (!this.isServerSuccess(response)) {
        const errorCode = this.getServerErrorCode(response)
        return {
          success: false,
          error: this.getResponseString(response, ['message', 'error']) || 'Activation failed',
          errorCode: errorCode ?? undefined
        }
      }

      const state = this.stateFromServer(response)
      this.saveCache(key, state, response)
      this.state = state
      this.cache = this.loadCache()
      this.log('License activated', { status: state.status, plan: state.plan })

      return {
        success: true,
        licenseState: state,
        status: state.status,
        plan: state.plan,
        shopName: state.shopName
      }
    } catch (error) {
      this.log('License activation failed', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Activation failed'
      }
    }
  }

  async validateWithServer(key: string): Promise<LicenseState> {
    try {
      const response = await this.postToServer('/api/license/validate', {
        key,
        machineId: this.getMachineId(),
        appVersion: app.getVersion()
      })

      if (!this.isServerSuccess(response)) {
        const status = this.getResponseString(response, ['status']) as LicenseStatus | null
        if (status === 'expired' || status === 'suspended') {
          const state = this.stateFromServer(response)
          this.saveCache(key, state, response)
          this.state = state
          this.cache = this.loadCache()
          return state
        }
        return this.cache ? this.validateFromCache(this.cache) : { ...DEFAULT_STATE }
      }

      const state = this.stateFromServer(response)
      this.saveCache(key, state, response)
      this.state = state
      this.cache = this.loadCache()
      this.log('License validated with server', { status: state.status, plan: state.plan })
      return state
    } catch (error) {
      this.log('License server validation failed; using cache', error)
      return this.cache ? this.validateFromCache(this.cache) : { ...DEFAULT_STATE }
    }
  }

  validateFromCache(cache: LicenseCache): LicenseState {
    const lastValidated = cache.last_validated ? Date.parse(cache.last_validated) : 0
    const lastValidatedAgeMs = Date.now() - lastValidated
    const gracePeriodDays = cache.grace_period_days ?? DEFAULT_GRACE_PERIOD_DAYS

    if (!lastValidated || lastValidatedAgeMs > gracePeriodDays * 24 * 60 * 60 * 1000) {
      return this.cacheToState(cache, 'grace_expired')
    }

    if (cache.expires_at) {
      const expires = Date.parse(cache.expires_at)
      const expiredAgeMs = Date.now() - expires
      if (!Number.isNaN(expires) && expiredAgeMs > 0) {
        const status = expiredAgeMs <= gracePeriodDays * 24 * 60 * 60 * 1000 ? 'grace' : 'expired'
        return this.cacheToState(cache, status)
      }
    }

    const state = this.cacheToState(cache)
    this.state = state
    return state
  }

  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    if (!ONLINE_STATUSES.has(this.state.status)) return false
    return Boolean(this.state.features?.[feature])
  }

  checkLimit(limitKey: LicenseLimitKey, currentCount: number): boolean {
    if (!ONLINE_STATUSES.has(this.state.status)) return false
    const limit = this.state.features?.[limitKey]
    if (typeof limit !== 'number') return false
    if (limit === -1) return true
    return currentCount <= limit
  }

  startHeartbeat(): void {
    if (this.heartbeatTimer) return
    this.heartbeatTimer = setInterval(() => {
      void this.sendHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)
  }

  async sendHeartbeat(): Promise<void> {
    try {
      const key = this.cache?.license_key
      if (!key || !ONLINE_STATUSES.has(this.state.status)) return

      await this.postToServer('/api/license/heartbeat', {
        key,
        machineId: this.getMachineId(),
        appVersion: app.getVersion(),
        usageStats: this.collectUsageStats()
      })
      this.log('License heartbeat sent')
    } catch (error) {
      this.log('License heartbeat failed', error)
    }
  }

  getMachineId(): string {
    if (!this.machineId) {
      this.machineId = machineIdSync({ original: true } as unknown as boolean)
    }
    return this.machineId
  }

  getLicenseState(): LicenseState {
    return this.state
  }

  private loadCache(): LicenseCache | null {
    return (
      (getSqlite().prepare('SELECT * FROM license_cache ORDER BY id DESC LIMIT 1').get() as
        | LicenseCache
        | undefined) ?? null
    )
  }

  private saveCache(key: string, state: LicenseState, response: unknown): void {
    const licenseKey = this.getResponseString(response, ['licenseKey', 'license_key', 'key']) ?? key
    const now = new Date().toISOString()

    getSqlite()
      .prepare(
        `INSERT OR REPLACE INTO license_cache (
          id,
          license_key,
          plan,
          status,
          shop_name,
          owner_name,
          expires_at,
          grace_period_days,
          features,
          machine_id,
          last_validated,
          created_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(
          (SELECT created_at FROM license_cache WHERE id = 1),
          ?
        ))`
      )
      .run(
        licenseKey,
        state.plan ?? 'starter',
        state.status,
        state.shopName,
        state.ownerName,
        state.expiresAt,
        state.gracePeriodDays,
        state.features ? JSON.stringify(state.features) : null,
        this.getMachineId(),
        now,
        now
      )
  }

  private async postToServer(path: string, body: Record<string, unknown>): Promise<unknown> {
    const baseUrl = getLicenseServerUrl()
    if (!baseUrl) {
      throw new Error('License server URL is not configured')
    }
    const apiKey = getLicenseApiKey()
    if (!apiKey) {
      throw new Error('License API key is not configured')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) {
        return { ...data, success: false, statusCode: response.status }
      }
      return data
    } finally {
      clearTimeout(timeout)
    }
  }

  private collectUsageStats(): {
    billsToday: number
    totalBills: number
    totalCustomers: number
    totalProducts: number
  } {
    const db = getSqlite()
    const today = new Date().toISOString().slice(0, 10)
    const getCount = (sql: string, ...params: unknown[]): number => {
      const row = db.prepare(sql).get(...params) as { count: number } | undefined
      return row?.count ?? 0
    }

    return {
      billsToday: getCount('SELECT COUNT(*) as count FROM bills WHERE date = ?', today),
      totalBills: getCount('SELECT COUNT(*) as count FROM bills'),
      totalCustomers: getCount('SELECT COUNT(*) as count FROM customers'),
      totalProducts: getCount('SELECT COUNT(*) as count FROM products')
    }
  }

  private stateFromServer(response: unknown): LicenseState {
    const source = this.unwrapResponse(response)
    const fallback = this.cache
    const plan = this.getEnumValue<PlanTier>(
      source,
      ['plan'],
      ['starter', 'growth', 'pro', 'custom']
    )
    const status = this.getEnumValue<LicenseStatus>(
      source,
      ['status'],
      ['not_activated', 'trial', 'active', 'grace', 'expired', 'suspended', 'grace_expired']
    )
    const features =
      this.getFeatures(source) ?? (fallback ? this.parseFeatures(fallback.features) : null)
    const expiresAt =
      this.getResponseString(source, ['expiresAt', 'expires_at']) ?? fallback?.expires_at ?? null
    const gracePeriodDays =
      this.getResponseNumber(source, ['gracePeriodDays', 'grace_period_days']) ??
      fallback?.grace_period_days ??
      DEFAULT_GRACE_PERIOD_DAYS
    const resolvedStatus = status ?? 'active'

    return {
      status: resolvedStatus,
      licenseKey:
        this.getResponseString(source, ['licenseKey', 'license_key', 'key']) ??
        fallback?.license_key ??
        null,
      plan: plan ?? fallback?.plan ?? 'starter',
      shopName:
        this.getResponseString(source, ['shopName', 'shop_name']) ?? fallback?.shop_name ?? null,
      ownerName:
        this.getResponseString(source, ['ownerName', 'owner_name']) ?? fallback?.owner_name ?? null,
      expiresAt,
      daysRemaining: this.getStateDaysRemaining(source, resolvedStatus, expiresAt, gracePeriodDays),
      features,
      gracePeriodDays
    }
  }

  private cacheToState(cache: LicenseCache, forcedStatus?: LicenseStatus): LicenseState {
    const expiresAt = cache.expires_at
    const gracePeriodDays = cache.grace_period_days ?? DEFAULT_GRACE_PERIOD_DAYS
    const status = forcedStatus ?? cache.status
    return {
      status,
      licenseKey: cache.license_key,
      plan: cache.plan,
      shopName: cache.shop_name,
      ownerName: cache.owner_name,
      expiresAt,
      daysRemaining: this.getStateDaysRemaining({}, status, expiresAt, gracePeriodDays),
      features: this.parseFeatures(cache.features),
      gracePeriodDays
    }
  }

  private unwrapResponse(response: unknown): Record<string, unknown> {
    if (!this.isRecord(response)) return {}
    for (const key of ['licenseState', 'license', 'data']) {
      const nested = response[key]
      if (this.isRecord(nested)) return { ...response, ...nested }
    }
    return response
  }

  private isServerSuccess(response: unknown): boolean {
    if (!this.isRecord(response)) return false
    if (response.success === false) return false
    if (response.valid === false) return false
    return true
  }

  private getFeatures(source: unknown): FeatureFlags | null {
    if (!this.isRecord(source)) return null
    const raw = source.features
    if (this.isFeatureFlags(raw)) return raw
    if (typeof raw === 'string') return this.parseFeatures(raw)
    return null
  }

  private parseFeatures(raw: string | null): FeatureFlags | null {
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as unknown
      return this.isFeatureFlags(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  private isFeatureFlags(value: unknown): value is FeatureFlags {
    if (!this.isRecord(value)) return false
    return (
      typeof value.maxBillsPerMonth === 'number' &&
      typeof value.maxProducts === 'number' &&
      typeof value.maxCustomers === 'number'
    )
  }

  private getResponseString(source: unknown, keys: string[]): string | null {
    if (!this.isRecord(source)) return null
    for (const key of keys) {
      const value = source[key]
      if (typeof value === 'string' && value.trim()) return value
    }
    return null
  }

  private getResponseNumber(source: unknown, keys: string[]): number | null {
    if (!this.isRecord(source)) return null
    for (const key of keys) {
      const value = source[key]
      if (typeof value === 'number') return value
    }
    return null
  }

  private getServerErrorCode(source: unknown): string | null {
    const candidate = this.getResponseString(source, ['errorCode', 'code', 'error'])
    return candidate && SERVER_ERROR_CODES.has(candidate) ? candidate : null
  }

  private getEnumValue<T extends string>(
    source: unknown,
    keys: string[],
    values: readonly T[]
  ): T | null {
    const value = this.getResponseString(source, keys)
    return value && values.includes(value as T) ? (value as T) : null
  }

  private getDaysRemaining(expiresAt: string | null): number | null {
    if (!expiresAt) return null
    const expires = Date.parse(expiresAt)
    if (Number.isNaN(expires)) return null
    return Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000))
  }

  private getStateDaysRemaining(
    source: unknown,
    status: LicenseStatus,
    expiresAt: string | null,
    gracePeriodDays: number
  ): number | null {
    const serverDays = this.getResponseNumber(source, ['daysRemaining', 'days_remaining'])
    const expiryDays = serverDays ?? this.getDaysRemaining(expiresAt)

    if (expiryDays === null) return null
    if (status === 'grace' && expiryDays < 0) {
      return Math.max(gracePeriodDays + expiryDays, 0)
    }
    if ((status === 'expired' || status === 'grace_expired') && expiryDays < 0) {
      return 0
    }
    return Math.max(expiryDays, 0)
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  private log(message: string, details?: unknown): void {
    if (!app.isPackaged) {
      if (details === undefined) log.info(`[license] ${message}`)
      else log.info(`[license] ${message}`, details)
      return
    }

    try {
      const logDir = join(app.getPath('userData'), 'logs')
      if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
      appendFileSync(
        join(logDir, 'license.log'),
        `${new Date().toISOString()} ${message}${details ? ` ${this.formatDetails(details)}` : ''}\n`
      )
    } catch {
      // License logging must never interrupt the app.
    }
  }

  private formatDetails(details: unknown): string {
    if (details instanceof Error) return details.message
    try {
      return JSON.stringify(details)
    } catch {
      return String(details)
    }
  }
}

export const licenseManager = new LicenseManager()
