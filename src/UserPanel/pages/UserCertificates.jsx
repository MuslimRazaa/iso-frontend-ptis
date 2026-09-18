import React, { useState, useEffect } from 'react';
import { showToast } from '../../components/Toast';

const UserCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserCertificates();
  }, []);

  const fetchUserCertificates = () => {
    // Mock data - in real app, fetch from backend based on user
    const mockCertificates = [
      {
        id: 1,
        courseName: 'ISO 17020 Training',
        issuedDate: '2024-01-28',
        certificateNumber: 'PTIS-2024-001',
        validUntil: '2026-01-28',
        status: 'valid'
      },
      {
        id: 2,
        courseName: 'Safety Standards 2024',
        issuedDate: '2024-02-10',
        certificateNumber: 'PTIS-2024-002',
        validUntil: '2026-02-10',
        status: 'valid'
      },
      {
        id: 3,
        courseName: 'Quality Management Fundamentals',
        issuedDate: '2023-12-15',
        certificateNumber: 'PTIS-2023-089',
        validUntil: '2025-12-15',
        status: 'valid'
      }
    ];
    
    setCertificates(mockCertificates);
    setLoading(false);
  };

  const handleDownload = (cert) => {
    showToast(`Downloading certificate: ${cert.certificateNumber}`, 'info');
    // Implement actual download logic
  };

  const handleView = (cert) => {
    showToast(`Viewing certificate: ${cert.certificateNumber}`, 'info');
    // Implement view in modal or new tab
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your certificates...</p>
      </div>
    );
  }

  return (
    <div className="certificates-page">
      <div className="page-header">
        <div>
          <h1>My Certificates</h1>
          <p>View and download your earned certificates</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-number">{certificates.length}</span>
            <span className="stat-label">Total Earned</span>
          </div>
        </div>
      </div>

      {certificates.length === 0 ? (
        <div className="no-certificates">
          <div className="no-cert-icon">🏆</div>
          <h3>No Certificates Yet</h3>
          <p>Complete courses to earn certificates</p>
        </div>
      ) : (
        <div className="certificates-grid">
          {certificates.map((cert) => (
            <div key={cert.id} className="certificate-card">
              <div className="cert-icon">🏆</div>
              <div className="cert-details">
                <h3>{cert.courseName}</h3>
                <div className="cert-meta">
                  <div className="meta-item">
                    <span className="meta-label">Certificate No:</span>
                    <span className="meta-value">{cert.certificateNumber}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Issued:</span>
                    <span className="meta-value">{new Date(cert.issuedDate).toLocaleDateString()}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Valid Until:</span>
                    <span className="meta-value">{new Date(cert.validUntil).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="cert-status valid">
                  <span className="status-dot"></span>
                  Valid Certificate
                </div>
              </div>
              <div className="cert-actions">
                <button className="cert-btn view" onClick={() => handleView(cert)}>
                  👁️ View
                </button>
                <button className="cert-btn download" onClick={() => handleDownload(cert)}>
                  📥 Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserCertificates;
