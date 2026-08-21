/**
 * Decodes a stored base64 PDF into bytes.
 *
 * Deliberately standalone: the download path (fillOriginalPdf) needs this but
 * must NOT pull in pdfjs. Only the on-screen page renderer needs pdfjs, and
 * dragging its worker into every download would load megabytes for nothing.
 */
export function base64ToBytes(base64) {
  const clean = String(base64 || '').replace(/^data:[^,]+,/, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
