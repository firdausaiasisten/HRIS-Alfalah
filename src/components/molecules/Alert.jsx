// src/components/molecules/Alert.jsx
import clsx from 'clsx'

const VARIANTS = {
  info: { box: 'bg-blue-50 text-blue-800 border-blue-200', icon: 'ℹ️' },
  success: { box: 'bg-green-50 text-green-800 border-green-200', icon: '✓' },
  warning: { box: 'bg-amber-50 text-amber-800 border-amber-200', icon: '⚠' },
  error: { box: 'bg-red-50 text-red-800 border-red-200', icon: '⚠' },
}

export default function Alert({ variant = 'info', title, children, className }) {
  const v = VARIANTS[variant] || VARIANTS.info
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={clsx('rounded-lg border p-3 text-sm', v.box, className)}>
      <div className="flex gap-2">
        <span aria-hidden="true">{v.icon}</span>
        <div>
          {title && <p className="font-semibold">{title}</p>}
          {children && <p className={title ? 'mt-0.5' : ''}>{children}</p>}
        </div>
      </div>
    </div>
  )
}
