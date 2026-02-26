import { create } from 'zustand'

interface AuthState {
  isUnlocked: boolean
  user: { id: number; name: string; role: string } | null
  unlock: (user: { id: number; name: string; role: string }) => void
  lock: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isUnlocked: false,
  user: null,
  unlock: (user) => set({ isUnlocked: true, user }),
  lock: () => set({ isUnlocked: false, user: null })
}))
