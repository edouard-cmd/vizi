// ============================================================
// FONCTIONS APPELÉES DEPUIS LE FRONTEND
// Contient le doGet unique du projet
// ============================================================
// Cle API Brevo lue depuis les proprietes de script GAS
// (Parametres du projet > Proprietes du script > cle BREVO_API_KEY).
// Jamais en dur dans le code : ce fichier est versionne dans un repo
// public. Si la propriete est absente, Brevo repond 401 (logge par
// notifySectorSubscribers_, sans bloquer le depot d'observation).
var BREVO_API_KEY = PropertiesService.getScriptProperties().getProperty('BREVO_API_KEY');
var ALERT_SENDER = { name: 'Visimer', email: 'contact@visimer.fr' };
function getPredictionsData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const predictSheet = ss.getSheetByName(CONFIG.SHEETS.PREDICTIONS);
  if (!predictSheet) return { predictions: [] };
  const data = predictSheet.getDataRange().getValues().slice(1);
  const predictions = data.map(r => ({
    generated_at: r[0] ? r[0].toString() : '',
    spot_id: r[1],
    spot_name: r[2],
    date: r[3] ? (r[3] instanceof Date ? Utilities.formatDate(r[3], 'Europe/Paris', 'yyyy-MM-dd') : r[3].toString()) : '',
    turbidity_score: parseInt(r[4]) || 50,
    visibility_class: r[5] || 'Moyenne',
    confidence: parseInt(r[6]) || 70,
    wind_speed: parseInt(r[7]) || 0,
    wave_height: parseFloat(r[8]) || 0,
    precipitation_24h: parseInt(r[9]) || 0
  }));
  return { predictions };
}

// Ports de reference des secteurs : source unique (coordonnees + noms).
// Le port ne decide plus du matching des alertes (voir
// notifySectorSubscribers_, matching par distance) : il ne sert plus
// qu'a nommer humainement le secteur dans l'email et l'UI.
// Enrichir cette table au fil de la demande (abonnes hors zone).
var SECTOR_PORTS = {
  lion:        { name: 'Lion-sur-Mer',          lat: 49.2986, lon: -0.3147 },
  luc:         { name: 'Luc-sur-Mer',           lat: 49.3219, lon: -0.3556 },
  saint_aubin: { name: 'Saint-Aubin-sur-Mer',   lat: 49.3333, lon: -0.3944 },
  courseulles: { name: 'Courseulles-sur-Mer',   lat: 49.3383, lon: -0.4572 },
  ver:         { name: 'Ver-sur-Mer',           lat: 49.3358, lon: -0.5303 },
  arromanches: { name: 'Arromanches-les-Bains', lat: 49.3422, lon: -0.6231 }
};

// Distance grand-cercle en km (formule haversine, rayon terrestre 6371 km).
function haversineKm_(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Port le plus proche d'un point : { id, name, dist_km } ou null.
function nearestSpotInfo_(lat, lon) {
  if (!isFinite(lat) || !isFinite(lon)) return null;
  var best = null;
  for (var id in SECTOR_PORTS) {
    var p = SECTOR_PORTS[id];
    var d = haversineKm_(lat, lon, p.lat, p.lon);
    if (!best || d < best.dist_km) best = { id: id, name: p.name, dist_km: d };
  }
  return best;
}

// Signature historique conservee (utilisee par submitSectorAlert_) :
// retourne l'id du port le plus proche, a titre indicatif uniquement.
function findNearestSpot(lat, lon) {
  var info = nearestSpotInfo_(lat, lon);
  return info ? info.id : null;
}

function submitFeedbackData(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feedbackSheet = ss.getSheetByName(CONFIG.SHEETS.FEEDBACK);
  if (!feedbackSheet) throw new Error('Sheet feedback introuvable. Lance initializeSheets().');
  const conditions = (typeof getConditionsForSpotAndDate === 'function') ? getConditionsForSpotAndDate(data.spot_id, data.date) : {};
  feedbackSheet.appendRow([
    new Date().toISOString(),
    data.spot_id, data.date,
    data.diver_name || 'Anonyme',
    data.visibility_class,
    '', '',
    data.bottom_visible ? 1 : 0,
    data.current_felt ? 1 : 0,
    data.comment || '',
    conditions.wind_speed || '',
    conditions.wave_height || '',
    conditions.precipitation || ''
  ]);
  const count = feedbackSheet.getLastRow() - 1;
  if (count >= 10 && count % 10 === 0) retrainModel();
  return { success: true };
}

// ============================================================
// OBSERVATIONS COMMUNAUTAIRES (< 72h)
// ============================================================

function getObservationsData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('observations');
    if (!sheet) return { observations: [], count: 0 };

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { observations: [], count: 0 };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxTimestamp = headers.indexOf('timestamp');
    const idxLat = headers.indexOf('lat');
    const idxLon = headers.indexOf('lon');
    const idxDate = headers.indexOf('date');
    const idxTime = headers.indexOf('time');
    const idxVisM = headers.indexOf('visibility_m');
    const idxVisLabel = headers.indexOf('visibility_label');
    const idxBottom = headers.indexOf('bottom_visible');
    const idxComment = headers.indexOf('comment');
    const idxPseudo = headers.indexOf('pseudo');
    const idxTurb = headers.indexOf('turbidity');
    const idxWind = headers.indexOf('wind_speed_at_time');
    const idxWave = headers.indexOf('wave_height_at_time');

    const cutoff = new Date().getTime() - (72 * 60 * 60 * 1000);
    const observations = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const ts = row[idxTimestamp];
      if (!ts) continue;
      const tsDate = (ts instanceof Date) ? ts : new Date(ts);
      if (isNaN(tsDate.getTime())) continue;
      if (tsDate.getTime() < cutoff) continue;

      observations.push({
        timestamp: tsDate.toISOString(),
        lat: parseFloat(row[idxLat]),
        lon: parseFloat(row[idxLon]),
        date: row[idxDate] ? (row[idxDate] instanceof Date ? Utilities.formatDate(row[idxDate], 'Europe/Paris', 'yyyy-MM-dd') : String(row[idxDate])) : '',
        time: row[idxTime] || '',
        visibility_m: parseFloat(row[idxVisM]) || 0,
        visibility_label: row[idxVisLabel] || '',
        bottom_visible: row[idxBottom] === 1 || row[idxBottom] === true || row[idxBottom] === '1' || row[idxBottom] === 'TRUE',
        comment: row[idxComment] || '',
        pseudo: idxPseudo >= 0 ? (row[idxPseudo] || 'Anonyme') : 'Anonyme',
        turbidity: idxTurb >= 0 ? (row[idxTurb] || '') : '',
        wind_speed_at: idxWind >= 0 ? (parseFloat(row[idxWind]) || null) : null,
        wave_height_at: idxWave >= 0 ? (parseFloat(row[idxWave]) || null) : null
      });
    }

    observations.sort(function(a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return { observations: observations, count: observations.length };
  } catch (err) {
    return { error: err.toString(), observations: [], count: 0 };
  }
}

