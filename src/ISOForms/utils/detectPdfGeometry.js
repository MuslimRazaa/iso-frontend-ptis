/**
 * Reads a form's actual drawn geometry out of the PDF.
 *
 * Field positions used to be guessed by fuzzy-matching a field's label against
 * the page text. That can't work for anything the label doesn't sit next to —
 * table cells have no per-cell label at all, so every "Item N" field matched
 * the one column header and stacked on top of it.
 *
 * But the form already *draws* everything we need: the rule under
 * "Name of Requestor: ______" is the value box, the little square before
 * "Purchase" is the checkbox, and the item table is a real grid of rectangles.
 * Reading that geometry gives exact positions with no guessing.
 */

const IDENTITY = [1, 0, 0, 1, 0, 0]

const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
]
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

/**
 * Bounding boxes of every path drawn on a page, in PDF user space.
 *
 * The current transform is tracked through save/restore/transform so boxes
 * come back in page coordinates regardless of how the producer nested them.
 */
export async function extractPageGeometry(page, OPS) {
  let ops
  try {
    ops = await page.getOperatorList()
  } catch {
    return { hlines: [], squares: [], rects: [] }
  }

  let ctm = IDENTITY.slice()
  const stack = []
  const boxes = []

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i]
    if (fn === OPS.save) stack.push(ctm.slice())
    else if (fn === OPS.restore) ctm = stack.pop() || IDENTITY.slice()
    else if (fn === OPS.transform) ctm = mul(ctm, ops.argsArray[i])
    else if (fn === OPS.constructPath) {
      // pdfjs hands back the path's min/max box, which for the rectangles and
      // straight rules forms are built from is the shape itself.
      const mm = ops.argsArray[i]?.[2]
      if (!mm || mm.length < 4) continue
      const [ax, ay] = apply(ctm, mm[0], mm[1])
      const [bx, by] = apply(ctm, mm[2], mm[3])
      const x = Math.min(ax, bx), y = Math.min(ay, by)
      const w = Math.abs(bx - ax), h = Math.abs(by - ay)
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      boxes.push({ x, y, w, h })
    }
  }

  return {
    // Rules a value is written on top of.
    hlines: boxes.filter(b => b.h <= 2.5 && b.w >= 20),
    // Tick boxes: small and roughly square.
    squares: boxes.filter(b =>
      b.w >= 5 && b.w <= 18 && b.h >= 5 && b.h <= 18 && Math.abs(b.w - b.h) <= 4),
    // Anything big enough to be a table cell or framed area.
    rects: boxes.filter(b => b.w > 16 && b.h > 8),
  }
}

const ROW_TOL = 3
const COL_TOL = 4

/**
 * Finds table grids among the page's rectangles.
 *
 * Rectangles are first collapsed into row bands, then consecutive bands that
 * share the same column layout are grouped into one table. Grouping by layout
 * matters: a page usually carries several unrelated boxes (a title block, a
 * free-text frame, the item grid), and treating them as one grid produces
 * nonsense columns.
 *
 * Within a table, bands containing text are the header (they hold the column
 * captions) and the empty bands beneath are the data rows a form is filled in.
 */
