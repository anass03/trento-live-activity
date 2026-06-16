import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, deleteToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';

// These values are intentionally public — they identify the web client to
// Firebase. Sono hardcoded come fallback così le notifiche funzionano per tutti
// senza dover creare un .env (che è gitignorato). Si possono comunque
// sovrascrivere via env Vite (VITE_FIREBASE_*) per puntare a un altro progetto.
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
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
    return null;
  }
  if (messaging) return messaging;
  // Su Safari (e altri browser senza supporto FCM) getMessaging può lanciare
  // 'messaging/unsupported-browser': lo trattiamo come "non disponibile".
  try {
    messaging = getMessaging(getFirebaseApp());
  } catch {
    return null;
  }
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

// Firebase/FCM IndexedDB databases. A previous deploy on a different Firebase
// SDK can leave these at another schema version; when the current SDK opens
// them it throws "an attempt was made to open a database using a lower version
// than the existing version" (IndexedDB VersionError). That makes getToken
// fail — so no push token arrives, and the settings toggle hangs on its
// timeout ("slow"). Deleting the stale databases lets the SDK recreate them.
const FCM_IDB_NAMES = [
  'firebase-messaging-database',
  'firebase-installations-database',
  'firebase-installations-store',
  'firebase-messaging-store',
  'fcm_token_details_db',
];

function isIdbVersionError(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | null;
  if (!e) return false;
  return e.name === 'VersionError'
    || /lower version than the existing version|version/i.test(e.message || '');
}

async function clearFcmIndexedDb(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await Promise.all(
    FCM_IDB_NAMES.map(
      (name) =>
        new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (!done) { done = true; resolve(); }
          };
          try {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = finish;
            req.onerror = finish;
            // 'blocked' = an open connection elsewhere; the delete still
            // completes later, so don't hold up the flow.
            req.onblocked = finish;
            setTimeout(finish, 1500);
          } catch {
            finish();
          }
        }),
    ),
  );
}

// Returns a fresh FCM device token. Always forces a new token (deletes the old
// one first) so stale tokens are replaced on every "enable" click.
// Throws if the user denies notification permission or the browser isn't supported.
export async function requestFcmToken(): Promise<string> {
  // isSupported() è il check autoritativo di Firebase: copre Safari datati e
  // contesti senza Push API. Su iOS le push web funzionano solo da iOS 16.4+ e
  // solo se l'app è stata aggiunta alla schermata Home (PWA).
  if (!(await isSupported())) {
    throw new Error('Notifiche push non supportate da questo browser. Su iPhone/iPad aggiungi prima l\'app alla schermata Home (richiede iOS/Safari 16.4 o superiore).');
  }
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

  const fetchToken = (msg: Messaging) =>
    withTimeout(
      getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swRegistration }),
      15000,
      'getToken',
    );

  let token: string | null = null;
  try {
    token = await fetchToken(m);
  } catch (err) {
    // Stale IndexedDB from an older SDK → clear it and retry once with a fresh
    // messaging instance. This is the "lower version than existing" error.
    if (!isIdbVersionError(err)) throw err;
    await clearFcmIndexedDb();
    messaging = null;
    const m2 = getFirebaseMessaging();
    if (!m2) throw err;
    token = await fetchToken(m2);
  }
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
