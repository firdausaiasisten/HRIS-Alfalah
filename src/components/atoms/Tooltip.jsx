// src/components/atoms/Tooltip.jsx
import { useId, useState } from 'react'

/**
 * Minimal accessible tooltip: shows on hover AND keyboard focus (not
 * hover-only, which would make it unreachable without a mouse), wired via
 * aria-describedby so screen readers announce it too.
 */
export default function Tooltip({ children, label }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {typeof children === 'string' ? <span aria-describedby={id}>{children}</span> : children}
      <span
        role="tooltip"
        id={id}
        className={
          'pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white transition-opacity ' +
          (open ? 'opacity-100' : 'opacity-0')
        }
      >
        {label}
      </span>
    </span>
  )
}