// ============================================================
// COMMIT 3c — TOUS LES RETOURS RECENTS (comptage par port)
// ------------------------------------------------------------
// Renvoie TOUS les retours de 'visi_feedback' de moins de MAX_AGE_H
// heures, SANS filtre de rayon. Le front range ensuite chaque retour
// dans le port le plus proche (regle plus-proche-port) et compte par
// port. Un seul appel sert toute la carte (pas un appel par port).
// Age calcule depuis date_sortie a 12:00, fallback server_ts.
// ============================================================
function getAllVisiFeedback_(e) {
  var MAX_AGE_H = 72;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('visi_feedback');
  if (!sh || sh.getLastRow() < 2) {
    return { feedbacks: [], count: 0, max_age_h: MAX_AGE_H };
  }

  var rows = sh.getDataRange().getValues();
  var headers = rows[0];
  var iServerTs = headers.indexOf('server_ts');
  var iDate = headers.indexOf('date_sortie');
  var iLat = headers.indexOf('lat');
  var iLon = headers.indexOf('lon');
  var iPred = headers.indexOf('visi_annoncee_m');
  var iReal = headers.indexOf('visi_reelle_m');
  var iType = headers.indexOf('type');

  var nowMs = new Date().getTime();
  var out = [];

  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    var fLat = parseFloat(row[iLat]);
    var fLon = parseFloat(row[iLon]);
    if (!isFinite(fLat) || !isFinite(fLon)) continue;

    var ageH = null;
    var ds = row[iDate];
    if (ds) {
      var dsDate = (ds instanceof Date) ? ds : new Date(String(ds) + 'T12:00:00');
      if (!isNaN(dsDate.getTime())) ageH = (nowMs - dsDate.getTime()) / 3600000;
    }
    if (ageH === null) {
      var st = row[iServerTs];
      var stDate = (st instanceof Date) ? st : new Date(st);
      if (!isNaN(stDate.getTime())) ageH = (nowMs - stDate.getTime()) / 3600000;
    }
    if (ageH === null || ageH < 0 || ageH > MAX_AGE_H) continue;

    var realV = parseFloat(row[iReal]);
    var predV = parseFloat(row[iPred]);
    out.push({
      lat: fLat,
      lon: fLon,
      real_m: isFinite(realV) ? realV : null,
      predicted_m: isFinite(predV) ? predV : null,
      kind: row[iType] || 'confirm',
      age_hours: Math.round(ageH * 10) / 10
    });
  }

  return { feedbacks: out, count: out.length, max_age_h: MAX_AGE_H };
}

// ============================================================
// BRIQUE V5 — ASSIMILATION SATELLITE CMEMS OCEAN COLOUR
// ------------------------------------------------------------
// Récupère la profondeur de Secchi (ZSD) au point lat/lon depuis
// le service WMTS public de Copernicus Marine, puis la convertit
// en visibilité plongeur via la relation Wright & Colling 1995.
//
// Architecture cascade (Sprint 3.0, 19/05/2026) :
//   1. Tente OLCI-300m sur J-2 à J-6 (résolution spatiale fine,
//      Sentinel-3A+3B uniquement, plus de trous nuageux)
//   2. Si tout échoue, fallback multi-1km sur J-2 à J-7
//      (multi-sensor SeaWiFS+MODIS+VIIRS+OLCI, plus de couverture)
//   3. Si tout échoue encore : no_data_extended
//
// Sources scientifiques :
//   - Secchi A. 1865, mesures Mediterranee a bord du Pie IX
//     (origine du disque de Secchi)
//   - Wright J. & Colling A. 1995, "Seawater: Its Composition,
//     Properties and Behaviour", Open University, ch.5
//     (relation visi_horizontale_plongeur ≈ 0.7 × ZSD)
//   - CMEMS produit OCEANCOLOUR_ATL_BGC_L3_NRT_009_111
//     - dataset olci-300m   : Sentinel-3 OLCI, 300m, latence J-2
//     - dataset multi-1km   : multi-sensor fusion, 1km, latence J-2
//     EPSG:4326, WMTS GetFeatureInfo public (pas d'auth)
//
// Contrat de sortie (additif, rétrocompatible) :
//   - status : 'ok' (hit dans la cascade) | 'no_data_extended' (miss)
//   - value_zsd_m, visi_plongeur_m, lat_pixel, lon_pixel,
//     date_observed, age_hours, attempts (inchangés)
//   - dataset_used : 'olci-300m' | 'multi-1km' | null  (NOUVEAU)
//   - resolution_m : 300 | 1000 | null                  (NOUVEAU)
// ============================================================

