import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseHolidayData, getCachedHolidays, setCachedHolidays, getHolidayForDate, HOLIDAY_CACHE_KEY, HOLIDAY_CACHE_MAX_AGE_MS } from './holidayIntegration'
import realRaw from './sample_calendar_2026.json'

describe('parseHolidayData (against REAL fetched 2026 data, not a mock)', () => {
  const parsed = parseHolidayData(realRaw)

  it('drops the "info" metadata key', () => {
    expect(parsed.info).toBeUndefined()
  })
  it('parses a known public holiday correctly', () => {
    expect(parsed['2026-01-01']).toEqual({ holiday: true, summary: 'Hari Tahun Baru', description: 'Hari libur nasional' })
  })
  it('parses a non-holiday observance correctly (1 Ramadan)', () => {
    expect(parsed['2026-02-19']).toEqual({ holiday: false, summary: '1 Ramadan', description: 'Perayaan' })
  })
  it('Idul Fitri present and marked as a real holiday', () => {
    expect(parsed['2026-03-21'].holiday).toBe(true)
    expect(parsed['2026-03-21'].summary).toContain('Idul Fitri')
  })
  it('only date-format keys survive', () => {
    expect(Object.keys(parsed).every((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))).toBe(true)
  })
})

describe('parseHolidayData defensive parsing', () => {
  it('handles empty/null/undefined input without throwing', () => {
    expect(parseHolidayData({})).toEqual({})
    expect(parseHolidayData(null)).toEqual({})
    expect(parseHolidayData(undefined)).toEqual({})
  })
  it('drops malformed date keys', () => {
    const r = parseHolidayData({ 'not-a-date': { holiday: true, summary: ['x'] }, '2026-01-01': { holiday: true, summary: ['y'] } })
    expect(Object.keys(r)).toHaveLength(1)
  })
  it('handles missing summary/description gracefully', () => {
    expect(parseHolidayData({ '2026-05-05': { holiday: true } })['2026-05-05'].summary).toBe('')
  })
})

describe('holiday cache (mocked localStorage)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('cache miss on empty storage', () => {
    expect(getCachedHolidays()).toBeNull()
  })
  it('cache hit immediately after set, miss after max age', () => {
    // Mock Date.now() BEFORE calling setCachedHolidays (which internally
    // calls Date.now() itself to stamp fetchedAt) so the write and both
    // reads share one deterministic clock. The previous version captured
    // `now` from the real clock, then called setCachedHolidays (which
    // stamps fetchedAt from its OWN fresh Date.now() call microseconds
    // later), then only mocked the clock afterward -- any real scheduling
    // jitter between those two real-clock reads (GC pause, CI noise, etc.)
    // could exceed the 1ms safety margin and flip the "miss after max
    // age" assertion, since `now - fetchedAt` would land at/under exactly
    // HOLIDAY_CACHE_MAX_AGE_MS instead of just past it. Confirmed flaky by
    // reproducing the failure in this environment.
    const now = 1700000000000
    vi.spyOn(Date, 'now').mockReturnValue(now)
    setCachedHolidays({ '2026-01-01': { holiday: true, summary: 'Test' } })
    expect(getCachedHolidays(now + 1000)).not.toBeNull()
    expect(getCachedHolidays(now + HOLIDAY_CACHE_MAX_AGE_MS + 1)).toBeNull()
    vi.restoreAllMocks()
  })
  it('corrupted cache entry is treated as a miss, not a crash', () => {
    localStorage.setItem(HOLIDAY_CACHE_KEY, '{not valid json')
    expect(getCachedHolidays()).toBeNull()
  })
})

describe('getHolidayForDate', () => {
  const parsed = parseHolidayData(realRaw)
  it('finds an existing date', () => {
    expect(getHolidayForDate(parsed, '2026-08-17').summary).toBe('Hari Proklamasi Kemerdekaan R.I.')
  })
  it('returns null for an ordinary day', () => {
    expect(getHolidayForDate(parsed, '2026-08-18')).toBeNull()
  })
  it('handles a null map without throwing', () => {
    expect(getHolidayForDate(null, '2026-01-01')).toBeNull()
  })
})
