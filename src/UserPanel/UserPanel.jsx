import React from 'react';
import { Outlet } from 'react-router-dom';
import UserHeader from './User-header-sidebar/UserHeader';
import UserSidebar from './User-header-sidebar/UserSidebar';

const UserPanel = () => {
  return (
    <div className="lms-container" style={{ display: 'flex', minHeight: '100vh' }}>
      <UserSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <UserHeader />
        <div style={{ 
          flex: 1, 
          overflow: 'auto', 
          padding: '2rem',
          background: '#f8f9fa'
        }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default UserPanel;