// Configuration centralisée — ajuster ici pour modifier la cascade.
var CMEMS_CONFIG = {
  zoom: 10,
  base_url: 'https://wmts.marine.copernicus.eu/teroWmts',
  start_offset_days: 2,
  cascade: [
    {
      dataset_id: 'olci-300m',
      layer_path: 'OCEANCOLOUR_ATL_BGC_L3_NRT_009_111/'
                + 'cmems_obs-oc_atl_bgc-transp_nrt_l3-olci-300m_P1D_202311/ZSD',
      resolution_m: 300,
      max_days: 5
    },
    {
      dataset_id: 'multi-1km',
      layer_path: 'OCEANCOLOUR_ATL_BGC_L3_NRT_009_111/'
                + 'cmems_obs-oc_atl_bgc-transp_nrt_l3-multi-1km_P1D_202311/ZSD',
      resolution_m: 1000,
      max_days: 6
    }
  ]
};
// Conversion lat/lon -> coordonnees tuile WMTS EPSG:4326.
// Portage direct de l'algorithme officiel Mercator-Ocean
// (atlas.mercator-ocean.fr) sans modification autre que
// suppression de process.argv et passage en fonction privee.
function latLonToTileEPSG4326_(lat, lon, zoom) {
  var constrainedLat = Math.max(-89.999999, lat);
  var constrainedLon = lon === 180 ? 179.999999 : lon;

  var minLat = -90;
  var maxLat = 90;
  var minLon = -180;

  var tileCountX = Math.pow(2, zoom + 1);
  var tileCountY = Math.pow(2, zoom);

  var tileWidth = 360 / tileCountX;
  var tileHeight = 180 / tileCountY;

  var tileX = Math.floor((constrainedLon - minLon) / tileWidth);
  var tileY = Math.floor((maxLat - constrainedLat) / tileHeight);

  var pixelX = Math.floor(
    (((constrainedLon - minLon) % tileWidth) / tileWidth) * 256
  );
  var pixelY = Math.floor(
    (((maxLat - constrainedLat) % tileHeight) / tileHeight) * 256
  );

  return { tileX: tileX, tileY: tileY, pixelX: pixelX, pixelY: pixelY };
}

// Recupere la ZSD CMEMS au point (lat, lon) pour une date donnee.
// Si dateISO non fournie, utilise aujourd'hui. Tente J-1 puis J-2
// puis J-3 si la dalle est nuageuse (value=null en sortie WMTS).
// Fonction bas niveau : interroge UN dataset sur une fenêtre de dates.
// Ne connaît rien de la cascade. Retourne { hit: bool, payload | null, last_http_code }.
// payload (si hit) contient les champs bruts ZSD + métadonnées dataset.
function fetchCmemsZSDFromDataset_(lat, lon, datasetConfig, startDate, maxDays) {
  var coords = latLonToTileEPSG4326_(lat, lon, CMEMS_CONFIG.zoom);
  var lastHttpCode = null;

  for (var attempt = 0; attempt < maxDays; attempt++) {
    var d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() - attempt);
    var dateStr = Utilities.formatDate(d, 'UTC', "yyyy-MM-dd'T'00:00:00.000'Z'");

    var url = CMEMS_CONFIG.base_url
      + '?SERVICE=WMTS&REQUEST=GetFeatureInfo&VERSION=1.0.0'
      + '&LAYER=' + datasetConfig.layer_path
      + '&INFOFORMAT=application/json'
      + '&TILEMATRIXSET=EPSG:4326'
      + '&TILEMATRIX=' + CMEMS_CONFIG.zoom
      + '&TILEROW=' + coords.tileY
      + '&TILECOL=' + coords.tileX
      + '&I=' + coords.pixelX
      + '&J=' + coords.pixelY
      + '&time=' + encodeURIComponent(dateStr);

    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

    // Instrumentation Sprint 3.0 — à retirer une fois le bug identifié
    if (attempt === 0) {
      Logger.log('CMEMS URL (' + datasetConfig.dataset_id + ') : ' + url);
      Logger.log('CMEMS HTTP code : ' + response.getResponseCode());
      Logger.log('CMEMS body (200 premiers chars) : '
        + response.getContentText().substring(0, 200));
    }
    var code = response.getResponseCode();
    lastHttpCode = code;

    // 400 = date hors plage publiée (bordure de fenêtre NRT). On continue.
    if (code === 400) continue;

    // Autres erreurs : remontée (problème d'infra réel, ou layer inexistant).
    if (code !== 200) {
      throw new Error('CMEMS WMTS HTTP ' + code
        + ' dataset=' + datasetConfig.dataset_id
        + ' attempt=' + (attempt + 1));
    }

    var json;
    try {
      json = JSON.parse(response.getContentText());
    } catch (parseErr) {
      throw new Error('CMEMS WMTS réponse non-JSON ('
        + datasetConfig.dataset_id + ') : ' + parseErr.message);
    }

    if (!json.features || json.features.length === 0) {
      throw new Error('CMEMS WMTS pas de features ('
        + datasetConfig.dataset_id + ')');
    }

    var feature = json.features[0];
    var zsd = feature.properties ? feature.properties.value : null;

    if (zsd !== null && zsd !== undefined) {
      var pixelLat = feature.geometry && feature.geometry.coordinates
        ? feature.geometry.coordinates[1] : null;
      var pixelLon = feature.geometry && feature.geometry.coordinates
        ? feature.geometry.coordinates[0] : null;
      var ageHours = Math.round((new Date().getTime() - d.getTime()) / 3600000);

      return {
        hit: true,
        payload: {
          value_zsd_m: zsd,
          visi_plongeur_m: zsd * 0.7,
          lat_pixel: pixelLat,
          lon_pixel: pixelLon,
          date_observed: dateStr,
          age_hours: ageHours,
          attempts_this_dataset: attempt + 1,
          dataset_used: datasetConfig.dataset_id,
          resolution_m: datasetConfig.resolution_m
        },
        last_http_code: code
      };
    }
    // Miss : pixel nuageux, on continue J-(attempt+1)
  }

  return { hit: false, payload: null, last_http_code: lastHttpCode };
}

