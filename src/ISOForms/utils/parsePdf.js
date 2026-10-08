// The pdfjs worker is configured once in renderPdfPage.js and shared by both
// the extractor here and the field position editor.
import { pdfjsLib } from './renderPdfPage'
import {
  extractPageGeometry,
  detectTables,
  squareBeforeText,
  squareAfterText,
  tickBoxNearText,
  valueBoxForLabel,
  detectInputRegions,
  detectRatingMatrices,
  detectGlyphMatrices,
  detectRegisterTables,
  labelForRegion,
} from './detectPdfGeometry'
import { readAcroFormFields } from './readAcroForm'

// ── Type guesser ─────────────────────────────────────────────────────────────
const guessType = (label) => {
  const l = label.toLowerCase()
  if (/\bdate\b|tarikh/.test(l)) return 'date'
  if (/\b(name|personnel|by|inspector|assigned|responsible|verified|reported|concerned)\b/.test(l)) return 'employee'
  if (/department|dept\b/.test(l)) return 'text'
  if (/\b(description|detail|reason|remark|comment|note|action|cause|correction|nonconform|non-conform)\b/.test(l)) return 'textarea'
  if (/\b(status|type|category|priority|level|approval|decision|impact)\b/.test(l)) return 'dropdown'
  return 'text'
}

// ── Owner guesser ─────────────────────────────────────────────────────────────
const guessOwner = (label, sectionHint) => {
  const l = label.toLowerCase()
  if (/\b(impact|approval|approved|rejected|root cause|correction|corrective|follow.?up|closing|closed|category|decision|verified)\b/.test(l)) return 'approver'
  if (sectionHint === 'approver') return 'approver'
  return 'requester'
}

// ── Noise filter ──────────────────────────────────────────────────────────────
const isNoise = (text) => {
  const t = text.trim()
  if (!t || t.length < 2) return true
  // Page / form headers
  if (/^(premier|ptis|fm-\d|rev\s*\d|page\s*\d|the strongest link)/i.test(t)) return true
  // The letterhead's own bare "Title"/"Issue"/"Code" cell headers — exact
  // match only, not a prefix: "Title of Account" or "Issue Date" are real
  // field labels that happen to start with the same word, and a prefix
  // match here was silently discarding them along with the actual noise.
  if (/^(issue|code|title)$/i.test(t)) return true
  // A template author's own "Input" placeholder marking where a value goes.
  if (/^input$/i.test(t)) return true
  // Pure numbers, single chars, date strings, short codes
  if (/^\d+$/.test(t) || /^[a-z]$/i.test(t) || /^\d{2}[\/\-]\w+[\/\-]\d{4}$/.test(t) || /^0\d$/.test(t)) return true
  // Section banners
  if (/^section\s*[:\-–]/i.test(t)) return true
  // Instruction text
  if (/^to be (filled|assigned|used)\b/i.test(t) || /\(to be filled/i.test(t) || /^for use of\b/i.test(t)) return true
  // Standalone checkbox option words
  if (/^(urgent|normal|low|scheduled|unscheduled|emergency|hardware|software|network|application|environment|other|approved|rejected|postponed|closed|pending|minor|major|significant|negligible|accepted|na\b)$/i.test(t)) return true
  return false
}

// A word printed under a signature line ("Director" under "Approved By: ____")
// names who signs; it is not a field of its own. Only text with no colon of its
// own qualifies, so the next "Label: ____" line down is never mistaken for one,
// and only when it sits beneath the blank itself rather than the label before it.
const isCaptionUnderRule = (labelItem, allItems) => {
  const t = labelItem.text.trim()
  if (t.includes(':') || t.includes('_')) return false
  return allItems.some(ru => {
    if (ru.page !== labelItem.page || !/_{3,}/.test(ru.text)) return false
    const drop = ru.pdfY - labelItem.pdfY
    if (drop <= 6 || drop > 32) return false
    const start = ru.x + ru.width * (ru.text.indexOf('_') / Math.max(ru.text.length, 1))
    const overlap = Math.min(ru.x + ru.width, labelItem.x + labelItem.width) - Math.max(start, labelItem.x)
    return overlap >= labelItem.width * 0.5
  })
}

// ── Label detector ────────────────────────────────────────────────────────────
const isLabelLike = (text) => {
  const t = text.trim()
  if (!t || t.length < 3) return false
  // A genuine question ("Was there a specific event...?") is exactly the
  // kind of label a Yes/No checkbox hangs off, but used to be invisible
  // here — the sentence-case branch below explicitly excludes anything
  // ending in '?' so random prose wouldn't become a field, and that same
  // exclusion also threw out every real interrogative label in the form.
  // Allowed a longer length than the other branches since questionnaire
  // questions routinely run longer than a short field caption.
  if (t.endsWith('?')) return t.length <= 160
  // A numbered list item ("4. Quantity and quality of training received...")
  // is just as real a question/field label as one ending in '?' — it starts
  // with a digit, which fails every other branch's leading-capital-letter
  // check, and routinely ends in a period or runs past 7 words, which the
  // short Title-Case branch below explicitly excludes. Required to actually
  // end the sentence (not just start with a number) so a long question that
  // wraps onto a second physical line doesn't also match on its own
  // mid-sentence first line — the real label is the line that finishes it.
  if (/^\d{1,2}[.)]\s+\S/.test(t) && /[.?!]$/.test(t)) return t.length <= 160
  if (t.length > 90) return false
  if (t.endsWith(':')) return true
  if (t === t.toUpperCase() && t.length >= 4 && t.length <= 70 && /[A-Z]/.test(t)) return true
  if (/^[A-Z][a-z]/.test(t) && t.split(/\s+/).length <= 7 && !/[.?!]$/.test(t)) return true
  if (/^[A-Z][a-z]/.test(t) && t.split(/\s+/).length <= 4 && /\bNo\.$/.test(t)) return true
  return false
}

/**
 * Builds the value box that sits immediately after a label.
 *
 * The box runs from just past the label to whatever bounds it on the right —
 * the next text item on the same row, or the page edge. Giving the box real
 * extents (rather than the bare anchor point the importer used to emit) is
 * what lets the renderer fit and wrap text instead of blindly truncating, and
 * it gives the position editor a real box to show and resize.
 *
 * Height stays one line: an auto-detected box has a measured width but only a
 * guessed height, so it must not invite wrapping into space we never verified
 * is empty. The admin can grow it in the position editor.
 */
// One line of value text. Kept constant on purpose: the box is rendered
// top-anchored, so if its height tracked the label's font size a value next to
// a large heading would float above the line it belongs to.
const VALUE_BOX_HEIGHT = 14
const VALUE_FONT_SIZE = 9
// Below this a box is too cramped to hold anything useful, so it's better to
// run to the page edge (what the importer did before boxes existed) than to
// emit a 30pt sliver.
const MIN_USABLE_WIDTH = 60
// A box taller than roughly two lines is meant to hold prose.
const LINE_TALL = 30

