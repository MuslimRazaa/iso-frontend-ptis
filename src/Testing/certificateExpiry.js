// General/Specific certificates are valid for 5 years — to the day before the
// fifth anniversary of the test, exactly as the certificate itself prints it
// ("Validity: …"). This finds the ones that are about to run out, or already
// have, so the employee can be sent for the tests again.

export const EXPIRY_WINDOW_DAYS = 90

const text = (v) => (v ?? '').toString().trim()

// Test dates arrive as "9/7/2025", "27-01-2026" or "2026-01-27".
export const parseTestDate = (value) => {
  const dateOnly = text(value).split(' ')[0]
  let d = null
  if (dateOnly.includes('/')) {
    const p = dateOnly.split('/')
    if (p.length === 3) d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]))
  } else if (dateOnly.includes('-')) {
    const p = dateOnly.split('-')
    if (p.length === 3) {
      d = p[0].length === 4
        ? new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]))
        : new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]))
    }
  }
  return d && !Number.isNaN(d.getTime()) ? d : null
}

// The standard's name without its General / Specific / Practical tag, so the pair
// of tests a certificate is issued from share one key (the same rule the
// certificate itself uses to pair them).
const baseOf = (standard) => text(standard)
  .replace(/\(\s*(general|specific|practical)\s*\)/ig, '')
  .replace(/\s+(general|specific|practical)\b/ig, '')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const validityEnd = (testDate) => {
  const d = new Date(testDate.getTime())
  d.setFullYear(d.getFullYear() + 5)
  d.setDate(d.getDate() - 1)
  return d
}

/**
 * How a certificate row stands on validity, for the Certificates table.
 *
 * Only General/Specific (combined) certificates carry the five-year rule. Returns
 * null for anything else, or when the test date cannot be read.
 *   status: 'valid' | 'soon' (within the warning window) | 'expired'
 */
export const certificateValidity = (result, { windowDays = EXPIRY_WINDOW_DAYS, now = new Date() } = {}) => {
  if (!result || !result.IS_COMBINED) return null
  const tested = parseTestDate(result.DATE)
  if (!tested) return null
  const expiry = validityEnd(tested)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysLeft = Math.round((expiry - today) / 86400000)
  return { expiry, daysLeft, status: daysLeft < 0 ? 'expired' : daysLeft <= windowDays ? 'soon' : 'valid' }
}

/** Where "open this certificate" goes: the Certificates tab, narrowed to one employee and standard. */
export const certificateLink = (item, base = '/testing') =>
  `${base}?tab=certificates&certEmp=${encodeURIComponent(item.id)}&certStandard=${encodeURIComponent(item.standard)}`

/**
 * Certificates that expire within `windowDays` (or already have), soonest first.
 *
 * A General/Specific certificate needs both tests passed, and is dated from the
 * latest General pass (as the certificate itself is), so retaking the tests moves
 * the date on and the employee drops off this list by themselves.
 */
export const findExpiringCertificates = (results, { windowDays = EXPIRY_WINDOW_DAYS, now = new Date() } = {}) => {
  const groups = new Map()
  for (const r of results || []) {
    if (text(r.STATUS).toLowerCase() !== 'pass') continue
    const standard = text(r.STANDARD)
    if (/\(\s*practical\s*\)/i.test(standard)) continue
    const kind = /general/i.test(standard) ? 'general' : /specific/i.test(standard) ? 'specific' : null
    if (!kind) continue
    const date = parseTestDate(r.DATE)
    if (!date) continue
    const key = `${text(r.ID)}|${baseOf(standard).toLowerCase()}`
    const group = groups.get(key) || { id: text(r.ID), name: text(r.NAME), standard: baseOf(standard), general: null, specific: null }
    if (!group[kind] || date > group[kind]) group[kind] = date
    groups.set(key, group)
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const out = []
  for (const g of groups.values()) {
    if (!g.general || !g.specific) continue
    // The certificate itself is dated from the General test, so its printed
    // "Validity" and this agree.
    const expiry = validityEnd(g.general)
    const daysLeft = Math.round((expiry - today) / 86400000)
    if (daysLeft <= windowDays) out.push({ id: g.id, name: g.name, standard: g.standard, expiry, daysLeft })
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft || a.name.localeCompare(b.name))
}
