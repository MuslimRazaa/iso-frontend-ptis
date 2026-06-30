// Converts a File to a base64 data: URL so attachments can actually be
// opened/viewed in demo mode (no backend to store the real file on disk).
// Capped so a handful of attachments don't blow past localStorage's ~5-10MB
// per-origin quota — larger files are still recorded by name, just without
// a working preview link until the real backend exists.
const MAX_INLINE_BYTES = 4 * 1024 * 1024 // 4MB

export function fileToDataUrl(file) {
  if (!file || file.size > MAX_INLINE_BYTES) return Promise.resolve(null)
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}
