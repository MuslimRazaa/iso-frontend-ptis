import React from 'react'
import { Link } from 'react-router-dom'

/* ── Static overview stats (will come from API in future) ── */
const STATS = [
  { label: 'Total Jobs',   value: '02', icon: '📋', accent: '#2f74bf', bg: '#f0f7ff', border: '#d4e6f7' },
  { label: 'Closed',       value: '01', icon: '✓',  accent: '#1d814c', bg: '#e8fff3', border: '#c3ecd4' },
  { label: 'In Progress',  value: '01', icon: '◐',  accent: '#c87e1c', bg: '#fff8ef', border: '#ffe4c4' },
  { label: 'Pending',      value: '00', icon: '◌',  accent: '#7a7a8c', bg: '#f4f4f7', border: '#dcdce3' },
]

/* ── Module capability cards ─────────────────────────────── */
const FEATURES = [
  {
    icon: '🗓️',
    title: 'Job Scheduling',
    desc: 'Track start / end dates, entry dates, and submission timelines for every inspection job.',
    accent: '#2f74bf',
    bg: '#f0f7ff',
    border: '#d4e6f7',
  },
  {
    icon: '👷',
    title: 'Inspector Management',
    desc: 'Record inspector names, team compositions, and vehicle assignments per deployment.',
    accent: '#7c3aed',
    bg: '#fdf5ff',
    border: '#ddb8f7',
  },
  {
    icon: '📊',
    title: 'Operational Metrics',
    desc: 'Monitor man-power, man-hours, driven KMs, and calculated days per engagement.',
    accent: '#1d814c',
    bg: '#f0fff8',
    border: '#c3ecd4',
  },
  {
    icon: '🛡️',
    title: 'Safety Documentation',
    desc: 'Track JMPs, TRA, Equipment Checklists, Vehicle Logs, and TBT completion status.',
    accent: '#c87e1c',
    bg: '#fff8ef',
    border: '#ffe4c4',
  },
  {
    icon: '📌',
    title: 'Multi-Dept Sign-off',
    desc: 'Monitor REPT, EXP, ISO, Accounts, and I.T sign-off for end-to-end job closure.',
    accent: '#d7263d',
    bg: '#fff5f6',
    border: '#ffd1d8',
  },
  {
    icon: '🗺️',
    title: 'Regional Coverage',
    desc: 'Filter and report by region — Islamabad, Karachi, and other field office locations.',
    accent: '#595966',
    bg: '#f7f7f9',
    border: '#e0e0e6',
  },
]

function JLRHome() {
  return (
    <div style={{
      padding: 'clamp(24px, 4vw, 52px) clamp(24px, 5vw, 60px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 44,
    }}>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #fff5f6 0%, #ffffff 55%, #fffaf0 100%)',
        border: '1px solid #ffe4e8',
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
          background: 'linear-gradient(90deg, #d7263d 0%, #ff6b6b 60%, #ffba4c 100%)',
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
              color: '#d7263d', padding: '3px 12px', borderRadius: 999,
              background: 'rgba(215,38,61,0.08)', border: '1px solid rgba(215,38,61,0.18)',
            }}>
              Job Log Description
            </span>
          </div>
          <h1 style={{
            margin: '0 0 14px',
            fontSize: 'clamp(26px, 3vw, 38px)',
            fontWeight: 800, color: '#14141c', lineHeight: 1.2,
          }}>
            Inspection Activity<br />
            <span style={{ color: '#d7263d' }}>Tracker</span>
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
            <Link to="/job-log/entries" style={{ textDecoration: 'none' }}>
              <button className="primary-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                <span>📋</span> Open Job Log
              </button>
            </Link>
            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
              <button className="ghost-btn" style={{ fontSize: 14 }}>
                ← Dashboard
              </button>
            </Link>
          </div>
        </div>

        {/* Right: live status pills */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          flex: '0 0 auto', position: 'relative',
        }}>
          {[
            { label: 'Total Entries', value: '02', color: '#2f74bf', bg: '#f0f7ff' },
            { label: 'Jobs Closed',   value: '01', color: '#1d814c', bg: '#e8fff3' },
            { label: 'In Progress',   value: '01', color: '#c87e1c', bg: '#fff8ef' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 20px', borderRadius: 14,
              background: '#ffffff', border: '1px solid #ececf0',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              minWidth: 200,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: s.color, flexShrink: 0,
                boxShadow: `0 0 0 3px ${s.bg}`,
              }} />
              <span style={{ fontSize: 13, color: '#595966', flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ STATS ROW ════════════════════════════════════════ */}
      <div>
        <p style={{
          margin: '0 0 16px', fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9a9aaa',
        }}>Quick Stats</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}>
          {STATS.map(s => (
            <div key={s.label} style={{
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: 18, padding: '22px 24px',
              display: 'flex', alignItems: 'center', gap: 18,
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'default',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.09)` }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)' }}
            >
              <span style={{ fontSize: 30 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 30, fontWeight: 800, color: s.accent, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: s.accent, marginTop: 5,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FEATURES GRID ════════════════════════════════════ */}
      <div>
        <div style={{ marginBottom: 20 }}>
          <p style={{
            margin: '0 0 6px', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9a9aaa',
          }}>Module Capabilities</p>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#14141c' }}>
            What JLR Tracks
          </h2>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
          gap: 16,
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: '#ffffff',
              border: '1px solid #ececf0',
              borderRadius: 18,
              padding: '24px 26px',
              transition: 'all 0.22s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = f.border
              e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.09)`
              e.currentTarget.style.transform = 'translateY(-3px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#ececf0'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
              e.currentTarget.style.transform = ''
            }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 13,
                background: f.bg, border: `1px solid ${f.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginBottom: 16,
              }}>{f.icon}</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#14141c' }}>
                {f.title}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#7a7a8c', lineHeight: 1.65 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ CTA STRIP ════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #d7263d 0%, #e8334a 50%, #ff5252 100%)',
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
        {/* Decoration circles */}
        <div style={{ position:'absolute', right:-30, top:-30, width:180, height:180,
          borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:60, bottom:-40, width:120, height:120,
          borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />

        <div style={{ position: 'relative' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#fff' }}>
            Ready to log a new inspection job?
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
            Open the Job Log, add an entry, and track it through to full closure.
          </p>
        </div>
        <Link to="/job-log/entries" style={{ textDecoration: 'none', position: 'relative' }}>
          <button style={{
            padding: '13px 30px',
            background: '#ffffff',
            color: '#d7263d',
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
            📋 Open Job Log →
          </button>
        </Link>
      </div>

    </div>
  )
}

export default JLRHome
