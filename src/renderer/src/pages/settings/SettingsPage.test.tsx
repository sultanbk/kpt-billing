import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsPage from './SettingsPage'

const api = window.api as unknown as {
  settings: {
    getAll: ReturnType<typeof vi.fn>
    setMany: ReturnType<typeof vi.fn>
  }
  printer: {
    getAvailable: ReturnType<typeof vi.fn>
  }
  cloud: {
    getStatus: ReturnType<typeof vi.fn>
  }
  auth: {
    verifyPin: ReturnType<typeof vi.fn>
  }
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.settings.getAll.mockResolvedValue({
      shopName: 'KRISHNAPRIYA TEXTILES',
      shopPhone: '9108455006',
      upiVpa: 'legacy@upi',
      upiPayeeName: 'Legacy Shop'
    })
    api.settings.setMany.mockResolvedValue(true)
    api.printer.getAvailable.mockResolvedValue(['Receipt Printer', 'Label Printer'])
    api.cloud.getStatus.mockResolvedValue({
      configured: false,
      authenticated: false,
      hasRefreshToken: false
    })
    api.auth.verifyPin.mockResolvedValue({
      success: true,
      user: { id: 1, name: 'Owner', role: 'owner' }
    })
  })

  it('loads settings, updates a field, and saves all settings', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    // Switch to General tab
    await user.click(await screen.findByRole('button', { name: /general/i }))

    const shopName = await screen.findByDisplayValue('KRISHNAPRIYA TEXTILES')
    await user.clear(shopName)
    await user.type(shopName, 'KPT Sarees')
    await user.click(screen.getByRole('button', { name: /save settings/i }))

    await waitFor(() => {
      expect(api.settings.setMany).toHaveBeenCalledWith(
        expect.objectContaining({
          shopName: 'KPT Sarees',
          receiptPaperWidthMm: '58',
          paymentMethods: '[]'
        })
      )
    })
  })

  it('switches tabs and removes guide/about from settings navigation', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    // Switch to General tab
    await user.click(await screen.findByRole('button', { name: /general/i }))

    expect(await screen.findAllByText('Shop and billing identity', { exact: false })).toHaveLength(
      2
    )
    expect(screen.queryByRole('button', { name: /user guide/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /about/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /barcode/i }))
    expect(await screen.findByText('Barcode Label Content')).toBeInTheDocument()
  })

  it('unlocks payment settings with owner PIN and shows legacy UPI migration', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await user.click(await screen.findByRole('button', { name: /payments/i }))
    await user.click(await screen.findByText(/unlock to view/i))
    await user.type(await screen.findByPlaceholderText('••••'), '1234')
    await user.click(screen.getByRole('button', { name: /^unlock$/i }))

    await waitFor(() => expect(api.auth.verifyPin).toHaveBeenCalledWith('1234'))
    expect(await screen.findByText('Default UPI')).toBeInTheDocument()
    expect(screen.getByText(/legacy@upi/i)).toBeInTheDocument()
  })

  it('adds a payment method and syncs the default UPI keys before save', async () => {
    const user = userEvent.setup()
    api.settings.getAll.mockResolvedValue({ paymentMethods: '[]' })

    render(<SettingsPage />)

    await user.click(await screen.findByRole('button', { name: /payments/i }))
    await user.click(await screen.findByText(/unlock to view/i))
    await user.type(await screen.findByPlaceholderText('••••'), '1234')
    await user.click(screen.getByRole('button', { name: /^unlock$/i }))
    await user.click(await screen.findByRole('button', { name: /add account/i }))

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/method name/i), {
      target: { value: 'Main UPI' }
    })
    fireEvent.change(within(dialog).getByLabelText(/upi id/i), {
      target: { value: 'main@upi' }
    })
    fireEvent.change(within(dialog).getByLabelText(/payee name/i), {
      target: { value: 'KPT' }
    })
    fireEvent.click(within(dialog).getByLabelText(/use for billing receipt qr codes/i))
    fireEvent.click(within(dialog).getByRole('button', { name: /save method/i }))

    await user.click(screen.getByRole('button', { name: /save settings/i }))

    await waitFor(() => {
      expect(api.settings.setMany).toHaveBeenCalledWith(
        expect.objectContaining({
          upiVpa: 'main@upi',
          upiPayeeName: 'KPT'
        })
      )
    })
  })
})
