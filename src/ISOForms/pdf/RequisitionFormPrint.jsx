import React from 'react'
import ptisLogo from '/ptisLogo.png'

const cell    = { border: '1px solid #000', padding: '5px 8px', fontSize: 10, verticalAlign: 'top' }
const label   = { ...cell, fontWeight: 700 }
const th      = { ...cell, fontWeight: 700, textAlign: 'center', background: '#f0f0f0', fontSize: 9 }
const td      = { ...cell, fontSize: 9, height: 20 }
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

const ITEM_ROWS = 8

function RequisitionFormPrint({ entry, formValues, approverValues, employees = [] }, ref) {
  const v = (id) => formValues[id] ?? ''
  const a = (id) => approverValues[id] ?? ''

  const empName = (id) => {
    const emp = employees.find(e => String(e.id) === String(id))
    return emp ? (emp.full_name || emp.name) : (id || '')
  }

  const against = Array.isArray(v('f_req_against')) ? v('f_req_against') : []
  const priority = (v('f_req_priority') || '')

  return (
    <div ref={ref} style={{ width: 794, padding: 28, background: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <h2 style={{ textAlign: 'center', margin: '0 0 10px', fontSize: 17 }}>
        Premier Tubular Inspection Services (Pvt) Ltd.
      </h2>

      {/* Header table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ ...label, width: '10%' }}>Title</td>
            <td style={cell}>Requisition Form</td>
            <td style={{ ...label, width: '8%' }}>Code</td>
            <td style={{ ...cell, width: '12%' }}>FM-014-09</td>
            <td rowSpan={2} style={{ ...cell, width: '13%', textAlign: 'center', verticalAlign: 'middle' }}>
              <img src={ptisLogo} alt="PTIS" style={{ height: 34 }} />
            </td>
          </tr>
          <tr>
            <td style={label}>Issue</td>
            <td style={cell}>02</td>
            <td style={label}>Issue Date</td>
            <td style={cell}>01-Jan-2018</td>
          </tr>
        </tbody>
      </table>

      {/* Requestor block */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr>
            <td colSpan={2} style={label}>Name of Requestor</td>
            <td colSpan={2} style={cell}>{empName(v('f_req_requestor_name'))}</td>
            <td style={label}>Date of Request</td>
            <td style={cell}>{fmtDate(v('f_req_request_date'))}</td>
          </tr>
          <tr>
            <td colSpan={2} style={label}>Department of Requestor</td>
            <td colSpan={2} style={cell}>{v('f_req_department')}</td>
            <td colSpan={2} style={cell}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Priority Level</div>
              <Opt checked={priority.startsWith('Urgent')}>Urgent (Within same day)</Opt><br />
              <Opt checked={priority.startsWith('Normal')}>Normal (Within Few days)</Opt>
            </td>
          </tr>
          <tr>
            <td colSpan={6} style={cell}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Request Against</div>
              <Opt checked={against.includes('Repair & Maintenance')}>Repair &amp; Maintenance</Opt>
              <Opt checked={against.includes('Purchase')}>Purchase</Opt>
              <Opt checked={against.includes('Replace')}>Replace</Opt>
              <Opt checked={against.includes('Stock')}>Stock</Opt>
              <Opt checked={against.includes('Return')}>Return</Opt>
            </td>
          </tr>
          <tr>
            <td colSpan={6} style={{ ...cell, minHeight: 40 }}>
              <div style={{ fontWeight: 700 }}>Justification for Request:</div>
              <div style={{ minHeight: 28, paddingTop: 4 }}>{v('f_req_justification')}</div>
            </td>
          </tr>
          <tr>
            <td colSpan={6} style={cell}>
              <span style={{ fontWeight: 700 }}>Receiver's Signature:</span> ______________________________
            </td>
          </tr>
        </tbody>
      </table>

      {/* Item table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead>
          <tr>
            <th style={{ ...th, width: '5%' }}>S. No.</th>
            <th style={{ ...th, width: '20%' }}>Item Description</th>
            <th style={{ ...th, width: '22%' }}>Specification<br /><span style={{ fontWeight: 400 }}>(Colour, Size, Clips or Jacket File)</span></th>
            <th style={{ ...th, width: '10%' }}>Quantity Request</th>
            <th style={{ ...th, width: '10%' }}>Quantity Issued</th>
            <th style={{ ...th, width: '13%' }}>Date Issued</th>
            <th style={{ ...th, width: '20%' }}>Any Other Remarks</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: ITEM_ROWS }, (_, i) => i + 1).map(n => (
            <tr key={n}>
              <td style={{ ...td, textAlign: 'center' }}>{n}</td>
              <td style={td}>{v(`f_req_item${n}_desc`)}</td>
              <td style={td}>{v(`f_req_item${n}_spec`)}</td>
              <td style={{ ...td, textAlign: 'center' }}>{v(`f_req_item${n}_qty_request`)}</td>
              <td style={{ ...td, textAlign: 'center' }}>{a(`f_req_item${n}_qty_issued`)}</td>
              <td style={{ ...td, textAlign: 'center' }}>{fmtDate(a(`f_req_item${n}_date_issued`))}</td>
              <td style={td}>{a(`f_req_item${n}_remarks`)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ ...small, marginBottom: 14 }}>
        <strong>Estimated Amount Rs:</strong> {v('f_req_estimated_amount') || '__________________'}
      </div>

      {/* Sign-off block */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ ...cell, width: '50%' }}>
              <div><strong>Recommended By:</strong> {empName(a('f_req_recommended_by')) || '__________________'}</div>
              <div style={{ marginTop: 6 }}><strong>If any Remarks:</strong> {a('f_req_recommended_remarks') || '__________________'}</div>
            </td>
            <td style={{ ...cell, width: '50%' }}>
              <div><strong>Signature:</strong> ______________________________</div>
              <div style={{ marginTop: 6 }}><strong>Date:</strong> {fmtDate(a('f_req_recommended_date')) || '__________________'}</div>
            </td>
          </tr>
          <tr>
            <td style={cell}>
              <div><strong>Approved By:</strong> {empName(a('f_req_approved_by')) || '__________________'}</div>
              <div style={{ marginTop: 6 }}><strong>Department:</strong> {a('f_req_approved_dept') || '__________________'}</div>
            </td>
            <td style={cell}>
              <div><strong>Signature:</strong> ______________________________</div>
              <div style={{ marginTop: 6 }}><strong>Date:</strong> {fmtDate(a('f_req_approved_date')) || '__________________'}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default React.forwardRef(RequisitionFormPrint)
