// A form with a single printed page can be given more pages ("Add page"): the same page again, to carry on
// filling in what did not fit on the first. Nothing about a template changes — an entry just holds one more copy
// of the page's values per page it has, in the same flat { fieldId: value } object as always:
//
//   page 1   fieldId            (exactly as before — an entry with one page is unchanged)
//   page 2   fieldId__p2
//   page 3   fieldId__p3 …
//   __pages  how many pages the entry has (only present when it has more than one)
//
// The finished PDF is the template's page once for every page the entry has.

export const PAGES_KEY = '__pages'

/** How many pages an entry's values say it has (1 when it has never been given another). */
export const pageCountOf = (values) => Math.max(1, Math.min(50, parseInt(values && values[PAGES_KEY], 10) || 1))

/** The key a field's value for the given page (1-based) is kept under. */
export const pageKey = (fieldId, page) => (page <= 1 ? fieldId : `${fieldId}__p${page}`)

/** One page's values as a plain { fieldId: value } object — what the PDF writer and the form fields expect. */
export function valuesForPage(values, fields, page) {
  if (page <= 1) {
    const out = {}
    for (const f of fields) if (values[f.id] !== undefined) out[f.id] = values[f.id]
    return out
  }
  const out = {}
  for (const f of fields) {
    const v = values[pageKey(f.id, page)]
    if (v !== undefined) out[f.id] = v
  }
  return out
}

/**
 * The values to save: pages after the first that nothing was written on are dropped, and the rest are
 * numbered again from 2, so an empty page added by mistake does not become a blank page in the PDF.
 * `isUsed(field, value)` says whether a value counts as filled in.
 */
export function compactPages(values, fields, isUsed) {
  const count = pageCountOf(values)
  const base = {}
  for (const f of fields) if (values[f.id] !== undefined) base[f.id] = values[f.id]
  // Everything that is not a per-page value (other keys the form carries) is kept as it is.
  const known = new Set(fields.map(f => f.id))
  const rest = {}
  for (const [k, v] of Object.entries(values)) {
    if (k === PAGES_KEY || known.has(k) || /__p\d+$/.test(k)) continue
    rest[k] = v
  }
  const out = { ...rest, ...base }
  let n = 1
  for (let p = 2; p <= count; p++) {
    const pageValues = valuesForPage(values, fields, p)
    const used = fields.some(f => isUsed(f, pageValues[f.id]))
    if (!used) continue
    n += 1
    for (const f of fields) if (pageValues[f.id] !== undefined) out[pageKey(f.id, n)] = pageValues[f.id]
  }
  if (n > 1) out[PAGES_KEY] = String(n)
  return out
}
