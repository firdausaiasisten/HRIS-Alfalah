// src/lib/holidayIntegration.js
// Ported 1:1 from app/index.html -- source: guangrei/APIHariLibur_V2
// (GitHub, GPL-3.0, auto-updated from Google Calendar), fetched at
// runtime (not vendored, so the app doesn't inherit GPL).

export const HOLIDAY_SOURCE_URL = 'https://raw.githubusercontent.com/guangrei/APIHariLibur_V2/main/calendar.min.json'
export const HOLIDAY_CACHE_KEY = 'hris-holiday-cache-v1'
export const HOLIDAY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

export function parseHolidayData(raw) {
  const out = {}
  Object.keys(raw || {}).forEach((key) => {
    if (key === 'info') return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return
    const v = raw[key]
    out[key] = {
      holiday: !!v.holiday,
      summary: v.summary?.length ? v.summary.join(', ') : '',
      description: v.description?.length ? v.description.join(', ') : '',
    }
  })
  return out
}

export function getCachedHolidays(now = Date.now()) {
  try {
    const raw = localStorage.getItem(HOLIDAY_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.fetchedAt !== 'number' || !parsed.data) return null
    if (now - parsed.fetchedAt > HOLIDAY_CACHE_MAX_AGE_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

export function setCachedHolidays(data) {
  try {
    localStorage.setItem(HOLIDAY_CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), data }))
  } catch {
    /* localStorage unavailable/full -- non-fatal, just no cache next time */
  }
}

export async function loadHolidays() {
  const cached = getCachedHolidays()
  if (cached) return cached
  try {
    const res = await fetch(HOLIDAY_SOURCE_URL)
    if (!res.ok) throw new Error('status ' + res.status)
    const raw = await res.json()
    const parsed = parseHolidayData(raw)
    setCachedHolidays(parsed)
    return parsed
  } catch (e) {
    console.warn('Gagal memuat data hari libur (kalender tetap jalan tanpa tanda hari libur):', e.message)
    return {}
  }
}

export function getHolidayForDate(holidayMap, dateStr) {
  return holidayMap?.[dateStr] || null
}
