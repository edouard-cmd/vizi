"use strict";

var GAS_URL = 'https://script.google.com/macros/s/AKfycbxyjkavoaEJ6AdhK1MKzph68IH3ZKL8QadDGuU_GyzruxqUsXRv6nP9dJqenTCf6u7Z/exec';

// ============================================================
// ORIENTATION DE COTE - meme source que arome_scores.gs
// Retourne la normale sortante (vers le large) en degres
// ============================================================
var COAST_SEGMENTS = [
  ['Cote Opale',        50.3, 51.2,  1.3,  2.6,  300],
  ['Baie de Somme',     50.0, 50.4,  1.4,  1.8,  290],
  ['Cote Albatre',      49.5, 50.1,  0.0,  1.5,  330],
  ['Estuaire Seine',    49.3, 49.5, -0.1,  0.4,    0],
  ['Calvados',          49.2, 49.5, -1.2, -0.1,    0],
  ['Baie Seine O',      49.2, 49.5, -1.4, -1.1,   20],
  ['Cotentin E',        49.3, 49.7, -1.3, -1.1,   90],
  ['Cotentin N',        49.6, 49.8, -1.95,-1.2,    0],
  ['Cotentin O',        48.7, 49.6, -2.0, -1.5,  270],
  ['Mont St Michel',    48.5, 48.8, -2.0, -1.4,  300],
  ['Bretagne N est',    48.5, 48.8, -2.8, -2.0,    0],
  ['Bretagne N ouest',  48.5, 48.8, -4.8, -2.8,    0],
  ['Finistere O',       48.0, 48.6, -4.9, -4.4,  270],
  ['Pointe du Raz',     47.9, 48.1, -4.8, -4.5,  260],
  ['Bretagne S',        47.2, 48.0, -4.5, -2.0,  180],
  ['Loire Atlantique',  47.0, 47.4, -2.6, -1.8,  260],
  ['Vendee',            46.3, 47.0, -2.4, -1.4,  260],
  ['Ile de Re-Oleron',  45.7, 46.4, -1.6, -1.0,  270],
  ['Charente',          45.5, 45.9, -1.2, -0.7,  280],
  ['Gironde',           45.3, 45.7, -1.3, -0.8,  270],
  ['Cote Landes',       43.6, 45.3, -1.6, -1.0,  270],
  ['Pays Basque',       43.3, 43.6, -1.8, -1.4,  290],
  ['Pyrenees Or.',      42.4, 42.7,  3.0,  3.3,   90],
  ['Roussillon',        42.6, 42.9,  2.9,  3.2,  120],
  ['Languedoc',         43.0, 43.6,  3.0,  4.3,  180],
  ['Camargue',          43.3, 43.6,  4.3,  4.9,  180],
  ['Cote Bleue',        43.2, 43.5,  4.9,  5.4,  180],
  ['Marseille',         43.1, 43.4,  5.2,  5.5,  180],
  ['Calanques',         43.1, 43.3,  5.4,  5.8,  180],
  ['Toulon',            42.9, 43.2,  5.7,  6.3,  180],
  ['Hyeres',            42.9, 43.2,  6.0,  6.5,  180],
  ['Cote Maures',       43.0, 43.3,  6.2,  6.7,  170],
  ['Cote Esterel',      43.3, 43.6,  6.6,  7.0,  170],
  ['Cannes-Antibes',    43.4, 43.7,  6.9,  7.2,  180],
  ['Nice',              43.6, 43.8,  7.1,  7.4,  180],
  ['Menton',            43.7, 43.9,  7.4,  7.6,  180],
  ['Cap Corse E',       42.7, 43.1,  9.3,  9.6,   90],
  ['Cap Corse O',       42.7, 43.1,  9.1,  9.3,  270],
  ['Corse E',           41.6, 42.7,  9.3,  9.7,   90],
  ['Bonifacio',         41.3, 41.6,  9.1,  9.4,  180],
  ['Corse SO',          41.3, 41.7,  8.7,  9.2,  210],
  ['Corse O',           41.7, 42.7,  8.5,  9.0,  270]
];

function getCoastNormal(lat, lon) {
  var MARGIN = 0.2;
  var matching = [];
  for (var i = 0; i < COAST_SEGMENTS.length; i++) {
    var s = COAST_SEGMENTS[i];
    if (lat >= (s[1] - MARGIN) && lat <= (s[2] + MARGIN) &&
        lon >= (s[3] - MARGIN) && lon <= (s[4] + MARGIN)) {
      matching.push(s);
    }
  }
  if (matching.length === 0) matching = COAST_SEGMENTS;
  var best = null, bestDist = Infinity;
  for (var j = 0; j < matching.length; j++) {
    var seg = matching[j];
    var cLat = (seg[1] + seg[2]) / 2;
    var cLon = (seg[3] + seg[4]) / 2;
    var dLat = (lat - cLat) * 111;
    var dLon = (lon - cLon) * 111 * Math.cos(lat * Math.PI / 180);
    var d = Math.sqrt(dLat*dLat + dLon*dLon);
    if (d < bestDist) { bestDist = d; best = seg; }
  }
  return best ? best[5] : 270;
}

// Facteur direction base sur composante onshore reelle
// offshore pur -> 0.15 (protecteur) ; onshore pur -> 1.15 (amplificateur)
function getDirFactorForPoint(windDir, lat, lon) {
  if (windDir === null || windDir === undefined) return 1.0;
  var coastNormal = getCoastNormal(lat, lon);
  var windGoesTo = (windDir + 180) % 360;
  var angle = windGoesTo - coastNormal;
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  var offshoreFactor = Math.cos(angle * Math.PI / 180);
  var factor = 0.65 - offshoreFactor * 0.5;
  return Math.max(0.15, Math.min(1.15, factor));
}

var SPOTS = [
  { id:'dunkerque', name:'Dunkerque', lat:51.0500, lon:2.3667, region:'Manche' },
  { id:'calais', name:'Calais', lat:50.9667, lon:1.8500, region:'Manche' },
  { id:'boulogne', name:'Boulogne-sur-Mer', lat:50.7333, lon:1.6000, region:'Manche' },
  { id:'dieppe', name:'Dieppe', lat:49.9333, lon:1.0833, region:'Manche' },
  { id:'le_havre', name:'Le Havre', lat:49.4833, lon:0.1000, region:'Manche' },
  { id:'ouistreham', name:'Ouistreham', lat:49.2836, lon:-0.2492, region:'Manche' },
  { id:'courseulles', name:'Courseulles-sur-Mer', lat:49.3367, lon:-0.4600, region:'Manche' },
  { id:'port_bessin', name:'Port-en-Bessin', lat:49.3456, lon:-0.7547, region:'Manche' },
  { id:'grandcamp', name:'Grandcamp-Maisy', lat:49.3878, lon:-1.0428, region:'Manche' },
  { id:'isigny', name:'Isigny-sur-Mer', lat:49.3217, lon:-1.1003, region:'Manche' },
  { id:'cherbourg', name:'Cherbourg', lat:49.6500, lon:-1.6167, region:'Manche' },
  { id:'carteret', name:'Carteret', lat:49.3667, lon:-1.7833, region:'Manche' },
  { id:'granville', name:'Granville', lat:48.8333, lon:-1.5833, region:'Manche' },
  { id:'saint_malo', name:'Saint-Malo', lat:48.6500, lon:-2.0167, region:'Manche' },
  { id:'cancale', name:'Cancale', lat:48.6750, lon:-1.8533, region:'Manche' },
  { id:'saint_brieuc', name:'Saint-Brieuc', lat:48.5500, lon:-2.7333, region:'Bretagne' },
  { id:'paimpol', name:'Paimpol', lat:48.7833, lon:-3.0500, region:'Bretagne' },
  { id:'morlaix', name:'Morlaix', lat:48.5833, lon:-3.8333, region:'Bretagne' },
  { id:'brest', name:'Brest', lat:48.3833, lon:-4.4833, region:'Bretagne' },
  { id:'camaret', name:'Camaret-sur-Mer', lat:48.2833, lon:-4.5833, region:'Bretagne' },
  { id:'douarnenez', name:'Douarnenez', lat:48.0833, lon:-4.3333, region:'Bretagne' },
  { id:'audierne', name:'Audierne', lat:48.0167, lon:-4.5333, region:'Bretagne' },
  { id:'concarneau', name:'Concarneau', lat:47.8667, lon:-3.9167, region:'Bretagne' },
  { id:'lorient', name:'Lorient', lat:47.7500, lon:-3.3667, region:'Bretagne' },
  { id:'belle_ile', name:'Belle-Ile-en-Mer', lat:47.3167, lon:-3.1667, region:'Bretagne' },
  { id:'vannes', name:'Vannes', lat:47.6667, lon:-2.7500, region:'Bretagne' },
  { id:'saint_nazaire', name:'Saint-Nazaire', lat:47.2667, lon:-2.2000, region:'Atlantique' },
  { id:'noirmoutier', name:'Noirmoutier', lat:47.0000, lon:-2.2500, region:'Atlantique' },
  { id:'les_sables', name:"Les Sables-d Olonne", lat:46.4833, lon:-1.7833, region:'Atlantique' },
  { id:'la_rochelle', name:'La Rochelle', lat:46.1500, lon:-1.1500, region:'Atlantique' },
  { id:'rochefort', name:'Rochefort', lat:45.9500, lon:-0.9500, region:'Atlantique' },
  { id:'royan', name:'Royan', lat:45.6167, lon:-1.0333, region:'Atlantique' },
  { id:'bordeaux', name:'Bordeaux', lat:44.8500, lon:-0.5667, region:'Atlantique' },
  { id:'arcachon', name:'Arcachon', lat:44.6500, lon:-1.1667, region:'Atlantique' },
  { id:'capbreton', name:'Capbreton', lat:43.6500, lon:-1.4333, region:'Atlantique' },
  { id:'bayonne', name:'Bayonne', lat:43.4833, lon:-1.4667, region:'Atlantique' },
  { id:'port_vendres', name:'Port-Vendres', lat:42.5167, lon:3.1000, region:'Mediterranee' },
  { id:'sete', name:'Sete', lat:43.4000, lon:3.6833, region:'Mediterranee' },
  { id:'marseille', name:'Marseille', lat:43.2967, lon:5.3811, region:'Mediterranee' },
  { id:'toulon', name:'Toulon', lat:43.1167, lon:5.9333, region:'Mediterranee' },
  { id:'nice', name:'Nice', lat:43.7000, lon:7.2667, region:'Mediterranee' },
  { id:'ajaccio', name:'Ajaccio', lat:41.9167, lon:8.7333, region:'Mediterranee' },
  { id:'bastia', name:'Bastia', lat:42.7000, lon:9.4500, region:'Mediterranee' }
];

var API_MAREE_SITES = {
  'dunkerque': 'dunkerque', 'calais': 'calais', 'boulogne': 'boulogne-sur-mer',
  'dieppe': 'dieppe', 'le_havre': 'le-havre', 'ouistreham': 'ouistreham',
  'courseulles': 'courseulles-sur-mer', 'port_bessin': 'port-en-bessin',
  'grandcamp': 'grandcamp', 'isigny': 'grandcamp', 'cherbourg': 'cherbourg',
  'carteret': 'carteret', 'granville': 'granville', 'saint_malo': 'saint-malo',
  'cancale': 'cancale', 'saint_brieuc': 'baie-de-saint-brieuc-le-legue',
  'paimpol': 'paimpol', 'morlaix': 'baie-de-morlaix-carantec', 'brest': 'brest',
  'camaret': 'camaret-sur-mer', 'douarnenez': 'douarnenez', 'audierne': 'audierne',
  'concarneau': 'concarneau', 'lorient': 'lorient', 'belle_ile': 'belle-ile-le-palais',
  'vannes': 'vannes', 'saint_nazaire': 'saint-nazaire',
  'noirmoutier': 'noirmoutier-l-herbaudiere', 'les_sables': 'les-sables-d-olonne',
  'la_rochelle': 'la-rochelle-pallice', 'rochefort': 'la-rochelle-pallice',
  'royan': 'royan', 'bordeaux': 'bordeaux', 'arcachon': 'cap-ferret',
  'capbreton': 'boucau-bayonne-biarritz', 'bayonne': 'boucau-bayonne-biarritz',
  'port_vendres': null, 'sete': null, 'marseille': null, 'toulon': null,
  'nice': null, 'ajaccio': null, 'bastia': null
};

