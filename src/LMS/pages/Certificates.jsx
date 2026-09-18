import React, { useState } from 'react'
import { FileText } from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'
import { showToast } from '../../components/Toast'

const formSelectStyle = {
  border: '1px solid #dcdce3', borderRadius: 14, padding: '12px 14px',
  background: '#f9f9fb', color: '#14141c', fontFamily: 'inherit', fontSize: 14,
  cursor: 'pointer', width: '100%', boxSizing: 'border-box',
}

const initialPassedTests = [
  {
    id: 1,
    employeeId: 'EMP-1032',
    employeeName: 'Ahmed Khan',
    testName: 'DS-1 III Edition 5th Volume',
    score: 85,
    passingScore: 80,
    testDate: '2026-01-10',
    hasCertificate: true,
  },
  {
    id: 2,
    employeeId: 'EMP-1048',
    employeeName: 'Fatima Raza',
    testName: 'API RP 7G2',
    score: 92,
    passingScore: 85,
    testDate: '2026-01-08',
    hasCertificate: true,
  },
  {
    id: 3,
    employeeId: 'EMP-1071',
    employeeName: 'Usman Ahmed',
    testName: 'MPT (General)',
    score: 78,
    passingScore: 75,
    testDate: '2026-01-05',
    hasCertificate: false,
  },
]

const initialCertificates = [
  {
    id: 1,
    employeeId: 'EMP-1032',
    employeeName: 'Ahmed Khan',
    testName: 'DS-1 III Edition 5th Volume',
    issueDate: '2026-01-11',
    certificateUrl: '/certificates/ahmed-khan-ds1.pdf',
    thumbnail: '/src/assets/thumbnails/cert-placeholder.jpg',
  },
  {
    id: 2,
    employeeId: 'EMP-1048',
    employeeName: 'Fatima Raza',
    testName: 'API RP 7G2',
    issueDate: '2026-01-09',
    certificateUrl: '/certificates/fatima-raza-api7g2.pdf',
    thumbnail: '/src/assets/thumbnails/cert-placeholder.jpg',
  },
]

const employeeOptions = [
  { id: 'EMP-1032', name: 'Ahmed Khan' },
  { id: 'EMP-1048', name: 'Fatima Raza' },
  { id: 'EMP-1071', name: 'Usman Ahmed' },
]

