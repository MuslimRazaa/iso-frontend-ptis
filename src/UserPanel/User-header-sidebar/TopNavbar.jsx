import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';

const TopNavbar = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  
  const userEmail = localStorage.getItem('userEmail') || 'user@ptis.com';
  const userName = userEmail.split('@')[0].replace(/\./g, ' ').split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');

  const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
  const hasAdminAccess = userPermissions.lms || userPermissions.portal;

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut for search (Ctrl+K)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('top-navbar-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPermissions');
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleReturnToMainMenu = () => {
    if (userPermissions.lms) {
      navigate('/learning-management-system');
    } else if (userPermissions.portal) {
      navigate('/portal');
    } else {
      navigate('/');
    }
  };

  // Format timestamp for notifications
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
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.data?.url) {
      navigate(notification.data.url);
      setShowNotifications(false);
    } else if (notification.data?.type === 'task_assigned') {
      navigate('/user/task-allocations');
      setShowNotifications(false);
    }
  };

  const quickAccessItems = [
    { title: "ISO 17020 Training", type: "Course", path: "/user/course/1" },
    { title: "Quality Control Basics", type: "Course", path: "/user/course/2" },
    { title: "My Certificates", type: "Page", path: "/user/my-certificates" },
    { title: "Task Allocations", type: "Page", path: "/user/task-allocations" }
    // Testing tab hidden - accessible via course completion only
    // { title: "Testing & Assessments", type: "Page", path: "/user/testing" }
  ];

  // Help quick tips
  const helpTips = [
    { icon: '⌨', title: 'Keyboard Shortcuts', tip: 'Press Ctrl+K to quickly search courses and pages' },
    { icon: '📖', title: 'Course Progress', tip: 'Your progress is automatically saved as you complete lessons' },
    { icon: '🎓', title: 'Certificates', tip: 'Complete all course requirements to earn your certificate' },
    { icon: '🔔', title: 'Notifications', tip: 'Check notifications for new course assignments and updates' }
  ];

  const filteredSearchResults = searchQuery.length > 0 
    ? quickAccessItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSearchClick = (item) => {
    if (item.type === 'Course') {
      setSelectedCourse(item);
      setShowCourseModal(true);
      setSearchQuery('');
      setShowSearchResults(false);
    } else {
      navigate(item.path);
      setSearchQuery('');
      setShowSearchResults(false);
    }
  };

  const handleViewCourse = () => {
    if (selectedCourse) {
      navigate(selectedCourse.path);
      setShowCourseModal(false);
      setSelectedCourse(null);
    }
  };

  const handleCloseCourseModal = () => {
    setShowCourseModal(false);
    setSelectedCourse(null);
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
      
      <nav style={{
        background: '#fff',
        borderBottom: '2px solid #E2E8F0',
        padding: '0.75rem 2.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    }}>
      {/* Left Side - Welcome & Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div>
          <h2 style={{ 
            fontSize: '1.1rem', 
            fontWeight: '700', 
            color: '#1a202c',
            margin: 0,
            lineHeight: '1.2'
          }}>
            Welcome back, {userName}
          </h2>
          <p style={{ 
            fontSize: '0.8rem', 
            color: '#64748b', 
            margin: '0.25rem 0 0 0',
            fontWeight: '500'
          }}>
            {formatDate(currentDateTime)}
          </p>
        </div>

      </div>

      {/* Right Side - Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <input 
            id="top-navbar-search"
            type="text" 
            placeholder="Search courses, certificates..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(e.target.value.length > 0);
              setShowNotifications(false);
              setShowProfileMenu(false);
              setShowHelpMenu(false);
            }}
            onFocus={(e) => {
              if (searchQuery.length > 0) setShowSearchResults(true);
              e.target.style.borderColor = '#E63946';
              e.target.style.boxShadow = '0 0 0 3px rgba(230, 57, 70, 0.1)';
            }}
            onBlur={(e) => {
              setTimeout(() => {
                e.target.style.borderColor = '#E2E8F0';
                e.target.style.boxShadow = 'none';
                setShowSearchResults(false);
              }, 200);
            }}
            style={{
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              borderRadius: '10px',
              border: '2px solid #E2E8F0',
              fontSize: '0.875rem',
              width: '280px',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          />
          <svg 
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '18px',
              height: '18px'
            }}
            fill="none" 
            stroke="#94a3b8" 
            strokeWidth="2" 
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>

          {/* Keyboard Shortcut Hint */}
          <div style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#F1F5F9',
            padding: '0.25rem 0.5rem',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: '600',
            color: '#64748b',
            border: '1px solid #E2E8F0'
          }}>
            Ctrl+K
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && filteredSearchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '55px',
              left: 0,
              width: '100%',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid #E2E8F0',
              zIndex: 1000,
              maxHeight: '350px',
              overflowY: 'auto'
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #E2E8F0',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Quick Access ({filteredSearchResults.length})
              </div>
              {filteredSearchResults.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleSearchClick(item)}
                  style={{
                    padding: '0.875rem 1rem',
                    cursor: 'pointer',
                    borderBottom: index < filteredSearchResults.length - 1 ? '1px solid #F1F5F9' : 'none',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F8F9FA'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                >
                  <div>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      color: '#1a202c',
                      margin: 0
                    }}>
                      {item.title}
                    </p>
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: '#64748b',
                      margin: '0.25rem 0 0 0'
                    }}>
                      {item.type}
                    </p>
                  </div>
                  <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              ))}
            </div>
          )}

          {/* No Results Message */}
          {showSearchResults && searchQuery.length > 0 && filteredSearchResults.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '55px',
              left: 0,
              width: '100%',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid #E2E8F0',
              zIndex: 1000,
              padding: '2rem',
              textAlign: 'center'
            }}>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#64748b',
                margin: 0
              }}>
                No results found for "{searchQuery}"
              </p>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
              setShowHelpMenu(false);
            }}
            style={{
              background: '#F8F9FA',
              border: '2px solid #E2E8F0',
              borderRadius: '10px',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E63946';
              e.currentTarget.style.borderColor = '#E63946';
              e.currentTarget.querySelector('svg').style.stroke = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F8F9FA';
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.querySelector('svg').style.stroke = '#64748b';
            }}
          >
            <svg width="20" height="20" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#E63946',
                color: '#fff',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '0.7rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #fff'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '55px',
              right: 0,
              width: '380px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid #E2E8F0',
              zIndex: 1000
            }}>
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1a202c', margin: 0 }}>
                  Notifications
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {unreadCount} unread
                </span>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#94a3b8'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                  <div 
                    key={notif.id}
                    style={{
                      padding: '1rem 1.25rem',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      background: !notif.read ? '#FFF5F5' : '#fff',
                      transition: 'background 0.2s ease'
                    }}
                    onClick={() => handleNotificationClick(notif)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F8F9FA'}
                    onMouseLeave={(e) => e.currentTarget.style.background = !notif.read ? '#FFF5F5' : '#fff'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: '#1a202c',
                          margin: '0 0 0.25rem 0'
                        }}>
                          {notif.title}
                        </p>
                        <p style={{ 
                          fontSize: '0.8rem', 
                          color: '#64748b',
                          margin: 0
                        }}>
                          {notif.body}
                        </p>
                        <p style={{ 
                          fontSize: '0.7rem', 
                          color: '#94a3b8',
                          margin: '0.5rem 0 0 0'
                        }}>
                          {formatNotificationTime(notif.timestamp)}
                        </p>
                      </div>
                      {!notif.read && (
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#E63946',
                          marginLeft: '0.5rem',
                          marginTop: '0.25rem'
                        }}></div>
                      )}
                    </div>
                  </div>
                  ))
                )}
              </div>
              <div style={{
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid #E2E8F0',
                textAlign: 'center'
              }}>
                <button 
                  onClick={() => {
                    markAllAsRead();
                    setShowNotifications(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#E63946',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Mark all as read
                </button>
                <button 
                  onClick={() => {
                    setShowNotifications(false);
                    // Navigate to all notifications page if needed
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007BFF',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginLeft: '1rem'
                  }}
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Help/Support */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowHelpMenu(!showHelpMenu);
              setShowNotifications(false);
              setShowProfileMenu(false);
            }}
            style={{
              background: showHelpMenu ? '#E63946' : '#F8F9FA',
              border: `2px solid ${showHelpMenu ? '#E63946' : '#E2E8F0'}`,
              borderRadius: '10px',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (!showHelpMenu) {
                e.currentTarget.style.background = '#E63946';
                e.currentTarget.style.borderColor = '#E63946';
                e.currentTarget.querySelector('svg').style.stroke = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              if (!showHelpMenu) {
                e.currentTarget.style.background = '#F8F9FA';
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.querySelector('svg').style.stroke = '#64748b';
              }
            }}
          >
            <svg width="20" height="20" fill="none" stroke={showHelpMenu ? '#fff' : '#64748b'} strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>

          {/* Help Menu Dropdown */}
          {showHelpMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: '0',
              background: '#fff',
              borderRadius: '15px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              width: '350px',
              zIndex: 1000,
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              <div style={{
                padding: '1.25rem',
                borderBottom: '1px solid #E2E8F0'
              }}>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#1a202c'
                }}>Quick Tips & Help</h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#64748b'
                }}>Helpful tips to get the most out of your learning experience</p>
              </div>

              <div style={{ padding: '0.5rem' }}>
                {helpTips.map((tip, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F8F9FA';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start'
                    }}>
                      <div style={{
                        fontSize: '1.5rem',
                        lineHeight: 1
                      }}>{tip.icon}</div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          margin: '0 0 0.25rem 0',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#1a202c'
                        }}>{tip.title}</h4>
                        <p style={{
                          margin: 0,
                          fontSize: '0.8rem',
                          color: '#64748b',
                          lineHeight: '1.5'
                        }}>{tip.tip}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                padding: '1rem',
                borderTop: '1px solid #E2E8F0',
                background: '#F8F9FA',
                borderBottomLeftRadius: '15px',
                borderBottomRightRadius: '15px'
              }}>
                <button style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #E63946 0%, #FA5252 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 5px 15px rgba(230, 57, 70, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  Contact Support
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{
          width: '1px',
          height: '40px',
          background: '#E2E8F0'
        }}></div>

        {/* Profile Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
              setShowHelpMenu(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: '#F8F9FA',
              border: '2px solid #E2E8F0',
              borderRadius: '10px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E63946';
              e.currentTarget.style.borderColor = '#E63946';
              e.currentTarget.querySelector('.profile-icon').style.background = '#fff';
              e.currentTarget.querySelector('.profile-icon').style.color = '#E63946';
              e.currentTarget.querySelector('.profile-name').style.color = '#fff';
              e.currentTarget.querySelector('svg').style.stroke = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F8F9FA';
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.querySelector('.profile-icon').style.background = '#E63946';
              e.currentTarget.querySelector('.profile-icon').style.color = '#fff';
              e.currentTarget.querySelector('.profile-name').style.color = '#1a202c';
              e.currentTarget.querySelector('svg').style.stroke = '#64748b';
            }}
          >
            <div 
              className="profile-icon"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#E63946',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                fontWeight: '700',
                transition: 'all 0.3s ease'
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <span 
              className="profile-name"
              style={{ 
                fontSize: '0.9rem', 
                fontWeight: '600', 
                color: '#1a202c',
                transition: 'all 0.3s ease'
              }}
            >
              {userName}
            </span>
            <svg width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '55px',
              right: 0,
              width: '280px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid #E2E8F0',
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              {/* Profile Info */}
              <div style={{
                padding: '1.25rem',
                background: 'linear-gradient(135deg, #E63946 0%, #FA5252 100%)',
                color: '#fff'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: '#fff',
                  color: '#E63946',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  marginBottom: '0.75rem'
                }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 0.25rem 0' }}>
                  {userName}
                </h3>
                <p style={{ fontSize: '0.85rem', opacity: 0.9, margin: 0 }}>
                  {userEmail}
                </p>
              </div>

              {/* Menu Items */}
              <div style={{ padding: '0.5rem' }}>
                <button
                  onClick={() => navigate('/user/dashboard')}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                    color: '#1a202c',
                    fontWeight: '500',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F8F9FA'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  <span>Profile</span>
                </button>

                <button
                  onClick={() => navigate('/user/my-courses')}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                    color: '#1a202c',
                    fontWeight: '500',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F8F9FA'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                  <span>My Courses</span>
                </button>

                {hasAdminAccess && (
                  <>
                    <div style={{
                      height: '1px',
                      background: '#E2E8F0',
                      margin: '0.5rem 0'
                    }}></div>

                    <button
                      onClick={handleReturnToMainMenu}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: 'none',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '0.9rem',
                        color: '#E63946',
                        fontWeight: '600',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FFF5F5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                      <span>Return to Main Menu</span>
                    </button>
                  </>
                )}

                <div style={{
                  height: '1px',
                  background: '#E2E8F0',
                  margin: '0.5rem 0'
                }}></div>

                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                    color: '#E63946',
                    fontWeight: '600',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FFF5F5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Course Preview Modal */}
      {showCourseModal && selectedCourse && (
        <>
          {/* Backdrop */}
          <div 
            onClick={handleCloseCourseModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 9998,
              backdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.3s ease'
            }}
          />
          
          {/* Modal Content */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 9999,
            width: '90%',
            maxWidth: '550px',
            animation: 'slideUp 0.3s ease',
            overflow: 'hidden'
          }}>
            {/* Close Button */}
            <button
              onClick={handleCloseCourseModal}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#F8F9FA',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E63946';
                e.currentTarget.querySelector('svg').style.stroke = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F8F9FA';
                e.currentTarget.querySelector('svg').style.stroke = '#64748b';
              }}
            >
              <svg width="18" height="18" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Modal Header with Gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #E63946 0%, #FA5252 100%)',
              padding: '3rem 2rem 2rem 2rem',
              color: '#fff',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative circles */}
              <div style={{
                position: 'absolute',
                top: '-30px',
                right: '-30px',
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                filter: 'blur(40px)'
              }}></div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '15px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}>
                  <svg width="32" height="32" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '0.35rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '0.5rem'
                  }}>
                    Course Preview
                  </div>
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    margin: 0,
                    lineHeight: '1.3'
                  }}>
                    {selectedCourse.title}
                  </h2>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '2rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  background: '#F8F9FA',
                  padding: '1rem',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.5rem auto'
                  }}>
                    <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    margin: '0 0 0.25rem 0'
                  }}>Duration</p>
                  <p style={{
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    color: '#1a202c',
                    margin: 0
                  }}>4 Hours</p>
                </div>

                <div style={{
                  background: '#F8F9FA',
                  padding: '1rem',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.5rem auto'
                  }}>
                    <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    margin: '0 0 0.25rem 0'
                  }}>Students</p>
                  <p style={{
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    color: '#1a202c',
                    margin: 0
                  }}>150+</p>
                </div>

                <div style={{
                  background: '#F8F9FA',
                  padding: '1rem',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.5rem auto'
                  }}>
                    <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  </div>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    margin: '0 0 0.25rem 0'
                  }}>Level</p>
                  <p style={{
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    color: '#1a202c',
                    margin: 0
                  }}>Beginner</p>
                </div>
              </div>

              <div style={{
                background: '#F8F9FA',
                padding: '1.25rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                border: '2px solid #E2E8F0'
              }}>
                <h4 style={{
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: '#1a202c',
                  margin: '0 0 0.75rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="18" height="18" fill="none" stroke="#E63946" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                  What You'll Learn
                </h4>
                <ul style={{
                  margin: 0,
                  paddingLeft: '1.5rem',
                  color: '#64748b',
                  fontSize: '0.875rem',
                  lineHeight: '1.8'
                }}>
                  <li>Comprehensive understanding of inspection standards</li>
                  <li>Practical application of quality control methods</li>
                  <li>Industry best practices and compliance requirements</li>
                  <li>Hands-on assessment and certification preparation</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem'
              }}>
                <button
                  onClick={handleViewCourse}
                  style={{
                    flex: 1,
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(135deg, #E63946 0%, #FA5252 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(230, 57, 70, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(230, 57, 70, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(230, 57, 70, 0.3)';
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  View Course
                </button>

                <button
                  onClick={handleCloseCourseModal}
                  style={{
                    padding: '1rem 1.5rem',
                    background: '#F8F9FA',
                    color: '#64748b',
                    border: '2px solid #E2E8F0',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#E2E8F0';
                    e.currentTarget.style.color = '#1a202c';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F8F9FA';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
    </>
  );
};

export default TopNavbar;
