import React, { useState } from 'react'
import { showToast } from '../../components/Toast'

const initialRecords = [
  {
    id: 'REC-001',
    serialNo: 'SN-2025-0001',
    workOrderNo: 'WO-12345',
    certificateNo: 'CERT-2025-001',
    fileName: 'Inspection_Report_Jan2025.pdf',
    type: 'Drill Pipe',
    description: 'Visual & Dimensional Inspection',
    location: 'Karachi Yard',
    rig: 'Rig-07',
    partNo: 'DP-5000-001',
    inspectionDate: '2025-01-15',
    expireDate: '2026-01-15',
    fitForUse: 'Yes',
    fitRejected: 'No',
    remarks: 'All parameters within acceptable limits',
    customer: 'Saudi Aramco',
    lastUpdated: '2025-01-19',
    pdf: 'Available',
  },
  {
    id: 'REC-002',
    serialNo: 'SN-2025-0002',
    workOrderNo: 'WO-12346',
    certificateNo: 'CERT-2025-002',
    fileName: 'Equipment_Test_Report.pdf',
    type: 'BHA',
    description: 'Non-Destructive Testing',
    location: 'Dubai Warehouse',
    rig: 'Rig-12',
    partNo: 'BHA-3000-002',
    inspectionDate: '2025-01-16',
    expireDate: '2026-01-16',
    fitForUse: 'Yes',
    fitRejected: 'No',
    remarks: 'NDT test passed successfully',
    customer: 'ADNOC',
    lastUpdated: '2025-01-19',
    pdf: 'Available',
  },
  {
    id: 'REC-003',
    serialNo: 'SN-2025-0003',
    workOrderNo: 'WO-12347',
    certificateNo: 'CERT-2025-003',
    fileName: 'Safety_Inspection.pdf',
    type: 'Heavy Weight',
    description: 'Pressure Test & Calibration',
    location: 'Islamabad Site',
    rig: 'Rig-05',
    partNo: 'HW-2000-003',
    inspectionDate: '2025-01-17',
    expireDate: '2026-01-17',
    fitForUse: 'No',
    fitRejected: 'Yes',
    remarks: 'Failed pressure test - requires replacement',
    customer: 'PSO',
    lastUpdated: '2025-01-18',
    pdf: 'Available',
  },
  {
    id: 'REC-004',
    serialNo: 'SN-2025-0004',
    workOrderNo: 'WO-12348',
    certificateNo: 'CERT-2025-004',
    fileName: 'Quality_Control_Report.pdf',
    type: 'Drill Collar',
    description: 'Dimensional Verification',
    location: 'Doha Facility',
    rig: 'Rig-09',
    partNo: 'DC-4000-004',
    inspectionDate: '2025-01-18',
    expireDate: '2026-01-18',
    fitForUse: 'Yes',
    fitRejected: 'No',
    remarks: 'Minor wear noted, within tolerance',
    customer: 'Qatar Petroleum',
    lastUpdated: '2025-01-19',
    pdf: 'Available',
  },
  {
    id: 'REC-005',
    serialNo: 'SN-2025-0005',
    workOrderNo: 'WO-12349',
    certificateNo: 'CERT-2025-005',
    fileName: 'Maintenance_Record.pdf',
    type: 'Stabilizer',
    description: 'Thread Inspection & Repair',
    location: 'Karachi Yard',
    rig: 'Rig-03',
    partNo: 'ST-1500-005',
    inspectionDate: '2025-01-19',
    expireDate: '2026-01-19',
    fitForUse: 'Yes',
    fitRejected: 'No',
    remarks: 'Thread repaired and re-certified',
    customer: 'Lucky Cement',
    lastUpdated: '2025-01-20',
    pdf: 'Available',
  },
]

