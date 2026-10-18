// ClinicPad V1 service worker: caches ONLY the app shell (code/assets). Never caches patient data.
// Network-first (fresh code after every deploy), cache fallback for offline use.
const CACHE = 'clinicpad-v1-shell-9';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './i18n.js', './brand.js', './manifest.webmanifest', './icon.svg', './vendor/jspdf.umd.min.js', './vendor/zxing.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const vendor = url.pathname.includes('/vendor/');
  if (vendor) { e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req))); return; }
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
