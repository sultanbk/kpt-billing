import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout'
import { PinGate } from './components/layout/PinGate'
import { ErrorBoundary } from './components/ErrorBoundary'
import { lazy, Suspense } from 'react'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BillingPage = lazy(() => import('./pages/billing'))
const ProductsPage = lazy(() => import('./pages/products'))
const CustomersPage = lazy(() => import('./pages/customers'))
const ReportsPage = lazy(() => import('./pages/reports'))
const SettingsPage = lazy(() => import('./pages/settings'))
const PurchasesPage = lazy(() => import('./pages/purchases'))
const CustomerAnalyticsPage = lazy(() => import('./pages/CustomerAnalyticsPage'))
const CreditAgingPage = lazy(() => import('./pages/CreditAgingPage'))
const DataExportPage = lazy(() => import('./pages/DataExportPage'))

function PageLoader(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  )
}

import { OwnerPinGate } from './components/layout'

/** Wrapper that requires PIN for protected pages */
function Protected({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <PinGate>{children}</PinGate>
}

/** Wrapper that requires Owner PIN for owner-only pages */
function OwnerProtected({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <OwnerPinGate>{children}</OwnerPinGate>
}

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            {/* Billing is the default page — no PIN required */}
            <Route
              index
              element={
                <Suspense fallback={<PageLoader />}>
                  <BillingPage />
                </Suspense>
              }
            />
            {/* All other pages require PIN */}
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
          </Route>
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}

export default App
