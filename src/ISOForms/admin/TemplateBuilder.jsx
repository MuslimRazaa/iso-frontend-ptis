import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'
import { getOfflineTemplate, addOfflineTemplate, updateOfflineTemplate } from '../utils/offlineStore'

const FIELD_TYPES = [
  { value: 'text',           label: 'Short Text' },
  { value: 'textarea',       label: 'Long Text' },
  { value: 'number',         label: 'Number' },
  { value: 'date',           label: 'Date' },
  { value: 'dropdown',       label: 'Dropdown (single choice)' },
  { value: 'checkbox',       label: 'Checkbox (yes/no)' },
  { value: 'checkbox-group', label: 'Checkbox Group (multi-select)' },
  { value: 'employee',       label: 'Employee Picker (from Employee Management)' },
]

const OWNERS = [
  { value: 'requester', label: 'Requester — filled when submitting' },
  { value: 'approver',  label: 'Approver — filled at approve/reject time' },
]

const blankField = () => ({
  id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  label: '',
  type: 'text',
  required: false,
  options: '',
  owner: 'requester',
})

function TemplateBuilder() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const base = isUserSide ? '/user/iso-forms' : '/iso-forms'
  const isEdit = Boolean(id)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState([blankField()])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    let active = true
    const applyTemplate = (json) => {
      if (!active || !json) return
      setName(json.name || '')
      setDescription(json.description || '')
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

    setSaving(true)
    const payload = { name: name.trim(), description: description.trim(), fields }
    try {
      const url = isEdit ? `${API_ENDPOINTS.ISO_FORMS_TEMPLATES}/${id}` : API_ENDPOINTS.ISO_FORMS_TEMPLATES
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      // No backend yet — save into the local demo store instead so the template is still usable.
      if (isEdit) updateOfflineTemplate(id, payload)
      else addOfflineTemplate({ id: `local-${Date.now()}`, created_by_name: 'You (demo)', ...payload })
    } finally {
      setSaving(false)
    }
    navigate(`${base}/templates`)
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading template…</div>
  }

  return (
    <div style={{ padding: 'clamp(24px, 4vw, 48px)', maxWidth: 860, margin: '0 auto' }}>
      <p className="eyebrow" style={{ margin: 0 }}>Form Templates</p>
      <h1 style={{ margin: '4px 0 24px', fontSize: 26, fontWeight: 800, color: '#14141c' }}>
        {isEdit ? 'Edit Template' : 'New Template'}
      </h1>

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
              <select
                value={field.type}
                onChange={e => updateField(field.id, { type: e.target.value })}
                style={{ padding: '10px 14px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}
              >
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {(field.type === 'dropdown' || field.type === 'checkbox-group') && (
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
              <select
                value={field.owner || 'requester'}
                onChange={e => updateField(field.id, { owner: e.target.value })}
                style={{ padding: '8px 12px', border: '2px solid #e0e0e6', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}
              >
                {OWNERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
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
    </div>
  )
}

export default TemplateBuilder
