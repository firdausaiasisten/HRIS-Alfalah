// src/lib/format.js
// Ported/expanded from the original app's fmtMoney/fmtDate helpers.

export function formatRupiah(value) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (Number.isNaN(num)) return '-'
  return 'Rp ' + num.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function formatDateId(dateStr) {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return '-'
  return `${d} ${MONTHS_ID[m - 1]} ${y}`
}

/** Years of service, from a "YYYY-MM-DD" join_date to today. */
export function yearsOfService(joinDate) {
  if (!joinDate) return null
  const [y, m, d] = joinDate.split('-').map(Number)
  if (!y) return null
  const start = new Date(y, m - 1, d)
  const now = new Date()
  let years = now.getFullYear() - start.getFullYear()
  const beforeAnniversary =
    now.getMonth() < start.getMonth() || (now.getMonth() === start.getMonth() && now.getDate() < start.getDate())
  if (beforeAnniversary) years -= 1
  return Math.max(0, years)
}
