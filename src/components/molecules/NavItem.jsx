// src/components/molecules/NavItem.jsx
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

/**
 * One entry in the left sidebar (see layouts/Sidebar.jsx). Uses
 * react-router's NavLink so the "active" state is derived from the URL,
 * not manually tracked state -- avoids a whole class of "menu highlight
 * doesn't match the page you're on" bugs.
 */
export default function NavItem({ to, icon, label, badge }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1',
          isActive ? 'bg-brand-primary/10 text-brand-primary' : 'text-slate-600 hover:bg-slate-100'
        )
      }
      aria-current={undefined /* NavLink sets aria-current="page" itself when active */}
    >
      <span className="text-base" aria-hidden="true">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{badge}</span>
      )}
    </NavLink>
  )
}
