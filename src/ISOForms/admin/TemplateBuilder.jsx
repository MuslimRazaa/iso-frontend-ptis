import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'
import { getOfflineTemplate, addOfflineTemplate, updateOfflineTemplate } from '../utils/offlineStore'
import PdfImportModal from '../components/PdfImportModal'
import FieldPositionEditor from './FieldPositionEditor'
import { isPlaced } from '../utils/pdfCoords'
import { FIELD_TYPES, blankField, hasOptions, blankApprovalRole, ownerOptionsFor } from '../utils/fieldTypes'
import StyledSelect from '../../components/StyledSelect'

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
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])

  // For the "auto-assign from department" picker on each role — resolved to
  // whichever employee is marked as that department's HOD at submit time.
  // Employees are fetched too so the picker can show WHO that actually is
  // right now, not just the bare department name.
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

  const hodNameFor = (deptName) => {
    const hod = employees.find(e =>
      e.department === deptName && (e.is_department_hod === 1 || e.is_department_hod === true))
    return hod?.full_name || hod?.name || null
  }
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

    setSaving(true)
    // Kept for the offline demo store, which holds the PDF inline.
    const payload = {
      name: name.trim(),
      description: description.trim(),
      fields,
      approvalRoles,
      originalPdf: originalPdfBase64 || undefined,
      originalPdfName: originalPdfName || undefined,
      formCode: formCode || undefined,
    }

    let body
    try {
      body = new FormData()
      body.append('data', JSON.stringify({
        name: payload.name,
        description: payload.description,
        fields,
        approvalRoles,
        originalPdfName: originalPdfName || 'template.pdf',
        formCode: formCode || undefined,
      }))
      body.append('pdf', base64ToBlob(originalPdfBase64), originalPdfName || 'template.pdf')
      // For the audit trail — templates carry no "who is editing this" field
      // of their own, unlike an entry's created_by.
      const actorId = localStorage.getItem('userEmployeeId') || localStorage.getItem('userEmail') || ''
      const actorName = localStorage.getItem('userFullName') || localStorage.getItem('userEmail') || 'Admin'
      if (actorId) body.append('actorId', actorId)
      body.append('actorName', actorName)
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
      navigate(`${base}/templates`)
      return
    }

    // The server answered. ANY error status must be shown — silently writing to
    // the demo store here looked like "nothing happened": the list reloads from
    // the server (which works) and the localStorage copy is never displayed.
    if (!res.ok) {
      setError(await describeSaveFailure(res, sentBytes))
      setSaving(false)
      return
    }

    setSaving(false)
    navigate(`${base}/templates`)
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading template…</div>
  }

  return (
    <div style={{ padding: 'clamp(24px, 4vw, 48px)', maxWidth: 860, margin: '0 auto' }}>
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
          <button type="button" onClick={addApprovalRole} className="ghost-btn small">+ Add Role</button>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: '#7a7a8c' }}>
          {approvalRoles.length
            ? 'Everyone listed here must sign off independently before this form is fully approved.'
            : 'No named roles yet — this form uses a single "Approver". Add a role for each person who must sign off (e.g. "HOD QA", "HOD Operations").'}
        </p>
        {approvalRoles.map((role) => (
          <div key={role.key} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <input
              type="text"
              value={role.label}
              onChange={e => updateApprovalRole(role.key, { label: e.target.value })}
              placeholder="Role name, e.g. HOD QA"
              style={{ flex: 1, padding: '10px 14px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }}
            />
            <StyledSelect
              value={role.autoDepartment || ''}
              onChange={v => updateApprovalRole(role.key, { autoDepartment: v || undefined })}
              options={[]}
              extraOptions={departments.map(d => {
                const hodName = hodNameFor(d.name)
                return { value: d.name, label: hodName ? `${d.name} — ${hodName}` : `${d.name} (no HOD marked yet)` }
              })}
              emptyOptionLabel="No auto-assign"
              emptyOptionValue=""
              placeholder="Auto-assign from department…"
              style={{ minWidth: 200, padding: '10px 14px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}
            />
            <button type="button" onClick={() => removeApprovalRole(role.key)} className="ghost-btn small">Remove</button>
          </div>
        ))}
      </article>

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
        <PdfImportModal
          onImport={handlePdfImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {showPositions && originalPdfBase64 && (
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
      )}
    </div>
  )
}

export default TemplateBuilder