function findApiMareeSiteNear(lat, lon) {
  var best = null, minD = Infinity;
  SPOTS.forEach(function(s) {
    var siteId = API_MAREE_SITES[s.id];
    if (!siteId) return;
    var d = Math.hypot(s.lat - lat, s.lon - lon);
    if (d < minD) { minD = d; best = { siteId: siteId, name: s.name, spot: s }; }
  });
  return best;
}

function marnageToTideLabel(marnageMeters) {
  if (marnageMeters >= 8.0) return { label: 'Grande maree', color: '#DC2626', desc: 'Etales tres courtes, courants forts' };
  if (marnageMeters >= 6.0) return { label: 'Vive-eau', color: '#EA580C', desc: 'Bon creneau aux etales' };
  if (marnageMeters >= 4.0) return { label: 'Maree moyenne', color: '#CA8A04', desc: 'Etales confortables' };
  if (marnageMeters >= 2.5) return { label: 'Morte-eau', color: '#16A34A', desc: 'Longues etales, peu de courant' };
  return { label: 'Tres petite maree', color: '#0BA888', desc: 'Quasi-etale permanente' };
}

var VIS = [
  {v:0, l:'0m', c:'#DC2626'},
  {v:0.5, l:'0.5m', c:'#EA580C'},
  {v:1, l:'1m', c:'#E89038'},
  {v:2, l:'2m', c:'#CA8A04'},
  {v:3, l:'3m', c:'#A0D840'},
  {v:4, l:'4m', c:'#16A34A'},
  {v:5, l:'5m', c:'#0BA888'},
  {v:8, l:'8m', c:'#00B8E8'},
  {v:10, l:'+10m', c:'#0090E8'}
];

var S = {
  map: null, day: 0,
  showHeatmap: false, showIso: true, showSed: false,
  isoDeep: null, isoShom: null, sedLayer: null,
  spotMarkers: {}, clickMarker: null, clickLatLng: null,
  canvas: null, ctx: null, _spotDepth: 5
};

var S_forecastOpen = false;
var S_windUnit = 'kmh';
var S_lastForecastData = null;
var S_gridScores = [];
var S_gridUpdatedAt = null;
var S_spotWeatherCache = null;
var S_spotMarineCache = null;
var S_spotSunCache = null;
var S_hexLayer = null;
var S_zones = [];
var S_zoneScores = {};
var S_zoneLayer = null;

var VIZI_ZONES_DATA = {
  "type": "FeatureCollection",
  "features": [
    {"type":"Feature","properties":{"id":"zone_1","name":"Zone 1","subtitle":"Est - vers Deauville","region":"Calvados","coast_orientation":340,"avg_depth_coastal":6,"bottom_type":"sable fin","major_estuary":"Seine","turbidity_base":0.55,"sample_lat":49.35,"sample_lon":-0.32},"geometry":{"type":"Polygon","coordinates":[[[-0.24741890307157632,49.29245719937151],[-0.22356324463922306,49.33106400832648],[-0.42013511798674585,49.381265974197674],[-0.4575832617753406,49.33681114515545],[-0.4059502421845309,49.33591153635476],[-0.3834858072924874,49.330775422049925],[-0.3434869966649501,49.316776299444626],[-0.3410595137328869,49.31461036744713],[-0.30304143383938253,49.299206999294086],[-0.26917709790498634,49.291538164047864],[-0.24741890307157632,49.29245719937151]]]}},
    {"type":"Feature","properties":{"id":"zone_2","name":"Zone 2","subtitle":"Cote de Nacre Est","region":"Calvados","coast_orientation":0,"avg_depth_coastal":7,"bottom_type":"sable et graviers","major_estuary":"Orne","turbidity_base":0.45,"sample_lat":49.35,"sample_lon":-0.54},"geometry":{"type":"Polygon","coordinates":[[[-0.457297537827543,49.337543479713304],[-0.4192907724114434,49.381527442119136],[-0.6406475842775876,49.36117060500371],[-0.6435313981352522,49.34527649396043],[-0.6394118469661976,49.345139443820415],[-0.633093319968566,49.342179806604804],[-0.6253030942371822,49.340709627845484],[-0.6005234802087216,49.33992917556256],[-0.5842864200435827,49.34204518115192],[-0.5573377555286072,49.34600688287435],[-0.5288690316651241,49.345556782424694],[-0.5082778332887017,49.34447635438639],[-0.4695482114503875,49.338064746025424],[-0.457297537827543,49.337543479713304]]]}},
    {"type":"Feature","properties":{"id":"zone_3","name":"Zone 3","subtitle":"Cote de Nacre Ouest","region":"Calvados","coast_orientation":0,"avg_depth_coastal":8,"bottom_type":"sable et graviers","major_estuary":"Seulles","turbidity_base":0.4,"sample_lat":49.36,"sample_lon":-0.80},"geometry":{"type":"Polygon","coordinates":[[[-0.6407678181430185,49.36117717342512],[-0.8022024657408906,49.386047256781296],[-0.9862733695584041,49.41798664584795],[-0.9896144876017559,49.398920949729444],[-0.9892205161416427,49.39866458445968],[-0.9890410925326876,49.39780231470613],[-0.9827757923382592,49.395495563624166],[-0.9820239406449502,49.39572858668211],[-0.9785868744521906,49.395542165597845],[-0.9762956872056634,49.39523924826804],[-0.9726789895781849,49.3959849258699],[-0.9695483518924561,49.397542825251264],[-0.9467111493807181,49.39647318017984],[-0.9256304940726636,49.39275315964528],[-0.9186478594006076,49.39010913349367],[-0.9187300224850503,49.387300925777794],[-0.9036002664977616,49.379868416059566],[-0.8787422476523261,49.37063542971552],[-0.8446812504164427,49.36106921671259],[-0.8182878571120682,49.356674401312375],[-0.818287477433671,49.35636429734157],[-0.80049049235447,49.354813297339064],[-0.7955491411271964,49.35361138397431],[-0.7937638472603794,49.35392153876805],[-0.786234479765227,49.353378744043255],[-0.7616983271053925,49.35039420471659],[-0.7589315357299427,49.35316635556853],[-0.7571457682754215,49.35334084115834],[-0.7560743078041128,49.35233269365264],[-0.754437354305054,49.351789836437234],[-0.7538123356964661,49.3507816571439],[-0.7543181801536605,49.349482888715926],[-0.7515163288101974,49.34960985538157],[-0.7238292183796773,49.346775936770086],[-0.712979540199683,49.34780949626125],[-0.7094994597751736,49.34780949626125],[-0.7070429324170959,49.34794285799569],[-0.7040746285268256,49.3477094747233],[-0.7021810553553394,49.34684261287586],[-0.6992127514640458,49.3467759305625],[-0.6954767295106308,49.347542733367334],[-0.6910754513276345,49.34737602978697],[-0.6861623966124455,49.34637579644385],[-0.6779227944320212,49.34650916206451],[-0.6766433531005589,49.34650916206451],[-0.6749033128883184,49.3462424304617],[-0.6742891810482945,49.34647582069314],[-0.6709114559316731,49.346042380810815],[-0.6695808369457836,49.34627577199123],[-0.6677384414277014,49.34614240573791],[-0.660061793433897,49.345642279068585],[-0.6494168415497938,49.346709209817845],[-0.6476768013375818,49.345842330346244],[-0.6436337667274756,49.34527551628014],[-0.6407678181430185,49.36117717342512]]]}},
    {"type":"Feature","properties":{"id":"zone_4","name":"Zone 4","subtitle":"Bessin Est","region":"Calvados","coast_orientation":355,"avg_depth_coastal":10,"bottom_type":"roche et graviers","major_estuary":null,"turbidity_base":0.3,"sample_lat":49.40,"sample_lon":-1.05},"geometry":{"type":"Polygon","coordinates":[[[-0.9899047717728138,49.39812680402966],[-0.9862869010529494,49.417988138691584],[-1.1499280181498364,49.43818405886378],[-1.1688693998247288,49.41071557213516],[-1.0715738562880972,49.39099702645325],[-1.0534218556457802,49.39073281415338],[-1.0499004553140026,49.39240769753829],[-1.0417726275225618,49.39099736575801],[-1.0072301958490186,49.39708017572417],[-0.9954560695780117,49.395315843974146],[-0.9899047717728138,49.39812680402966]]]}},
    {"type":"Feature","properties":{"id":"zone_5","name":"Zone 5","subtitle":"Bessin Ouest","region":"Calvados","coast_orientation":350,"avg_depth_coastal":9,"bottom_type":"roche, graviers, sable","major_estuary":null,"turbidity_base":0.32,"sample_lat":49.38,"sample_lon":-1.15},"geometry":{"type":"Polygon","coordinates":[[[-1.169092866716312,49.410510808512214],[-1.1633317625099835,49.404296003030964],[-1.1640898025368642,49.399264393809034],[-1.1596929453070572,49.39008781228512],[-1.1592377291086677,49.38357462879074],[-1.1643930185477416,49.37913280104098],[-1.172427085520951,49.3775540791228],[-1.1747009956905572,49.37370454716586],[-1.1765219103782272,49.36610188661544],[-1.1836475243142104,49.362942390859644],[-1.1715196641985983,49.35711548079681],[-1.1598452548608122,49.35780707489545],[-1.1562061959178322,49.3624488892095],[-1.1389229137148504,49.35840093855856],[-1.1363456639733727,49.35445134359114],[-1.1169407469930093,49.35494725069873],[-1.1201242479114342,49.35810667873781],[-1.1201242479114342,49.36067381806359],[-1.0829804835084076,49.38633818994512],[-1.0719130991118107,49.39097640221283],[-1.169092866716312,49.410510808512214]]]}},
    {"type":"Feature","properties":{"id":"zone_6","name":"Zone 6","subtitle":"Cotentin Est","region":"Manche","coast_orientation":70,"avg_depth_coastal":12,"bottom_type":"roche et sable","major_estuary":null,"turbidity_base":0.28,"sample_lat":49.55,"sample_lon":-1.25},"geometry":{"type":"Polygon","coordinates":[[[-1.1690808316828623,49.410780022225566],[-1.150207191294129,49.438583482591525],[-1.189660256332445,49.60319748266073],[-1.2284295280162212,49.605962080736106],[-1.253678499796905,49.61311222542102],[-1.2664825483305435,49.593058865076756],[-1.2636369897311965,49.58591080439871],[-1.2650392942995268,49.584006068820884],[-1.2717570912295173,49.57761785532952],[-1.2736375156544,49.573436241388094],[-1.272428910839949,49.571257710331395],[-1.2727871943704656,49.570851100125964],[-1.2740859690945285,49.57151911501697],[-1.2763698662877516,49.573145587695564],[-1.2755184047545356,49.57459779995864],[-1.2752054524636947,49.57779207686059],[-1.2736381596876072,49.578169623662035],[-1.273638160654997,49.579273120448846],[-1.2712645009288792,49.57915696408983],[-1.2680399025243219,49.582641510116275],[-1.2769244600047216,49.58624950458366],[-1.2852232186953358,49.58732551415963],[-1.2974264678672967,49.582071513741994],[-1.3048446503644016,49.572828822252575],[-1.309348139193645,49.549671418414164],[-1.3053100330543828,49.53828841254571],[-1.2574712635448009,49.48662877797659],[-1.1690808316828623,49.410780022225566]]]}}
  ]
};

