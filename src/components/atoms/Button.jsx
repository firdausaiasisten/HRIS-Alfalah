// src/components/atoms/Button.jsx
import clsx from 'clsx'

const VARIANTS = {
  primary: 'bg-brand-primary text-white hover:bg-brand-primary-hover focus-visible:ring-brand-primary',
  secondary: 'bg-white text-slate-700 border border-app-border hover:bg-slate-50 focus-visible:ring-brand-primary',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-brand-primary',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50 focus-visible:ring-red-500',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

/**
 * Base Button atom. All interactive actions in the app (Save, Cancel,
 * tab triggers, etc.) should compose this rather than raw <button>, so
 * focus-visible ring / disabled state / sizing stay consistent app-wide
 * (WCAG AA: visible focus indicator on every interactive control).
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
