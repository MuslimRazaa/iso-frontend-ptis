// Talks to the spell-check worker. The worker is created on the first check, not when the
// page loads, so nothing is downloaded or started until someone types into a text box.

let worker = null
let nextId = 0
const waiting = new Map()

const getWorker = () => {
  if (worker) return worker
  worker = new Worker(new URL('./spellWorker.js', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }) => {
    const done = waiting.get(data.id)
    if (done) { waiting.delete(data.id); done(data.issues) }
  }
  worker.onerror = () => {
    // A worker that cannot start (old browser): answer everything with "no issues" and stop trying.
    waiting.forEach(done => done([]))
    waiting.clear()
    worker = { postMessage: ({ id }) => Promise.resolve().then(() => { waiting.get(id)?.([]); waiting.delete(id) }) }
  }
  return worker
}

/** Misspelled words in `text`: [{ word, start, end, suggestions }]. */
export const checkSpelling = (text) => new Promise((resolve) => {
  const id = ++nextId
  waiting.set(id, resolve)
  getWorker().postMessage({ id, text, base: import.meta.env.BASE_URL })
})