function gasGet(action, params) {
  params = params || {};
  var url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  Object.keys(params).forEach(function(k){ url.searchParams.set(k, params[k]); });
  return fetch(url.toString()).then(function(r){ return r.json(); }).catch(function(e){ return null; });
}

function toKt(kmh) { return Math.round(kmh * 0.539957); }

function fetchRealDepth(lat, lon) {
  var cacheKey = 'vizi_depth_' + lat.toFixed(3) + '_' + lon.toFixed(3);
  try {
    var cached = localStorage.getItem(cacheKey);
    if (cached) {
      var obj = JSON.parse(cached);
      return Promise.resolve(obj.depth);
    }
  } catch(e) {}
  var url = 'https://rest.emodnet-bathymetry.eu/depth/point?geom=POINT(' + lon + ' ' + lat + ')';
  return fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && typeof data.avg === 'number') {
        var depth = Math.abs(data.avg);
        if (depth > 0 && depth < 1000) {
          try { localStorage.setItem(cacheKey, JSON.stringify({ depth: depth })); } catch(e) {}
          return depth;
        }
      }
      return null;
    })
    .catch(function() { return null; });
}

function haversineM(lat1, lon1, lat2, lon2) {
  var R = 6371000;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function estimateDistanceToCoast(lat, lon) {
  var minDist = Infinity;
  if (!VIZI_ZONES_DATA || !VIZI_ZONES_DATA.features) return 500;
  VIZI_ZONES_DATA.features.forEach(function(zone) {
    var coords = zone.geometry.coordinates[0];
    for (var i = 0; i < coords.length - 1; i++) {
      var d = haversineM(lat, lon, coords[i][1], coords[i][0]);
      if (d < minDist) minDist = d;
    }
  });
  return minDist === Infinity ? 500 : minDist;
}

function isMobile() { return window.innerWidth <= 768; }

function toggleSedLegend() {
  var b = document.getElementById('sedLegendBody');
  var a = document.getElementById('sedLegendArrow');
  var open = b.style.display !== 'none';
  b.style.display = open ? 'none' : 'block';
  a.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
}

function toggleWindUnit() {
  S_windUnit = S_windUnit === 'kmh' ? 'kt' : 'kmh';
  var btn = document.getElementById('windUnitToggle');
  if (btn) {
    btn.textContent = S_windUnit === 'kmh' ? 'km/h' : 'noeuds';
    btn.style.color = S_windUnit === 'kt' ? '#A8E63D' : 'rgba(255,255,255,0.7)';
    btn.style.borderColor = S_windUnit === 'kt' ? '#A8E63D' : 'rgba(255,255,255,0.15)';
  }
  if (S_lastForecastData) renderForecastTable(S_lastForecastData.h, S_lastForecastData.now);
  if (S_spotWeatherCache) renderSpotPopup();
}

function initCanvas() {
  S.canvas = document.getElementById('heatmapCanvas');
  S.ctx = S.canvas.getContext('2d');
  S.canvas.width = window.innerWidth;
  S.canvas.height = window.innerHeight;
  window.addEventListener('resize', function(){
    S.canvas.width = window.innerWidth;
    S.canvas.height = window.innerHeight;
  });
}

function initMap() {
  S.map = L.map('map', { center:[49.32, -0.55], zoom:11, zoomControl:true });

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Imagery Esri | SHOM | EMODnet', maxZoom: 19
  }).addTo(S.map);

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    attribution: '', maxZoom: 19, opacity: 0.45
  }).addTo(S.map);

  S.isoDeep = L.tileLayer.wms('https://ows.emodnet-bathymetry.eu/wms', {
    layers: 'emodnet:contours', format: 'image/png', transparent: true,
    version: '1.3.0', attribution: 'Isobathes EMODnet', opacity: 0.9, maxZoom: 19
  });
  S.isoShom = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
    attribution: 'Signalisation OpenSeaMap', opacity: 0.95, maxZoom: 19
  });
  S.sedLayer = L.tileLayer.wms('https://services.data.shom.fr/INSPIRE/wms/v', {
    layers: 'NDF_BDD_WLD_WGS84G_WMS', format: 'image/png', transparent: true,
    version: '1.3.0', attribution: 'Nature du fond SHOM', opacity: 0.75, maxZoom: 19
  });

  S.isoDeep.addTo(S.map);
  S.isoShom.addTo(S.map);

  S.map.on('zoomend', function() {
    var zoom = S.map.getZoom();
    if (!S.showIso) return;
    if (zoom <= 9) {
      if (!S.map.hasLayer(S.isoDeep)) S.isoDeep.addTo(S.map);
      if (S.map.hasLayer(S.isoShom)) S.map.removeLayer(S.isoShom);
      S.isoDeep.setOpacity(0.9);
    } else if (zoom <= 11) {
      if (!S.map.hasLayer(S.isoDeep)) S.isoDeep.addTo(S.map);
      if (!S.map.hasLayer(S.isoShom)) S.isoShom.addTo(S.map);
      S.isoDeep.setOpacity(0.7);
      S.isoShom.setOpacity(0.9);
    } else {
      if (!S.map.hasLayer(S.isoDeep)) S.isoDeep.addTo(S.map);
      if (!S.map.hasLayer(S.isoShom)) S.isoShom.addTo(S.map);
      S.isoDeep.setOpacity(0.3);
      S.isoShom.setOpacity(1.0);
    }
  });

  var regionColors = { 'Manche':'#0BA888', 'Bretagne':'#16A34A', 'Atlantique':'#E8A838', 'Mediterranee':'#DC2626' };

  SPOTS.forEach(function(spot) {
    var color = regionColors[spot.region] || '#3A5A78';
    var m = L.circleMarker([spot.lat, spot.lon], {
      radius: 7, fillColor: color, color: 'rgba(0,0,0,0.45)', weight: 1.5, fillOpacity: 0.88
    }).addTo(S.map);
    m.bindTooltip('<b>' + spot.name + '</b><br><span style="color:' + color + ';font-size:11px">' + spot.region + '</span>', {
      permanent: false, direction: 'top', className: 'visim-tooltip', offset: [0, -8]
    });
    m.on('click', function(e) {
      L.DomEvent.stopPropagation(e);
      openSpotPopup(L.latLng(spot.lat, spot.lon), spot.name);
      if (S_forecastOpen) loadForecast(spot.lat, spot.lon, spot.name);
    });
    S.spotMarkers[spot.id] = m;
  });

  S.map.on('click', function(e) {
    isOnSea(e.latlng.lat, e.latlng.lng, function(onSea) {
      if (!onSea) { showLandMessage(e.latlng); return; }
      openSpotPopup(e.latlng, null);
      if (S_forecastOpen) loadForecast(e.latlng.lat, e.latlng.lng, null);
    });
  });
}

function toggleLayer(type) {
  if (type === 'heatmap') {
    S.showHeatmap = !S.showHeatmap;
    document.getElementById('btnHeatmap').classList.toggle('active', S.showHeatmap);
    if (S.showHeatmap) showHexLayer(); else hideHexLayer();
  } else if (type === 'iso') {
    S.showIso = !S.showIso;
    document.getElementById('btnIso').classList.toggle('active', S.showIso);
    if (S.showIso) {
      S.isoDeep.addTo(S.map);
      S.isoShom.addTo(S.map);
      S.map.fire('zoomend');
    } else {
      if (S.map.hasLayer(S.isoDeep)) S.map.removeLayer(S.isoDeep);
      if (S.map.hasLayer(S.isoShom)) S.map.removeLayer(S.isoShom);
    }
  } else if (type === 'sed') {
    S.showSed = !S.showSed;
    document.getElementById('btnSed').classList.toggle('active', S.showSed);
    document.getElementById('sedLegend').style.display = S.showSed ? 'block' : 'none';
    if (S.showSed) { S.sedLayer.addTo(S.map); }
    else { if (S.map.hasLayer(S.sedLayer)) S.map.removeLayer(S.sedLayer); }
  }
}

function scoreToColor(score) {
  if (score < 20) return '#0BA888';
  if (score < 35) return '#16A34A';
  if (score < 50) return '#A0D840';
  if (score < 65) return '#CA8A04';
  if (score < 80) return '#EA580C';
  return '#DC2626';
}

function scoreToLabel(score) {
  if (score < 20) return '+8m';
  if (score < 35) return '4-8m';
  if (score < 50) return '2-4m';
  if (score < 65) return '1-2m';
  if (score < 80) return '1m';
  return '<1m';
}

function showHexLayer() {
  if (S_zoneLayer) return;
  loadZonesAndCompute();
}

function loadZonesAndCompute() {
  S_zones = VIZI_ZONES_DATA.features;
  renderZonesPending();
  computeZoneScores();
}

function renderZonesPending() {
  if (S_zoneLayer) { S.map.removeLayer(S_zoneLayer); S_zoneLayer = null; }
  var layers = [];
  S_zones.forEach(function(zone) {
    var poly = L.geoJSON(zone, {
      style: { fillColor: '#888', fillOpacity: 0.3, color: '#aaa', weight: 1.5, interactive: false }
    });
    layers.push(poly);
  });
  S_zoneLayer = L.featureGroup(layers).addTo(S.map);
}

function getCachedWeather(key) {
  try {
    var raw = localStorage.getItem('vizi_weather_' + key);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (Date.now() - obj.ts > 3600000) return null;
    return obj.data;
  } catch(e) { return null; }
}

function setCachedWeather(key, data) {
  try {
    localStorage.setItem('vizi_weather_' + key, JSON.stringify({ ts: Date.now(), data: data }));
  } catch(e) {}
}

function computeZoneScores() {
  S_zoneScores = {};
  var promises = S_zones.map(function(zone, i) {
    return computeOneZone(zone).then(function(result) {
      S_zoneScores[zone.properties.id] = result;
      renderZonesColored();
    });
  });
  Promise.all(promises).then(function() { renderZonesColored(); });
}

function computeOneZone(zone) {
  var props = zone.properties;
  var lat = props.sample_lat;
  var lon = props.sample_lon;
  var cacheKey = 'z_' + props.id;
  var cached = getCachedWeather(cacheKey);
  if (cached) return Promise.resolve(cached);
  var url = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + lat + '&longitude=' + lon
    + '&hourly=windspeed_10m,windgusts_10m,winddirection_10m,wave_height,precipitation'
    + '&wind_speed_unit=kmh&timezone=Europe/Paris&forecast_days=1&past_days=2'
    + '&models=meteofrance_arome_france';
  return fetch(url).then(function(r) { return r.json(); }).then(function(data) {
    var now = new Date();
    var h = data.hourly;
    var idx = 0;
    if (h && h.time) {
      var nowStr = now.toISOString().slice(0, 13);
      for (var t = 0; t < h.time.length; t++) {
        if (h.time[t].slice(0, 13) === nowStr) { idx = t; break; }
      }
    }
    var wind = h.windspeed_10m ? (h.windspeed_10m[idx] || 0) : 0;
    var gusts = h.windgusts_10m ? (h.windgusts_10m[idx] || 0) : 0;
    var dir = h.winddirection_10m ? (h.winddirection_10m[idx] || 0) : 0;
    var wave = h.wave_height ? (h.wave_height[idx] || 0) : 0;
    var rain = h.precipitation ? (h.precipitation[idx] || 0) : 0;
    var score = computeZoneScore(wind, gusts, dir, wave, rain, props, h, idx, lat, lon);
    var result = { score: score, wind: Math.round(wind), gusts: Math.round(gusts), dir: Math.round(dir), wave: wave, label: scoreToLabel(score) };
    setCachedWeather(cacheKey, result);
    return result;
  }).catch(function() {
    return { score: 50, wind: 0, gusts: 0, dir: 0, wave: 0, label: 'N/A' };
  });
}

