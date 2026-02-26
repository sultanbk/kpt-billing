// ============================================================================
// KPT Billing - Shared Format Utilities (usable from main process)
// ============================================================================

/**
 * Format a number as Indian currency string (plain, no ₹ symbol)
 * e.g. 12345.50 → "12,345.50"
 */
export function formatCurrencyPlain(amount: number): string {
  const fixed = Math.abs(amount).toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  // Indian number formatting: last 3 digits, then groups of 2
  let formatted = ''
  if (intPart.length <= 3) {
    formatted = intPart
  } else {
    const last3 = intPart.slice(-3)
    const rest = intPart.slice(0, -3)
    const groups: string[] = []
    for (let i = rest.length; i > 0; i -= 2) {
      groups.unshift(rest.slice(Math.max(0, i - 2), i))
    }
    formatted = groups.join(',') + ',' + last3
  }
  return (amount < 0 ? '-' : '') + formatted + '.' + decPart
}