function AllRecords() {
  const [records, setRecords] = useState(initialRecords)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFitForUse, setFilterFitForUse] = useState('all')

  const filteredRecords = records.filter((record) => {
    const matchesSearch = 
      record.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.workOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.certificateNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.type.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFit = 
      filterFitForUse === 'all' || 
      (filterFitForUse === 'yes' && record.fitForUse === 'Yes') ||
      (filterFitForUse === 'no' && record.fitForUse === 'No')
    
    return matchesSearch && matchesFit
  })

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      setRecords(records.filter((record) => record.id !== id))
    }
  }

  const handleViewPDF = (fileName) => {
    showToast(`Opening PDF: ${fileName} (demo only)`, 'info')
  }

  return (
    <div className="all-records-page">
      <div className="all-records-header">
        <div className="all-records-header-content">
          <p className="eyebrow">Inspection Database</p>
          <h2>All Inspection Records</h2>
          <p className="panel-subtitle">View and manage all inspection records and certificates.</p>
        </div>
        <div className="all-records-header-actions">
          <button type="button" className="ghost-btn">
            Export to Excel
          </button>
          <button type="button" className="btn btn-primary">
            Add New Record
          </button>
        </div>
      </div>

      <div className="all-records-filters">
        <input
          type="text"
          placeholder="🔍 Search by Serial No, Work Order, Certificate, Customer, Type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="all-records-search"
        />
        <select
          value={filterFitForUse}
          onChange={(e) => setFilterFitForUse(e.target.value)}
          className="all-records-filter-select"
        >
          <option value="all">All Records</option>
          <option value="yes">Fit for Use</option>
          <option value="no">Rejected</option>
        </select>
      </div>

      <div className="all-records-table-container">
        <div className="all-records-table-scroll">
          <table className="all-records-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Serial No</th>
                <th>Work Order No</th>
                <th>Certificate No</th>
                <th>File Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Location</th>
                <th>Rig</th>
                <th>Part No</th>
                <th>Inspection Date</th>
                <th>Expire Date</th>
                <th>Fit for Use</th>
                <th>Fit Rejected</th>
                <th>Remarks</th>
                <th>Customer</th>
                <th>Last Updated</th>
                <th>PDF</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="19" className="all-records-empty">
                    No records found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="all-records-cell-id">
                      <strong>{record.id}</strong>
                    </td>
                    <td className="all-records-cell-text">{record.serialNo}</td>
                    <td className="all-records-cell-text">{record.workOrderNo}</td>
                    <td className="all-records-cell-text">{record.certificateNo}</td>
                    <td className="all-records-cell-filename">{record.fileName}</td>
                    <td className="all-records-cell-text">{record.type}</td>
                    <td className="all-records-cell-description">{record.description}</td>
                    <td className="all-records-cell-text">{record.location}</td>
                    <td className="all-records-cell-text">{record.rig}</td>
                    <td className="all-records-cell-text">{record.partNo}</td>
                    <td className="all-records-cell-date">{record.inspectionDate}</td>
                    <td className="all-records-cell-date">{record.expireDate}</td>
                    <td>
                      <span className={`all-records-badge ${record.fitForUse === 'Yes' ? 'badge-success' : 'badge-danger'}`}>
                        {record.fitForUse}
                      </span>
                    </td>
                    <td>
                      <span className={`all-records-badge ${record.fitRejected === 'Yes' ? 'badge-danger' : 'badge-success'}`}>
                        {record.fitRejected}
                      </span>
                    </td>
                    <td className="all-records-cell-remarks">{record.remarks}</td>
                    <td className="all-records-cell-customer">{record.customer}</td>
                    <td className="all-records-cell-date-muted">{record.lastUpdated}</td>
                    <td className="all-records-cell-pdf">
                      <button
                        type="button"
                        onClick={() => handleViewPDF(record.fileName)}
                        className="all-records-pdf-btn"
                        title="View PDF"
                      >
                        📄
                      </button>
                    </td>
                    <td className="all-records-cell-actions">
                      <div className="all-records-actions">
                        <button
                          type="button"
                          className="action-btn edit small"
                          onClick={() => showToast(`Edit record ${record.id} (demo only)`, 'info')}
                          title="Edit Record"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="action-btn delete small"
                          onClick={() => handleDelete(record.id)}
                          title="Delete Record"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="all-records-footer">
        Showing {filteredRecords.length} of {records.length} records
      </div>
    </div>
  )
}

export default AllRecords
