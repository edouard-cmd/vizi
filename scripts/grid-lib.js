/* ============================================================
   VISIMER - GRILLE NATIONALE : bibliotheque navigateur
   ------------------------------------------------------------
   Ce fichier ne tourne PAS dans l'app des chasseurs. Le robot
   (scripts/grid-build.js) l'injecte dans la vraie app ouverte en Chromium
   sans tete : toute la physique vient donc de vizi-app.js lui-meme
   (mapFolkToSediment, fetchSedimentZone, _pointInMultiPolygon). La grille ne
   reecrit aucune regle du moteur, elle lui prepare ses entrees en masse.

   CE QUE CONSTRUIT CE FICHIER (livraison 1) : la carte fixe.
   Pour chaque maille de la bande cotiere, France entiere :
     - sa profondeur sous le zero des cartes ;
     - la nature du fond au centre de la maille ;
     - la mosaique de fonds autour (rayon advectif du moteur).
   Ces trois donnees ne bougent pas d'un jour a l'autre : elles sont
   calculees une fois, puis relues chaque matin par le calcul de prevision.

   LE TREILLIS
   Une maille = 4 x 6 pixels du MNT EMODnet 2024 (pixel de 1/960 de degre),
   soit 464 m en latitude et 440 a 520 m en longitude selon la latitude.
   Le MNT EMODnet 2024 servi par ERDDAP est exactement la sonde que lit
   l'app (depth_sample) : verifie le 12/11/2026 sur 7 points devant
   Courseulles, ecart nul. Une maille porte la valeur du pixel en son
   centre, comme un clic porte la valeur de la sonde sous le viseur.

   QUELLES MAILLES
   En mer, par au moins DEPTH_MIN de fond au zero des cartes, en France
   (contour Marine Regions, plus bas), et dans l'une des deux bandes :
     - les petits fonds : jusqu'a DEPTH_MAX de fond, a moins de BAND_M d'une
       terre. C'est la que la houle brasse le fond ;
     - le ruban du bord : a moins de NEAR_M d'une terre, quelle que soit la
       profondeur. Sans lui une cote accore (Calanques, Esterel, Corse) n'a
       aucune maille : le fond y passe 30 m a quelques dizaines de metres du
       rocher, et la carte serait trouee la ou l'eau est la plus claire.
   Une terre = un pixel au-dessus du zero des cartes (cote, ile, roche qui
   decouvre) OU un pixel sans valeur : le MNT ne porte le relief terrestre
   que sur une partie du littoral (Manche, Atlantique nord) ; ailleurs
   (Mediterranee, Corse) la terre y est un vide. Verifie le 12/11/2026 devant
   Sete : -10,5 m au dernier pixel de mer, puis plus rien. Hors de cette
   bande le moteur n'a pas de sens : il calcule un brassage du fond par la
   houle.

   Sources :
     - bathymetrie : EMODnet Bathymetry DTM 2024, ERDDAP griddap
       (erddap.emodnet.eu, jeu bathymetry_dtm_2024, variable elevation) ;
     - nature du fond : EMODnet Geology, gtk:seabed_substrate_250k (WFS),
       la couche que lit deja fetchSedimentZone ;
     - contour France : Flanders Marine Institute, Marine Regions, couche
       eez_land (union des pays et de leurs ZEE), MRGID 5677, licence CC-BY.
   ============================================================ */
