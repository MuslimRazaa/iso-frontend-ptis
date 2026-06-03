import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ptisLogo from '/ptisLogo.png';

const iconPaths = {
  dashboard: "M3 10h7V3H3zm11 0h7V3h-7zm0 11h7v-8h-7zm-11 0h7v-5H3z",
  courses:   "M6 5h12a2 2 0 0 1 2 2v13l-6-3.2L9 20 3 17.3V7a2 2 0 0 1 2-2z",
  browse:    "M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z",
  cert:      "M12 2 9.5 7 4 7.5 8 11l-1 5 5-2.5 5 2.5-1-5 4-3.5-5.5-.5z",
  portal:    "M3 10h7V3H3zm11 0h7V3h-7zm0 11h7v-8h-7zm-11 0h7v-5H3z",
  cv:        "M12 6h18v4H12zm0 6h18v4H12zm0 6h12v4H12z",
  reports:   "M5 4h14v2H5zm0 4h9v2H5zm0 4h14v2H5zm0 4h9v2H5z",
  help:      "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 13h-2v-2h2zm1.94-5.06-.99.95A3 3 0 0 0 12 14h-2v-.38a4.64 4.64 0 0 1 1.31-3.31l1.12-1.16A1.31 1.31 0 0 0 11.83 7 1.51 1.51 0 0 0 10 8.5H8a3.5 3.5 0 0 1 6.75-1.31 3 3 0 0 1-.81 3.75z",
  logout:    "M17 8l-1.41 1.41L17.17 11H9v2h8.17l-1.58 1.58L17 16l4-4-4-4zM5 5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7v-2H5V5z",
};

const SvgIcon = ({ id }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px', flexShrink: 0 }}>
    <path d={iconPaths[id] || iconPaths.dashboard} />
  </svg>
);

const UserSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [permissions, setPermissions] = useState({});
  const navigate = useNavigate();

  const userEmail = localStorage.getItem('userEmail') || '';
  const userName = userEmail.split('@')[0].replace(/\./g, ' ').split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  useEffect(() => {
    const p = JSON.parse(localStorage.getItem('userPermissions') || '{}');
    setPermissions(p);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/');
  };

  const navItem = (to, iconId, label, badge = null) => (
    <NavLink
      to={to}
      className={({ isActive }) => `user-nav-item${isActive ? ' active' : ''}`}
      title={!isExpanded ? label : ''}
    >
      <span className="user-nav-icon"><SvgIcon id={iconId} /></span>
      <span className="user-nav-label">{label}</span>
      {badge && <span className="user-nav-badge">{badge}</span>}
    </NavLink>
  );

  return (
    <aside
      className={`user-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Brand */}
      <div className="user-sidebar-brand">
        <div className="user-sidebar-logo">
          <img src={ptisLogo} alt="PTIS" />
        </div>
        <span className="user-sidebar-brand-text">PTIS Portal</span>
      </div>

      {/* Nav */}
      <nav className="user-sidebar-nav">

        <div className="user-nav-section">
          <span className="user-nav-section-title">MAIN</span>
          {navItem('/user/dashboard', 'dashboard', 'Dashboard')}
        </div>

        {(permissions.lms || permissions.portal || permissions.cvs || permissions.reports || permissions.testing) && (
          <div className="user-nav-section">
            <span className="user-nav-section-title">MODULES</span>
            {permissions.lms     && navItem('/user/learning-management-system', 'courses', 'LMS')}
            {permissions.testing && navItem('/user/testing', 'cert', 'Testing')}
            {permissions.portal  && navItem('/user/portal',  'portal', 'PTIS Portal')}
            {permissions.cvs     && navItem('/user/job-log', 'cv',     'Job Log')}
            {permissions.reports && navItem('/user/reports', 'reports','Reports')}
          </div>
        )}

        <div className="user-nav-section">
          <span className="user-nav-section-title">SUPPORT</span>
          {navItem('/user/help', 'help', 'Help Center')}
        </div>
      </nav>

      {/* Footer */}
      <div className="user-sidebar-footer">
        <div className="user-sidebar-user">
          <div className="user-sidebar-avatar">{userName.charAt(0)}</div>
          <div className="user-sidebar-user-info">
            <span className="user-sidebar-user-name">{userName}</span>
            <span className="user-sidebar-user-role">Employee</span>
          </div>
        </div>
        <button className="user-sidebar-logout" onClick={handleLogout} title="Logout">
          <SvgIcon id="logout" />
        </button>
      </div>

      <style>{`
        .user-sidebar {
          width: 64px;
          min-height: 100vh;
          background: radial-gradient(circle at 10% 20%, rgba(255,93,93,0.12), transparent 50%),
                      linear-gradient(180deg, #12131d 0%, #0e0f17 100%);
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .user-sidebar.expanded { width: 220px; }

        .user-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px 14px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          min-height: 64px;
        }
        .user-sidebar-logo {
          width: 36px;
          height: 36px;
          background: rgba(255,255,255,0.95);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 4px;
        }
        .user-sidebar-logo img { width: 100%; height: 100%; object-fit: contain; }
        .user-sidebar-brand-text {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .user-sidebar.expanded .user-sidebar-brand-text { opacity: 1; }

        .user-sidebar-nav {
          flex: 1;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .user-nav-section { display: flex; flex-direction: column; gap: 2px; margin-bottom: 4px; }
        .user-nav-section-title {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: rgba(255,255,255,0.25);
          padding: 10px 10px 4px;
          white-space: nowrap;
          overflow: hidden;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .user-sidebar.expanded .user-nav-section-title { opacity: 1; }

        .user-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 10px;
          border-radius: 8px;
          text-decoration: none;
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          font-weight: 500;
          transition: all 0.18s ease;
          white-space: nowrap;
          position: relative;
          min-height: 40px;
        }
        .user-nav-item:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.85);
        }
        .user-nav-item.active {
          background: rgba(255,93,93,0.15);
          color: #ff5d5d;
          border-left: 2px solid #ff5d5d;
        }
        .user-nav-icon { display: flex; align-items: center; flex-shrink: 0; }
        .user-nav-label {
          opacity: 0;
          transition: opacity 0.2s;
          overflow: hidden;
        }
        .user-sidebar.expanded .user-nav-label { opacity: 1; }
        .user-nav-badge {
          margin-left: auto;
          background: rgba(255,93,93,0.2);
          color: #ff5d5d;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .user-sidebar.expanded .user-nav-badge { opacity: 1; }

        .user-sidebar-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 8px;
          border-top: 1px solid rgba(255,255,255,0.07);
          overflow: hidden;
        }
        .user-sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
        .user-sidebar-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #ff5d5d, #ff8c5a);
          color: white;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .user-sidebar-user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .user-sidebar.expanded .user-sidebar-user-info { opacity: 1; }
        .user-sidebar-user-name {
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-sidebar-user-role { font-size: 10px; color: rgba(255,255,255,0.4); }
        .user-sidebar-logout {
          background: none;
          border: none;
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          transition: all 0.18s;
          opacity: 0;
        }
        .user-sidebar.expanded .user-sidebar-logout { opacity: 1; }
        .user-sidebar-logout:hover { background: rgba(255,93,93,0.15); color: #ff5d5d; }
      `}</style>
    </aside>
  );
};

export default UserSidebar;
