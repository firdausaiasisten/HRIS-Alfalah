// src/components/atoms/Select.jsx
import { useId } from 'react'
import clsx from 'clsx'

export default function Select({ label, helperText, id, className, options = [], placeholder = '-', disabled, ...rest }) {
  const autoId = useId()
  const selectId = id || autoId
  const helperId = `${selectId}-helper`
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        disabled={disabled}
        aria-describedby={helperText ? helperId : undefined}
        className={clsx(
          'w-full rounded-lg border border-app-border bg-white px-3 py-2 text-sm text-slate-900',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1',
          'disabled:bg-slate-50 disabled:text-slate-400'
        )}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {helperText && (
        <p id={helperId} className="mt-1.5 text-xs text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  )
}
