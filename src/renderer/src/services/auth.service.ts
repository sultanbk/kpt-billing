export interface AuthService {
  verifyPin: (pin: string) => Promise<{
    success: boolean
    user?: { id: number; name: string; role: string }
    error?: string
  }>
  changePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>
}

export const authService: AuthService = {
  verifyPin: (pin) => window.api.auth.verifyPin(pin),
  changePin: (currentPin, newPin) => window.api.auth.changePin(currentPin, newPin)
}
