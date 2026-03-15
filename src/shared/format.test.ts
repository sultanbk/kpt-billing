import { describe, it, expect } from 'vitest'
import { formatCurrencyPlain } from './format'

describe('formatCurrencyPlain', () => {
  it('formats zero correctly', () => {
    expect(formatCurrencyPlain(0)).toBe('0.00')
  })

  it('formats small amounts (under 1000)', () => {
    expect(formatCurrencyPlain(5)).toBe('5.00')
    expect(formatCurrencyPlain(99)).toBe('99.00')
    expect(formatCurrencyPlain(100)).toBe('100.00')
    expect(formatCurrencyPlain(999.99)).toBe('999.99')
  })

  it('formats thousands with Indian grouping', () => {
    expect(formatCurrencyPlain(1000)).toBe('1,000.00')
    expect(formatCurrencyPlain(12345)).toBe('12,345.00')
    expect(formatCurrencyPlain(12345.5)).toBe('12,345.50')
  })

  it('formats lakhs with Indian grouping', () => {
    expect(formatCurrencyPlain(100000)).toBe('1,00,000.00')
    expect(formatCurrencyPlain(123456.78)).toBe('1,23,456.78')
    expect(formatCurrencyPlain(999999.99)).toBe('9,99,999.99')
  })

  it('formats crores with Indian grouping', () => {
    expect(formatCurrencyPlain(10000000)).toBe('1,00,00,000.00')
    expect(formatCurrencyPlain(12345678.9)).toBe('1,23,45,678.90')
  })

  it('handles negative amounts', () => {
    expect(formatCurrencyPlain(-500)).toBe('-500.00')
    expect(formatCurrencyPlain(-12345.67)).toBe('-12,345.67')
    expect(formatCurrencyPlain(-100000)).toBe('-1,00,000.00')
  })

  it('rounds to two decimal places', () => {
    expect(formatCurrencyPlain(10.999)).toBe('11.00')
    expect(formatCurrencyPlain(10.551)).toBe('10.55')
    // JS toFixed uses banker's rounding: 10.555.toFixed(2) === '10.55'
    expect(formatCurrencyPlain(10.555)).toBe('10.55')
  })

  it('handles very small decimal amounts', () => {
    expect(formatCurrencyPlain(0.5)).toBe('0.50')
    expect(formatCurrencyPlain(0.01)).toBe('0.01')
  })
})
