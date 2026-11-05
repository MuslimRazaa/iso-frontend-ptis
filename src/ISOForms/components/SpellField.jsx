import React, { useEffect, useRef, useState } from 'react'
import { checkSpelling } from '../utils/spellCheck'

// A text box (or textarea) that offers corrections. Misspelled words are found a moment after
// typing stops, by a worker, so typing is never held up. Nothing is changed unless the person
// picks a suggestion: a controlled form is full of names and codes that must stay as typed.
// The little button and its list float over the page, so the form does not shift when they appear.

const PAUSE_MS = 700

function SpellField({ as: Tag = 'input', value, onChange, ...rest }) {
  const [issues, setIssues] = useState([])
  const [open, setOpen] = useState(false)
  const timer = useRef(null)
  const latest = useRef('')
  const ignored = useRef(new Set())

  const text = typeof value === 'string' ? value : ''
  latest.current = text

  const schedule = (next) => {
    clearTimeout(timer.current)
    // An ignored word stops being ignored the moment it is no longer in the box — right here,
    // not after the next check, because an emptied box never gets one.
    const lower = (next || '').toLowerCase()
    for (const w of [...ignored.current]) if (!lower.includes(w)) ignored.current.delete(w)
    if (!next || next.trim().length < 3) { setIssues([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      const found = await checkSpelling(next)
      if (latest.current !== next) return // typed on since: a newer check is on its way
      // "Ignore" holds only while the word is still in the box. Take it out and the choice is
      // forgotten, so a word ignored by mistake is flagged again the next time it is typed.
      const present = new Set(found.map(i => i.word.toLowerCase()))
      for (const w of [...ignored.current]) if (!present.has(w)) ignored.current.delete(w)
      setIssues(found.filter(i => !ignored.current.has(i.word.toLowerCase())))
    }, PAUSE_MS)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  const replace = (issue, replacement) => {
    const at = latest.current.slice(issue.start, issue.end) === issue.word
      ? issue.start
      : latest.current.indexOf(issue.word)
    if (at < 0) return
    const next = latest.current.slice(0, at) + replacement + latest.current.slice(at + issue.word.length)
    onChange(next)
    schedule(next)
  }

  const ignore = (issue) => {
    ignored.current.add(issue.word.toLowerCase())
    setIssues(list => list.filter(i => i.word.toLowerCase() !== issue.word.toLowerCase()))
  }

  // One row per distinct word, however often it appears.
  const distinct = issues.filter((i, n) => issues.findIndex(j => j.word === i.word) === n)

  return (
    <div style={{ position: 'relative' }}>
      <Tag
        {...rest}
        value={value ?? ''}
        onChange={(e) => { onChange(e.target.value); schedule(e.target.value) }}
        onFocus={(e) => { rest.onFocus?.(e); if (!issues.length) schedule(latest.current) }}
        // Room at the right for the button, so it never sits on the text.
        style={distinct.length ? { ...rest.style, paddingRight: 104 } : rest.style}
      />
      {distinct.length > 0 && (
        <>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpen(o => !o)}
            title="Possible spelling mistakes"
            style={{ position: 'absolute', right: 8, top: Tag === 'textarea' ? 8 : '50%', transform: Tag === 'textarea' ? 'none' : 'translateY(-50%)', zIndex: 5, border: '1px solid #f0c36d', background: '#fff8e6', color: '#8a5a00', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '1px 8px', cursor: 'pointer' }}
          >
            ✎ {distinct.length} spelling
          </button>
          {open && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, zIndex: 30, minWidth: 220, maxWidth: 320, background: '#fff', border: '1px solid #d9d9e0', borderRadius: 10, boxShadow: '0 8px 24px rgba(20,20,28,0.14)', padding: 8, fontSize: 13 }}
            >
              {distinct.map(issue => (
                <div key={issue.word} style={{ padding: '6px 4px', borderBottom: '1px solid #f0f0f4' }}>
                  <div style={{ fontWeight: 700, color: '#b42318', marginBottom: 4 }}>{issue.word}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {issue.suggestions.length === 0 && <span style={{ color: '#7a7a8c' }}>No suggestions</span>}
                    {issue.suggestions.map(s => (
                      <button key={s} type="button" onClick={() => replace(issue, s)}
                        style={{ border: '1px solid #d9d9e0', background: '#f4f7ff', borderRadius: 6, padding: '2px 8px', fontSize: 13, cursor: 'pointer' }}>
                        {s}
                      </button>
                    ))}
                    <button type="button" onClick={() => ignore(issue)}
                      style={{ border: 'none', background: 'transparent', color: '#7a7a8c', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SpellField
