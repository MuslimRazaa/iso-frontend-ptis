import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { API_ENDPOINTS } from '../config/api'

// One viewer, reused by JLR and ISO Forms: an audit row is the same shape
// (who, did what, to what, when) regardless of which module it came from, and
// an admin comparing activity across modules is a real use case a single
// shared table answers directly rather than two pages that might drift apart.

const ACTION_COLORS = {
  create:  { bg: '#e7f6ec', color: '#1a7f4e' },
  update:  { bg: '#fff7e6', color: '#b54708' },
  delete:  { bg: '#fdecea', color: '#b42318' },
  approve: { bg: '#e7f6ec', color: '#1a7f4e' },
  reject:  { bg: '#fdecea', color: '#b42318' },
}

const ActionBadge = ({ action }) => {
  const c = ACTION_COLORS[action] || { bg: '#f0f0f4', color: '#595966' }
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: 999,
      fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
      background: c.bg, color: c.color,
    }}>{action}</span>
  )
}

const inputStyle = {
  background: '#fff', border: '1px solid #e0e0e6', color: '#14141c',
  borderRadius: 16, padding: '12px 16px', fontSize: 14, outline: 'none',
  fontFamily: 'inherit', transition: 'all 0.2s ease',
}

// Turns a row's `details` JSON into one readable line, without the viewer
// needing to know the shape every different action produces it in.
function summariseDetails(row) {
  const d = row.details
  if (!d || typeof d !== 'object') return ''
  if (Array.isArray(d.changedFields) && d.changedFields.length) return `Changed: ${d.changedFields.join(', ')}`
  if (d.remarks) return `Remarks: ${d.remarks}`
  if (d.mode && d.inserted != null) return `${d.inserted} row(s), mode: ${d.mode}`
  if (d.count != null) return `${d.count} row(s)`
  return ''
}

const ENTITY_LABEL = {
  entry: 'Form', template: 'Template', job_log_entry: 'Job Log Entry',
}

function AuditLogView({ module, title, subtitle, actions, backTo }) {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const limit = 50

  const [action, setAction] = useState('')
  const [actorName, setActorName] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  // Changing a filter that affects the server fetch (action / date range /
  // search) goes back to page 1 — set right in the handler that changes the
  // filter (an event handler, not an effect), so there is nothing to
  // synchronize after the fact. `actorName` filters only the page already on
  // screen, so it does not touch pagination.
  const setFilterAndResetPage = (setter) => (value) => { setter(value); setPage(1) }
  const onActionChange = setFilterAndResetPage(setAction)
  const onDateFromChange = setFilterAndResetPage(setDateFrom)
  const onDateToChange = setFilterAndResetPage(setDateTo)
  const onSearchChange = setFilterAndResetPage(setSearch)

  useEffect(() => {
    const params = new URLSearchParams({ module, page: String(page), limit: String(limit) })
    if (action) params.set('action', action)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (search.trim()) params.set('search', search.trim())

    fetch(`${API_ENDPOINTS.AUDIT_LOG}?${params.toString()}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => {
        if (json?.success === false) throw new Error(json.error || 'Failed to load')
        setRows(Array.isArray(json.rows) ? json.rows : [])
        setTotal(json.total || 0)
        setError('')
      })
      .catch(() => setError('Could not load the audit log. The backend may not have this feature deployed yet.'))
      .finally(() => setLoading(false))
  }, [module, action, dateFrom, dateTo, search, page])

  // actorName filters client-side against the page just fetched — a full-text
  // "who" search across the whole table would need its own backend query, and
  // the visible page is what an admin is actually scanning at any moment.
  const visibleRows = useMemo(() => {
    const q = actorName.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => (r.actor_name || '').toLowerCase().includes(q))
  }, [rows, actorName])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const hasActiveFilters = Boolean(action || actorName || dateFrom || dateTo || search)
  const clearFilters = () => { setAction(''); setActorName(''); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1) }

  return (
    <div style={{ padding: 'clamp(24px, 4vw, 48px)' }}>
      {backTo && (
        <Link to={backTo} style={{ fontSize: 13, color: '#7a7a8c', textDecoration: 'none' }}>← Back</Link>
      )}
      <p className="eyebrow" style={{ margin: '12px 0 0' }}>Admin</p>
      <h1 style={{ margin: '4px 0 8px', fontSize: 26, fontWeight: 800, color: '#14141c' }}>{title}</h1>
      {subtitle && <p style={{ margin: '0 0 24px', color: '#7a7a8c' }}>{subtitle}</p>}

      <div className="panel" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9a9aaa' }} />
          <input
            type="text" placeholder="Search what happened…" value={search}
            onChange={e => onSearchChange(e.target.value)}
            style={{ ...inputStyle, width: '100%', paddingLeft: 40, boxSizing: 'border-box' }}
          />
        </div>
        <select value={action} onChange={e => onActionChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', minWidth: 150 }}>
          <option value="">All actions</option>
          {actions.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
        </select>
        <input
          type="text" placeholder="Filter by who…" value={actorName}
          onChange={e => setActorName(e.target.value)}
          style={{ ...inputStyle, minWidth: 160 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} style={{ color: '#9a9aaa' }} />
          <input type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)} style={{ ...inputStyle, padding: '10px 10px' }} />
          <span style={{ color: '#9a9aaa' }}>to</span>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => onDateToChange(e.target.value)} style={{ ...inputStyle, padding: '10px 10px' }} />
        </div>
        {hasActiveFilters && (
          <button type="button" className="ghost-btn" onClick={clearFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: '#fdecea', border: '1px solid #f5c2c0', color: '#b42318', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <article className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <header style={{ padding: '20px 24px', borderBottom: '1px solid #ececf0' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#7a7a8c' }}>
            {loading ? 'Loading…' : `${total} record${total === 1 ? '' : 's'}`}
          </p>
        </header>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#7a7a8c', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 20px' }}>When</th>
                <th style={{ padding: '12px 20px' }}>Action</th>
                <th style={{ padding: '12px 20px' }}>What</th>
                <th style={{ padding: '12px 20px' }}>Who</th>
                <th style={{ padding: '12px 20px' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {!loading && visibleRows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: '#9a9aaa' }}>No activity recorded yet.</td></tr>
              )}
              {visibleRows.map(row => (
                <tr key={row.id} style={{ borderTop: '1px solid #ececf0' }}>
                  <td style={{ padding: '14px 20px', color: '#595966', whiteSpace: 'nowrap' }}>
                    {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '14px 20px' }}><ActionBadge action={row.action} /></td>
                  <td style={{ padding: '14px 20px', color: '#14141c' }}>
                    <div style={{ fontWeight: 600 }}>{row.entity_label || `${ENTITY_LABEL[row.entity_type] || row.entity_type} #${row.entity_id}`}</div>
                    <div style={{ fontSize: 12, color: '#9a9aaa' }}>{ENTITY_LABEL[row.entity_type] || row.entity_type}</div>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#595966' }}>{row.actor_name || row.actor_id || '—'}</td>
                  <td style={{ padding: '14px 20px', color: '#7a7a8c', fontSize: 13 }}>{summariseDetails(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 20px', borderTop: '1px solid #ececf0' }}>
            <button type="button" className="ghost-btn small" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: 13, color: '#7a7a8c' }}>Page {page} of {totalPages}</span>
            <button type="button" className="ghost-btn small" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </article>
    </div>
  )
}

export default AuditLogView
