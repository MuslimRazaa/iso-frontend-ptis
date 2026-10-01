import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ptisLogo from '/ptisLogo.png';
import { API_ENDPOINTS } from '../../config/api';
import { getCurrentEmployeeId } from '../../ISOForms/utils/currentEmployee';
import NotificationBell from '../../components/NotificationBell';
import HeaderSearchBar from '../../components/HeaderSearchBar';

const UserHeader = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [myEmployeeId, setMyEmployeeId] = useState(null);
  const [closeOthersSignal, setCloseOthersSignal] = useState(0);
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

  useEffect(() => {
    getCurrentEmployeeId().then(setMyEmployeeId);
  }, []);

  // What this account is actually allowed to open — same object Login.jsx
  // wrote at sign-in. Used to decide which modules the search even asks,
  // rather than showing hits for data the sidebar itself would hide.
  const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
  const canSeeIsoForms = userPermissions.iso_forms || userPermissions.iso_forms_admin;
  const canSeeJobLog = userPermissions.cvs || Object.values(userPermissions.jlr || {}).some(Boolean);

  // Global search across every module this user actually has data in or
  // access to — ISO Forms entries (submitted + awaiting their decision),
  // their assigned LMS courses, and Job Log entries — so "search a form"
  // here jumps straight to that form instead of requiring that module first.
  const handleSearch = async (query) => {
    if (!myEmployeeId) return [];
    const q = query.toLowerCase();
    const [mine, pending, tasks, jobLog, allCourses] = await Promise.all([
      canSeeIsoForms
        ? fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}?employeeId=${myEmployeeId}&email=${encodeURIComponent(userEmail)}`)
            .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
        : { data: [] },
      canSeeIsoForms
        ? fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}?relatedEmployeeId=${myEmployeeId}`)
            .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
        : { data: [] },
      fetch(`${API_ENDPOINTS.TASK_ALLOCATIONS}/employee/${myEmployeeId}`)
        .then(r => r.ok ? r.json() : []).catch(() => []),
      canSeeJobLog
        ? fetch(API_ENDPOINTS.JOB_LOG).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
        : { data: [] },
      fetch(API_ENDPOINTS.COURSES).then(r => r.ok ? r.json() : []).catch(() => []),
    ]);

    const entries = [...(mine.data || mine || []), ...(pending.data || pending || [])];
    const seenEntry = new Set();
    const formResults = entries
      .filter(e => {
        if (seenEntry.has(e.id)) return false;
        seenEntry.add(e.id);
        return (e.template_name || '').toLowerCase().includes(q);
      })
      .map(e => ({
        type: 'Form',
        icon: '📄',
        id: `form-${e.id}`,
        title: e.template_name || 'Untitled Form',
        subtitle: `Status: ${e.status || 'pending'}`,
        path: `/user/iso-forms/entries/${e.id}`,
      }));

    const taskList = Array.isArray(tasks) ? tasks : [];
    const courseResults = taskList
      .filter(t => (t.course_title || '').toLowerCase().includes(q))
      .map(t => ({
        type: 'Course',
        icon: '📚',
        id: `course-${t.course_id}`,
        title: t.course_title,
        subtitle: `Status: ${t.status || 'Assigned'}`,
        path: `/user/learning-management-system/course/${t.course_id}`,
      }));

    // Courses that exist in the catalog but aren't assigned to this person
    // yet — these show up on My Courses as "Request Access", not a task,
    // so they were previously invisible to this search entirely.
    const assignedTitles = new Set(taskList.map(t => (t.course_title || '').toLowerCase()));
    const availableCourseResults = (Array.isArray(allCourses) ? allCourses : [])
      .filter(c => !assignedTitles.has((c.course_title || '').toLowerCase()))
      .filter(c => (c.course_title || '').toLowerCase().includes(q))
      .map(c => ({
        type: 'Available',
        icon: '➕',
        id: `available-${c.id}`,
        title: c.course_title,
        subtitle: 'Not assigned — request access',
        path: `/user/learning-management-system/my-courses?q=${encodeURIComponent(query)}`,
      }));

    const jobLogRows = jobLog.data || jobLog || [];
    const jobLogResults = (Array.isArray(jobLogRows) ? jobLogRows : [])
      .filter(j => [j.client, j.work_order, j.reference, j.nature_of_job, j.inspector_name]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
      .map(j => ({
        type: 'Job Log',
        icon: '🗂️',
        id: `joblog-${j.id}`,
        title: j.work_order || j.reference || j.client || `Job Log #${j.s_no ?? j.id}`,
        subtitle: `${j.client || 'Job Log'}${j.status ? ` · ${j.status}` : ''}`,
        path: `/user/job-log/entries?q=${encodeURIComponent(query)}`,
      }));

    return [...formResults, ...courseResults, ...availableCourseResults, ...jobLogResults];
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
          <HeaderSearchBar
            onSearch={handleSearch}
            placeholder="Search forms, courses..."
            onFocus={() => setShowProfileMenu(false)}
            closeSignal={closeOthersSignal}
          />

          <span className="divider-dot header-divider" style={{ background: 'rgba(255, 255, 255, 0.4)' }} />

          <NotificationBell
            email={userEmail}
            onOpen={() => setShowProfileMenu(false)}
            closeSignal={closeOthersSignal}
          />

          <span className="divider-dot header-divider" style={{ background: 'rgba(255, 255, 255, 0.4)' }} />

          <div className="user-menu-wrapper">
            <button className="user-chip" onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setCloseOthersSignal(s => s + 1);
            }} style={{
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
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    marginTop: '8px',
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
        .header-controls {
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        @media (max-width: 640px) {
          .header-controls {
            width: 100%;
          }
          .header-divider {
            display: none;
          }
        }

        @media (max-width: 400px) {
          .user-chip .chip-label,
          .user-chip strong {
            display: none;
          }
          .user-chip {
            padding: 8px 12px !important;
          }
          .user-chip > div:first-child {
            margin-right: 0 !important;
          }
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