function computeZoneScore(wind, gusts, dir, wave, rain, props, h, idx, lat, lon) {
  var depth = props.avg_depth_coastal || 8;
  var turbBase = props.turbidity_base || 0.4;
  var bathyFactor = depth <= 3 ? 3.5 : depth <= 6 ? 2.5 : depth <= 10 ? 1.8 : depth <= 15 ? 1.3 : 1.0;
  var dirFactor = getDirFactorForPoint(dir, lat, lon);
  var decayHours = depth <= 5 ? 72 : depth <= 10 ? 48 : 24;
  var residualPenalty = 0;
  if (h && h.windspeed_10m && idx > 0) {
    var start = Math.max(0, idx - decayHours);
    for (var i = start; i < idx; i++) {
      var pw = h.windspeed_10m[i] || 0;
      var pg = h.windgusts_10m[i] || 0;
      var pd = h.winddirection_10m ? (h.winddirection_10m[i] || 0) : dir;
      var pDirF = getDirFactorForPoint(pd, lat, lon);
      var pImpact = (Math.max(pw - 5, 0) / 20 * 55 + Math.max(pg - 10, 0) / 25 * 30) * pDirF;
      var hoursAgo = idx - i;
      var decay = Math.exp(-hoursAgo / (decayHours / 3));
      residualPenalty = Math.max(residualPenalty, pImpact * decay);
    }
  }
  var windPenalty = Math.min(Math.max(wind - 5, 0) / 20, 1) * 55 * dirFactor;
  var gustPenalty = Math.min(Math.max(gusts - 10, 0) / 25, 1) * 30 * dirFactor;
  var wavePenalty = Math.min(wave / 1.2, 1) * 35;
  var rainPenalty = Math.min(rain / 3, 1) * 10;
  var instantPenalty = windPenalty + gustPenalty;
  var combined = Math.max(instantPenalty, residualPenalty) + wavePenalty + rainPenalty;
  var total = Math.min(combined * bathyFactor * (0.7 + turbBase), 100);
  var score = Math.max(0, Math.min(100, total));
  return Math.round(score);
}

function renderZonesColored() {
  if (S_zoneLayer) { S.map.removeLayer(S_zoneLayer); S_zoneLayer = null; }
  var layers = [];
  S_zones.forEach(function(zone) {
    var props = zone.properties;
    var zs = S_zoneScores[props.id];
    var fillColor, fillOp;
    if (zs) { fillColor = scoreToColor(zs.score); fillOp = 0.55; }
    else { fillColor = '#888'; fillOp = 0.3; }
    var poly = L.geoJSON(zone, {
      style: { fillColor: fillColor, fillOpacity: fillOp, color: fillColor, weight: 2, interactive: true }
    });
    if (zs) {
      poly.bindTooltip(
        '<b>' + props.name + '</b><br>' +
        '<span style="font-family:IBM Plex Mono,monospace;font-size:11px">' + props.subtitle + '</span><br>' +
        '<span style="color:' + fillColor + ';font-weight:700">' + zs.label + '</span> - vent ' + zs.wind + ' km/h',
        { sticky: true, direction: 'top' }
      );
    } else {
      poly.bindTooltip('<b>' + props.name + '</b><br>Chargement...', { sticky: true });
    }
    layers.push(poly);
  });
  S_zoneLayer = L.featureGroup(layers).addTo(S.map);
}

function hideHexLayer() {
  if (S_zoneLayer) { S.map.removeLayer(S_zoneLayer); S_zoneLayer = null; }
  if (S_hexLayer) { S.map.removeLayer(S_hexLayer); S_hexLayer = null; }
}

function toggleForecastPanel() {
  S_forecastOpen = !S_forecastOpen;
  document.getElementById('btnWind').classList.toggle('active', S_forecastOpen);
  document.getElementById('forecastPanel').style.display = S_forecastOpen ? 'block' : 'none';
}

function closeForecast() {
  S_forecastOpen = false;
  document.getElementById('btnWind').classList.remove('active');
  document.getElementById('forecastPanel').style.display = 'none';
}

function loadForecast(lat, lon, locationName) {
  S_forecastOpen = true;
  document.getElementById('btnWind').classList.add('active');
  document.getElementById('forecastPanel').style.display = 'block';
  document.getElementById('forecastLocation').textContent = locationName || (lat.toFixed(4) + ', ' + lon.toFixed(4));
  document.getElementById('forecastCoords').textContent = lat.toFixed(4) + 'N ' + lon.toFixed(4) + 'E - AROME';
  document.getElementById('forecastTable').innerHTML = '<div style="padding:18px;text-align:center;color:#94A3B8;font-family:IBM Plex Mono,monospace;font-size:10px;">Chargement AROME...</div>';
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&hourly=windspeed_10m,winddirection_10m,windgusts_10m,wave_height,wave_period,wave_direction,temperature_2m,precipitation&wind_speed_unit=kmh&timezone=Europe/Paris&past_days=0&forecast_days=5&models=meteofrance_arome_france';
  fetch(url).then(function(r){ return r.json(); }).then(function(d) {
    if (!d.hourly) throw new Error('Pas de donnees');
    S_lastForecastData = { h: d.hourly, now: new Date() };
    renderForecastTable(d.hourly, new Date());
  }).catch(function(e) {
    document.getElementById('forecastTable').innerHTML = '<div style="padding:18px;color:#DC2626;font-family:IBM Plex Mono,monospace;font-size:10px;">Erreur : ' + e.message + '</div>';
  });
}

function renderForecastTable(h, now) {
  var times = h.time;
  var nowHour = now.toISOString().slice(0, 13);
  var cols = [];
  times.forEach(function(t, i) {
    if (parseInt(t.slice(11, 13)) % 3 === 0) {
      cols.push({ i: i, t: t, isNow: t.slice(0, 13) === nowHour });
    }
  });
  var days = {};
  cols.forEach(function(c) {
    var day = c.t.slice(0, 10);
    if (!days[day]) days[day] = [];
    days[day].push(c);
  });
  function windColor(v) {
    if (!v) return 'wc-0'; if (v < 5) return 'wc-0'; if (v < 10) return 'wc-1';
    if (v < 15) return 'wc-2'; if (v < 20) return 'wc-3'; if (v < 30) return 'wc-4';
    if (v < 40) return 'wc-5'; if (v < 50) return 'wc-6'; return 'wc-7';
  }
  function waveColor(v) {
    if (!v) return 'ww-0'; if (v < 0.5) return 'ww-0'; if (v < 1) return 'ww-1';
    if (v < 2) return 'ww-2'; if (v < 3) return 'ww-3'; return 'ww-4';
  }
  function dirArrow(deg) {
    if (deg === null || deg === undefined) return '-';
    var arrows = ['N','NE','E','SE','S','SO','O','NO'];
    return arrows[Math.round(deg / 45) % 8];
  }
  var unitLabel = S_windUnit === 'kt' ? 'noeuds' : 'km/h';
  var conv = S_windUnit === 'kt' ? function(v) { return toKt(v); } : function(v) { return Math.round(v); };
  var html = '<table class="wg-table"><thead><tr><td class="row-label day-header"></td>';
  Object.keys(days).forEach(function(day) {
    var dcols = days[day];
    var date = new Date(day);
    var label = date.toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short' });
    html += '<td colspan="' + dcols.length + '" class="day-header">' + label + '</td>';
  });
  html += '</tr><tr><td class="row-label hour-row">Heure</td>';
  cols.forEach(function(c) {
    html += '<td class="hour-row' + (c.isNow ? ' wg-now wg-now-header' : '') + '">' + c.t.slice(11, 16) + '</td>';
  });
  html += '</tr></thead><tbody>';
  html += '<tr><td class="row-label">Vent (' + unitLabel + ')</td>';
  cols.forEach(function(c) {
    var raw = h.windspeed_10m[c.i] || 0;
    html += '<td class="' + windColor(raw) + (c.isNow ? ' wg-now' : '') + '" style="font-weight:600">' + conv(raw) + '</td>';
  });
  html += '</tr><tr><td class="row-label">Rafales (' + unitLabel + ')</td>';
  cols.forEach(function(c) {
    var raw = h.windgusts_10m[c.i] || 0;
    html += '<td class="' + windColor(raw) + (c.isNow ? ' wg-now' : '') + '">' + conv(raw) + '</td>';
  });
  html += '</tr><tr><td class="row-label">Direction</td>';
  cols.forEach(function(c) {
    html += '<td class="' + (c.isNow ? 'wg-now' : '') + '">' + dirArrow(h.winddirection_10m[c.i]) + '</td>';
  });
  html += '</tr>';
  var hasWaves = h.wave_height && h.wave_height.some(function(v) { return v > 0; });
  if (hasWaves) {
    html += '<tr><td class="row-label">Vagues (m)</td>';
    cols.forEach(function(c) {
      var v = h.wave_height[c.i];
      html += '<td class="' + waveColor(v) + (c.isNow ? ' wg-now' : '') + '">' + (v ? v.toFixed(1) : '-') + '</td>';
    });
    html += '</tr>';
  }
  html += '<tr><td class="row-label">Temp. (C)</td>';
  cols.forEach(function(c) {
    html += '<td class="' + (c.isNow ? 'wg-now' : '') + '">' + Math.round(h.temperature_2m[c.i] || 0) + '</td>';
  });
  html += '</tr><tr><td class="row-label">Pluie (mm/h)</td>';
  cols.forEach(function(c) {
    var v = h.precipitation[c.i];
    var bg = v > 2 ? 'background:rgba(37,99,235,0.25)' : v > 0.5 ? 'background:rgba(37,99,235,0.12)' : '';
    html += '<td class="' + (c.isNow ? 'wg-now' : '') + '" style="' + bg + '">' + (v && v > 0 ? v.toFixed(1) : '') + '</td>';
  });
  html += '</tr></tbody></table>';
  html += '<div style="padding:4px 12px 6px;font-family:IBM Plex Mono,monospace;font-size:11px;color:#94A3B8;">Source : Meteo-France AROME 2.5km</div>';
  document.getElementById('forecastTable').innerHTML = html;
}

function openSpotPopup(latlng, name) {
  S.clickLatLng = latlng;
  if (S.clickMarker) S.map.removeLayer(S.clickMarker);
  var pulseIcon = L.divIcon({
    className: '',
    html: '<div class="visim-pulse-marker"><div class="visim-pulse-ring"></div><div class="visim-pulse-ring visim-pulse-ring2"></div><div class="visim-pulse-dot"></div></div>',
    iconSize: [40, 40], iconAnchor: [20, 20]
  });
  S.clickMarker = L.marker([latlng.lat, latlng.lng], { icon: pulseIcon, interactive: false }).addTo(S.map);
  document.getElementById('spotCoords').textContent = latlng.lat.toFixed(4) + 'N - ' + Math.abs(latlng.lng).toFixed(4) + 'O' + (name ? ' - ' + name : '');
  var distToCoastMeters = estimateDistanceToCoast(latlng.lat, latlng.lng);
  var depthEstimate = Math.max(1.5, Math.min(30, distToCoastMeters * 0.004 + 1.5));
  S._spotDepth = depthEstimate;
  S._distToCoast = distToCoastMeters;
  document.getElementById('spotMeta').textContent = 'Profondeur en cours...';
  fetchRealDepth(latlng.lat, latlng.lng).then(function(realDepth) {
    if (realDepth !== null && realDepth > 0) {
      S._spotDepth = realDepth;
      document.getElementById('spotMeta').textContent = '~' + Math.round(realDepth) + 'm - EMODnet (115m)';
    } else {
      document.getElementById('spotMeta').textContent = '~' + Math.round(depthEstimate) + 'm - estimation';
    }
    if (S_spotWeatherCache) renderSpotPopup();
  });
  var now = new Date();
  document.getElementById('spotDate').value = now.toISOString().split('T')[0];
  document.getElementById('spotTime').value = now.getHours().toString().padStart(2, '0') + ':00';
  document.getElementById('spotSeaTemp').textContent = '-';
  document.getElementById('spotSunrise').textContent = '-';
  document.getElementById('spotSunset').textContent = '-';
  document.getElementById('spotDrawer').classList.add('open');
  S_spotWeatherCache = null;
  S_spotMarineCache = null;
  S_spotSunCache = null;
  fetchSpotWeather(latlng.lat, latlng.lng);
  fetchSpotMarineAndSun(latlng.lat, latlng.lng);
  loadDrawerTides(latlng.lat, latlng.lng);
  fetchSedimentType(latlng.lat, latlng.lng);
}

