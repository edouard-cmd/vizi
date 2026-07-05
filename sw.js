// Visimer - service worker, strategie network-first.
// Objectif : chaque visite en ligne sert la derniere version deployee.
// Le cache ne sert que de filet hors-ligne. Aucune version a bumper a la main.
// Les deux fichiers vitaux (la page et vizi-app.js) contournent en plus le
// cache HTTP du navigateur (no-store) : sans ca, meme en network-first, le
// fetch ressert la copie HTTP cachee pendant le max-age 600s de GitHub Pages.
const VZ_CACHE = 'vizi-runtime-v1';

self.addEventListener('install', function() {
  self.skipWaiting(); // le nouveau SW prend la main sans attendre la fermeture des onglets
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== VZ_CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return; // on ne touche pas aux POST (Firebase, GAS)
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // tuiles, API, CDN tiers : non interceptes

  // App shell = navigations (index.html) + monolithe JS : reseau vrai, jamais
  // le cache HTTP. On fetch par URL et non par Request : reconstruire une
  // Request en mode navigate avec des options leve une exception.
  var isShell = (req.mode === 'navigate') || /\/vizi-app\.js$/.test(url.pathname);
  var netFetch = isShell
    ? fetch(req.url, { cache: 'no-store', credentials: 'same-origin' })
    : fetch(req);

  e.respondWith(
    netFetch.then(function(res) {
      // Reseau OK : on rafraichit le cache et on sert la version fraiche.
      var copy = res.clone();
      caches.open(VZ_CACHE).then(function(c) { c.put(req, copy); });
      return res;
    }).catch(function() {
      // Hors-ligne uniquement : on retombe sur la derniere version connue.
      return caches.match(req);
    })
  );
});