function Certificates() {
  const [activeTab, setActiveTab] = useState('passed')
  const [passedTests, setPassedTests] = useState(initialPassedTests)
  const [certificates, setCertificates] = useState(initialCertificates)
  const [uploadForm, setUploadForm] = useState({
    employeeId: '',
    certificateName: '',
    file: null,
  })
  const [uploadMessage, setUploadMessage] = useState('')

  const handleGenerateCertificate = (testId) => {
    const test = passedTests.find((t) => t.id === testId)
    if (!test) return

    const newCertificate = {
      id: Date.now(),
      employeeId: test.employeeId,
      employeeName: test.employeeName,
      testName: test.testName,
      issueDate: new Date().toISOString().split('T')[0],
      certificateUrl: `/certificates/${test.employeeId}-${test.testName.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      thumbnail: '/src/assets/thumbnails/cert-placeholder.jpg',
    }

    setCertificates((prev) => [newCertificate, ...prev])
    setPassedTests((prev) => prev.map((t) => (t.id === testId ? { ...t, hasCertificate: true } : t)))
    showToast('Certificate generated successfully!', 'success')
  }

  const handleViewCertificate = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownloadCertificate = (url, name) => {
    showToast(`Downloading certificate for ${name}`, 'info')
  }

  const handleUploadChange = (field, value) => {
    setUploadForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadForm((prev) => ({ ...prev, file }))
    }
  }

  const handleUploadSubmit = (event) => {
    event.preventDefault()

    if (!uploadForm.employeeId || !uploadForm.certificateName || !uploadForm.file) {
      setUploadMessage('All fields are required.')
      return
    }

    const employee = employeeOptions.find((emp) => emp.id === uploadForm.employeeId)
    const newCertificate = {
      id: Date.now(),
      employeeId: uploadForm.employeeId,
      employeeName: employee?.name || 'Unknown',
      testName: uploadForm.certificateName,
      issueDate: new Date().toISOString().split('T')[0],
      certificateUrl: URL.createObjectURL(uploadForm.file),
      thumbnail: '/src/assets/thumbnails/cert-placeholder.jpg',
    }

    setCertificates((prev) => [newCertificate, ...prev])
    setUploadMessage('Certificate uploaded successfully!')
    setUploadForm({ employeeId: '', certificateName: '', file: null })
  }

  const handleDeleteCertificate = (id) => {
    if (window.confirm('Delete this certificate?')) {
      setCertificates((prev) => prev.filter((cert) => cert.id !== id))
    }
  }

  return (
    <div className="certificates-page">
      <div className="certificates-tabs">
        <button className={`cert-tab ${activeTab === 'passed' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('passed')}>
          Passed Tests
        </button>
        <button className={`cert-tab ${activeTab === 'generated' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('generated')}>
          Generated Certificates
        </button>
        <button className={`cert-tab ${activeTab === 'upload' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('upload')}>
          Upload Custom
        </button>
      </div>

      {activeTab === 'passed' && (
        <section className="lms-table-panel">
          <header>
            <div>
              <p className="eyebrow">Test Results</p>
              <h2>Passed Tests</h2>
              <p className="panel-subtitle">Employees who passed a standard and are ready for certificate generation.</p>
            </div>
          </header>

          <div className="table-wrapper">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Test</th>
                  <th>Score</th>
                  <th>Test Date</th>
                  <th>Certificate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {passedTests.map((test) => (
                  <tr key={test.id}>
                    <td>
                      <div className="employee-ident">
                        <span className="avatar-circle">
                          {test.employeeName
                            .split(' ')
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        <div>
                          <strong>{test.employeeName}</strong>
                          <span>{test.employeeId}</span>
                        </div>
                      </div>
                    </td>
                    <td>{test.testName}</td>
                    <td>
                      <span className="score-badge">
                        {test.score}% / {test.passingScore}%
                      </span>
                    </td>
                    <td>{new Date(test.testDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-pill small ${test.hasCertificate ? 'active' : 'draft'}`}>
                        {test.hasCertificate ? 'Issued' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      {test.hasCertificate ? (
                        <div className="action-buttons">
                          <button className="action-btn edit" onClick={() => handleViewCertificate(`/certificates/${test.employeeId}.pdf`)}>
                            View
                          </button>
                          <button className="action-btn save" onClick={() => handleDownloadCertificate(`/certificates/${test.employeeId}.pdf`, test.employeeName)}>
                            Download
                          </button>
                        </div>
                      ) : (
                        <button className="primary-btn small" onClick={() => handleGenerateCertificate(test.id)}>
                          Generate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'generated' && (
        <section className="certificates-gallery">
          <header>
            <div>
              <p className="eyebrow">Issued Credentials</p>
              <h2>Generated Certificates</h2>
              <p className="panel-subtitle">Every certificate issued so far, ready to view or download.</p>
            </div>
            <span className="cert-count">{certificates.length} total</span>
          </header>

          <div className="certificates-grid">
            {certificates.map((cert) => (
              <article key={cert.id} className="certificate-card">
                <div className="cert-thumbnail">
                  <img src={cert.thumbnail} alt={cert.testName} />
                </div>
                <div className="cert-info">
                  <p className="eyebrow">{cert.employeeId}</p>
                  <h4>{cert.employeeName}</h4>
                  <p className="cert-test-name">{cert.testName}</p>
                  <span className="cert-date">Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                </div>
                <div className="cert-actions">
                  <button className="action-btn edit" onClick={() => handleViewCertificate(cert.certificateUrl)}>
                    View
                  </button>
                  <button className="action-btn save" onClick={() => handleDownloadCertificate(cert.certificateUrl, cert.employeeName)}>
                    Download
                  </button>
                  <button className="action-btn delete" onClick={() => handleDeleteCertificate(cert.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'upload' && (
        <section className="lms-form-panel">
          <header>
            <div>
              <p className="eyebrow">Custom Credentials</p>
              <h2>Upload Certificate</h2>
              <p className="panel-subtitle">Upload custom certificates for employees who completed external training or special recognition.</p>
            </div>
          </header>

          <form className="upload-certificate-form" onSubmit={handleUploadSubmit}>
            <div className="form-row">
              <label>
                <span>Select Employee *</span>
                <SearchableSelect
                  value={uploadForm.employeeId}
                  onChange={(v) => handleUploadChange('employeeId', v)}
                  options={employeeOptions.map((emp) => ({ value: emp.id, label: `${emp.name} (${emp.id})` }))}
                  emptyOptionLabel="Choose employee"
                  placeholder="Type to search…"
                  style={formSelectStyle}
                />
              </label>
              <label>
                <span>Certificate Name *</span>
                <input
                  type="text"
                  placeholder="e.g., Advanced Safety Training"
                  value={uploadForm.certificateName}
                  onChange={(e) => handleUploadChange('certificateName', e.target.value)}
                  required
                />
              </label>
            </div>

            <label>
              <span>Upload Certificate File (PDF) *</span>
              <div className="cert-upload-zone">
                <input type="file" accept=".pdf" onChange={handleFileChange} required />
                <div className="upload-hint">
                  <span className="upload-icon"><FileText size={28} /></span>
                  <p>{uploadForm.file ? uploadForm.file.name : 'Click to select PDF file'}</p>
                  <span className="file-size-hint">Max 10MB</span>
                </div>
              </div>
            </label>

            {uploadMessage && <p className="form-hint success">{uploadMessage}</p>}

            <div className="form-actions">
              <button type="reset" className="ghost-btn" onClick={() => setUploadForm({ employeeId: '', certificateName: '', file: null })}>
                Clear
              </button>
              <button type="submit" className="primary-btn">
                Upload Certificate
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}

export default Certificates
