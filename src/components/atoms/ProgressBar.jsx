// src/components/atoms/ProgressBar.jsx
export default function ProgressBar({ value, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div>
      {label && <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-brand-primary">{pct}%</span>
      </div>}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div
          className="h-full rounded-full bg-brand-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