/**
 * The value box for a label: what the form draws if it draws anything, and
 * otherwise the space after the label. Both placement paths go through here so
 * generic and preset imports position identically.
 */
const valueBoxFor = (labelItem, geom, nextItem) => {
  // A typed-underscore rule right after the label IS the value area, so write
  // on it rather than past it.
  const typedRule = nextItem &&
    nextItem.page === labelItem.page &&
    RULE_RUN.test(nextItem.text) &&
    Math.abs(nextItem.pdfY - labelItem.pdfY) <= 3 &&
    nextItem.x >= labelItem.x + labelItem.width - 2 &&
    nextItem.width >= 20
      ? { x: nextItem.x + 1, y: nextItem.pdfY - 1, width: nextItem.width - 2, height: 12 }
      : null

  const box = typedRule || valueBoxForLabel(labelItem, geom) || boxAfterLabel(labelItem, nextItem)
  return {
    page: labelItem.page,
    pageWidth: labelItem.pageWidth,
    pageHeight: labelItem.pageHeight,
    ...box,
  }
}

const boxAfterLabel = (labelItem, nextItem) => {
  const x = labelItem.x + labelItem.width + 8
  const pageEdge = labelItem.pageWidth - 10

  // Stop before a neighbouring column when there's genuinely room to; if the
  // neighbour sits right next to the label (inline checkbox options, tight
  // two-column rows) fall back to the page edge instead of crushing the box.
  let right = pageEdge
  if (nextItem && nextItem.x > x && nextItem.x - 4 - x >= MIN_USABLE_WIDTH) {
    right = nextItem.x - 4
  }

  return {
    page: labelItem.page,
    x,
    // Positioned so the value's baseline lands just above the label's own
    // baseline — the same place the anchor-only importer used to put it.
    y: labelItem.pdfY + 2 - VALUE_BOX_HEIGHT + VALUE_FONT_SIZE,
    width: Math.max(MIN_USABLE_WIDTH, Math.round(right - x)),
    height: VALUE_BOX_HEIGHT,
    pageWidth: labelItem.pageWidth,
    pageHeight: labelItem.pageHeight,
  }
}

/**
 * Locates a choice field's printed options on the page.
 *
 * Preset fields carry their options as text ("Purchase, Replace, …") but no
 * positions, so without this the overlay writes the chosen option as a string
 * at the field anchor — directly on top of the form's own printed option list.
 * With positions we can tick the real box instead.
 *
 * Matching is on the leading words because forms routinely split an option
 * across text runs ("Urgent" + "(Within same day)") or wrap it onto the next
 * line, so the search window covers a couple of lines below the label.
 */
/**
 * Comparable form of an option, for matching a stored option against the words
 * the form actually prints.
 *
 * A form enumerates its choices ("a) Internal Audit") and spaces its
 * punctuation to taste ("Vendor / Sub contracting"), while the template stores
 * the plain choice ("Internal Audit", "Vendor/Sub Contracting"). Comparing the
 * raw strings therefore missed every enumerated option — which is what left
 * whole checkbox groups with no marks. Stripping the enumerator and reducing
 * both sides to bare alphanumerics makes those the same string.
 */
