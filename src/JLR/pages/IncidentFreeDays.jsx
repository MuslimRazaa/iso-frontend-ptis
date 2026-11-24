import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdOutlineHealthAndSafety } from 'react-icons/md'
import { BsChevronDown, BsBoxArrowUpRight } from 'react-icons/bs'
import { API_ENDPOINTS } from '../../config/api'
import { formatDate } from '../../utils/dateFormat'

// "Days without incident": counted by the server from the last incident (or from when the record began), so
// it goes up by itself every day. Nothing is reported here: every Incident Investigation Report made in ISO
// Forms restarts it, and the log below is those reports.

const GREEN = '#1d814c'
const GREEN_DARK = '#14633a'
const GREEN_SOFT = '#eaf6ef'
const GREEN_LINE = '#cfe8da'
const BRAND = '#d7263d'
const INK = '#14141c'
const MUTED = '#6b6b7a'
const SUBTLE = '#9a9aaa'
const BORDER = '#ececf0'

// Counts up to the number on arrival (not for people who ask for less motion).
function useCountUp(target, ms = 900) {
  const [n, setN] = useState(target)
  const raf = useRef(0)
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !Number.isFinite(target) || target <= 0) { setN(target); return undefined }
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / ms)
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, ms])
  return n
}

export default function IncidentFreeDays({ isUserSide }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [showLog, setShowLog] = useState(false)

  const load = useCallback(() => (
    fetch(`${API_ENDPOINTS.JOB_LOG}/safety/incident-free`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Server error ${r.status}`))))
      .then(j => { setData(j); setError('') })
      .catch(e => setError(e.message))
  ), [])

  useEffect(() => {
    load()
    const t = setInterval(load, 5 * 60 * 1000)   // keeps the number right when the page stays open past midnight
    return () => clearInterval(t)
  }, [load])

  // Where a report opens in ISO Forms (the admin side or the user side).
  const formUrl = (id) => `${isUserSide ? '/user/iso-forms' : '/iso-forms'}/entries/${id}`

  const days = data ? data.days : 0
  const shown = useCountUp(days)

  const m = data?.milestone
  const last = data?.lastIncident
  const fact = { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 150 }
  const factLabel = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: SUBTLE }
  const factValue = { fontSize: 17, fontWeight: 800, color: INK }

  return (
    <section style={{
      position: 'relative', overflow: 'hidden', borderRadius: 24, border: `1px solid ${GREEN_LINE}`,
      background: 'linear-gradient(135deg, #f0faf4 0%, #ffffff 62%)', boxShadow: '0 4px 32px rgba(29,129,76,0.08)',
      padding: 'clamp(24px, 3.4vw, 40px)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: GREEN }} />
      <div style={{ position: 'absolute', right: -70, top: -70, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,129,76,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px, 4vw, 56px)', alignItems: 'center', position: 'relative' }}>
        {/* The number */}
        <div style={{ flex: '1 1 280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: GREEN_SOFT, color: GREEN, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>
              <MdOutlineHealthAndSafety />
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: GREEN }}>Days Without Incident</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'clamp(64px, 9vw, 112px)', fontWeight: 800, lineHeight: 1, color: GREEN_DARK, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {data ? shown.toLocaleString('en-US') : '—'}
            </span>
            <span style={{ fontSize: 'clamp(16px, 1.8vw, 22px)', fontWeight: 600, color: MUTED }}>{days === 1 ? 'day' : 'days'}</span>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 14, color: MUTED }}>
            {data ? (days > 0 ? <>Safe working since <strong style={{ color: INK }}>{formatDate(data.runStart)}</strong></> : 'An incident was recorded today — the count starts again.') : ' '}
          </p>
        </div>

        {/* The facts */}
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 36px' }}>
            <div style={fact}>
              <span style={factLabel}>Record</span>
              <span style={factValue}>{data ? `${data.record.toLocaleString('en-US')} days` : '—'}{data?.isRecord && data.record > 0 && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color: GREEN, background: GREEN_SOFT, padding: '2px 8px', borderRadius: 999, verticalAlign: 'middle' }}>Current</span>}</span>
            </div>
            <div style={fact}>
              <span style={factLabel}>Last incident</span>
              <span style={factValue}>{last ? formatDate(last.incident_date) : 'None recorded'}</span>
              {last && <span style={{ fontSize: 12, color: MUTED }}>{last.category}</span>}
            </div>
          </div>

          {m && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 7 }}>
                <span style={{ color: MUTED }}>Next milestone · <strong style={{ color: INK }}>{m.target.toLocaleString('en-US')} days</strong></span>
                <span style={{ color: GREEN, fontWeight: 700 }}>{m.remaining.toLocaleString('en-US')} to go</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: '#e3efe8', overflow: 'hidden' }} role="progressbar" aria-valuemin={0} aria-valuemax={m.target} aria-valuenow={days}>
                <div style={{ height: '100%', width: `${Math.round(m.progress * 100)}%`, borderRadius: 999, background: `linear-gradient(90deg, ${GREEN} 0%, #3aa56d 100%)`, transition: 'width 0.9s ease' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {data && data.total > 0 && (
              <button type="button" onClick={() => setShowLog(s => !s)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 4px', border: 'none', background: 'none', color: MUTED, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>
                Incident log ({data.total}) <BsChevronDown style={{ transition: 'transform 0.2s', transform: showLog ? 'rotate(180deg)' : 'none' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p style={{ margin: '14px 0 0', color: BRAND, fontSize: 13 }}>Could not load the incident count: {error}</p>}

      {showLog && data && (
        <div style={{ marginTop: 22, borderTop: `1px solid ${GREEN_LINE}`, paddingTop: 16, position: 'relative' }}>
          {data.incidents.map(inc => (
            <div key={inc.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ minWidth: 92, fontWeight: 700, color: INK, fontSize: 13.5 }}>{formatDate(inc.incident_date)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: INK }}>
                  <strong>{inc.category}</strong>
                  {inc.report_no ? <span style={{ color: MUTED }}> · Report {inc.report_no}</span> : null}
                </div>
                {inc.description && <div style={{ fontSize: 13, color: MUTED, marginTop: 2, whiteSpace: 'pre-wrap' }}>{inc.description.length > 220 ? `${inc.description.slice(0, 220)}…` : inc.description}</div>}
                {inc.reported_by && <div style={{ fontSize: 11.5, color: SUBTLE, marginTop: 3 }}>Reported by {inc.reported_by}</div>}
              </div>
              <Link to={formUrl(inc.id)} title="Open this report in ISO Forms" style={{ color: GREEN, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                Open <BsBoxArrowUpRight />
              </Link>
            </div>
          ))}
          {data.total > data.incidents.length && <p style={{ margin: '10px 0 0', fontSize: 12, color: SUBTLE }}>Showing the latest {data.incidents.length} of {data.total}.</p>}
        </div>
      )}

    </section>
  )
}
