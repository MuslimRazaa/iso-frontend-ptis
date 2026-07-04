import React from 'react'
import ptisLogo from '/ptisLogo.png'

const cell    = { border: '1px solid #000', padding: '5px 8px', fontSize: 10, verticalAlign: 'top' }
const label   = { ...cell, fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }
const section = { ...cell, fontWeight: 700, textAlign: 'center', background: '#dfe1ee', fontSize: 11, textTransform: 'uppercase' }
const small   = { fontSize: 9, color: '#444' }

const Box = ({ checked }) => (
  <span style={{
    display: 'inline-block', width: 10, height: 10,
    border: '1px solid #000', marginRight: 5, verticalAlign: 'middle',
    background: checked ? '#000' : '#fff',
  }} />
)
const Opt = ({ checked, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 14, whiteSpace: 'nowrap' }}>
    <Box checked={checked} />{children}
  </span>
)
const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function CARPrint({ entry, formValues, approverValues, employees = [] }, ref) {
  const v = (id) => formValues[id] ?? ''
  const a = (id) => approverValues[id] ?? ''
  const idStr    = String(entry.id)
  const carNo    = /^\d+$/.test(idStr) ? `CAR-${idStr.padStart(4, '0')}` : `CAR-${idStr.replace(/^local-/, '').slice(-6)}`

  const empName = (id) => {
    const emp = employees.find(e => String(e.id) === String(id))
    return emp ? (emp.full_name || emp.name) : (id || '')
  }

  const ncTypes = Array.isArray(v('f_car_nc_type')) ? v('f_car_nc_type') : []
  const cats    = Array.isArray(a('f_car_category')) ? a('f_car_category') : []

  const followUp = (n) => (
    <td style={{ ...cell, width: '33%', verticalAlign: 'top' }}>
      <div style={{ marginBottom: 4 }}>
        <Opt checked={(a(`f_car_fu${n}_status`) || '').toLowerCase() === 'closed'}>closed</Opt>
        <Opt checked={(a(`f_car_fu${n}_status`) || '').toLowerCase() === 'pending'}>pending</Opt>
      </div>
      <div style={small}>Remarks: {a(`f_car_fu${n}_remarks`) || '__________________'}</div>
      <div style={small}>Verified by: {empName(a(`f_car_fu${n}_verified_by`)) || '__________________'}</div>
      <div style={small}>Signature/Date: {fmtDate(a(`f_car_fu${n}_date`)) || '__________________'}</div>
      {n < 3
        ? <div style={small}>Next follow-up date: {fmtDate(a(`f_car_fu${n}_next_date`)) || '________'}</div>
        : <div style={small}>New CAR No: {a('f_car_new_car_no') || '__________________'}</div>
      }
    </td>
  )

  return (
    <div ref={ref} style={{ width: 794, padding: 28, background: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <h2 style={{ textAlign: 'center', margin: '0 0 10px', fontSize: 17 }}>
        Premier Tubular Inspection Services (Pvt) Ltd.
      </h2>

      {/* Header table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ ...label, width: '10%', whiteSpace: 'nowrap' }}>Title</td>
            <td style={{ ...cell, whiteSpace: 'nowrap' }}>Corrective Action Request Form</td>
            <td style={{ ...label, width: '8%', whiteSpace: 'nowrap' }}>Code</td>
            <td style={{ ...cell, width: '12%', whiteSpace: 'nowrap' }}>FM-002-01</td>
            <td rowSpan={2} style={{ ...cell, width: '13%', textAlign: 'center', verticalAlign: 'middle' }}>
              <img src={ptisLogo} alt="PTIS" style={{ height: 34 }} />
            </td>
          </tr>
          <tr>
            <td style={label}>Issue</td>
            <td style={cell}>01</td>
            <td style={label}>Issue Date</td>
            <td style={cell}>01-Jan-2018</td>
          </tr>
        </tbody>
      </table>

      {/* Section A */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr>
            <td colSpan={3} style={section}>Section: A (Reporting Personnel)</td>
            <td style={{ ...cell, fontWeight: 700, width: '22%' }}>CAR No. &nbsp;&nbsp; {carNo}</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...label, width: '50%' }}>Name of Reporting Personnel</td>
            <td colSpan={2} style={cell}>{empName(v('f_car_reporter_name'))}</td>
          </tr>
          <tr>
            <td colSpan={2} style={label}>Department of Reporting Personnel</td>
            <td style={cell}>{v('f_car_reporter_dept')}</td>
            <td style={cell}><strong>Reporting Date:</strong> {fmtDate(v('f_car_reporting_date'))}</td>
          </tr>
          <tr>
            <td colSpan={2} style={label}>Concerned Department</td>
            <td colSpan={2} style={cell}>{v('f_car_concerned_dept')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={label}>Name of Concerned Dept. Personnel</td>
            <td colSpan={2} style={cell}>{empName(v('f_car_concerned_person'))}</td>
          </tr>
          <tr>
            <td colSpan={4} style={{ ...cell, textDecorationLine: 'underline', fontWeight: 700 }}>Type of non-conformance:</td>
          </tr>
          <tr>
            <td colSpan={4} style={cell}>
              <Opt checked={ncTypes.includes('Service/Product Non-Conformance')}>a) Service/Product non-conformance</Opt>
              <Opt checked={ncTypes.includes('Internal Audit')}>b) Internal Audit</Opt>
              <Opt checked={ncTypes.includes('Customer Complaint')}>c) Customer Complaint</Opt>
              <Opt checked={ncTypes.includes('Regulatory Finding')}>d) Regulatory Finding</Opt>
            </td>
          </tr>
          <tr>
            <td colSpan={4} style={cell}>
              <Opt checked={ncTypes.includes('System/Process Non-Conformance')}>e) System/Process non-conformance</Opt>
              <Opt checked={ncTypes.includes('Vendor/Sub Contracting')}>f) Vendor / Sub contracting</Opt>
              <Opt checked={ncTypes.includes('Others')}>g) Others:</Opt>
              {v('f_car_nc_type_other') || '_______________________'}
            </td>
          </tr>
          <tr>
            <td colSpan={4} style={{ ...cell, minHeight: 50 }}>
              <div style={{ fontWeight: 700 }}>Details of Non-Conformity: <span style={{ fontWeight: 400, fontSize: 9 }}>(to be filled in by the Initiator)</span></div>
              <div style={{ minHeight: 36, paddingTop: 4 }}>{v('f_car_nc_details')}</div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...cell, verticalAlign: 'bottom', paddingBottom: 6 }}>
              <div style={{ fontWeight: 700, textDecorationLine: 'underline', marginBottom: 12 }}>Approval from QMS TEAM HEAD</div>
              <Opt checked={(a('f_car_qms_approval') || '').toLowerCase() === 'accepted'}>Accepted</Opt>
              <Opt checked={(a('f_car_qms_approval') || '').toLowerCase() === 'rejected'}>Rejected</Opt>
              <div style={{ ...small, marginTop: 8 }}>Signature / date: _______________</div>
            </td>
            <td colSpan={2} style={{ ...cell, verticalAlign: 'bottom', paddingBottom: 6 }}>
              <div style={{ fontWeight: 700, textDecorationLine: 'underline', marginBottom: 12 }}>Category of Non Conformance</div>
              <Opt checked={cats.includes('Minor')}>Minor</Opt>
              <Opt checked={cats.includes('Major')}>Major</Opt>
              <Opt checked={cats.includes('Need to Improvement')}>Need to Improvement</Opt>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Section B */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr><td style={section}>Section: B (Concerned HOD or Personnel)</td></tr>
          <tr>
            <td style={{ ...cell, minHeight: 48 }}>
              <div style={{ fontWeight: 700 }}>Root Cause: <span style={{ fontWeight: 400, fontSize: 9 }}>(to be filled in by the concerned functional head)</span></div>
              <div style={{ minHeight: 40, paddingTop: 4 }}>{a('f_car_root_cause')}</div>
              <div style={{ ...small, textAlign: 'right', marginTop: 4 }}>Signature: ____________________</div>
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, minHeight: 60 }}>
              <div style={{ fontWeight: 700 }}>Correction to be taken: <span style={{ fontWeight: 400, fontSize: 9 }}>(to be filled in by the concerned functional head)</span></div>
              <div style={{ minHeight: 40, paddingTop: 4 }}>{a('f_car_correction')}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={small}>Target Date: {fmtDate(a('f_car_target_date'))}</span>
                <span style={small}>Signature: ___________________</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, minHeight: 48 }}>
              <div style={{ fontWeight: 700 }}>Corrective Action: <span style={{ fontWeight: 400, fontSize: 9 }}>(to be filled in by the concerned functional head)</span></div>
              <div style={{ minHeight: 36, paddingTop: 4 }}>{a('f_car_corrective_action')}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Section C */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td colSpan={3} style={section}>Section: C Follow up: For use of (QHSE Executive / Internal Auditor)</td></tr>
          <tr>
            <td style={{ ...cell, width: '33%', fontWeight: 700, fontSize: 10 }}>First Follow-up:</td>
            <td style={{ ...cell, width: '33%', fontWeight: 700, fontSize: 10 }}>Second Follow-up:</td>
            <td style={{ ...cell, width: '34%', fontWeight: 700, fontSize: 10 }}>Third Follow-up:</td>
          </tr>
          <tr>
            {followUp(1)}
            {followUp(2)}
            {followUp(3)}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default React.forwardRef(CARPrint)