// Orchestrateur de cascade.
// Tente chaque dataset de CMEMS_CONFIG.cascade dans l'ordre.
// Premier hit gagne. Sinon retourne no_data_extended.
// Signature publique inchangée : (lat, lon, dateISO).
function fetchCmemsZSD_(lat, lon, dateISO) {
  // Date de départ : J-2 par défaut (latence NRT 48h confirmée 19/05/26).
  var startDate;
  if (dateISO) {
    startDate = new Date(dateISO);
  } else {
    startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - CMEMS_CONFIG.start_offset_days);
  }

  var totalAttempts = 0;

  for (var i = 0; i < CMEMS_CONFIG.cascade.length; i++) {
    var ds = CMEMS_CONFIG.cascade[i];
    var result = fetchCmemsZSDFromDataset_(lat, lon, ds, startDate, ds.max_days);
    totalAttempts += (result.payload && result.payload.attempts_this_dataset)
      ? result.payload.attempts_this_dataset
      : ds.max_days;

    if (result.hit) {
      return {
        status: 'ok',
        value_zsd_m: result.payload.value_zsd_m,
        visi_plongeur_m: result.payload.visi_plongeur_m,
        lat_pixel: result.payload.lat_pixel,
        lon_pixel: result.payload.lon_pixel,
        date_observed: result.payload.date_observed,
        age_hours: result.payload.age_hours,
        attempts: totalAttempts,
        dataset_used: result.payload.dataset_used,
        resolution_m: result.payload.resolution_m
      };
    }
  }

  // Tous les datasets de la cascade ont échoué
  return {
    status: 'no_data_extended',
    value_zsd_m: null,
    visi_plongeur_m: null,
    lat_pixel: null,
    lon_pixel: null,
    date_observed: null,
    age_hours: null,
    attempts: totalAttempts,
    dataset_used: null,
    resolution_m: null
  };
}
// ============================================================
// SPRINT 3 — FETCH CORIOLIS COTIER (bouée IFREMER COAST-HF)
// ------------------------------------------------------------
// Proxy GAS qui appelle l'API publique IFREMER pour récupérer
// la dernière mesure de turbidité d'une bouée Coriolis Côtier.
// 
// Endpoint v1.1 (legacy /timeseries_goodqc déprécié depuis 05/2026)
// Pas d'authentification, GET simple, format JSON normalisé.
//
// Source : https://api-coriolis.ifremer.fr/swagger-ui/index.html
// Réseau : COAST-HF (Manche/Atlantique/Méditerranée)
// 
// Contrat de sortie calqué sur fetchCmemsZSD_ pour homogénéité
// frontend :
//   - status : 'ok' | 'no_data'
//   - value_ntu : turbidité brute en NTU
//   - timestamp_observed : ms epoch UTC de la mesure
//   - age_hours : ancienneté en heures depuis maintenant
//   - platform_code, parameter_code : pour traçabilité
//   - qc : qualité IFREMER (1 = bon, 2-3-4 = à filtrer)
// ============================================================
function fetchCoriolisTurbidity_(platformCode, parameterCode, hoursBack) {
// Fenêtre temporelle : N secondes en arrière depuis maintenant.
  // IMPORTANT : l'API v1.1 attend des SECONDES (epoch / 1000), pas
  // des millisecondes. L'envoi de millisecondes fait interpréter la
  // date à l'an 57000 et retourne result vide.
  var nowSec = Math.floor(new Date().getTime() / 1000);
// On force 30 jours par défaut (fenêtre où SMILE a forcément des mesures),
  // hoursBack devient un override optionnel mais pas crucial.
  var startSec = nowSec - (30 * 24 * 3600);
Logger.log('Coriolis URL construit avec nowSec=' + nowSec + ' startSec=' + startSec);
// QC filter : 0,1,2,5,7,8 = toutes valeurs validées ou en cours
  // de validation (exclut 3=bad, 4=changed, 6=interpolated)
  // Sans ce paramètre, l'API filtre par défaut sur qc=1 uniquement,
  // ce qui rejette toutes les mesures fraîches en QC provisoire.
// Endpoint legacy : utilisé par le portail Coriolis Côtier en prod.
  // Marqué "déprécié" dans Swagger mais maintenu fonctionnel par IFREMER.
  // v1.1/timeseries a une logique QC plus stricte qui rejette les mesures
  // fraîches de SMILE en 2026. On utilise l'endpoint que le portail
  // officiel utilise lui-même.
var url = 'https://api-coriolis.ifremer.fr/legacy/timeseries_goodqc'
    + '?data_type=MO'
    + '&downsampling=LTTB'
    + '&end=' + nowSec
    + '&format=highcharts'
    + '&parameter=' + encodeURIComponent(parameterCode)
    + '&platform=' + encodeURIComponent(platformCode)
    + '&qc=0&qc=1&qc=2&qc=5&qc=7&qc=8'
    + '&samplingparameter=400'
    + '&start=' + startSec;
  var response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Referer': 'https://api-coriolis.ifremer.fr/swagger-ui/index.html'
    }
  });
  Logger.log('Coriolis URL complete: ' + url);
  Logger.log('Coriolis HTTP code: ' + response.getResponseCode());
  Logger.log('Coriolis headers reçus: ' + JSON.stringify(response.getAllHeaders()));
  Logger.log('Coriolis body (300 chars): ' + response.getContentText().substring(0, 800));
  var code = response.getResponseCode();

  if (code !== 200) {
    return {
      status: 'no_data',
      value_ntu: null,
      timestamp_observed: null,
      age_hours: null,
      platform_code: platformCode,
      parameter_code: parameterCode,
      qc: null,
      error: 'HTTP ' + code
    };
  }

  var json;
  try {
    json = JSON.parse(response.getContentText());
  } catch (parseErr) {
    return {
      status: 'no_data',
      value_ntu: null,
      timestamp_observed: null,
      age_hours: null,
      platform_code: platformCode,
      parameter_code: parameterCode,
      qc: null,
      error: 'parse error: ' + parseErr.message
    };
  }

  // Vérification structure attendue
  if (!json.result || !json.result[0] || !json.result[0].data || json.result[0].data.length === 0) {
    return {
      status: 'no_data',
      value_ntu: null,
      timestamp_observed: null,
      age_hours: null,
      platform_code: platformCode,
      parameter_code: parameterCode,
      qc: null,
      error: 'empty result'
    };
  }

  // On itère depuis la fin (dernier point = plus récent) et on prend
  // le premier point avec qc=1. Si aucun qc=1 dans la fenêtre, on
  // remonte le dernier point disponible avec son qc réel (le frontend
  // décidera quoi en faire).
  var data = json.result[0].data;
  var bestPoint = null;
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][2] === 1) {
      bestPoint = data[i];
      break;
    }
  }
  if (!bestPoint) bestPoint = data[data.length - 1];

  var tsMs = bestPoint[0];
  var valNtu = bestPoint[1];
  var qc = bestPoint[2];
