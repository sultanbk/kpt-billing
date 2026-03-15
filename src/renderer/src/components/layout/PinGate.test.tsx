import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PinGate } from './PinGate'
import { useAuthStore } from '../../stores/auth.store'

beforeEach(() => {
  useAuthStore.getState().lock()
  vi.clearAllMocks()
})

describe('PinGate', () => {
  it('shows lock screen when not unlocked', () => {
    render(
      <PinGate>
        <div>Protected Content</div>
      </PinGate>
    )

    expect(screen.getByText('Owner Access')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter PIN')).toBeInTheDocument()
    expect(screen.getByText('Unlock')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('shows children when unlocked', () => {
    useAuthStore.getState().unlock({ id: 1, name: 'Puneet', role: 'owner' })

    render(
      <PinGate>
        <div>Protected Content</div>
      </PinGate>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Owner Access')).not.toBeInTheDocument()
  })

  it('has disabled Unlock button when PIN is too short', () => {
    render(
      <PinGate>
        <div>Content</div>
      </PinGate>
    )

    const button = screen.getByText('Unlock')
    expect(button).toBeDisabled()
  })

  it('enables Unlock button when PIN is 4+ digits', async () => {
    const user = userEvent.setup()

    render(
      <PinGate>
        <div>Content</div>
      </PinGate>
    )

    const input = screen.getByPlaceholderText('Enter PIN')
    await user.type(input, '1234')

    const button = screen.getByText('Unlock')
    expect(button).not.toBeDisabled()
  })

  it('only allows numeric input', async () => {
    const user = userEvent.setup()

    render(
      <PinGate>
        <div>Content</div>
      </PinGate>
    )

    const input = screen.getByPlaceholderText('Enter PIN') as HTMLInputElement
    await user.type(input, 'abc123')
    // Non-digit chars should be stripped
    expect(input.value).toBe('123')
  })

  it('calls verifyPin API on form submit', async () => {
    const user = userEvent.setup()
    const mockVerifyPin = window.api.auth.verifyPin as ReturnType<typeof vi.fn>
    mockVerifyPin.mockResolvedValue({
      success: true,
      user: { id: 1, name: 'Puneet', role: 'owner' }
    })

    render(
      <PinGate>
        <div>Protected Content</div>
      </PinGate>
    )

    const input = screen.getByPlaceholderText('Enter PIN')
    await user.type(input, '1234')
    await user.click(screen.getByText('Unlock'))

    await waitFor(() => {
      expect(mockVerifyPin).toHaveBeenCalledWith('1234')
    })

    // After successful verification, children should be shown
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('shows error on incorrect PIN', async () => {
    const user = userEvent.setup()
    const mockVerifyPin = window.api.auth.verifyPin as ReturnType<typeof vi.fn>
    mockVerifyPin.mockResolvedValue({ success: false })

    render(
      <PinGate>
        <div>Content</div>
      </PinGate>
    )

    const input = screen.getByPlaceholderText('Enter PIN')
    await user.type(input, '9999')
    await user.click(screen.getByText('Unlock'))

    await waitFor(() => {
      expect(screen.getByText('Incorrect PIN')).toBeInTheDocument()
    })
  })

  it('toggles PIN visibility', async () => {
    const user = userEvent.setup()

    render(
      <PinGate>
        <div>Content</div>
      </PinGate>
    )

    const input = screen.getByPlaceholderText('Enter PIN') as HTMLInputElement
    expect(input.type).toBe('password')

    // Click the eye toggle button
    const toggleButtons = screen.getAllByRole('button')
    const eyeButton = toggleButtons.find((b) => b !== screen.getByText('Unlock'))
    if (eyeButton) {
      await user.click(eyeButton)
      expect(input.type).toBe('text')
    }
  })
})
