// src/components/organisms/Sidebar.jsx
import NavItem from '../molecules/NavItem'
import { getRoleConfig } from '../../lib/roleConfig'
import { useAuth } from '../../context/AuthContext'

// Icon/label/route per tab id, same tab set the original top-bar used
// (ROLE_CONFIG.tabs) -- only the layout moved (top -> left), the set of
// destinations and who can see which one is unchanged.
const NAV_ITEMS = [
  { id: 'dashboard', to: '/', icon: '🏠', label: 'Dashboard' },
  { id: 'analytics', to: '/analytics', icon: '📊', label: 'Analitik' },
  { id: 'calendar', to: '/calendar', icon: '📅', label: 'Kalender' },
  { id: 'biodata', to: '/biodata', icon: '👥', label: 'Biodata' },
  { id: 'leave_management', to: '/leave', icon: '📋', label: 'Manajemen Cuti' },
  { id: 'notifications', to: '/notifications', icon: '🔔', label: 'Notifikasi' },
  { id: 'export_import', to: '/export-import', icon: '📁', label: 'Ekspor/Impor' },
]

export default function Sidebar({ open, onClose }) {
  const { role, fullName, signOut } = useAuth()
  const config = getRoleConfig(role)
  const visibleItems = NAV_ITEMS.filter((item) => config.tabs.includes(item.id))

  return (
    <>
      {/* Mobile overlay -- sidebar becomes an off-canvas drawer below lg,
          per brief section 11 (Responsive Layout: single column mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-app-border bg-white transition-transform lg:static lg:translate-x-0 ' +
          (open ? 'translate-x-0' : '-translate-x-full')
        }
        aria-label="Navigasi utama"
      >
        <div className="flex items-center gap-2 border-b border-app-border px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary font-display text-lg font-bold text-white">
            A
          </div>
          <div>
            <p className="font-display text-sm font-bold leading-tight text-slate-900">HRIS Al-Falah</p>
            <p className="text-xs text-slate-500">{config.label}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" onClick={onClose}>
          {/* onClick on the nav wrapper (not each NavItem) so picking any
              destination also closes the mobile off-canvas drawer -- it
              was previously only wired to the backdrop and the hamburger
              button, so navigating on mobile left the drawer open over
              the new page. Harmless no-op on desktop (`open` is always
              false there and the drawer is shown via the lg: breakpoint
              regardless of `open`). */}
          {visibleItems.map((item) => (
            <NavItem key={item.id} to={item.to} icon={item.icon} label={item.label} />
          ))}
        </nav>

        <div className="border-t border-app-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-slate-500">{fullName || 'Pengguna'}</div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <span aria-hidden="true">🚪</span> Keluar
          </button>
        </div>
      </aside>
    </>
  )
}
