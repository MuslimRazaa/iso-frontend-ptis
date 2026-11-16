// One date format for the whole site: DD-MM-YYYY (and "DD-MM-YYYY, hh:mm AM/PM" with a time).
// Everything that shows a date to a person goes through here, so it can only be spelled one way.

const pad = (n) => String(n).padStart(2, '0')

// A plain "YYYY-MM-DD" (what date fields and the database's DATE columns hold) is read as the
// calendar day it says. `new Date('2026-11-10')` would be midnight UTC, which on a machine west
// of UTC is still the 9th.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

const toDate = (value) => {
  if (value === undefined || value === null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const s = String(value).trim()
  const m = DATE_ONLY.exec(s)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "16-11-2026" — or `fallback` ('' by default) when the value is empty or not a date. */
export const formatDate = (value, fallback = '') => {
  const d = toDate(value)
  return d ? `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}` : fallback
}

/** "16-11-2026, 03:45 PM" — a date and the time of day, 12-hour. A bare date stays "16-11-2026". */
export const formatDateTime = (value, fallback = '') => {
  const d = toDate(value)
  if (!d) return fallback
  if (typeof value === 'string' && DATE_ONLY.test(value.trim())) return formatDate(d)
  const h = d.getHours()
  return `${formatDate(d)}, ${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`
}
