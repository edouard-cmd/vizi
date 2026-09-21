#!/usr/bin/env node
/* ============================================================
   VISIMER - ROBOT D'ARCHIVE DES PREVISIONS ANNONCEES
   ------------------------------------------------------------
   Sert le repo en local, ouvre la vraie app dans Chromium headless, et pour
   chaque port de SPOTS ouvre le tableau Previsions sur le POINT DE
   REFERENCE du secteur : le port decale de 800 m vers le large, le long de
   la normale a la cote (getCoastNormal). Le tableau ecrit lui-meme la
   prevision annoncee dans le GAS (hist_submit, source=robot) : le robot ne
   calcule rien, il n'invente rien, il fait ce qu'un chasseur ferait.

   Usage :  node scripts/hist-robot.js [--only courseulles,luc] [--offset 800]
   Sortie : hist-robot-log.json (un statut par port)
   ============================================================ */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');

const REPO = path.resolve(__dirname, '..');
const PORT = 8123;
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
// Tolerant : "only = courseulles", majuscules, espaces ou virgules en separateur.
const ONLY = String(arg('only', '')).replace(/^\s*only\s*[:=]\s*/i, '')
  .split(/[,\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
const OFFSET_M = parseFloat(arg('offset', '800'));
const PER_PORT_TIMEOUT = 45000;

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.geojson': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
function serve() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(REPO, p);
    if (f.startsWith(REPO) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    } else { res.writeHead(404); res.end('404'); }
  });
  return new Promise(r => srv.listen(PORT, () => r(srv)));
}

async function main(opts) {
  opts = opts || {};
  const srv = await serve();
  const browser = await chromium.launch(Object.assign({ args: ['--no-sandbox'] }, opts.launch || {}));
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  if (opts.route) await opts.route(ctx);
  // Le tableau signe ses ecritures "robot" et n'utilise que la cle du port
  // en cours : deux ports voisins ne se volent pas leur archive.
  await ctx.addInitScript(() => { window.VZ_HIST_SOURCE = 'robot'; });
  const page = await ctx.newPage();
  const log = { started: new Date().toISOString(), ports: [] };
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  const ports = await page.evaluate(() => SPOTS.map(s => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lon })));
  const todo = ONLY.length ? ports.filter(p => ONLY.includes(p.id.toLowerCase())) : ports;
  const unknown = ONLY.filter(id => !ports.some(p => p.id.toLowerCase() === id));
  if (unknown.length) console.log(`[robot] ids inconnus ignores : ${unknown.join(', ')} (ids valides : ${ports.map(p => p.id).join(', ')})`);
  console.log(`[robot] ${todo.length} port(s) a archiver`);

  for (const p of todo) {
    const t0 = Date.now();
    const entry = { id: p.id, name: p.name, status: 'pending' };
    log.ports.push(entry);
    errors.length = 0;
    try {
      // Point de reference : 800 m au large le long de la normale a la cote.
      const ref = await page.evaluate(({ lat, lon, off }) => {
        const brg = getCoastNormal(lat, lon) * Math.PI / 180;
        const dLat = (off * Math.cos(brg)) / 111320;
        const dLon = (off * Math.sin(brg)) / (111320 * Math.cos(lat * Math.PI / 180));
        return { lat: lat + dLat, lon: lon + dLon };
      }, { lat: p.lat, lon: p.lon, off: OFFSET_M });
      entry.ref = ref;

      // Une seule promesse : la premiere ecriture hist_submit de CE port.
      const submitted = page.waitForRequest(r => r.url().includes('action=hist_submit') && r.url().includes('sector=p%3A' + encodeURIComponent(p.id)), { timeout: PER_PORT_TIMEOUT });
      await page.evaluate(({ id, lat, lon }) => {
        window.VZ_HIST_FORCE_SECTOR = 'p:' + id;
        if (typeof closeCondDrawer === 'function') closeCondDrawer();
        S.clickLatLng = L.latLng(lat, lon);
        S._spotDepth = null;
        openCondDrawer();
      }, { id: p.id, lat: ref.lat, lon: ref.lon });
      const req = await submitted;
      const u = new URL(req.url());
      entry.v = u.searchParams.get('v');
      entry.day = u.searchParams.get('day');
      // Laisse partir les 4 autres jours, puis lit la reponse du premier.
      const resp = await req.response().catch(() => null);
      entry.gas = resp ? resp.status() : null;
      await page.waitForTimeout(1500);
      entry.status = (entry.v && entry.v.replace(/,/g, '') !== '') ? 'ok' : 'empty';
    } catch (e) {
      entry.status = 'timeout';
      entry.error = String(e.message || e).slice(0, 160);
    }
    entry.ms = Date.now() - t0;
    if (errors.length) entry.jsErrors = errors.slice(0, 3);
    console.log(`[robot] ${p.id.padEnd(22)} ${entry.status.padEnd(8)} ${String(entry.ms).padStart(6)} ms  ${entry.v || ''}`);
  }

  // Purge : on garde 60 jours de prises.
  try {
    const purge = await page.evaluate(() => gasGet('hist_purge', { keep_days: 60 }));
    log.purge = purge;
  } catch (e) { log.purge = { error: String(e).slice(0, 120) }; }

  log.finished = new Date().toISOString();
  log.summary = todo.reduce((a, p, i) => { const s = log.ports[i].status; a[s] = (a[s] || 0) + 1; return a; }, {});
  fs.writeFileSync(path.join(opts.logDir || process.cwd(), 'hist-robot-log.json'), JSON.stringify(log, null, 2));
  console.log('[robot] termine', JSON.stringify(log.summary));
  await browser.close(); srv.close();
  return log;
}

if (require.main === module) main().catch(e => { console.error('[robot] ECHEC', e); process.exit(1); });
module.exports = { main };
