// src/components/atoms/Avatar.jsx
import clsx from 'clsx'

const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-20 w-20 text-xl', xl: 'h-28 w-28 text-3xl' }

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

/**
 * Photo avatar with an initials fallback (design brief: "No employee
 * photo" was problem #4 -- but not every record will have a photo_url
 * even after this redesign, so the fallback matters as much as the
 * photo itself).
 */
export default function Avatar({ src, name, size = 'md', className }) {
  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-primary/10 font-semibold text-brand-primary ring-2 ring-white',
        SIZES[size],
        className
      )}
      role="img"
      aria-label={name ? `Foto ${name}` : 'Foto pegawai'}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </div>
  )
}
