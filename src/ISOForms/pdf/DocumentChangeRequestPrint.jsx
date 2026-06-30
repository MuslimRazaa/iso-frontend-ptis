import React from 'react'
import ptisLogo from '/ptisLogo.png'

const cell    = { border: '1px solid #000', padding: '6px 10px', fontSize: 11, verticalAlign: 'top' }
const label   = { ...cell, fontWeight: 700, width: '34%', textTransform: 'uppercase' }
const value   = { ...cell }
const section = { border: '1px solid #000', padding: '7px 10px', fontWeight: 700, textAlign: 'center', background: '#dfe1ee', color: '#000', fontSize: 12, textTransform: 'uppercase' }

const Box = ({ checked }) => (
  <span style={{
    display: 'inline-block', width: 10, height: 10, border: '1px solid #000',
    marginRight: 6, verticalAlign: 'middle', background: checked ? '#000' : '#fff',
  }} />
)

const Option = ({ checked, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 16, whiteSpace: 'nowrap' }}>
    <Box checked={checked} />{children}
  </span>
)

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Pixel-for-pixel layout of PTIS form FM-001-04, filled in from a submitted
// ISO Forms entry. Field ids match src/ISOForms/seedTemplates.js exactly.
function DocumentChangeRequestPrint({ entry, formValues, approverValues, employees = [] }, ref) {
  const changeTypes = Array.isArray(formValues.f_dcr_change_type) ? formValues.f_dcr_change_type : []
  const instances    = Array.isArray(formValues.f_dcr_instances) ? formValues.f_dcr_instances : []
  const priority      = formValues.f_dcr_priority || ''
  const impactLevel   = approverValues.f_dcr_impact_level || ''
  const closingStatus = approverValues.f_dcr_closing_status || ''
  const idStr      = String(entry.id)
  const requestNo  = /^\d+$/.test(idStr) ? `DCR-${idStr.padStart(4, '0')}` : `DCR-${idStr.replace(/^local-/, '').slice(-6)}`
  const requestedByEmployee = employees.find(e => String(e.id) === String(formValues.f_dcr_requested_by))
  const requestedByName = requestedByEmployee ? (requestedByEmployee.full_name || requestedByEmployee.name) : (formValues.f_dcr_requested_by || '')
  const closedByEmployee = employees.find(e => String(e.id) === String(approverValues.f_dcr_closed_by))
  const closedByName = closedByEmployee ? (closedByEmployee.full_name || closedByEmployee.name) : (approverValues.f_dcr_closed_by || '')

  return (
    <div
      ref={ref}
      style={{
        width: 794, padding: 28, background: '#fff', color: '#000',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <h2 style={{ textAlign: 'center', margin: '0 0 12px', fontSize: 18 }}>
        Premier Tubular Inspection Services (Pvt) Ltd.
      </h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ ...label, width: '10%', whiteSpace: 'nowrap' }}>Title</td>
            <td style={{ ...value, whiteSpace: 'nowrap' }}>Document Change Request Form</td>
            <td style={{ ...label, width: '8%', whiteSpace: 'nowrap' }}>Code</td>
            <td style={{ ...value, width: '12%', whiteSpace: 'nowrap' }}>FM-001-04</td>
            <td rowSpan={2} style={{ ...cell, width: '14%', textAlign: 'center', verticalAlign: 'middle' }}>
              <img src={ptisLogo} alt="PTIS" style={{ height: 36 }} />
            </td>
          </tr>
          <tr>
            <td style={label}>Issue</td>
            <td style={value}>01</td>
            <td style={label}>Issue Date</td>
            <td style={value}>01-Jan-2018</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
        <tbody>
          <tr>
            <td style={{ ...label, width: '34%' }}>Change Request #:<br /><span style={{ fontWeight: 400, fontSize: 9 }}>(To be assigned by ISMR)</span></td>
            <td style={value}>{requestNo}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
        <tbody>
          <tr><td colSpan={2} style={section}>Document Change Request Details</td></tr>
          <tr><td style={label}>Change Requested By</td><td style={value}>{requestedByName}</td></tr>
          <tr><td style={label}>Requestor Designation</td><td style={value}>{formValues.f_dcr_designation || ''}</td></tr>
          <tr><td style={label}>Date of Request</td><td style={value}>{fmtDate(formValues.f_dcr_date)}</td></tr>
          <tr>
            <td style={label}>Change Type</td>
            <td style={value}>
              {['Hardware', 'Software', 'Network', 'Application', 'H&S Protocols', 'Operational Procedure', 'Environment', 'Other'].map(o => (
                <Option key={o} checked={changeTypes.includes(o)}>{o}</Option>
              ))}
            </td>
          </tr>
          <tr><td style={label}>Specify Details (if Other selected)</td><td style={value}>{formValues.f_dcr_change_type_other || ''}</td></tr>
          <tr>
            <td style={label}>Instances of Change</td>
            <td style={value}>
              {['Scheduled', 'Unscheduled', 'Emergency', 'Other'].map(o => (
                <Option key={o} checked={instances.includes(o)}>{o}</Option>
              ))}
            </td>
          </tr>
          <tr><td style={label}>Specify Details (if Other selected)</td><td style={value}>{formValues.f_dcr_instances_other || ''}</td></tr>
          <tr>
            <td style={label}>Priority of Change Implementation</td>
            <td style={value}>
              {['Urgent', 'Normal', 'Low'].map(o => (
                <Option key={o} checked={priority === o}>{o}</Option>
              ))}
            </td>
          </tr>
          <tr><td style={label}>Required Resources</td><td style={value}>{formValues.f_dcr_resources || ''}</td></tr>
          <tr><td style={label}>Description of Change</td><td style={value}>{formValues.f_dcr_description || ''}</td></tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
        <tbody>
          <tr><td colSpan={2} style={section}>Impact Analysis (to be filled by ISMR / Change Team)</td></tr>
          <tr>
            <td style={label}>Impact Level</td>
            <td style={value}>
              {['Significant', 'Negligible', 'No Impact', 'NA'].map(o => (
                <Option key={o} checked={impactLevel === o}>{o}</Option>
              ))}
            </td>
          </tr>
          <tr><td style={label}>Affected Area</td><td style={value}>{approverValues.f_dcr_affected_area || ''}</td></tr>
          <tr><td style={label}>Other (Description)</td><td style={value}>{approverValues.f_dcr_impact_other || ''}</td></tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
        <tbody>
          <tr><td colSpan={2} style={section}>Request Approval Details (to be filled by ISMR / Change Team)</td></tr>
          <tr>
            <td style={label}>Change Request Approval</td>
            <td style={value}>
              {['Approved', 'Rejected', 'Postponed'].map(o => (
                <Option key={o} checked={entry.status === o.toLowerCase()}>{o}</Option>
              ))}
            </td>
          </tr>
          <tr><td style={label}>Reason for Decision</td><td style={value}>{entry.remarks || ''}</td></tr>
          <tr><td style={label}>Date of Decision</td><td style={value}>{fmtDate(entry.decided_at)}</td></tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td colSpan={2} style={section}>Closing Details (to be filled by ISMR / Change Team)</td></tr>
          <tr><td style={label}>Closed By</td><td style={value}>{closedByName}</td></tr>
          <tr><td style={label}>Date of Closing</td><td style={value}>{fmtDate(approverValues.f_dcr_closing_date)}</td></tr>
          <tr>
            <td style={label}>Status</td>
            <td style={value}>
              {['Successfully Completed', 'CAR(s) Generated', 'Terminated', 'Postponed'].map(o => (
                <Option key={o} checked={closingStatus === o}>{o}</Option>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default React.forwardRef(DocumentChangeRequestPrint)
