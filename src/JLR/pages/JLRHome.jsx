import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BsCalendar2Date, BsClipboardData } from "react-icons/bs"
import { LuUserRoundCheck } from "react-icons/lu"
import { IoStatsChartSharp, IoMapOutline } from "react-icons/io5"
import { MdOutlineHealthAndSafety } from "react-icons/md"
import { TiPinOutline } from "react-icons/ti"
import { API_ENDPOINTS } from '../../config/api'

/* ── Consistent, professional palette (brand-led, no mixed colors) ── */
const BRAND   = '#d7263d'
const INK     = '#14141c'
const MUTED   = '#7a7a8c'
const SUBTLE  = '#9a9aaa'
const BORDER  = '#ececf0'
const TILE_BG = '#fdf2f3'   // soft brand tint used for every icon tile

/* ── Stat cards (values filled dynamically from the Job Log API) ── */
// `status` is what the entries page filters by when a card is opened. It is
// the wording the register itself uses, except for Pending, which also covers
// rows whose status was never set — the same rows this card counts.
const STAT_META = [
  { key: 'total',      label: 'Total Jobs',  status: 'all',         helper: 'All entries',       tone: '' },
  { key: 'closed',     label: 'Closed',      status: 'closed',      helper: 'Completed jobs',    tone: '' },
  { key: 'inProgress', label: 'In Progress', status: 'in_progress', helper: 'Currently active',  tone: '' },
  { key: 'pending',    label: 'Pending',     status: 'pending',     helper: 'Needs action',      tone: 'warning' },
]

/* ── Module capability cards ─────────────────────────────── */
const FEATURES = [
  { Icon: BsCalendar2Date,         title: 'Job Scheduling',      desc: 'Track start / end dates, entry dates, and submission timelines for every inspection job.' },
  { Icon: LuUserRoundCheck,        title: 'Inspector Management', desc: 'Record inspector names, team compositions, and vehicle assignments per deployment.' },
  { Icon: IoStatsChartSharp,       title: 'Operational Metrics',  desc: 'Monitor man-power, man-hours, driven KMs, and calculated days per engagement.' },
  { Icon: MdOutlineHealthAndSafety,title: 'Safety Documentation', desc: 'Track JMPs, TRA, Equipment Checklists, Vehicle Logs, and TBT completion status.' },
  { Icon: TiPinOutline,            title: 'Multi-Dept Sign-off',  desc: 'Monitor REPT, EXP, ISO, Accounts, and I.T sign-off for end-to-end job closure.' },
]

const fmt = (n) => String(n ?? 0).padStart(2, '0')