(function (root) {
  'use strict';

  var CFG = {
    DTM_PER_DEG: 960,                 // pixels du MNT par degre
    SLAT: 4, SLON: 6,                 // pas du treillis, en pixels du MNT
    LAT0: 41.0, LON0: -6.0,           // coin sud-ouest du treillis
    TILE_I: 120, TILE_J: 96,          // tuile de travail : 0,5 deg x 0,6 deg
    NTI: 21, NTJ: 27,                 // 41,0 -> 51,5 N ; -6,0 -> 10,2 E
    HALO: 14,                         // mailles lues autour de la tuile, pour la distance a la terre
    BAND_M: 5000,                     // largeur de la bande des petits fonds
    NEAR_M: 2000,                     // ruban garde a toute profondeur le long de la terre
    DEPTH_MIN: 0.5,                   // seuil d'eau minimale du moteur
    DEPTH_MAX: 30,                    // petits fonds : au-dela la houle ne brasse plus le fond
    COARSE: 8,                        // passe de reperage : 1 maille sur 8
    ERDDAP: 'https://erddap.emodnet.eu/erddap/griddap/bathymetry_dtm_2024.json',
    WFS: 'https://drive.emodnet-geology.eu/geoserver/gtk/wfs',
    WFS_MARGIN_DEG: 0.03,             // rayon advectif max (1500 m x 1,1) autour de la tuile
    // Contour de la France : terre + eaux sous juridiction francaise, d'un seul
    // tenant (Marine Regions, couche eez_land, MRGID 5677 = ZEE de la metropole).
    FRANCE: 'https://geo.vliz.be/geoserver/MarineRegions/wfs',
    FRANCE_MRGID: 5677,
    RETRIES: 4
  };

  var M_PER_DEG = 111320;
  var sedDict = [];                   // sediments distincts rencontres, index = cle stockee
  var sedIndex = {};

  function latOf(i) { return CFG.LAT0 + (CFG.SLAT * i + 0.5) / CFG.DTM_PER_DEG; }
  function lonOf(j) { return CFG.LON0 + (CFG.SLON * j + 0.5) / CFG.DTM_PER_DEG; }
  function iOf(lat) { return Math.round(((lat - CFG.LAT0) * CFG.DTM_PER_DEG - 0.5) / CFG.SLAT) || 0; }
  function jOf(lon) { return Math.round(((lon - CFG.LON0) * CFG.DTM_PER_DEG - 0.5) / CFG.SLON) || 0; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  // Rend la main au navigateur sans passer par une minuterie : un onglet en
  // arriere-plan bride setTimeout, pas les messages.
  function breathe() {
    return new Promise(function (r) {
      if (typeof MessageChannel === 'undefined') return setTimeout(r, 0);
      var ch = new MessageChannel();
      ch.port1.onmessage = function () { ch.port1.close(); r(); };
      ch.port2.postMessage(0);
    });
  }
  // Terre : au-dessus du zero des cartes, ou pixel sans valeur (voir l'en-tete).
  function isLand(v) { return v !== v || v >= 0; }

  function getJson(url) {
    var attempt = 0;
    function once() {
      return root.fetch(url).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).catch(function (e) {
        attempt++;
        if (attempt > CFG.RETRIES) throw new Error(String(e && e.message || e) + ' - ' + url.slice(0, 120));
        return sleep(1500 * attempt).then(once);
      });
    }
    return once();
  }

  // ---------- bathymetrie ----------
  // Lit le MNT sur le rectangle de mailles [i0..i1] x [j0..j1], une maille sur
  // `step`. Rend { ni, nj, i0, j0, step, e: Float32Array } ; NaN = pas de donnee.
  // Les lignes sont rangees d'apres les coordonnees rendues, pas d'apres un
  // ordre suppose : le sens de l'axe du serveur ne peut pas fausser la grille.
  function fetchElevation(i0, i1, j0, j1, step) {
    step = step || 1;
    var ni = Math.floor((i1 - i0) / step) + 1, nj = Math.floor((j1 - j0) / step) + 1;
    var la = latOf(i0), lb = latOf(i0 + (ni - 1) * step);
    var oa = lonOf(j0), ob = lonOf(j0 + (nj - 1) * step);
    function url(a, b) {
      return CFG.ERDDAP + '?elevation'
        + '%5B(' + a.toFixed(6) + '):' + (CFG.SLAT * step) + ':(' + b.toFixed(6) + ')%5D'
        + '%5B(' + oa.toFixed(6) + '):' + (CFG.SLON * step) + ':(' + ob.toFixed(6) + ')%5D';
    }
    function parse(j) {
      var rows = j && j.table && j.table.rows;
      if (!rows) throw new Error('reponse ERDDAP inattendue');
      var e = new Float32Array(ni * nj);
      for (var q = 0; q < e.length; q++) e[q] = NaN;
      var placed = 0;
      for (var k = 0; k < rows.length; k++) {
        var ci = iOf(rows[k][0]), cj = jOf(rows[k][1]);
        // la ligne doit tomber sur un centre de maille, pas a cote
        if (Math.abs(latOf(ci) - rows[k][0]) > 1e-4 || Math.abs(lonOf(cj) - rows[k][1]) > 1e-4) continue;
        var ii = (ci - i0) / step, jj = (cj - j0) / step;
        if (ii !== Math.floor(ii) || jj !== Math.floor(jj)) continue;      // hors treillis
        if (ii < 0 || ii >= ni || jj < 0 || jj >= nj) continue;
        var v = rows[k][2];
        if (typeof v === 'number' && isFinite(v)) e[ii * nj + jj] = v;
        placed++;
      }
      if (placed < 0.98 * ni * nj) throw new Error('treillis ERDDAP decale : ' + placed + ' lignes sur ' + (ni * nj));
      return { ni: ni, nj: nj, i0: i0, j0: j0, step: step, e: e };
    }
    // Axe des latitudes croissant ou decroissant selon le jeu : on essaie les deux.
    return getJson(url(la, lb)).then(parse, function () { return getJson(url(lb, la)).then(parse); });
  }

  // ---------- France ----------
  // Le treillis deborde sur l'Angleterre, Jersey, l'Espagne, l'Italie. Une
  // maille n'est gardee que si elle tombe dans le contour France de Marine
  // Regions, qui reunit la terre et les eaux francaises : la frontiere en mer
  // est celle des accords de delimitation, et comme la terre est dedans, un
  // trait de cote dessine autrement que celui du MNT ne peut pas rogner les
  // mailles du bord.
  var franceEdges = null, francePromise = null;
  function loadFrance() {
    if (francePromise) return francePromise;
    var url = CFG.FRANCE + '?service=WFS&version=2.0.0&request=GetFeature'
      + '&typeNames=MarineRegions:eez_land&srsName=EPSG:4326&outputFormat=application/json'
      + '&cql_filter=' + encodeURIComponent('mrgid_eez=' + CFG.FRANCE_MRGID);
    francePromise = getJson(url).then(function (gj) {
      var e = [], x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      ((gj && gj.features) || []).forEach(function (f) {
        var g = f.geometry;
        if (!g) return;
        var polys = g.type === 'Polygon' ? [g.coordinates] : (g.type === 'MultiPolygon' ? g.coordinates : []);
        polys.forEach(function (poly) {
          poly.forEach(function (ring) {                 // anneau exterieur et trous : regle pair-impair
            for (var a = 0, b = ring.length - 1; a < ring.length; b = a++) {
              var xa = ring[a][0], ya = ring[a][1], xb = ring[b][0], yb = ring[b][1];
              if (ya === yb) continue;                   // une arete horizontale ne coupe aucune ligne
              e.push(xa, ya, xb, yb);
              if (xa < x0) x0 = xa; if (xa > x1) x1 = xa; if (ya < y0) y0 = ya; if (ya > y1) y1 = ya;
            }
          });
        });
      });
      // Un contour vide ou rendu dans l'autre ordre d'axes viderait la grille
      // sans un bruit : on s'arrete plutot que de publier une carte fausse.
      if (e.length < 400) throw new Error('contour France vide ou incomplet (' + (e.length / 4) + ' aretes)');
      if (x0 < -30 || x1 > 30 || y0 < 30 || y1 > 60) throw new Error('contour France hors de sa place : axes inverses ?');
      franceEdges = e;
    });
    francePromise.catch(function () { francePromise = null; });
    return francePromise;
  }
  // Longitudes ou la ligne de latitude `lat` coupe le contour, triees.
  function franceRow(lat) {
    var e = franceEdges, xs = [];
    for (var k = 0; k < e.length; k += 4) {
      var ya = e[k + 1], yb = e[k + 3];
      if ((ya > lat) !== (yb > lat)) xs.push((e[k + 2] - e[k]) * (lat - ya) / (yb - ya) + e[k]);
    }
    xs.sort(function (a, b) { return a - b; });
    return xs;
  }
  // Dedans si un nombre impair de coupes se trouve a l'ouest du point.
  function inRow(xs, lon) {
    var lo = 0, hi = xs.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (xs[mid] < lon) lo = mid + 1; else hi = mid; }
    return (lo & 1) === 1;
  }

  // ---------- reperage des tuiles cotieres ----------
  // Une passe a basse resolution sur tout le treillis. Une tuile est gardee si,
  // elle-meme ou sa bordure, contient a la fois de la terre et de la mer, ou
  // un haut-fond (moins de DEPTH_MAX) : c'est la qu'une ile ou une roche peut
  // se cacher entre deux points du reperage.
  function plan() {
    var NI = CFG.NTI * CFG.TILE_I, NJ = CFG.NTJ * CFG.TILE_J, c = CFG.COARSE;
    var chunks = [], rowsPer = 7 * CFG.TILE_I;         // 3 requetes pour ne pas depasser quelques Mo
    for (var a = 0; a < NI; a += rowsPer) chunks.push([a, Math.min(NI - 1, a + rowsPer - 1)]);
    var land = {}, sea = {}, shoal = {};
    function mark(g) {
      for (var ii = 0; ii < g.ni; ii++) {
        var xs = franceRow(latOf(g.i0 + ii * c));
        for (var jj = 0; jj < g.nj; jj++) {
          var v = g.e[ii * g.nj + jj], isL = isLand(v);
          var i = g.i0 + ii * c, j = g.j0 + jj * c;
          // la mer ne compte que si elle est francaise ; la terre compte toujours
          // (un caillou de Jersey borde aussi des mailles francaises)
          if (!isL && !inRow(xs, lonOf(j))) continue;
          // la maille compte pour sa tuile et, pres d'un bord, pour la voisine
          for (var di = -1; di <= 1; di++) for (var dj = -1; dj <= 1; dj++) {
            var ti = Math.floor((i + di * 2 * c) / CFG.TILE_I), tj = Math.floor((j + dj * 2 * c) / CFG.TILE_J);
            if (ti < 0 || tj < 0 || ti >= CFG.NTI || tj >= CFG.NTJ) continue;
            var key = ti + '_' + tj;
            if (isL) land[key] = 1; else { sea[key] = 1; if (v > -CFG.DEPTH_MAX) shoal[key] = 1; }
          }
        }
      }
    }
    var p = loadFrance();
    chunks.forEach(function (ch) {
      p = p.then(function () { return fetchElevation(ch[0], ch[1], 0, NJ - 1, c).then(mark); });
    });
    return p.then(function () {
      var tiles = [];
      for (var ti = 0; ti < CFG.NTI; ti++) for (var tj = 0; tj < CFG.NTJ; tj++) {
        var key = ti + '_' + tj;
        if ((land[key] && sea[key]) || shoal[key]) tiles.push({ ti: ti, tj: tj });
      }
      return { tiles: tiles, total: CFG.NTI * CFG.NTJ };
    });
  }

  // ---------- nature du fond ----------
  function bboxOfRing(ring) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (var k = 0; k < ring.length; k++) {
      var x = ring[k][0], y = ring[k][1];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return [x0, y0, x1, y1];
  }
  function hit(a, b) { return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]; }

  // Decoupe chaque entite en polygones avec leur boite. Le moteur ne lit que
  // l'anneau exterieur de chaque polygone (_pointInMultiPolygon), la boite est
  // donc celle de cet anneau.
  function prepareFeatures(geojson) {
    var out = [];
    ((geojson && geojson.features) || []).forEach(function (f) {
      var g = f.geometry;
      if (!g) return;
      var polys = g.type === 'Polygon' ? [g.coordinates] : (g.type === 'MultiPolygon' ? g.coordinates : []);
      var kept = [];
      polys.forEach(function (poly) { if (poly && poly[0] && poly[0].length > 2) kept.push({ c: poly, b: bboxOfRing(poly[0]) }); });
      if (kept.length) out.push({ props: f.properties || {}, polys: kept });
    });
    return out;
  }

  function fetchSubstrate(latMin, latMax, lonMin, lonMax) {
    var m = CFG.WFS_MARGIN_DEG;
    var url = CFG.WFS + '?service=WFS&version=2.0.0&request=GetFeature'
      + '&typeNames=gtk:seabed_substrate_250k&srsName=EPSG:4326'
      + '&bbox=' + (lonMin - m).toFixed(5) + ',' + (latMin - m).toFixed(5) + ','
      + (lonMax + m).toFixed(5) + ',' + (latMax + m).toFixed(5) + ',EPSG:4326'
      + '&outputFormat=application/json';
    return getJson(url).then(prepareFeatures);
  }

  // Les entites qui touchent une boite, reduites aux polygones qui la touchent.
  // Resultat identique a la geometrie entiere pour tout point de la boite : un
  // polygone qui ne touche pas la boite ne peut contenir aucun de ses points.
  function pick(features, bb) {
    var out = [];
    for (var k = 0; k < features.length; k++) {
      var f = features[k], coords = null;
      for (var q = 0; q < f.polys.length; q++) {
        if (hit(f.polys[q].b, bb)) (coords || (coords = [])).push(f.polys[q].c);
      }
      if (coords) out.push({ properties: f.props, geometry: { type: 'MultiPolygon', coordinates: coords } });
    }
    return out;
  }

  function sedKey(sed) {
    if (!sed) return -1;
    var core = { folk5: sed.folk5, name: sed.name, nameFr: sed.nameFr, D50_mm: sed.D50_mm,
                 D50_m: sed.D50_m, regime: sed.regime, canSuspend: sed.canSuspend };
    var sig = JSON.stringify(core);
    if (sedIndex[sig] === undefined) { sedIndex[sig] = sedDict.length; sedDict.push(core); }
    return sedIndex[sig];
  }

  // ---------- une tuile ----------
  function buildTile(ti, tj, opt) {
    opt = opt || {};
    var H = CFG.HALO;
    var i0 = ti * CFG.TILE_I, j0 = tj * CFG.TILE_J;
    var gi0 = i0 - H, gi1 = i0 + CFG.TILE_I - 1 + H, gj0 = j0 - H, gj1 = j0 + CFG.TILE_J - 1 + H;
    var t0 = Date.now();
    return loadFrance().then(function () { return fetchElevation(gi0, gi1, gj0, gj1, 1); }).then(function (g) {
      var midLat = latOf(i0 + CFG.TILE_I / 2);
      var dy = CFG.SLAT / CFG.DTM_PER_DEG * M_PER_DEG;
      var dx = CFG.SLON / CFG.DTM_PER_DEG * M_PER_DEG * Math.cos(midLat * Math.PI / 180);
      // decalages de mailles a moins de BAND_M, du plus proche au plus lointain
      var offs = [];
      for (var di = -H; di <= H; di++) for (var dj = -H; dj <= H; dj++) {
        var d = Math.sqrt(di * dy * di * dy + dj * dx * dj * dx);
        if (d <= CFG.BAND_M && (di || dj)) offs.push([di, dj, d]);
      }
      offs.sort(function (a, b) { return a[2] - b[2]; });

      var cells = [];
      for (var ii = H; ii < H + CFG.TILE_I; ii++) {
        var xs = null;                                   // coupes du contour France sur cette ligne, a la demande
        for (var jj = H; jj < H + CFG.TILE_J; jj++) {
          var v = g.e[ii * g.nj + jj];
          if (v !== v || v > -CFG.DEPTH_MIN) continue;
          if (!xs) xs = franceRow(latOf(g.i0 + ii));
          if (!inRow(xs, lonOf(g.j0 + jj))) continue;
          // petits fonds : terre cherchee jusqu'a BAND_M ; plus profond : jusqu'a NEAR_M
          var reach = (v < -CFG.DEPTH_MAX) ? CFG.NEAR_M : CFG.BAND_M;
          var coast = -1;
          for (var k = 0; k < offs.length && offs[k][2] <= reach; k++) {
            if (isLand(g.e[(ii + offs[k][0]) * g.nj + (jj + offs[k][1])])) { coast = offs[k][2]; break; }
          }
          if (coast < 0) continue;
          cells.push({ i: g.i0 + ii, j: g.j0 + jj, depth: Math.round(-v * 10) / 10, coast: Math.round(coast) });
        }
      }
      var out = { ti: ti, tj: tj, n: cells.length, i: [], j: [], d: [], c: [], s: [], r: [], z: [] };
      if (!cells.length || opt.depthOnly) {
        cells.forEach(function (c) { out.i.push(c.i); out.j.push(c.j); out.d.push(c.depth); out.c.push(c.coast); });
        out.ms = Date.now() - t0;
        return out;
      }
      return fetchSubstrate(latOf(i0), latOf(i0 + CFG.TILE_I - 1), lonOf(j0), lonOf(j0 + CFG.TILE_J - 1))
        .then(function (features) { return substrateForCells(cells, features); })
        .then(function () {
          cells.forEach(function (c) {
            out.i.push(c.i); out.j.push(c.j); out.d.push(c.depth); out.c.push(c.coast);
            out.s.push(c.sed); out.r.push(c.R); out.z.push(c.zone);
          });
          out.ms = Date.now() - t0;
          return out;
        });
    });
  }

  // Nature du fond au centre de chaque maille, puis mosaique autour, par le code
  // du moteur lui-meme : fetchSedimentZone est appelee telle quelle, on lui
  // sert seulement les entites de la tuile au lieu d'un appel reseau par maille.
  function substrateForCells(cells, features) {
    var realFetch = root.fetch;
    var marine = (typeof root.S_spotMarineCache !== 'undefined') ? root.S_spotMarineCache : undefined;
    // Courant moyen : la grille prend l'atlas du moteur (repli geographique de
    // getMeanTidalCurrent), pas le courant du dernier point clique.
    if (marine !== undefined) root.S_spotMarineCache = null;
    root.fetch = function (url) {
      if (typeof url === 'string' && url.indexOf(CFG.WFS) === 0) {
        var m = /[?&]bbox=([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)/.exec(url);
        var bb = m ? [+m[1], +m[2], +m[3], +m[4]] : [-180, -90, 180, 90];
        var payload = { features: pick(features, bb) };
        return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(payload); } });
      }
      return realFetch.apply(root, arguments);
    };
    function restore() {
      root.fetch = realFetch;
      if (marine !== undefined) root.S_spotMarineCache = marine;
    }
    var p = Promise.resolve();
    cells.forEach(function (c, idx) {
      p = p.then(function () {
        var lat = latOf(c.i), lon = lonOf(c.j);
        // au centre : premiere entite qui contient le point
        c.sed = -1;
        var here = pick(features, [lon, lat, lon, lat]);
        for (var k = 0; k < here.length; k++) {
          if (root._pointInMultiPolygon([lon, lat], here[k].geometry)) {
            var pr = here[k].properties;
            c.sed = sedKey(root.mapFolkToSediment(pr.folk_5cl_txt, pr.original_substrate, pr.folk_16cl_txt));
            break;
          }
        }
        // autour : la fonction du moteur
        return root.fetchSedimentZone(lat, lon, c.depth).then(function (z) {
          c.R = (z && z.radius_m) ? Math.round(z.radius_m) : 0;
          c.zone = [];
          ((z && z.classes) || []).forEach(function (cl) {
            var pct = Math.round(cl.surface_pct * 10) / 10;
            if (pct > 0) c.zone.push(sedKey(cl.sediment), pct);
          });
          for (var key in root.S_spotZoneCache) delete root.S_spotZoneCache[key];
          // rend la main au navigateur de temps en temps
          return (idx % 200 === 199) ? breathe() : null;
        });
      });
    });
    return p.then(restore, function (e) { restore(); throw e; });
  }

  // ---------- apercu sur la carte ----------
  // Dessine les mailles sur la carte de l'app. mode : 'depth' ou 'sed'.
  function preview(tiles, mode) {
    var map = root.S && root.S.map;
    if (!map) return 0;
    var old = document.getElementById('vzGridPreview');
    if (old) old.remove();
    var size = map.getSize();
    var cv = document.createElement('canvas');
    cv.id = 'vzGridPreview';
    cv.width = size.x; cv.height = size.y;
    cv.style.cssText = 'position:absolute;left:0;top:0;z-index:650;pointer-events:none;';
    map.getContainer().appendChild(cv);
    var ctx = cv.getContext('2d');
    var SED = ['#8B6A40', '#F0C060', '#E86030', '#C9A27A', '#7C8794'];   // vase, sable, grossier, mixte, roche
    var drawn = 0;
    tiles.forEach(function (t) {
      for (var k = 0; k < t.n; k++) {
        var lat = latOf(t.i[k]), lon = lonOf(t.j[k]);
        var a = map.latLngToContainerPoint([lat - CFG.SLAT / 1920, lon - CFG.SLON / 1920]);
        var b = map.latLngToContainerPoint([lat + CFG.SLAT / 1920, lon + CFG.SLON / 1920]);
        if (b.x < 0 || a.x > size.x || a.y < 0 || b.y > size.y) continue;
        var col;
        if (mode === 'sed') {
          var sk = t.s[k], sd = sk >= 0 ? sedDict[sk] : null;
          col = sd ? SED[(sd.folk5 || 1) - 1] : '#FFFFFF';
        } else {
          var f = Math.min(1, t.d[k] / CFG.DEPTH_MAX);
          col = t.d[k] > CFG.DEPTH_MAX ? '#7A5CC0'       // ruban du bord, plus de 30 m de fond
            : 'rgb(' + Math.round(45 - 20 * f) + ',' + Math.round(212 - 150 * f) + ',' + Math.round(191 - 70 * f) + ')';
        }
        ctx.fillStyle = col;
        ctx.fillRect(a.x, b.y, Math.max(1, b.x - a.x), Math.max(1, a.y - b.y));
        drawn++;
      }
    });
    return drawn;
  }

  root.VZ_GRID = {
    CFG: CFG, latOf: latOf, lonOf: lonOf, iOf: iOf, jOf: jOf,
    plan: plan, buildTile: buildTile, fetchElevation: fetchElevation,
    preview: preview,
    sediments: function () { return sedDict.slice(); },
    setSediments: function (list) { sedDict = (list || []).slice(); sedIndex = {}; sedDict.forEach(function (s, k) { sedIndex[JSON.stringify(s)] = k; }); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
