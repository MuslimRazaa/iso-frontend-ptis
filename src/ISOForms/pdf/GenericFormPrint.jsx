import React from 'react'
import ptisLogo from '/ptisLogo.png'

const cell  = { border: '1px solid #000', padding: '6px 10px', fontSize: 11, verticalAlign: 'top' }
const label = { ...cell, fontWeight: 700, width: '34%' }
const value = { ...cell }

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const displayValue = (field, raw, employees) => {
  if (field.type === 'checkbox') return raw ? 'Yes' : 'No'
  if (field.type === 'checkbox-group') return Array.isArray(raw) && raw.length ? raw.join(', ') : ''
  if (field.type === 'date') return fmtDate(raw)
  if (field.type === 'employee') {
    const emp = employees.find(e => String(e.id) === String(raw))
    return emp ? (emp.full_name || emp.name) : (raw ?? '')
  }
  return raw ?? ''
}

// Generic letterhead + field-list layout, used for any template that isn't
// the bespoke Document Change Request Form above.
function GenericFormPrint({ entry, template, formValues, approverValues, employees = [] }, ref) {
  const requesterFields = (template?.fields || []).filter(f => (f.owner || 'requester') === 'requester')
  const approverFields  = (template?.fields || []).filter(f => f.owner === 'approver')

  return (
    <div ref={ref} style={{ width: 794, padding: 28, background: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>
          <tr>
            <td style={{ ...cell, width: '14%', textAlign: 'center', verticalAlign: 'middle' }}>
              <img src={ptisLogo} alt="PTIS" style={{ height: 36 }} />
            </td>
            <td style={{ ...cell, fontWeight: 700, fontSize: 16 }}>
              {template?.name || `Form #${entry.id}`}
              <div style={{ fontWeight: 400, fontSize: 12, marginTop: 4 }}>{template?.description || ''}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
        <tbody>
          <tr><td style={label}>Created By</td><td style={value}>{entry.created_by_name || entry.created_by || ''}</td></tr>
          <tr><td style={label}>Related To</td><td style={value}>{entry.related_employee_name || entry.related_employee_id || ''}</td></tr>
          <tr><td style={label}>Submitted</td><td style={value}>{fmtDate(entry.created_at)}</td></tr>
          <tr><td style={label}>Status</td><td style={value}>{(entry.status || 'pending')}</td></tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
        <tbody>
          {requesterFields.map(f => (
            <tr key={f.id}><td style={label}>{f.label}</td><td style={value}>{displayValue(f, formValues[f.id], employees)}</td></tr>
          ))}
        </tbody>
      </table>

      {approverFields.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
          <tbody>
            {approverFields.map(f => (
              <tr key={f.id}><td style={label}>{f.label}</td><td style={value}>{displayValue(f, approverValues[f.id], employees)}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      {entry.remarks && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr><td style={label}>Remarks</td><td style={value}>{entry.remarks}</td></tr>
            <tr><td style={label}>Decided</td><td style={value}>{fmtDate(entry.decided_at)}</td></tr>
          </tbody>
        </table>
      )}
    </div>
  )
}

export default React.forwardRef(GenericFormPrint)
