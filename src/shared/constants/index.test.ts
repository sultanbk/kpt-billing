import { describe, it, expect } from 'vitest'
import {
  APP_NAME,
  SHOP_NAME,
  DEFAULT_CATEGORIES,
  GST_RATES,
  COMMON_HSN_CODES,
  PAYMENT_MODES,
  EXPENSE_CATEGORIES,
  SHORTCUTS,
  DEFAULT_SETTINGS,
  getLocalDateString,
  getFinancialYear,
  getBillPrefix
} from './index'

describe('Constants', () => {
  it('APP_NAME is defined', () => {
    expect(APP_NAME).toBe('KPT Billing')
  })

  it('SHOP_NAME is defined', () => {
    expect(SHOP_NAME).toBe('KRISHNAPRIYA TEXTILES')
  })

  it('DEFAULT_CATEGORIES has expected categories', () => {
    expect(DEFAULT_CATEGORIES).toContain('Saree')
    expect(DEFAULT_CATEGORIES).toContain('Fabric')
    expect(DEFAULT_CATEGORIES).toContain('Other')
    expect(DEFAULT_CATEGORIES.length).toBeGreaterThan(0)
  })

  it('GST_RATES has valid Indian GST rates', () => {
    expect(GST_RATES).toEqual([0, 5, 12, 18, 28])
  })

  it('COMMON_HSN_CODES are valid textile codes', () => {
    expect(COMMON_HSN_CODES.length).toBeGreaterThan(0)
    for (const hsn of COMMON_HSN_CODES) {
      expect(hsn.code).toBeTruthy()
      expect(hsn.description).toBeTruthy()
      expect(hsn.code.length).toBe(4)
    }
  })

  it('PAYMENT_MODES includes all modes', () => {
    expect(PAYMENT_MODES).toContain('cash')
    expect(PAYMENT_MODES).toContain('upi')
    expect(PAYMENT_MODES).toContain('card')
    expect(PAYMENT_MODES).toContain('credit')
    expect(PAYMENT_MODES).toContain('mixed')
  })

  it('EXPENSE_CATEGORIES is defined', () => {
    expect(EXPENSE_CATEGORIES.length).toBeGreaterThan(0)
    expect(EXPENSE_CATEGORIES).toContain('Rent')
    expect(EXPENSE_CATEGORIES).toContain('Salary')
  })

  it('SHORTCUTS has expected keys', () => {
    expect(SHORTCUTS.NEW_BILL).toBe('F1')
    expect(SHORTCUTS.FOCUS_SEARCH).toBe('F2')
    expect(SHORTCUTS.PAYMENT).toBe('F5')
    expect(SHORTCUTS.CANCEL).toBe('Escape')
  })

  it('DEFAULT_SETTINGS has all required keys', () => {
    expect(DEFAULT_SETTINGS.shopName).toBeTruthy()
    expect(DEFAULT_SETTINGS.stateCode).toBe('29') // Karnataka
    expect(DEFAULT_SETTINGS.defaultPaymentMode).toBe('cash')
    expect(DEFAULT_SETTINGS.theme).toBe('light')
  })
})

describe('getLocalDateString', () => {
  it('formats a known date correctly', () => {
    const date = new Date(2025, 0, 15) // Jan 15, 2025
    expect(getLocalDateString(date)).toBe('2025-01-15')
  })

  it('pads single-digit month and day', () => {
    const date = new Date(2025, 2, 5) // March 5, 2025
    expect(getLocalDateString(date)).toBe('2025-03-05')
  })

  it('handles December 31 correctly', () => {
    const date = new Date(2025, 11, 31) // Dec 31, 2025
    expect(getLocalDateString(date)).toBe('2025-12-31')
  })

  it('defaults to today if no argument', () => {
    const result = getLocalDateString()
    // Should be a valid YYYY-MM-DD format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('getFinancialYear', () => {
  it('returns correct FY for dates in April-December (post-April)', () => {
    // April 2025 → FY 2025-26
    expect(getFinancialYear(new Date(2025, 3, 1))).toBe('2025-26')
    // December 2025 → FY 2025-26
    expect(getFinancialYear(new Date(2025, 11, 31))).toBe('2025-26')
  })

  it('returns correct FY for dates in January-March (pre-April)', () => {
    // January 2026 → FY 2025-26
    expect(getFinancialYear(new Date(2026, 0, 1))).toBe('2025-26')
    // March 2026 → FY 2025-26
    expect(getFinancialYear(new Date(2026, 2, 31))).toBe('2025-26')
  })

  it('handles April 1 boundary correctly', () => {
    // March 31, 2025 → FY 2024-25
    expect(getFinancialYear(new Date(2025, 2, 31))).toBe('2024-25')
    // April 1, 2025 → FY 2025-26
    expect(getFinancialYear(new Date(2025, 3, 1))).toBe('2025-26')
  })
})

describe('getBillPrefix', () => {
  it('returns KPT/ followed by the financial year', () => {
    expect(getBillPrefix(new Date(2025, 5, 15))).toBe('KPT/2025-26/')
    expect(getBillPrefix(new Date(2026, 1, 10))).toBe('KPT/2025-26/')
  })
})
