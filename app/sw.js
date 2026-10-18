// ClinicPad V1 service worker: caches ONLY the app shell (code/assets). Never caches patient data.
const CACHE = 'clinicpad-v1-shell-6';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './i18n.js', './brand.js', './manifest.webmanifest', './icon.svg', './vendor/jspdf.umd.min.js', './vendor/zxing.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
