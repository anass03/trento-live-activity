// Service worker for Firebase Cloud Messaging. Handles push notifications
// received while the page is in background or closed.
// IMPORTANT: this file is served at the root URL (/firebase-messaging-sw.js)
// because FCM requires a top-level scope.

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// These values are public client identifiers (same as the main app config).
// NB: this file is served statically da public/, quindi Vite NON sostituisce
// le env VITE_FIREBASE_* qui dentro — i valori vanno tenuti espliciti.
firebase.initializeApp({
  apiKey: 'AIzaSyA82T8bcjKHDNL3R18HUX0ZsJXqRIpVkC4',
  authDomain: 'trento-live-activity.firebaseapp.com',
  projectId: 'trento-live-activity',
  storageBucket: 'trento-live-activity.firebasestorage.app',
  messagingSenderId: '21691364418',
  appId: '1:21691364418:web:27ad00e05713be19a929db',
});

const messaging = firebase.messaging();

// Background handler — fires when the page is not focused.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'Trento Live Activity';
  const options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/favicon.ico',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});