function closeSpotPopup() {
  document.getElementById('spotDrawer').classList.remove('open');
  if (S.clickMarker) { S.map.removeLayer(S.clickMarker); S.clickMarker = null; }
}

function fetchSpotWeather(lat, lon) {
  var url = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + lat + '&longitude=' + lon
    + '&hourly=windspeed_10m,windgusts_10m,winddirection_10m,wave_height,precipitation'
    + '&wind_speed_unit=kmh&timezone=Europe/Paris'
    + '&past_days=3&forecast_days=5'
    + '&models=meteofrance_arome_france';
  fetch(url).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function(d) {
    if (!d.hourly) return;
    S_spotWeatherCache = d.hourly;
    renderSpotPopup();
  }).catch(function(err) {
    console.error('[VIZI] meteo spot failed:', err);
  });
}

function refreshSpotPopup() {
  if (S_spotWeatherCache) renderSpotPopup();
}

// ============================================================
// CALCUL VISIBILITE ALIGNE SUR arome_scores.gs
// Utilise getDirFactorForPoint avec orientation de cote locale
// ============================================================
function renderSpotPopup() {
  var h = S_spotWeatherCache;
  if (!h) return;
  var dateVal = document.getElementById('spotDate').value;
  var timeVal = document.getElementById('spotTime').value;
  var targetStr = dateVal + 'T' + timeVal;
  var idx = 0, best = Infinity;
  h.time.forEach(function(t, i) {
    var d = Math.abs(new Date(t) - new Date(targetStr));
    if (d < best) { best = d; idx = i; }
  });
  var wind = Math.round(h.windspeed_10m[idx] || 0);
  var gusts = Math.round(h.windgusts_10m[idx] || 0);
  var dir = h.winddirection_10m[idx];
  var wave = h.wave_height ? (h.wave_height[idx] || 0) : 0;
  var depth = S._spotDepth || 5;
  var lat = S.clickLatLng ? S.clickLatLng.lat : 49.35;
  var lon = S.clickLatLng ? S.clickLatLng.lng : -0.5;

  var bathyFactor = depth <= 2 ? 4.0 : depth <= 5 ? 3.0 : depth <= 10 ? 2.0 : depth <= 20 ? 1.3 : 1.0;

  // NOUVEAU : facteur direction base sur orientation locale de la cote
  var dirFactor = getDirFactorForPoint(dir, lat, lon);

  var windPenalty = Math.min(Math.max(wind - 5, 0) / 20, 1) * 55 * dirFactor;
  var gustPenalty = Math.min(Math.max(gusts - 10, 0) / 25, 1) * 30 * dirFactor;
  var wavePenalty = Math.min(wave / 1.2, 1) * 35;
  var totalPenalty = Math.min((windPenalty + gustPenalty + wavePenalty) * bathyFactor, 100);
  var score = Math.max(0, Math.min(100, 100 - totalPenalty));

  var visLabel = score >= 80 ? 'Excellente' : score >= 60 ? 'Bonne' : score >= 40 ? 'Moyenne' : score >= 20 ? 'Faible' : 'Nulle';
  var badgeColors = { 'Nulle': '#DC2626', 'Faible': '#EA580C', 'Moyenne': '#CA8A04', 'Bonne': '#16A34A', 'Excellente': '#0BA888' };
  var segColors = ['#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#0BA888'];
  var levelIdx = ['Nulle', 'Faible', 'Moyenne', 'Bonne', 'Excellente'].indexOf(visLabel);
  document.getElementById('spotVisBadge').style.background = badgeColors[visLabel] || '#CA8A04';
  document.getElementById('spotVisLabel').textContent = visLabel;
  for (var si = 0; si < 5; si++) {
    var seg = document.getElementById('visSeg' + si);
    if (seg) seg.style.background = si <= levelIdx ? segColors[si] : 'var(--border)';
  }
  var windDisp = S_windUnit === 'kt' ? toKt(wind) : wind;
  var gustDisp = S_windUnit === 'kt' ? toKt(gusts) : gusts;
  var unitDisp = S_windUnit === 'kt' ? 'noeuds' : 'km/h';
  document.getElementById('spotWindSpeed').textContent = windDisp;
  document.getElementById('spotWindGusts').textContent = gustDisp;
  document.querySelectorAll('.spot-wind-unit').forEach(function(el, i) {
    if (i < 2) el.textContent = unitDisp;
  });
  var fromNames = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  var aidx = Math.round(dir / 45) % 8;
  var dirName = (dir !== null && dir !== undefined) ? fromNames[aidx] : '-';
  document.getElementById('spotWindDir').textContent = dirName;
  document.getElementById('spotWindDeg').textContent = dir !== null ? Math.round(dir) + ' deg' : '-';

  // Affichage du facteur direction pour transparence
  var offshoreLabel = '';
  if (dirFactor <= 0.3) offshoreLabel = ' - offshore';
  else if (dirFactor >= 1.0) offshoreLabel = ' - onshore';
  else offshoreLabel = ' - lateral';

  var factors = [];
  factors.push({ label: 'Vent ' + windDisp + ' ' + unitDisp + ' (' + dirName + ')' + offshoreLabel, impact: Math.round(windPenalty) });
  if (wavePenalty > 3) factors.push({ label: 'Vagues ' + wave.toFixed(1) + 'm', impact: Math.round(wavePenalty) });
  factors.push({ label: 'Fond ~' + Math.round(depth) + 'm (x' + bathyFactor.toFixed(1) + ')', impact: null });
  var factorsEl = document.getElementById('spotFactors');
  factorsEl.innerHTML = factors.map(function(f) {
    var impactStr = f.impact !== null ? (f.impact > 0 ? '-' + f.impact : 'ok') : '';
    return '<div style="display:flex;align-items:center;gap:8px;font-family:IBM Plex Mono,monospace;font-size:11px;color:#4A6080;"><span style="flex:1">' + f.label + '</span><span style="font-weight:600">' + impactStr + '</span></div>';
  }).join('');
  renderDecantation(h, idx, depth, dir, S.clickLatLng);
}

