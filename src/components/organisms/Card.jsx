// src/components/organisms/Card.jsx
import clsx from 'clsx'

/**
 * Base card container (brief section 4). Every section title/description/
 * fields grouping in the app should compose this, not a raw <div>, so
 * radius/border/shadow/spacing stay consistent (12px radius, soft shadow,
 * white bg, per the brief's design tokens).
 */
export default function Card({ title, description, icon, actions, children, className, as: As = 'section' }) {
  return (
    <As className={clsx('rounded-app border border-app-border bg-app-card p-5 shadow-sm', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                {icon && <span aria-hidden="true">{icon}</span>}
                {title}
              </h3>
            )}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </As>
  )
}
