import React, { useEffect, useState, Suspense, lazy } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'
import { showToast } from '../../components/Toast'
import { getActorId, getActorName } from '../../utils/actorIdentity'
import { getOfflineTemplate, addOfflineTemplate, updateOfflineTemplate } from '../utils/offlineStore'
// Both pull in pdfjs-dist (~500KB) to render/parse PDF pages — lazy-loaded
// since they're only opened from a click (Import PDF / position fields), not
// needed just to view or fill out the rest of the template builder form.
const PdfImportModal = lazy(() => import('../components/PdfImportModal'))
const FieldPositionEditor = lazy(() => import('./FieldPositionEditor'))
import { isPlaced } from '../utils/pdfCoords'
import { FIELD_TYPES, blankField, hasOptions, blankApprovalRole, ownerOptionsFor } from '../utils/fieldTypes'
import StyledSelect from '../../components/StyledSelect'
import SearchableSelect from '../../components/SearchableSelect'
import MultiSelect from '../../components/MultiSelect'
import EmployeeMultiPicker from '../components/EmployeeMultiPicker'
import RoleLimits from '../components/RoleLimits'

// The template PDF is sent as a real file part, not as base64 inside the JSON
// body: shared hosting (mod_security) caps non-file request data at 128 KB and
// answered every template save with a 413, so saves worked locally and failed
// live. File parts are exempt from that cap.
function base64ToBlob(base64, type = 'application/pdf') {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

// Turns a failed save response into something an admin can act on. Size-related
// rejections (a proxy's body cap, MySQL's max_allowed_packet) are the common
// live-only failure — the same template saves fine locally — so they are named
// explicitly instead of surfacing as a bare 500.
async function describeSaveFailure(res, bodyBytes) {
  const mb = (bodyBytes / (1024 * 1024)).toFixed(1)
  let serverMessage = ''
  try {
    const text = await res.text()
    try { serverMessage = JSON.parse(text).error || '' }
    catch { serverMessage = /<html/i.test(text) ? '' : text.slice(0, 200) }
  } catch { /* body already consumed or unreadable */ }

  if (res.status === 413) {
    return `The server refused this upload as too large (PDF is ${mb} MB). ` +
      'Compress the PDF and try again, or ask the host to raise the upload limit.'
  }
  if (res.status >= 500) {
    return `The server could not save this template (HTTP ${res.status}${serverMessage ? ` — ${serverMessage}` : ''}). ` +
      `The request was ${mb} MB; if the PDF is large this is usually a server-side size limit.`
  }
  return serverMessage || `The server rejected this template (HTTP ${res.status}).`
}

function TemplateBuilder() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const base = isUserSide ? '/user/iso-forms' : '/iso-forms'
  const isEdit = Boolean(id)

  const isAdmin = !isUserSide || (() => {
    try { return JSON.parse(localStorage.getItem('userPermissions') || '{}').iso_forms_admin === true } catch { return false }
  })()

  useEffect(() => {
    if (!isAdmin) navigate(`${base}/templates`, { replace: true })
  }, [isAdmin])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState([blankField()])
  const [approvalRoles, setApprovalRoles] = useState([])
  // Some forms need no sign-off: they are filed on submit, with no approver and no e-mail.
  const [requiresApproval, setRequiresApproval] = useState(true)
  // Saved location sets the form filler can pick from: [{ id, name, values: { fieldId: text } }]
  const [locationPresets, setLocationPresets] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])

  // For each role's Department → Employee picker: pick a department to narrow
  // the list, then pick the specific person it defaults to. Just a default —
  // Fill a New Form still shows the picker and lets the requester change it.
  useEffect(() => {
    fetch(API_ENDPOINTS.DEPARTMENTS)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => setDepartments(Array.isArray(json) ? json : []))
      .catch(() => setDepartments([]))
    fetch(API_ENDPOINTS.EMPLOYEES)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => setEmployees(Array.isArray(json) ? json : []))
      .catch(() => setEmployees([]))
  }, [])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showPositions, setShowPositions] = useState(false)
  const [originalPdfBase64, setOriginalPdfBase64] = useState('')
  const [originalPdfName, setOriginalPdfName] = useState('')
  const [formCode, setFormCode] = useState('')

  useEffect(() => {
    if (!isEdit) return
    let active = true
    const applyTemplate = (json) => {
      if (!active || !json) return
      setName(json.name || '')
      setDescription(json.description || '')
      setOriginalPdfBase64(json.originalPdf || '')
      setOriginalPdfName(json.originalPdfName || '')
      setFormCode(json.formCode || '')
      setApprovalRoles(Array.isArray(json.approvalRoles) ? json.approvalRoles : [])
      setRequiresApproval(json.requiresApproval !== false)
      setLocationPresets(Array.isArray(json.locationPresets) ? json.locationPresets : [])
      const parsedFields = typeof json.fields === 'string' ? JSON.parse(json.fields) : json.fields
      const normalized = Array.isArray(parsedFields)
        ? parsedFields.map(f => ({ owner: 'requester', ...f }))
        : []
      setFields(normalized.length ? normalized : [blankField()])
    }
    fetch(`${API_ENDPOINTS.ISO_FORMS_TEMPLATES}/${id}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(applyTemplate)
      .catch(() => applyTemplate(getOfflineTemplate(id)))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, isEdit])

  const KNOWN_FORM_NAMES = {
    'FM-001-04': 'Document Change Request Form',
    'FM-002-01': 'Corrective Action Request Form',
    'FM-014-09': 'Requisition Form',
    'FM-006-03': 'Final Settlement Form',
  }

  const handlePdfImport = (importedFields, pdfBase64, pdfName, detectedCode, importedApprovalRoles) => {
    setFields(prev => {
      const hasContent = prev.some(f => f.label.trim())
      return hasContent ? [...prev, ...importedFields] : importedFields
    })
    // A recognised preset (e.g. FM-006-03's 5 HOD roles) brings its own
    // approval roles — only apply them when the template doesn't already have
    // roles of its own, so re-importing into an already-customized template
    // doesn't clobber roles the admin added by hand.
    if (importedApprovalRoles?.length && !approvalRoles.length) {
      setApprovalRoles(importedApprovalRoles.map(r => ({ ...r })))
    }
    setOriginalPdfBase64(pdfBase64)
    setOriginalPdfName(pdfName)
    // Use proper form name for recognized PTIS forms; fall back to filename
    const properName = detectedCode && KNOWN_FORM_NAMES[detectedCode]
      ? KNOWN_FORM_NAMES[detectedCode]
      : pdfName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
    if (!name.trim()) setName(properName)
    if (detectedCode) setFormCode(detectedCode)
    setShowImport(false)
  }

  const unplacedCount = originalPdfBase64
    ? fields.filter(f => f.label.trim() && !isPlaced(f)).length
    : 0

  const addApprovalRole = () => setApprovalRoles(prev => [...prev, blankApprovalRole()])
  const updateApprovalRole = (key, patch) =>
    setApprovalRoles(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)))
  // A field owned by the role being removed would otherwise point at a role
  // that no longer exists — fall back those fields to "Requester" rather than
  // leaving a dangling owner.
  const removeApprovalRole = (key) => {
    setApprovalRoles(prev => prev.filter(r => r.key !== key))
    setFields(prev => prev.map(f => (f.owner === key ? { ...f, owner: 'requester' } : f)))
  }

  // The boxes a location preset fills: the form's heading boxes (the "Location" headings people write in).
  const locationFields = fields.filter(f => (f.noDash || /^f_reg_head_/.test(String(f.id))) && f.label.trim())
  // One preset is edited at a time; the others stay folded into a single line. Cancel puts it back as it was
  // when it was opened (a preset that was never finished with Done is dropped).
  const [openPreset, setOpenPreset] = useState(null)       // id of the preset being edited
  const [presetBackup, setPresetBackup] = useState(null)   // how it was when opened; null = it is brand new
  const [presetNote, setPresetNote] = useState('')
  const dropUnfinished = (list) => (openPreset && presetBackup === null ? list.filter(p => p.id !== openPreset || p.name.trim()) : list)
  const openEditor = (p, isNew = false) => {
    setLocationPresets(prev => dropUnfinished(prev))
    setPresetNote('')
    setPresetBackup(isNew ? null : JSON.parse(JSON.stringify(p)))
    setPresetPage(prev => ({ ...prev, [p.id]: 1 }))
    setOpenPreset(p.id)
  }
  const cancelPreset = () => {
    setLocationPresets(prev => (presetBackup === null ? prev.filter(p => p.id !== openPreset) : prev.map(p => (p.id === openPreset ? presetBackup : p))))
    setOpenPreset(null); setPresetBackup(null); setPresetNote('')
  }
  const donePreset = () => {
    const p = locationPresets.find(x => x.id === openPreset)
    if (!p) { setOpenPreset(null); return }
    if (!p.name.trim()) { setPresetNote('Give this preset a name first, so it can be picked from the list.'); return }
    if (locationPresets.some(x => x.id !== p.id && x.name.trim().toLowerCase() === p.name.trim().toLowerCase())) { setPresetNote('Another preset already has this name.'); return }
    setOpenPreset(null); setPresetBackup(null); setPresetNote('')
  }
  const presetStats = (p) => {
    const sets = [p.values, ...(p.more || [])]
    return { pages: sets.length, filled: sets.reduce((n, s) => n + Object.values(s || {}).filter(v => String(v).trim()).length, 0) }
  }
  const addPreset = () => {
    const p = { id: `p_${Date.now().toString(36)}`, name: '', values: {}, more: [] }
    setLocationPresets(prev => [...dropUnfinished(prev), p])
    openEditor(p, true)
  }
  const updatePreset = (presetId, patch) => setLocationPresets(prev => prev.map(p => (p.id === presetId ? { ...p, ...patch } : p)))
  // Which page of each preset is being edited (1 = the first; a long preset carries on over more pages).
  const [presetPage, setPresetPage] = useState({})
  const pageOfPreset = (p) => Math.min(presetPage[p.id] || 1, 1 + (p.more || []).length)
  const valuesOfPage = (p, page) => (page <= 1 ? p.values : (p.more || [])[page - 2]) || {}
  const setPresetValue = (presetId, fieldId, val, page = 1) => setLocationPresets(prev => prev.map(p => {
    if (p.id !== presetId) return p
    if (page <= 1) return { ...p, values: { ...p.values, [fieldId]: val } }
    const more = [...(p.more || [])]
    more[page - 2] = { ...(more[page - 2] || {}), [fieldId]: val }
    return { ...p, more }
  }))
  const addPresetPage = (presetId) => {
    const p = locationPresets.find(x => x.id === presetId)
    setLocationPresets(prev => prev.map(x => (x.id === presetId ? { ...x, more: [...(x.more || []), {}] } : x)))
    setPresetPage(prev => ({ ...prev, [presetId]: 2 + ((p && p.more) || []).length }))
  }
  const removePresetPage = (presetId, page) => {
    if (page <= 1) return
    setLocationPresets(prev => prev.map(p => (p.id === presetId ? { ...p, more: (p.more || []).filter((_, i) => i !== page - 2) } : p)))
    setPresetPage(prev => ({ ...prev, [presetId]: page - 1 }))
  }
  const removePreset = (presetId) => {
    setLocationPresets(prev => prev.filter(p => p.id !== presetId))
    if (openPreset === presetId) { setOpenPreset(null); setPresetBackup(null); setPresetNote('') }
  }
  const duplicatePreset = (presetId) => {
    const src = locationPresets.find(p => p.id === presetId)
    if (!src) return
    const copy = { ...src, id: `p_${Date.now().toString(36)}`, name: '', values: { ...src.values }, more: (src.more || []).map(m => ({ ...m })) }
    setLocationPresets(prev => [...prev, copy])
    openEditor(copy, true)
  }

  const addField = () => setFields(prev => [...prev, blankField()])
  const removeField = (fieldId) => setFields(prev => prev.filter(f => f.id !== fieldId))
  const updateField = (fieldId, patch) =>
    setFields(prev => prev.map(f => (f.id === fieldId ? { ...f, ...patch } : f)))
  const moveField = (index, dir) => {
    setFields(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleSave = async () => {
    setError('')
    if (!name.trim()) { setError('Template name is required.'); return }
    if (fields.some(f => !f.label.trim())) { setError('Every field needs a label.'); return }
    // The attached PDF is the visual base every filled form is drawn onto —
    // without it there is nothing to generate a download from.
    if (!originalPdfBase64) {
      setError('A PDF is required. Use "Import Fields from PDF" to attach the form\'s PDF — filled forms are generated by drawing values onto it.')
      return
    }

    // A preset with no name cannot be picked from the list, so it is not saved.
    const namedPresets = locationPresets.filter(p => p.name.trim()).map(p => ({ ...p, name: p.name.trim() }))
    setSaving(true)
    // Kept for the offline demo store, which holds the PDF inline.
    const payload = {
      name: name.trim(),
      description: description.trim(),
      fields,
      approvalRoles,
      requiresApproval,
      locationPresets: namedPresets,
      originalPdf: originalPdfBase64 || undefined,
      originalPdfName: originalPdfName || undefined,
      formCode: formCode || undefined,
    }

    let body
    try {
      body = new FormData()
      // Sent as a file part, not a text field: the live host rejects text fields over
      // 128 KB, which a template with hundreds of input boxes exceeds.
      const metaJson = JSON.stringify({
        name: payload.name,
        description: payload.description,
        fields,
        approvalRoles,
        requiresApproval,
        locationPresets: namedPresets,
        originalPdfName: originalPdfName || 'template.pdf',
        formCode: formCode || undefined,
      })
      body.append('meta', new Blob([metaJson], { type: 'application/json' }), 'meta.json')
      body.append('pdf', base64ToBlob(originalPdfBase64), originalPdfName || 'template.pdf')
      // For the audit trail — templates carry no "who is editing this" field
      // of their own, unlike an entry's created_by.
      const actorId = getActorId()
      if (actorId) body.append('actorId', actorId)
      body.append('actorName', getActorName())
    } catch {
      setError('The attached PDF could not be read. Re-import it and try again.')
      setSaving(false)
      return
    }
    const sentBytes = body.get('pdf')?.size || 0

    let res
    try {
      const url = isEdit ? `${API_ENDPOINTS.ISO_FORMS_TEMPLATES}/${id}` : API_ENDPOINTS.ISO_FORMS_TEMPLATES
      // No Content-Type header — the browser sets the multipart boundary.
      res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', body })
    } catch {
      // The request never reached a server (no backend running / offline) —
      // only THEN fall back to the local demo store.
      if (isEdit) updateOfflineTemplate(id, payload)
      else addOfflineTemplate({ id: `local-${Date.now()}`, created_by_name: 'You (demo)', ...payload })
      setSaving(false)
      showToast('Could not reach the server — template saved in this browser only.', 'error')
      navigate(`${base}/templates`)
      return
    }

    // The server answered. ANY error status must be shown — silently writing to
    // the demo store here looked like "nothing happened": the list reloads from
    // the server (which works) and the localStorage copy is never displayed.
    if (!res.ok) {
      const message = await describeSaveFailure(res, sentBytes)
      setError(message)
      // Also a toast: the banner sits at the top of a long page, so on its own the
      // reason (a name already in use, say) is easy to miss.
      showToast(message, 'error')
      setSaving(false)
      return
    }

    setSaving(false)
    showToast(isEdit ? 'Template updated successfully!' : 'Template created successfully!', 'success')
    navigate(`${base}/templates`)
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading template…</div>
  }

  return (
    <div style={{ padding: 'clamp(24px, 4vw, 48px)', maxWidth: 860, margin: '0 auto' }}>
      <Link to={`${base}/templates`} className="back-link" style={{ display: 'inline-block', marginBottom: 12, fontSize: 13, textDecoration: 'none' }}>← Back</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>Form Templates</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 800, color: '#14141c' }}>
            {isEdit ? 'Edit Template' : 'New Template'}
          </h1>
        </div>
        <button type="button" className="ghost-btn" onClick={() => setShowImport(true)}>
          📄 Import Fields from PDF
        </button>
      </div>

      {originalPdfBase64 ? (
        <div style={{ background: '#e7f6ec', border: '1px solid #a8d5b5', color: '#1a7f4e', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>
            📎 PDF attached: <strong>{originalPdfName || 'template.pdf'}</strong> — filled forms are generated by drawing values onto this exact PDF.
            {unplacedCount > 0 && (
              <strong style={{ color: '#8a6100' }}> {unplacedCount} field(s) have no position yet.</strong>
            )}
          </span>
          <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button type="button" className="ghost-btn" onClick={() => setShowPositions(true)}>
              🎯 Field Positions
            </button>
            <button type="button" className="ghost-btn" onClick={() => setShowImport(true)}>
              Replace PDF
            </button>
          </span>
        </div>
      ) : (
        <div style={{ background: '#fff6e5', border: '1px solid #f2d9a0', color: '#8a6100', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: 14 }}>
          📄 No PDF attached yet. Import the form's PDF — it becomes the visual base that filled forms are generated from.
        </div>
      )}

      {error && (
        <div style={{ background: '#fdecea', border: '1px solid #f5c2c0', color: '#b42318', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <article className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Template Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Non-Conformance Report"
          style={{ width: '100%', padding: '12px 15px', border: '2px solid #e0e0e6', borderRadius: 12, fontSize: 14, boxSizing: 'border-box', marginBottom: 18 }}
        />
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Description (optional)</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What is this form used for?"
          rows={3}
          style={{ width: '100%', padding: '12px 15px', border: '2px solid #e0e0e6', borderRadius: 12, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
        />
      </article>

      <article className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Approval Roles</h3>
          {requiresApproval && <button type="button" onClick={addApprovalRole} className="ghost-btn small">+ Add Role</button>}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, marginBottom: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={requiresApproval} onChange={e => setRequiresApproval(e.target.checked)} />
          This form needs approval
        </label>
        {!requiresApproval && (
          <p style={{ margin: '0 0 6px', fontSize: 13, color: '#7a7a8c' }}>
            No approver is asked for when this form is filled. It is saved as In Process first, so whoever filled it can
            still change it or add pages, and they submit it themselves when it is ready. It does not appear in Pending
            Approvals, and no approval e-mail is sent.
          </p>
        )}
        <p style={{ margin: '0 0 14px', fontSize: 13, color: '#7a7a8c', display: requiresApproval ? 'block' : 'none' }}>
          {approvalRoles.length
            ? 'Everyone listed here must sign off independently before this form is fully approved.'
            : 'No named roles yet — this form uses a single "Approver". Add a role for each person who must sign off (e.g. "HOD QA", "HOD Operations").'}
        </p>
        {requiresApproval && approvalRoles.length === 0 && (
          // The single "Approver" a form shows when it has no named roles. Picking who it
          // may be given to here turns it into a real role (still keyed "approver", so
          // forms already filed keep working).
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Approver</div>
            <RoleLimits
              role={{}}
              departments={departments}
              employees={employees}
              onPatch={patch => setApprovalRoles([{ key: 'approver', label: 'Approver', ...patch }])}
            />
          </div>
        )}
        {requiresApproval && approvalRoles.map((role) => (
          <div key={role.key} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <SearchableSelect
              value={role.autoDepartment || ''}
              onChange={v => updateApprovalRole(role.key, {
                autoDepartment: v || undefined,
                label: v || '',
                defaultEmployeeId: undefined,
                defaultEmployeeName: undefined,
              })}
              options={departments.map(d => ({ value: d.name, label: d.name }))}
              emptyOptionLabel="No department"
              emptyOptionValue=""
              placeholder="Type to search department…"
              style={{ flex: 1, minWidth: 180, padding: '10px 14px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 14, cursor: 'text', boxSizing: 'border-box' }}
            />
            <SearchableSelect
              value={role.defaultEmployeeId || ''}
              onChange={v => {
                const emp = employees.find(e => String(e.id) === String(v))
                updateApprovalRole(role.key, {
                  defaultEmployeeId: v || undefined,
                  defaultEmployeeName: emp ? (emp.full_name || emp.name) : undefined,
                })
              }}
              options={employees
                .filter(e => e.department === role.autoDepartment)
                .map(e => ({ value: String(e.id), label: e.full_name || e.name, sub: e.employee_id }))}
              emptyOptionLabel="No default person"
              emptyOptionValue=""
              placeholder={role.autoDepartment ? 'Type to search employee…' : 'Pick a department first'}
              disabled={!role.autoDepartment}
              style={{ minWidth: 200, padding: '10px 14px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 14, cursor: 'text', boxSizing: 'border-box' }}
            />
            <button type="button" onClick={() => removeApprovalRole(role.key)} className="ghost-btn small">Remove</button>
          </div>
          <RoleLimits role={role} departments={departments} employees={employees} onPatch={patch => updateApprovalRole(role.key, patch)} />
          </div>
        ))}
      </article>

      {locationFields.length > 0 && (
        <article className="panel" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Location Presets</h3>
            <button type="button" onClick={addPreset} className="ghost-btn small">+ Add Preset</button>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#7a7a8c' }}>
            {locationPresets.length
              ? 'Whoever fills this form picks one of these from a "Select location" list and its location boxes are filled in for them.'
              : 'Add a preset for each place this form is used (for example "Karachi – Ground Floor") so people do not have to write the locations every time. A new office is just one more preset.'}
          </p>
          {locationPresets.map((preset) => (preset.id !== openPreset ? (
            <div
              key={preset.id}
              className="preset-row"
              role="button"
              tabIndex={0}
              onClick={() => openEditor(preset)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditor(preset) } }}
              title="Click to edit this preset"
            >
              <span className="preset-row-chevron" aria-hidden="true">›</span>
              <span className="preset-row-name">{preset.name.trim() || 'Untitled preset'}</span>
              <span className="preset-row-meta">
                {presetStats(preset).pages} page{presetStats(preset).pages === 1 ? '' : 's'} · {presetStats(preset).filled} location{presetStats(preset).filled === 1 ? '' : 's'} filled
              </span>
              <span className="preset-row-actions" onClick={e => e.stopPropagation()}>
                <button type="button" onClick={() => openEditor(preset)} className="ghost-btn small">Edit</button>
                <button type="button" onClick={() => duplicatePreset(preset.id)} className="ghost-btn small" title="A new preset that starts with the same locations">Duplicate</button>
                <button type="button" onClick={() => removePreset(preset.id)} className="ghost-btn small preset-remove">Remove</button>
              </span>
            </div>
          ) : (
            <div key={preset.id} className="preset-editor">
              <input
                type="text"
                autoFocus={!preset.name}
                value={preset.name}
                onChange={e => { updatePreset(preset.id, { name: e.target.value }); setPresetNote('') }}
                placeholder="Preset name, e.g. Karachi – Ground Floor"
                style={{ padding: '10px 14px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 14 }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                {Array.from({ length: 1 + (preset.more || []).length }, (_, i) => i + 1).map(n => (
                  <button key={n} type="button" className={n === pageOfPreset(preset) ? 'primary-btn small' : 'ghost-btn small'}
                    onClick={() => setPresetPage(prev => ({ ...prev, [preset.id]: n }))}>Page {n}</button>
                ))}
                <button type="button" className="ghost-btn small" onClick={() => addPresetPage(preset.id)}
                  title="This place has more locations than fit on one page: carry on over another page">+ Add page</button>
                {pageOfPreset(preset) > 1 && (
                  <button type="button" className="ghost-btn small preset-remove" onClick={() => removePresetPage(preset.id, pageOfPreset(preset))}>Remove this page</button>
                )}
                {(preset.more || []).length > 0 && (
                  <span style={{ fontSize: 12.5, color: '#7a7a8c' }}>Choosing this preset in the form adds these {1 + preset.more.length} pages by itself.</span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
                {locationFields.map(f => (
                  <label key={f.id} style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#595966' }}>
                    {f.label}
                    <input
                      type="text"
                      value={valuesOfPage(preset, pageOfPreset(preset))[f.id] || ''}
                      onChange={e => setPresetValue(preset.id, f.id, e.target.value, pageOfPreset(preset))}
                      style={{ padding: '8px 12px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 13, fontWeight: 400 }}
                    />
                  </label>
                ))}
              </div>
              {presetNote && <div style={{ fontSize: 13, color: '#b42318' }}>{presetNote}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="ghost-btn small" onClick={cancelPreset}>Cancel</button>
                <button type="button" className="primary-btn small" onClick={donePreset}>Done</button>
              </div>
            </div>
          )))}
        </article>
      )}

      <article className="panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Fields</h3>
          <button type="button" onClick={addField} className="ghost-btn small">+ Add Field</button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} style={{
            border: '1px solid #ececf0', borderRadius: 14, padding: 16, marginBottom: 14,
            display: 'grid', gap: 12,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12 }}>
              <input
                type="text"
                value={field.label}
                onChange={e => updateField(field.id, { label: e.target.value })}
                placeholder="Field label, e.g. Department"
                style={{ padding: '10px 14px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 14 }}
              />
              <StyledSelect
                value={field.type}
                onChange={v => updateField(field.id, { type: v })}
                options={[]}
                extraOptions={FIELD_TYPES}
                style={{ padding: '10px 14px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 14, cursor: 'pointer', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {hasOptions(field.type) && (
              <input
                type="text"
                value={field.options}
                onChange={e => updateField(field.id, { options: e.target.value })}
                placeholder="Comma-separated options, e.g. Hardware, Software, Network, Other"
                style={{ padding: '10px 14px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 14 }}
              />
            )}

            {/* Only for a field an approver fills in. A requester's picker starts as whoever
                is logged in, so there is nothing to limit. */}
            {(field.type === 'employee' || field.type === 'employee-self' || field.type === 'employee-multi') && (field.owner || 'requester') !== 'requester' && (
              // Limits who this field's picker offers (e.g. an "Approved by" field).
              // Nothing picked = every employee. Departments and named people add up.
              <div style={{ background: '#f7f7fa', border: '1px solid #ececf0', borderRadius: 10, padding: '12px 14px', display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#595966' }}>
                  Who can be picked in this field
                  <span style={{ fontWeight: 500, color: '#7a7a8c' }}> — leave both empty to allow everyone</span>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: '#7a7a8c', marginBottom: 4 }}>Only people from these departments</div>
                  <MultiSelect
                    value={(field.allowedDepartments || []).join(',')}
                    onChange={v => updateField(field.id, { allowedDepartments: v ? v.split(',').map(x => x.trim()).filter(Boolean) : undefined })}
                    options={departments.map(d => d.name)}
                    placeholder="Any department"
                    searchPlaceholder="Search departments…"
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: '#7a7a8c', marginBottom: 4 }}>And / or only these people</div>
                  <EmployeeMultiPicker
                    value={field.allowedEmployeeIds || []}
                    onChange={ids => updateField(field.id, { allowedEmployeeIds: ids.length ? ids : undefined })}
                    employees={employees}
                    style={{ width: '100%', padding: '10px 14px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 14, cursor: 'text', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#595966', flexShrink: 0 }}>Filled by:</span>
              <StyledSelect
                value={field.owner || 'requester'}
                onChange={v => updateField(field.id, { owner: v })}
                options={[]}
                extraOptions={ownerOptionsFor(approvalRoles)}
                style={{ padding: '8px 12px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 13, cursor: 'pointer', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#595966' }}>
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={e => updateField(field.id, { required: e.target.checked })}
                />
                Required
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className="ghost-btn small">↑</button>
                <button type="button" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="ghost-btn small">↓</button>
                <button type="button" onClick={() => removeField(field.id)} disabled={fields.length === 1} className="ghost-btn small">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </article>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
        <button type="button" className="ghost-btn" onClick={() => navigate(`${base}/templates`)}>Cancel</button>
        <button type="button" className="primary-btn" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Template'}
        </button>
      </div>

      {showImport && (
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, color: '#fff', fontSize: 14 }}>Loading…</div>}>
          <PdfImportModal
            onImport={handlePdfImport}
            onClose={() => setShowImport(false)}
          />
        </Suspense>
      )}

      {showPositions && originalPdfBase64 && (
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, color: '#fff', fontSize: 14 }}>Loading…</div>}>
          <FieldPositionEditor
            pdfBase64={originalPdfBase64}
            fields={fields.filter(f => f.label.trim())}
            approvalRoles={approvalRoles}
            onClose={() => setShowPositions(false)}
            onSave={(updated) => {
              setFields(prev => {
                // The editor holds every field it was given: what came back is
                // the whole list, in the order it was left in there — including
                // fields added and minus any deleted. Rebuilding from `prev`
                // instead kept this page's order, so reordering fields in the
                // editor quietly did nothing.
                const sentToEditor = new Set(prev.filter(f => f.label.trim()).map(f => f.id))
                const neverSent = prev.filter(f => !sentToEditor.has(f.id))
                return [...updated, ...neverSent]
              })
              setShowPositions(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

export default TemplateBuilder
