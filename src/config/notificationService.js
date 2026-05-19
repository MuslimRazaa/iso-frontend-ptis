import { messaging, getToken, onMessage } from './firebase';
import { API_BASE_URL } from './api';

// VAPID key from Firebase Console > Project Settings > Cloud Messaging
// TODO: Replace with your actual VAPID key
const VAPID_KEY = 'BPdf3cjO0RufRWJGjkNLAWtfYwFVglkGUFpPyzlZjAiIQQVfGe_04ltNlDC25rHRNT2ZZrS6MUUaVYhcWxJuFEk';

class NotificationService {
  constructor() {
    this.token = null;
    this.onMessageCallback = null;
  }

  // Request notification permission and get FCM token
  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        
        // Get registration token
        const token = await getToken(messaging, { 
          vapidKey: VAPID_KEY 
        });
        
        if (token) {
          console.log('FCM Token:', token);
          this.token = token;
          
          // Save token to backend
          await this.saveTokenToBackend(token);
          
          return token;
        } else {
          console.log('No registration token available.');
          return null;
        }
      } else {
        console.log('Notification permission denied.');
        return null;
      }
    } catch (error) {
      console.error('Error getting notification permission:', error);
      return null;
    }
  }

  // Save FCM token to backend
  async saveTokenToBackend(token) {
    try {
      const userEmail = localStorage.getItem('userEmail');
      
      if (!userEmail) {
        console.warn('No user email found in localStorage');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          fcm_token: token
        })
      });

      if (response.ok) {
        console.log('FCM token saved to backend successfully');
      } else {
        console.error('Failed to save FCM token to backend');
      }
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  // Listen for foreground messages
  onMessageListener(callback) {
    this.onMessageCallback = callback;
    
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      
      if (this.onMessageCallback) {
        this.onMessageCallback(payload);
      }

      // Show browser notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        const notificationTitle = payload.notification?.title || 'New Notification';
        const notificationOptions = {
          body: payload.notification?.body || '',
          icon: payload.notification?.icon || '/vite.svg',
          badge: '/vite.svg',
          tag: 'ptis-notification',
          requireInteraction: true,
          data: payload.data
        };

        new Notification(notificationTitle, notificationOptions);
      }
    });
  }

  // Get current token
  getToken() {
    return this.token;
  }

  // Delete token (for logout)
  async deleteToken() {
    try {
      const userEmail = localStorage.getItem('userEmail');
      
      if (userEmail && this.token) {
        await fetch(`${API_BASE_URL}/api/users/fcm-token`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userEmail
          })
        });
      }
      
      this.token = null;
      console.log('FCM token deleted');
    } catch (error) {
      console.error('Error deleting FCM token:', error);
    }
  }
}

// Create a singleton instance
const notificationService = new NotificationService();

export default notificationService;
