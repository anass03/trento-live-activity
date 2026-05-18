// Service worker for Firebase Cloud Messaging. Handles push notifications
// received while the page is in background or closed.
// IMPORTANT: this file is served at the root URL (/firebase-messaging-sw.js)
// because FCM requires a top-level scope.

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Configure these values to match your Firebase project.
// See frontend/.env.example for the corresponding environment variables.
firebase.initializeApp({
  apiKey:            '<VITE_FIREBASE_API_KEY>',
  authDomain:        '<VITE_FIREBASE_AUTH_DOMAIN>',
  projectId:         '<VITE_FIREBASE_PROJECT_ID>',
  storageBucket:     '<VITE_FIREBASE_STORAGE_BUCKET>',
  messagingSenderId: '<VITE_FIREBASE_MESSAGING_SENDER_ID>',
  appId:             '<VITE_FIREBASE_APP_ID>',
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