// tsMs vient en millisecondes (sortie IFREMER, oui c'est asymétrique
  // avec l'entrée en secondes — c'est leur convention API actuelle)
  var nowMs = new Date().getTime();
  var ageHours = (nowMs - tsMs) / 3600000;

  return {
    status: 'ok',
    value_ntu: valNtu,
    timestamp_observed: tsMs,
    age_hours: Math.round(ageHours * 10) / 10,
    platform_code: platformCode,
    parameter_code: parameterCode,
    qc: qc,
    error: null
  };
}
// Variante de test : force l'utilisation d'un seul dataset par dataset_id.
// Utilisée par le doGet pour valider empiriquement chaque layer en isolation.
// Retourne le même schéma que fetchCmemsZSD_.
function fetchCmemsZSDSingleDataset_(lat, lon, dateISO, datasetId) {
  var ds = null;
  for (var i = 0; i < CMEMS_CONFIG.cascade.length; i++) {
    if (CMEMS_CONFIG.cascade[i].dataset_id === datasetId) {
      ds = CMEMS_CONFIG.cascade[i];
      break;
    }
  }
  if (!ds) {
    throw new Error('dataset_id inconnu : ' + datasetId
      + ' (valeurs valides : olci-300m, multi-1km)');
  }

  var startDate;
  if (dateISO) {
    startDate = new Date(dateISO);
  } else {
    startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - CMEMS_CONFIG.start_offset_days);
  }

  var result = fetchCmemsZSDFromDataset_(lat, lon, ds, startDate, ds.max_days);

  if (result.hit) {
    return {
      status: 'ok',
      value_zsd_m: result.payload.value_zsd_m,
      visi_plongeur_m: result.payload.visi_plongeur_m,
      lat_pixel: result.payload.lat_pixel,
      lon_pixel: result.payload.lon_pixel,
      date_observed: result.payload.date_observed,
      age_hours: result.payload.age_hours,
      attempts: result.payload.attempts_this_dataset,
      dataset_used: result.payload.dataset_used,
      resolution_m: result.payload.resolution_m
    };
  }
  return {
    status: 'no_data_extended',
    value_zsd_m: null,
    visi_plongeur_m: null,
    lat_pixel: null,
    lon_pixel: null,
    date_observed: null,
    age_hours: null,
    attempts: ds.max_days,
    dataset_used: ds.dataset_id,
    resolution_m: ds.resolution_m
  };
}
// ============================================================
// doGet — point d'entrée HTTP GET UNIQUE
// ============================================================
function doGet(e) {
  const action = e.parameter.action;

  const output = (data) => ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);

  // Si pas d'action, sert l'app HTML
  if (!action || action === 'map') {
    return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('Visimer')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  try {
    switch (action) {

      case 'predictions':
        return output(getPredictionsData());

      case 'heatmap': {
        const day = parseInt(e.parameter.day_offset) || 0;
        return output(getHeatmapData(day));
      }

      case 'spots':
        return output({ spots: SPOTS });

      case 'tides':
        return output(getTidesData(e.parameter.port_id || null));

      // Proxy api-maree.fr (1 jour)
      case 'api_tides': {
        const site = e.parameter.site;
        const from = e.parameter.from;
        const to = e.parameter.to;
        const step = e.parameter.step || '15';
        if (!site || !from || !to) {
          return output({ error: 'params requis : site, from, to' });
        }
        return output(fetchApiMaree(site, from, to, step));
      }

      // Marees multi-jours
      case 'tides_range':
        return handleTidesRange(e.parameter);

      // Proxy EMODnet Geology — WFS substrate 250k
      case 'sediment': {
        const lat = parseFloat(e.parameter.lat);
        const lon = parseFloat(e.parameter.lon);
        const bbox = (lon-0.05)+','+(lat-0.05)+','+(lon+0.05)+','+(lat+0.05);
        const url = 'https://drive.emodnet-geology.eu/geoserver/ows'
          + '?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature'
          + '&TYPENAMES=gtk:seabed_substrate_250k'
          + '&OUTPUTFORMAT=application/json'
          + '&CQL_FILTER=BBOX(geom,'+bbox+',\'EPSG:4326\')'
          + '&COUNT=1'
          + '&PROPERTYNAME=folk_5cl_txt,folk_16cl_txt,original_substrate';
        const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        return output({ text: resp.getContentText() });
      }

      // Scores turbidite grille reelle
      case 'turb_scores': {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const scoresSheet = ss.getSheetByName('grid_scores');
        if (!scoresSheet) return output({scores:[], updated_at: null});
        const sData = scoresSheet.getDataRange().getValues();
        const scores = [];
        let updatedAt = null;
        for (let i = 1; i < sData.length; i++) {
          if (sData[i][0] && sData[i][1]) {
            scores.push({
              lat:   sData[i][0],
              lon:   sData[i][1],
              score: sData[i][2],
              label: sData[i][3],
              depth: sData[i][8]
            });
            if (!updatedAt && sData[i][10]) {
              updatedAt = sData[i][10] instanceof Date
                ? sData[i][10].toISOString()
                : String(sData[i][10]);
            }
          }
        }
        return output({scores: scores, updated_at: updatedAt});
      }

      // Recuperer les observations communautaires < 72h
      case 'get_observations':
        return output(getObservationsData());
// Brique V5 satellite — cascade complète (300m puis 1km fallback)
      case 'cmems_zsd_v5_test': {
        var lat = parseFloat(e.parameter.lat);
        var lon = parseFloat(e.parameter.lon);
        if (isNaN(lat) || isNaN(lon)) {
          return output({ error: 'params requis : lat, lon (decimal degrees)' });
        }
        var dateISO = e.parameter.date || null;
        return output(fetchCmemsZSD_(lat, lon, dateISO));
      }

      // Test isolé OLCI 300m — valide le nom du layer avant cascade prod
      case 'cmems_zsd_v5_test_300m': {
        var lat300 = parseFloat(e.parameter.lat);
        var lon300 = parseFloat(e.parameter.lon);
        if (isNaN(lat300) || isNaN(lon300)) {
          return output({ error: 'params requis : lat, lon (decimal degrees)' });
        }
        var date300 = e.parameter.date || null;
        return output(fetchCmemsZSDSingleDataset_(lat300, lon300, date300, 'olci-300m'));
      }

      // Test isolé multi 1km — non-régression du dataset existant
      case 'cmems_zsd_v5_test_1km': {
        var lat1k = parseFloat(e.parameter.lat);
        var lon1k = parseFloat(e.parameter.lon);
        if (isNaN(lat1k) || isNaN(lon1k)) {
          return output({ error: 'params requis : lat, lon (decimal degrees)' });
        }
        var date1k = e.parameter.date || null;
        return output(fetchCmemsZSDSingleDataset_(lat1k, lon1k, date1k, 'multi-1km'));
      }
      // ============================================================
      // Brique Sprint 3 — Mesure terrain Coriolis Côtier IFREMER
      // ------------------------------------------------------------
      // Proxy CORS pour appeler l'API publique IFREMER depuis le
      // frontend GitHub Pages. Params : platform, parameter, hours.
      // Defaults : SMILE Luc-sur-Mer (6200310), turbidité (135), 6h.
      // ============================================================
      case 'coriolis_turbidity': {
        var platform = e.parameter.platform || '6200310';
        var parameter = e.parameter.parameter || '135';
        var hoursBack = parseInt(e.parameter.hours) || 6;
        if (hoursBack < 1 || hoursBack > 168) hoursBack = 6;  // garde-fou 1h-7j
        return output(fetchCoriolisTurbidity_(platform, parameter, hoursBack));
      }
      // Enregistrement observation terrain via GET (pas de CORS)
      case 'submit_observation': {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName('observations');
        if (!sheet) {
          sheet = ss.insertSheet('observations');
          sheet.appendRow([
            'timestamp', 'lat', 'lon', 'date', 'time',
            'visibility_m', 'visibility_label',
            'bottom_visible', 'comment', 'pseudo'
          ]);
          sheet.getRange(1, 1, 1, 10).setFontWeight('bold')
            .setBackground('#1a1a2e').setFontColor('#ffffff');
        }

        // Migration douce : ajoute la colonne pseudo si absente
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        if (headers.indexOf('pseudo') === -1) {
          sheet.getRange(1, sheet.getLastColumn() + 1).setValue('pseudo');
        }
        if (headers.indexOf('turbidity') === -1) {
          sheet.getRange(1, sheet.getLastColumn() + 1).setValue('turbidity');
        }

        // Ecriture mappee sur les en-tetes reels de la feuille.
        // Un appendRow positionnel casse des que le schema de la feuille
        // diverge du schema du code (colonnes intercalees type current_felt,
        // wind_speed_at) : le pseudo atterrissait dans 'comment' et la
        // colonne 'pseudo' restait vide. Ici chaque valeur est placee a
        // l'index de son en-tete, quel que soit l'ordre des colonnes.
        // Re-lecture des en-tetes APRES la migration douce ci-dessus,
        // pour inclure les colonnes eventuellement ajoutees a l'instant.
        const obsHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const obsValues = {
          timestamp: new Date().toISOString(),
          lat: parseFloat(e.parameter.lat) || 0,
          lon: parseFloat(e.parameter.lon) || 0,
          date: e.parameter.date || '',
          time: e.parameter.time || '',
          visibility_m: parseFloat(e.parameter.visibility_m) || 0,
          visibility_label: e.parameter.visibility_label || '',
          bottom_visible: e.parameter.bottom_visible === 'true' ? 1 : 0,
          comment: e.parameter.comment || '',
          pseudo: e.parameter.pseudo || 'Anonyme',
          turbidity: e.parameter.turbidity || ''
        };
        const obsRow = obsHeaders.map(function(h) {
          return Object.prototype.hasOwnProperty.call(obsValues, h) ? obsValues[h] : '';
        });
        sheet.appendRow(obsRow);
        // Chantier 2 : notifie les abonnes du secteur (Brevo).
        // En try/catch : le depot reste garanti meme si l'envoi tombe.
        try {
          // 4e argument : la qualite d'eau du formulaire (Claire /
          // Voilee / Chargee), pas visibility_label (Bonne / Moyenne)
          // qui faisait afficher "Bonne" au lieu de "Eau chargee"
          // dans l'email (turbidityLabel_ attend un label d'eau).
          notifySectorSubscribers_(
            parseFloat(e.parameter.lat), parseFloat(e.parameter.lon),
            parseFloat(e.parameter.visibility_m) || 0,
            e.parameter.turbidity || ''
          );
        } catch (alertErr) {
          Logger.log('notifySectorSubscribers_ echec : ' + alertErr.message);
        }
        return output({ success: true });
      }
// Enregistrement lead chasse (email + spots) via GET
// Abonnement aux alertes visibilite d'un secteur (chantier 2)
      case 'submit_sector_alert':
        return output(submitSectorAlert_(e));
      case 'save_lead': {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(CONFIG.SHEETS.LEADS);
        if (!sheet) {
          sheet = ss.insertSheet(CONFIG.SHEETS.LEADS);
          sheet.appendRow(['timestamp', 'email', 'count', 'lat', 'lon']);
          sheet.getRange(1, 1, 1, 5).setFontWeight('bold')
            .setBackground('#1a1a2e').setFontColor('#ffffff');
        }
        sheet.appendRow([
          new Date().toISOString(),
          e.parameter.email || '',
          parseInt(e.parameter.count) || 0,
          parseFloat(e.parameter.lat) || '',
          parseFloat(e.parameter.lon) || ''
        ]);
        return output({ status: 'ok' });
      }

      // Lecture retours communautaires dans 1km/72h (commit 3a)
      case 'get_visi_feedback':
        return output(getVisiFeedbackData_(e));

      // Tous les retours recents (<72h) sans filtre de rayon (commit 3c).
      // Le front range chaque retour dans le port le plus proche et compte.
      case 'all_visi_feedback':
        return output(getAllVisiFeedback_(e));

      // Retour communautaire de visibilite (commit 2) — flux GET distinct
      // du doPost 'submit_feedback' existant. Ecrit dans la feuille dediee
      // 'visi_feedback'. Fonction definie dans Code.gs.
      case 'submit_visi_feedback':
        return output(submitVisiFeedback_(e));

      default:
        return output({ error: 'Action inconnue : ' + action });
    }
  } catch (err) {
    return output({ error: err.message });
  }
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const action = payload.action;
  const output = (data) => ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  if (action === 'submit_feedback') return output(submitFeedbackData(payload.data));
  if (action === 'send_spots') return output(sendSpotsEmail(payload));
  return output({ error: 'Action inconnue' });
}

