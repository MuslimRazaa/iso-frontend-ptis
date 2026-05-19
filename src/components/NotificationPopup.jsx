import React, { useState, useEffect } from 'react';

const NotificationPopup = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      
      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  if (!notification) return null;

  const title = notification.notification?.title || notification.title || 'Notification';
  const body = notification.notification?.body || notification.body || '';
  const icon = notification.notification?.icon || notification.icon;

  return (
    <div 
      className={`fixed top-4 right-4 z-[9999] transition-all duration-300 transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      style={{ maxWidth: '400px', minWidth: '300px' }}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg 
              className="w-5 h-5 text-white" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
            </svg>
            <h3 className="text-white font-semibold text-sm">New Notification</h3>
          </div>
          <button 
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {icon && (
              <img 
                src={icon} 
                alt="notification" 
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
              <p className="text-sm text-gray-600">{body}</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div 
            className="h-full bg-blue-500 transition-all duration-5000 ease-linear"
            style={{
              animation: 'progress 5s linear'
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

// Notification Container to manage multiple notifications
const NotificationContainer = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-0 right-0 z-[9999] pointer-events-none">
      <div className="pointer-events-auto">
        {notifications.map((notification, index) => (
          <div 
            key={notification.id || index} 
            style={{ marginTop: index > 0 ? '1rem' : '0' }}
          >
            <NotificationPopup
              notification={notification}
              onClose={() => onRemove(notification.id || index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export { NotificationPopup, NotificationContainer };
export default NotificationPopup;
