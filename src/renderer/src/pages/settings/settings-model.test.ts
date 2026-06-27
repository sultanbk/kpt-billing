import { describe, expect, it } from 'vitest'
import {
  parsePaymentMethods,
  serializePaymentMethods,
  settingBool,
  settingNumber,
  settingValue,
  syncDefaultPaymentMethod,
  withSettingsDefaults
} from './settings-model'

describe('settings-model', () => {
  it('reads values with defaults', () => {
    const settings = withSettingsDefaults({ shopName: 'New Shop' })

    expect(settingValue(settings, 'shopName')).toBe('New Shop')
    expect(settingValue(settings, 'receiptPaperWidthMm')).toBe('58')
    expect(settingValue(settings, 'missing')).toBe('')
  })

  it('converts persisted string booleans and numbers safely', () => {
    expect(settingBool({ autoPrintReceipt: 'true' }, 'autoPrintReceipt')).toBe(true)
    expect(settingBool({ autoPrintReceipt: 'false' }, 'autoPrintReceipt')).toBe(false)
    expect(settingNumber({ backupRetention: '45' }, 'backupRetention', 30)).toBe(45)
    expect(settingNumber({ backupRetention: 'oops' }, 'backupRetention', 30)).toBe(30)
  })

  it('parses payment methods from JSON', () => {
    const methods = parsePaymentMethods({
      paymentMethods: JSON.stringify([
        {
          id: 'upi-1',
          type: 'upi',
          name: 'Main UPI',
          isDefaultBilling: true,
          details: { upiVpa: 'shop@upi' }
        }
      ])
    })

    expect(methods).toHaveLength(1)
    expect(methods[0]).toMatchObject({ id: 'upi-1', name: 'Main UPI' })
  })

  it('falls back to legacy UPI settings when payment JSON is missing or invalid', () => {
    expect(parsePaymentMethods({ upiVpa: 'legacy@upi', upiPayeeName: 'Legacy Payee' })).toEqual([
      {
        id: 'legacy-default',
        type: 'upi',
        name: 'Default UPI',
        isDefaultBilling: true,
        details: { upiVpa: 'legacy@upi', payeeName: 'Legacy Payee' }
      }
    ])

    expect(
      parsePaymentMethods({
        paymentMethods: '{bad-json',
        upiVpa: 'legacy@upi'
      })[0].details.upiVpa
    ).toBe('legacy@upi')
  })

  it('serializes payment methods and syncs legacy default UPI keys', () => {
    const result = serializePaymentMethods([
      {
        id: 'bank-1',
        type: 'bank',
        name: 'Bank',
        details: { accountNo: '123' }
      },
      {
        id: 'upi-1',
        type: 'upi',
        name: 'UPI',
        isDefaultBilling: true,
        details: { upiVpa: 'shop@upi', payeeName: 'Shop' }
      }
    ])

    expect(JSON.parse(result.paymentMethods)).toHaveLength(2)
    expect(result.upiVpa).toBe('shop@upi')
    expect(result.upiPayeeName).toBe('Shop')
  })

  it('marks only one payment method as billing default', () => {
    const result = syncDefaultPaymentMethod(
      [
        { id: 'one', type: 'upi', name: 'One', isDefaultBilling: true, details: {} },
        { id: 'two', type: 'scanner', name: 'Two', details: {} }
      ],
      'two'
    )

    expect(result.map((method) => [method.id, method.isDefaultBilling])).toEqual([
      ['one', false],
      ['two', true]
    ])
  })
})