function sendSpotsEmail(payload) {
  var email = (payload.email || '').trim();
  var spots = payload.spots || [];
  var gpx = payload.gpx || '';
  if (!email || spots.length === 0) return { status: 'error', error: 'email ou spots manquants' };

  // 1. Log dans la feuille leads (n'empeche pas l'envoi si ca casse)
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(CONFIG.SHEETS.LEADS);
    if (!sh) {
      sh = ss.insertSheet(CONFIG.SHEETS.LEADS);
      sh.appendRow(['timestamp', 'email', 'count', 'lat', 'lon']);
    }
    var c0 = spots[0] || {};
    sh.appendRow([new Date(), email, spots.length, c0.lat || '', c0.lon || '']);
  } catch (logErr) {}

  // 2. Corps : liste des spots en clair
  var lines = spots.map(function(s) {
    return 'Spot ' + s.n + '\n  ' + s.ddm + '\n  ' + s.dd;
  }).join('\n\n');

  var body = 'Salut,\n\n'
    + 'Voici ' + (spots.length > 1 ? 'tes ' + spots.length + ' spots' : 'ton spot') + ' marqués sur Visimer :\n\n'
    + lines + '\n\n'
    + 'Le fichier GPX est en pièce jointe. Importe-le dans ton GPS ou traceur (Garmin, etc.).\n\n'
    + 'Bonne chasse,\nVisimer\nhttps://visimer.fr';

  // 3. GPX en piece jointe
  var gpxBlob = Utilities.newBlob(gpx, 'application/gpx+xml', 'visimer-spots.gpx');

  MailApp.sendEmail({
    to: email,
    subject: 'Tes spots Visimer (' + spots.length + ')',
    body: body,
    name: 'Visimer',
    from: 'contact@visimer.fr',
    replyTo: 'contact@visimer.fr',
    attachments: [gpxBlob]
  });

  return { status: 'ok' };
}
function testSendSpots() {
  var r = sendSpotsEmail({
    email: 'edouard@cobound.fr',
    spots: [{ n: 1, ddm: "49°21.12'N 0°23.54'W", dd: '49.35201, -0.39229', lat: '49.352010', lon: '-0.392290' }],
    gpx: '<?xml version="1.0"?>\n<gpx></gpx>\n'
  });
  Logger.log(JSON.stringify(r));
}
// ============================================================
// CHANTIER 2 - ALERTES VISIBILITE PAR SECTEUR (envoi Brevo)
// ------------------------------------------------------------
// Boucle complete :
//   1. Un chasseur s'abonne via l'action GET 'submit_sector_alert'
//      -> submitSectorAlert_ rattache son email au spot le plus
//      proche (findNearestSpot) dans la feuille 'sector_alerts'.
//   2. Un chasseur depose une visi via 'submit_observation'
//      -> notifySectorSubscribers_ envoie un email Brevo a chaque
//      abonne du meme secteur, dans l'heure du depot.
// Garde-fou : 1 email maximum par abonne et par jour (last_sent_at).
// Desinscription : reponse STOP ou email a contact@visimer.fr
// (le lien 1 clic promis par l'UI est un raffinement a venir).
// Feuille 'sector_alerts' creee a la volee, colonnes :
//   timestamp | email | spot_id | lat | lon | last_sent_at
// Envoi : API transactionnelle Brevo (https://api.brevo.com),
// domaine visimer.fr authentifie SPF/DKIM, expediteur ALERT_SENDER.
// sendSpotsEmail (MailApp) n'est PAS touche : seules les alertes
// secteur passent par Brevo.
// ============================================================

