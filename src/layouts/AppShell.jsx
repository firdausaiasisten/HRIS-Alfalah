// src/layouts/AppShell.jsx
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/organisms/Sidebar'

export default function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-app-bg">
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar only holds the mobile menu toggle now -- primary nav
            lives in the left sidebar (see Sidebar.jsx), not here. */}
        <header className="flex items-center gap-3 border-b border-app-border bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Buka menu navigasi"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <span aria-hidden="true">☰</span>
          </button>
          <p className="font-display text-sm font-bold text-slate-900">HRIS Al-Falah</p>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
