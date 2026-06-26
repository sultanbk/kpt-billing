// ============================================================================
// KPT Billing - IPC Request Context
// Stores the currently authenticated user for audit attribution across IPC calls.
// Set on successful PIN verification, cleared on lock.
// ============================================================================

interface IpcUser {
  id: number
  name: string
  role: string
}

let currentUser: IpcUser | null = null

/**
 * Set the currently authenticated user (called on PIN verification success).
 */
export function setCurrentUser(user: IpcUser | null): void {
  currentUser = user
}

/**
 * Get the currently authenticated user for audit attribution.
 */
export function getCurrentUser(): IpcUser | null {
  return currentUser
}