// Abonne un email aux alertes du secteur le plus proche de (lat, lon).
// Idempotent : un email deja abonne au meme spot renvoie ok sans doublon.
function submitSectorAlert_(e) {
  var email = String(e.parameter.email || '').trim().toLowerCase();
  var lat = parseFloat(e.parameter.lat);
  var lon = parseFloat(e.parameter.lon);

  if (!email || email.indexOf('@') === -1 || email.indexOf('.') === -1) {
    return { status: 'error', error: 'email invalide' };
  }
  if (!isFinite(lat) || !isFinite(lon)) {
    return { status: 'error', error: 'params requis : lat, lon' };
  }

  var spotId = findNearestSpot(lat, lon);
  if (!spotId) {
    return { status: 'error', error: 'aucun secteur trouve' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('sector_alerts');
  if (!sheet) {
    sheet = ss.insertSheet('sector_alerts');
    sheet.appendRow(['timestamp', 'email', 'spot_id', 'lat', 'lon', 'last_sent_at']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold')
      .setBackground('#1a1a2e').setFontColor('#ffffff');
  }

  // Dedoublonnage email + spot
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).trim().toLowerCase() === email && rows[i][2] === spotId) {
      return { status: 'ok', spot_id: spotId, already_subscribed: true };
    }
  }

  sheet.appendRow([new Date().toISOString(), email, spotId, lat, lon, '']);
  return { status: 'ok', spot_id: spotId, already_subscribed: false };
}

// Notifie tous les abonnes dont le point d'abonnement est a moins de
// ALERT_RADIUS_KM du depot. Le matching est purement geographique :
// la table des ports ne sert plus qu'a nommer le secteur dans l'email
// (modele Waze : la proximite est la verite, le nom est un habillage).
// Un abonne hors de toute zone connue (ex. Etretat) ne recoit donc
// rien tant que personne ne depose pres de chez lui, et le premier
// depot local le notifiera sans aucune modification de la table.
// Appele par 'submit_observation' en try/catch : ne doit jamais
// empecher l'enregistrement du depot.
function notifySectorSubscribers_(lat, lon, visiM, waterLabel) {
  if (!isFinite(lat) || !isFinite(lon)) return { sent: 0 };

  var ALERT_RADIUS_KM = 15;  // rayon de notification autour du depot
  var NAME_RADIUS_KM = 20;   // au-dela, aucun port n'est nomme dans l'email

  // Nom humain : port le plus proche du DEPOT, seulement s'il est
  // assez proche pour ne pas mentir. Sinon l'email dit "ton secteur".
  var near = nearestSpotInfo_(lat, lon);
  var sectorName = (near && near.dist_km <= NAME_RADIUS_KM) ? near.name : null;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('sector_alerts');
  if (!sheet || sheet.getLastRow() < 2) return { sent: 0 };

  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var iEmail = headers.indexOf('email');
  var iLat = headers.indexOf('lat');
  var iLon = headers.indexOf('lon');
  var iLast = headers.indexOf('last_sent_at');
  if (iEmail === -1 || iLat === -1 || iLon === -1 || iLast === -1) return { sent: 0 };

  var now = new Date();
  var oneDayMs = 24 * 3600 * 1000;
  var sent = 0;

  for (var r = 1; r < rows.length; r++) {
    var email = String(rows[r][iEmail] || '').trim();
    if (!email) continue;

    var subLat = parseFloat(rows[r][iLat]);
    var subLon = parseFloat(rows[r][iLon]);
    if (!isFinite(subLat) || !isFinite(subLon)) continue;
    if (haversineKm_(lat, lon, subLat, subLon) > ALERT_RADIUS_KM) continue;

    // Garde-fou : 1 email maximum par abonne et par jour
    var last = rows[r][iLast];
    if (last) {
      var lastDate = (last instanceof Date) ? last : new Date(last);
      if (!isNaN(lastDate.getTime()) && (now.getTime() - lastDate.getTime()) < oneDayMs) {
        continue;
      }
    }

    try {
      sendSectorAlertEmail_(email, sectorName, visiM, waterLabel);
      sheet.getRange(r + 1, iLast + 1).setValue(now.toISOString());
      sent++;
    } catch (sendErr) {
      Logger.log('sendSectorAlertEmail_ echec pour ' + email + ' : ' + sendErr.message);
    }
  }

  return { sent: sent, sector: sectorName };
}

