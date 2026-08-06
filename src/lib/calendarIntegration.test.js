import { describe, it, expect } from 'vitest'
import { toIcsDate, addOneDay, icsEscape, buildIcsEvent, buildGoogleCalendarUrl } from './calendarIntegration'

describe('calendarIntegration', () => {
  it('toIcsDate strips dashes', () => expect(toIcsDate('2026-08-14')).toBe('20260814'))

  it('addOneDay handles month/year/leap boundaries', () => {
    expect(addOneDay('2026-08-14')).toBe('2026-08-15')
    expect(addOneDay('2026-08-31')).toBe('2026-09-01')
    expect(addOneDay('2026-12-31')).toBe('2027-01-01')
    expect(addOneDay('2024-02-28')).toBe('2024-02-29')
    expect(addOneDay('2023-02-28')).toBe('2023-03-01')
  })

  it('icsEscape escapes commas/semicolons/backslashes/newlines, handles null', () => {
    expect(icsEscape('Kontrak; Ahmad, Fauzi \\ Test')).toBe('Kontrak\\; Ahmad\\, Fauzi \\\\ Test')
    expect(icsEscape('Line1\nLine2')).toBe('Line1\\nLine2')
    expect(icsEscape(null)).toBe('')
  })

  it('buildIcsEvent produces a well-formed VEVENT with exclusive DTEND', () => {
    const ics = buildIcsEvent({ title: 'Kontrak Berakhir: Ahmad Fauzi', description: 'EMP001', dateStr: '2026-08-14' })
    expect(ics).toContain('DTSTART;VALUE=DATE:20260814')
    expect(ics).toContain('DTEND;VALUE=DATE:20260815')
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true)
    expect(ics).toContain('\r\n')
  })

  it('two events get distinct UIDs', () => {
    const a = buildIcsEvent({ title: 'A', dateStr: '2026-01-01' }).match(/UID:(.+)/)[1]
    const b = buildIcsEvent({ title: 'B', dateStr: '2026-01-01' }).match(/UID:(.+)/)[1]
    expect(a).not.toBe(b)
  })

  it('buildGoogleCalendarUrl has correct base, exclusive-end dates param', () => {
    const url = buildGoogleCalendarUrl({ title: 'Kontrak Berakhir', description: 'EMP001', dateStr: '2026-08-14' })
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true)
    expect(url).toContain('dates=20260814%2F20260815')
  })
})
