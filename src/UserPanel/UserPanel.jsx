import React from 'react';
import { Outlet } from 'react-router-dom';
import UserHeader from './User-header-sidebar/UserHeader';
import UserSidebar from './User-header-sidebar/UserSidebar';

const UserPanel = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0e0f14' }}>
      <UserSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <UserHeader />
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default UserPanel;
