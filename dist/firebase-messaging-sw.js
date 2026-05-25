// Give the service worker access to Firebase Messaging.
// Note: importScripts is only available in service workers
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyChfnvY4MDycodtNHAofYTlJ8DGGPzNCe0",
  authDomain: "ptis-erp.firebaseapp.com",
  projectId: "ptis-erp",
  storageBucket: "ptis-erp.firebasestorage.app",
  messagingSenderId: "453746200546",
  appId: "1:453746200546:web:d984a07306c55b2201f3bb"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Task Assigned';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new task assignment',
    icon: payload.notification?.icon || '/vite.svg',
    badge: '/vite.svg',
    tag: 'ptis-notification',
    requireInteraction: true,
    data: payload.data,
    actions: [
      {
        action: 'view',
        title: 'View Task'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  if (event.action === 'view') {
    // Open the task allocations page
    event.waitUntil(
      clients.openWindow('/user/task-allocations')
    );
  }
});
