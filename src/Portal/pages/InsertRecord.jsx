import React, { useState } from 'react'
import { showToast } from '../../components/Toast'

function InsertRecord() {
  const [selectedFile, setSelectedFile] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleBulkUpload = (e) => {
    e.preventDefault()
    if (selectedFile) {
      showToast(`Uploading file: ${selectedFile.name} (demo only)`, 'info')
    }
  }

  return (
    <div className="lms-form-panel">
      <header>
        <div>
          <p className="eyebrow">Bulk Upload</p>
          <h2>Insert Record (Bulk Upload)</h2>
          <p className="panel-subtitle">Upload multiple records using Excel or CSV file.</p>
        </div>
      </header>

      <div style={{ marginTop: '24px' }}>
        <div className="panel" style={{ padding: '32px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#1f1f27' }}>
            📋 Instructions
          </h3>
          <ul style={{ 
            paddingLeft: '20px', 
            color: '#595966', 
            lineHeight: '1.8',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <li>Download the sample template file to see the required format</li>
            <li>Fill in all record details in the template (ID, Name, Details, etc.)</li>
            <li>Save the file as Excel (.xlsx) or CSV (.csv) format</li>
            <li>Upload the completed file using the form below</li>
            <li>System will validate and import all records automatically</li>
          </ul>
        </div>

        <form className="lms-form-grid" onSubmit={handleBulkUpload}>
          <div className="panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', color: '#1f1f27' }}>Download Template</h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost"
                  onClick={() => showToast('Downloading Excel template (demo only)', 'info')}
                >
                  📊 Excel Template
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => showToast('Downloading CSV template (demo only)', 'info')}
                >
                  📄 CSV Template
                </button>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#8c8c94' }}>
              Download the template, fill in record data, and upload it below.
            </p>
          </div>

          <label>
            <span>Upload Data File *</span>
            <div className="upload-box" style={{ 
              border: '2px dashed #e0e0e6', 
              borderRadius: '16px', 
              padding: '40px 20px',
              textAlign: 'center',
              background: '#fafafb',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="file-upload"
                required
              />
              <label 
                htmlFor="file-upload" 
                style={{ cursor: 'pointer', display: 'block' }}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                {selectedFile ? (
                  <>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#1f6b3c', marginBottom: '8px' }}>
                      ✓ {selectedFile.name}
                    </p>
                    <p style={{ fontSize: '13px', color: '#8c8c94' }}>
                      Click to change file
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#1f1f27', marginBottom: '8px' }}>
                      Click to upload or drag and drop
                    </p>
                    <p style={{ fontSize: '13px', color: '#8c8c94' }}>
                      Excel (.xlsx, .xls) or CSV (.csv) files only
                    </p>
                  </>
                )}
              </label>
            </div>
          </label>

          <div className="panel" style={{ padding: '24px', background: '#fff6e5', border: '1px solid #ffe2c3' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <div>
                <strong style={{ display: 'block', marginBottom: '4px', color: '#d97706' }}>
                  Important Notes
                </strong>
                <p style={{ fontSize: '13px', color: '#8c6a00', lineHeight: '1.6' }}>
                  Ensure all required fields are filled. Duplicate IDs will be skipped. 
                  Invalid data will be logged for review. Maximum 500 records per upload.
                </p>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="ghost-btn">
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Upload & Import Records
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InsertRecord
