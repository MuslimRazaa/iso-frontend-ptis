import { showToast } from '../../components/Toast'

// What a browser can show on its own, by file extension. A file served from the API
// host often arrives as a plain download (or with no type at all), so the type is
// set here instead of trusted from the server.
const VIEWABLE = {
  pdf: 'application/pdf',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  txt: 'text/plain', csv: 'text/plain', json: 'application/json',
}

const extensionOf = (name) => String(name || '').split('?')[0].split('.').pop().toLowerCase()

async function fetchBlob(href) {
  const res = await fetch(href)
  if (!res.ok) throw new Error('fetch failed')
  return res.blob()
}

function save(blob, name) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Saves the attachment to the computer. */
export async function downloadAttachment(href, name) {
  try {
    save(await fetchBlob(href), name)
  } catch {
    showToast('Could not download the attachment.', 'error')
  }
}

/**
 * Shows the attachment in a new tab. The tab is opened straight away (while the click
 * is still the click, so it is not blocked as a pop-up) and pointed at the file once
 * it has loaded. A file a browser cannot display (Word, Excel …) is saved instead, and
 * the person is told so.
 */
export async function viewAttachment(href, name) {
  const type = VIEWABLE[extensionOf(name)] || VIEWABLE[extensionOf(href)]
  if (!type) {
    await downloadAttachment(href, name)
    showToast('This type of file cannot be shown in the browser, so it was downloaded.', 'info')
    return
  }
  const tab = window.open('', '_blank')
  try {
    const blob = await fetchBlob(href)
    const url = URL.createObjectURL(new Blob([blob], { type }))
    if (tab) tab.location.href = url
    else window.location.href = url
    // Kept for a while: the tab reads it after this returns.
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000)
  } catch {
    if (tab) tab.close()
    showToast('Could not open the attachment.', 'error')
  }
}
