import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ptisLogo from '/ptisLogo.png';

const UserHeader = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  
  // Get user info from localStorage
  const userEmail = localStorage.getItem('userEmail') || 'user@ptis.com';
  const userName = userEmail.split('@')[0].replace(/\./g, ' ').split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/');
  };

  return (
    <>
      <header className="dashboard-header" style={{
        background: 'radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%),    radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%),    #0e0f14',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.2)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="brand-cluster">
          <div className="brand-logo" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <img src={ptisLogo} alt="PTIS Logo" />
          </div>
          <div>
            <p className="brand-label" style={{ color: 'white' }}>PTIS User Portal</p>
            <span className="brand-caption" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Employee Dashboard</span>
          </div>
        </div>
        
        <div className="header-controls">
          <div className="search-cluster" style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '10px 18px',
            borderRadius: '12px'
          }}>
            <svg viewBox="0 0 20 20" fill="none" style={{ width: '18px', height: '18px', opacity: 0.9, color: 'white' }}>
              <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search courses, modules..." 
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                color: 'white',
                width: '220px'
              }}
            />
          </div>
          
          <span className="divider-dot" style={{ background: 'rgba(255, 255, 255, 0.4)' }} />
          
          <button 
            className="ghost-btn"
            style={{ 
              position: 'relative',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: 'white',
              backdropFilter: 'blur(10px)',
              padding: '10px 14px'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px' }}>
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '10px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ff5d5d',
              border: '2px solid rgba(118, 75, 162, 1)',
              boxShadow: '0 0 8px rgba(255, 93, 93, 0.6)'
            }}></span>
          </button>
          
          <span className="divider-dot" style={{ background: 'rgba(255, 255, 255, 0.4)' }} />
          
          <div className="user-menu-wrapper">
            <button className="user-chip" onClick={() => setShowProfileMenu(!showProfileMenu)} style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fff 0%, #f0f0f0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#667eea',
                fontSize: '16px',
                fontWeight: '700',
                marginRight: '12px',
                border: '2px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}>
                {userName.charAt(0)}
              </div>
              <div style={{ textAlign: 'left' }}>
                <span className="chip-label" style={{ color: 'white', opacity: 1, fontSize: '12px' }}>{userName}</span>
                <strong style={{ fontSize: '11px', opacity: 0.85, display: 'block', color: 'rgba(255, 255, 255, 0.9)' }}>User Account</strong>
              </div>
            </button>
            
            {showProfileMenu && (
              <div className="user-menu" style={{
                background: 'radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%),    radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%),    #0e0f14',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                color: 'white'
              }}>
                <div style={{ 
                  padding: '16px', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: 'white' }}>{userName}</div>
                  <div style={{ fontSize: '12px', opacity: 0.85, color: 'rgba(255, 255, 255, 0.9)' }}>{userEmail}</div>
                </div>
                
                <button 
                  type="button" 
                  onClick={() => navigate('/user/dashboard')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    color: 'white',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                  onMouseLeave={(e) => e.target.style.background = 'none'}
                >
                  <span>📊</span> Dashboard
                </button>
                
                <button 
                  type="button" 
                  onClick={() => navigate('/user/my-courses')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    color: 'white',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                  onMouseLeave={(e) => e.target.style.background = 'none'}
                >
                  <span>📚</span> My Courses
                </button>
                
                <button 
                  type="button"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    color: 'white',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                  onMouseLeave={(e) => e.target.style.background = 'none'}
                >
                  <span>👤</span> My Profile
                </button>
                
                <button 
                  type="button"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    color: 'white',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                  onMouseLeave={(e) => e.target.style.background = 'none'}
                >
                  <span>⚙️</span> Settings
                </button>
                
                <div style={{ 
                  height: '1px', 
                  background: 'rgba(255, 255, 255, 0.15)', 
                  margin: '8px 0' 
                }} />
                
                <button 
                  type="button" 
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    color: '#ffe5e5',
                    fontWeight: '600',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 93, 93, 0.2)';
                    e.target.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                    e.target.style.color = '#ffe5e5';
                  }}
                >
                  <span>🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <style jsx>{`
        .search-cluster {
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }
        
        .search-cluster:hover {
          background: rgba(255, 255, 255, 0.25) !important;
          transform: translateY(-1px);
        }
        
        .search-cluster input::placeholder {
          color: rgba(255, 255, 255, 0.75);
        }
        
        .ghost-btn:hover {
          background: rgba(255, 255, 255, 0.25) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .user-chip:hover {
          background: rgba(255, 255, 255, 0.3) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .user-menu {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          border-radius: 14px;
          min-width: 260px;
          z-index: 1000;
          overflow: hidden;
          animation: slideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default UserHeader;
