import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

function LmsHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  // Context-aware base — supports both /learning-management-system and /user/learning-management-system
  const isUserSide = location.pathname.startsWith("/user");
  const lmsBase    = isUserSide ? "/user/learning-management-system" : "/learning-management-system";

  // Check if we're on a detail/form page (not the home page)
  const isOnDetailPage = location.pathname !== lmsBase;

  const goHome = () => {
    navigate(lmsBase);
  };

  return (
    <header className="lms-header">
      {isOnDetailPage && (
        <button 
          onClick={goHome} 
          className="lms-back-btn" 
          title="Go back to LMS Home"
          aria-label="Back to LMS Home"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      )}
      <div className="lms-header__copy">
        <p className="eyebrow">Learning Management</p>
        <h1>
          PTIS Learning Management System
          <span>Align training velocity with inspection goals.</span>
        </h1>
        <p className="lms-header__meta">
          Track employee enablement, approvals, and course momentum from one unified workspace.
        </p>
      </div>
      <div className="lms-header-actions">
        <button type="button" className="btn btn-ghost">
          Weekly Report
        </button>
        <Link to={`${lmsBase}/add-course`} className="btn btn-primary" style={{textDecoration:"none"}}>
          Launch Program
        </Link>
      </div>
    </header>
  );
}

export default LmsHeader;