function JLRHome() {
  const location = useLocation()
  const isUser = location?.pathname === '/user/job-log'

  // Keep every link inside the correct space so a user is never sent to admin.
  const base = isUser ? '/user/job-log' : '/job-log'

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(API_ENDPOINTS.JOB_LOG)
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        // API may return a bare array or { data: [...] }
        const rows = json?.data ?? json
        if (active) setEntries(Array.isArray(rows) ? rows : [])
      })
      .catch(() => { if (active) setEntries([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  // Counts derived live from the Job Log entries
  const counts = useMemo(() => {
    const norm = (s) => (s || '').toString().toLowerCase()
    return {
      total:      entries.length,
      closed:     entries.filter(e => norm(e.status) === 'closed').length,
      inProgress: entries.filter(e => norm(e.status) === 'in progress').length,
      pending:    entries.filter(e => ['pending', ''].includes(norm(e.status))).length,
    }
  }, [entries])

  const heroPills = [
    { label: 'Total Entries', value: counts.total },
    { label: 'Jobs Closed',   value: counts.closed },
    { label: 'In Progress',   value: counts.inProgress },
  ]

  return (
    <div style={{
      padding: 'clamp(24px, 4vw, 52px) clamp(24px, 5vw, 60px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 44,
    }}>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #fff5f6 0%, #ffffff 60%)',
        border: `1px solid ${BORDER}`,
        borderRadius: 24,
        padding: 'clamp(28px, 4vw, 48px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 40,
        flexWrap: 'wrap',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 32px rgba(215,38,61,0.06)',
      }}>
        {/* Top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: BRAND,
          borderRadius: '24px 24px 0 0',
        }} />
        {/* Background decoration */}
        <div style={{
          position: 'absolute', right: -60, top: -60,
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(215,38,61,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Left: text */}
        <div style={{ flex: '1 1 320px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{
              fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em',
              color: BRAND, padding: '3px 12px', borderRadius: 999,
              background: 'rgba(215,38,61,0.08)', border: '1px solid rgba(215,38,61,0.18)',
            }}>
              Job Log Description
            </span>
          </div>
          <h1 style={{
            margin: '0 0 14px',
            fontSize: 'clamp(26px, 3vw, 38px)',
            fontWeight: 800, color: INK, lineHeight: 1.2,
          }}>
            Inspection Activity<br />
            <span style={{ color: BRAND }}>Tracker</span>
          </h1>
          <p style={{
            margin: '0 0 32px', fontSize: 15, color: '#595966',
            lineHeight: 1.75, maxWidth: 520,
          }}>
            A centralised log for all field inspection jobs — track personnel, vehicles,
            safety documentation, operational metrics, and multi-department sign-off
            from one unified workspace.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to={`${base}/entries`} style={{ textDecoration: 'none' }}>
              <button className="primary-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                <BsClipboardData /> Open Job Log
              </button>
            </Link>
            {/* User stays in the user space; admin goes to the admin dashboard */}
            <Link to={isUser ? '/user/dashboard' : '/dashboard'} style={{ textDecoration: 'none' }}>
              <button className="ghost-btn" style={{ fontSize: 14 }}>
                ← {isUser ? 'My Dashboard' : 'Dashboard'}
              </button>
            </Link>
          </div>
        </div>

        {/* Right: live status pills */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          flex: '0 0 auto', position: 'relative',
        }}>
          {heroPills.map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 20px', borderRadius: 14,
              background: '#ffffff', border: `1px solid ${BORDER}`,
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              minWidth: 200,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: BRAND, flexShrink: 0,
                boxShadow: '0 0 0 3px rgba(215,38,61,0.12)',
              }} />
              <span style={{ fontSize: 13, color: MUTED, flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: INK }}>
                {loading ? '—' : fmt(s.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ STATS ROW ════════════════════════════════════════ */}
      <div>
        <p style={{
          margin: '0 0 16px', fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.15em', color: SUBTLE,
        }}>Quick Stats</p>
        <section className="lms-stat-grid">
          {STAT_META.map(({ key, label, status, helper, tone }) => (
            <Link
              key={key}
              to={`${base}/entries?status=${encodeURIComponent(status)}`}
              title={`Open the job log filtered to ${label}`}
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

      {/* ══ FEATURES GRID ════════════════════════════════════ */}
      <div>
        <div style={{ marginBottom: 20 }}>
          <p style={{
            margin: '0 0 6px', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.15em', color: SUBTLE,
          }}>Module Capabilities</p>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: INK }}>
            What JLR Tracks
          </h2>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
          gap: 16,
        }}>
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} style={{
              background: '#ffffff',
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              padding: '24px 26px',
              transition: 'all 0.22s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              cursor: 'default',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(215,38,61,0.35)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.09)'
                e.currentTarget.style.transform = 'translateY(-3px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = BORDER
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                e.currentTarget.style.transform = ''
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 13,
                background: TILE_BG, color: BRAND,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginBottom: 16,
              }}><Icon /></div>
              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: INK }}>
                {title}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.65 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ CTA STRIP ════════════════════════════════════════ */}
      <div style={{
        background: BRAND,
        borderRadius: 20,
        padding: 'clamp(24px, 3vw, 36px) clamp(28px, 4vw, 48px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 24,
        flexWrap: 'wrap',
        boxShadow: '0 12px 40px rgba(215,38,61,0.25)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -30, top: -30, width: 180, height: 180,
          borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', right: 60, bottom: -40, width: 120, height: 120,
          borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#fff' }}>
            Ready to log a new inspection job?
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
            Open the Job Log, add an entry, and track it through to full closure.
          </p>
        </div>
        <Link to={`${base}/entries`} style={{ textDecoration: 'none', position: 'relative' }}>
          <button style={{
            padding: '13px 30px',
            background: '#ffffff',
            color: BRAND,
            border: 'none',
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.22)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = ''
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.18)'
            }}
          >
            <BsClipboardData /> Open Job Log →
          </button>
        </Link>
      </div>

    </div>
  )
}

export default JLRHome
