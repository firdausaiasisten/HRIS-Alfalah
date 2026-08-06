import { describe, it, expect } from 'vitest'
import { buildMonthGrid, distributeEventsByDay, distributeInstEvents, daysInMonth } from './calendarLogic'

// Same assertions as the vanilla-JS test suite (22 tests) that validated
// this exact logic before -- re-run here to confirm the port didn't
// introduce a regression, not to re-invent the coverage.

describe('buildMonthGrid', () => {
  it('Jan 2025 starts with 2 blanks then day 1 on Wed (Jan 1 2025 = Wednesday)', () => {
    const jan2025 = buildMonthGrid(2025, 0)
    expect(jan2025[0][0].day).toBeNull()
    expect(jan2025[0][1].day).toBeNull()
    expect(jan2025[0][2].day).toBe(1)
  })
  it('every week row has exactly 7 cells', () => {
    buildMonthGrid(2025, 0).forEach((w) => expect(w).toHaveLength(7))
  })
  it('month needing 6 rows (May 2021, starts Saturday, 31 days)', () => {
    expect(buildMonthGrid(2021, 4)).toHaveLength(6)
  })
  it('month starting exactly on Monday has zero leading blanks (Nov 2021)', () => {
    expect(buildMonthGrid(2021, 10)[0][0].day).toBe(1)
  })
  it('month starting on Sunday has 6 leading blanks (Aug 2021)', () => {
    const aug = buildMonthGrid(2021, 7)
    expect(aug[0].slice(0, 6).every((c) => c.day === null)).toBe(true)
    expect(aug[0][6].day).toBe(1)
  })
  it('leap year Feb has 29 days, appears in the grid', () => {
    expect(daysInMonth(2024, 1)).toBe(29)
    const feb2024 = buildMonthGrid(2024, 1)
    expect(feb2024.some((w) => w.some((c) => c.day === 29))).toBe(true)
  })
  it('century non-leap year rule (1900 not leap, 2000 is)', () => {
    expect(daysInMonth(1900, 1)).toBe(28)
    expect(daysInMonth(2000, 1)).toBe(29)
  })
})

describe('distributeEventsByDay (leave requests)', () => {
  const rows = [
    { id: 'L1', employees: { full_name: 'Budi' }, type: 'Cuti Tahunan', status: 'Approved', start_date: '2025-01-07', end_date: '2025-01-07' },
    { id: 'L2', employees: { full_name: 'Siti' }, type: 'Cuti Sakit', status: 'Approved', start_date: '2025-01-13', end_date: '2025-01-15' },
    { id: 'L3', employees: { full_name: 'Dedi' }, type: 'Cuti Lainnya', status: 'Approved', start_date: '2024-12-30', end_date: '2025-01-02' },
  ]
  const byDay = distributeEventsByDay(rows, '2025-01-01', '2025-01-31')

  it('single-day leave appears on exactly its day', () => {
    expect(byDay['2025-01-07'].some((e) => e.employeeName === 'Budi')).toBe(true)
  })
  it('multi-day leave appears on ALL days, not just start_date', () => {
    ;['2025-01-13', '2025-01-14', '2025-01-15'].forEach((d) => {
      expect(byDay[d].some((e) => e.employeeName === 'Siti')).toBe(true)
    })
  })
  it('leave crossing into the grid from December only shows Jan 1-2', () => {
    expect(byDay['2025-01-01'].some((e) => e.employeeName === 'Dedi')).toBe(true)
    expect(byDay['2024-12-30']).toBeUndefined()
  })
})

describe('distributeInstEvents (institutional_events)', () => {
  const events = [
    { id: 'E1', title: 'Rapat Pimpinan', category: 'Administrasi', start_date: '2026-09-01', end_date: '2026-09-01' },
    { id: 'E2', title: 'Ujian Semester', category: 'Akademik', start_date: '2026-09-05', end_date: '2026-09-09' },
    { id: 'E3', title: 'Libur Semester', category: 'Umum', start_date: '2026-08-28', end_date: '2026-09-02' },
  ]
  const byDay = distributeInstEvents(events, '2026-09-01', '2026-09-30')

  it('multi-day event spans all 5 days', () => {
    ;['2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09'].forEach((d) =>
      expect(byDay[d].some((e) => e.id === 'E2')).toBe(true)
    )
  })
  it('event crossing into the grid from August only shows Sep 1-2', () => {
    expect(byDay['2026-09-01'].some((e) => e.id === 'E3')).toBe(true)
    expect(byDay['2026-08-28']).toBeUndefined()
  })
  it('two institutional events on the same day both appear', () => {
    expect(byDay['2026-09-01']).toHaveLength(2)
  })
})
