// src/lib/calendarIntegration.js
// Ported 1:1 from app/index.html (Fitur 3: iCal + Google Calendar link,
// no OAuth). Already covered by 19 passing tests in the vanilla version.

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}
export function toIcsDate(ymd) {
  return ymd.replace(/-/g, '')
}
export function addOneDay(ymd) {
  const p = ymd.split('-').map(Number)
  const d = new Date(p[0], p[1] - 1, p[2])
  d.setDate(d.getDate() + 1)
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}
export function icsEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
export function buildIcsEvent(opts) {
  const uid = (opts.uid || Date.now() + '-' + Math.random().toString(36).slice(2)) + '@hris-alfalah'
  const dtStart = toIcsDate(opts.dateStr)
  const dtEnd = toIcsDate(addOneDay(opts.dateStr))
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HRIS Al-Falah//ID', 'BEGIN:VEVENT',
    'UID:' + uid,
    'DTSTAMP:' + toIcsDate(opts.dateStr) + 'T000000Z',
    'DTSTART;VALUE=DATE:' + dtStart,
    'DTEND;VALUE=DATE:' + dtEnd,
    'SUMMARY:' + icsEscape(opts.title),
    'DESCRIPTION:' + icsEscape(opts.description || ''),
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}
export function buildGoogleCalendarUrl(opts) {
  const start = toIcsDate(opts.dateStr)
  const end = toIcsDate(addOneDay(opts.dateStr))
  const params = new URLSearchParams({ action: 'TEMPLATE', text: opts.title, dates: `${start}/${end}`, details: opts.description || '' })
  return 'https://calendar.google.com/calendar/render?' + params.toString()
}
export function downloadIcs(opts) {
  const blob = new Blob([buildIcsEvent(opts)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = (opts.title || 'event').replace(/[^a-z0-9]+/gi, '_') + '.ics'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
