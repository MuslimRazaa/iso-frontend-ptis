import React, { useState } from 'react'
import { showToast } from '../../components/Toast'

const initialPdfRecords = [
  {
    id: 'PDF-001',
    fileName: 'Client_Contract_Saudi_Aramco.pdf',
    uploadDate: '2026-01-15',
    fileSize: '2.4 MB',
    status: 'Pending',
    uploadedBy: 'Ahmed Khan',
  },
  {
    id: 'PDF-002',
    fileName: 'Inspection_Report_ADNOC_Dec2025.pdf',
    uploadDate: '2026-01-16',
    fileSize: '3.8 MB',
    status: 'Processing',
    uploadedBy: 'Ali Raza',
  },
  {
    id: 'PDF-003',
    fileName: 'Compliance_Certificate_Qatar_Petroleum.pdf',
    uploadDate: '2026-01-17',
    fileSize: '1.2 MB',
    status: 'Pending',
    uploadedBy: 'Sara Ahmed',
  },
  {
    id: 'PDF-004',
    fileName: 'Technical_Specification_PSO.pdf',
    uploadDate: '2026-01-18',
    fileSize: '5.6 MB',
    status: 'Failed',
    uploadedBy: 'Iqbal Hassan',
  },
  {
    id: 'PDF-005',
    fileName: 'Safety_Audit_Lucky_Cement.pdf',
    uploadDate: '2026-01-19',
    fileSize: '4.1 MB',
    status: 'Pending',
    uploadedBy: 'Fahad Ali',
  },
]

function UnprocessedRecords() {
  const [records, setRecords] = useState(initialPdfRecords)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      // Simulate adding to unprocessed list
      const newRecord = {
        id: `PDF-${String(records.length + 1).padStart(3, '0')}`,
        fileName: file.name,
        uploadDate: new Date().toISOString().split('T')[0],
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        status: 'Pending',
        uploadedBy: 'Current User',
      }
      setRecords([newRecord, ...records])
      setSelectedFile(null)
      e.target.value = ''
    }
  }

  const handleProcess = (id) => {
    setRecords(records.map(record => 
      record.id === id ? { ...record, status: 'Processing' } : record
    ))
    setTimeout(() => {
      showToast(`Processing ${id} completed (demo only)`, 'success')
      setRecords(records.filter(record => record.id !== id))
    }, 1000)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this PDF record?')) {
      setRecords(records.filter(record => record.id !== id))
    }
  }

  const filteredRecords = records.filter(record => 
    filterStatus === 'all' || record.status.toLowerCase() === filterStatus.toLowerCase()
  )

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return { bg: '#fff6e5', color: '#d97706', border: '#ffe2c3' }
      case 'Processing':
        return { bg: '#e6f4ff', color: '#1890ff', border: '#91d5ff' }
      case 'Failed':
        return { bg: '#fff0f2', color: '#d7263d', border: '#ffd1d8' }
      default:
        return { bg: '#f4f4f7', color: '#8c8c94', border: '#e0e0e6' }
    }
  }

  return (
    <div className="lms-form-panel">
      <header>
        <div>
          <p className="eyebrow">Document Processing</p>
          <h2>Unprocessed Records (PDFs)</h2>
          <p className="panel-subtitle">Manage and process uploaded PDF documents.</p>
        </div>
        <button type="button" className="ghost-btn">
          Process All
        </button>
      </header>

      <div style={{ marginTop: '24px' }}>
        <div className="panel" style={{ padding: '32px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#1f1f27' }}>
            📤 Upload PDF Document
          </h3>
          <div style={{ 
            border: '2px dashed #e0e0e6', 
            borderRadius: '16px', 
            padding: '32px',
            textAlign: 'center',
            background: '#fafafb',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="pdf-upload"
            />
            <label 
              htmlFor="pdf-upload" 
              style={{ cursor: 'pointer', display: 'block' }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#1f1f27', marginBottom: '6px' }}>
                Click to upload PDF document
              </p>
              <p style={{ fontSize: '13px', color: '#8c8c94' }}>
                PDF files only • Max size 50MB
              </p>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1px solid #e0e0e6',
              borderRadius: '16px',
              fontSize: '14px',
              minWidth: '180px'
            }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
          <span style={{ fontSize: '14px', color: '#8c8c94' }}>
            {filteredRecords.length} documents found
          </span>
        </div>

        <div className="question-table-wrapper">
          <table className="question-table">
            <thead>
              <tr>
                <th style={{ width: '10%' }}>ID</th>
                <th style={{ width: '30%' }}>File Name</th>
                <th style={{ width: '12%' }}>Upload Date</th>
                <th style={{ width: '10%' }}>File Size</th>
                <th style={{ width: '15%' }}>Uploaded By</th>
                <th style={{ width: '12%' }}>Status</th>
                <th style={{ width: '11%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#8c8c94' }}>
                    No unprocessed PDF records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const statusStyle = getStatusColor(record.status)
                  return (
                    <tr key={record.id}>
                      <td>
                        <strong style={{ fontSize: '13px', color: '#1f1f27' }}>{record.id}</strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>📄</span>
                          <span style={{ fontSize: '13px', color: '#1f1f27', wordBreak: 'break-word' }}>
                            {record.fileName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: '#595966' }}>{record.uploadDate}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: '#595966' }}>{record.fileSize}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: '#595966' }}>{record.uploadedBy}</span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '6px 12px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          {record.status === 'Pending' && (
                            <button
                              type="button"
                              className="action-btn edit small"
                              onClick={() => handleProcess(record.id)}
                              title="Process PDF"
                            >
                              Process
                            </button>
                          )}
                          <button
                            type="button"
                            className="action-btn delete small"
                            onClick={() => handleDelete(record.id)}
                            title="Delete PDF"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default UnprocessedRecords
