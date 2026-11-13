#!/usr/bin/env node
/* ============================================================
   VISIMER - PREVISION SUR LA GRILLE NATIONALE (robot quotidien)
   ------------------------------------------------------------
   Ouvre la vraie app en Chromium sans tete, y injecte
   scripts/forecast-lib.js et calcule, pour chaque maille de la grille, la
   visibilite des 40 creneaux de 3 h des 5 jours. C'est le moteur de
   vizi-app.js qui calcule (computeVisibilityScore_V4), avec les entrees
   que le tableau Previsions lui donne : le robot ne fait que les lui
   servir en masse.

   Etapes : grille (branche data) -> meteo (un point par cellule du modele
   de houle) -> maree (un appel par site) -> retours chasseurs ->
   satellite (tuiles) -> moteur -> banc.

   LE BANC
   Sur quelques mailles tirees au sort, le robot ouvre le vrai tableau
   Previsions et compare les 40 chiffres.
     - Avec les entrees du tableau, l'ecart doit etre nul : c'est la preuve
       que le contexte du moteur est pose comme le tableau le pose. Un seul
       ecart et rien n'est publie.
     - Avec les entrees du robot (meteo du bloc, satellite lu dans les
       tuiles), l'ecart mesure l'approximation. Il est publie dans
       index.json, il ne bloque pas.
   La page du robot n'ecrit jamais dans l'archive des previsions.

   Sortie (dossier data-out/forecast, publie sur la branche `forecast`) :
     index.json   moteur, date, creneaux, comptes, bilan du banc
     v.bin        un octet par maille et par creneau : decimetres de
                  visibilite, 255 = pas de chiffre. Maille k, creneau q ->
                  octet k * 40 + q, mailles dans l'ordre de grid/index.json.

   Usage :  node scripts/forecast-build.js [--check 30]
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const APP = process.env.VZ_APP_URL || 'https://visimer.fr/';
const OUT = path.resolve(process.env.VZ_FC_OUT || 'data-out/forecast');
const GRID = process.env.VZ_GRID_URL || '';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const CHECK = Math.max(0, parseInt(arg('check', '30'), 10) || 0);

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--no-sandbox'], executablePath: process.env.VZ_CHROME || undefined });
  // Meme fuseau et meme langue qu'un chasseur : le tableau decoupe ses
  // creneaux en heure locale.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  if (process.env.VZ_FC_TEST_ROUTES) await require(path.resolve(process.env.VZ_FC_TEST_ROUTES))(ctx);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => { pageErrors.push(String(e).slice(0, 200)); console.error('[prevision] erreur page :', String(e).slice(0, 200)); });

  await page.goto(APP + (APP.includes('?') ? '&' : '?') + 'interne=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof computeVisibilityScore_V4 === 'function' && typeof fetchSheetMeteo === 'function'
    && typeof fetchSheetTides === 'function' && typeof getMeanTidalCurrent === 'function'
    && typeof S !== 'undefined' && S.map, null, { timeout: 60000 });
  await page.addScriptTag({ path: path.join(__dirname, 'forecast-lib.js') });
  // Rien de ce que fait cette page ne doit s'ecrire dans l'archive.
  await page.evaluate(() => VZ_FC.muteArchive());

  const t0 = Date.now();
  const step = async (label, fn) => {
    const t = Date.now();
    const r = await fn();
    console.log('[prevision] ' + label.padEnd(10) + ' ' + ((Date.now() - t) / 1000).toFixed(0).padStart(4) + ' s  ' + JSON.stringify(r));
    return r;
  };
  await step('grille', () => page.evaluate(g => VZ_FC.loadGrid(g || undefined), GRID));
  await step('meteo', () => page.evaluate(() => VZ_FC.fetchForcing()));
  await step('maree', () => page.evaluate(() => VZ_FC.fetchTides()));
  await step('retours', () => page.evaluate(() => VZ_FC.fetchFeedback()));
  await step('satellite', () => page.evaluate(() => VZ_FC.fetchSatellite()));
  const summary = await step('moteur', () => page.evaluate(() => VZ_FC.compute()));

  // ---- banc : mailles tirees au sort, la graine change chaque jour
  const bench = { cells: 0, slots: 0, same_inputs_diffs: 0, robot_diffs: 0, robot_max_dm: 0, robot_cells_off: 0, errors: 0 };
  let seed = Math.floor(Date.now() / 86400000);
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let q = 0; q < CHECK; q++) {
    const k = Math.floor(rnd() * summary.cells);
    try {
      const c = await page.evaluate(i => VZ_FC.checkCell(i), k);
      bench.cells++; bench.slots += c.n;
      bench.same_inputs_diffs += c.memes.n;
      bench.robot_diffs += c.robot.n;
      if (c.robot.n) bench.robot_cells_off++;
      if (c.robot.max_dm > bench.robot_max_dm) bench.robot_max_dm = c.robot.max_dm;
      console.log('[prevision] banc ' + String(q + 1).padStart(2) + '/' + CHECK + '  ' + c.lat.toFixed(4) + ',' + c.lon.toFixed(4)
        + '  ' + String(c.sedGrid).padEnd(16) + ' memes entrees ' + c.memes.n + '  robot ' + c.robot.n + ' (max ' + c.robot.max_dm + ' dm)');
    } catch (e) {
      bench.errors++;
      console.error('[prevision] banc ' + (q + 1) + ' : ' + String(e && e.message || e).slice(0, 160));
    }
  }
  const info = await page.evaluate(() => VZ_FC.info());
  bench.archive_writes_blocked = info.archiveCalls;
  console.log('[prevision] banc : ' + JSON.stringify(bench));

  const res = await page.evaluate(() => VZ_FC.exportResult());
  await browser.close();

  res.meta.bench = bench;
  res.meta.app = APP;
  res.meta.minutes = Math.round((Date.now() - t0) / 60000);
  const bin = Buffer.from(res.b64, 'base64');
  if (bin.length !== res.meta.cells * res.meta.slots.length) throw new Error('taille du fichier : ' + bin.length + ' octets pour ' + res.meta.cells + ' mailles');
  // Le moteur n'est plus pose comme le tableau : on ne publie pas.
  if (bench.same_inputs_diffs > 0) throw new Error(bench.same_inputs_diffs + ' ecart(s) avec le tableau a entrees egales');
  if (CHECK > 0 && bench.cells === 0) throw new Error('banc muet : aucune maille comparee');
  if (pageErrors.length) throw new Error('erreurs JavaScript dans la page : ' + pageErrors[0]);

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'v.bin'), bin);
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(res.meta));
  console.log('[prevision] ' + res.meta.cells + ' mailles x ' + res.meta.slots.length + ' creneaux, '
    + (bin.length / 1e6).toFixed(1) + ' Mo, ' + res.meta.minutes + ' min. ' + JSON.stringify(res.meta.summary));
})().catch(e => { console.error('[prevision] ECHEC', e && e.message || e); process.exit(1); });
