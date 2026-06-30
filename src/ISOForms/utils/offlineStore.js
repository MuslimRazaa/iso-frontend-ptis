// Lightweight localStorage-backed fallback so the ISO Forms module is fully
// clickable (create template, fill, submit, approve/reject) before the real
// backend endpoints exist. Every page tries the real API first; on failure
// it falls back to these helpers instead of just showing an error.

const TEMPLATES_KEY    = 'isoFormsOfflineTemplates'
const ENTRIES_KEY      = 'isoFormsOfflineEntries'
const SEED_VERSION_KEY = 'isoFormsOfflineSeedVersion'

const read  = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded (large attachment data URLs) — drop attachment content
    // rather than losing the whole submission/decision.
    const stripped = value.map(row => (
      row.attachments
        ? { ...row, attachments: row.attachments.replace(/"data_url":"[^"]*"/g, '"data_url":null') }
        : row
    ))
    localStorage.setItem(key, JSON.stringify(stripped))
  }
}

export const getOfflineTemplates = () => read(TEMPLATES_KEY)
export const getOfflineTemplate  = (id) => read(TEMPLATES_KEY).find(t => String(t.id) === String(id))
export const addOfflineTemplate  = (template) => {
  const templates = read(TEMPLATES_KEY)
  templates.push(template)
  write(TEMPLATES_KEY, templates)
  return template
}
export const updateOfflineTemplate = (id, patch) =>
  write(TEMPLATES_KEY, read(TEMPLATES_KEY).map(t => (String(t.id) === String(id) ? { ...t, ...patch } : t)))
export const deleteOfflineTemplate = (id) =>
  write(TEMPLATES_KEY, read(TEMPLATES_KEY).filter(t => String(t.id) !== String(id)))

export const getOfflineEntries = () => read(ENTRIES_KEY)
export const getOfflineEntry   = (id) => read(ENTRIES_KEY).find(e => String(e.id) === String(id))
export const addOfflineEntry   = (entry) => {
  const entries = read(ENTRIES_KEY)
  entries.push(entry)
  write(ENTRIES_KEY, entries)
  return entry
}
export const updateOfflineEntry = (id, patch) =>
  write(ENTRIES_KEY, read(ENTRIES_KEY).map(e => (String(e.id) === String(id) ? { ...e, ...patch } : e)))

// Seeds one real PTIS form (FM-001-04) the first time the module is opened
// without a backend, so there's something concrete to click through.
// Re-applies (replacing only the seed templates, by id) whenever `version`
// changes, so edits to seedTemplates.js aren't masked by a stale browser
// cache from an earlier visit — without touching any templates the admin
// created themselves.
export const ensureSeeded = (seedTemplates, version) => {
  if (localStorage.getItem(SEED_VERSION_KEY) === String(version)) return
  const seedIds = new Set(seedTemplates.map(t => t.id))
  const userCreated = read(TEMPLATES_KEY).filter(t => !seedIds.has(t.id))
  write(TEMPLATES_KEY, [...userCreated, ...seedTemplates])
  localStorage.setItem(SEED_VERSION_KEY, String(version))
}
