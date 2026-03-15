// ============================================================================
// KPT Billing - Global Keyboard Shortcuts Hook
// ============================================================================
import { useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const ROUTE_SHORTCUTS: Record<string, string> = {
  F1: '/dashboard',
  F2: '/',
  F3: '/products',
  F4: '/purchases',
  F5: '/customers',
  F7: '/reports',
  F10: '/settings'
}

interface ShortcutCallbacks {
  onQuickSearch?: () => void
  onShowShortcuts?: () => void
  onLockScreen?: () => void
}

export function useKeyboardShortcuts(callbacks?: ShortcutCallbacks): void {
  const navigate = useNavigate()
  const location = useLocation()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // F12: Show shortcuts help
      if (e.key === 'F12') {
        e.preventDefault()
        callbacks?.onShowShortcuts?.()
        return
      }

      // F-key navigation — always works (even in inputs)
      const route = ROUTE_SHORTCUTS[e.key]
      if (route) {
        e.preventDefault()
        if (location.pathname !== route) {
          navigate(route)
        }
        return
      }

      // Don't intercept Ctrl shortcuts when in inputs (except our defined ones)
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Alt shortcuts
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'l':
            e.preventDefault()
            callbacks?.onLockScreen?.()
            return
        }
      }

      // Ctrl shortcuts
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'k':
            e.preventDefault()
            callbacks?.onQuickSearch?.()
            break
          case 'l':
            e.preventDefault()
            callbacks?.onLockScreen?.()
            break
          case 'n':
            e.preventDefault()
            navigate('/')
            break
          case 'b':
            if (!isInput) {
              e.preventDefault()
              navigate('/')
            }
            break
        }
      }

      // Ctrl+Shift shortcuts
      if (e.ctrlKey && e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'r':
            e.preventDefault()
            navigate('/reports')
            break
          case 'd':
            e.preventDefault()
            navigate('/dashboard')
            break
        }
      }

      // Escape — blur active input/close modals
      if (e.key === 'Escape' && isInput) {
        ;(target as HTMLInputElement).blur()
      }
    },
    [navigate, location.pathname, callbacks]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
