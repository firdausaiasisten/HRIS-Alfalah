// src/components/molecules/FormField.jsx
// Read-only "label + value" display used in view mode. Edit mode swaps
// this out for the real Input/Select atom -- see EmployeeProfilePage.
export default function FormField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-900">{value || <span className="text-slate-400">-</span>}</p>
    </div>
  )
}
