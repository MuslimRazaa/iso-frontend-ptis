import React from 'react'
import ptisLogo from '/ptisLogo.png'

const cell    = { border: '1px solid #000', padding: '6px 10px', fontSize: 11, verticalAlign: 'top' }
const label   = { ...cell, fontWeight: 700 }
const value   = { ...cell }
const section = { ...cell, fontWeight: 700, textAlign: 'center', background: '#dfe1ee', fontSize: 11, textTransform: 'uppercase' }

const Box = ({ checked }) => (
  <span style={{
    display: 'inline-block', width: 10, height: 10,
    border: '1px solid #000', marginRight: 5, verticalAlign: 'middle',
    background: checked ? '#000' : '#fff',
  }} />
)
const Opt = ({ checked, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 14, marginBottom: 4, whiteSpace: 'nowrap' }}>
    <Box checked={checked} />{children}
  </span>
)

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Renders a field's value the same way for every field type — checkboxes and
// checkbox-groups get real ticked/unticked boxes (matching how the bespoke
// PTIS form layouts draw them) instead of being flattened to plain text.
const FieldValue = ({ field, raw, employees }) => {
  if (field.type === 'checkbox') {
    return <Opt checked={Boolean(raw)}>{raw ? 'Yes' : 'No'}</Opt>
  }
  if (field.type === 'checkbox-group' || field.type === 'dropdown') {
    const options = (field.options || '').split(',').map(o => o.trim()).filter(Boolean)
    const selected = field.type === 'dropdown' ? [raw].filter(Boolean) : (Array.isArray(raw) ? raw : [])
    if (!options.length) return <span>{Array.isArray(raw) ? raw.join(', ') : (raw ?? '')}</span>
    return (
      <span style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
        {options.map(opt => <Opt key={opt} checked={selected.includes(opt)}>{opt}</Opt>)}
      </span>
    )
  }
  if (field.type === 'date') return <span>{fmtDate(raw)}</span>
  if (field.type === 'employee') {
    const emp = employees.find(e => String(e.id) === String(raw))
    return <span>{emp ? (emp.full_name || emp.name) : (raw ?? '')}</span>
  }
  return <span style={{ whiteSpace: 'pre-wrap' }}>{raw ?? ''}</span>
}

// Generic letterhead + field-list layout, used for any template that isn't
// one of the bespoke, hand-built PTIS form layouts (Document Change Request,
// Corrective Action Request, Requisition Form). Mirrors those forms' shared
// visual convention (Title/Code/Issue header table with the PTIS logo, boxed
// sections, real checkbox marks) so any newly imported PDF still comes out
// looking like an official PTIS form even without a bespoke layout being
// hand-built for it.
function GenericFormPrint({ entry, template, formValues, approverValues, employees = [] }, ref) {
  const requesterFields = (template?.fields || []).filter(f => (f.owner || 'requester') === 'requester')
  const approverFields  = (template?.fields || []).filter(f => f.owner === 'approver')

  return (
    <div ref={ref} style={{ width: 794, padding: 28, background: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <h2 style={{ textAlign: 'center', margin: '0 0 10px', fontSize: 17 }}>
        Premier Tubular Inspection Services (Pvt) Ltd.
      </h2>

      {/* Header table — same Title/Code/Issue convention as every PTIS form */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
        <tbody>
          <tr>
            <td style={{ ...label, width: '10%' }}>Title</td>
            <td style={cell}>{template?.name || `Form #${entry.id}`}</td>
            <td style={{ ...label, width: '8%' }}>Code</td>
            <td style={{ ...cell, width: '15%' }}>{template?.formCode || '—'}</td>
            <td rowSpan={template?.description ? 1 : 2} style={{ ...cell, width: '13%', textAlign: 'center', verticalAlign: 'middle' }}>
              <img src={ptisLogo} alt="PTIS" style={{ height: 34 }} />
            </td>
          </tr>
          {template?.description && (
            <tr>
              <td colSpan={4} style={{ ...cell, fontSize: 10, color: '#444' }}>{template.description}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Submission meta */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
        <tbody>
          <tr>
            <td style={{ ...label, width: '18%' }}>Created By</td>
            <td style={{ ...value, width: '32%' }}>{entry.created_by_name || entry.created_by || ''}</td>
            <td style={{ ...label, width: '18%' }}>Related To</td>
            <td style={value}>{entry.related_employee_name || entry.related_employee_id || ''}</td>
          </tr>
          <tr>
            <td style={label}>Submitted</td>
            <td style={value}>{fmtDate(entry.created_at)}</td>
            <td style={label}>Status</td>
            <td style={value}>{(entry.status || 'pending')}</td>
          </tr>
        </tbody>
      </table>

      {/* Requester section */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
        <tbody>
          <tr><td colSpan={2} style={section}>Request Details</td></tr>
          {requesterFields.map(f => (
            <tr key={f.id}>
              <td style={{ ...label, width: '34%' }}>{f.label}</td>
              <td style={value}><FieldValue field={f} raw={formValues[f.id]} employees={employees} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Approver section */}
      {approverFields.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
          <tbody>
            <tr><td colSpan={2} style={section}>Approval / Review</td></tr>
            {approverFields.map(f => (
              <tr key={f.id}>
                <td style={{ ...label, width: '34%' }}>{f.label}</td>
                <td style={value}><FieldValue field={f} raw={approverValues[f.id]} employees={employees} /></td>
              </tr>
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
