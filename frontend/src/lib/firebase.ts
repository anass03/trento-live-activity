import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

// These values are intentionally public — they identify the web client to
// Firebase. They can be overridden via Vite env variables (VITE_FIREBASE_*).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyA82T8bcjKHDNL3R18HUX0ZsJXqRIpVkC4',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'trento-live-activity.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'trento-live-activity',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'trento-live-activity.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '21691364418',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:21691364418:web:27ad00e05713be19a929db',
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY
  ?? 'BGcYOvwuuQksBU2fIbriZ2wWzHiwFdM1-QT3Fpzjl7Bh0ppcqJVm_iEitp0-wFiuwIbDXJCyzKhoRrYusQyoOyc';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const existing = getApps();
  app = existing.length ? existing[0] : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return null;
  }
  if (messaging) return messaging;
  messaging = getMessaging(getFirebaseApp());
  return messaging;
}

// Returns a fresh FCM device token after registering the service worker.
// Throws if the user denies notification permission or the browser isn't supported.
export async function requestFcmToken(): Promise<string> {
  const m = getFirebaseMessaging();
  if (!m) throw new Error('Notifiche push non supportate da questo browser');

  if (Notification.permission === 'denied') {
    throw new Error('Permesso notifiche bloccato. Riabilitalo dalle impostazioni del browser.');
  }
  const perm = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error('Permesso notifiche negato');
  }

  // The service worker file is served as a static asset at /firebase-messaging-sw.js
  const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(m, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swRegistration,
  });
  if (!token) throw new Error('Impossibile ottenere il token FCM');
  return token;
}

// Listen for push messages that arrive while the page is open (foreground).
// When the page is in background or closed, the service worker handles them.
export function onForegroundMessage(handler: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void): () => void {
  const m = getFirebaseMessaging();
  if (!m) return () => {};
  return onMessage(m, handler);
}
