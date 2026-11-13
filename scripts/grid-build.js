#!/usr/bin/env node
/* ============================================================
   VISIMER - CONSTRUCTION DE LA GRILLE NATIONALE (carte fixe)
   ------------------------------------------------------------
   Ouvre la vraie app en Chromium sans tete, y injecte scripts/grid-lib.js
   et construit, tuile par tuile, la grille de mailles de la bande cotiere
   francaise : profondeur, nature du fond au centre, mosaique de fonds autour. C'est le
   moteur de vizi-app.js qui classe les fonds, le robot ne calcule rien a sa
   place.

   Sortie (dossier data-out/grid, publie ensuite sur la branche `data`) :
     index.json          treillis, reglages, dictionnaire des sediments,
                         liste des tuiles et nombre de mailles
     t_<ti>_<tj>.json    une tuile : i, j (indices de maille), d (profondeur
                         en m), c (distance a la terre en m), s (sediment au
                         centre, cle du dictionnaire, -1 si aucun), sl (carte
                         lue : 0 = 1/250 000, 1 = 1/1 000 000, -1 = aucune),
                         r (rayon advectif en m), z (mosaique : cle, part
                         exacte en %), ze (0 = mosaique calculee, 1 = aucune
                         entite autour)
     apercu-*.png        la grille dessinee sur la carte (option --shots)

   A lancer quand le treillis, la bande ou le classement des fonds changent,
   pas chaque jour : la carte fixe ne bouge pas d'une maree a l'autre.

   Usage :  node scripts/grid-build.js [--only 16_13,16_14] [--shots]
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const APP = process.env.VZ_APP_URL || 'https://visimer.fr/';
const OUT = path.resolve(process.env.VZ_GRID_OUT || 'data-out/grid');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const has = k => argv.includes('--' + k);
const ONLY = String(arg('only', '')).split(/[,\s]+/).map(s => s.trim()).filter(s => /^\d+_\d+$/.test(s));

// Vues de controle : la grille doit se lire d'un coup d'oeil, par facade,
// puis de pres sur une cote connue.
const VIEWS = [
  { name: 'france',       lat: 46.5,  lon: 2.0,   zoom: 6 },
  { name: 'manche',       lat: 49.75, lon: -0.6,  zoom: 8 },
  { name: 'bretagne',     lat: 48.2,  lon: -3.7,  zoom: 8 },
  { name: 'atlantique',   lat: 45.9,  lon: -1.9,  zoom: 8 },
  { name: 'mediterranee', lat: 42.9,  lon: 5.6,   zoom: 7 },
  { name: 'corse',        lat: 42.15, lon: 9.1,   zoom: 8 },
  { name: 'calvados',     lat: 49.38, lon: -0.55, zoom: 11 },
  { name: 'calanques',    lat: 43.2,  lon: 5.45,  zoom: 11 }
];

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--no-sandbox'], executablePath: process.env.VZ_CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // Couture de test : un module qui pose ses routes reseau (banc hors ligne).
  if (process.env.VZ_GRID_TEST_ROUTES) await require(path.resolve(process.env.VZ_GRID_TEST_ROUTES))(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('[grid] erreur page :', String(e).slice(0, 200)));

  await page.goto(APP + (APP.includes('?') ? '&' : '?') + 'interne=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof fetchSedimentZone === 'function'
    && typeof mapFolkToSediment === 'function' && typeof _pointInMultiPolygon === 'function'
    && typeof S !== 'undefined' && S.map, null, { timeout: 60000 });
  await page.addScriptTag({ path: path.join(__dirname, 'grid-lib.js') });

  fs.mkdirSync(OUT, { recursive: true });
  const indexPath = path.join(OUT, 'index.json');
  let index = null;
  // Reprise partielle (--only) : on repart de l'index existant, et surtout de
  // son dictionnaire de sediments, pour que les cles restent les memes.
  if (ONLY.length && fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    await page.evaluate(list => VZ_GRID.setSediments(list), index.sediments || []);
  }

  let tiles;
  if (ONLY.length) {
    tiles = ONLY.map(s => ({ ti: +s.split('_')[0], tj: +s.split('_')[1] }));
  } else {
    const plan = await page.evaluate(() => VZ_GRID.plan());
    tiles = plan.tiles;
    console.log('[grid] reperage : ' + tiles.length + ' tuiles cotieres sur ' + plan.total);
  }

  const done = {};
  if (index) (index.tiles || []).forEach(t => { done[t.ti + '_' + t.tj] = t; });
  const failed = [];
  const t0 = Date.now();
  let cells = 0;
  for (let k = 0; k < tiles.length; k++) {
    const t = tiles[k], key = t.ti + '_' + t.tj;
    let res = null, lastErr = null;
    for (let a = 0; a < 3 && !res; a++) {
      try { res = await page.evaluate(([ti, tj]) => VZ_GRID.buildTile(ti, tj), [t.ti, t.tj]); }
      catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 5000)); }
    }
    const file = path.join(OUT, 't_' + key + '.json');
    if (!res) {
      failed.push(key);
      console.error('[grid] ' + key + ' ECHEC ' + String(lastErr && lastErr.message || lastErr).slice(0, 160));
      continue;
    }
    if (res.n) { fs.writeFileSync(file, JSON.stringify(res)); done[key] = { ti: t.ti, tj: t.tj, n: res.n }; }
    else { if (fs.existsSync(file)) fs.unlinkSync(file); delete done[key]; }
    cells += res.n;
    console.log('[grid] ' + String(k + 1).padStart(3) + '/' + tiles.length + '  tuile ' + key.padEnd(6)
      + String(res.n).padStart(6) + ' mailles  ' + (res.ms / 1000).toFixed(1) + ' s');
  }

  const info = await page.evaluate(() => ({
    cfg: VZ_GRID.CFG, sediments: VZ_GRID.sediments(),
    engine: (typeof VZ_ENGINE_VERSION !== 'undefined') ? VZ_ENGINE_VERSION : null
  }));
  const list = Object.keys(done).map(k => done[k]).sort((a, b) => a.ti - b.ti || a.tj - b.tj);
  const out = {
    schema: 2, built: new Date().toISOString(), engine: info.engine, app: APP,
    lattice: { lat0: info.cfg.LAT0, lon0: info.cfg.LON0, per_deg: info.cfg.DTM_PER_DEG,
               slat: info.cfg.SLAT, slon: info.cfg.SLON, tile_i: info.cfg.TILE_I, tile_j: info.cfg.TILE_J },
    band: { band_m: info.cfg.BAND_M, near_m: info.cfg.NEAR_M, depth_min: info.cfg.DEPTH_MIN, depth_max: info.cfg.DEPTH_MAX },
    sources: { bathymetry: 'EMODnet Bathymetry DTM 2024 (ERDDAP bathymetry_dtm_2024)',
               substrate: 'EMODnet Geology gtk:seabed_substrate_250k, puis gtk:seabed_substrate_1m pour le fond au point',
               france: 'Flanders Marine Institute, Marine Regions eez_land, MRGID ' + info.cfg.FRANCE_MRGID + ' (CC-BY)' },
    sediments: info.sediments,
    cells: list.reduce((s, t) => s + t.n, 0),
    tiles: list,
    failed: failed
  };
  fs.writeFileSync(indexPath, JSON.stringify(out));
  console.log('[grid] ' + out.cells + ' mailles dans ' + list.length + ' tuiles, '
    + failed.length + ' echec(s), ' + Math.round((Date.now() - t0) / 60000) + ' min');

  if (has('shots')) {
    // Recharge toutes les tuiles ecrites pour les dessiner, y compris celles
    // d'un lancement precedent.
    const all = list.map(t => JSON.parse(fs.readFileSync(path.join(OUT, 't_' + t.ti + '_' + t.tj + '.json'), 'utf8')));
    await page.evaluate(a => { window.__vzGridTiles = a; }, all);
    for (const v of VIEWS) {
      for (const mode of ['depth', 'sed']) {
        await page.evaluate(([lat, lon, z]) => { S.map.setView([lat, lon], z, { animate: false }); }, [v.lat, v.lon, v.zoom]);
        await page.waitForTimeout(3500);
        const n = await page.evaluate(m => VZ_GRID.preview(window.__vzGridTiles, m), mode);
        const name = 'apercu-' + v.name + '-' + (mode === 'sed' ? 'fond' : 'profondeur') + '.png';
        await page.screenshot({ path: path.join(OUT, name) });
        console.log('[grid] ' + name + ' (' + n + ' mailles a l\'ecran)');
      }
    }
  }

  await browser.close();
  // Une grille incomplete n'est pas publiee : le workflow s'arrete ici.
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('[grid] ECHEC', e); process.exit(1); });
