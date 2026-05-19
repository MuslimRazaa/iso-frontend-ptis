import React, { createContext, useContext, useState, useEffect } from 'react';
import notificationService from '../config/notificationService';
import { API_BASE_URL } from '../config/api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [popupNotifications, setPopupNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from backend on mount
  useEffect(() => {
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
      loadNotifications();
      initializeFCM();
    }
  }, []);

  // Load notification history from backend
  const loadNotifications = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      const response = await fetch(`${API_BASE_URL}/api/notifications/${userEmail}`);
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        updateUnreadCount(data.notifications || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Initialize FCM and listen for messages
  const initializeFCM = async () => {
    // Request permission and get token
    await notificationService.requestPermission();
    
    // Listen for foreground messages
    notificationService.onMessageListener((payload) => {
      console.log('Notification received:', payload);
      
      // Create notification object
      const newNotification = {
        id: Date.now(),
        title: payload.notification?.title || 'Notification',
        body: payload.notification?.body || '',
        icon: payload.notification?.icon,
        data: payload.data,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Add to notifications list
      setNotifications(prev => [newNotification, ...prev]);
      
      // Add to popup notifications
      setPopupNotifications(prev => [...prev, newNotification]);
      
      // Update unread count
      setUnreadCount(prev => prev + 1);

      // Save to backend
      saveNotificationToBackend(newNotification);
    });
  };

  // Save notification to backend
  const saveNotificationToBackend = async (notification) => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      await fetch(`${API_BASE_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: userEmail,
          ...notification
        })
      });
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  };

  // Update unread count
  const updateUnreadCount = (notificationsList) => {
    const unread = notificationsList.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );

    setUnreadCount(prev => Math.max(0, prev - 1));

    // Update backend
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);

    try {
      const userEmail = localStorage.getItem('userEmail');
      await fetch(`${API_BASE_URL}/api/notifications/${userEmail}/read-all`, {
        method: 'PUT'
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    setNotifications([]);
    setUnreadCount(0);

    try {
      const userEmail = localStorage.getItem('userEmail');
      await fetch(`${API_BASE_URL}/api/notifications/${userEmail}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Remove popup notification
  const removePopupNotification = (id) => {
    setPopupNotifications(prev => prev.filter(n => n.id !== id));
  };

  const value = {
    notifications,
    popupNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    removePopupNotification,
    refreshNotifications: loadNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
