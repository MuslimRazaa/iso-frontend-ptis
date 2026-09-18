import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Calendar, X, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { API_ENDPOINTS } from '../config/api'
import { showToast } from './Toast'
import PaginationBar from './PaginationBar'
import StyledSelect from './StyledSelect'
import SearchableSelect from './SearchableSelect'
import StyledDatePicker from './StyledDatePicker'

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
  standard: 'Standard', question: 'Question', result: 'Test Result',
  certificate: 'Certificate', employee: 'Employee',
}

function AuditLogView({ module, title, subtitle, actions, backTo, padded = true, showHeader = true }) {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const limit = 100

  const [action, setAction] = useState('')
  const [actorName, setActorName] = useState('')
  const [actorOptions, setActorOptions] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  // Changing any filter that affects the server fetch goes back to page 1 —
  // set right in the handler that changes the filter (an event handler, not
  // an effect), so there is nothing to synchronize after the fact.
  const setFilterAndResetPage = (setter) => (value) => { setter(value); setPage(1) }
  const onActionChange = setFilterAndResetPage(setAction)
  const onActorNameChange = setFilterAndResetPage(setActorName)
  const onDateFromChange = setFilterAndResetPage(setDateFrom)
  const onDateToChange = setFilterAndResetPage(setDateTo)
  const onSearchChange = setFilterAndResetPage(setSearch)

  // Every name that has ever appeared in this module's Who column — the full
  // list the Filter by Who dropdown offers, not just whatever page of rows
  // happens to be on screen right now.
  useEffect(() => {
    fetch(`${API_ENDPOINTS.AUDIT_LOG}/actors?module=${encodeURIComponent(module)}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => setActorOptions(Array.isArray(json.actors) ? json.actors : []))
      .catch(() => setActorOptions([]))
  }, [module])

  useEffect(() => {
    const params = new URLSearchParams({ module, page: String(page), limit: String(limit) })
    if (action) params.set('action', action)
    if (actorName) params.set('actorName', actorName)
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
  }, [module, action, actorName, dateFrom, dateTo, search, page])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const hasActiveFilters = Boolean(action || actorName || dateFrom || dateTo || search)
  const clearFilters = () => { setAction(''); setActorName(''); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1) }

  const [exporting, setExporting] = useState('')

  // Export downloads every row matching the current filters, not just the
  // page on screen — a report is only useful if it's complete. The list
  // endpoint caps a single request at 200 rows, so this pages through it.
  const fetchAllFilteredRows = async () => {
    const exportLimit = 200
    const params = new URLSearchParams({ module, limit: String(exportLimit) })
    if (action) params.set('action', action)
    if (actorName) params.set('actorName', actorName)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (search.trim()) params.set('search', search.trim())

    let all = []
    let fetchPage = 1
    while (true) {
      params.set('page', String(fetchPage))
      const res = await fetch(`${API_ENDPOINTS.AUDIT_LOG}?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      const pageRows = Array.isArray(json.rows) ? json.rows : []
      all = all.concat(pageRows)
      if (pageRows.length < exportLimit || all.length >= (json.total || 0)) break
      fetchPage += 1
    }
    return all
  }

  const exportRowsToTable = (allRows) => allRows.map(row => [
    row.created_at ? new Date(row.created_at).toLocaleString() : '—',
    row.action || '',
    row.entity_label || `${ENTITY_LABEL[row.entity_type] || row.entity_type} #${row.entity_id}`,
    row.actor_name || row.actor_id || '—',
    summariseDetails(row),
  ])

  const handleExportPdf = async () => {
    setExporting('pdf')
    try {
      const allRows = await fetchAllFilteredRows()
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(14)
      doc.text(title || 'Audit Log', 14, 16)
      autoTable(doc, {
        startY: 22,
        head: [['When', 'Action', 'What', 'Who', 'Details']],
        body: exportRowsToTable(allRows),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [20, 20, 28] },
      })
      doc.save(`${module}-audit-log.pdf`)
      showToast(`Exported ${allRows.length} record${allRows.length === 1 ? '' : 's'} to PDF.`, 'success')
    } catch {
      showToast('Could not export the audit log.', 'error')
    } finally {
      setExporting('')
    }
  }

  const handleExportExcel = async () => {
    setExporting('excel')
    try {
      const allRows = await fetchAllFilteredRows()
      const sheetRows = allRows.map(row => ({
        When: row.created_at ? new Date(row.created_at).toLocaleString() : '—',
        Action: row.action || '',
        What: row.entity_label || `${ENTITY_LABEL[row.entity_type] || row.entity_type} #${row.entity_id}`,
        Who: row.actor_name || row.actor_id || '—',
        Details: summariseDetails(row),
      }))
      const worksheet = XLSX.utils.json_to_sheet(sheetRows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Log')
      XLSX.writeFile(workbook, `${module}-audit-log.xlsx`)
      showToast(`Exported ${allRows.length} record${allRows.length === 1 ? '' : 's'} to Excel.`, 'success')
    } catch {
      showToast('Could not export the audit log.', 'error')
    } finally {
      setExporting('')
    }
  }

  const exportButtons = (
    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
      <button
        type="button"
        className="ghost-btn"
        onClick={handleExportPdf}
        disabled={Boolean(exporting)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: exporting ? 0.6 : 1 }}
      >
        <Download size={14} /> {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
      </button>
      <button
        type="button"
        className="ghost-btn"
        onClick={handleExportExcel}
        disabled={Boolean(exporting)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: exporting ? 0.6 : 1 }}
      >
        <Download size={14} /> {exporting === 'excel' ? 'Exporting…' : 'Export Excel'}
      </button>
    </div>
  )

  return (
    <div style={padded ? { padding: 'clamp(24px, 4vw, 48px)' } : undefined}>
      {backTo && (
        <Link to={backTo} style={{ fontSize: 13, color: '#7a7a8c', textDecoration: 'none' }}>← Back</Link>
      )}
      {showHeader ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p className="eyebrow" style={{ margin: '12px 0 0' }}>Admin</p>
              <h1 style={{ margin: '4px 0 8px', fontSize: 26, fontWeight: 800, color: '#14141c' }}>{title}</h1>
              {subtitle && <p style={{ margin: 0, color: '#7a7a8c' }}>{subtitle}</p>}
            </div>
            <div style={{ marginTop: 12 }}>{exportButtons}</div>
          </div>
          <div style={{ marginBottom: 24 }} />
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>{exportButtons}</div>
      )}

      <div className="panel" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 140px', minWidth: 140 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9a9aaa' }} />
          <input
            type="text" placeholder="Search what happened…" value={search}
            onChange={e => onSearchChange(e.target.value)}
            style={{ ...inputStyle, width: '100%', paddingLeft: 40, boxSizing: 'border-box' }}
          />
        </div>
        <StyledSelect
          value={action}
          onChange={onActionChange}
          options={[]}
          extraOptions={actions.map(a => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }))}
          emptyOptionLabel="All actions"
          placeholder="All actions"
          style={{ ...inputStyle, cursor: 'pointer', minWidth: 130 }}
        />
        <SearchableSelect
          value={actorName}
          onChange={onActorNameChange}
          options={actorOptions}
          emptyOptionLabel="All people"
          placeholder="Filter by who…"
          style={{ ...inputStyle, minWidth: 140 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Calendar size={16} style={{ color: '#9a9aaa' }} />
          <StyledDatePicker value={dateFrom} onChange={onDateFromChange} max={dateTo || undefined} style={{ ...inputStyle, padding: '10px 10px' }} />
          <span style={{ color: '#9a9aaa' }}>to</span>
          <StyledDatePicker value={dateTo} onChange={onDateToChange} min={dateFrom || undefined} style={{ ...inputStyle, padding: '10px 10px' }} />
        </div>
        {hasActiveFilters && (
          <button type="button" className="ghost-btn" onClick={clearFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: '#9a9aaa' }}>No activity recorded yet.</td></tr>
              )}
              {rows.map(row => (
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
        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={limit}
          onPageChange={setPage}
          itemLabel="records"
        />
      </article>
    </div>
  )
}

export default AuditLogView
