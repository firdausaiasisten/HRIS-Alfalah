import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SummaryPanel from './SummaryPanel'

const baseEmployee = {
  id: 'e1',
  full_name: 'Ahmad Fauzi',
  employee_number: 'EMP001',
  join_date: '2023-01-01',
  contract_end: '2026-12-31',
  basic_salary: 5000000,
  updated_at: '2026-08-01T00:00:00Z',
}

describe('SummaryPanel', () => {
  it('shows "Aktif" for a non-deleted employee and "Nonaktif" for a soft-deleted one (regression test: this badge used to be hardcoded to "active" always)', () => {
    const { rerender } = render(<SummaryPanel employee={baseEmployee} canViewSalary={true} />)
    expect(screen.getByText('Aktif')).toBeInTheDocument()

    rerender(<SummaryPanel employee={{ ...baseEmployee, deleted_at: '2026-01-01' }} canViewSalary={true} />)
    expect(screen.getByText('Nonaktif')).toBeInTheDocument()
  })

  it('shows "Kontrak" only when m_status_kepegawaian.nama is actually "Kontrak" (regression test: previously read a nonexistent field and always showed "Tetap")', () => {
    const { rerender } = render(
      <SummaryPanel employee={{ ...baseEmployee, m_status_kepegawaian: { nama: 'Kontrak' } }} canViewSalary={true} />
    )
    expect(screen.getByText('Kontrak')).toBeInTheDocument()

    rerender(
      <SummaryPanel employee={{ ...baseEmployee, m_status_kepegawaian: { nama: 'Tetap' } }} canViewSalary={true} />
    )
    expect(screen.getByText('Tetap')).toBeInTheDocument()
  })

  it('hides the salary row entirely when canViewSalary is false (must match the RLS restriction, not just visually redact)', () => {
    render(<SummaryPanel employee={baseEmployee} canViewSalary={false} />)
    expect(screen.queryByText('Gaji Pokok')).not.toBeInTheDocument()
  })

  it('shows the salary row, formatted as Rupiah, when canViewSalary is true', () => {
    render(<SummaryPanel employee={baseEmployee} canViewSalary={true} />)
    expect(screen.getByText('Gaji Pokok')).toBeInTheDocument()
    expect(screen.getByText('Rp 5.000.000')).toBeInTheDocument()
  })

  it('does not render a "Manajer" row (no such column exists in the schema)', () => {
    render(<SummaryPanel employee={baseEmployee} canViewSalary={true} />)
    expect(screen.queryByText('Manajer')).not.toBeInTheDocument()
  })

  it('renders nothing (no crash) when employee is null', () => {
    const { container } = render(<SummaryPanel employee={null} canViewSalary={true} />)
    expect(container).toBeEmptyDOMElement()
  })
})