// Envoie un email d'alerte via l'API transactionnelle Brevo.
// Leve une erreur si Brevo repond autre chose que 2xx (geree
// par l'appelant, qui log et continue avec les autres abonnes).
// sectorName : nom humain du port le plus proche du depot (fourni par
// notifySectorSubscribers_), ou null si le depot est loin de tout port
// connu. Dans ce cas l'email reste honnete : "dans ton secteur".
function sendSectorAlertEmail_(email, sectorName, visiM, waterLabel) {
  var visiTxt = (isFinite(visiM) && visiM > 0) ? (visiM + ' m') : 'non pr\u00e9cis\u00e9e';
  var waterTxt = turbidityLabel_(waterLabel);

  var subject = sectorName
    ? 'Visimer - visibilit\u00e9 signal\u00e9e pr\u00e8s de ' + sectorName
    : 'Visimer - visibilit\u00e9 signal\u00e9e dans ton secteur';
  var spotTxt = sectorName
    ? 'pr\u00e8s de <strong>' + sectorName + '</strong>'
    : 'dans ton secteur';

  var htmlContent = ''
    + '<div style="background:#0A1520;padding:24px;font-family:Inter,Helvetica,Arial,sans-serif;">'
    +   '<div style="max-width:480px;margin:0 auto;background:#0F2438;border-radius:12px;padding:24px;">'
    +     '<p style="color:#4DD4A8;font-size:13px;letter-spacing:2px;margin:0 0 16px 0;text-transform:uppercase;">Visimer</p>'
    +     '<p style="color:#ffffff;font-size:16px;line-height:1.5;margin:0 0 16px 0;">'
    +       'Un chasseur vient de partager sa visibilit\u00e9 ' + spotTxt + '.'
    +     '</p>'
    +     '<p style="font-family:\'IBM Plex Mono\',monospace;color:#4DD4A8;font-size:28px;margin:0 0 4px 0;">' + visiTxt + '</p>'
    +     '<p style="color:#8FA6B8;font-size:14px;margin:0 0 20px 0;">' + waterTxt + '</p>'
    +     '<a href="https://visimer.fr" style="display:inline-block;background:#4DD4A8;color:#0A1520;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:8px;">Voir le secteur sur Visimer</a>'
    +     '<p style="color:#5C7285;font-size:12px;line-height:1.5;margin:24px 0 0 0;">'
    +       'Tu re\u00e7ois cet email car tu es abonn\u00e9 aux alertes de ce secteur (1 email maximum par jour). '
    +       'Pour te d\u00e9sinscrire, r\u00e9ponds STOP \u00e0 cet email.'
    +     '</p>'
    +   '</div>'
    + '</div>';

  var payload = {
    sender: ALERT_SENDER,
    to: [{ email: email }],
    subject: subject,
    htmlContent: htmlContent,
    replyTo: { email: 'contact@visimer.fr', name: 'Visimer' }
  };

  var response = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'api-key': BREVO_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Brevo HTTP ' + code + ' : '
      + response.getContentText().substring(0, 200));
  }
}

// Traduit le label d'eau du formulaire (Claire / Voilee / Chargee)
// en texte lisible pour l'email. Tolere les variantes d'accents.
function turbidityLabel_(label) {
  var l = String(label || '').toLowerCase();
  if (l.indexOf('clair') !== -1) return 'Eau claire';
  if (l.indexOf('voil') !== -1) return 'Eau voil\u00e9e';
  if (l.indexOf('charg') !== -1) return 'Eau charg\u00e9e';
  return label ? String(label) : 'Type d\'eau non pr\u00e9cis\u00e9';
}

// Test de bout en bout : abonne edouard@cobound.fr sur Luc-sur-Mer,
// remet le garde-fou a zero pour cet abonne, puis simule un depot
// de visi a Luc et declenche l'envoi Brevo.
// A lancer depuis l'editeur Apps Script apres deploiement.
function testSectorAlert() {
  var fake = {
    parameter: { email: 'edouard@cobound.fr', lat: '49.3219', lon: '-0.3556' }
  };
  var sub = submitSectorAlert_(fake);
  Logger.log('Abonnement test : ' + JSON.stringify(sub));

  // Reset du garde-fou pour permettre de relancer le test plusieurs fois
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('sector_alerts');
  if (sheet && sheet.getLastRow() > 1) {
    var rows = sheet.getDataRange().getValues();
    for (var r = 1; r < rows.length; r++) {
      if (String(rows[r][1]).trim().toLowerCase() === 'edouard@cobound.fr'
          && rows[r][2] === 'luc') {
        sheet.getRange(r + 1, 6).setValue('');
      }
    }
  }

  var result = notifySectorSubscribers_(49.3219, -0.3556, 5, 'Claire');
  Logger.log('Envoi test : ' + JSON.stringify(result));
  Logger.log('testSectorAlert termine - verifie la boite edouard@cobound.fr'
    + ' (expediteur contact@visimer.fr)');
}
