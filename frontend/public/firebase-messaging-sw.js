// Service worker for Firebase Cloud Messaging. Handles push notifications
// received while the page is in background or closed.
// IMPORTANT: this file is served at the root URL (/firebase-messaging-sw.js)
// because FCM requires a top-level scope.
//
// La versione degli script compat DEVE combaciare con l'SDK npm usato dall'app
// (vedi "firebase" in package.json): versioni FCM disallineate tra app e SW
// causano errori di registrazione del service worker.

try {
  importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js');

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

  // isSupported() evita di chiamare firebase.messaging() su browser che non
  // supportano FCM (es. Safari datati o in contesti senza Push API): lì
  // firebase.messaging() lancerebbe e abortirebbe l'intero service worker.
  // È sincrona nelle vecchie versioni e async (Promise) dalla 9.6: gestiamo
  // entrambi i casi con Promise.resolve().
  const supportedCheck = typeof firebase.messaging.isSupported === 'function'
    ? firebase.messaging.isSupported()
    : true;

  Promise.resolve(supportedCheck)
    .then((supported) => {
      if (!supported) {
        console.info('[FCM SW] Messaging non supportato in questo browser — SW inerte.');
        return;
      }
      const messaging = firebase.messaging();

      // Background handler — fires when the page is not focused.
      messaging.onBackgroundMessage((payload) => {
        const title = (payload.notification && payload.notification.title) || 'Trento Live Activity';
        const options = {
          body: (payload.notification && payload.notification.body) || '',
          icon: '/logo.png',
          data: payload.data || {},
        };
        self.registration.showNotification(title, options);
      });
    })
    .catch((err) => {
      // Non rilanciare: logghiamo soltanto.
      console.error('[FCM SW] init messaging fallita:', err);
    });
} catch (err) {
  // MAI rilanciare da qui: un'eccezione durante la valutazione dello script
  // ("threw an exception during script evaluation") aborta la registrazione
  // del service worker su TUTTI i browser. Meglio un SW inerte che nessuno.
  console.error('[FCM SW] inizializzazione fallita:', err);
}
