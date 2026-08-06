import { describe, it, expect, vi } from 'vitest'
import { formatRupiah, formatDateId, yearsOfService } from './format'

describe('formatRupiah', () => {
  it('formats with Indonesian thousands separators and Rp prefix', () => {
    expect(formatRupiah(3000000)).toBe('Rp 3.000.000')
    expect(formatRupiah(500000)).toBe('Rp 500.000')
  })
  it('handles null/undefined/empty as a dash, not "Rp NaN" or "Rp 0"', () => {
    expect(formatRupiah(null)).toBe('-')
    expect(formatRupiah(undefined)).toBe('-')
    expect(formatRupiah('')).toBe('-')
  })
  it('zero is a real value, not treated as missing', () => {
    expect(formatRupiah(0)).toBe('Rp 0')
  })
})

describe('formatDateId', () => {
  it('formats YYYY-MM-DD into Indonesian long form', () => {
    expect(formatDateId('2026-08-25')).toBe('25 Agustus 2026')
    expect(formatDateId('2026-01-01')).toBe('1 Januari 2026')
  })
  it('returns dash for falsy/malformed input, never throws', () => {
    expect(formatDateId(null)).toBe('-')
    expect(formatDateId('')).toBe('-')
    expect(formatDateId('not-a-date')).toBe('-')
  })
})

describe('yearsOfService', () => {
  it('counts a full year correctly after the anniversary has passed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 6)) // 6 Aug 2026 (month is 0-indexed)
    expect(yearsOfService('2023-07-01')).toBe(3) // joined Jul 2023, anniversary already passed this year
    vi.useRealTimers()
  })
  it('does NOT count the current year until the join-month/day anniversary arrives', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 1)) // 1 Jun 2026, before the Jul 1 anniversary
    expect(yearsOfService('2023-07-01')).toBe(2) // anniversary hasn't happened yet this year
    vi.useRealTimers()
  })
  it('same month, exact day boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 1)) // exactly on the anniversary date
    expect(yearsOfService('2023-07-01')).toBe(3)
    vi.setSystemTime(new Date(2026, 6, 0)) // one day before (30 Jun)
    expect(yearsOfService('2023-07-01')).toBe(2)
    vi.useRealTimers()
  })
  it('never returns negative (a future join_date clamps to 0)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1))
    expect(yearsOfService('2027-01-01')).toBe(0)
    vi.useRealTimers()
  })
  it('returns null for missing join_date', () => {
    expect(yearsOfService(null)).toBeNull()
    expect(yearsOfService('')).toBeNull()
  })
})
