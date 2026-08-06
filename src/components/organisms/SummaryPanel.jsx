// src/components/organisms/SummaryPanel.jsx
import Avatar from '../atoms/Avatar'
import Badge from '../atoms/Badge'
import Card from './Card'
import { formatRupiah, formatDateId, yearsOfService } from '../../lib/format'

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value ?? '-'}</span>
    </div>
  )
}

/**
 * Right-hand desktop sidebar (brief section 6); also rendered (full width,
 * below the tabs card) on mobile/tablet instead of being hidden -- an
 * earlier version hid this below the `lg` breakpoint on the assumption
 * the same data was shown elsewhere on the page, but no such fallback
 * existed, so "Terakhir Diperbarui" (and this summary view of Masa
 * Kerja/Kontrak Berakhir/Gaji Pokok) was completely unreachable on
 * mobile. Per brief section 11 ("nothing high-priority should disappear
 * on mobile"), this now stays visible at every breakpoint.
 */
export default function SummaryPanel({ employee, canViewSalary }) {
  if (!employee) return null
  const activeStatus = employee.deleted_at ? 'inactive' : 'active'
  const contractStatus = employee.m_status_kepegawaian?.nama === 'Kontrak' ? 'contract' : 'permanent'
  return (
    <div className="lg:w-80 lg:shrink-0 space-y-4">
      <Card>
        <div className="flex flex-col items-center text-center">
          <Avatar src={employee.photo_url} name={employee.full_name} size="xl" />
          <p className="mt-3 font-semibold text-slate-900">{employee.full_name}</p>
          <p className="text-sm text-slate-500">{employee.employee_number}</p>
          <div className="mt-2 flex gap-1.5">
            <Badge status={activeStatus} />
            <Badge status={contractStatus} />
          </div>
        </div>
      </Card>
      <Card title="Ringkasan">
        <Row label="Masa Kerja" value={`${yearsOfService(employee.join_date) ?? 0} tahun`} />
        <Row label="Kontrak Berakhir" value={formatDateId(employee.contract_end)} />
        {canViewSalary && <Row label="Gaji Pokok" value={formatRupiah(employee.basic_salary)} />}
        {/* Brief section 6 asks for a "Manager" row, but there's no
            manager/atasan column in the actual schema (employees table
            has no such FK) and adding one would violate "do not change
            the database schema" -- omitted rather than showing a row
            that can never have real data. */}
        <Row label="Terakhir Diperbarui" value={formatDateId(employee.updated_at?.slice(0, 10))} />
      </Card>
    </div>
  )
}
