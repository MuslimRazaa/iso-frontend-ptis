import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

// Bell + dropdown, keyed entirely by `email` — originally built inline inside
// UserHeader for employees, pulled out here so the admin dashboard can get
// the exact same notification experience (fetch/read/delete) instead of a
// second hand-written copy that drifts from it over time.
const NotificationBell = ({ email, onOpen, closeSignal }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  // Lets a sibling control (e.g. the profile menu) close this dropdown when
  // it opens, same as the three dropdowns closing each other used to do
  // before notifications/search were split out into their own components.
  useEffect(() => {
    if (closeSignal !== undefined) setShowNotifications(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeSignal]);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    let cancelled = false;
    const loadNotifications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/notifications/${email}`);
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
  }, [email]);

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
      await fetch(`${API_BASE_URL}/api/notifications/${email}/read-all`, { method: 'PUT' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Optimistic delete, rolled back if the request actually fails — a delete
  // that silently didn't happen server-side would resurface the "deleted"
  // notification on the next reload, which is worse than a brief flash back.
  const deleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    const previous = notifications;
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/single/${notificationId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Notification deleted.', 'success');
    } catch (error) {
      console.error('Error deleting notification:', error);
      setNotifications(previous);
      showToast('Could not delete that notification.', 'error');
    }
  };

  const deleteAllNotifications = async () => {
    if (notifications.length === 0) return;
    const count = notifications.length;
    if (!window.confirm(`Delete all ${count} notification${count === 1 ? '' : 's'}? This can't be undone.`)) return;
    const previous = notifications;
    setNotifications([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/${email}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast(`${count} notification${count === 1 ? '' : 's'} deleted.`, 'success');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      setNotifications(previous);
      showToast('Could not clear notifications.', 'error');
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
      navigate('/user/learning-management-system/my-courses');
      setShowNotifications(false);
    }
  };

  return (
    <div className="notif-wrapper" style={{ position: 'relative' }}>
      <button
        className="ghost-btn"
        type="button"
        onClick={() => {
          const next = !showNotifications;
          setShowNotifications(next);
          if (next) onOpen?.();
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
                  className="notif-row"
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', paddingRight: 24 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0' }}>{notif.title}</p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>{notif.body}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '6px 0 0 0' }}>{formatNotificationTime(notif.timestamp)}</p>
                    </div>
                    {!notif.read && (
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ff5d5d', marginTop: '4px', flexShrink: 0 }} />
                    )}
                  </div>
                  <button
                    type="button"
                    className="notif-delete-btn"
                    onClick={(e) => deleteNotification(e, notif.id)}
                    title="Delete notification"
                    style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.12)', border: 'none',
                      color: '#fff', fontSize: 13, lineHeight: 1, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'center', gap: '18px' }}>
              <button
                type="button"
                onClick={() => { markAllAsRead(); setShowNotifications(false); }}
                style={{ background: 'none', border: 'none', borderRadius: 999, padding: '4px 10px', color: '#ff5d5d', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 93, 93, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                Mark all as read
              </button>
              <button
                type="button"
                onClick={deleteAllNotifications}
                style={{ background: 'none', border: 'none', borderRadius: 999, padding: '4px 10px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s ease, color 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                Delete all
              </button>
            </div>
          )}
        </div>
      )}
      <style jsx>{`
        .notif-row {
          position: relative;
        }
        .notif-delete-btn {
          opacity: 0;
          transition: opacity 0.15s ease, background 0.15s ease;
        }
        .notif-row:hover .notif-delete-btn {
          opacity: 1;
        }
        .notif-delete-btn:hover {
          background: rgba(255, 93, 93, 0.25) !important;
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
