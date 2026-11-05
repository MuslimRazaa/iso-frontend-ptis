import nspell from 'nspell'

// Spell checking runs here, off the page's thread: reading the dictionary takes a good
// fraction of a second, and doing that where the form is drawn would freeze typing.
// The dictionary is fetched on the first request only, so a form nobody types into never
// downloads it.

let speller = null
let loading = null
const suggestCache = new Map()

const load = (base) => {
  if (!loading) {
    loading = Promise.all([
      fetch(`${base}dict/en.aff`).then(r => (r.ok ? r.text() : Promise.reject(new Error('aff')))),
      fetch(`${base}dict/en.dic`).then(r => (r.ok ? r.text() : Promise.reject(new Error('dic')))),
    ]).then(([aff, dic]) => { speller = nspell(aff, dic) })
  }
  return loading
}

// Chunks that are not ordinary words: codes, numbers, e-mails, paths, acronyms. A form is full
// of them (serial numbers, complaint numbers, "KHI PTIS"), and they must not be "corrected".
const skipChunk = (chunk) => /[0-9@_/\\#]/.test(chunk) || /\w\.\w/.test(chunk)
const isAcronym = (w) => w === w.toUpperCase()
const isMixedCase = (w) => /[a-z][A-Z]/.test(w)

const findIssues = (text) => {
  const issues = []
  const chunks = /\S+/g
  let m
  while ((m = chunks.exec(text))) {
    if (skipChunk(m[0])) continue
    const parts = /[A-Za-z]+(?:['’][A-Za-z]+)*/g
    let p
    while ((p = parts.exec(m[0]))) {
      const word = p[0]
      if (word.length < 3 || isAcronym(word) || isMixedCase(word)) continue
      if (speller.correct(word)) continue
      let suggestions = suggestCache.get(word)
      if (!suggestions) {
        suggestions = speller.suggest(word).slice(0, 5)
        suggestCache.set(word, suggestions)
      }
      const start = m.index + p.index
      issues.push({ word, start, end: start + word.length, suggestions })
    }
  }
  return issues
}

self.onmessage = async ({ data }) => {
  const { id, text, base } = data
  try {
    await load(base)
    self.postMessage({ id, issues: findIssues(String(text || '')) })
  } catch {
    // No dictionary (offline, blocked): the form simply goes without suggestions.
    loading = null
    self.postMessage({ id, issues: [] })
  }
}
