import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

function PortalHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on a detail/form page (not the home page)
  const isOnDetailPage = location.pathname !== "/portal";
  
  const goHome = () => {
    navigate("/portal");
  };

  return (
    <header className="lms-header">
      {isOnDetailPage && (
        <button 
          onClick={goHome} 
          className="lms-back-btn" 
          title="Go back to Portal Home"
          aria-label="Back to Portal Home"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      )}
      <div className="lms-header__copy">
        <p className="eyebrow">PTIS Enterprise Portal</p>
        <h1>
          Portal Management System
          <span>Centralize operations and administrative controls.</span>
        </h1>
        <p className="lms-header__meta">
          Manage system access, user roles, and streamline organizational workflows from a unified interface.
        </p>
      </div>
      <div className="lms-header-actions">
        {/* <button type="button" className="btn btn-ghost">
          System Report
        </button> */}
        <Link to="/portal/add-admin" className="btn btn-primary" style={{textDecoration:"none"}}>
          Add Admin
        </Link>
      </div>
    </header>
  );
}

export default PortalHeader;
