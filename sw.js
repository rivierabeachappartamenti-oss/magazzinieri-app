/* Service worker del prototipo.
   Strategia: per la pagina (index.html) PRIMA LA RETE, così gli aggiornamenti arrivano subito,
   e la cache serve solo quando si è offline; per gli altri file cache con aggiornamento in background.
   Il riconoscimento vocale usa la connessione del telefono e non dipende da questo. */
const CACHE = 'magazzinieri-proto-v2';
const FILES = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  // E-R1: install non-atomica: ogni file in cache separatamente; un 404 su asset non critico non azzera l'offline
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      for(const f of FILES){
        try{ await c.add(f); }catch(e){ /* non fatale: l'asset mancante non blocca il resto */ }
      }
    }).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const isPagina = e.request.mode === 'navigate' || e.request.url.endsWith('/index.html');
  if (isPagina) {
    // prima la rete; cache solo come ripiego offline
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp && resp.ok) { const copia = resp.clone(); caches.open(CACHE).then(c => c.put('./index.html', copia)); }
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const rete = fetch(e.request).then(resp => {
        if (resp && resp.ok) { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
        return resp;
      }).catch(() => hit);
      return hit || rete;
    })
  );
});
