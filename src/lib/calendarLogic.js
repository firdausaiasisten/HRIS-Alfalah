// src/lib/calendarLogic.js
// Ported 1:1 from app/index.html's buildMonthGrid/distributeEventsByDay
// (already covered by 22 passing tests in the vanilla-JS version -- see
// calendarLogic.test.js for the same suite re-run against this module).

export const DAY_NAMES_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}
export function ymdStr(y, m, d) {
  return y + '-' + pad2(m + 1) + '-' + pad2(d)
}
export function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate()
}
function mondayIndex(y, m, d) {
  return (new Date(y, m, d).getDay() + 6) % 7
}

/** Monday-start week grid; only whole weeks containing the target month
 * are included (5 or 6 rows depending on the month), no forced padding. */
export function buildMonthGrid(year, month0) {
  const total = daysInMonth(year, month0)
  const firstIdx = mondayIndex(year, month0, 1)
  const cells = []
  for (let i = 0; i < firstIdx; i++) cells.push({ date: null, day: null })
  for (let d = 1; d <= total; d++) cells.push({ date: ymdStr(year, month0, d), day: d })
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null })
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Distributes leave_requests rows across the days they cover, clipped to
 * [gridStart, gridEnd]. Returns { "YYYY-MM-DD": [{employeeName,type,status,id}] } */
export function distributeEventsByDay(rows, gridStart, gridEnd) {
  const byDay = {}
  ;(rows || []).forEach((r) => {
    const start = r.start_date < gridStart ? gridStart : r.start_date
    const end = r.end_date > gridEnd ? gridEnd : r.end_date
    if (start > end) return
    const p = start.split('-').map(Number)
    const cursor = new Date(p[0], p[1] - 1, p[2])
    const ep = end.split('-').map(Number)
    const endDate = new Date(ep[0], ep[1] - 1, ep[2])
    while (cursor <= endDate) {
      const key = ymdStr(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
      ;(byDay[key] = byDay[key] || []).push({
        employeeName: r.employees?.full_name || '-',
        type: r.type,
        status: r.status,
        id: r.id,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
  })
  return byDay
}

/** Same day-range distribution, generalized for institutional_events rows
 * (title/category instead of employeeName/type). */
export function distributeInstEvents(events, gridStart, gridEnd) {
  const byDay = {}
  ;(events || []).forEach((ev) => {
    const s = ev.start_date < gridStart ? gridStart : ev.start_date
    const e2 = ev.end_date > gridEnd ? gridEnd : ev.end_date
    if (s > e2) return
    const p = s.split('-').map(Number)
    const cursor = new Date(p[0], p[1] - 1, p[2])
    const ep = e2.split('-').map(Number)
    const endDate = new Date(ep[0], ep[1] - 1, ep[2])
    while (cursor <= endDate) {
      const key = ymdStr(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
      ;(byDay[key] = byDay[key] || []).push(ev)
      cursor.setDate(cursor.getDate() + 1)
    }
  })
  return byDay
}

export const LEAVE_TYPE_COLORS = {
  'Cuti Tahunan': { bg: '#dcfce7', fg: '#15803d' },
  'Cuti Sakit': { bg: '#fee2e2', fg: '#b91c1c' },
  'Cuti Melahirkan': { bg: '#ffedd5', fg: '#c2410c' },
  'Izin Khusus': { bg: '#dbeafe', fg: '#1d4ed8' },
  'Cuti Lainnya': { bg: '#f1f5f9', fg: '#475569' },
}
export function leaveColor(type) {
  return LEAVE_TYPE_COLORS[type] || LEAVE_TYPE_COLORS['Cuti Lainnya']
}

export const EVENT_CATEGORY_COLORS = {
  Akademik: '#4F46E5',
  Keagamaan: '#0d9488',
  Administrasi: '#64748b',
  Umum: '#7c3aed',
}
export function eventColor(cat) {
  return EVENT_CATEGORY_COLORS[cat] || EVENT_CATEGORY_COLORS.Umum
}
