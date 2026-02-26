import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  IndianRupee,
  Truck,
  Lock,
  LockOpen,
  TrendingUp,
  Clock,
  FileSpreadsheet
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth.store'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  shortcut: string
  protected: boolean
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: '',
    items: [
      { to: '/', label: 'Billing', icon: ShoppingCart, shortcut: 'F2', protected: false },
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'F1', protected: true }
    ]
  },
  {
    label: 'Inventory',
    items: [
      { to: '/products', label: 'Products', icon: Package, shortcut: 'F3', protected: true },
      { to: '/purchases', label: 'Purchases', icon: Truck, shortcut: 'F4', protected: true },
      { to: '/customers', label: 'Customers', icon: Users, shortcut: 'F5', protected: true }
    ]
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3, shortcut: 'F7', protected: true },
      { to: '/customer-analytics', label: 'Analytics', icon: TrendingUp, shortcut: '', protected: true },
      { to: '/credit-aging', label: 'Credit Aging', icon: Clock, shortcut: '', protected: true },
      { to: '/data-export', label: 'Data Export', icon: FileSpreadsheet, shortcut: '', protected: true }
    ]
  },
  {
    label: '',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings, shortcut: 'F10', protected: true }
    ]
  }
]

export function Sidebar(): React.JSX.Element {
  const { isUnlocked, user, lock } = useAuthStore()

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card/50">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--kpt-maroon)] to-[var(--kpt-maroon-light)] shadow-md shadow-[var(--kpt-maroon)]/20">
          <IndianRupee className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight tracking-tight text-foreground">
            Krishnapriya
          </span>
          <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
            Textiles
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className={cn(sIdx > 0 && 'mt-2')}>
            {section.label && (
              <div className="mb-1 px-3 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                      isActive
                        ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5'
                        : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
                      )}
                      <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                      <span className="flex-1">{item.label}</span>
                      {item.protected && !isUnlocked && (
                        <Lock className="h-3 w-3 text-muted-foreground/40" />
                      )}
                      {item.shortcut && (!item.protected || isUnlocked) && (
                        <kbd className="hidden rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70 lg:inline-block">
                          {item.shortcut}
                        </kbd>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer with lock status */}
      <div className="border-t border-border/60 px-3 py-3 space-y-2">
        {isUnlocked && (
          <button
            onClick={lock}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-700 hover:from-amber-500/20 hover:to-orange-500/20 hover:border-amber-500/40 hover:shadow-sm group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 group-hover:bg-amber-500/25 transition-colors">
              <LockOpen className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[11px] font-semibold leading-tight">Lock Screen</div>
              <div className="text-[9px] text-amber-600/70 leading-tight">{user?.name}</div>
            </div>
            <kbd className="rounded-md bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono text-amber-600/80">Alt+L</kbd>
          </button>
        )}
        <div className="text-center text-[10px] text-muted-foreground/50 font-medium">
          KPT Billing v1.0.0
        </div>
      </div>
    </aside>
  )
}
