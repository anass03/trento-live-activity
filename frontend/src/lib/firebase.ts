import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, deleteToken, onMessage, type Messaging } from 'firebase/messaging';

// Configure via environment variables — copy frontend/.env.example to frontend/.env
// and fill in your Firebase project values before running.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? '<VITE_FIREBASE_API_KEY>',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? '<VITE_FIREBASE_AUTH_DOMAIN>',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? '<VITE_FIREBASE_PROJECT_ID>',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? '<VITE_FIREBASE_STORAGE_BUCKET>',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '<VITE_FIREBASE_MESSAGING_SENDER_ID>',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '<VITE_FIREBASE_APP_ID>',
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '<VITE_FIREBASE_VAPID_KEY>';

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

// Promise.race con timeout: alcune chiamate FCM (specie su Firefox dopo una
// revoca) possono restare pending indefinitamente. Senza timeout il `finally`
// dell'handler nel componente non gira e il bottone resta bloccato su "...".
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${label} (${ms}ms)`)), ms),
    ),
  ]);
}

// Cancella il token FCM lato client. Da chiamare quando l'utente disattiva
// le push, così la cache interna dell'SDK resta allineata col server.
// Avvolto in timeout perché `deleteToken` può hangare su Firefox.
export async function revokeFcmToken(): Promise<void> {
  const m = getFirebaseMessaging();
  if (!m) return;
  try {
    await withTimeout(deleteToken(m), 3000, 'deleteToken');
  } catch {
    /* ignore — best effort, importante è che non blocchi la UI */
  }
}

// Returns a fresh FCM device token. Always forces a new token (deletes the old
// one first) so stale tokens are replaced on every "enable" click.
// Throws if the user denies notification permission or the browser isn't supported.
export async function requestFcmToken(): Promise<string> {
  const m = getFirebaseMessaging();
  if (!m) throw new Error('Notifiche push non supportate da questo browser');

  if (Notification.permission === 'denied') {
    throw new Error('Permesso notifiche bloccato. Vai nelle impostazioni del browser e riabilita le notifiche per questo sito.');
  }
  const perm = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error('Permesso notifiche negato');
  }

  const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  // Aspetta che il service worker sia attivo: su Firefox `getToken` può
  // hangare se il SW è ancora in stato "installing".
  if (swRegistration.installing) {
    await new Promise<void>((resolve) => {
      const sw = swRegistration.installing!;
      const onChange = () => {
        if (sw.state === 'activated' || sw.state === 'redundant') {
          sw.removeEventListener('statechange', onChange);
          resolve();
        }
      };
      sw.addEventListener('statechange', onChange);
    });
  }

  // Delete the existing token first so Firebase issues a fresh one.
  // Con timeout: se hanga (bug Firefox post-revoca), procediamo comunque.
  try { await withTimeout(deleteToken(m), 3000, 'deleteToken'); } catch { /* ignore */ }

  const token = await withTimeout(
    getToken(m, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    }),
    15000,
    'getToken',
  );
  if (!token) throw new Error('Impossibile ottenere il token FCM. Assicurati di non avere estensioni che bloccano le notifiche.');
  return token;
}

// Listen for push messages that arrive while the page is open (foreground).
// When the page is in background or closed, the service worker handles them.
export function onForegroundMessage(handler: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void): () => void {
  const m = getFirebaseMessaging();
  if (!m) return () => {};
  return onMessage(m, handler);
}
