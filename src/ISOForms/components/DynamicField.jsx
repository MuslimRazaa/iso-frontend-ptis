import React from 'react'
import { signatureLines } from '../utils/signature'

const inputStyle = {
  width: '100%', padding: '12px 15px', border: '2px solid #e0e0e6',
  borderRadius: 12, fontSize: 14, boxSizing: 'border-box',
}


// Renders one template field, either as an editable input (readOnly=false)
// or as a plain value display (readOnly=true) for already-submitted forms.
// `employees` is only needed for the 'employee' field type (picker sourced
// from Employee Management), to resolve a stored employee id to a name.
// `signerName` is who a signature field signs as when its name is left blank —
// the logged-in user, resolved by the page that owns the form.
function DynamicField({ field, value, onChange, readOnly, employees = [], signerName = '' }) {
  const options = (field.options || '').split(',').map(o => o.trim()).filter(Boolean)

  if (field.type === 'signature') {
    const sealed = Boolean(value?.at)
    const lines = signatureLines(value)

    // Already sealed — on a submitted form, or on one being revised. It reads
    // as the signature it is, and cannot be edited: revising a form corrects
    // what it says, it does not re-sign it.
    if (readOnly || sealed) {
      return (
        <div style={{ fontSize: 14, color: '#14141c', lineHeight: 1.35 }}>
          {lines.length ? (
            <>
              <div style={{ fontWeight: 600 }}>{lines[0]}</div>
              {lines[1] && <div style={{ fontSize: 12.5, color: '#7a7a8c' }}>{lines[1]}</div>}
            </>
          ) : '—'}
        </div>
      )
    }

    // Not signed yet. The name can be typed, because forms are routinely filled
    // for people who are not in the employee list; left alone it signs as
    // whoever is logged in. The date is not offered — it is stamped on submit,
    // which is the part that has to stay trustworthy.
    return (
      <div>
        <input
          type="text"
          value={value?.name ?? ''}
          placeholder={signerName || 'Name of the person signing'}
          onChange={(e) => onChange({ ...(value || {}), name: e.target.value })}
          style={inputStyle}
        />
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#7a7a8c' }}>
          {signerName ? `Leave blank to sign as ${signerName}. ` : ''}
          The date is added automatically
          {field.owner === 'approver' ? ' when the form is approved.' : ' when the form is submitted.'}
        </p>
      </div>
    )
  }

  if (readOnly) {
    let display = '—'
    if (field.type === 'checkbox') display = value ? 'Yes' : 'No'
    else if (field.type === 'checkbox-group') display = Array.isArray(value) && value.length ? value.join(', ') : '—'
    else if (field.type === 'employee') {
      const emp = employees.find(e => String(e.id) === String(value))
      display = emp ? (emp.full_name || emp.name) : (value ? String(value) : '—')
    }
    else if (value !== undefined && value !== null && value !== '') display = String(value)
    return <div style={{ fontSize: 14, color: '#14141c' }}>{display}</div>
  }

  const common = { value: value ?? '', onChange: (e) => onChange(e.target.value), style: inputStyle }

  switch (field.type) {
    case 'textarea':
      return <textarea rows={4} {...common} style={{ ...inputStyle, resize: 'vertical' }} />
    case 'number':
      return <input type="number" {...common} />
    case 'date':
      return <input type="date" {...common} />
    case 'dropdown':
      return (
        <select {...common} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">Select…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    case 'checkbox':
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          Yes
        </label>
      )
    case 'checkbox-group': {
      const selected = Array.isArray(value) ? value : []
      const toggle = (opt) => {
        onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt])
      }
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {options.map(o => (
            <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
              <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
              {o}
            </label>
          ))}
        </div>
      )
    }
    case 'employee':
      return (
        <select {...common} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">Select employee…</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name || emp.name}{(emp.department_name || emp.department) ? ` — ${emp.department_name || emp.department}` : ''}
            </option>
          ))}
        </select>
      )
    default:
      return <input type="text" {...common} />
  }
}

export default DynamicField
