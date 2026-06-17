// Visimer - service worker, strategie network-first.
// Objectif : chaque visite en ligne sert la derniere version deployee.
// Le cache ne sert que de filet hors-ligne. Aucune version a bumper a la main.
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

  e.respondWith(
    fetch(req).then(function(res) {
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
