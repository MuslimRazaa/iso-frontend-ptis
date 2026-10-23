import { normalizePdfCoords } from './pdfCoords'

// Arranges a template's fields the way they sit on its printed form: page by
// page, top to bottom, and left to right inside a row, each field's share of the
// row following the width its box has on the PDF. Fields that were never given a
// position keep their original order in a trailing group, so none go missing.
//
// Returns { pages: [{ page, rows: [[{ field, weight }]] }], loose: [field] }.
// y in the saved coordinates is the box BOTTOM and runs upward, so the top edge
// is y + height and a larger value is higher on the page.
export function layoutFields(fields) {
  const placed = []
  const loose = []
  for (const field of fields || []) {
    const c = normalizePdfCoords(field.pdfCoords)
    if (c) placed.push({ field, c, mid: c.y + c.height / 2, top: c.y + c.height })
    else loose.push(field)
  }

  const byPage = new Map()
  for (const p of placed) {
    if (!byPage.has(p.c.page)) byPage.set(p.c.page, [])
    byPage.get(p.c.page).push(p)
  }

  const pages = [...byPage.keys()].sort((a, b) => a - b).map(page => {
    const items = byPage.get(page).sort((a, b) => b.top - a.top || a.c.x - b.c.x)
    const rows = []
    for (const item of items) {
      const row = rows[rows.length - 1]
      // Same row when the middles are within about half a box height of each other.
      const tolerance = Math.max(6, Math.min(item.c.height, row ? row.height : item.c.height) * 0.6)
      if (row && Math.abs(row.mid - item.mid) <= tolerance) {
        row.items.push(item)
        row.mid = row.items.reduce((s, i) => s + i.mid, 0) / row.items.length
        row.height = Math.min(row.height, item.c.height)
      } else {
        rows.push({ items: [item], mid: item.mid, height: item.c.height })
      }
    }
    return {
      page,
      rows: rows.map(r => r.items
        .sort((a, b) => a.c.x - b.c.x)
        .map(i => ({ field: i.field, weight: Math.max(60, i.c.width) }))),
    }
  })

  return { pages, loose, placedCount: placed.length }
}
