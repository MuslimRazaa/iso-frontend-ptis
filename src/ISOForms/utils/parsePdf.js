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
  if (/^(premier|ptis|fm-\d|issue\s|code\s|title\s|rev\s*\d|page\s*\d|the strongest link)/i.test(t)) return true
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

// ── Label detector ────────────────────────────────────────────────────────────
const isLabelLike = (text) => {
  const t = text.trim()
  if (!t || t.length > 90 || t.length < 3) return false
  if (t.endsWith(':')) return true
  if (t === t.toUpperCase() && t.length >= 4 && t.length <= 70 && /[A-Z]/.test(t)) return true
  if (/^[A-Z][a-z]/.test(t) && t.split(/\s+/).length <= 7 && !/[.?!]$/.test(t)) return true
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
      ? matches.sort((a, b) => distanceTo(a) - distanceTo(b))[0]
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

  // A PDF that already carries interactive form fields states every field's
  // name, type and exact rectangle, so nothing needs to be inferred. When one
  // does, that is authoritative and the text/geometry heuristics are skipped.
  const acroFields = await readAcroFormFields(acroBytes, { guessType, guessOwner })
  const rows = groupByRow(allItems)
  const fields = []
  let currentSectionOwner = 'requester'

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowFullText = row.map(r => r.text).join(' ')

    // Track which section we're in (requester vs approver)
    const sectionOwner = detectSectionOwner(rowFullText)
    if (sectionOwner) currentSectionOwner = sectionOwner

    // Every label in the row is a candidate, not just the leftmost — forms are
    // routinely two- or three-column ("Date of Issue: ___   NCR No: ___"), and
    // taking only row[0] silently dropped every right-hand field.
    // Later items must end with ':' to qualify, which distinguishes a real
    // second-column label from a checkbox option word sitting on the same line.
    const labelIdxs = row
      .map((item, idx) => ({ item, idx }))
      .filter(({ item, idx }) =>
        !isNoise(item.text) &&
        isLabelLike(item.text) &&
        (idx === 0 || item.text.trim().endsWith(':')))

    for (const { item: labelItem, idx } of labelIdxs) {
      // Clean label: strip trailing colon and parenthetical suffixes
      const label = labelItem.text.replace(/:$/, '').replace(/\s*\(.*?\)\s*$/, '').trim()
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
      const optionItems = between.filter(r => {
        const t = r.text.trim()
        return t && t.length < 40 && !t.endsWith(':') && !/^\d{1,2}[/-]/.test(t)
      })

      let type = guessType(label)
      // Two or more printed choices next to the label means it's a choice
      // field. guessType's "dropdown" wording wins (single-select labels like
      // Category/Priority/Status); anything else becomes a checkbox group.
      if (optionItems.length >= 2 && type !== 'dropdown') type = 'checkbox-group'

      const owner = guessOwner(label, currentSectionOwner)
      const isChoice = type === 'checkbox-group' || type === 'dropdown'

      const geom = geometry[labelItem.page] || {}
      const coords = valueBoxFor(labelItem, geom, row[nextLabelIdx])

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

  // The drawn-area pass is the more reliable of the two, so when it finds
  // anything it supersedes the label scan rather than being merged with it —
  // merging produced two fields for every labelled box.
  if (regionFields.length) {
    fields.length = 0
    fields.push(...regionFields)
  }

  // Deduplicate by label (table structures repeat the same label text)
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
    if (field.type === 'checkbox-group' || field.type === 'dropdown') {
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
