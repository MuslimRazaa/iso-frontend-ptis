import React, { useRef, useState } from 'react'
import { parsePdf, pdfToBase64, enrichSeedFieldsWithCoords } from '../utils/parsePdf'
import { SEED_TEMPLATES } from '../seedTemplates'

const FIELD_TYPES = [
  { value: 'text',           label: 'Short Text' },
  { value: 'textarea',       label: 'Long Text' },
  { value: 'number',         label: 'Number' },
  { value: 'date',           label: 'Date' },
  { value: 'dropdown',       label: 'Dropdown' },
  { value: 'checkbox',       label: 'Checkbox (yes/no)' },
  { value: 'checkbox-group', label: 'Checkbox Group' },
  { value: 'employee',       label: 'Employee Picker' },
]

const OWNERS = [
  { value: 'requester', label: 'Requester' },
  { value: 'approver',  label: 'Approver' },
]

// Map known form codes to their seed template
const KNOWN_FORM_MAP = {
  'FM-001-04': SEED_TEMPLATES.find(t => t.id === 'seed-fm-001-04'),
  'FM-002-01': SEED_TEMPLATES.find(t => t.id === 'seed-fm-002-01'),
}

function PdfImportModal({ onImport, onClose }) {
  const fileRef = useRef(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState(null)
  const [pdfBase64, setPdfBase64] = useState(null)
  const [pdfName, setPdfName] = useState('')
  const [detectedCode, setDetectedCode] = useState(null)
  const [usingPreset, setUsingPreset] = useState(false)
  const [selected, setSelected] = useState(new Set())

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.')
      return
    }
    setError('')
    setParsing(true)
    try {
      const [{ fields: detected, detectedFormCode, allItems }, base64] = await Promise.all([
        parsePdf(file),
        pdfToBase64(file),
      ])

      setPdfBase64(base64)
      setPdfName(file.name)
      setDetectedCode(detectedFormCode)

      // If it's a known PTIS form, load pre-defined fields enriched with
      // coordinates from the actual PDF so pdf-lib can overlay values correctly.
      if (detectedFormCode && KNOWN_FORM_MAP[detectedFormCode]) {
        const rawPreset = KNOWN_FORM_MAP[detectedFormCode].fields.map(f => ({ ...f }))
        const enriched = enrichSeedFieldsWithCoords(rawPreset, allItems)
        setFields(enriched)
        setSelected(new Set(enriched.map(f => f.id)))
        setUsingPreset(true)
      } else {
        setFields(detected)
        setSelected(new Set(detected.map(f => f.id)))
        setUsingPreset(false)
      }
    } catch (e) {
      console.error('PDF parse error:', e)
      setError('Could not parse this PDF. Make sure it is a text-based (non-scanned) PDF.')
    } finally {
      setParsing(false)
    }
  }

  const switchToExtracted = () => {
    // Re-parse was not stored; for simplicity just clear and let user re-upload
    setFields(null)
    setPdfBase64(null)
    setDetectedCode(null)
    setUsingPreset(false)
  }

  const updateField = (id, patch) =>
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))

  const toggleSelect = (id) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleImport = () => {
    const chosen = fields.filter(f => selected.has(f.id) && f.label.trim())
    onImport(chosen, pdfBase64, pdfName, detectedCode)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 760,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px', borderBottom: '1px solid #ececf0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#14141c' }}>Import Template from PDF</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7a7a8c' }}>
              Upload your form PDF — we'll extract field labels. Review, then import into the template builder.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#7a7a8c', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 28 }}>
          {/* Drop zone */}
          {!fields && (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
              style={{
                border: '2px dashed #d7263d', borderRadius: 16, padding: '48px 24px',
                textAlign: 'center', cursor: 'pointer',
                background: parsing ? '#fff7f7' : '#fff',
                transition: 'background 0.2s',
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 12 }}>📄</div>
              {parsing ? (
                <p style={{ margin: 0, color: '#d7263d', fontWeight: 600 }}>Extracting fields from PDF…</p>
              ) : (
                <>
                  <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#14141c' }}>Click or drag & drop your PDF here</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#7a7a8c' }}>Text-based PDFs only (not scanned images)</p>
                </>
              )}
              <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>
          )}

          {error && (
            <div style={{ background: '#fdecea', border: '1px solid #f5c2c0', color: '#b42318', borderRadius: 12, padding: '12px 16px', marginTop: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* Review panel */}
          {fields && (
            <>
              {/* Known form banner */}
              {usingPreset && detectedCode && (
                <div style={{
                  background: '#e7f6ec', border: '1px solid #a3d9b1', borderRadius: 12,
                  padding: '12px 16px', marginBottom: 16,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                }}>
                  <div style={{ fontSize: 14, color: '#1a7f4e' }}>
                    <strong>✓ Recognised PTIS form ({detectedCode})</strong> — loaded {fields.length} pre-defined fields with correct types and owners.
                  </div>
                  <button
                    className="ghost-btn small"
                    onClick={switchToExtracted}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Use extracted instead
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#14141c' }}>📎 {pdfName}</div>
                  <div style={{ fontSize: 13, color: '#7a7a8c', marginTop: 2 }}>
                    {fields.length} field{fields.length !== 1 ? 's' : ''} — tick to include, edit label / type / owner as needed.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="ghost-btn small"
                    onClick={() => setSelected(selected.size === fields.length ? new Set() : new Set(fields.map(f => f.id)))}
                  >
                    {selected.size === fields.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button className="ghost-btn small" onClick={() => { setFields(null); setPdfBase64(null); setDetectedCode(null); setUsingPreset(false) }}>
                    Change PDF
                  </button>
                </div>
              </div>

              {fields.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#7a7a8c', background: '#fafafb', borderRadius: 12 }}>
                  No field labels detected. This PDF may be a scanned image — try a text-based PDF, or add fields manually in the builder.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                  {fields.map(f => (
                    <div key={f.id} style={{
                      display: 'grid', gridTemplateColumns: '32px 1fr 140px 100px 100px', gap: 10, alignItems: 'center',
                      padding: '12px 14px', border: '1px solid #ececf0', borderRadius: 12,
                      background: selected.has(f.id) ? '#fff' : '#fafafb',
                      opacity: selected.has(f.id) ? 1 : 0.5,
                    }}>
                      <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleSelect(f.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                      <input
                        type="text"
                        value={f.label}
                        onChange={e => updateField(f.id, { label: e.target.value })}
                        style={{ padding: '8px 12px', border: '1px solid #e0e0e6', borderRadius: 10, fontSize: 13 }}
                      />
                      <select
                        value={f.type}
                        onChange={e => updateField(f.id, { type: e.target.value })}
                        style={{ padding: '8px 10px', border: '1px solid #e0e0e6', borderRadius: 10, fontSize: 12, cursor: 'pointer' }}
                      >
                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <select
                        value={f.owner}
                        onChange={e => updateField(f.id, { owner: e.target.value })}
                        style={{ padding: '8px 10px', border: '1px solid #e0e0e6', borderRadius: 10, fontSize: 12, cursor: 'pointer' }}
                      >
                        {OWNERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#595966' }}>
                        <input type="checkbox" checked={f.required} onChange={e => updateField(f.id, { required: e.target.checked })} />
                        Required
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {/* Options for checkbox-group / dropdown */}
              {fields.filter(f => selected.has(f.id) && (f.type === 'checkbox-group' || f.type === 'dropdown')).length > 0 && (
                <div style={{ background: '#fafafb', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#595966', marginBottom: 10 }}>Options (comma-separated) for checkbox/dropdown fields:</div>
                  {fields.filter(f => selected.has(f.id) && (f.type === 'checkbox-group' || f.type === 'dropdown')).map(f => (
                    <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: '#14141c', fontWeight: 500 }}>{f.label}</span>
                      <input
                        type="text"
                        value={f.options}
                        onChange={e => updateField(f.id, { options: e.target.value })}
                        placeholder="Option1, Option2, Option3"
                        style={{ padding: '8px 12px', border: '1px solid #e0e0e6', borderRadius: 10, fontSize: 13 }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="ghost-btn" onClick={onClose}>Cancel</button>
                <button
                  className="primary-btn"
                  disabled={selected.size === 0}
                  onClick={handleImport}
                >
                  Import {selected.size} Field{selected.size !== 1 ? 's' : ''} →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PdfImportModal
