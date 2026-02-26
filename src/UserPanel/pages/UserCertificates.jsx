import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
        status: 'valid',
        creditHours: 40
      },
      {
        id: 2,
        courseName: 'Safety Standards 2024',
        issuedDate: '2024-02-10',
        certificateNumber: 'PTIS-2024-002',
        validUntil: '2026-02-10',
        status: 'valid',
        creditHours: 25
      },
      {
        id: 3,
        courseName: 'Quality Management Fundamentals',
        issuedDate: '2023-12-15',
        certificateNumber: 'PTIS-2023-089',
        validUntil: '2025-12-15',
        status: 'valid',
        creditHours: 30
      }
    ];
    
    setCertificates(mockCertificates);
    setLoading(false);
  };

  const handleDownload = (cert) => {
    alert(`Downloading certificate: ${cert.certificateNumber}`);
    // Implement actual download logic
  };

  const handleView = (cert) => {
    alert(`Viewing certificate: ${cert.certificateNumber}`);
    // Implement view in modal or new tab
  };

  if (loading) {
    return (
      <div className="lms-home" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading your certificates...</p>
      </div>
    );
  }

  return (
    <div className="lms-home">
      <section className="lms-spotlight">
        {/* Professional Header with Stats */}
        <header style={{ 
          marginBottom: '2.5rem',
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          borderRadius: '20px',
          padding: '2.5rem',
          color: '#fff',
          boxShadow: '0 10px 40px rgba(67, 233, 123, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '2rem'
        }}>
          <div>
            <p className="eyebrow" style={{ 
              opacity: 0.95, 
              fontSize: '0.8rem', 
              fontWeight: '700', 
              textTransform: 'uppercase', 
              letterSpacing: '1.5px',
              marginBottom: '0.75rem'
            }}>
              🏆 Achievements
            </p>
            <h2 style={{ 
              fontSize: '2.25rem', 
              fontWeight: '800', 
              marginBottom: '0.75rem',
              textShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
              My Certificates
            </h2>
            <p style={{ 
              fontSize: '1rem', 
              opacity: 0.95,
              maxWidth: '500px'
            }}>
              View and download your earned certificates to showcase your achievements
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(10px)',
            padding: '2rem 3rem',
            borderRadius: '16px',
            border: '2px solid rgba(255,255,255,0.3)',
            minWidth: '180px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              color: '#fff',
              lineHeight: '1',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
              {certificates.length}
            </div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: 'rgba(255,255,255,0.95)', 
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginTop: '0.5rem'
            }}>
              Total Earned
            </div>
          </div>
        </header>

        {certificates.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '5rem 2rem',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: '20px',
            border: '2px dashed rgba(0,0,0,0.1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: '6rem', marginBottom: '1.5rem' }}>🏆</div>
            <h3 style={{ 
              marginBottom: '0.75rem', 
              color: '#2c3e50', 
              fontSize: '1.75rem', 
              fontWeight: '700' 
            }}>No Certificates Yet</h3>
            <p style={{ 
              color: '#6c757d', 
              marginBottom: '2rem',
              fontSize: '1.05rem'
            }}>
              Complete courses to earn your first certificate
            </p>
            <Link to="/user/my-courses" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease'
              }}>
                📚 Browse Courses
              </button>
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '2rem'
          }}>
            {certificates.map((cert, index) => {
              const gradients = [
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
              ];
              return (
                <article 
                  key={cert.id}
                  style={{
                    background: '#fff',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 6px 25px rgba(0,0,0,0.1)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 15px 50px rgba(0,0,0,0.18)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 6px 25px rgba(0,0,0,0.1)';
                  }}
                >
                  {/* Certificate Header with Gradient */}
                  <div style={{
                    background: gradients[index % gradients.length],
                    padding: '2.5rem 2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    minHeight: '180px'
                  }}>
                    {/* Decorative Pattern */}
                    <div style={{
                      position: 'absolute',
                      top: '-50px',
                      right: '-50px',
                      width: '150px',
                      height: '150px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '50%'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      bottom: '-30px',
                      left: '-30px',
                      width: '100px',
                      height: '100px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '50%'
                    }}></div>

                    {/* Trophy Icon */}
                    <div style={{ 
                      fontSize: '4.5rem', 
                      marginBottom: '0.75rem',
                      filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      🏆
                    </div>
                    
                    {/* Status Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                      padding: '8px 14px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: '#4caf50',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      zIndex: 2
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#4caf50',
                        boxShadow: '0 0 0 3px rgba(76, 175, 80, 0.2)',
                        animation: 'pulse 2s infinite'
                      }}></span>
                      VALID
                    </div>

                    <div style={{
                      color: 'rgba(255,255,255,0.95)',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      Certificate of Completion
                    </div>
                  </div>
                  
                  {/* Certificate Body */}
                  <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#95a5a6',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>📜</span>
                      <span>{cert.certificateNumber}</span>
                      <span>•</span>
                      <span>{cert.creditHours}h</span>
                    </div>

                    <h3 style={{ 
                      fontSize: '1.35rem', 
                      fontWeight: '700', 
                      color: '#2c3e50', 
                      marginBottom: '1.5rem',
                      lineHeight: '1.4'
                    }}>
                      {cert.courseName}
                    </h3>
                    
                    {/* Certificate Details */}
                    <div style={{ 
                      marginTop: 'auto',
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px',
                      padding: '1.25rem',
                      background: '#f8f9fa',
                      borderRadius: '12px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ 
                          color: '#6c757d',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}>
                          📅 Issued
                        </span>
                        <span style={{ 
                          fontWeight: '700', 
                          color: '#2c3e50',
                          fontSize: '0.9rem'
                        }}>
                          {new Date(cert.issuedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ 
                          color: '#6c757d',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}>
                          ⏰ Valid Until
                        </span>
                        <span style={{ 
                          fontWeight: '700', 
                          color: '#4caf50',
                          fontSize: '0.9rem'
                        }}>
                          {new Date(cert.validUntil).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ 
                    padding: '1.5rem',
                    paddingTop: '0',
                    display: 'flex', 
                    gap: '12px' 
                  }}>
                    <button 
                      type="button" 
                      onClick={() => handleView(cert)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: '#fff',
                        border: '2px solid #667eea',
                        color: '#667eea',
                        borderRadius: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#667eea';
                        e.target.style.color = '#fff';
                        e.target.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#fff';
                        e.target.style.color = '#667eea';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      <span>👁️</span>
                      <span>View</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDownload(cert)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                      }}
                    >
                      <span>📥</span>
                      <span>Download</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default UserCertificates;
