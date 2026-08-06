// src/App.jsx
import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppShell from './layouts/AppShell'
import LoginPage from './pages/LoginPage'
import PendingPage from './pages/PendingPage'
import DashboardPage from './pages/DashboardPage'
import { hasTab } from './lib/roleConfig'

// Code-split every page that pulls in a heavy dependency (xlsx,
// @supabase/supabase-js, chart.js) so the initial bundle only ships what
// the login/dashboard screen actually needs -- these libraries load on
// demand when the user actually visits that route, not on every page load.
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const BiodataListPage = lazy(() => import('./pages/BiodataListPage'))
const EmployeeProfilePage = lazy(() => import('./pages/EmployeeProfilePage'))
const LeaveManagementPage = lazy(() => import('./pages/LeaveManagementPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const ExportImportPage = lazy(() => import('./pages/ExportImportPage'))

function PageFallback() {
  return <div className="flex h-64 items-center justify-center text-sm text-slate-500">Memuat…</div>
}

// Full-screen variant of PageFallback for the one-time "restoring a saved
// session from a refresh token" check on first load -- shown before any
// route guard has enough information to decide where to send the user, so
// nothing else in the tree (including AppShell/Sidebar) mounts yet.
function AppLoading() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Memuat…</div>
}

function RequireTab({ tab, children }) {
  const { session, role, initializing } = useAuth()
  if (initializing) return <AppLoading />
  if (!session) return <Navigate to="/login" replace />
  if (role === 'pending') return <Navigate to="/pending" replace />
  if (tab && !hasTab(role, tab)) return <Navigate to="/" replace />
  return children
}

function RequireAuth({ children }) {
  const { session, role, initializing } = useAuth()
  if (initializing) return <AppLoading />
  if (!session) return <Navigate to="/login" replace />
  if (role === 'pending') return <Navigate to="/pending" replace />
  return children
}

function RootRoutes() {
  const { session, role, initializing } = useAuth()
  if (initializing) return <AppLoading />
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/pending" element={role === 'pending' ? <PendingPage /> : <Navigate to="/" replace />} />

        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/" element={<RequireTab tab="dashboard"><DashboardPage /></RequireTab>} />
          <Route path="/analytics" element={<RequireTab tab="analytics"><AnalyticsPage /></RequireTab>} />
          <Route path="/calendar" element={<RequireTab tab="calendar"><CalendarPage /></RequireTab>} />
          <Route path="/biodata" element={<RequireTab tab="biodata"><BiodataListPage /></RequireTab>} />
          <Route path="/biodata/:id" element={<RequireAuth><EmployeeProfilePage /></RequireAuth>} />
          <Route path="/leave" element={<RequireTab tab="leave_management"><LeaveManagementPage /></RequireTab>} />
          <Route path="/notifications" element={<RequireTab tab="notifications"><NotificationsPage /></RequireTab>} />
          <Route path="/export-import" element={<RequireTab tab="export_import"><ExportImportPage /></RequireTab>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RootRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
