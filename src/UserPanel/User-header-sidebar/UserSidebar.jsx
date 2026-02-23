import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import ptisLogo from '/ptisLogo.png';

const iconPaths = {
  dashboard: "M3 10h7V3H3zm11 0h7V3h-7zm0 11h7v-8h-7zm-11 0h7v-5H3z",
  course: "M6 5h12a2 2 0 0 1 2 2v13l-6-3.2L9 20 3 17.3V7a2 2 0 0 1 2-2z",
  certificate: "M12 2 9.5 7 4 7.5 8 11l-1 5 5-2.5 5 2.5-1-5 4-3.5-5.5-.5z",
  lms: "M6 5h12a2 2 0 0 1 2 2v13l-6-3.2L9 20 3 17.3V7a2 2 0 0 1 2-2z",
  portal: "M3 10h7V3H3zm11 0h7V3h-7zm0 11h7v-8h-7zm-11 0h7v-5H3z",
  reports: "M5 4h14v2H5zm0 4h9v2H5zm0 4h14v2H5zm0 4h9v2H5z",
  help: "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 13h-2v-2h2zm1.94-5.06-.99.95A3 3 0 0 0 12 14h-2v-.38a4.64 4.64 0 0 1 1.31-3.31l1.12-1.16A1.31 1.31 0 0 0 11.83 7 1.51 1.51 0 0 0 10 8.5H8a3.5 3.5 0 0 1 6.75-1.31 3 3 0 0 1-.81 3.75z"
};

const UserSidebar = () => {
  const [userPermissions, setUserPermissions] = useState({
    lms: false,
    portal: false,
    reports: false
  });
  const [openSubmenu, setOpenSubmenu] = useState(null);

  useEffect(() => {
    const permissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
    setUserPermissions(permissions);
  }, []);

  const toggleSubmenu = (menu) => {
    setOpenSubmenu(openSubmenu === menu ? null : menu);
  };

  const renderIcon = (iconName) => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}>
      <path d={iconPaths[iconName] || iconPaths.dashboard} />
    </svg>
  );

  return (
    <div className="lms-sidebar">
      <div className="lms-sidebar-logo">
        <img src={ptisLogo} alt="PTIS Logo" style={{ height: '40px' }} />
        <div style={{ marginLeft: '12px' }}>
          <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a' }}>PTIS</div>
          <div style={{ fontSize: '11px', opacity: 0.6 }}>User Portal</div>
        </div>
      </div>
      
      <nav className="lms-sidebar-nav">
        {/* MAIN SECTION */}
        <div className="nav-section">
          <div className="nav-section-title">MAIN</div>
          
          <NavLink 
            to="/user/dashboard" 
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            end
          >
            <span className="nav-icon">{renderIcon('dashboard')}</span>
            <span className="nav-text">Dashboard</span>
          </NavLink>

          <NavLink 
            to="/user/my-courses" 
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
          >
            <span className="nav-icon">{renderIcon('course')}</span>
            <span className="nav-text">My Courses</span>
            <span className="nav-badge">5</span>
          </NavLink>

          <NavLink 
            to="/user/my-certificates" 
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
          >
            <span className="nav-icon">{renderIcon('certificate')}</span>
            <span className="nav-text">Certificates</span>
          </NavLink>
        </div>

        {/* ASSIGNED MODULES SECTION */}
        {(userPermissions.lms || userPermissions.portal || userPermissions.reports) && (
          <div className="nav-section">
            <div className="nav-section-title">ASSIGNED MODULES</div>
            
            {userPermissions.lms && (
              <NavLink 
                to="/user/lms-access" 
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <span className="nav-icon">{renderIcon('lms')}</span>
                <span className="nav-text">LMS Portal</span>
              </NavLink>
            )}

            {userPermissions.portal && (
              <NavLink 
                to="/user/portal-access" 
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <span className="nav-icon">{renderIcon('portal')}</span>
                <span className="nav-text">PTIS Portal</span>
              </NavLink>
            )}

            {userPermissions.reports && (
              <NavLink 
                to="/user/reports" 
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <span className="nav-icon">{renderIcon('reports')}</span>
                <span className="nav-text">Reports</span>
              </NavLink>
            )}
          </div>
        )}

        {/* SUPPORT SECTION */}
        <div className="nav-section">
          <div className="nav-section-title">SUPPORT</div>
          
          <NavLink 
            to="/user/help" 
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
          >
            <span className="nav-icon">{renderIcon('help')}</span>
            <span className="nav-text">Help Center</span>
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px',
          background: 'rgba(102, 126, 234, 0.08)',
          borderRadius: '8px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#4caf50',
            boxShadow: '0 0 0 2px rgba(76, 175, 80, 0.2)',
            animation: 'pulse 2s infinite'
          }}></div>
          <span style={{ fontSize: '13px', fontWeight: '500' }}>Online</span>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default UserSidebar;
