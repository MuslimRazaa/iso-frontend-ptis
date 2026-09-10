import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'
import { getOfflineEntries } from '../utils/offlineStore'

const BRAND  = '#d7263d'
const INK    = '#14141c'
const MUTED  = '#7a7a8c'
const SUBTLE = '#9a9aaa'
const BORDER = '#ececf0'

const STATUS_COLORS = {
  pending:  { bg: '#fff7e6', color: '#b54708' },
  approved: { bg: '#e7f6ec', color: '#1a7f4e' },
  rejected: { bg: '#fdecea', color: '#b42318' },
}

const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span style={{
      display: 'inline-block', padding: '3px 11px', borderRadius: 999,
      fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
      background: s.bg, color: s.color,
    }}>{status || 'pending'}</span>
  )
}

const fmt = (n) => String(n ?? 0).padStart(2, '0')

function ISOFormsHome() {
  const location = useLocation()
  const isUser = location.pathname.startsWith('/user')
  const base = isUser ? '/user/iso-forms' : '/iso-forms'

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let active = true
    fetch(API_ENDPOINTS.ISO_FORMS_ENTRIES)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => {
        const rows = json?.data ?? json
        if (!Array.isArray(rows)) throw new Error('bad response')
        if (active) { setEntries(rows); setOffline(false) }
      })
      .catch(() => {
        // No backend yet — show whatever has been submitted into the local demo store.
        if (active) { setEntries(getOfflineEntries()); setOffline(true) }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const counts = useMemo(() => ({
    total:    entries.length,
    pending:  entries.filter(e => (e.status || 'pending') === 'pending').length,
    approved: entries.filter(e => e.status === 'approved').length,
    rejected: entries.filter(e => e.status === 'rejected').length,
  }), [entries])

  const recent = useMemo(() => (
    [...entries]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 8)
  ), [entries])

  const STAT_META = [
    { key: 'total',    label: 'Total Forms', status: null,       helper: 'All submissions', tone: '' },
    { key: 'pending',  label: 'Pending',     status: 'pending',  helper: 'Awaiting decision', tone: 'warning' },
    { key: 'approved', label: 'Approved',    status: 'approved', helper: 'Signed off',       tone: '' },
    { key: 'rejected', label: 'Rejected',    status: 'rejected', helper: 'Sent back',        tone: 'accent' },
  ]

  return (
    <div style={{ padding: 'clamp(24px, 4vw, 52px) clamp(24px, 5vw, 60px)', display: 'flex', flexDirection: 'column', gap: 36 }}>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #fff5f6 0%, #ffffff 60%)',
        border: `1px solid ${BORDER}`, borderRadius: 24,
        padding: 'clamp(28px, 4vw, 48px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 40, flexWrap: 'wrap', position: 'relative', overflow: 'hidden',
        boxShadow: '0 4px 32px rgba(215,38,61,0.06)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: BRAND, borderRadius: '24px 24px 0 0' }} />

        <div style={{ flex: '1 1 320px', position: 'relative' }}>
          <span style={{
            fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em',
            color: BRAND, padding: '3px 12px', borderRadius: 999,
            background: 'rgba(215,38,61,0.08)', border: '1px solid rgba(215,38,61,0.18)',
          }}>ISO Forms</span>
          <h1 style={{ margin: '14px 0 14px', fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 800, color: INK, lineHeight: 1.2 }}>
            Controlled Document<br /><span style={{ color: BRAND }}>Workflow</span>
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 15, color: '#595966', lineHeight: 1.75, maxWidth: 520 }}>
            Build any QA/QC form without writing code, submit it with supporting attachments,
            and route it to the right person for a single sign-off — approved or rejected.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to={`${base}/new`} style={{ textDecoration: 'none' }}>
              <button className="primary-btn">+ Fill a New Form</button>
            </Link>
            <Link to={`${base}/entries`} style={{ textDecoration: 'none' }}>
              <button className="ghost-btn">View All Forms</button>
            </Link>
          </div>
        </div>
      </div>

      {offline && (
        <div style={{ background: '#fff7e6', border: '1px solid #ffe1a8', color: '#92660a', borderRadius: 14, padding: '12px 16px', fontSize: 14 }}>
          Demo mode — the ISO Forms backend isn't connected yet, so templates and submissions below are saved in this browser only.
        </div>
      )}

      {/* ══ STATS ROW ════════════════════════════════════════ */}
      <div>
        <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: SUBTLE }}>Quick Stats</p>
        <section className="lms-stat-grid">
          {STAT_META.map(({ key, label, status, helper, tone }) => (
            <Link
              key={key}
              to={status ? `${base}/entries?status=${encodeURIComponent(status)}` : `${base}/entries`}
              title={`Open ${label} forms`}
              className={`stat-card ${tone || ''}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <p>{label}</p>
              <h3>{loading ? '—' : fmt(counts[key])}</h3>
              <span>{helper}</span>
            </Link>
          ))}
        </section>
      </div>

      {/* ══ RECENT ACTIVITY ══════════════════════════════════ */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: SUBTLE }}>Activity</p>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: INK }}>Recently Submitted</h2>
          </div>
          <Link to={`${base}/entries`} style={{ fontSize: 13, color: BRAND, fontWeight: 700, textDecoration: 'none' }}>View all →</Link>
        </div>

        <article className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 36, textAlign: 'center', color: MUTED }}>Loading…</div>
          ) : recent.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: MUTED }}>No forms submitted yet.</div>
          ) : (
            <div>
              {recent.map(entry => (
                <Link
                  key={entry.id}
                  to={`${base}/entries/${entry.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                    padding: '16px 22px', borderTop: `1px solid ${BORDER}`, textDecoration: 'none', color: 'inherit',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: INK, fontSize: 14 }}>{entry.template_name || `Form #${entry.id}`}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                      {(entry.created_by_name || entry.created_by || 'Someone')} created this, related to {entry.related_employee_name || entry.related_employee_id || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: SUBTLE }}>
                      {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}
                    </span>
                    <StatusBadge status={entry.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>
      </div>
    </div>
  )
}

export default ISOFormsHome
