import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import type { LicenseStatus } from '@shared/licenseTypes'
import { AppShell, OwnerPinGate } from './components/layout'
import { PinGate } from './components/layout/PinGate'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SplashScreen } from './components/SplashScreen'
import { RenewalScreen } from './components/RenewalScreen'
import { SuspendedScreen } from './components/SuspendedScreen'
import { ActivationScreen } from './components/license'
import { useLicenseStore } from './stores/licenseStore'

const DashboardPage = lazy(() => import('./pages/dashboard'))
const BillingPage = lazy(() => import('./pages/billing'))
const ProductsPage = lazy(() => import('./pages/products'))
const CustomersPage = lazy(() => import('./pages/customers'))
const ReportsPage = lazy(() => import('./pages/reports'))
const SettingsPage = lazy(() => import('./pages/settings'))
const PurchasesPage = lazy(() => import('./pages/purchases'))
const CustomerAnalyticsPage = lazy(() => import('./pages/customer-analytics'))
const CreditAgingPage = lazy(() => import('./pages/credit-aging'))
const DataExportPage = lazy(() => import('./pages/data-export'))

function PageLoader(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  )
}

function Protected({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <PinGate>{children}</PinGate>
}

function OwnerProtected({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <OwnerPinGate>{children}</OwnerPinGate>
}

function BillingRoute(): React.JSX.Element {
  return (
    <Suspense fallback={<PageLoader />}>
      <BillingPage />
    </Suspense>
  )
}

function AppRoutes({ limitedMode = false }: { limitedMode?: boolean }): React.JSX.Element {
  return (
    <Routes>
      <Route element={<AppShell limitedMode={limitedMode} />}>
        <Route index element={<BillingRoute />} />
        {limitedMode ? (
          <Route path="*" element={<Navigate to="/" replace />} />
        ) : (
          <>
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<PageLoader />}>
                  <OwnerProtected>
                    <DashboardPage />
                  </OwnerProtected>
                </Suspense>
              }
            />
            <Route
              path="products"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Protected>
                    <ProductsPage />
                  </Protected>
                </Suspense>
              }
            />
            <Route
              path="purchases"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Protected>
                    <PurchasesPage />
                  </Protected>
                </Suspense>
              }
            />
            <Route
              path="customers"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Protected>
                    <CustomersPage />
                  </Protected>
                </Suspense>
              }
            />
            <Route
              path="reports"
              element={
                <Suspense fallback={<PageLoader />}>
                  <OwnerProtected>
                    <ReportsPage />
                  </OwnerProtected>
                </Suspense>
              }
            />
            <Route
              path="customer-analytics"
              element={
                <Suspense fallback={<PageLoader />}>
                  <OwnerProtected>
                    <CustomerAnalyticsPage />
                  </OwnerProtected>
                </Suspense>
              }
            />
            <Route
              path="credit-aging"
              element={
                <Suspense fallback={<PageLoader />}>
                  <OwnerProtected>
                    <CreditAgingPage />
                  </OwnerProtected>
                </Suspense>
              }
            />
            <Route
              path="data-export"
              element={
                <Suspense fallback={<PageLoader />}>
                  <OwnerProtected>
                    <DataExportPage />
                  </OwnerProtected>
                </Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <Suspense fallback={<PageLoader />}>
                  <OwnerProtected>
                    <SettingsPage />
                  </OwnerProtected>
                </Suspense>
              }
            />
          </>
        )}
      </Route>
    </Routes>
  )
}

function App(): React.JSX.Element {
  const initialize = useLicenseStore((state) => state.initialize)
  const licenseState = useLicenseStore((state) => state.licenseState)
  const [startupStatus, setStartupStatus] = useState<LicenseStatus | null>(null)
  const [splashExiting, setSplashExiting] = useState(false)
  const [startupReady, setStartupReady] = useState(false)
  const [limitedMode, setLimitedMode] = useState(false)
  const [activatedFromStartup, setActivatedFromStartup] = useState(false)

  useEffect(() => {
    let cancelled = false
    let fadeTimer: number | undefined

    async function boot(): Promise<void> {
      const minimumSplash = new Promise((resolve) => window.setTimeout(resolve, 1500))
      await Promise.all([initialize(), minimumSplash])
      if (cancelled) return

      setStartupStatus(useLicenseStore.getState().licenseState?.status ?? 'not_activated')
      setSplashExiting(true)
      fadeTimer = window.setTimeout(() => {
        if (!cancelled) setStartupReady(true)
      }, 300)
    }

    void boot()

    return () => {
      cancelled = true
      if (fadeTimer) window.clearTimeout(fadeTimer)
    }
  }, [initialize])

  if (!startupReady) {
    return <SplashScreen exiting={splashExiting} />
  }

  const openApp =
    startupStatus === 'trial' || startupStatus === 'active' || startupStatus === 'grace'
  const appContent = (
    <HashRouter>
      <AppRoutes limitedMode={limitedMode} />
    </HashRouter>
  )

  return (
    <ErrorBoundary>
      {openApp || limitedMode ? (
        <div className={activatedFromStartup ? 'animate-activation-to-app' : undefined}>
          {appContent}
        </div>
      ) : startupStatus === 'suspended' && licenseState ? (
        <SuspendedScreen licenseState={licenseState} />
      ) : (startupStatus === 'expired' || startupStatus === 'grace_expired') && licenseState ? (
        <RenewalScreen
          licenseState={licenseState}
          onContinueLimited={
            licenseState.daysRemaining !== null && licenseState.daysRemaining > 0
              ? () => setLimitedMode(true)
              : undefined
          }
        />
      ) : (
        <ActivationScreen
          onActivated={() => {
            setActivatedFromStartup(true)
            setStartupStatus(useLicenseStore.getState().licenseState?.status ?? 'active')
          }}
        />
      )}
    </ErrorBoundary>
  )
}

export default App
