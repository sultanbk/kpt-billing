import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Toaster } from '../ui/sonner'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { QuickBillSearch } from './QuickBillSearch'
import { ShortcutsHelp } from './ShortcutsHelp'
import { LockScreen } from './LockScreen'
import { useAuthStore } from '../../stores/auth.store'

export function AppShell(): React.JSX.Element {
  const [showBillSearch, setShowBillSearch] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [locked, setLocked] = useState(false)
  const { lock } = useAuthStore()

  useKeyboardShortcuts({
    onQuickSearch: () => setShowBillSearch(true),
    onShowShortcuts: () => setShowShortcuts((prev) => !prev),
    onLockScreen: () => {
      lock()
      setLocked(true)
    }
  })

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-muted/20">
        <Outlet />
      </main>
      <Toaster position="bottom-right" richColors closeButton />
      <QuickBillSearch open={showBillSearch} onClose={() => setShowBillSearch(false)} />
      <ShortcutsHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <LockScreen open={locked} onUnlock={() => setLocked(false)} />
    </div>
  )
}
