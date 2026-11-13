/* ============================================================
   VISIMER - PREVISION SUR LA GRILLE : bibliotheque navigateur
   ------------------------------------------------------------
   Ce fichier ne tourne PAS dans l'app des chasseurs. Le robot
   (scripts/forecast-build.js) l'injecte dans la vraie app ouverte en
   Chromium sans tete. Il ne contient aucune physique : pour chaque maille
   de la grille il pose le contexte que le tableau Previsions pose pour un
   point (renderSheetTable), puis appelle computeVisibilityScore_V4, le
   moteur de vizi-app.js, sur les 40 creneaux de 3 h des 5 jours.

   D'OU VIENNENT LES ENTREES
     - profondeur, fond au point, mosaique de fonds : la grille (branche
       data, dossier grid/, schema 2), construite par grid-lib.js ;
     - meteo : c'est fetchSheetMeteo, la fonction de l'app, qui fusionne
       AROME, ARPEGE et la houle. On lui sert seulement, a la place de trois
       appels par point, les reponses d'appels groupes : un point de forcage
       par cellule du modele de houle d'Open-Meteo (1/12 de degre). Mesure
       du 13/11/2026 : deux mailles de cellules de houle voisines peuvent
       differer de 60 %, deux mailles de la meme cellule ne different pas ;
     - maree : fetchSheetTides, la fonction de l'app, une fois par site ;
     - retours chasseurs : ensurePortCounts_, la fonction de l'app ;
     - satellite : la regle du GAS, lue en masse dans les tuiles (voir SAT).

   L'ETAT PARTAGE DU MOTEUR
   Le moteur lit des globales que le tableau echange avant de calculer :
   TIDES.data, _depthAtTimeCache, S_spotZoneCache, S._spotSediment. Ce
   fichier les pose maille apres maille et les remet en place a la fin. Les
   quatre caches de resultats du moteur sont vides a chaque maille : ils
   sont indexes par point et grossiraient de 2,8 millions d'entrees.
   ============================================================ */
