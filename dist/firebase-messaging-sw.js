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

// Handle notification click — previously this only reacted to the "View
// Task" action button, so clicking the notification's body (the normal way
// anyone clicks a notification) did nothing at all. It also always opened
// the same hardcoded /user/task-allocations, a route that was never actually
// wired into the app's router — ignoring the real destination the backend
// already attaches per-notification (payload.data.url, e.g. My Courses for
// a course assignment, a specific form for an ISO Forms approval, etc.).
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  // "close" is the only action that should NOT navigate anywhere.
  if (event.action === 'close') return;

  const targetPath = event.notification.data?.url || '/user/dashboard';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Reuse an already-open tab instead of always spawning a new one —
      // focus it and hand it the destination to navigate to itself (a
      // service worker can't call the app's own router directly).
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'notification-click', url: targetPath });
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
