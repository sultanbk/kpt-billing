import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth.store'

beforeEach(() => {
  useAuthStore.getState().lock()
})

describe('AuthStore', () => {
  describe('initial state', () => {
    it('starts locked with no user', () => {
      const state = useAuthStore.getState()
      expect(state.isUnlocked).toBe(false)
      expect(state.user).toBeNull()
    })
  })

  describe('unlock', () => {
    it('unlocks with user info', () => {
      useAuthStore.getState().unlock({ id: 1, name: 'Puneet', role: 'owner' })
      const state = useAuthStore.getState()

      expect(state.isUnlocked).toBe(true)
      expect(state.user).toEqual({ id: 1, name: 'Puneet', role: 'owner' })
    })
  })

  describe('lock', () => {
    it('locks and clears user', () => {
      useAuthStore.getState().unlock({ id: 1, name: 'Puneet', role: 'owner' })
      useAuthStore.getState().lock()
      const state = useAuthStore.getState()

      expect(state.isUnlocked).toBe(false)
      expect(state.user).toBeNull()
    })
  })

  describe('role-based access', () => {
    it('stores owner role', () => {
      useAuthStore.getState().unlock({ id: 1, name: 'Admin', role: 'owner' })
      expect(useAuthStore.getState().user?.role).toBe('owner')
    })

    it('stores cashier role', () => {
      useAuthStore.getState().unlock({ id: 2, name: 'Staff', role: 'cashier' })
      expect(useAuthStore.getState().user?.role).toBe('cashier')
    })
  })
})