(function (root) {
  'use strict';

  var CFG = {
    GRID: 'https://raw.githubusercontent.com/edouard-cmd/vizi/data/grid/',
    WAVE_PER_DEG: 12,       // grille de houle d'Open-Meteo : points a k/12 + 1/24
    BATCH: 50,              // points par appel groupe
    PACE_MS: 16000,         // pause entre deux lots : 150 points par lot, 600 par minute au plus
    SLOTS: 40,              // 5 jours x 8 creneaux, comme le tableau
    NONE: 255,              // pas de chiffre (roche, vase, entrees insuffisantes)
    RETRIES: 5
  };

  var G = null;             // grille a plat
  var TPL = null;           // les trois URL meteo de l'app, apprises d'elle
  var blocks = [];          // points de forcage
  var blockOf = null;       // maille -> bloc
  var siteOf = null;        // maille -> site de maree
  var tides = {};           // site -> points de maree
  var slots = null;         // indices horaires des 40 creneaux
  var slotTimes = null;
  var slotSecs = null;      // les memes creneaux en secondes depuis 1970 (instants, sans fuseau)
  var stats = { meteoCalls: 0, meteoRetries: 0, tideSites: 0, tideEmpty: 0 };

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function breathe() {
    return new Promise(function (r) {
      if (typeof MessageChannel === 'undefined') return setTimeout(r, 0);
      var ch = new MessageChannel();
      ch.port1.onmessage = function () { ch.port1.close(); r(); };
      ch.port2.postMessage(0);
    });
  }
  // Lecture JSON avec reprise. Un 429 (trop d'appels) attend une minute pleine.
  function getJson(url, what) {
    var attempt = 0;
    function once() {
      return root.fetch(url).then(function (r) {
        if (r.status === 429) { var e = new Error('HTTP 429'); e.wait = 61000; throw e; }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).catch(function (e) {
        attempt++; stats.meteoRetries++;
        if (attempt > CFG.RETRIES) throw new Error((what || 'lecture') + ' : ' + String(e && e.message || e));
        return sleep(e && e.wait ? e.wait : 2000 * attempt).then(once);
      });
    }
    return once();
  }

  // ---------- grille ----------
  // La sonde de l'app (depth_sample) rend la profondeur comme le plus court
  // decimal qui designe le flottant simple precision du MNT ("24.975407").
  // La grille porte ce meme flottant, ecrit en double (24.975406646728516).
  // On repasse par le decimal de la sonde, parce que le moteur a un seuil
  // franc, le critere de Shields : pour une maille posee pile sur ce seuil,
  // un ecart de 1e-8 sur la profondeur deplace le chiffre de 20 cm a 1 m
  // (mesure du 13/11/2026 devant Hyeres, 30 creneaux sur 40).
  function probeDepth(d) {
    var f = Math.fround(d);
    for (var p = 1; p <= 9; p++) { var x = parseFloat(f.toPrecision(p)); if (Math.fround(x) === f) return x; }
    return d;
  }
  function ingest(idx, tiles) {
    if (!(idx.schema >= 2)) throw new Error('grille de schema ' + idx.schema + ' : il faut le schema 2 (fond au point de l\'app, parts exactes)');
    var L = idx.lattice, n = tiles.reduce(function (s, t) { return s + t.n; }, 0);
    var g = { idx: idx, n: 0, lat: new Float64Array(n), lon: new Float64Array(n), d: new Float64Array(n),
              gi: new Uint16Array(n), gj: new Uint16Array(n),
              s: new Int16Array(n), ze: new Uint8Array(n), z: new Array(n), tiles: [] };
    tiles.forEach(function (tile) {
      g.tiles.push({ ti: tile.ti, tj: tile.tj, n: tile.n, from: g.n });
      for (var k = 0; k < tile.n; k++) {
        var q = g.n++;
        // memes expressions que latOf / lonOf de grid-lib.js : memes flottants
        g.lat[q] = L.lat0 + (L.slat * tile.i[k] + 0.5) / L.per_deg;
        g.lon[q] = L.lon0 + (L.slon * tile.j[k] + 0.5) / L.per_deg;
        g.gi[q] = tile.i[k]; g.gj[q] = tile.j[k];
        g.d[q] = probeDepth(tile.d[k]); g.s[q] = tile.s[k]; g.ze[q] = tile.ze[k]; g.z[q] = tile.z[k];
      }
    });
    G = g; blocks = []; blockOf = null; siteOf = null; tides = {}; slots = null; sat = null;
    return { cells: n, tiles: g.tiles.length, built: idx.built };
  }
  function loadGrid(base) {
    base = base || CFG.GRID;
    return getJson(base + 'index.json', 'index de la grille').then(function (idx) {
      if (!idx || !idx.tiles || !idx.lattice) throw new Error('index de la grille illisible : ' + base);
      if (!(idx.schema >= 2)) throw new Error('grille de schema ' + idx.schema + ' : il faut le schema 2 (fond au point de l\'app, parts exactes)');
      var tiles = [], p = Promise.resolve();
      idx.tiles.forEach(function (t) {
        p = p.then(function () { return getJson(base + 't_' + t.ti + '_' + t.tj + '.json', 'tuile ' + t.ti + '_' + t.tj); }).then(function (tile) {
          if (tile.n !== t.n) throw new Error('tuile ' + t.ti + '_' + t.tj + ' : ' + tile.n + ' mailles, ' + t.n + ' attendues');
          tiles.push(tile);
        });
      });
      return p.then(function () {
        var r = ingest(idx, tiles);
        if (r.cells !== idx.cells) throw new Error('grille incomplete : ' + r.cells + ' mailles sur ' + idx.cells);
        return r;
      });
    });
  }

  // ---------- meteo ----------
  // Les trois URL sont celles que l'app construit : on la laisse les ecrire
  // pour un point temoin, et on ne remplace que les coordonnees. Si l'app
  // change ses variables ou ses modeles demain, le robot suit sans retouche.
  var PROBE_LAT = 12.345678, PROBE_LON = 1.234567;
  function learnTemplates() {
    var seen = [], real = root.fetch, p;
    root.fetch = function (url) { seen.push(String(url)); return Promise.reject(new Error('gabarit')); };
    try { p = root.fetchSheetMeteo(PROBE_LAT, PROBE_LON); } finally { root.fetch = real; }
    return Promise.resolve(p).then(function () {}, function () {}).then(function () {
      var mark = 'latitude=' + PROBE_LAT + '&longitude=' + PROBE_LON, t = {};
      seen.forEach(function (u) {
        if (u.indexOf(mark) < 0) throw new Error('URL meteo inattendue : ' + u.slice(0, 80));
        var kind = u.indexOf('marine-api') >= 0 ? 'marine' : (u.indexOf('arome') >= 0 ? 'arome' : (u.indexOf('arpege') >= 0 ? 'arpege' : null));
        if (!kind || t[kind]) throw new Error('URL meteo non reconnue : ' + u.slice(0, 80));
        t[kind] = u.split(mark);
      });
      if (!t.arome || !t.arpege || !t.marine) throw new Error('fetchSheetMeteo ne demande plus ses trois sources');
      TPL = t;
    });
  }
  function kindOf(url) {
    return url.indexOf('marine-api') >= 0 ? 'marine' : (url.indexOf('arome') >= 0 ? 'arome' : 'arpege');
  }

  // Un bloc = une cellule du modele de houle. Son point de forcage est la
  // maille de la grille la plus proche du centre de la cellule : un vrai
  // point de mer, que l'API traite comme elle traiterait un clic.
  function buildBlocks() {
    var W = CFG.WAVE_PER_DEG, index = {}, n = G.n;
    blockOf = new Int32Array(n); blocks = [];
    for (var k = 0; k < n; k++) {
      var a = Math.floor(G.lat[k] * W), b = Math.floor(G.lon[k] * W), key = a + '_' + b, id = index[key];
      if (id === undefined) { id = index[key] = blocks.length; blocks.push({ clat: (a + 0.5) / W, clon: (b + 0.5) / W, cell: -1, best: 1e9, n: 0, raw: null, h: null }); }
      var blk = blocks[id], dy = G.lat[k] - blk.clat, dx = (G.lon[k] - blk.clon) * Math.cos(blk.clat * Math.PI / 180), d2 = dy * dy + dx * dx;
      if (d2 < blk.best) { blk.best = d2; blk.cell = k; }
      blk.n++; blockOf[k] = id;
    }
    return blocks.length;
  }

  function fetchForcing(progress) {
    var p = TPL ? Promise.resolve() : learnTemplates();
    return p.then(function () {
      if (!blockOf) buildBlocks();
      var lots = [];
      for (var a = 0; a < blocks.length; a += CFG.BATCH) lots.push(blocks.slice(a, a + CFG.BATCH));
      var chain = Promise.resolve();
      lots.forEach(function (lot, li) {
        chain = chain.then(function () {
          var t0 = Date.now();
          var coords = 'latitude=' + lot.map(function (b) { return G.lat[b.cell].toFixed(5); }).join(',')
                     + '&longitude=' + lot.map(function (b) { return G.lon[b.cell].toFixed(5); }).join(',');
          lot.forEach(function (b) { b.raw = {}; });
          function one(kind) {
            stats.meteoCalls += lot.length;
            return getJson(TPL[kind][0] + coords + TPL[kind][1], 'meteo ' + kind).then(function (res) {
              var list = Array.isArray(res) ? res : [res];
              if (list.length !== lot.length) throw new Error('meteo ' + kind + ' : ' + list.length + ' reponses pour ' + lot.length + ' points');
              lot.forEach(function (b, q) { b.raw[kind] = list[q]; });
            });
          }
          // La houle peut manquer sans tout arreter : l'app sait calculer sans elle.
          return one('arome').then(function () { return one('arpege'); })
            .then(function () { return one('marine').catch(function () { lot.forEach(function (b) { b.raw.marine = null; }); }); })
            .then(function () {
              if (progress) progress(li + 1, lots.length);
              var wait = CFG.PACE_MS - (Date.now() - t0);
              return (li < lots.length - 1 && wait > 0) ? sleep(wait) : null;
            });
        });
      });
      return chain;
    }).then(function () { return fuseAll(); });
  }

  // La fusion AROME + ARPEGE + houle est celle de l'app : fetchSheetMeteo
  // tourne telle quelle, on lui sert les reponses du bloc.
  function fuseAll() {
    var chain = Promise.resolve();
    blocks.forEach(function (blk) {
      chain = chain.then(function () {
        var real = root.fetch, p;
        root.fetch = function (url) {
          var o = blk.raw[kindOf(String(url))];
          return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(o); } });
        };
        try { p = root.fetchSheetMeteo(G.lat[blk.cell], G.lon[blk.cell]); } finally { root.fetch = real; }
        return p.then(function (h) {
          if (!h || !h.time || !h.time.length) throw new Error('meteo vide pour un bloc');
          blk.h = h; blk.raw = null;
        });
      });
    });
    return chain.then(function () { buildSlots(); return { blocks: blocks.length, calls: stats.meteoCalls, hours: blocks[0].h.time.length }; });
  }

  // Les 40 creneaux du tableau : toutes les 3 h a partir d'aujourd'hui 0 h,
  // heure de Paris (renderSheetTable, boucle sur h.time).
  function buildSlots() {
    var tz = (typeof Intl !== 'undefined') ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
    if (tz !== 'Europe/Paris') throw new Error('fuseau du navigateur : ' + tz + '. Le robot doit tourner en Europe/Paris, comme le tableau.');
    var h = blocks[0].h, today0 = new Date(); today0.setHours(0, 0, 0, 0);
    slots = []; slotTimes = []; slotSecs = [];
    for (var i = 0; i < h.time.length && slots.length < CFG.SLOTS; i++) {
      var dt = new Date(h.time[i]);
      if (dt.getTime() < today0.getTime() || dt.getHours() % 3 !== 0) continue;
      slots.push(i); slotTimes.push(h.time[i]); slotSecs.push(Math.round(dt.getTime() / 1000));
    }
    if (slots.length !== CFG.SLOTS) throw new Error(slots.length + ' creneaux sur ' + CFG.SLOTS);
    // tous les blocs partagent le meme axe de temps
    for (var b = 1; b < blocks.length; b++) {
      var t = blocks[b].h.time;
      if (t.length !== h.time.length || t[slots[0]] !== slotTimes[0] || t[slots[CFG.SLOTS - 1]] !== slotTimes[CFG.SLOTS - 1]) throw new Error('axes de temps differents entre blocs');
    }
  }

  // ---------- maree ----------
  function fetchTides(progress) {
    var first = {}, order = [];
    siteOf = new Array(G.n);
    for (var k = 0; k < G.n; k++) {
      var s = root.findApiMareeSiteNear(G.lat[k], G.lon[k]), id = s ? s.siteId : null;
      siteOf[k] = id;
      if (id !== null && first[id] === undefined) { first[id] = k; order.push(id); }
    }
    var cur = 0;
    function worker() {
      if (cur >= order.length) return null;
      var id = order[cur++], k = first[id];
      return root.fetchSheetTides({ lat: G.lat[k], lng: G.lon[k] }).then(function (res) {
        tides[id] = (res && res.points && res.points.length) ? res.points : null;
        stats.tideSites++; if (!tides[id]) stats.tideEmpty++;
        if (progress) progress(stats.tideSites, order.length);
        return worker();
      });
    }
    return Promise.all([worker(), worker(), worker()]).then(function () { return { sites: order.length, empty: stats.tideEmpty }; });
  }

  function fetchFeedback() {
    if (typeof root.ensurePortCounts_ !== 'function') return Promise.resolve(null);
    return root.ensurePortCounts_().then(function () { return true; }, function () { return false; });
  }

  // ---------- satellite ----------
  // La regle est celle du GAS (cmems_zsd_v5_test, ServerFunctions.gs) : on
  // part d'avant-hier, on remonte jour par jour le produit OLCI 300 m (5
  // jours), puis le produit multi-capteurs 1 km (6 jours) ; la premiere
  // valeur trouvee sous le pixel du point fait foi. Le GAS interroge un
  // pixel a la fois (GetFeatureInfo), impossible pour 70 000 mailles : le
  // robot demande les memes tuiles en image (meme jeu de tuiles EPSG:4326,
  // meme zoom, meme pixel) et relit la valeur dans la couleur, par la
  // legende que le serveur publie pour ce style. La couleur porte 256
  // niveaux sur une echelle logarithmique : la valeur relue est a 1 % pres.
  // SAT est le miroir de CMEMS_CONFIG du GAS : si l'un change, l'autre suit.
  // Source : Copernicus Marine, OCEANCOLOUR_ATL_BGC_L3_NRT_009_111.
  var SAT = {
    mode: 'tuiles',
    base: 'https://wmts.marine.copernicus.eu/teroWmts',
    zoom: 10, start_offset_days: 2,
    style: 'cmap:gray,range:0.2/30,logScale',   // gris : un niveau = une valeur, sans ambiguite de teinte
    cascade: [
      { id: 'olci-300m', layer: 'OCEANCOLOUR_ATL_BGC_L3_NRT_009_111/cmems_obs-oc_atl_bgc-transp_nrt_l3-olci-300m_P1D_202311/ZSD', resolution_m: 300, max_days: 5 },
      { id: 'multi-1km', layer: 'OCEANCOLOUR_ATL_BGC_L3_NRT_009_111/cmems_obs-oc_atl_bgc-transp_nrt_l3-multi-1km_P1D_202311/ZSD', resolution_m: 1000, max_days: 6 }
    ],
    stats: { tiles: 0, empty: 0, hits: 0, byDataset: {}, byAge: {} }
  };
  var sat = null;                                     // maille -> objet satellite, ou null

  // Tuile et pixel d'un point : latLonToTileEPSG4326_ du GAS, a l'identique.
  function satPixel(lat, lon) {
    var z = SAT.zoom, w = 360 / Math.pow(2, z + 1), hgt = 180 / Math.pow(2, z);
    var cLat = Math.max(-89.999999, lat), cLon = lon === 180 ? 179.999999 : lon;
    return { x: Math.floor((cLon + 180) / w), y: Math.floor((90 - cLat) / hgt),
             i: Math.floor((((cLon + 180) % w) / w) * 256), j: Math.floor((((90 - cLat) % hgt) / hgt) * 256) };
  }
  // Legende du serveur pour ce style : table de couleurs et bornes.
  function satLegend(layer) {
    var url = SAT.base + '?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetLegend&LAYER=' + layer + '&STYLE=' + SAT.style + '&FORMAT=application/json';
    // Un produit que le serveur ne connait pas repond 400 : le GAS le saute
    // jour apres jour, le robot le saute d'un coup. Constat du 13/11/2026 :
    // la couche OLCI 300 m de la cascade n'existe plus, seul le 1 km repond.
    return root.fetch(url).then(function (r) {
      if (r.status === 400 || r.status === 404) return null;
      if (!r.ok) throw new Error('legende satellite : HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      if (j === null) return null;
      var c = j && j.continuous;
      if (!c || !c.cmap || !c.cmap.colorMap || !(c.valueMin > 0) || !(c.valueMax > c.valueMin) || !c.logScale) throw new Error('legende satellite inattendue');
      var map = c.cmap.colorMap, n = map.length, memo = {};
      return function (r, g, b) {
        var key = (r << 16) | (g << 8) | b, f = memo[key];
        if (f === undefined) {
          var best = 0, bd = 1e9;
          for (var q = 0; q < n; q++) { var dr = map[q][0] - r, dg = map[q][1] - g, db = map[q][2] - b, d = dr * dr + dg * dg + db * db; if (d < bd) { bd = d; best = q; } }
          f = memo[key] = best / (n - 1);
        }
        return c.valueMin * Math.pow(c.valueMax / c.valueMin, f);
      };
    });
  }
  // Une tuile en pixels. null = pas d'image ce jour-la (HTTP 400, comme le GAS).
  function satTile(layer, x, y, dateStr, attempt) {
    var url = SAT.base + '?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=' + layer + '&STYLE=' + SAT.style
      + '&FORMAT=image/png&TILEMATRIXSET=EPSG:4326&TILEMATRIX=' + SAT.zoom + '&TILEROW=' + y + '&TILECOL=' + x
      + '&time=' + encodeURIComponent(dateStr);
    return root.fetch(url).then(function (r) {
      if (r.status === 400 || r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.blob().then(function (bl) { return root.createImageBitmap(bl); }).then(function (bmp) {
        var cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
        var ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(bmp, 0, 0);
        return ctx.getImageData(0, 0, 256, 256).data;
      });
    }).catch(function (e) {
      if ((attempt || 0) >= CFG.RETRIES) throw new Error('tuile satellite : ' + String(e && e.message || e));
      return sleep(1500 * ((attempt || 0) + 1)).then(function () { return satTile(layer, x, y, dateStr, (attempt || 0) + 1); });
    });
  }
  function fetchSatellite(progress) {
    var n = G.n, byTile = {}, px = new Array(n), pending = n;
    sat = new Array(n);
    for (var k = 0; k < n; k++) { sat[k] = null; var p = satPixel(G.lat[k], G.lon[k]); px[k] = p; var key = p.x + '_' + p.y; (byTile[key] || (byTile[key] = [])).push(k); }
    var keys = Object.keys(byTile), now = new Date(), tried = 0, steps = [];
    SAT.cascade.forEach(function (ds) { for (var a = 0; a < ds.max_days; a++) steps.push({ ds: ds, a: a, n: ++tried }); });
    var chain = Promise.resolve();
    SAT.cascade.forEach(function (ds) {
      chain = chain.then(function () { return satLegend(ds.layer); }).then(function (decode) {
        ds.decode = decode;
        if (!decode) SAT.stats.absent = (SAT.stats.absent || []).concat(ds.id);
      });
    });
    steps.forEach(function (st, si) {
      chain = chain.then(function () {
        var d = new Date(now.getTime()); d.setUTCDate(d.getUTCDate() - SAT.start_offset_days - st.a);
        var dateStr = d.toISOString().slice(0, 10) + 'T00:00:00.000Z';
        var age = Math.round((now.getTime() - d.getTime()) / 3600000);
        if (!st.ds.decode) return null;                 // produit absent du serveur : rien a lire ce jour-la
        var todo = keys.filter(function (key) { return byTile[key].length > 0; }), cur = 0;
        function worker() {
          if (cur >= todo.length) return null;
          var key = todo[cur++], xy = key.split('_');
          return satTile(st.ds.layer, +xy[0], +xy[1], dateStr, 0).then(function (data) {
            SAT.stats.tiles++;
            if (!data) { SAT.stats.empty++; return worker(); }
            var left = [];
            byTile[key].forEach(function (k) {
              var o = (px[k].j * 256 + px[k].i) * 4;
              if (data[o + 3] < 255) { left.push(k); return; }      // pixel sans donnee
              var v = st.ds.decode(data[o], data[o + 1], data[o + 2]);
              sat[k] = { status: 'ok', value_zsd_m: v, visi_plongeur_m: v * 0.7, lat_pixel: null, lon_pixel: null,
                         date_observed: dateStr, age_hours: age, attempts: st.n, dataset_used: st.ds.id, resolution_m: st.ds.resolution_m };
              SAT.stats.hits++; pending--;
              SAT.stats.byDataset[st.ds.id] = (SAT.stats.byDataset[st.ds.id] || 0) + 1;
              SAT.stats.byAge[age] = (SAT.stats.byAge[age] || 0) + 1;
            });
            byTile[key] = left;
            return worker();
          });
        }
        return Promise.all([worker(), worker(), worker(), worker()]).then(function () { if (progress) progress(si + 1, steps.length, pending); });
      });
    });
    return chain.then(function () { return { cells: n, withImage: SAT.stats.hits, tiles: SAT.stats.tiles, emptyTiles: SAT.stats.empty, byDataset: SAT.stats.byDataset, byAge: SAT.stats.byAge }; });
  }
  // Sans image exploitable le tableau passe satellite = null au moteur.
  function satFor(k) { return sat ? sat[k] : null; }

  // ---------- la mosaique, telle que fetchSedimentZone la range ----------
  function zoneFor(k) {
    var lat = G.lat[k], lon = G.lon[k];
    var cur = root.getMeanTidalCurrent(lat, lon), U = cur.U;
    var R = Math.min(1500, Math.max(150, U * 600));
    var key = lat.toFixed(4) + '|' + lon.toFixed(4) + '|R' + (Math.round(R / 50) * 50);
    if (G.ze[k] === 1) return { key: key, res: { radius_m: R, classes: [], total_surface_pct: 0, error: 'no features in bbox' } };
    var z = G.z[k], dict = G.idx.sediments, classes = [];
    for (var q = 0; q < z.length; q += 2) {
      var sed = dict[z[q]];
      classes.push({ folk5: sed.folk5, nameFr: sed.nameFr, D50_mm: sed.D50_mm, surface_pct: z[q + 1], sediment: sed });
    }
    var total = classes.reduce(function (s, c) { return s + c.surface_pct; }, 0);
    return { key: key, res: { radius_m: R, radius_decay_m: R / 2, U_courant_used: U, U_source: cur.source,
                              classes: classes, total_surface_pct: total, error: null } };
  }

  // ---------- le calcul ----------
  // Une maille : le contexte du tableau, puis le moteur. `h` et `sat`
  // peuvent etre imposes (banc de comparaison avec le vrai tableau).
  function computeCell(k, out, off, h, sat) {
    var lat = G.lat[k], lon = G.lon[k], depth = G.d[k];
    var sed = G.s[k] >= 0 ? G.idx.sediments[G.s[k]] : null;
    h = h || blocks[blockOf[k]].h;
    if (sat === undefined) sat = satFor(k);
    var pts = siteOf[k] !== null ? tides[siteOf[k]] : null;
    root.TIDES.data = pts || saved.tides;             // le tableau n'echange la maree que s'il en a une
    _depthAtTimeCache = {};
    for (var key in S_spotZoneCache) delete S_spotZoneCache[key];
    var zk = zoneFor(k); S_spotZoneCache[zk.key] = zk.res;
    root.S._spotSediment = sed;                       // ce que fetchSedimentType laisse derriere lui
    _chainCache = {}; _satelliteV4Cache = {}; _coriolisV4Cache = {}; _observationV4Cache = {};
    var opts = { satellite: sat, sediment: sed };
    for (var q = 0; q < slots.length; q++) {
      var o = root.computeVisibilityScore_V4(h, slots[q], depth, lat, lon, opts);
      // la regle d'affichage du tableau : un chiffre fini et positif, au decimetre
      var raw = (o && !o.insufficient && typeof o.visi_m === 'number' && isFinite(o.visi_m) && o.visi_m > 0) ? o.visi_m : null;
      out[off + q] = raw === null ? CFG.NONE : Math.min(CFG.NONE - 1, Math.round(raw * 10));
    }
  }

  var saved = null;
  function enter() {
    saved = { tides: root.TIDES.data, marine: S_spotMarineCache, sat: S_spotSatelliteCache, sed: root.S._spotSediment };
    S_spotMarineCache = null;                         // courant moyen : l'atlas du moteur, comme a la construction de la grille
    S_spotSatelliteCache = null;
  }
  function leave() {
    root.TIDES.data = saved.tides; S_spotMarineCache = saved.marine; S_spotSatelliteCache = saved.sat; root.S._spotSediment = saved.sed;
    _depthAtTimeCache = {}; _chainCache = {}; _satelliteV4Cache = {}; _coriolisV4Cache = {}; _observationV4Cache = {};
    for (var key in S_spotZoneCache) delete S_spotZoneCache[key];
    saved = null;
  }

  var result = null;
  function compute(progress) {
    if (!G || !slots || !siteOf || !sat) return Promise.reject(new Error('grille, meteo, maree et satellite d\'abord'));
    var S = slots.length, n = G.n, out = new Uint8Array(n * S), k = 0, t0 = Date.now();
    enter();
    function chunk() {
      var end = Math.min(n, k + 400);
      try { for (; k < end; k++) computeCell(k, out, k * S); }
      catch (e) { leave(); throw e; }
      if (progress) progress(k, n);
      if (k < n) return breathe().then(chunk);
      leave();
      result = { v: out, ms: Date.now() - t0 };
      return summary();
    }
    return Promise.resolve().then(chunk);
  }

  function summary() {
    var S = slots.length, n = G.n, v = result.v, none = 0, flat = 0, alive = 0, sum = 0, cnt = 0;
    for (var k = 0; k < n; k++) {
      var mn = 255, mx = -1, any = false;
      for (var q = 0; q < S; q++) { var x = v[k * S + q]; if (x === CFG.NONE) continue; any = true; if (x < mn) mn = x; if (x > mx) mx = x; sum += x; cnt++; }
      if (!any) none++; else if (mx === mn) flat++; else alive++;
    }
    return { cells: n, slots: S, ms: result.ms, sansChiffre: none, plates: flat, vivantes: alive, moyenne_m: cnt ? Math.round(sum / cnt) / 10 : null };
  }

  // Sortie (schema 2) : un paquet AUTONOME, que l'app lit sans la grille.
  //   - valeurs : un octet par maille et par creneau (decimetres, 255 = pas de
  //     chiffre), maille k, creneau q -> octet k * creneaux + q, en base64.
  //     En texte et non en binaire : GitHub compresse le texte en le servant
  //     (2,8 Mo deviennent environ 450 Ko sur le fil), pas le binaire.
  //   - mailles : leur position sur le treillis, DANS L'ORDRE des valeurs, en
  //     suites [i, j, longueur] mises bout a bout (une suite = des mailles
  //     voisines sur une meme ligne). Position et valeur sortent du meme
  //     passage : elles ne peuvent pas se desaccorder si la grille est
  //     reconstruite entre deux passages.
  //   - creneaux : l'heure de Paris (lisible) ET l'instant en secondes, pour
  //     que l'app n'ait aucun fuseau a deviner.
  function cellRuns() {
    var runs = [], n = G.n, k = 0;
    while (k < n) {
      var m = k;
      while (m + 1 < n && G.gi[m + 1] === G.gi[k] && G.gj[m + 1] === G.gj[m] + 1) m++;
      runs.push(G.gi[k], G.gj[k], m - k + 1);
      k = m + 1;
    }
    return runs;
  }
  function exportResult() {
    var v = result.v, bin = '', CH = 0x8000, L = G.idx.lattice;
    for (var a = 0; a < v.length; a += CH) bin += String.fromCharCode.apply(null, v.subarray(a, a + CH));
    return {
      meta: { schema: 2, built: new Date().toISOString(),
              engine: (typeof VZ_ENGINE_VERSION !== 'undefined') ? VZ_ENGINE_VERSION : null,
              grid_built: G.idx.built, cells: G.n, slots: slotTimes, slots_s: slotSecs, unit: 'dm', none: CFG.NONE,
              lattice: { lat0: L.lat0, lon0: L.lon0, per_deg: L.per_deg, slat: L.slat, slon: L.slon },
              files: { cells: 'cells.json', values: 'v.txt' },
              order: 'cells.json : suites [i, j, longueur] bout a bout, mailles dans l\'ordre des valeurs ; v.txt : base64, maille k, creneau q -> octet k * creneaux + q',
              forcing: { blocks: blocks.length, per_deg: CFG.WAVE_PER_DEG, calls: stats.meteoCalls },
              tides: { sites: stats.tideSites, empty: stats.tideEmpty },
              satellite: { mode: SAT.mode, style: SAT.style, stats: SAT.stats }, summary: summary() },
      cells: cellRuns(),
      b64: root.btoa(bin)
    };
  }

  // ---------- banc : la maille contre le vrai tableau ----------
  // Ouvre le tableau Previsions de l'app sur le centre d'une maille, relit
  // ce qu'il affiche, et recalcule la maille avec SES entrees (meteo du
  // point, satellite du GAS) : `memes` doit etre identique, c'est la preuve
  // que le contexte est bien pose. `robot` est la valeur publiee (meteo du
  // bloc, satellite du robot) : son ecart mesure l'approximation.
  // Le tableau ecrit dans l'archive des previsions a chaque ouverture. La
  // page du robot n'y ecrit jamais : l'ecriture est coupee une fois pour
  // toutes avant la premiere comparaison.
  // Ce que le tableau s'appretait a archiver est justement ce qu'il affiche,
  // une fois le satellite arrive : le banc le lit la, au lieu de l'ecrire.
  var archiveMuted = false, archiveCalls = 0, lastHist = null;
  function muteArchive() {
    if (archiveMuted) return;
    if (typeof vzHistSubmit_ !== 'function') throw new Error('vzHistSubmit_ introuvable : le banc ecrirait dans l\'archive');
    vzHistSubmit_ = function (key, dayGroups, sl, cells, spot, depth, h, data) {
      archiveCalls++; lastHist = { slots: sl, cells: cells, spot: spot, depth: depth, h: h, data: data };
    };
    archiveMuted = true;
  }
  function checkCell(k) {
    var S = slots.length;
    muteArchive();
    if (typeof root.closeCondDrawer === 'function') root.closeCondDrawer();
    root.S.clickLatLng = root.L.latLng(G.lat[k], G.lon[k]);
    root.S._spotDepth = null;
    lastHist = null;
    root.openCondDrawer();
    var waited = 0;
    function ready() {
      // le tableau depose sa prise quand le satellite a rendu son verdict
      if (lastHist) return Promise.resolve(lastHist);
      if (waited > 60000) return Promise.reject(new Error('tableau muet'));
      waited += 250; return sleep(250).then(ready);
    }
    return ready().then(function (hp) {
      var d = hp.data, sp = hp.spot, table = [];
      hp.slots.forEach(function (s, si) { if (!s.past) table.push(hp.cells[si] && hp.cells[si].vm !== null && hp.cells[si].vm !== undefined ? Math.round(hp.cells[si].vm * 10) : CFG.NONE); });
      if (typeof root.closeCondDrawer === 'function') root.closeCondDrawer();
      var same = new Uint8Array(S), robot = new Uint8Array(S);
      enter();
      try { computeCell(k, same, 0, hp.h, d.satellite || null); computeCell(k, robot, 0); } finally { leave(); }
      function diff(a) { var n = 0, mx = 0; for (var q = 0; q < S; q++) { if (a[q] !== table[q]) { n++; var e = (a[q] === CFG.NONE || table[q] === CFG.NONE) ? 99 : Math.abs(a[q] - table[q]); if (e > mx) mx = e; } } return { n: n, max_dm: mx }; }
      return { k: k, lat: G.lat[k], lon: G.lon[k],
               moved: !!(sp && (Math.abs(sp.lat - G.lat[k]) > 1e-9 || Math.abs(sp.lng - G.lon[k]) > 1e-9)),
               depthTable: hp.depth, depthGrid: G.d[k], sedTable: d.sediment ? d.sediment.nameFr : null,
               sedGrid: G.s[k] >= 0 ? G.idx.sediments[G.s[k]].nameFr : null,
               sat: d.satellite ? d.satellite.status : null, n: table.length,
               satTable: d.satellite ? [d.satellite.dataset_used, d.satellite.age_hours, d.satellite.value_zsd_m] : null,
               satRobot: (sat && sat[k]) ? [sat[k].dataset_used, sat[k].age_hours, sat[k].value_zsd_m] : null,
               memes: diff(same), robot: diff(robot), table: Array.prototype.slice.call(table, 0, 8), calc: Array.prototype.slice.call(same, 0, 8) };
    });
  }

  root.VZ_FC = {
    CFG: CFG, SAT: SAT, loadGrid: loadGrid, useGrid: ingest, fetchForcing: fetchForcing, fetchTides: fetchTides, fetchFeedback: fetchFeedback,
    fetchSatellite: fetchSatellite, satOf: function (k) { return sat ? sat[k] : undefined; },
    compute: compute, summary: summary, exportResult: exportResult, checkCell: checkCell,
    muteArchive: muteArchive,
    info: function () { return { cells: G ? G.n : 0, blocks: blocks.length, slots: slotTimes, stats: stats, sat: SAT.stats, archiveMuted: archiveMuted, archiveCalls: archiveCalls }; },
    _runs: cellRuns,
    _cell: function (k) { var o = new Uint8Array(slots.length); enter(); try { computeCell(k, o, 0); } finally { leave(); } return Array.prototype.slice.call(o); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
