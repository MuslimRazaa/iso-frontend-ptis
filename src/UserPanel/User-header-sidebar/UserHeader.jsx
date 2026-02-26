import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

function UserHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on a detail/form page (not the dashboard page)
  const isOnDetailPage = location.pathname !== "/user/dashboard";
  
  const goHome = () => {
    navigate("/user/dashboard");
  };

  // Get page title based on route
  const getPageInfo = () => {
    if (location.pathname.includes('/my-courses')) {
      return { title: 'My Courses', subtitle: 'Access your assigned training and track your progress', icon: '📚' };
    } else if (location.pathname.includes('/my-certificates')) {
      return { title: 'My Certificates', subtitle: 'View and download your earned certificates', icon: '🏆' };
    } else if (location.pathname.includes('/course/')) {
      return { title: 'Course Details', subtitle: 'Learn and complete course modules', icon: '📖' };
    }
    return { title: 'My Learning Dashboard', subtitle: 'Access your courses, track progress, and earn certificates', icon: '🎓' };
  };

  const pageInfo = getPageInfo();

  return (
    <header style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '2rem 2.5rem',
      marginBottom: '2rem',
      boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background elements */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
        borderRadius: '50%'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-50px',
        left: '-50px',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        borderRadius: '50%'
      }}></div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Back button */}
        {isOnDetailPage && (
          <button 
            onClick={goHome} 
            style={{
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              marginBottom: '1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.2)';
            }}
            title="Go back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back to Dashboard</span>
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <p style={{ 
              color: 'rgba(255,255,255,0.9)', 
              fontSize: '0.85rem', 
              fontWeight: '700', 
              letterSpacing: '1.5px', 
              textTransform: 'uppercase',
              marginBottom: '0.75rem'
            }}>
              {pageInfo.icon} Employee Learning Portal
            </p>
            <h1 style={{ 
              color: '#fff', 
              fontSize: '2.25rem', 
              fontWeight: '800', 
              margin: '0 0 0.75rem 0', 
              lineHeight: '1.2',
              textShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
              {pageInfo.title}
            </h1>
            <p style={{ 
              color: 'rgba(255,255,255,0.95)', 
              fontSize: '1.05rem', 
              lineHeight: '1.6',
              maxWidth: '600px'
            }}>
              {pageInfo.subtitle}
            </p>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <Link 
              to="/user/my-courses" 
              style={{
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '0.9rem',
                border: '1px solid rgba(255,255,255,0.3)',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.2)';
              }}
            >
              <span>📚</span>
              <span>My Courses</span>
            </Link>
            <Link 
              to="/user/my-certificates" 
              style={{
                textDecoration: 'none',
                background: '#fff',
                color: '#667eea',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.9rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
              }}
            >
              <span>🏆</span>
              <span>Certificates</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default UserHeader;