function renderDecantation(h, currentIdx, depth, currentDir, latlng) {
  var banner = document.getElementById('decantBanner');
  if (!h || !h.windspeed_10m || !banner) { if (banner) banner.classList.remove('show'); return; }
  var decantBaseHours = depth <= 3 ? 72 : depth <= 6 ? 48 : depth <= 10 ? 30 : depth <= 15 ? 18 : 12;
  var lookback = Math.min(72, currentIdx);
  var maxImpactHoursAgo = -1;
  var maxImpact = 0;
  // NOUVEAU : utilise orientation locale de la cote
  var coastNormal = getCoastNormal(latlng.lat, latlng.lng);

  for (var i = currentIdx - lookback; i <= currentIdx; i++) {
    if (i < 0) continue;
    var w = h.windspeed_10m[i] || 0;
    var g = h.windgusts_10m[i] || 0;
    var d = h.winddirection_10m ? (h.winddirection_10m[i] || 0) : 0;
    // Si le vent est offshore (va vers le large), pas de contribution a la turbidite
    var windGoesTo = (d + 180) % 360;
    var angle = windGoesTo - coastNormal;
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    var offshoreFactor = Math.cos(angle * Math.PI / 180);
    // Ne considere la decantation que si onshore (offshoreFactor < -0.3)
    if (offshoreFactor > -0.3) continue;

    var impact = Math.max(w - 12, 0) + Math.max(g - 18, 0) * 0.6;
    if (impact > maxImpact) {
      maxImpact = impact;
      maxImpactHoursAgo = currentIdx - i;
    }
  }
  if (maxImpact < 5) { banner.classList.remove('show'); return; }
  var decantTotalHours = Math.round(decantBaseHours * (0.5 + Math.min(maxImpact / 40, 1)));
  var hoursRemaining = decantTotalHours - maxImpactHoursAgo;
  if (hoursRemaining <= 2) { banner.classList.remove('show'); return; }
  var now = new Date();
  var clearTime = new Date(now.getTime() + hoursRemaining * 3600 * 1000);
  var dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var dayName;
  var dayDiff = Math.floor((clearTime.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
  if (dayDiff === 0) dayName = "aujourd'hui";
  else if (dayDiff === 1) dayName = 'demain';
  else if (dayDiff === 2) dayName = 'apres-demain';
  else dayName = dayNames[clearTime.getDay()];
  var hh = clearTime.getHours().toString().padStart(2, '0');
  document.getElementById('decantMain').textContent = 'Eau claire vers ' + dayName + ' ' + hh + 'h';
  document.getElementById('decantSub').textContent = '~ ' + hoursRemaining + 'h restantes (fond ' + Math.round(depth) + 'm)';
  banner.classList.add('show');
}

function findZoneAtPoint(lat, lon) {
  if (!VIZI_ZONES_DATA || !VIZI_ZONES_DATA.features) return null;
  for (var i = 0; i < VIZI_ZONES_DATA.features.length; i++) {
    var zone = VIZI_ZONES_DATA.features[i];
    if (pointInPolygon([lon, lat], zone.geometry.coordinates[0])) return zone;
  }
  return null;
}

function pointInPolygon(point, polygon) {
  var x = point[0], y = point[1];
  var inside = false;
  for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    var xi = polygon[i][0], yi = polygon[i][1];
    var xj = polygon[j][0], yj = polygon[j][1];
    var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function fetchSpotMarineAndSun(lat, lon) {
  var now = new Date();
  var fmt = function(d) { return d.toISOString().split('T')[0]; };
  var start = new Date(now);
  var marineUrl = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + lat + '&longitude=' + lon + '&hourly=sea_surface_temperature&timezone=Europe/Paris&start_date=' + fmt(start) + '&end_date=' + fmt(start);
  fetch(marineUrl).then(function(r) { return r.json(); }).then(function(d) {
    if (!d.hourly) return;
    var temp = d.hourly.sea_surface_temperature[0];
    if (temp !== null && temp !== undefined) {
      document.getElementById('spotSeaTemp').textContent = temp.toFixed(1) + ' C';
    }
  }).catch(function() {});
  var sunUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&daily=sunrise,sunset&timezone=Europe/Paris&start_date=' + fmt(start) + '&end_date=' + fmt(start);
  fetch(sunUrl).then(function(r) { return r.json(); }).then(function(d) {
    if (!d.daily) return;
    if (d.daily.sunrise && d.daily.sunrise[0]) document.getElementById('spotSunrise').textContent = d.daily.sunrise[0].slice(11, 16);
    if (d.daily.sunset && d.daily.sunset[0]) document.getElementById('spotSunset').textContent = d.daily.sunset[0].slice(11, 16);
  }).catch(function() {});
}

function fetchSedimentType(lat, lon) {
  document.getElementById('sedimentType').textContent = '...';
  document.getElementById('sedSwatchColor').style.background = '#E2E8F0';
  gasGet('sediment', { lat: lat, lon: lon }).then(function(data) {
    if (!data || !data.text) { fallbackSediment(); return; }
    try {
      var json = JSON.parse(data.text);
      if (!json.features || json.features.length === 0) {
        document.getElementById('sedimentType').textContent = 'Hors couverture';
        return;
      }
      var props = json.features[0].properties;
      var raw = props.original_substrate || props.folk_5cl_txt || '?';
      var lower = raw.toLowerCase();
      var color = '#CBD5E0';
      if (lower.indexOf('gravier') !== -1 || lower.indexOf('caillou') !== -1) color = '#CC2200';
      else if (lower.indexOf('sable gros') !== -1) color = '#E86030';
      else if (lower.indexOf('sable fin') !== -1) color = '#F5E8A0';
      else if (lower.indexOf('sable') !== -1) color = '#F0C060';
      else if (lower.indexOf('vase') !== -1) color = '#8B6A40';
      else if (lower.indexOf('roche') !== -1) color = '#909090';
      document.getElementById('sedimentType').textContent = raw.slice(0, 60);
      document.getElementById('sedSwatchColor').style.background = color;
    } catch (e) { fallbackSediment(); }
  }).catch(function() { fallbackSediment(); });
}

function fallbackSediment() {
  document.getElementById('sedimentType').textContent = 'Non disponible';
  document.getElementById('sedSwatchColor').style.background = '#E2E8F0';
}

function loadDrawerTides(lat, lon) {
  var near = findApiMareeSiteNear(lat, lon);
  var container = document.getElementById('drawerTides');
  if (!container) return;

  if (!near) {
    container.innerHTML =
      '<div style="padding:18px;text-align:center;color:var(--text-3);font-family:IBM Plex Mono,monospace;font-size:12px;">' +
      'Marees non disponibles<br><span style="font-size:10px">(marnage negligeable en Mediterranee)</span></div>';
    return;
  }

  container.innerHTML =
    '<div class="tides-label">Marees du jour</div>' +
    '<div class="tides-port-name">' + near.name + '</div>' +
    '<div style="margin:10px 0 14px;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
    '<div><div id="tideMainLabel" style="font-family:Inter,sans-serif;font-size:17px;font-weight:700;">-</div>' +
    '<div id="tideDesc" style="font-family:IBM Plex Mono,monospace;font-size:11px;color:var(--text-3);margin-top:3px;">-</div></div>' +
    '<div style="text-align:right;"><div style="font-family:IBM Plex Mono,monospace;font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.08em;">Marnage</div>' +
    '<div id="tideMarnage" style="font-family:IBM Plex Mono,monospace;font-size:22px;font-weight:700;color:var(--accent);line-height:1;margin-top:2px;">-</div></div>' +
    '</div></div>' +
    '<div id="tideCurve"></div>' +
    '<div id="tideExtremes" style="margin-top:10px;"></div>';

  var now = new Date();
  var today = now.toISOString().split('T')[0];
  var url = GAS_URL + '?action=api_tides&site=' + near.siteId + '&from=' + today + 'T00:00&to=' + today + 'T23:59&step=15';

  document.getElementById('tideCurve').innerHTML =
    '<div style="padding:20px;text-align:center;color:var(--text-3);font-family:IBM Plex Mono,monospace;font-size:11px;">Chargement...</div>';

  fetch(url).then(function(r){ return r.json(); }).then(function(data) {
    if (!data.data || data.error) {
      document.getElementById('tideCurve').innerHTML =
        '<div style="padding:14px;color:var(--bad);font-family:IBM Plex Mono,monospace;font-size:10px;">Erreur : ' + (data.error || 'pas de donnees') + '</div>';
      return;
    }
    var points = data.data;
    var heights = points.map(function(p) { return p.height; });
    var minH = Math.min.apply(null, heights);
    var maxH = Math.max.apply(null, heights);
    var marnage = maxH - minH;
    var info = marnageToTideLabel(marnage);
    document.getElementById('tideMainLabel').textContent = info.label;
    document.getElementById('tideMainLabel').style.color = info.color;
    document.getElementById('tideDesc').textContent = info.desc;
    document.getElementById('tideMarnage').textContent = marnage.toFixed(1) + 'm';
    renderTideCurve(points, new Date());
    renderTideExtremes(points);
  }).catch(function(err) {
    document.getElementById('tideCurve').innerHTML =
      '<div style="padding:14px;color:var(--bad);font-family:IBM Plex Mono,monospace;font-size:10px;">Erreur reseau</div>';
  });
}

function findTideExtremes(points) {
  var ex = [];
  for (var i = 2; i < points.length - 2; i++) {
    var h = points[i].height, p1 = points[i-1].height, n1 = points[i+1].height;
    var p2 = points[i-2].height, n2 = points[i+2].height;
    if (h > p1 && h > n1 && h > p2 && h > n2) ex.push({ type:'high', time:points[i].time, height:h });
    else if (h < p1 && h < n1 && h < p2 && h < n2) ex.push({ type:'low', time:points[i].time, height:h });
  }
  return ex;
}

function renderTideCurve(points, now) {
  if (points.length === 0) return;
  var w = 300, h = 130, pad = 20;
  var heights = points.map(function(p) { return p.height; });
  var minH = Math.min.apply(null, heights), maxH = Math.max.apply(null, heights);
  var rangeH = Math.max(maxH - minH, 0.1);
  function xOf(time) {
    var d = new Date(time);
    return pad + ((d.getHours() * 60 + d.getMinutes()) / 1440) * (w - pad * 2);
  }
  function yOf(height) {
    return pad + (1 - (height - minH) / rangeH) * (h - pad * 2);
  }
  var d = '';
  points.forEach(function(p, i) {
    d += (i === 0 ? 'M' : 'L') + xOf(p.time).toFixed(1) + ',' + yOf(p.height).toFixed(1) + ' ';
  });
  var nowX = pad + ((now.getHours() * 60 + now.getMinutes()) / 1440) * (w - pad * 2);
  var extremes = findTideExtremes(points);
  var markers = extremes.map(function(e) {
    var x = xOf(e.time), y = yOf(e.height);
    var color = e.type === 'high' ? '#0BA888' : '#D97706';
    var timeLabel = new Date(e.time).toLocaleTimeString('fr', { hour:'2-digit', minute:'2-digit' });
    var ty = e.type === 'high' ? y - 8 : y + 16;
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="' + color + '" stroke="white" stroke-width="2"/>' +
      '<text x="' + x.toFixed(1) + '" y="' + ty.toFixed(1) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="10" fill="' + color + '" font-weight="600">' + timeLabel + '</text>';
  }).join('');
  var hourLabels = '';
  [0, 6, 12, 18, 24].forEach(function(hr) {
    var x = pad + (hr * 60 / 1440) * (w - pad * 2);
    hourLabels += '<text x="' + x.toFixed(1) + '" y="' + (h - 4) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="9" fill="#94A3B8">' + hr + 'h</text>';
  });
  var etaleBands = extremes.map(function(e) {
    var cx = xOf(e.time);
    var w45 = (45 / 1440) * (w - pad * 2);
    return '<rect x="' + (cx - w45).toFixed(1) + '" y="' + pad + '" width="' + (w45 * 2).toFixed(1) + '" height="' + (h - pad * 2) + '" fill="#A8E63D" opacity="0.12"/>';
  }).join('');
  var lastX = xOf(points[points.length-1].time).toFixed(1);
  var firstX = xOf(points[0].time).toFixed(1);
  var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;display:block;">' +
    etaleBands +
    '<path d="' + d + 'L' + lastX + ',' + (h - pad) + ' L' + firstX + ',' + (h - pad) + ' Z" fill="#0BA888" opacity="0.1"/>' +
    '<path d="' + d + '" stroke="#0BA888" stroke-width="2" fill="none"/>' +
    '<line x1="' + nowX.toFixed(1) + '" y1="' + pad + '" x2="' + nowX.toFixed(1) + '" y2="' + (h - pad) + '" stroke="#A8E63D" stroke-width="2" stroke-dasharray="3,3"/>' +
    '<circle cx="' + nowX.toFixed(1) + '" cy="' + pad + '" r="4" fill="#A8E63D"/>' +
    markers + hourLabels +
    '</svg>';
  document.getElementById('tideCurve').innerHTML = svg +
    '<div style="font-family:IBM Plex Mono,monospace;font-size:10px;color:var(--text-3);text-align:center;margin-top:4px;">' +
    '<span style="color:#A8E63D">&#9679;</span> maintenant &nbsp; ' +
    '<span style="color:#0BA888">&#9679;</span> PM &nbsp; ' +
    '<span style="color:#D97706">&#9679;</span> BM &nbsp; ' +
    '<span style="display:inline-block;width:10px;height:6px;background:#A8E63D;opacity:0.3;vertical-align:middle;margin-right:3px;"></span>etale' +
    '</div>';
}

function renderTideExtremes(points) {
  var ex = findTideExtremes(points);
  if (ex.length === 0) return;
  var cols = Math.min(ex.length, 4);
  var html = '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:6px;">';
  ex.slice(0, 4).forEach(function(e) {
    var d = new Date(e.time);
    var timeStr = d.toLocaleTimeString('fr', { hour:'2-digit', minute:'2-digit' });
    var color = e.type === 'high' ? 'var(--accent)' : 'var(--warn)';
    var icon = e.type === 'high' ? '&#9650;' : '&#9660;';
    var label = e.type === 'high' ? 'PM' : 'BM';
    html += '<div style="text-align:center;padding:8px 4px;background:var(--surface2);border-radius:8px;border:1px solid var(--border);">' +
      '<div style="font-family:IBM Plex Mono,monospace;font-size:10px;color:' + color + ';font-weight:700;">' + icon + ' ' + label + '</div>' +
      '<div style="font-family:IBM Plex Mono,monospace;font-size:14px;font-weight:600;margin-top:2px;">' + timeStr + '</div>' +
      '<div style="font-family:IBM Plex Mono,monospace;font-size:10px;color:var(--text-3);margin-top:1px;">' + e.height.toFixed(1) + 'm</div>' +
      '</div>';
  });
  html += '</div>';
  document.getElementById('tideExtremes').innerHTML = html;
}

var LAND_MESSAGES = [
  'Ca va etre complique la chasse sous-marine ici...',
  'Belle profondeur de 0m. Les poissons sont en vacances.',
  'Visibilite excellente - mais il n y a pas d eau.',
  'Ce spot est sur la terre ferme. Essaie 50m plus a gauche.'
];
var _landToastTimer = null;

function isOnSea(lat, lon, callback) {
  var url = 'https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json&zoom=10';
  fetch(url, { headers: { 'Accept-Language': 'fr' } }).then(function(r) { return r.json(); }).then(function(data) {
    var type = (data.type || '').toLowerCase();
    var cls = (data.class || '').toLowerCase();
    var waterTypes = ['sea', 'bay', 'strait', 'ocean', 'water', 'coastline', 'harbour', 'inlet'];
    var isWater = cls === 'waterway' || (cls === 'natural' && type === 'water') || waterTypes.indexOf(type) !== -1 || !data.address || (!data.address.road && !data.address.city && !data.address.town && !data.address.village);
    callback(isWater);
  }).catch(function() { callback(true); });
}

function showLandMessage(latlng) {
  var msg = LAND_MESSAGES[Math.floor(Math.random() * LAND_MESSAGES.length)];
  var toast = document.getElementById('landToast');
  toast.textContent = msg;
  toast.classList.add('show');
  if (_landToastTimer) clearTimeout(_landToastTimer);
  _landToastTimer = setTimeout(function() { toast.classList.remove('show'); }, 3200);
}

var OBS_FOND = true;
var OBS_SUBMITTING = false;

function openObsSheet() {
  var now = new Date();
  var latlng = isMobile() ? S.map.getCenter() : (S.clickLatLng || S.map.getCenter());
  document.getElementById('obsSheetDate').value = now.toISOString().split('T')[0];
  document.getElementById('obsSheetTime').value = now.getHours().toString().padStart(2, '0') + ':00';
  document.getElementById('obsSheetCoords').textContent = latlng.lat.toFixed(4) + 'N - ' + Math.abs(latlng.lng).toFixed(4) + 'O';
  document.getElementById('obsSheetVisSlider').value = 8;
  updateObsSheetVis(8);
  setObsFond(true);
  document.getElementById('obsSheetSpecies').value = '';
  document.getElementById('obsSheetSubmit').style.display = 'block';
  document.getElementById('obsSheetSubmit').disabled = false;
  document.getElementById('obsSheetSuccess').style.display = 'none';
  document.getElementById('obsSheet').classList.add('open');
  document.getElementById('obsSheetOverlay').style.display = 'block';
}

function closeObsSheet() {
  document.getElementById('obsSheet').classList.remove('open');
  document.getElementById('obsSheetOverlay').style.display = 'none';
  OBS_SUBMITTING = false;
}

function updateObsSheetVis(idx) {
  idx = parseInt(idx);
  var v = VIS[idx];
  var el = document.getElementById('obsSheetVisVal');
  el.textContent = v.l;
  el.style.color = v.c;
}

function setObsFond(val) {
  OBS_FOND = val;
  document.getElementById('obsSheetFondOui').classList.toggle('on', val);
  document.getElementById('obsSheetFondNon').classList.toggle('on', !val);
}

function submitObsSheet() {
  if (OBS_SUBMITTING) return;
  OBS_SUBMITTING = true;
  var btn = document.getElementById('obsSheetSubmit');
  btn.disabled = true;
  btn.textContent = 'Envoi...';
  var latlng = isMobile() ? S.map.getCenter() : (S.clickLatLng || S.map.getCenter());
  var idx = parseInt(document.getElementById('obsSheetVisSlider').value);
  var visLevel = VIS[idx];
  gasGet('submit_observation', {
    lat: latlng.lat, lon: latlng.lng,
    date: document.getElementById('obsSheetDate').value,
    time: document.getElementById('obsSheetTime').value,
    visibility_m: visLevel.v,
    visibility_label: visLevel.l,
    bottom_visible: OBS_FOND,
    comment: document.getElementById('obsSheetSpecies').value
  }).then(function(result) {
    OBS_SUBMITTING = false;
    if (result && result.success) {
      btn.style.display = 'none';
      document.getElementById('obsSheetSuccessMsg').textContent = 'Merci ! Observation enregistree.';
      document.getElementById('obsSheetSuccessSub').textContent = 'Ton spot reste secret.';
      document.getElementById('obsSheetSuccess').style.display = 'block';
      setTimeout(closeObsSheet, 2500);
    } else {
      btn.disabled = false;
      btn.textContent = 'Partager';
      alert('Erreur envoi.');
    }
  });
}

function analyzeCenterPoint() {
  var center = S.map.getCenter();
  isOnSea(center.lat, center.lng, function(onSea) {
    if (!onSea) { showLandMessage(center); return; }
    openSpotPopup(center, null);
    if (S_forecastOpen) loadForecast(center.lat, center.lng, null);
  });
}

var S_currentUser = null;
var S_loginMode = 'signin';
var S_currentMood = 3;
var S_sessionContext = null;

window.handleAuthStateChange = function(user) {
  S_currentUser = user;
  var btn = document.getElementById('authBtn');
  var btnText = document.getElementById('authBtnText');
  if (!btn) return;
  if (user) {
    btn.classList.add('logged');
    btnText.textContent = 'Mon carnet';
    document.getElementById('carnetUser').textContent = user.email || user.displayName || 'Connecte';
  } else {
    btn.classList.remove('logged');
    btnText.textContent = 'Se connecter';
  }
};

function handleAuthClick() {
  if (S_currentUser) openCarnet();
  else openLogin();
}

function openLogin() {
  document.getElementById('loginOverlay').classList.add('open');
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPwd').value = '';
}

function closeLogin() {
  document.getElementById('loginOverlay').classList.remove('open');
}

function toggleLoginMode() {
  S_loginMode = S_loginMode === 'signin' ? 'signup' : 'signin';
  if (S_loginMode === 'signup') {
    document.getElementById('loginSubmit').textContent = 'Creer mon compte';
    document.getElementById('loginToggle').innerHTML = 'Deja un compte ? <span>Se connecter</span>';
  } else {
    document.getElementById('loginSubmit').textContent = 'Se connecter';
    document.getElementById('loginToggle').innerHTML = 'Pas encore de compte ? <span>Cree un compte</span>';
  }
}

function showLoginError(msg) {
  var el = document.getElementById('loginError');
  el.textContent = msg;
  el.style.display = 'block';
}

function loginGoogle() {
  if (!window.fbAuth) { alert('Firebase pas encore charge, attends 1 sec'); return; }
  window.fbSignInWithPopup(window.fbAuth, window.fbGoogleProvider).then(function() {
    closeLogin();
    checkAndOpenCarnet();
  }).catch(function(err) { showLoginError('Echec Google : ' + err.message); });
}

function loginEmail() {
  var email = document.getElementById('loginEmail').value.trim();
  var pwd = document.getElementById('loginPwd').value;
  if (!email || !pwd) { showLoginError('Email et mot de passe requis'); return; }
  if (pwd.length < 6) { showLoginError('Mot de passe : 6 caracteres minimum'); return; }
  if (!window.fbAuth) { alert('Firebase pas charge'); return; }
  var fn = S_loginMode === 'signup' ? window.fbCreateUser : window.fbSignInEmail;
  fn(window.fbAuth, email, pwd).then(function() {
    closeLogin();
    checkAndOpenCarnet();
  }).catch(function(err) {
    var msg = err.message;
    if (msg.indexOf('email-already-in-use') !== -1) msg = 'Cet email est deja utilise';
    else if (msg.indexOf('wrong-password') !== -1 || msg.indexOf('invalid-credential') !== -1) msg = 'Email ou mot de passe incorrect';
    else if (msg.indexOf('user-not-found') !== -1) msg = 'Aucun compte avec cet email';
    showLoginError(msg);
  });
}

function logout() {
  if (!window.fbAuth) return;
  window.fbSignOut(window.fbAuth).then(function() { closeCarnet(); });
}

function checkAndOpenCarnet() {
  if (!window.fbDb || !S_currentUser) return;
  var q = window.fbQuery(window.fbCollection(window.fbDb, 'sessions'), window.fbWhere('userId', '==', S_currentUser.uid));
  window.fbGetDocs(q).then(function(snapshot) {
    if (snapshot.empty) showWelcomeToast();
    else openCarnet();
  }).catch(function() { openCarnet(); });
}

function showWelcomeToast() {
  var toast = document.getElementById('landToast');
  toast.innerHTML = 'Bienvenue ! Clique sur ton spot de chasse pour enregistrer ta premiere session.';
  toast.style.fontSize = '15px';
  toast.style.maxWidth = '400px';
  toast.style.whiteSpace = 'normal';
  toast.style.lineHeight = '1.5';
  toast.classList.add('show');
  setTimeout(function() {
    toast.classList.remove('show');
    toast.style.fontSize = '';
    toast.style.maxWidth = '';
    toast.style.whiteSpace = '';
    toast.style.lineHeight = '';
  }, 5500);
}

function openCarnet() {
  if (!S_currentUser) { openLogin(); return; }
  document.getElementById('carnetDrawer').classList.add('open');
  loadSessions();
}

function closeCarnet() {
  document.getElementById('carnetDrawer').classList.remove('open');
  if (S_carnetMapLayer) { S.map.removeLayer(S_carnetMapLayer); S_carnetMapLayer = null; }
}

function loadSessions() {
  var body = document.getElementById('carnetBody');
  body.innerHTML = '<div class="carnet-empty">Chargement...</div>';
  if (!window.fbDb || !S_currentUser) return;
  var q = window.fbQuery(window.fbCollection(window.fbDb, 'sessions'), window.fbWhere('userId', '==', S_currentUser.uid), window.fbOrderBy('date', 'desc'));
  window.fbGetDocs(q).then(function(snapshot) {
    if (snapshot.empty) {
      body.innerHTML = '<div class="carnet-empty">Aucune session enregistree.<br><br>Clique sur ton spot sur la carte, puis sur "Enregistrer ma session".</div>';
      return;
    }
    var sessions = [];
    snapshot.forEach(function(d) { sessions.push(d.data()); });
    renderCarnetDashboard(sessions);
  }).catch(function(err) {
    body.innerHTML = '<div class="carnet-empty" style="color:var(--bad)">Erreur : ' + err.message + '</div>';
  });
}

function renderCarnetDashboard(sessions) {
  window.S_carnetAllSessions = sessions;
  window.S_carnetFilter = { search: '', year: 'all' };
  buildCarnetUI();
}

function buildCarnetUI() {
  var body = document.getElementById('carnetBody');
  var sessions = window.S_carnetAllSessions || [];
  var now = new Date();
  var yearStart = new Date(now.getFullYear(), 0, 1);
  var sessionsYear = sessions.filter(function(s) {
    if (!s.date) return false;
    return new Date(s.date) >= yearStart;
  }).length;
  var lastSession = sessions[0];
  var daysSince = '-';
  if (lastSession && lastSession.date) {
    var diffMs = now - new Date(lastSession.date);
    var d = Math.floor(diffMs / 86400000);
    if (d === 0) daysSince = "Aujourd'hui";
    else if (d === 1) daysSince = 'Hier';
    else daysSince = 'il y a ' + d + 'j';
  }
  var years = {};
  sessions.forEach(function(s) {
    if (s.date) years[new Date(s.date).getFullYear()] = true;
  });
  var yearList = Object.keys(years).sort(function(a, b) { return b - a; });
  var html = '';
  html += '<div class="carnet-stats-row">';
  html += '<div class="carnet-stat"><div class="carnet-stat-val">' + sessionsYear + '</div><div class="carnet-stat-lbl">En ' + now.getFullYear() + '</div></div>';
  html += '<div class="carnet-stat"><div class="carnet-stat-val">' + sessions.length + '</div><div class="carnet-stat-lbl">Total</div></div>';
  html += '<div class="carnet-stat"><div class="carnet-stat-val" style="font-size:16px;line-height:1.2">' + daysSince + '</div><div class="carnet-stat-lbl">Derniere</div></div>';
  html += '</div>';
  html += '<div class="carnet-map-btn" id="carnetMapToggle" onclick="toggleCarnetSessionsOnMap()">Afficher mes sessions sur la carte</div>';
  html += '<div class="carnet-filters">';
  html += '<input type="text" class="carnet-search" id="carnetSearch" placeholder="Rechercher un spot, une prise..." oninput="filterCarnet()">';
  html += '<select class="carnet-year-select" id="carnetYear" onchange="filterCarnet()">';
  html += '<option value="all">Toutes annees</option>';
  yearList.forEach(function(y) { html += '<option value="' + y + '">' + y + '</option>'; });
  html += '</select></div>';
  html += '<div class="carnet-sessions-wrap" id="carnetSessionsWrap"></div>';
  body.innerHTML = html;
  renderSessionsList();
}

function filterCarnet() {
  window.S_carnetFilter = {
    search: document.getElementById('carnetSearch').value.trim().toLowerCase(),
    year: document.getElementById('carnetYear').value
  };
  renderSessionsList();
}

function renderSessionsList() {
  var wrap = document.getElementById('carnetSessionsWrap');
  if (!wrap) return;
  var sessions = window.S_carnetAllSessions || [];
  var filter = window.S_carnetFilter || { search: '', year: 'all' };
  var filtered = sessions.filter(function(s) {
    if (filter.year !== 'all' && s.date) {
      if (new Date(s.date).getFullYear().toString() !== filter.year) return false;
    }
    if (filter.search) {
      var haystack = [s.spotName || '', s.catch_ || '', s.notes || ''].join(' ').toLowerCase();
      if (haystack.indexOf(filter.search) === -1) return false;
    }
    return true;
  });
  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="carnet-empty" style="padding:30px 10px">Aucune session ne correspond a ta recherche.</div>';
    return;
  }
  var groups = {};
  var groupOrder = [];
  filtered.forEach(function(s) {
    if (!s.date) return;
    var d = new Date(s.date);
    var key = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0');
    if (!groups[key]) {
      groups[key] = { label: d.toLocaleDateString('fr', { month: 'long', year: 'numeric' }), sessions: [] };
      groupOrder.push(key);
    }
    groups[key].sessions.push(s);
  });
  var moodLabels = ['', 'Chiante', 'Bof', 'Normale', 'Bien', 'Top'];
  var moodBgColors = ['', '#FEE2E2', '#FED7AA', '#FEF3C7', '#DCFCE7', '#D1FAE5'];
  var moodTxtColors = ['', '#991B1B', '#9A3412', '#854D0E', '#166534', '#065F46'];
  var html = '<div class="carnet-sessions-title">' + filtered.length + ' session' + (filtered.length > 1 ? 's' : '') + '</div>';
  groupOrder.forEach(function(key) {
    var group = groups[key];
    html += '<div class="month-group-header"><span>' + group.label + '</span><span class="month-group-count">' + group.sessions.length + ' sortie' + (group.sessions.length > 1 ? 's' : '') + '</span></div>';
    group.sessions.forEach(function(s) {
      var mood = s.mood || 3;
      var dateObj = s.date ? new Date(s.date) : null;
      var dateStr = dateObj ? dateObj.toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short' }) : '-';
      if (s.time) dateStr += ' - ' + s.time;
      var spotName = s.spotName || (s.lat ? s.lat.toFixed(3) + 'N ' + Math.abs(s.lon).toFixed(3) + 'O' : 'Spot inconnu');
      html += '<div class="session-card mood-' + mood + '" onclick="focusSessionOnMap(' + (s.lat || 0) + ',' + (s.lon || 0) + ')">';
      html += '<div class="session-card-top">';
      html += '<div><div class="session-date">' + dateStr + '</div><div class="session-spot">' + spotName + '</div></div>';
      html += '<div class="session-mood-badge" style="background:' + moodBgColors[mood] + ';color:' + moodTxtColors[mood] + '">' + moodLabels[mood] + '</div>';
      html += '</div>';
      html += '<div class="session-grid">';
      html += '<div class="session-field-mini"><span class="session-field-lbl">Visibilite</span><span class="session-field-val">' + (s.visibilityLabel || '-') + '</span></div>';
      if (s.leadKg !== undefined && s.leadKg !== null) {
        html += '<div class="session-field-mini"><span class="session-field-lbl">Plomb</span><span class="session-field-val">' + s.leadKg + ' kg</span></div>';
      }
      if (s.windKmh !== undefined) {
        html += '<div class="session-field-mini"><span class="session-field-lbl">Vent</span><span class="session-field-val">' + s.windKmh + ' km/h ' + (s.windDirName || '') + '</span></div>';
      }
      if (s.tideCoef) {
        html += '<div class="session-field-mini"><span class="session-field-lbl">Coef maree</span><span class="session-field-val">' + s.tideCoef + '</span></div>';
      }
      if (s.catch_) {
        html += '<div class="session-field-mini" style="grid-column:span 2"><span class="session-field-lbl">Prises</span><span class="session-field-val">' + s.catch_ + '</span></div>';
      }
      html += '</div>';
      if (s.notes) {
        html += '<div class="session-notes">' + s.notes + '</div>';
      }
      html += '</div>';
    });
  });
  wrap.innerHTML = html;
  window.S_carnetSessions = filtered;
}

var S_carnetMapLayer = null;
function toggleCarnetSessionsOnMap() {
  var btn = document.getElementById('carnetMapToggle');
  if (S_carnetMapLayer) {
    S.map.removeLayer(S_carnetMapLayer);
    S_carnetMapLayer = null;
    btn.classList.remove('active');
    btn.textContent = 'Afficher mes sessions sur la carte';
    return;
  }
  var sessions = window.S_carnetSessions || [];
  if (sessions.length === 0) return;
  var markers = [];
  var moodColors = ['', '#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#0BA888'];
  sessions.forEach(function(s) {
    if (!s.lat || !s.lon) return;
    var mood = s.mood || 3;
    var color = moodColors[mood];
    var dateStr = s.date ? new Date(s.date).toLocaleDateString('fr', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
    var m = L.circleMarker([s.lat, s.lon], { radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.9 });
    var popup = '<div style="font-family:IBM Plex Mono,monospace;font-size:11px;line-height:1.6;"><strong>' + dateStr + '</strong><br>' + (s.spotName || '-') + '<br>Visi : ' + (s.visibilityLabel || '-');
    if (s.catch_) popup += '<br>Prises : ' + s.catch_;
    popup += '</div>';
    m.bindPopup(popup);
    markers.push(m);
  });
  S_carnetMapLayer = L.featureGroup(markers).addTo(S.map);
  btn.classList.add('active');
  btn.textContent = 'Masquer mes sessions';
  if (markers.length > 0) S.map.fitBounds(S_carnetMapLayer.getBounds(), { padding: [80, 80], maxZoom: 13 });
}

function focusSessionOnMap(lat, lon) {
  if (!lat || !lon) return;
  S.map.setView([lat, lon], 13);
}

var S_leadKg = 7.0;
var S_fbVis = 0;
var S_fbCurrent = 2;
var S_fbTemp = 0;

function adjustLead(delta) {
  S_leadKg = Math.max(0, Math.min(20, S_leadKg + delta));
  document.getElementById('sessionLeadVal').textContent = S_leadKg.toFixed(1);
}

function updateFbVis(val) {
  S_fbVis = parseInt(val);
  var labels = { '-2': 'Bien pire', '-1': 'Pire', '0': 'Conforme', '1': 'Mieux', '2': 'Bien mieux' };
  document.getElementById('fbVisVal').textContent = labels[val];
}

function updateFbCurrent(val) {
  S_fbCurrent = parseInt(val);
  var labels = { '0': 'Nul', '1': 'Faible', '2': 'Moyen', '3': 'Fort', '4': 'Tres fort' };
  document.getElementById('fbCurrentVal').textContent = labels[val];
}

function updateFbTemp(val) {
  S_fbTemp = parseInt(val);
  var labels = { '-2': 'Glaciale', '-1': 'Froide', '0': 'Normale', '1': 'Tiede', '2': 'Chaude' };
  document.getElementById('fbTempVal').textContent = labels[val];
}

function openSessionModal() {
  if (!S_currentUser) { openLogin(); return; }
  if (!S.clickLatLng) { alert('Clique d abord sur la carte sur ton spot.'); return; }
  var lat = S.clickLatLng.lat;
  var lon = S.clickLatLng.lng;
  S_sessionContext = { lat: lat, lon: lon, depth: S._spotDepth };
  document.getElementById('sessionModalCoords').textContent = lat.toFixed(4) + 'N ' + Math.abs(lon).toFixed(4) + 'O';
  var now = new Date();
  document.getElementById('sessionDate').value = now.toISOString().split('T')[0];
  document.getElementById('sessionTime').value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  document.getElementById('sessionVisSlider').value = 8;
  updateSessionVis(8);
  document.getElementById('sessionCatch').value = '';
  document.getElementById('sessionNotes').value = '';
  setMood(3);
  S_leadKg = 7.0;
  document.getElementById('sessionLeadVal').textContent = S_leadKg.toFixed(1);
  document.getElementById('fbVisSlider').value = 0; updateFbVis(0);
  document.getElementById('fbCurrentSlider').value = 2; updateFbCurrent(2);
  document.getElementById('fbTempSlider').value = 0; updateFbTemp(0);
  var condText = '-';
  if (S_spotWeatherCache && S_spotWeatherCache.time) {
    var w = Math.round(S_spotWeatherCache.windspeed_10m[0] || 0);
    var g = Math.round(S_spotWeatherCache.windgusts_10m[0] || 0);
    condText = 'Vent : ' + w + ' km/h / Rafales : ' + g + ' km/h';
  }
  document.getElementById('sessionCondVal').textContent = condText;
  document.getElementById('sessionOverlay').classList.add('open');
}

function closeSessionModal() {
  document.getElementById('sessionOverlay').classList.remove('open');
}

function updateSessionVis(idx) {
  idx = parseInt(idx);
  var v = VIS[idx];
  var el = document.getElementById('sessionVisVal');
  el.textContent = v.l;
  el.style.color = v.c;
}

function setMood(n) {
  S_currentMood = n;
  document.querySelectorAll('.mood-btn').forEach(function(b) {
    b.classList.toggle('on', parseInt(b.dataset.mood) === n);
  });
}

function saveSession() {
  if (!S_currentUser || !S_sessionContext) return;
  var btn = document.getElementById('sessionSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';
  var idx = parseInt(document.getElementById('sessionVisSlider').value);
  var visLevel = VIS[idx];
  var w = 0, g = 0, dir = null;
  if (S_spotWeatherCache && S_spotWeatherCache.time) {
    w = Math.round(S_spotWeatherCache.windspeed_10m[0] || 0);
    g = Math.round(S_spotWeatherCache.windgusts_10m[0] || 0);
    dir = S_spotWeatherCache.winddirection_10m[0];
  }
  var fromNames = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  var dirName = (dir !== null && dir !== undefined) ? fromNames[Math.round(dir / 45) % 8] : '';
  var session = {
    userId: S_currentUser.uid,
    date: document.getElementById('sessionDate').value,
    time: document.getElementById('sessionTime').value,
    lat: S_sessionContext.lat,
    lon: S_sessionContext.lon,
    spotName: null,
    visibilityM: visLevel.v,
    visibilityLabel: visLevel.l,
    catch_: document.getElementById('sessionCatch').value.trim() || null,
    mood: S_currentMood,
    notes: document.getElementById('sessionNotes').value.trim() || null,
    leadKg: S_leadKg,
    fbVis: S_fbVis,
    fbCurrent: S_fbCurrent,
    fbTemp: S_fbTemp,
    windKmh: w,
    gustsKmh: g,
    windDirName: dirName,
    depth: S_sessionContext.depth || null,
    createdAt: window.fbServerTimestamp()
  };
  window.fbAddDoc(window.fbCollection(window.fbDb, 'sessions'), session).then(function() {
    btn.textContent = 'Enregistre !';
    setTimeout(function() {
      closeSessionModal();
      btn.disabled = false;
      btn.textContent = 'Enregistrer dans mon carnet';
    }, 1200);
  }).catch(function(err) {
    btn.disabled = false;
    btn.textContent = 'Enregistrer dans mon carnet';
    alert('Erreur : ' + err.message);
  });
}

function boot() {
  initCanvas();
  initMap();
  var headerH = document.getElementById('header').offsetHeight;
  document.getElementById('sedLegend').style.top = (headerH + 8) + 'px';
  if (window.innerWidth > 768) {
    document.getElementById('spotDrawer').style.top = headerH + 'px';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
