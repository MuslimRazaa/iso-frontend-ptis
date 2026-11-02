import React from 'react'
import { X } from 'lucide-react'

// The Add / Edit entry modal as the Job Log shows it — icon header with a one-line
// subtitle, titled sections, labelled fields in a grid, Cancel / primary buttons pinned at
// the bottom — so other modules' forms can look the same. The look itself comes from the
// shared .modal-* / .form-row classes; this only supplies the pieces.

// Inline look for dropdown/date triggers, which the CSS only reaches as <input>/<select>.
export const modalFieldStyle = {
  border: '1px solid #dcdce3',
  borderRadius: 14,
  padding: '12px 14px',
  background: '#f9f9fb',
  color: '#14141c',
  fontFamily: 'inherit',
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
}
export const modalFieldStyleDisabled = { ...modalFieldStyle, background: '#f4f4f7', color: '#aaa', cursor: 'not-allowed' }

// Fields never push the modal wider than itself (no sideways scroll): the grid columns can
// shrink, and inputs are border-box.
const FIT_CSS = `
.fmk .modal-form { overflow-x: hidden; }
.fmk .form-row { grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); }
.fmk .field-col, .fmk .field-col > * { min-width: 0; }
.fmk { --fmk-border: #dcdce3; }
/* The global .form-row input[type=text|number] rule adds 20px side margins and a black border; these fields use the Job Log look instead. */
.fmk .modal-form input:not([type="radio"]):not([type="checkbox"]), .fmk .modal-form textarea {
  box-sizing: border-box; width: 100%; max-width: 100%; margin: 0; padding: 12px 14px;
  border: 1px solid var(--fmk-border); border-radius: 14px;
}
.fmk .modal-form input:not([type="radio"]):not([type="checkbox"]):focus, .fmk .modal-form textarea:focus { border-color: #d7263d; }
`

// Dark theme: the same markup, recoloured.
const DARK_CSS = `
.fmk-dark.modal-content { background: #1e293b; border-color: #334155; --fmk-border: #334155; }
.fmk-dark .modal-header h2, .fmk-dark .modal-form label, .fmk-dark .modal-form .field-col,
.fmk-dark .form-row label > span, .fmk-dark .fmk-section-title { color: #f1f5f9 !important; }
.fmk-dark .modal-form input, .fmk-dark .modal-form textarea, .fmk-dark .modal-form select,
.fmk-dark .form-row input, .fmk-dark .form-row textarea { background: #0f172a; border-color: #334155; color: #f1f5f9; }
.fmk-dark .modal-actions { background: #1e293b; border-top-color: #334155; }
.fmk-dark .fmk-section { border-bottom-color: #334155 !important; }
.fmk-dark .ghost-btn { background: transparent; color: #e2e8f0; border-color: #475569; }
.fmk-dark .fmk-note { color: #94a3b8 !important; }
`

export function ModalSection({ Icon, title, hint }) {
  return (
    <div className="fmk-section" style={{
      display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 12px',
      paddingBottom: 10, borderBottom: '1px solid #efeff2',
    }}>
      <span style={{
        width: 30, height: 30, borderRadius: 8, background: '#fdf2f3', color: '#d7263d',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0,
      }}>{Icon ? <Icon /> : null}</span>
      <span className="fmk-section-title" style={{ fontSize: 12.5, fontWeight: 700, color: '#32323c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      {hint && <span className="fmk-note" style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#9a9aaa', letterSpacing: '0.04em' }}>{hint}</span>}
    </div>
  )
}

// A labelled field. `note` is the small grey line under it.
export function ModalField({ label, required, note, children, span }) {
  return (
    <div className="field-col" style={span ? { gridColumn: '1 / -1' } : undefined}>
      <span>{label}{required ? ' *' : ''}</span>
      {children}
      {note && <span className="fmk-note" style={{ fontSize: 12, color: '#9a9aaa', fontWeight: 400 }}>{note}</span>}
    </div>
  )
}

export function ModalFrame({ Icon, title, subtitle, onClose, onSubmit, children, actions, maxWidth = 700, dark = false, zIndex }) {
  return (
    <div className="modal-overlay" style={zIndex ? { zIndex } : undefined}>
      <style>{FIT_CSS + (dark ? DARK_CSS : '')}</style>
      <div className={`modal-content fmk${dark ? ' fmk-dark' : ''}`} style={{ maxWidth }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: '#fdf2f3', border: '1px solid #ffd1d8', color: '#d7263d',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
            }}>{Icon ? <Icon /> : null}</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
              {subtitle && <p className="fmk-note" style={{ margin: 0, fontSize: 13, color: '#7a7a8c' }}>{subtitle}</p>}
            </div>
          </div>
          <button type="button" className="close-modal-btn" onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center' }}><X size={18} /></button>
        </div>
        <form className="modal-form" onSubmit={onSubmit}>
          {children}
          <div className="modal-actions">{actions}</div>
        </form>
      </div>
    </div>
  )
}

// Cancel + the main button, as the Job Log's footer.
export function ModalButtons({ onCancel, busy, label, busyLabel, disabled }) {
  return (
    <>
      <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
      <button type="submit" className="primary-btn" disabled={busy || disabled}>{busy ? (busyLabel || 'Saving…') : label}</button>
    </>
  )
}

// A file picker row: the current file (with optional Download / Remove), Choose button, the
// picked file's name. The hidden <input type=file> stays with the caller (it owns the ref).
export function ModalFilePick({ current, onDownload, onRemove, onChoose, chooseLabel = 'Choose File', fileName, emptyLabel = 'No file chosen', disabled, note }) {
  return (
    <div>
      {note && <div className="fmk-note" style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 10, background: '#f4f4f7', color: '#7a7a8c', fontSize: 12, fontWeight: 400 }}>{note}</div>}
      {current && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 10, background: '#f9f9fb', border: '1px solid #dcdce3', marginBottom: 10, fontWeight: 400 }}>
          <span style={{ fontSize: 13 }}>Current: {current}</span>
          {onDownload && <button type="button" className="ghost-btn small" onClick={onDownload}>Download</button>}
          {onRemove && <button type="button" className="ghost-btn small" onClick={onRemove} style={{ color: '#d7263d' }}>Remove</button>}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" className="ghost-btn" onClick={onChoose} disabled={disabled}>{chooseLabel}</button>
        <span className="fmk-note" style={{ fontSize: 12, color: '#7a7a8c', fontWeight: 400 }}>{fileName || emptyLabel}</span>
      </div>
    </div>
  )
}

// Two or more side-by-side choices (Yes / No …), one picked.
export function ModalChoice({ value, onChange, choices, name }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {choices.map(c => {
        const on = String(value) === String(c.value)
        return (
          <label key={c.value} className="checkbox-label" style={{
            flex: 1, minWidth: 150, justifyContent: 'center', padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
            border: `1px solid ${on ? (c.tone || '#d7263d') : '#dcdce3'}`,
            background: on ? (c.bg || '#fff5f6') : '#f9f9fb',
            color: on ? (c.tone || '#d7263d') : '#7a7a8c', fontWeight: 600, fontSize: 14,
          }}>
            <input type="radio" name={name} value={c.value} checked={on} onChange={onChange} style={{ display: 'none' }} />
            {c.label}
          </label>
        )
      })}
    </div>
  )
}