export function detectTables(rects, textItems, { minCols = 3, minRows = 2 } = {}) {
  if (!rects.length) return []

  // ── Row bands, top of page first ──────────────────────────────────────────
  const bands = []
  for (const r of [...rects].sort((a, b) => b.y - a.y)) {
    const band = bands.find(b => Math.abs(b.y - r.y) <= ROW_TOL)
    if (band) band.cells.push(r)
    else bands.push({ y: r.y, cells: [r] })
  }

  const signature = (cells) => [...new Set(cells.map(c => Math.round(c.x / COL_TOL)))]
    .sort((a, b) => a - b).join(',')

  // ── Group consecutive bands sharing a column layout ───────────────────────
  const groups = []
  for (const band of bands) {
    const cols = [...new Set(band.cells.map(c => Math.round(c.x / COL_TOL)))]
    if (cols.length < minCols) { groups.push(null); continue }   // breaks a run
    const sig = signature(band.cells)
    const last = groups[groups.length - 1]
    if (last && last.sig === sig) last.bands.push(band)
    else groups.push({ sig, bands: [band] })
  }

  const tables = []
  for (const g of groups) {
    if (!g || g.bands.length < minRows + 1) continue   // need header + data

    const all = g.bands.flatMap(b => b.cells)
    const lefts = [...new Set(all.map(c => Math.round(c.x / COL_TOL) * COL_TOL))].sort((a, b) => a - b)
    if (lefts.length < minCols) continue

    const columns = lefts.map((x, i) => {
      const sample = all.filter(c => Math.abs(c.x - x) <= COL_TOL)
      const width = Math.max(...sample.map(c => c.w))
      return { index: i, x, width, x2: x + width }
    })

    const left = columns[0].x, right = columns.at(-1).x2
    const rows = g.bands.map(b => {
      const height = Math.max(...b.cells.map(c => c.h))
      const hasText = textItems.some(t =>
        t.pdfY >= b.y - 1 && t.pdfY <= b.y + height + 1 &&
        t.x >= left - 4 && t.x <= right + 4)
      return { y: b.y, height, hasText }
    })

    const headerRows = rows.filter(r => r.hasText)
    const dataRows = rows.filter(r => !r.hasText)
    if (!dataRows.length || !headerRows.length) continue

    // Caption text is whatever sits inside this column within the header band.
    for (const col of columns) {
      col.caption = textItems
        .filter(t => t.x >= col.x - 2 && t.x < col.x2 - 2 &&
          headerRows.some(h => t.pdfY >= h.y - 1 && t.pdfY <= h.y + h.height + 1))
        .sort((a, b) => b.pdfY - a.pdfY || a.x - b.x)
        .map(t => t.text)
        .join(' ')
        .trim()
    }

    tables.push({ columns, dataRows, headerRows })
  }

  return tables
}

/** Smallest rectangle that encloses a text item — i.e. the cell it sits in. */
export function cellContaining(item, rects) {
  const pad = 2
  const inside = rects.filter(r =>
    item.x >= r.x - pad &&
    item.x + item.width <= r.x + r.w + pad &&
    item.pdfY >= r.y - pad &&
    item.pdfY <= r.y + r.h + pad)
  if (!inside.length) return null
  return inside.reduce((a, b) => (a.w * a.h <= b.w * b.h ? a : b))
}

/** The cell immediately to the right of `cell` on the same row, if any. */
export function cellRightOf(cell, rects, { gapTol = 4 } = {})   {
  const candidates = rects.filter(r => {
    if (r === cell) return false
    if (Math.abs(r.x - (cell.x + cell.w)) > gapTol) return false
    // Must share most of the row's height, so we don't grab a cell from
    // a different band that merely starts at the right x.
    const overlap = Math.min(r.y + r.h, cell.y + cell.h) - Math.max(r.y, cell.y)
    return overlap >= Math.min(r.h, cell.h) * 0.5
  })
  if (!candidates.length) return null
  // Prefer the tightest row match, then the widest usable cell.
  candidates.sort((a, b) => Math.abs(a.h - cell.h) - Math.abs(b.h - cell.h) || b.w - a.w)
  return candidates[0]
}

const LINE_HEIGHT = 12
const MIN_VALUE_WIDTH = 24

/**
 * True when a horizontal line is really a cell edge rather than a fill-in rule.
 * Table borders are horizontal lines too, and mistaking one for a rule puts the
 * value on a cell boundary instead of where it belongs.
 */
const isCellEdge = (line, rects) => rects.some(r =>
  Math.abs(r.x - line.x) <= 2 &&
  Math.abs(r.w - line.w) <= 3 &&
  (Math.abs(r.y - line.y) <= 1.5 || Math.abs((r.y + r.h) - line.y) <= 1.5))

/** A fill-in rule drawn to the right of the label on its own line. */
const ruleAfterLabel = (labelItem, hlines, limitX, rects) => {
  const labelRight = labelItem.x + labelItem.width
  const hit = hlines
    .filter(l => l.x >= labelRight - 2 &&
      l.x + l.w <= limitX + 3 &&
      labelItem.pdfY - l.y >= -3 && labelItem.pdfY - l.y <= 9 &&
      l.w >= MIN_VALUE_WIDTH &&
      !isCellEdge(l, rects))
    .sort((a, b) => a.x - b.x)[0]
  return hit ? { x: hit.x + 1, y: hit.y + 1.5, width: hit.w - 2, height: LINE_HEIGHT } : null
}

