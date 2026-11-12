#!/usr/bin/env node
/* ============================================================
   VISIMER - GENERATEUR DE LA TABLE VZ_SEA_POINTS
   ------------------------------------------------------------
   Pour chaque port de SPOTS, cherche le POINT DE MER du secteur sur la
   bathymetrie EMODnet et imprime le bloc `var VZ_SEA_POINTS = {...}` a
   coller dans vizi-app.js. A relancer quand SPOTS change (port ajoute,
   coordonnees corrigees). Rien n'est ecrit dans le repo : la sortie se
   relit avant d'etre collee.

   Regle (la meme pour toute la France, aucune table regionale) :
     1. 16 profils de 8 km tires depuis le port, un tous les 22,5 degres
        (EMODnet REST depth_profile, cote negative sous le zero des cartes) ;
     2. sur chaque profil, rivage du large = debut du premier troncon
        continu sous le zero des cartes long d'au moins OPEN_M metres
        (un bassin, un lac, une riviere etroite ou une flaque d'estran ne
        passent pas) ;
     3. depuis ce rivage on avance jusqu'au premier fond de DEPTH_M metres,
        sans depasser OFF_M metres : un candidat par profil ;
     4. les candidats sont essayes du plus proche du port au plus lointain,
        jusqu'a MAX_DIST_M (5 km, le rayon des retours chasseurs) ; le
        premier dont la sonde depth_sample (celle que lit l'app) donne au
        moins MIN_DEPTH_M metres d'eau est retenu. Le profil et la sonde
        ne sont pas toujours d'accord pres d'une cote accore : c'est la
        sonde de l'app qui tranche ;
     5. la profondeur ecrite est celle de cette sonde.

   Reglages choisis sur le moteur reel, le 12/11/2026 :
   DEPTH_M = 5 et non 10 : a 10 m de fond le moteur reste plat meme par 3 m
   de houle (Les Sables : 2,0 m sur 32 creneaux) ; a 5 m il suit la mer.
   OFF_M = 400 et non 800 : a 800 m du rivage du large le point sort de la
   bande ou le fond est brasse (Courseulles : 2,6 a 3,1 m par 1,3 m de
   vagues). A 400 m il y reste.
   OPEN_M = 2000 : avec 800, Bordeaux tombait sur un lac a 5 km du port.
   MIN_DEPTH_M = 0.5 : le seuil d'eau minimale du moteur.
   MAX_DIST_M = 5000 : le rayon des retours chasseurs (VZ_OBS_MAX_KM).

   Usage :  node scripts/sea-points.js [--only saint_vaast,nice] > sea-points.txt
   Node 18+ (fetch natif). EMODnet limite le debit : les appels sont
   sequentiels, compter une dizaine de minutes pour 134 ports.
   ============================================================ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const RAYS = 16, LEN_M = 8000, STEP_M = 50;
const OPEN_M = 2000, OFF_M = 400, DEPTH_M = 5, MIN_DEPTH_M = 0.5, MAX_DIST_M = 5000, MAX_TRIES = 8;
const REST = 'https://rest.emodnet-bathymetry.eu/';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const ONLY = String(arg('only', '')).split(/[,\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- regle pure (copie conforme de celle qui a produit la table) ----
function vzSeaPointFromProfiles(profiles, opt) {
  var step = opt.step, open = opt.open, off = opt.off, depth = opt.depth;
  var best = null;
  for (var r = 0; r < profiles.length; r++) {
    var pr = profiles[r];
    var v = pr && pr.v;
    if (!v || !v.length) continue;
    var n = v.length, i = 0;
    while (i < n) {
      if (!(typeof v[i] === 'number' && v[i] < 0)) { i++; continue; }
      var j = i;
      while (j + 1 < n && typeof v[j + 1] === 'number' && v[j + 1] < 0) j++;
      if ((j - i) * step >= open) {
        var kMax = Math.min(j, i + Math.round(off / step));
        var k = i;
        while (k < kMax && !(v[k] <= -depth)) k++;
        var cand = { brg: pr.brg, dist: k * step, shore: i * step, z: v[k] };
        if (!best || cand.dist < best.dist || (cand.dist === best.dist && cand.z < best.z)) best = cand;
        break;                       // premier troncon ouvert du profil, pas les suivants
      }
      i = j + 1;
    }
  }
  return best;
}

function dest(lat, lon, brgDeg, m) {
  const b = brgDeg * Math.PI / 180;
  return { lat: lat + (m * Math.cos(b)) / 111320,
           lon: lon + (m * Math.sin(b)) / (111320 * Math.cos(lat * Math.PI / 180)) };
}

async function getJson(url) {
  for (let k = 0; k < 5; k++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch (e) {}
    await sleep(1500 * (k + 1));       // EMODnet refuse les rafales : on patiente
  }
  return null;
}

async function profile(lat, lon, brg) {
  const e = dest(lat, lon, brg, LEN_M);
  const a = await getJson(REST + 'depth_profile?geom=LINESTRING(' + lon + ' ' + lat + ',' + e.lon + ' ' + e.lat + ')');
  if (!Array.isArray(a) || a.length < 10) return null;
  const out = [];
  for (let d = 0; d <= LEN_M; d += STEP_M) {
    const v = a[Math.round(d / LEN_M * (a.length - 1))];
    out.push(typeof v === 'number' ? Math.round(v * 10) / 10 : null);
  }
  return out;
}

function loadSpots() {
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'vizi-app.js'), 'utf8');
  const a = src.indexOf('var SPOTS = [');
  const b = src.indexOf('\n];', a);
  if (a < 0 || b < 0) throw new Error('SPOTS introuvable dans vizi-app.js');
  const box = {};
  vm.runInNewContext(src.slice(a, b + 3) + '\nthis.SPOTS = SPOTS;', box);
  return box.SPOTS;
}

async function main() {
  const spots = loadSpots().filter(s => !ONLY.length || ONLY.includes(String(s.id).toLowerCase()));
  const rows = [], none = [];
  for (const s of spots) {
    const profiles = [];
    for (let r = 0; r < RAYS; r++) {
      const brg = r * 360 / RAYS;
      profiles.push({ brg: brg, v: await profile(s.lat, s.lon, brg) });
      await sleep(80);
    }
    // Un candidat par profil, essayes du plus proche au plus lointain.
    const opt = { step: STEP_M, open: OPEN_M, off: OFF_M, depth: DEPTH_M };
    const cands = [];
    profiles.forEach(pr => { const c = vzSeaPointFromProfiles([pr], opt); if (c && c.dist <= MAX_DIST_M) cands.push(c); });
    cands.sort((a, b) => a.dist - b.dist || a.z - b.z);
    let got = null;
    for (const c of cands.slice(0, MAX_TRIES)) {
      const p = dest(s.lat, s.lon, c.brg, c.dist);
      const lat = Math.round(p.lat * 1e5) / 1e5, lon = Math.round(p.lon * 1e5) / 1e5;
      const ds = await getJson(REST + 'depth_sample?geom=POINT(' + lon + ' ' + lat + ')');
      await sleep(120);
      const z = (ds && typeof ds.avg === 'number') ? ds.avg : null;
      if (z !== null && z <= -MIN_DEPTH_M) { got = { lat: lat, lon: lon, depth: Math.round(-z * 10) / 10, c: c }; break; }
    }
    if (!got) { none.push(s.id); console.error('[sea] ' + s.id.padEnd(22) + ' aucun point de mer'); continue; }
    rows.push("  '" + s.id + "':[" + got.lat.toFixed(5) + ',' + got.lon.toFixed(5) + ',' + got.depth.toFixed(1) + ']');
    console.error('[sea] ' + s.id.padEnd(22) + ' ' + got.c.brg + ' deg, ' + got.c.dist + ' m du port, ' + got.depth.toFixed(1) + ' m de fond');
  }
  console.log('var VZ_SEA_POINTS = {\n' + rows.join(',\n') + '\n};');
  console.error('[sea] ' + rows.length + ' point(s), ' + none.length + ' port(s) sans mer ouverte : ' + none.join(', '));
}

if (require.main === module) main().catch(e => { console.error('[sea] ECHEC', e); process.exit(1); });
module.exports = { vzSeaPointFromProfiles, dest };
