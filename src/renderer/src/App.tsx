import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout'
import { PinGate } from './components/layout/PinGate'
import { lazy, Suspense } from 'react'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BillingPage = lazy(() => import('./pages/BillingPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'))
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

/** Wrapper that requires PIN for protected pages */
function Protected({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <PinGate>{children}</PinGate>
}

function App(): React.JSX.Element {
  return (
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
                <Protected><DashboardPage /></Protected>
              </Suspense>
            }
          />
          <Route
            path="products"
            element={
              <Suspense fallback={<PageLoader />}>
                <Protected><ProductsPage /></Protected>
              </Suspense>
            }
          />
          <Route
            path="purchases"
            element={
              <Suspense fallback={<PageLoader />}>
                <Protected><PurchasesPage /></Protected>
              </Suspense>
            }
          />
          <Route
            path="customers"
            element={
              <Suspense fallback={<PageLoader />}>
                <Protected><CustomersPage /></Protected>
              </Suspense>
            }
          />
          <Route
            path="reports"
            element={
              <Suspense fallback={<PageLoader />}>
                <Protected><ReportsPage /></Protected>
              </Suspense>
            }
          />
          <Route
            path="customer-analytics"
            element={
              <Suspense fallback={<PageLoader />}>
                <Protected><CustomerAnalyticsPage /></Protected>
              </Suspense>
            }
          />
          <Route
            path="credit-aging"
            element={
              <Suspense fallback={<PageLoader />}>
                <Protected><CreditAgingPage /></Protected>
              </Suspense>
            }
          />
          <Route
            path="data-export"
            element={
              <Suspense fallback={<PageLoader />}>
                <Protected><DataExportPage /></Protected>
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <Protected><SettingsPage /></Protected>
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