/**
 * Where a value belongs, read from what the form actually draws.
 *
 * Forms use a small number of layouts, and each is resolved from geometry
 * rather than guessed:
 *   • label cell with the value cell beside it ("Name: │ ______ ")
 *   • a fill-in rule after the label ("Remarks: ______")
 *   • one tall cell with the label on top and the value written underneath
 *     ("Root Cause: (to be filled in by …)")
 *
 * Order matters: the containing cell is resolved first so that a cell border
 * is never mistaken for a fill-in rule.
 */
export function valueBoxForLabel(labelItem, { rects = [], hlines = [], textItems = [] } = {}) {
  const cell = cellContaining(labelItem, rects)
  const limitX = cell ? cell.x + cell.w : labelItem.pageWidth - 8

  // 1. A fill-in rule on the label's own line always wins: it is the form
  //    author saying "write here", and it is per-line, so it resolves repeated
  //    blocks (three follow-up columns each with their own "Remarks: ___").
  const rule = ruleAfterLabel(labelItem, hlines, limitX, rects)
  if (rule) return rule

  if (!cell) return null

  const labelLine = Math.max(labelItem.height, 10)
  const isTallCell = cell.h > labelLine * 2.2

  // 2. Value cell beside the label cell — the common single-line table row.
  //    Only for single-line cells: in a tall multi-line cell (a follow-up
  //    column, say) the "cell to the right" is the next column, not a value.
  if (!isTallCell) {
    const right = cellRightOf(cell, rects)
    if (right && right.w >= MIN_VALUE_WIDTH) {
      const height = Math.min(right.h - 4, LINE_HEIGHT + 2)
      return { x: right.x + 3, y: right.y + (right.h - height) / 2, width: right.w - 6, height }
    }
  }

  // 3. Captioned box: the label caps a tall cell and the value is written in
  //    the space underneath, stopping at whatever is already printed lower in
  //    the cell (a "Signature: ___" line, typically).
  const labelNearTop = (cell.y + cell.h) - labelItem.pdfY <= labelLine * 2.5
  if (isTallCell && labelNearTop) {
    const below = textItems.filter(t =>
      t.page === labelItem.page &&
      t.x >= cell.x - 2 && t.x <= cell.x + cell.w + 2 &&
      t.pdfY >= cell.y - 2 && t.pdfY < labelItem.pdfY - 4)
    const floor = below.length
      ? Math.max(...below.map(t => t.pdfY)) + labelLine + 3
      : cell.y + 3
    const height = (labelItem.pdfY - 4) - floor
    if (height >= LINE_HEIGHT) {
      return { x: cell.x + 4, y: floor, width: cell.w - 8, height }
    }
  }

  // 4. Remaining space on the label's own line, bounded by the cell.
  const x = labelItem.x + labelItem.width + 6
  const width = cell.x + cell.w - 3 - x
  if (width >= MIN_VALUE_WIDTH) {
    const height = Math.min(cell.h - 4, LINE_HEIGHT + 2)
    return { x, y: labelItem.pdfY - 3, width, height }
  }
  return null
}

/**
 * The rule a label's value should be written on, if the form draws one.
 * Returns the value box (sitting just above the rule), or null.
 */
export function underlineAfterLabel(labelItem, hlines) {
  const labelRight = labelItem.x + labelItem.width
  const baseline = labelItem.pdfY

  const candidates = hlines.filter(l =>
    l.x + l.w > labelRight &&              // extends past the label
    l.x < labelItem.pageWidth &&
    baseline - l.y >= -3 && baseline - l.y <= 9)   // sits on this text line

  if (!candidates.length) return null
  // Nearest rule to the right of the label.
  candidates.sort((a, b) => a.x - b.x)
  const rule = candidates.find(l => l.x >= labelRight - 2) || candidates[0]
  const x = Math.max(rule.x, labelRight + 2)
  const width = rule.x + rule.w - x
  if (width < 20) return null

  return { x, y: rule.y + 1.5, width, height: 12 }
}

/** The tick box drawn immediately before a printed option word, if any. */
export function squareBeforeText(textItem, squares) {
  const hits = squares.filter(s =>
    s.x + s.w <= textItem.x + 2 &&
    textItem.x - (s.x + s.w) <= 14 &&
    Math.abs((s.y + s.h / 2) - (textItem.pdfY + 3)) <= 8)
  if (!hits.length) return null
  hits.sort((a, b) => b.x - a.x)   // closest to the word
  return hits[0]
}
