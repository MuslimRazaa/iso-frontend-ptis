import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ptisLogo from '/ptisLogo.png';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api';
import { getCurrentEmployeeId } from '../../ISOForms/utils/currentEmployee';

const UserHeader = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [myEmployeeId, setMyEmployeeId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const searchBoxRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

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
    let cancelled = false;
    const loadNotifications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/notifications/${userEmail}`);
        if (response.ok && !cancelled) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };
    loadNotifications();
    return () => { cancelled = true; };
  }, [userEmail]);

  const markAsRead = async (notificationId) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, { method: 'PUT' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${userEmail}/read-all`, { method: 'PUT' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now - notifTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return notifTime.toLocaleDateString();
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) markAsRead(notification.id);
    if (notification.data?.url) {
      navigate(notification.data.url);
      setShowNotifications(false);
    } else if (notification.data?.type === 'task_assigned') {
      navigate('/user/task-allocations');
      setShowNotifications(false);
    }
  };

  useEffect(() => {
    getCurrentEmployeeId().then(setMyEmployeeId);
  }, []);

  // Close the search dropdown on an outside click (matches the notif/profile
  // dropdowns, which close via their own toggle buttons instead).
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2 || !myEmployeeId) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const q = query.toLowerCase();
        const [mine, pending, tasks, jobLog] = await Promise.all([
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
        ]);
        if (cancelled) return;

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

        const courseResults = (Array.isArray(tasks) ? tasks : [])
          .filter(t => (t.course_title || '').toLowerCase().includes(q))
          .map(t => ({
            type: 'Course',
            icon: '📚',
            id: `course-${t.course_id}`,
            title: t.course_title,
            subtitle: `Status: ${t.status || 'Assigned'}`,
            path: `/user/learning-management-system/course/${t.course_id}`,
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

        setSearchResults([...formResults, ...courseResults, ...jobLogResults]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, myEmployeeId, userEmail, canSeeIsoForms, canSeeJobLog]);

  const handleSearchResultClick = (result) => {
    navigate(result.path);
    setSearchQuery('');
    setShowSearchResults(false);
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
          <div className="search-cluster-wrapper" ref={searchBoxRef} style={{ position: 'relative' }}>
            <div className="search-cluster" style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '10px 18px',
              borderRadius: '12px'
            }}>
              <svg viewBox="0 0 20 20" fill="none" style={{ width: '18px', height: '18px', opacity: 0.9, color: 'white', flexShrink: 0 }}>
                <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search forms, courses..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                className="search-cluster-input"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  color: 'white',
                  width: '100%',
                  minWidth: 0
                }}
              />
            </div>

            {showSearchResults && searchQuery.trim().length >= 2 && (
              <div className="notif-dropdown" style={{
                position: 'absolute',
                top: 'calc(100% + 12px)',
                left: 0,
                width: 'min(380px, calc(100vw - 32px))',
                background: 'radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%), radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%), #0e0f14',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                borderRadius: '14px',
                zIndex: 1000,
                overflow: 'hidden',
                color: 'white'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.06)',
                }}>
                  <strong style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
                    {searchLoading ? 'Searching…' : `Results (${searchResults.length})`}
                  </strong>
                </div>
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {!searchLoading && searchResults.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                      <p style={{ fontSize: '13px', margin: 0 }}>No matches for "{searchQuery}"</p>
                    </div>
                  )}
                  {searchResults.map(result => (
                    <div
                      key={result.id}
                      onClick={() => handleSearchResultClick(result)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                        background: 'rgba(255, 93, 93, 0.15)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                      }}>{result.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {result.title}
                        </p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>{result.subtitle}</p>
                      </div>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                        color: '#ff5d5d', background: 'rgba(255, 93, 93, 0.15)',
                        padding: '3px 8px', borderRadius: 999, flexShrink: 0
                      }}>{result.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span className="divider-dot header-divider" style={{ background: 'rgba(255, 255, 255, 0.4)' }} />

          <div className="notif-wrapper" style={{ position: 'relative' }}>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              style={{
                position: 'relative',
                background: showNotifications ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: 'white',
                backdropFilter: 'blur(10px)',
                padding: '10px 14px',
                cursor: 'pointer'
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px' }}>
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '8px',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 3px',
                  borderRadius: '50%',
                  background: '#ff5d5d',
                  border: '2px solid #0e0f14',
                  boxShadow: '0 0 8px rgba(255, 93, 93, 0.6)',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div className="notif-dropdown" style={{
                position: 'absolute',
                top: 'calc(100% + 12px)',
                right: 0,
                width: 'min(360px, calc(100vw - 32px))',
                background: 'radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%), radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%), #0e0f14',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                borderRadius: '14px',
                zIndex: 1000,
                overflow: 'hidden',
                color: 'white'
              }}>
                <div style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <strong style={{ fontSize: '14px' }}>Notifications</strong>
                  {unreadCount > 0 && (
                    <span style={{
                      fontSize: '11px', fontWeight: 700, color: '#fff',
                      background: '#ff5d5d', padding: '2px 8px', borderRadius: 999
                    }}>{unreadCount} unread</span>
                  )}
                </div>
                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔔</div>
                      <p style={{ fontSize: '13px', margin: 0 }}>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid rgba(255,255,255,0.08)',
                          cursor: 'pointer',
                          background: !notif.read ? 'rgba(255, 93, 93, 0.1)' : 'transparent',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = !notif.read ? 'rgba(255, 93, 93, 0.1)' : 'transparent'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0' }}>{notif.title}</p>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>{notif.body}</p>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '6px 0 0 0' }}>{formatNotificationTime(notif.timestamp)}</p>
                          </div>
                          {!notif.read && (
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ff5d5d', marginTop: '4px', flexShrink: 0 }} />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.15)', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => { markAllAsRead(); setShowNotifications(false); }}
                      style={{ background: 'none', border: 'none', color: '#ff5d5d', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Mark all as read
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <span className="divider-dot header-divider" style={{ background: 'rgba(255, 255, 255, 0.4)' }} />
          
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
        .search-cluster-wrapper {
          width: clamp(140px, 22vw, 220px);
          flex-shrink: 1;
        }

        .search-cluster {
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .search-cluster:hover {
          background: rgba(255, 255, 255, 0.25) !important;
          transform: translateY(-1px);
        }

        .search-cluster input::placeholder {
          color: rgba(255, 255, 255, 0.75);
        }

        .header-controls {
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        @media (max-width: 640px) {
          .search-cluster-wrapper {
            width: 100%;
            order: 1;
          }
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
