import * as pdfjsLib from 'pdfjs-dist'
// Vite's `?worker&inline` suffix bundles the worker as a base64 data URL
// directly inside the built JS — no separate .mjs file is ever fetched over
// the network, so it can't be broken by a host serving the wrong (or no)
// Content-Type for .mjs files, and there's no manual blob/Worker plumbing
// that can silently hang.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&inline'

// Configured once for the whole ISO Forms module. Both the field extractor
// (parsePdf.js) and the position editor go through this file so there is a
// single worker setup to keep working.
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker()

import { base64ToBytes } from './base64'

export { pdfjsLib }

/**
 * Opens a base64 PDF for rendering. The caller owns the returned document and
 * should call `.destroy()` when finished.
 *
 * pdfjs takes ownership of (and detaches) the buffer it is handed, so a fresh
 * copy is passed every time — reusing one array across calls yields an empty
 * second render.
 */
export async function loadPdfDocument(base64) {
  const bytes = base64ToBytes(base64)
  return pdfjsLib.getDocument({ data: bytes }).promise
}

/**
 * Renders one page of an already-opened pdfjs document into a canvas.
 *
 * This is display-only: it exists so the admin can see the real form while
 * placing fields. Nothing here ever feeds the generated PDF — the download
 * path draws onto the untouched original bytes, never onto a rasterised page.
 *
 * Returns the pdfjs viewport (needed for pixel↔point conversion) plus the
 * page's true size in PDF points.
 */
export async function renderPageToCanvas(pdfDoc, pageNumber, canvas, scale = 1.5) {
  const page = await pdfDoc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const unscaled = page.getViewport({ scale: 1 })

  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.floor(viewport.width * ratio)
  canvas.height = Math.floor(viewport.height * ratio)
  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = `${Math.floor(viewport.height)}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not acquire 2D canvas context')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

  await page.render({ canvasContext: ctx, viewport }).promise

  return {
    viewport,
    pageSize: { width: unscaled.width, height: unscaled.height },
  }
}
