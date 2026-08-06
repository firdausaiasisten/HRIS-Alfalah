// src/components/organisms/Tabs.jsx
import { useId, useRef } from 'react'
import clsx from 'clsx'

/**
 * Accessible tabs (WAI-ARIA Tabs Pattern): roving tabindex, Arrow Left/
 * Right to move focus between tabs, Home/End to jump to first/last, tab
 * panel linked via aria-labelledby/aria-controls. This is what replaces
 * the "one long scrolling form" the brief flags as problem #1 -- see
 * brief section 2.
 *
 * items: [{ id, label, icon }], active: current id, onChange: (id) => void
 */
export default function Tabs({ items, active, onChange, children }) {
  const baseId = useId()
  const tabRefs = useRef([])

  function handleKeyDown(e, index) {
    let nextIndex = null
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % items.length
    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + items.length) % items.length
    else if (e.key === 'Home') nextIndex = 0
    else if (e.key === 'End') nextIndex = items.length - 1
    if (nextIndex !== null) {
      e.preventDefault()
      onChange(items[nextIndex].id)
      tabRefs.current[nextIndex]?.focus()
    }
  }

  return (
    <div>
      <div role="tablist" aria-label="Bagian profil" className="flex gap-1 overflow-x-auto border-b border-app-border">
        {items.map((item, i) => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              ref={(el) => (tabRefs.current[i] = el)}
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={clsx(
                'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1',
                isActive
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {item.icon && <span aria-hidden="true">{item.icon}</span>}
              {item.label}
            </button>
          )
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${active}`}
        aria-labelledby={`${baseId}-tab-${active}`}
        tabIndex={0}
        className="pt-5 focus-visible:outline-none"
      >
        {children}
      </div>
    </div>
  )
}
