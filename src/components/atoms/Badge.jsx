// src/components/atoms/Badge.jsx
import clsx from 'clsx'

// Maps to design brief section 7 ("Status Badges" -- chips, not dropdowns).
const STATUS_STYLES = {
  active: { dot: 'bg-status-active-fg', bg: 'bg-status-active-bg', text: 'text-status-active-fg', label: 'Aktif' },
  contract: { dot: 'bg-status-contract-fg', bg: 'bg-status-contract-bg', text: 'text-status-contract-fg', label: 'Kontrak' },
  inactive: { dot: 'bg-status-inactive-fg', bg: 'bg-status-inactive-bg', text: 'text-status-inactive-fg', label: 'Nonaktif' },
  permanent: { dot: 'bg-status-permanent-fg', bg: 'bg-status-permanent-bg', text: 'text-status-permanent-fg', label: 'Tetap' },
  internship: { dot: 'bg-status-internship-fg', bg: 'bg-status-internship-bg', text: 'text-status-internship-fg', label: 'Magang' },
}

/**
 * Status chip. `status` picks a preset (active/contract/inactive/
 * permanent/internship); pass `children` to override the label text
 * while keeping the preset's color. Falls back to a neutral gray chip
 * for any status not in the preset list, so an unexpected value never
 * renders as a blank/broken badge.
 */
export default function Badge({ status, children, className }) {
  const preset = STATUS_STYLES[status] || {
    dot: 'bg-slate-400',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    label: status || '-',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        preset.bg,
        preset.text,
        className
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', preset.dot)} aria-hidden="true" />
      {children ?? preset.label}
    </span>
  )
}
