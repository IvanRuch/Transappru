// Firebase Cloud Messaging service worker for web push.
//
// THIS FILE IS A TEMPLATE. The real `firebase-messaging-sw.js` is
// produced at build time by `nginx/Dockerfile.prod` via `envsubst`,
// substituting __FIREBASE_*__ placeholders with values from GitHub
// Secrets. Do NOT commit a populated copy.
//
// SW context can't read process.env or import application code, so we
// load the Firebase compat SDK from gstatic CDN — that's the canonical
// pattern documented by Firebase for FCM web push and is what the
// legacy `transappweb/public/firebase-messaging-sw.js` did.

importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '__FIREBASE_API_KEY__',
  authDomain: '__FIREBASE_PROJECT_ID__.firebaseapp.com',
  projectId: '__FIREBASE_PROJECT_ID__',
  storageBucket: '__FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__FIREBASE_APP_ID__',
});

const messaging = firebase.messaging();

// Background message handler — fires when the tab is closed or backgrounded.
// Foreground messages are handled in app code via `onForegroundMessage`.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'TransApp';
  const options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    data: payload.data || {},
  };
  return self.registration.showNotification(title, options);
});

// Click handler — focus an existing tab if any, otherwise open a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});
