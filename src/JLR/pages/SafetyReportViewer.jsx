import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { BsFileEarmarkPdf, BsDownload } from 'react-icons/bs'
import { API_ENDPOINTS } from '../../config/api'
import StyledSelect from '../../components/StyledSelect'
import StyledDatePicker from '../../components/StyledDatePicker'
import ClearFilterButton from '../../components/ClearFilterButton'
import { formatDate } from '../../utils/dateFormat'

// One screen for every Safety Documentation report: the report itself says what its boxes, columns and rows
// are (see routes/jobLogReports.js), so a new report needs nothing here.

const BRAND = '#d7263d'
const INK = '#14141c'
const MUTED = '#7a7a8c'
const SUBTLE = '#9a9aaa'
const BORDER = '#ececf0'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const nowMonth = () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1 } }
const f = (n) => Number(n || 0).toLocaleString('en-US')
const dash = (n) => (n == null || !Number.isFinite(Number(n)) ? '' : f(n))


export default function SafetyReportViewer() {
  const { reportKey } = useParams()
  const location = useLocation()
  const base = location.pathname.startsWith('/user') ? '/user/job-log' : '/job-log'
  const backTo = `${base}/safety-documentation`

  const [def, setDef] = useState(null)          // { key, title, description, period, filters }
  const [notFound, setNotFound] = useState(false)
  const [regions, setRegions] = useState([{ code: 'ALL', label: 'All Regions' }, { code: 'SOUTH', label: 'South Region' }, { code: 'NORTH', label: 'North Region' }])
  // Every region together is where it starts; pick one region to narrow it.
  const [region, setRegion] = useState('ALL')
  // The month is the current one on its own; it only moves if someone picks another.
  const [{ y, m }, setYm] = useState(nowMonth)
  // By month (the default) or between two dates. The report stays on the month until both dates are picked.
  const [byDates, setByDates] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const month = `${y}-${String(m).padStart(2, '0')}`
  const filters = def?.filters || []
  const thisMonth = nowMonth()
  // Anything but the starting view (this month, every region) can be cleared back to it.
  const hasFilters = region !== 'ALL' || !!from || !!to || y !== thisMonth.y || m !== thisMonth.m
  const clearFilters = () => { setRegion('ALL'); setYm(nowMonth()); setFrom(''); setTo('') }
  const rangeOk = byDates && !!from && !!to
  const qs = rangeOk ? `from=${from}&to=${to}&region=${region}` : `month=${month}&region=${region}`

  useEffect(() => {
    fetch(`${API_ENDPOINTS.JOB_LOG}/reports`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Server error ${r.status}`))))
      .then(j => {
        const found = (j.reports || []).find(r => r.key === reportKey)
        if (found) setDef(found); else setNotFound(true)
      })
      .catch(e => setError(e.message))
    fetch(`${API_ENDPOINTS.JOB_LOG}/reports/regions`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (j?.regions?.length) setRegions(j.regions) })
      .catch(() => { /* the built-in list stays */ })
  }, [reportKey])

  useEffect(() => {
    if (notFound) return undefined
    let stale = false
    setLoading(true); setError('')
    fetch(`${API_ENDPOINTS.JOB_LOG}/reports/${reportKey}?${qs}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Server error ${r.status}`))))
      .then(j => { if (!stale) setData(j) })
      .catch(e => { if (!stale) { setData(null); setError(e.message) } })
      .finally(() => { if (!stale) setLoading(false) })
    return () => { stale = true }
  }, [reportKey, qs, notFound])

  const years = useMemo(() => { const c = nowMonth().y; return [c - 3, c - 2, c - 1, c, c + 1].map(String) }, [])
  const pdfUrl = `${API_ENDPOINTS.JOB_LOG}/reports/${reportKey}/pdf?${qs}`
  const field = { minWidth: 140, padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', fontSize: 13.5, cursor: 'pointer' }

  const cell = (col, row) => {
    const v = row[col.key]
    if (col.type === 'date') return v ? formatDate(v) : ''
    if (col.type === 'number') return dash(v)
    return v == null || v === '' ? '' : String(v)
  }

  if (notFound) {
    return (
      <div style={{ padding: 'clamp(24px, 4vw, 52px) clamp(24px, 5vw, 60px)' }}>
        <Link to={backTo} className="back-link" style={{ display: 'inline-block', fontSize: 13, textDecoration: 'none' }}>← Safety Documentation</Link>
        <p style={{ marginTop: 24, color: INK, fontSize: 16 }}>This report does not exist.</p>
      </div>
    )
  }

  const tiles = data?.tiles || []
  const columns = data?.columns || []
  const rows = data?.rows || []

  return (
    <div style={{ padding: 'clamp(24px, 4vw, 52px) clamp(24px, 5vw, 60px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Link to={backTo} className="back-link" style={{ display: 'inline-block', fontSize: 13, textDecoration: 'none' }}>← Safety Documentation</Link>
        <p style={{ margin: '14px 0 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: SUBTLE }}>
          {def?.period ? `${def.period} report` : 'Report'}
        </p>
        <h1 style={{ margin: '2px 0 6px', fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 800, color: INK }}>{def?.title || data?.title || ' '}</h1>
        {def?.description && <p style={{ margin: 0, fontSize: 14, color: MUTED, maxWidth: 640, lineHeight: 1.6 }}>{def.description}</p>}
      </div>

      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, padding: 'clamp(18px, 2.4vw, 28px)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 22 }}>
          {filters.includes('region') && (
            <StyledSelect
              style={field}
              value={region}
              onChange={setRegion}
              options={[]}
              extraOptions={regions.map(r => ({ value: r.code, label: r.label }))}
            />
          )}
          {filters.includes('range') && (
            <div role="group" aria-label="Report period" style={{ display: 'inline-flex', padding: 3, border: `1px solid ${BORDER}`, borderRadius: 12, background: '#faf9fb' }}>
              {[['Month', false], ['Dates', true]].map(([label, on]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setByDates(on)}
                  aria-pressed={byDates === on}
                  style={{ border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: byDates === on ? BRAND : 'transparent', color: byDates === on ? '#fff' : MUTED, transition: 'background .15s, color .15s' }}
                >{label}</button>
              ))}
            </div>
          )}
          {filters.includes('month') && !byDates && (
            <>
              <StyledSelect style={field} value={MONTHS[m - 1]} onChange={(v) => setYm(p => ({ ...p, m: MONTHS.indexOf(v) + 1 }))} options={MONTHS} />
              <StyledSelect style={{ ...field, minWidth: 96 }} value={String(y)} onChange={(v) => setYm(p => ({ ...p, y: Number(v) }))} options={years} />
            </>
          )}
          {filters.includes('range') && byDates && (
            <>
              <StyledDatePicker value={from} max={to || undefined} onChange={setFrom} placeholder="From date" style={{ ...field, minWidth: 138 }} />
              <StyledDatePicker value={to} min={from || undefined} onChange={setTo} placeholder="To date" style={{ ...field, minWidth: 138 }} />
            </>
          )}
          <ClearFilterButton visible={hasFilters} onClick={clearFilters} />
          <div style={{ flex: 1 }} />
          <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <button type="button" className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 14px', whiteSpace: 'nowrap' }}>
              <BsFileEarmarkPdf /> Open PDF
            </button>
          </a>
          <a href={`${pdfUrl}&download=1`} style={{ textDecoration: 'none' }}>
            <button type="button" className="ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 14px', whiteSpace: 'nowrap' }}>
              <BsDownload /> Download
            </button>
          </a>
        </div>

        {error && <p style={{ color: BRAND, fontSize: 14, margin: '0 0 16px' }}>Could not load the report: {error}</p>}
        {data?.notice && <p style={{ margin: '0 0 16px', padding: '10px 14px', borderRadius: 12, background: '#fff8e8', border: '1px solid #f5e1ad', color: '#7a5a00', fontSize: 13, lineHeight: 1.5 }}>{data.notice}</p>}

        <section className="lms-stat-grid" style={{ marginBottom: 24 }}>
          {(tiles.length ? tiles : [{ label: ' ', value: null, unit: '' }, { label: ' ', value: null, unit: '' }, { label: ' ', value: null, unit: '' }, { label: ' ', value: null, unit: '' }]).map((t, i) => (
            <div key={`${t.label}-${i}`} className="stat-card">
              <p>{t.label}</p>
              <h3>{loading || t.value == null ? '' : f(t.value)} <small style={{ fontSize: 13, color: SUBTLE, fontWeight: 500 }}>{t.unit}</small></h3>
              <span>{data ? `${data.meta?.monthLabel || ''} · ${data.meta?.regionLabel || ''}` : ' '}</span>
            </div>
          ))}
        </section>

        <div style={{ overflow: 'auto', maxHeight: 520, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#fdf2f3', position: 'sticky', top: 0 }}>
                {columns.map(c => (
                  <th key={c.key} style={{ padding: '10px 12px', textAlign: c.align || 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: BRAND }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id ?? r.no} style={{ borderTop: `1px solid ${BORDER}` }}>
                  {columns.map(c => (
                    <td key={c.key} style={{ padding: '9px 12px', textAlign: c.align || 'left', fontWeight: c.bold ? 700 : 400, color: c.key === 'no' ? BRAND : INK, whiteSpace: c.type === 'date' ? 'nowrap' : undefined }}>
                      {cell(c, r)}
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && data && rows.length === 0 && (
                <tr><td colSpan={Math.max(columns.length, 1)} style={{ padding: 28, textAlign: 'center', color: SUBTLE }}>Nothing recorded for this selection.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={Math.max(columns.length, 1)} style={{ padding: 28, textAlign: 'center', color: SUBTLE }}>Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p style={{ margin: '12px 2px 0', fontSize: 12, color: SUBTLE }}>A blank cell means no entry was recorded.</p>
      </div>
    </div>
  )
}
