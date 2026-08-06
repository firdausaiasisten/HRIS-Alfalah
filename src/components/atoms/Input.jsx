// src/components/atoms/Input.jsx
import { useId } from 'react'
import clsx from 'clsx'

/**
 * Text input with label, helper text, and inline validation state
 * (brief section 10: "Better Form Fields" -- label, placeholder,
 * validation, helper text). `status` is 'valid' | 'error' | undefined.
 */
export default function Input({
  label,
  helperText,
  status,
  statusMessage,
  id,
  className,
  disabled,
  required,
  ...rest
}) {
  const autoId = useId()
  const inputId = id || autoId
  const helperId = `${inputId}-helper`

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        disabled={disabled}
        required={required}
        aria-describedby={helperText || statusMessage ? helperId : undefined}
        aria-invalid={status === 'error' || undefined}
        className={clsx(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:bg-slate-50 disabled:text-slate-400',
          status === 'error'
            ? 'border-red-300 focus-visible:ring-red-500'
            : status === 'valid'
              ? 'border-green-300 focus-visible:ring-green-500'
              : 'border-app-border focus-visible:ring-brand-primary'
        )}
        {...rest}
      />
      {(helperText || statusMessage) && (
        <p
          id={helperId}
          className={clsx(
            'mt-1.5 text-xs',
            status === 'error' ? 'text-red-600' : status === 'valid' ? 'text-green-600' : 'text-slate-500'
          )}
        >
          {status === 'valid' && '✓ '}
          {statusMessage || helperText}
        </p>
      )}
    </div>
  )
}
