import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MdOutlineHealthAndSafety } from 'react-icons/md'
import { BsClockHistory, BsGeoAlt, BsClipboardCheck, BsFileEarmarkText } from 'react-icons/bs'
import { API_ENDPOINTS } from '../../config/api'
import IncidentFreeDays from './IncidentFreeDays'

// The Safety Documentation dashboard: one card per report. The list comes from the server
// (routes/jobLogReports.js), so a new report shows up here by itself; its card opens the report screen.

const BRAND = '#d7263d'
const INK = '#14141c'
const MUTED = '#7a7a8c'
const SUBTLE = '#9a9aaa'
const BORDER = '#ececf0'
const TILE_BG = '#fdf2f3'

// An icon per report; any report without one gets the generic document icon.
const ICONS = { 'man-hours': BsClockHistory, jmp: BsGeoAlt, 'monthly-inspections': BsClipboardCheck }

export default function SafetyDocumentation() {
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const base = isUserSide ? '/user/job-log' : '/job-log'
  const [reports, setReports] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stale = false
    fetch(`${API_ENDPOINTS.JOB_LOG}/reports`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Server error ${r.status}`))))
      .then(j => { if (!stale) setReports(j.reports || []) })
      .catch(e => { if (!stale) { setReports([]); setError(e.message) } })
    return () => { stale = true }
  }, [])

  return (
    <div style={{ padding: 'clamp(24px, 4vw, 52px) clamp(24px, 5vw, 60px)', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <Link to={base} className="back-link" style={{ display: 'inline-block', fontSize: 13, textDecoration: 'none' }}>← Overview</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: TILE_BG, color: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
            <MdOutlineHealthAndSafety />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: SUBTLE }}>Job Log</p>
            <h1 style={{ margin: '2px 0 0', fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 800, color: INK }}>Safety Documentation</h1>
          </div>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 14, color: MUTED, maxWidth: 620, lineHeight: 1.6 }}>
          Reports built automatically from the Job Log. Open one, choose what it should cover, and view or download it as a PDF.
        </p>
      </div>

      {/* Days without incident — counted from the last incident report */}
      <IncidentFreeDays isUserSide={isUserSide} />

      <div>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: SUBTLE }}>Monthly Reports</p>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: INK }}>Safety reports</h2>
      </div>

      {error && <p style={{ color: BRAND, fontSize: 14, margin: 0 }}>Could not load the reports: {error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
        {reports === null && <p style={{ color: SUBTLE, fontSize: 14 }}>Loading…</p>}
        {(reports || []).map(r => {
          const Icon = ICONS[r.key] || BsFileEarmarkText
          return (
            <Link
              key={r.key}
              to={`${base}/safety-documentation/${r.key}`}
              title={`Open ${r.title}`}
              style={{
                display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit', background: '#fff', border: `1px solid ${BORDER}`,
                borderRadius: 18, padding: '24px 26px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.22s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(215,38,61,0.35)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = '' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: TILE_BG, color: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  <Icon />
                </div>
                {r.period && (
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: BRAND, background: 'rgba(215,38,61,0.08)', padding: '3px 10px', borderRadius: 999 }}>
                    {r.period}
                  </span>
                )}
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: INK }}>{r.title}</h3>
              <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.65 }}>{r.description}</p>
              {/* marginTop:auto pushes the link to the card's bottom, so it sits on one line across all cards */}
              <span style={{ display: 'inline-block', marginTop: 'auto', paddingTop: 14, fontSize: 12.5, fontWeight: 700, color: BRAND }}>Open report →</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