const optionKey = (text) => String(text || '')
  .toLowerCase()
  .replace(/^\s*\(?\s*[a-z0-9]{1,2}\s*[).]\s*/, '')   // "a)" / "(b)" / "1."
  .replace(/\(.*$/, '')                                 // trailing "(specify…)"
  .replace(/[^a-z0-9]/g, '')

// Options routinely wrap onto further lines under their label, so the search
// reaches a few lines down rather than one. Only text that matches a declared
// option is ever used, which is what keeps the wider window safe.
const OPTION_SEARCH_DEPTH = 72

/**
 * How far into a printed text run the option itself reaches.
 *
 * A form writes its last choice as "g) Others : ______________", so the text
 * item's full width is mostly trailing rule. Marking after that width puts the
 * tick at the far edge of the page instead of beside the word, so the width is
 * scaled to the part the option actually occupies.
 */
const optionWidthWithin = (hit, opt) => {
  const raw = String(hit.text || '')
  const plain = String(opt).replace(/\(.*$/, '').trim()
  if (!raw.length || !plain.length || !hit.width) return hit.width || 0
  const at = raw.toLowerCase().indexOf(plain.slice(0, 12).toLowerCase())
  if (at < 0) return hit.width
  return hit.width * Math.min(1, (at + plain.length) / raw.length)
}

/**
 * A checkbox drawn as a character rather than as a path.
 *
 * Plenty of forms typeset their tick boxes in a symbol font — the follow-up
 * columns here are a Wingdings box followed by the word — so there is no
 * rectangle in the page's geometry to find. Such a glyph is short, carries no
 * letters or digits, and is not ASCII punctuation (which would be the form's
 * own dashes and colons).
 */
const isTickGlyph = (text) => {
  const t = String(text || '').trim()
  if (!t || t.length > 2) return false
  if (/[A-Za-z0-9]/.test(t)) return false
  return !/^[ -~]+$/.test(t)
}

const glyphTickBoxes = (allItems, pageIndex) => allItems
  .filter(it => it.page === pageIndex && (it.width || 0) <= 14 && isTickGlyph(it.text))
  .map(it => ({
    x: it.x,
    y: it.pdfY,
    w: it.width || 8,
    h: Math.max(it.height || 8, 8),
  }))

const findOptionMarks = (optionList, labelItem, allItems, geom, {
  depthBelow = OPTION_SEARCH_DEPTH,
  depthAbove = 6,
  nearest = false,
} = {}) => {
  const opts = String(optionList || '').split(',').map(s => s.trim()).filter(Boolean)
  if (opts.length < 2) return null

  const nearby = allItems.filter(it =>
    it.page === labelItem.page &&
    it.text.trim().length >= 3 &&
    labelItem.pdfY - it.pdfY <= depthBelow &&
    it.pdfY - labelItem.pdfY <= depthAbove)

  // Pair each option with the text the form prints for it. Searching from a
  // placed field rather than from its printed label takes the closest match:
  // a form with three identical follow-up columns prints "closed"/"pending"
  // three times, and taking the first would tick the first column for all of
  // them.
  const distanceTo = (it) => Math.hypot(it.x - labelItem.x, it.pdfY - labelItem.pdfY)
  const hits = []
  for (const opt of opts) {
    const head = optionKey(opt)
    if (head.length < 3) continue
    const matches = nearby.filter(it => {
      const t = optionKey(it.text)
      return t.length >= 3 && (t.startsWith(head) || head.startsWith(t))
    })
    const hit = nearest
      ? matches.reduce((best, it) =>
        !best || distanceTo(it) < distanceTo(best) ? it : best
      , null)
      : matches[0]
    if (hit) hits.push({ opt, hit })
  }
  if (hits.length < 2) return null

  const squares = geom?.squares || []
  // Some forms draw a mark box that is wider than it is tall ("Accepted ▭")
  // rather than a square. Those are only consulted when no square-shaped box
  // was found for the group at all, because a short table cell can look just
  // like one and must not out-rank a real tick box.
  const wideBoxes = (geom?.rects || []).filter(r =>
    r.h >= 5 && r.h <= 18 && r.w >= 5 && r.w <= 40)

  // Which side of its printed choice this form draws the tick box on is a
  // property of the GROUP, not of each option. Deciding per option gets it
  // wrong on a form that boxes on the right: the box "before" option b is
  // really option a's box, so every mark lands one option too early. Scoring
  // both sides across the whole group and taking the better one avoids that.
  const distinct = (boxes) => new Set(boxes.filter(Boolean).map(b => `${b.x},${b.y}`)).size
  const pickSide = (candidates) => {
    const boxesForSide = (side) => hits.map(({ hit }) =>
      (side === 'before' ? squareBeforeText : squareAfterText)(hit, candidates))
    const before = boxesForSide('before')
    const after = boxesForSide('after')
    // Ties keep the historic left-hand reading.
    const side = distinct(after) > distinct(before) ? 'after' : 'before'
    return { side, boxes: side === 'after' ? after : before }
  }

  let { side, boxes } = pickSide(squares)
  if (!distinct(boxes)) {
    // No drawn rectangle: the form may typeset its boxes as glyphs instead.
    const glyphs = glyphTickBoxes(allItems, labelItem.page)
    if (glyphs.length) ({ side, boxes } = pickSide([...squares, ...glyphs]))
  }
  if (!distinct(boxes) && wideBoxes.length) ({ side, boxes } = pickSide([...squares, ...wideBoxes]))

  const used = new Set()
  return hits.map(({ opt, hit }, i) => {
    const box = boxes[i]
    const key = box && `${box.x},${box.y}`
    // One drawn box can only belong to one option; a second claim on it means
    // the match is wrong, so that option falls back to its printed text.
    if (box && !used.has(key)) {
      used.add(key)
      return { label: opt, box: { x: box.x, y: box.y, width: box.w, height: box.h } }
    }
    // No box of its own: remember the side so the tick still lands where this
    // form puts its marks rather than always to the left of the word.
    return {
      label: opt,
      x: hit.x,
      y: hit.pdfY,
      width: optionWidthWithin(hit, opt),
      height: Math.max(hit.height, 8),
      side,
    }
  })
}

/**
 * Places numbered table fields into the cells the form actually draws.
 *
 * A field like "Item 3 — Specification" carries its row in the number and its
 * column in the trailing words; the detected grid supplies the rest. This is
 * what makes an 8-row item table position itself exactly, with no label for
 * any individual cell to match against.
 */
const cellForSeriesField = (label, geometry) => {
  const m = String(label || '').match(/^(.*?)(\d+)\s*[—\-–:]*\s*(.+)$/)
  if (!m) return null
  const rowNo = Number(m[2])
  const colName = m[3].trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!rowNo || !colName) return null

  const words = colName.split(' ').filter(w => w.length > 2)
  if (!words.length) return null

  for (let pageIdx = 0; pageIdx < geometry.length; pageIdx++) {
    for (const table of geometry[pageIdx].tables || []) {
      if (rowNo > table.dataRows.length) continue

      // Score each column's caption against the field's column words.
      let best = null, bestScore = 0
      for (const col of table.columns) {
        const cap = String(col.caption || '').toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
        if (!cap) continue
        const capWords = cap.split(' ').filter(w => w.length > 2)
        if (!capWords.length) continue
        const hits = words.filter(w => capWords.some(c => c.includes(w) || w.includes(c))).length
        const score = hits / words.length
        if (score > bestScore) { bestScore = score; best = col }
      }
      if (!best || bestScore < 0.5) continue

      const row = table.dataRows[rowNo - 1]
      const pad = 2
      return {
        page: pageIdx,
        x: best.x + pad + 1,
        y: row.y + pad,
        width: Math.max(12, best.width - pad * 2 - 2),
        height: Math.max(8, row.height - pad * 2),
      }
    }
  }
  return null
}

/**
 * Joins text runs that are really one printed phrase.
 *
 * PDF producers split a line into arbitrary runs — this form emits
 * "Name" + "of Reporting Personnel:" and even "Reporting D" + "ate:". Matched
 * against raw runs, no item ever equals a full label, so a field would latch
 * onto whatever unrelated phrase happened to be emitted whole (here the
 * "SECTION: A (Reporting Personnel)" heading), dragging every value into the
 * wrong row. Merging first means labels are compared as they actually read.
 *
 * Only genuinely adjacent runs are joined; a real gap still separates a label
 * from its neighbours, so columns and inline options stay distinct.
 */
const MERGE_GAP = 4

// A run of underscores or dots is a fill-in rule typed as text ("PREPARED BY:
// ______"), not part of the label. Keeping it separate preserves its exact
// x-range, so a value can be written ON the rule instead of after it.
const RULE_RUN = /^[_.․‥…\-—–\s]{3,}$/

const mergeTextRuns = (items) => {
  const byLine = [...items].sort((a, b) => b.pdfY - a.pdfY || a.x - b.x)
  const merged = []

  for (const item of byLine) {
    const prev = merged[merged.length - 1]
    const adjacent = prev &&
      prev.page === item.page &&
      !RULE_RUN.test(item.text) &&
      !RULE_RUN.test(prev.text) &&
      Math.abs(prev.pdfY - item.pdfY) <= 2 &&
      item.x - (prev.x + prev.width) <= MERGE_GAP &&
      item.x >= prev.x

    if (!adjacent) { merged.push({ ...item }); continue }

    const needsSpace = !prev.text.endsWith(' ') && !item.text.startsWith(' ') &&
      item.x - (prev.x + prev.width) > 0.8
    prev.text = `${prev.text}${needsSpace ? ' ' : ''}${item.text}`.trim()
    prev.width = item.x + item.width - prev.x
    prev.height = Math.max(prev.height, item.height)
  }

  return merged
}

// ── Group text items into rows by Y coordinate ────────────────────────────────
const groupByRow = (items) => {
  const rows = []
  const used = new Set()
  const sorted = [...items].sort((a, b) => a.y - b.y)

  for (const item of sorted) {
    if (used.has(item)) continue
    const row = [item]
    used.add(item)
    for (const other of sorted) {
      // Same page as well as same line: without the page check, items that
      // merely share a y-coordinate on different pages land in one "row",
      // which mis-bounds value boxes and invents bogus inline options.
      if (!used.has(other) && other.page === item.page && Math.abs(other.y - item.y) < 8) {
        row.push(other)
        used.add(other)
      }
    }
    row.sort((a, b) => a.x - b.x)
    rows.push(row)
  }
  return rows.sort((a, b) => (a[0].page - b[0].page) || (a[0].y - b[0].y))
}

// ── Detect section context (requester vs approver) ────────────────────────────
const detectSectionOwner = (rowText) => {
  const t = rowText.toLowerCase()
  if (/reporting personnel|initiator|section.*\ba\b/.test(t)) return 'requester'
  if (/ismr|change team|hod|functional head|qms|qhse|auditor|section.*\b[bc]\b|approver/.test(t)) return 'approver'
  return null
}

// Known PTIS form codes → matched by text inside the PDF
const KNOWN_FORMS = [
  { code: 'FM-001-04', pattern: /FM-001-04/i },
  { code: 'FM-002-01', pattern: /FM-002-01/i },
  { code: 'FM-014-09', pattern: /FM-014-09/i },
  { code: 'FM-006-03', pattern: /FM-006-03/i },
]

/**
 * Extracts text items from a PDF and builds candidate field definitions.
 * Returns: { pages, fields, detectedFormCode }
 *   pages           — raw text items per page (for pdf-lib overlay later)
 *   fields          — detected field candidates for the import review UI
 *   detectedFormCode — e.g. "FM-002-01" if a known PTIS form was recognised, else null
 */
export async function parsePdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  // pdfjs takes ownership of (and detaches) the buffer it is handed, so the
  // copy for the AcroForm read has to be taken first.
  const acroBytes = arrayBuffer.slice(0)
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  const geometry = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const vp = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    const rawItems = content.items
      .filter(item => item.str.trim())
      .map(item => {
        const [, , , , tx, ty] = item.transform
        return {
          text: item.str.trim(),
          x: Math.round(tx),
          y: Math.round(vp.height - ty),
          pdfY: Math.round(ty),
          width: Math.round(item.width),
          height: Math.round(item.height || 10),
          page: pageNum - 1,
          pageWidth: Math.round(vp.width),
          pageHeight: Math.round(vp.height),
        }
      })

    // Rejoin runs the producer split mid-phrase, so labels read as printed.
    const items = mergeTextRuns(rawItems)

    pages.push(items)

    // The lines and boxes the form actually draws — the source of truth for
    // where values belong, rather than inferring it from label text.
    const geom = await extractPageGeometry(page, pdfjsLib.OPS)
    geom.tables = detectTables(geom.rects, items)
    geom.textItems = items
    geometry.push(geom)
  }

  const allItems = pages.flat()

  // Rating grids (a "1 2 3 4 5" header over rows of empty cells). Each row
  // becomes one single-choice field whose marks are that row's own cells, and
  // the grid's area is then kept out of the generic passes below so its labels
  // and empty cells don't also turn up as stray text fields.
  const ratingGrids = geometry.flatMap((geom, pageIdx) => {
    const drawn = detectRatingMatrices(geom.rects || [], pages[pageIdx] || [])
      .map(m => ({ ...m, page: pageIdx }))
    // Grids of box glyphs have no drawn cells. One already read from drawn cells
    // wins where the two overlap.
    const typeset = detectGlyphMatrices(pages[pageIdx] || [])
      .filter(m => !drawn.some(d => m.bottom <= d.top && m.top >= d.bottom))
      .map(m => ({ ...m, page: pageIdx }))
    return [...drawn, ...typeset]
  })
  // The header sits above the digit row (a "Poor → Excellent" banner); the
  // band reaches up far enough to take that in too.
  const HEADER_BAND = 16
  // Register tables (an issue log, a schedule): captions over rows of empty
  // cells, every cell its own entry. Rating and box-glyph grids are read first,
  // and a table that overlaps one is that grid, not a register.
  const registerTables = geometry.flatMap((geom, pageIdx) =>
    detectRegisterTables(geom.rects || [], pages[pageIdx] || [])
      .map(t => ({ ...t, page: pageIdx }))
      .filter(t => !ratingGrids.some(g => g.page === pageIdx && t.bottom <= g.top + HEADER_BAND && t.top >= g.bottom)))
  const inRegisterTable = (page, y) => registerTables.some(t =>
    t.page === page && y >= t.bottom - 2 && y <= t.top + 2)
  const inRatingGrid = (page, y) => inRegisterTable(page, y) || ratingGrids.some(g =>
    g.page === page && y >= g.bottom - 2 && y <= g.top + HEADER_BAND)
  const inRatingCell = (page, r) => inRegisterTable(page, r.y + r.h / 2) || ratingGrids.some(g => g.page === page && g.rows.some(row =>
    row.cells.some(c => r.x + r.w / 2 >= c.x && r.x + r.w / 2 <= c.x + c.w &&
      r.y + r.h / 2 >= c.y && r.y + r.h / 2 <= c.y + c.h)))
  const registerFields = registerTables.flatMap((t, ti) => {
    const sample = pages[t.page]?.[0]
    return t.rows.flatMap((row, ri) => t.columns.flatMap((col, ci) => {
      const cell = row.cells[ci]
      if (!cell || !col.caption) return []
      return [{
        id: `f_reg_${t.page}_${ti}_${ri}_${ci}_${Date.now().toString(36)}`,
        label: `Row ${row.number} — ${col.caption}`,
        type: /\bdate\b/i.test(col.caption) ? 'date' : cell.h > LINE_TALL ? 'textarea' : 'text',
        required: false,
        owner: 'requester',
        options: '',
        pdfCoords: {
          page: t.page,
          x: cell.x + 2,
          y: cell.y + 2,
          width: Math.max(12, cell.w - 4),
          height: Math.max(8, cell.h - 4),
          pageWidth: sample?.pageWidth,
          pageHeight: sample?.pageHeight,
        },
      }]
    }))
  })
  const ratingFields = ratingGrids.flatMap(g => {
    const sample = pages[g.page]?.[0]
    const left = Math.min(...g.rows.flatMap(r => r.cells.map(c => c.x)))
    const right = Math.max(...g.rows.flatMap(r => r.cells.map(c => c.x + c.w)))
    return g.rows.map((row, i) => {
      const markSize = Math.max(6, Math.min(14, row.h - 4, ...row.cells.map(c => c.w - 4)))
      // Typeset boxes are already the exact square; drawn cells hold a smaller mark.
      const markBox = (cell) => g.exact
        ? { x: cell.x, y: cell.y, width: cell.w, height: cell.h }
        : {
            x: cell.x + (cell.w - markSize) / 2,
            y: row.y + (row.h - markSize) / 2,
            width: markSize,
            height: markSize,
          }
      return {
        id: `f_rating_${g.page}_${Date.now().toString(36)}_${i}`,
        label: row.label.replace(/^\d{1,2}[.)]\s+/, ''),
        // A rating row is single-select (one box per question); a grid of
        // interval boxes (km marks) can have several ticked. fillOriginalPdf
        // ticks each chosen option's own box for either type.
        type: g.multi ? 'checkbox-group' : 'radio',
        required: !g.multi,
        owner: 'requester',
        options: g.columns.map(c => c.label).join(', '),
        pdfCoords: {
          page: g.page,
          x: left,
          y: row.y,
          width: right - left,
          height: row.h,
          pageWidth: sample?.pageWidth,
          pageHeight: sample?.pageHeight,
          optionMarks: g.columns.map((c, ci) => ({
            label: c.label,
            box: markBox(row.cells[ci]),
          })),
        },
      }
    })
  })

  // A PDF that already carries interactive form fields states every field's
  // name, type and exact rectangle, so nothing needs to be inferred. When one
  // does, that is authoritative and the text/geometry heuristics are skipped.
  const acroFields = await readAcroFormFields(acroBytes, { guessType, guessOwner })
  const rows = groupByRow(allItems)
  const fields = []
  let currentSectionOwner = 'requester'
  // A row borrowed as the next row's Yes/No (or other short choice list) —
  // see the lookahead below — must not also be walked as its own row of
  // labels afterward, or "Yes"/"No" would each additionally show up as
  // their own one-word phantom fields.
  const consumedRowIdxs = new Set()

  for (let i = 0; i < rows.length; i++) {
    if (consumedRowIdxs.has(i)) continue
    const row = rows[i]
    const rowFullText = row.map(r => r.text).join(' ')

    // Track which section we're in (requester vs approver)
    const sectionOwner = detectSectionOwner(rowFullText)
    if (sectionOwner) currentSectionOwner = sectionOwner

    // A second/third-column label is routinely merged with its own trailing
    // blank into one text run ("Email: ___________________________", or
    // "NTN# _______________________________" — some forms use '#' rather
    // than ':' for the same purpose) — that never ends with the separator
    // itself (it ends with the blank), so it used to be invisible as a
    // column boundary entirely and silently vanished into whatever label
    // came before it on the row instead of becoming its own field. Pulling
    // the part before whichever separator comes first out separately lets
    // it still be recognised.
    const extractEmbeddedLabel = (text) => {
      const t = text.trim()
      const colonIdx = t.indexOf(':')
      const hashIdx = t.indexOf('#')
      const candidates = [colonIdx, hashIdx].filter(n => n >= 0)
      if (!candidates.length) return null
      const sepIdx = Math.min(...candidates)
      if (sepIdx === t.length - 1) return null
      const before = t.slice(0, sepIdx).trim()
      return isLabelLike(`${before}:`) ? before : null
    }

    // Every label in the row is a candidate, not just the leftmost — forms are
    // routinely two- or three-column ("Date of Issue: ___   NCR No: ___"), and
    // taking only row[0] silently dropped every right-hand field.
    // Later items must end with ':' (or embed one, per above) to qualify,
    // which distinguishes a real second-column label from a checkbox option
    // word sitting on the same line.
    // A numbered question's own "4." sometimes lands as its own separate
    // text item rather than merged with the sentence that follows it — too
    // short to be a label itself (fails the length-3 floor), but it means
    // the real question text right after it is effectively starting the
    // row's content, the same as if it were idx 0.
    const isBareNumbering = (t) => /^\d{1,2}[.)]$/.test(t.trim())
    const labelIdxs = row
      .map((item, idx) => ({ item, idx }))
      .filter(({ item, idx }) => {
        if (isNoise(item.text)) return false
        const precededByBareNumber = idx === 1 && isBareNumbering(row[0]?.text || '')
        // Re-attach the "4." when testing whether this reads as a label —
        // isLabelLike's own numbered-list branch only recognises one when
        // the digit is part of the same string, which it isn't here (the
        // two are separate items); tested alone, a long question just fails
        // the short Title-Case branch's 7-word cap instead.
        const testText = precededByBareNumber ? `${row[0].text.trim()} ${item.text.trim()}` : item.text
        if (!isLabelLike(testText) && !extractEmbeddedLabel(item.text)) return false
        return idx === 0 || precededByBareNumber || item.text.trim().endsWith(':') || /\bNo\.$/.test(item.text.trim()) || extractEmbeddedLabel(item.text)
      })

    for (const { item: labelItem, idx } of labelIdxs) {
      if (inRatingGrid(labelItem.page, labelItem.pdfY)) continue
      if (isCaptionUnderRule(labelItem, allItems)) continue
      // Clean label: an embedded label ("Email: ____") uses the part before
      // its own colon; otherwise the normal strip-trailing-colon cleanup.
      const embedded = extractEmbeddedLabel(labelItem.text)
      const label = (embedded ?? labelItem.text)
        .replace(/^\d{1,2}[.)]\s+/, '')
        .replace(/:$/, '').replace(/\s*\(.*?\)\s*$/, '').trim()
      if (!label || label.length < 3) continue

      // Skip section-level headings that slipped through
      if (/^(document change request details|impact analysis|request approval|closing details|corrective action request|section [a-c])/i.test(label)) continue

      // Items between this label and the next label on the row. These are the
      // form's own printed choices ("Minor  Major  Observation"), so they are
      // NOT run through isNoise here — that filter exists to stop such words
      // becoming fields, and it was also swallowing them as options, which is
      // why choice lists came through with no options at all.
      const nextLabelIdx = labelIdxs.find(l => l.idx > idx)?.idx ?? row.length
      const between = row.slice(idx + 1, nextLabelIdx)
      // A run of underscores/dots/dashes anywhere in the text is always
      // blank-fill, never a printed option word ("Minor"/"Yes"/"Urgent"
      // never contains one) — without this, a label whose own value blank
      // sat in the same row-slice (every other field's blank line too, on a
      // form that packs several "Label: ____" pairs onto one visual row)
      // was being read as a multi-choice list of nonsense options built
      // from underscore runs.
      const isBlankFill = (t) => /^[_.․‥…\-—–\s]+$/.test(t) || /[_.․‥…\-—–]{3,}/.test(t)
      let optionItems = between.filter(r => {
        const t = r.text.trim()
        return t && t.length < 40 && !t.endsWith(':') && !/^\d{1,2}[/-]/.test(t) && !isBlankFill(t)
      })

      // Many forms print a question's choices ("Yes   No") on the line
      // below it rather than beside it — the same-row scan above can never
      // see those. Only borrowed when this label was the last thing on its
      // own row (so a genuinely different field's label on the same row
      // never loses its own options to this) and the next row is short and
      // plain, so a wrapped continuation of this label or the next real
      // field's own label is never mistaken for a choice list.
      let optionsFromNextRow = false
      if (optionItems.length < 2 && idx === row.length - 1 && i + 1 < rows.length && !consumedRowIdxs.has(i + 1) &&
          !rows[i + 1].some(r => inRatingGrid(r.page, r.pdfY))) {
        const nextRow = rows[i + 1]
        const candidates = nextRow.filter(r => {
          const t = r.text.trim()
          // isNoise excludes a bare 1-2 digit number (normally a stray page
          // number) — but a short row of them right under a rating question
          // ("1 2 3 4 5") is exactly the kind of choice list this is meant
          // to find, so a short number is let through here even though it
          // still can't become a label by itself anywhere else.
          const isShortNumber = /^\d{1,2}$/.test(t)
          return t && t.length < 40 && !t.endsWith(':') && (isShortNumber || !isNoise(t)) && !isBlankFill(t)
        })
        if (candidates.length === nextRow.length && candidates.length >= 2 && candidates.length <= 6) {
          optionItems = candidates
          optionsFromNextRow = true
          consumedRowIdxs.add(i + 1)
        }
      }

      let type = guessType(label)
      // Two or more printed choices next to the label means it's a choice
      // field. guessType's "dropdown" wording wins (single-select labels like
      // Category/Priority/Status); anything else becomes a checkbox group.
      if (optionItems.length >= 2 && type !== 'dropdown') type = 'checkbox-group'
      if (type === 'dropdown' && optionItems.length < 2) type = 'text'

      const owner = guessOwner(label, currentSectionOwner)
      const isChoice = type === 'checkbox-group' || type === 'dropdown'

      const geom = geometry[labelItem.page] || {}
      // valueBoxFor always anchors to the label's own row — correct for a
      // same-row value, but a choice field whose options live on the row
      // below was landing its box (and the field's on-page position in the
      // editor) up on the label's row instead of down where the options
      // actually are. Anchor to the first option's own row position instead
      // whenever that's where this field's options really came from.
      let coords = optionsFromNextRow
        ? {
            page: labelItem.page,
            pageWidth: labelItem.pageWidth,
            pageHeight: labelItem.pageHeight,
            x: optionItems[0].x,
            y: optionItems[0].pdfY - 1,
            width: Math.max(MIN_USABLE_WIDTH, optionItems[optionItems.length - 1].x + optionItems[optionItems.length - 1].width - optionItems[0].x),
            height: VALUE_BOX_HEIGHT,
          }
        : embedded
          ? (() => {
              // valueBoxFor positions the value after the label item's own
              // full width — right for a plain label, but an embedded label
              // ("Email: ___________________________") already spans past
              // its own blank, so "after the label" landed the box off to
              // the right of empty space instead of on the blank itself.
              // Estimate the blank's start from where the colon falls
              // within the merged string (PDF text isn't monospace, so this
              // is approximate — close enough for the admin to nudge in the
              // position editor rather than not finding the field at all).
              const t = labelItem.text.trim()
              // Whichever separator (':' or '#') extractEmbeddedLabel found
              // — reusing its own result keeps this in step with it rather
              // than re-deciding which character it was.
              const sepIdx = embedded.length
              const charWidth = labelItem.width / Math.max(t.length, 1)
              const offsetX = Math.round((sepIdx + 1) * charWidth)
              return {
                page: labelItem.page,
                pageWidth: labelItem.pageWidth,
                pageHeight: labelItem.pageHeight,
                x: labelItem.x + offsetX + 2,
                y: labelItem.pdfY + 2 - VALUE_BOX_HEIGHT + VALUE_FONT_SIZE,
                width: Math.max(MIN_USABLE_WIDTH, labelItem.width - offsetX - 4),
                height: VALUE_BOX_HEIGHT,
              }
            })()
          : valueBoxFor(labelItem, geom, row[nextLabelIdx])

      // A label whose own row has no real value (nothing after it, or just
      // a typed blank) with more blank-only rows directly beneath it is a
      // multi-line answer, not a one-line one — matching the user's own
      // "this blank continues on the next line" marking. Not tried for a
      // choice field (it already has its own meaning for what follows) or
      // when the row had a real same-row value (a short answer next to its
      // own label shouldn't swallow unrelated blank lines further down the
      // page that belong to the next question).
      //
      // isBlankFill itself is deliberately loose ("contains a long run of
      // underscores anywhere") because it only has to rule something OUT as
      // an option word there — "Designation: ____" rightly fails that test
      // too. Here the question is the opposite one, "is this row nothing
      // BUT blank", so it needs the strict, whole-string version — the loose
      // one was swallowing a real neighbouring "Label: ____" row as if it
      // were just another continuation line of blank space.
      const isPureBlank = (t) => /^[_.․‥…\-—–\s]*$/.test(t)
      if (!isChoice && !optionsFromNextRow && between.every(r => isPureBlank(r.text.trim()))) {
        let lastRowIdx = i
        let j = i + 1
        while (j < rows.length && !consumedRowIdxs.has(j)) {
          const candidateRow = rows[j]
          const isPureBlankRow = candidateRow.length > 0 && candidateRow.every(r => isPureBlank(r.text.trim()))
          if (!isPureBlankRow) break
          consumedRowIdxs.add(j)
          lastRowIdx = j
          j++
        }
        if (lastRowIdx > i) {
          // Top edge stays where the single-line box already put it; the
          // bottom edge drops to the last absorbed line, same -3 baseline
          // offset valueBoxFor itself uses so the two line up consistently.
          const topY = coords.y + coords.height
          const lastRow = rows[lastRowIdx]
          const bottomY = Math.min(...lastRow.map(r => r.pdfY)) - 3
          coords = { ...coords, y: bottomY, height: Math.max(VALUE_BOX_HEIGHT, topY - bottomY) }
          type = 'textarea'
        }
      }

      // Remember where each printed choice sits so the overlay ticks the
      // selected ones in place instead of writing a comma-separated list on
      // top of the form's own option text. When the form draws a tick box,
      // the mark goes inside it.
      if (isChoice && optionItems.length >= 2) {
        coords.optionMarks = optionItems.map(r => {
          const box = tickBoxNearText(r, geom.squares)
          return box
            ? { label: r.text.trim(), box: { x: box.x, y: box.y, width: box.w, height: box.h } }
            : { label: r.text.trim(), x: r.x, y: r.pdfY, height: Math.max(r.height, 8) }
        })
      }

      fields.push({
        id: `f_imported_${Date.now()}_${fields.length}`,
        label,
        type,
        required: owner === 'requester',
        owner,
        options: isChoice && optionItems.length >= 2
          ? optionItems.map(r => r.text.trim()).join(', ')
          : '',
        pdfCoords: coords,
      })
    }
  }

  // ── Fields from the form's empty drawn areas ───────────────────────────────
  // This is the general pass: whatever the layout, an empty box or an unused
  // rule on a blank form is somewhere a value goes. It names each one from the
  // form's own text, so it works on register logs, labelled forms and mixtures
  // alike without recognising any particular design.
  const regionFields = []

  geometry.forEach((geom, pageIdx) => {
    const items = pages[pageIdx] || []
    const sample = items[0]
    const regions = detectInputRegions(geom.rects || [], geom.hlines || [], items)
      .filter(r => !inRatingCell(pageIdx, r))
    if (!regions.length) return

    // Regions sharing a heading are rows of one column, so they are numbered
    // down the page ("Originator" 1..14) rather than left as duplicates.
    const named = regions.map(region => ({ region, label: labelForRegion(region, items) }))
    const columnCounts = new Map()
    for (const n of named) {
      if (n.label?.from !== 'above') continue
      const key = n.label.text.toLowerCase().trim()
      columnCounts.set(key, (columnCounts.get(key) || 0) + 1)
    }
    const rowSeen = new Map()

    named
      .sort((a, b) => b.region.y - a.region.y || a.region.x - b.region.x)
      .forEach(({ region, label }, idx) => {
        const caption = (label?.text || '').replace(/[:\s]+$/, '').replace(/\s+/g, ' ').trim()
        // The empty cell beside the letterhead's Code / Issue Date value (where the
        // logo sits) takes that value as its caption. It is printed on every form
        // and never filled in.
        if (/^FM-\d{3}-\d{2}$/i.test(caption) || /^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(caption)) return

        let name = caption || `Field ${idx + 1}`

        if (label?.from === 'above') {
          const key = label.text.toLowerCase().trim()
          if ((columnCounts.get(key) || 0) > 1) {
            const n = (rowSeen.get(key) || 0) + 1
            rowSeen.set(key, n)
            name = `Row ${n} — ${caption}`
          }
        }

        regionFields.push({
          id: `f_area_${pageIdx}_${idx}_${Date.now().toString(36)}`,
          label: name,
          // Headings are not sentences, so the label heuristics misread them
          // ("Document Name" as a person). Only shape and dates read reliably.
          type: /\bdate\b/i.test(caption) ? 'date'
            : region.h > LINE_TALL ? 'textarea'
            : 'text',
          required: false,
          owner: 'requester',
          options: '',
          pdfCoords: {
            page: pageIdx,
            x: region.x + 3,
            y: region.y + 2,
            width: Math.max(12, region.w - 6),
            height: Math.max(8, region.h - 4),
            pageWidth: sample?.pageWidth,
            pageHeight: sample?.pageHeight,
          },
        })
      })
  })

  // Both passes' results are kept — the drawn-area pass used to unconditionally
  // replace the label scan's entire result the moment it found anything at
  // all, on forms with no stroked geometry in the body (typed underscore
  // blanks, glyph checkboxes — a Word-exported form, not a drawn one) the only
  // thing with real vector geometry is often the letterhead's bordered table,
  // so that one unrelated hit would wipe out every field the label scan had
  // already found correctly. Label-scan fields are pushed first so the dedup
  // step below keeps that version whenever both passes land on the same box
  // (same label text) — the prior "merging produced two fields" problem it
  // was replaced to avoid — while a region the label scan never saw at all
  // still comes through.
  // Rating rows go where they fall on the page, not after everything else.
  // fields are in reading order here, so the first one that starts lower than
  // the grid is where it belongs.
  for (const g of ratingGrids) {
    const mine = ratingFields.filter(f => f.pdfCoords.page === g.page &&
      f.pdfCoords.y >= g.bottom - 2 && f.pdfCoords.y <= g.top)
    const at = fields.findIndex(f => {
      const c = f.pdfCoords || {}
      return c.page > g.page || (c.page === g.page && (c.y + (c.height || 0)) < g.bottom)
    })
    fields.splice(at < 0 ? fields.length : at, 0, ...mine)
  }
  for (const t of registerTables) {
    const mine = registerFields.filter(f => f.pdfCoords.page === t.page &&
      f.pdfCoords.y >= t.bottom - 2 && f.pdfCoords.y <= t.top)
    const at = fields.findIndex(f => {
      const c = f.pdfCoords || {}
      return c.page > t.page || (c.page === t.page && (c.y + (c.height || 0)) < t.bottom)
    })
    fields.splice(at < 0 ? fields.length : at, 0, ...mine)
  }
  fields.push(...regionFields)

  // Deduplicate by label (table structures repeat the same label text, and a
  // box both passes independently found carries the same label from each).
  const seen = new Set()
  const deduped = fields.filter(f => {
    const key = f.label.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Check if this is a known PTIS form (has hand-built fields + print layout)
  const fullText = allItems.map(i => i.text).join(' ')
  const matched = KNOWN_FORMS.find(f => f.pattern.test(fullText))
  const detectedFormCode = matched ? matched.code : null

  // Even for forms we don't have bespoke handling for, PTIS's own form
  // codes all follow "FM-###-##" — capture that generically so the generic
  // print layout can still show a proper Title/Code header instead of
  // leaving the Code blank.
  const anyCodeMatch = fullText.match(/FM-\d{3}-\d{2}/i)
  const detectedAnyCode = anyCodeMatch ? anyCodeMatch[0].toUpperCase() : null

  return {
    pages,
    // A real form definition beats anything inferred, so it wins outright.
    fields: acroFields.length ? acroFields : deduped,
    fieldSource: acroFields.length ? 'acroform' : 'detected',
    detectedFormCode,
    detectedAnyCode,
    allItems,
    geometry,
    hasAcroForm: acroFields.length > 0,
  }
}

// ── Coordinate enrichment for pre-defined seed fields ─────────────────────────
// When a recognized PTIS form is uploaded, seed fields don't have pdfCoords.
// This function matches each seed field label to the closest extracted text
// item and assigns coordinates so pdf-lib can overlay values on the original PDF.
// How closely a preset field's label must match printed text before its
// position is trusted. Exposed so it can be measured against real forms
// rather than picked by feel.
export const DEFAULT_MATCH_THRESHOLD = 0.5

export function enrichSeedFieldsWithCoords(
  seedFields, allItems, geometry = [], matchThreshold = DEFAULT_MATCH_THRESHOLD,
) {
  const norm = (s) => String(s)
    .toLowerCase()
    // Parenthetical text on a form is an instruction to the person filling it
    // in ("(to be filled in by the concerned functional head)"), not part of
    // the label. Left in, it dilutes the label so badly that a page heading
    // can out-match the label it actually belongs to.
    .replace(/\([^)]*\)?/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const toWords = (s) => norm(s).split(' ').filter(w => w.length > 2)

  // Digits carry the distinguishing information in repeated-row labels
  // ("Item 3 — Description"), so they are compared separately from words.
  const numbersIn = (s) => (String(s).match(/\d+/g) || [])

  const NO_MATCH = { score: 0, coverage: 0 }
  const scoreMatch = (fieldLabel, itemText) => {
    const fw = toWords(fieldLabel)
    const iw = toWords(itemText)
    if (!fw.length || !iw.length) return NO_MATCH

    // A row-numbered field must only ever match text carrying the same number.
    // Without this, all eight "Item N — Description" fields score a perfect
    // match against the single "Item Description" column header and stack on
    // top of each other, and "Item 1 — Date Issued" happily matches the
    // "Issue Date" in the page header.
    const fieldNums = numbersIn(fieldLabel)
    if (fieldNums.length) {
      const itemNums = numbersIn(itemText)
      if (!fieldNums.every(n => itemNums.includes(n))) return NO_MATCH
    }

    const overlap = fw.filter(w => iw.some(iw2 => iw2.includes(w) || w.includes(iw2))).length
    return {
      // How much of the field's label the printed text accounts for.
      score: overlap / fw.length,
      // How much of the printed text the field accounts for. Without this,
      // "Corrective Action" matches the page title "Corrective Action Request
      // Form" just as strongly as the real "Corrective Action:" label, and the
      // value can end up printed across the header.
      coverage: overlap / iw.length,
    }
  }

  const pageWidth = allItems[0]?.pageWidth || 595

  // ── Pass 1: numbered table cells ────────────────────────────────────────────
  // Their labels ("Item 3 — Description") have nothing to match in the page
  // text, so the drawn grid is the only thing that can place them — and it
  // needs no guessing at all.
  const out = seedFields.map(field => {
    if (field.pdfCoords) return { ...field }
    const cell = cellForSeriesField(field.label, geometry)
    if (!cell) return { ...field }
    const pg = allItems.find(it => it.page === cell.page)
    return {
      ...field,
      pdfCoords: { ...cell, pageWidth: pg?.pageWidth, pageHeight: pg?.pageHeight },
    }
  })

  // ── Pass 2: match remaining fields to printed labels ────────────────────────
  // Scored globally and assigned best-first, NOT field-by-field. Assigning in
  // field order lets an early field take a label that suits a later one far
  // better ("Target Date" grabbing "Reporting Date:"), and because each label
  // can only be used once that mistake then cascades down the whole form,
  // shifting every following value into the wrong row.
  const xRangeFor = (fieldId = '') => {
    // Section C of the CAR form is three side-by-side follow-up columns whose
    // printed labels are identical, so only x position tells them apart.
    if (/_fu1_/.test(fieldId)) return [0, pageWidth * 0.38]
    if (/_fu2_/.test(fieldId)) return [pageWidth * 0.38, pageWidth * 0.68]
    if (/_fu3_/.test(fieldId)) return [pageWidth * 0.68, pageWidth]
    return [0, pageWidth]
  }

  // Printed labels are short. Prose that merely mentions the same words — a
  // note like "Priority of Change Implementation ... can be interpreted as
  // follows:" on a later page — would otherwise score a full match and pull
  // the value onto the wrong page entirely.
  const MAX_LABEL_CHARS = 80

  const pairs = []
  for (const field of out) {
    if (field.pdfCoords) continue
    const [xMin, xMax] = xRangeFor(field.id)
    const fieldNorm = norm(field.label)
    for (const item of allItems) {
      if (item.x < xMin || item.x > xMax) continue
      if (item.text.length > MAX_LABEL_CHARS) continue
      const { score, coverage } = scoreMatch(field.label, item.text)
      // A weak match is worse than none: a value dropped somewhere plausible
      // but wrong is easy to miss, whereas an unplaced field is reported and
      // can be positioned in the editor.
      if (score >= matchThreshold) {
        pairs.push({ field, item, score, coverage, exact: norm(item.text) === fieldNorm })
      }
    }
  }
  // Best label match first; ties go to the printed text that the field
  // explains most fully, which is what keeps a heading from beating the
  // actual label it happens to contain.
  pairs.sort((a, b) =>
    b.score - a.score ||
    // An exact reading of the label beats a phrase that merely contains it:
    // "Change Requested By" must take "CHANGE REQUESTED BY:", not the equally
    // well-scoring "CHANGE REQUEST #:" heading a row above it.
    (b.exact ? 1 : 0) - (a.exact ? 1 : 0) ||
    b.coverage - a.coverage ||
    b.field.label.length - a.field.label.length)

  const takenFields = new Set()
  const takenItems = new Set()

  for (const { field, item } of pairs) {
    if (takenFields.has(field.id) || takenItems.has(item)) continue
    takenFields.add(field.id)
    takenItems.add(item)

    // Bound the box by the next text item to the right on the same line, so it
    // stops before the neighbouring column instead of running across it.
    const neighbour = allItems
      .filter(it =>
        it.page === item.page &&
        Math.abs(it.pdfY - item.pdfY) < 4 &&
        it.x > item.x + item.width)
      .sort((a, b) => a.x - b.x)[0]

    const geom = geometry[item.page] || {}
    const coords = valueBoxFor(item, geom, neighbour)

    // Choice fields get their printed tick boxes located so the overlay marks
    // them in place rather than writing the chosen text over the form.
    if (field.type === 'checkbox-group' || field.type === 'dropdown' || field.type === 'radio') {
      const marks = findOptionMarks(field.options, item, allItems, geom)
      if (marks) coords.optionMarks = marks
    }

    field.pdfCoords = coords
  }

  return out
}

/**
 * Locates one choice field's tick boxes on an already-open pdfjs page.
 *
 * Import-time detection only ever runs when a template is (re-)imported, so a
 * template saved before this could be improved had no way to pick up the fix
 * short of re-importing and losing every hand-made edit. This runs the same
 * detection against the template's own PDF for a single field, which is what
 * the "find ticks" action in the position editor calls.
 *
 * Returns the marks, or null when fewer than two options could be located.
 */
export async function detectOptionMarksOnPage(page, field, pageIndex = 0) {
  const geom = await extractPageGeometry(page, pdfjsLib.OPS)
  const content = await page.getTextContent()
  const items = content.items
    .filter(i => i.str && i.str.trim())
    .map(i => ({
      text: i.str,
      x: i.transform[4],
      pdfY: i.transform[5],
      width: i.width,
      height: i.height,
      page: pageIndex,
    }))

  const coords = field?.pdfCoords || {}
  const y = Number(coords.y ?? coords.pdfY)
  if (!Number.isFinite(y)) {
    // Nothing to search around: scan the page and take the first match of each
    // option, which is all an unplaced field can be given.
    const top = page.getViewport({ scale: 1 }).height
    return findOptionMarks(field?.options, { page: pageIndex, x: 0, pdfY: top }, items, geom,
      { depthBelow: Infinity })
  }

  // A field's box sits ON one of the option rows as often as above them (the
  // box for this form's "Type of non-conformance" is on the second row), so the
  // search reaches both ways around it and the closest match wins.
  const anchor = { page: pageIndex, x: Number(coords.x) || 0, pdfY: y }
  return findOptionMarks(field?.options, anchor, items, geom,
    { depthBelow: 90, depthAbove: 60, nearest: true })
}

/**
 * Converts a PDF File to a base64 string for storage alongside the template.
 */
export async function pdfToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
