import { normalizePdfCoords } from './pdfCoords'

// Arranges a template's fields the way they sit on its printed form: page by
// page, top to bottom, and left to right inside a row, each field's share of the
// row following the width its box has on the PDF. Fields that were never given a
// position keep their original order in a trailing group, so none go missing.
//
// Returns { pages: [{ page, rows: [[{ field, weight }]], blocks }], loose: [field] }.
// `blocks` is the same page read as the form prints it: plain rows of fields, and
// tables (see tableBlocks).
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
    const laid = rows.map(r => r.items
      .sort((a, b) => a.c.x - b.c.x)
      .map(i => ({ field: i.field, weight: Math.max(60, i.c.width), x0: i.c.x, x1: i.c.x + i.c.width })))
    return { page, rows: laid, blocks: tableBlocks(laid) }
  })

  return { pages, loose, placedCount: placed.length }
}

// "ANGLE GRINDER 4\" #1 — SERIAL NO" → ["ANGLE GRINDER 4\" #1", "SERIAL NO"]: what the row is, and
// which column. Labels of table cells are made this way by the PDF importer.
const splitLabel = (label) => {
  const s = String(label || '')
  const i = s.lastIndexOf(' — ')
  return i > 0 ? [s.slice(0, i).trim(), s.slice(i + 3).trim()] : null
}

/**
 * Turns the page's rows into blocks to draw. Where several rows in a row carry
 * fields named "<row> — <column>" with the same columns (a register, a checklist,
 * an equipment list), they are one table: a header of the column names and a line
 * per row, the way the printed form shows it. Two tables side by side on the form
 * (each with its own row names) stay two tables, shown next to each other.
 * Everything else stays a plain row of fields.
 *
 * Returns [{ type: 'row', items }, { type: 'tables', tables: [{ columns, rows: [{ name, cells }] }] }].
 */
function tableBlocks(rows) {
  const tables = []          // every table found, in the order it starts
  const open = []            // tables that may continue on the next row
  const plain = rows.map(() => [])
  rows.forEach((row, ri) => {
    // Runs of neighbouring fields that belong to the same printed row name.
    const segments = []
    for (const item of row) {
      const parts = splitLabel(item.field.label)
      const last = segments[segments.length - 1]
      if (parts && last && last.name === parts[0]) { last.items.push({ ...item, column: parts[1] }); last.x1 = item.x1 }
      else segments.push({ name: parts ? parts[0] : null, items: [{ ...item, column: parts ? parts[1] : null }], x0: item.x0, x1: item.x1 })
    }
    for (const seg of segments) {
      if (seg.name === null) { plain[ri].push(...seg.items); continue }
      const sig = seg.items.map(i => i.column).join('|')
      const t = open.find(o => o.lastRow === ri - 1 && o.sig === sig && seg.x0 < o.x1 + 4 && seg.x1 > o.x0 - 4)
      if (t) {
        t.rows.push({ name: seg.name, cells: seg.items.map(i => i.field), items: seg.items, ri })
        t.lastRow = ri
      } else {
        const created = { sig, x0: seg.x0, x1: seg.x1, startRow: ri, lastRow: ri, columns: seg.items.map(i => i.column),
          rows: [{ name: seg.name, cells: seg.items.map(i => i.field), items: seg.items, ri }] }
        open.push(created)
        tables.push(created)
      }
    }
  })

  // A "table" of one line is just a row of fields.
  const real = tables.filter(t => t.rows.length >= 2)
  for (const t of tables) if (t.rows.length < 2) for (const r of t.rows) plain[r.ri].push(...r.items)

  const blocks = []
  rows.forEach((_, ri) => {
    const starting = real.filter(t => t.startRow === ri).sort((a, b) => a.x0 - b.x0)
    if (starting.length) {
      blocks.push({ type: 'tables', tables: starting.map(t => ({
        columns: t.columns,
        rows: t.rows.map(r => ({ name: r.name.replace(/^Row\s+(\d+)$/i, '$1'), cells: r.cells })),
      })) })
    }
    if (plain[ri].length) blocks.push({ type: 'row', items: plain[ri].sort((a, b) => a.x0 - b.x0) })
  })
  return blocks
}
