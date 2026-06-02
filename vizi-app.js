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
  // ----- MANCHE NORD (Cote Opale, Picardie, Cote Albatre) -----
  { id:'dunkerque', name:'Dunkerque', lat:51.0500, lon:2.3667, region:'Manche' },
  { id:'graveline', name:'Gravelines', lat:51.0064, lon:2.1252, region:'Manche' },
  { id:'calais', name:'Calais', lat:50.9667, lon:1.8500, region:'Manche' },
  { id:'wissant', name:'Wissant', lat:50.8856, lon:1.6608, region:'Manche' },
  { id:'boulogne', name:'Boulogne-sur-Mer', lat:50.7333, lon:1.6000, region:'Manche' },
  { id:'berck', name:'Berck', lat:50.4067, lon:1.5650, region:'Manche' },
  { id:'cayeux', name:'Cayeux-sur-Mer', lat:50.1844, lon:1.4936, region:'Manche' },
  { id:'le_treport', name:'Le Treport', lat:50.0578, lon:1.3742, region:'Manche' },
  { id:'dieppe', name:'Dieppe', lat:49.9333, lon:1.0833, region:'Manche' },
  { id:'saint_valery_caux', name:'Saint-Valery-en-Caux', lat:49.8678, lon:0.7100, region:'Manche' },
  { id:'fecamp', name:'Fecamp', lat:49.7589, lon:0.3719, region:'Manche' },
  { id:'etretat', name:'Etretat', lat:49.7075, lon:0.2058, region:'Manche' },
  { id:'le_havre_antifer', name:'Le Havre Antifer', lat:49.6594, lon:0.1500, region:'Manche' },
  { id:'le_havre', name:'Le Havre', lat:49.4944, lon:0.1078, region:'Manche' },
  { id:'honfleur', name:'Honfleur', lat:49.4178, lon:0.2308, region:'Manche' },
  { id:'trouville', name:'Trouville-Deauville', lat:49.3661, lon:0.0867, region:'Manche' },
  { id:'dives', name:'Dives-sur-Mer', lat:49.2867, lon:-0.1031, region:'Manche' },
  { id:'ouistreham', name:'Ouistreham', lat:49.2836, lon:-0.2492, region:'Manche' },
  { id:'courseulles', name:'Courseulles-sur-Mer', lat:49.3367, lon:-0.4600, region:'Manche' },
  { id:'arromanches', name:'Arromanches', lat:49.3389, lon:-0.6203, region:'Manche' },
  { id:'port_bessin', name:'Port-en-Bessin', lat:49.3526, lon:-0.7492, region:'Manche' },
  { id:'vierville', name:'Vierville-sur-Mer', lat:49.3839, lon:-0.9094, region:'Manche' },
  { id:'grandcamp', name:'Grandcamp-Maisy', lat:49.3878, lon:-1.0428, region:'Manche' },
  { id:'iles_saint_marcouf', name:'Iles Saint-Marcouf', lat:49.4972, lon:-1.1500, region:'Manche' },
  { id:'isigny', name:'Isigny-sur-Mer', lat:49.3217, lon:-1.1003, region:'Manche' },
  { id:'saint_vaast', name:'Saint-Vaast-la-Hougue', lat:49.5847, lon:-1.2664, region:'Manche' },
  { id:'barfleur', name:'Barfleur', lat:49.6708, lon:-1.2625, region:'Manche' },
  { id:'cherbourg', name:'Cherbourg', lat:49.6500, lon:-1.6167, region:'Manche' },
  { id:'omonville', name:'Omonville-la-Rogue', lat:49.7028, lon:-1.8358, region:'Manche' },
  { id:'goury', name:'Goury', lat:49.7186, lon:-1.9433, region:'Manche' },
  { id:'dielette', name:'Dielette', lat:49.5556, lon:-1.8628, region:'Manche' },
  { id:'carteret', name:'Carteret', lat:49.3667, lon:-1.7833, region:'Manche' },
  { id:'portbail', name:'Portbail', lat:49.3303, lon:-1.7019, region:'Manche' },
  { id:'saint_germain_ay', name:'Saint-Germain-sur-Ay', lat:49.2278, lon:-1.6181, region:'Manche' },
  { id:'pointe_agon', name:'Pointe d Agon', lat:49.0006, lon:-1.5786, region:'Manche' },
  { id:'granville', name:'Granville', lat:48.8333, lon:-1.5833, region:'Manche' },
  { id:'cancale', name:'Cancale', lat:48.6750, lon:-1.8533, region:'Manche' },
  { id:'saint_malo', name:'Saint-Malo', lat:48.6500, lon:-2.0167, region:'Manche' },
  { id:'iles_hebihens', name:'Iles des Hebihens', lat:48.6667, lon:-2.1278, region:'Bretagne' },
  { id:'saint_cast', name:'Saint-Cast', lat:48.6406, lon:-2.2647, region:'Bretagne' },
  { id:'erquy', name:'Erquy', lat:48.6311, lon:-2.4675, region:'Bretagne' },
  { id:'dahouet', name:'Dahouet', lat:48.5836, lon:-2.5658, region:'Bretagne' },
  { id:'saint_brieuc', name:'Baie de Saint-Brieuc - Le Legue', lat:48.5333, lon:-2.7333, region:'Bretagne' },
  { id:'binic', name:'Binic', lat:48.6017, lon:-2.8244, region:'Bretagne' },
  { id:'saint_quay', name:'Saint-Quay-Portrieux', lat:48.6481, lon:-2.8222, region:'Bretagne' },
  { id:'paimpol', name:'Paimpol', lat:48.7833, lon:-3.0500, region:'Bretagne' },
  { id:'port_beni', name:'Port-Beni', lat:48.8136, lon:-3.1239, region:'Bretagne' },
  { id:'les_heaux', name:'Les Heaux de Brehat', lat:48.9000, lon:-3.0833, region:'Bretagne' },
  { id:'treguier', name:'Treguier', lat:48.7872, lon:-3.2272, region:'Bretagne' },
  { id:'perros_guirec', name:'Perros-Guirec', lat:48.8131, lon:-3.4486, region:'Bretagne' },
  { id:'ploumanach', name:'Ploumanach', lat:48.8311, lon:-3.4811, region:'Bretagne' },
  { id:'trebeurden', name:'Trebeurden', lat:48.7717, lon:-3.5750, region:'Bretagne' },
  { id:'locquemeau', name:'Locquemeau', lat:48.7261, lon:-3.6175, region:'Bretagne' },
  { id:'locquirec', name:'Locquirec', lat:48.6917, lon:-3.6431, region:'Bretagne' },
  { id:'anse_primel', name:'Anse de Primel', lat:48.7064, lon:-3.7858, region:'Bretagne' },
  { id:'morlaix', name:'Baie de Morlaix - Carantec', lat:48.6667, lon:-3.9111, region:'Bretagne' },
  { id:'roscoff', name:'Roscoff', lat:48.7256, lon:-3.9817, region:'Bretagne' },
  { id:'brignogan', name:'Brignogan-Plage', lat:48.6700, lon:-4.3261, region:'Bretagne' },
  { id:'l_aber_wrach', name:'Aber Wrac h', lat:48.5961, lon:-4.5594, region:'Bretagne' },
  { id:'l_aber_benoit', name:'L Aber Benoit', lat:48.5719, lon:-4.6072, region:'Bretagne' },
  { id:'portsall', name:'Portsall', lat:48.5658, lon:-4.7094, region:'Bretagne' },
  { id:'l_aber_ildut', name:'L Aber Ildut - Lanildut', lat:48.4744, lon:-4.7531, region:'Bretagne' },
  { id:'le_conquet', name:'Le Conquet', lat:48.3614, lon:-4.7706, region:'Bretagne' },
  { id:'trez_hir', name:'Trez Hir', lat:48.3450, lon:-4.7039, region:'Bretagne' },
  { id:'brest', name:'Brest', lat:48.3833, lon:-4.4833, region:'Bretagne' },
  { id:'camaret', name:'Camaret-sur-Mer', lat:48.2833, lon:-4.5833, region:'Bretagne' },
  { id:'morgat', name:'Morgat', lat:48.2256, lon:-4.4928, region:'Bretagne' },
  { id:'douarnenez', name:'Douarnenez', lat:48.0950, lon:-4.3294, region:'Bretagne' },
  { id:'audierne', name:'Audierne', lat:48.0167, lon:-4.5333, region:'Bretagne' },
  { id:'penmarch', name:'Penmarch - Saint-Guenole', lat:47.8211, lon:-4.3711, region:'Bretagne' },
  { id:'le_guilvinec', name:'Le Guilvinec', lat:47.7975, lon:-4.2856, region:'Bretagne' },
  { id:'lesconil', name:'Lesconil', lat:47.7958, lon:-4.2147, region:'Bretagne' },
  { id:'loctudy', name:'Loctudy', lat:47.8350, lon:-4.1700, region:'Bretagne' },
  { id:'benodet', name:'Benodet', lat:47.8722, lon:-4.1064, region:'Bretagne' },
  { id:'penfret', name:'Penfret - Iles de Glenan', lat:47.7197, lon:-3.9519, region:'Bretagne' },
  { id:'concarneau', name:'Concarneau', lat:47.8667, lon:-3.9167, region:'Bretagne' },
  { id:'port_manech', name:'Port-Manech', lat:47.7986, lon:-3.7411, region:'Bretagne' },
  { id:'le_pouldu', name:'Le Pouldu', lat:47.7689, lon:-3.5408, region:'Bretagne' },
  { id:'lorient', name:'Lorient', lat:47.7500, lon:-3.3667, region:'Bretagne' },
  { id:'port_louis', name:'Port-Louis - Locmalo', lat:47.7081, lon:-3.3614, region:'Bretagne' },
  { id:'ile_groix', name:'Ile de Groix - Port Tudy', lat:47.6406, lon:-3.4500, region:'Bretagne' },
  { id:'etel', name:'Etel', lat:47.6594, lon:-3.2058, region:'Bretagne' },
  { id:'belle_ile', name:'Belle-Ile - Le Palais', lat:47.3464, lon:-3.1564, region:'Bretagne' },
  { id:'houat', name:'Houat', lat:47.3933, lon:-2.9528, region:'Bretagne' },
  { id:'hoedic', name:'Hoedic', lat:47.3392, lon:-2.8492, region:'Bretagne' },
  { id:'quiberon_haliguen', name:'Quiberon - Port Haliguen', lat:47.4892, lon:-3.1011, region:'Bretagne' },
  { id:'quiberon_maria', name:'Quiberon - Port Maria', lat:47.4814, lon:-3.1244, region:'Bretagne' },
  { id:'la_trinite', name:'La Trinite-sur-Mer', lat:47.5856, lon:-3.0264, region:'Bretagne' },
  { id:'locmariaquer', name:'Locmariaquer', lat:47.5681, lon:-2.9444, region:'Bretagne' },
  { id:'auray', name:'Auray - Saint-Goustan', lat:47.6644, lon:-2.9831, region:'Bretagne' },
  { id:'port_navalo', name:'Port-Navalo', lat:47.5469, lon:-2.9197, region:'Bretagne' },
  { id:'crouesty', name:'Port du Crouesty', lat:47.5439, lon:-2.8889, region:'Bretagne' },
  { id:'arradon', name:'Arradon', lat:47.6231, lon:-2.8133, region:'Bretagne' },
  { id:'le_logeo', name:'Le Logeo', lat:47.5414, lon:-2.8350, region:'Bretagne' },
  { id:'vannes', name:'Vannes', lat:47.6667, lon:-2.7500, region:'Bretagne' },
  { id:'penerf', name:'Penerf', lat:47.5089, lon:-2.6167, region:'Bretagne' },
  { id:'trehiguier', name:'Trehiguier', lat:47.5089, lon:-2.4825, region:'Bretagne' },
  { id:'piriac', name:'Le Croisic', lat:47.2925, lon:-2.5089, region:'Atlantique' },
  { id:'le_pouliguen', name:'Le Pouliguen', lat:47.2722, lon:-2.4256, region:'Atlantique' },
  { id:'pornichet', name:'Pornichet', lat:47.2628, lon:-2.3444, region:'Atlantique' },
  { id:'saint_nazaire', name:'Saint-Nazaire', lat:47.2667, lon:-2.2000, region:'Atlantique' },
  { id:'pointe_saint_gildas', name:'Pointe de Saint-Gildas', lat:47.1378, lon:-2.2433, region:'Atlantique' },
  { id:'pornic', name:'Pornic', lat:47.1156, lon:-2.0989, region:'Atlantique' },
  { id:'noirmoutier', name:'Noirmoutier - L Herbaudiere', lat:47.0150, lon:-2.2939, region:'Atlantique' },
  { id:'fromentine', name:'Fromentine', lat:46.8964, lon:-2.1383, region:'Atlantique' },
  { id:'ile_yeu', name:'Ile d Yeu', lat:46.7167, lon:-2.3500, region:'Atlantique' },
  { id:'saint_gilles', name:'Saint-Gilles-Croix-de-Vie', lat:46.6939, lon:-1.9447, region:'Atlantique' },
  { id:'les_sables', name:'Les Sables-d Olonne', lat:46.4944, lon:-1.7833, region:'Atlantique' },
  { id:'ile_re', name:'Ile de Re - Saint-Martin', lat:46.2025, lon:-1.3661, region:'Atlantique' },
  { id:'la_rochelle', name:'La Rochelle - La Pallice', lat:46.1500, lon:-1.1500, region:'Atlantique' },
  { id:'ile_oleron', name:'Ile d Oleron - La Cotiniere', lat:45.9094, lon:-1.3325, region:'Atlantique' },
  { id:'pointe_gatseau', name:'Pointe de Gatseau', lat:45.7917, lon:-1.2278, region:'Atlantique' },
  { id:'cordouan', name:'Cordouan', lat:45.5878, lon:-1.1733, region:'Atlantique' },
  { id:'royan', name:'Royan', lat:45.6167, lon:-1.0333, region:'Atlantique' },
  { id:'pointe_grave', name:'Pointe de Grave - Port Bloc', lat:45.5697, lon:-1.0625, region:'Atlantique' },
  { id:'richards', name:'Richards', lat:45.4222, lon:-1.0250, region:'Atlantique' },
  { id:'pauillac', name:'Pauillac', lat:45.1989, lon:-0.7464, region:'Atlantique' },
  { id:'bordeaux', name:'Bordeaux', lat:44.8378, lon:-0.5792, region:'Atlantique' },
  { id:'cap_ferret', name:'Cap Ferret', lat:44.6294, lon:-1.2553, region:'Atlantique' },
  { id:'arcachon', name:'Arcachon', lat:44.6594, lon:-1.1689, region:'Atlantique' },
  { id:'biscarrosse', name:'Biscarrosse', lat:44.4467, lon:-1.2547, region:'Atlantique' },
  { id:'mimizan', name:'Mimizan', lat:44.2078, lon:-1.2906, region:'Atlantique' },
  { id:'lacanau', name:'Lacanau Large', lat:45.0000, lon:-1.2500, region:'Atlantique' },
  { id:'vieux_boucau', name:'Vieux-Boucau', lat:43.7894, lon:-1.4014, region:'Atlantique' },
  { id:'capbreton', name:'Capbreton', lat:43.6500, lon:-1.4333, region:'Atlantique' },
  { id:'bayonne', name:'Boucau - Bayonne - Biarritz', lat:43.5283, lon:-1.5158, region:'Atlantique' },
  { id:'saint_jean_luz', name:'Saint-Jean-de-Luz', lat:43.3886, lon:-1.6622, region:'Atlantique' },
  { id:'port_vendres', name:'Port-Vendres', lat:42.5167, lon:3.1000, region:'Mediterranee' },
  { id:'sete', name:'Sete', lat:43.4000, lon:3.6833, region:'Mediterranee' },
  { id:'marseille', name:'Marseille', lat:43.2967, lon:5.3811, region:'Mediterranee' },
  { id:'toulon', name:'Toulon', lat:43.1167, lon:5.9333, region:'Mediterranee' },
  { id:'nice', name:'Nice', lat:43.7000, lon:7.2667, region:'Mediterranee' },
  { id:'ajaccio', name:'Ajaccio', lat:41.9167, lon:8.7333, region:'Mediterranee' },
  { id:'bastia', name:'Bastia', lat:42.7000, lon:9.4500, region:'Mediterranee' }
];

var API_MAREE_SITES = {
  // Manche Nord
  'dunkerque': 'dunkerque',
  'graveline': 'graveline',
  'calais': 'calais',
  'wissant': 'wissant',
  'boulogne': 'boulogne-sur-mer',
  'berck': 'berck-plage-fort-mahon',
  'cayeux': 'cayeux-sur-mer',
  'le_treport': 'le-treport',
  'dieppe': 'dieppe',
  'saint_valery_caux': 'saint-valery-en-caux',
  'fecamp': 'fecamp',
  'etretat': 'etretat',
  'le_havre_antifer': 'le-havre-antifer',
  'le_havre': 'le-havre',
  'honfleur': 'honfleur',
  'trouville': 'trouville-deauville',
  'dives': 'dives-sur-mer',
  'ouistreham': 'ouistreham',
  'courseulles': 'courseulles-sur-mer',
  'arromanches': 'arromanches-les-bains',
  'port_bessin': 'port-en-bessin',
  'vierville': 'vierville',
  'grandcamp': 'grandcamp',
  'iles_saint_marcouf': 'iles-saint-marcouf',
  'isigny': 'grandcamp',
  // Cotentin
  'saint_vaast': 'saint-vaast-la-hougue',
  'barfleur': 'barfleur',
  'cherbourg': 'cherbourg',
  'omonville': 'omonville-la-rogue',
  'goury': 'goury',
  'dielette': 'dielette',
  'carteret': 'carteret',
  'portbail': 'portbail',
  'saint_germain_ay': 'saint-germain-sur-ay',
  'pointe_agon': 'pointe-d-agon',
  'granville': 'granville',
  // Bretagne Nord
  'cancale': 'cancale',
  'saint_malo': 'saint-malo',
  'iles_hebihens': 'ile-des-hebihens',
  'saint_cast': 'saint-cast',
  'erquy': 'erquy',
  'dahouet': 'dahouet',
  'saint_brieuc': 'baie-de-saint-brieuc-le-legue',
  'binic': 'binic',
  'saint_quay': 'saint-quay-portrieux',
  'paimpol': 'paimpol',
  'port_beni': 'port-beni',
  'les_heaux': 'les-heaux-de-brehat',
  'treguier': 'treguier',
  'perros_guirec': 'perros-guirec',
  'ploumanach': 'ploumanach',
  'trebeurden': 'trebeurden',
  'locquemeau': 'locquemeau',
  'locquirec': 'locquirec',
  'anse_primel': 'anse-de-primel',
  'morlaix': 'baie-de-morlaix-carantec',
  'roscoff': 'roscoff',
  'brignogan': 'brignogan-plage',
  // Finistere Nord
  'l_aber_wrach': 'aber-wrac-h',
  'l_aber_benoit': 'l-aber-benoit',
  'portsall': 'portsall',
  'l_aber_ildut': 'laber-ildut-lanildut',
  'le_conquet': 'le-conquet',
  'trez_hir': 'trez-hir',
  'brest': 'brest',
  'camaret': 'camaret-sur-mer',
  'morgat': 'morgat',
  'douarnenez': 'douarnenez',
  'audierne': 'audierne',
  // Finistere Sud / Bretagne Sud
  'penmarch': 'penmarch-saint-guenole',
  'le_guilvinec': 'le-guilvinec',
  'lesconil': 'lesconil',
  'loctudy': 'loctudy',
  'benodet': 'benodet',
  'penfret': 'penfret-iles-de-glenan',
  'concarneau': 'concarneau',
  'port_manech': 'port-manech',
  'le_pouldu': 'le-pouldu',
  'lorient': 'lorient',
  'port_louis': 'port-louis-locmalo',
  'ile_groix': 'ile-de-groix-port-tudy',
  'etel': 'etel',
  'belle_ile': 'belle-ile-le-palais',
  'houat': 'houat',
  'hoedic': 'hoedic',
  'quiberon_haliguen': 'quiberon-port-haliguen',
  'quiberon_maria': 'quiberon-port-maria',
  'la_trinite': 'la-trinite-sur-mer',
  'locmariaquer': 'locmariaquer',
  'auray': 'auray-st-goustan',
  'port_navalo': 'port-navalo',
  'crouesty': 'port-du-crouesty',
  'arradon': 'arradon',
  'le_logeo': 'le-logeo',
  'vannes': 'vannes',
  'penerf': 'penerf',
  'trehiguier': 'trehiguier',
  // Loire-Atlantique / Vendee
  'piriac': 'le-croisic',
  'le_pouliguen': 'le-pouliguen',
  'pornichet': 'pornichet',
  'saint_nazaire': 'saint-nazaire',
  'pointe_saint_gildas': 'pointe-de-saint-gildas',
  'pornic': 'pornic',
  'noirmoutier': 'noirmoutier-l-herbaudiere',
  'fromentine': 'fromentine',
  'ile_yeu': 'ile-d-yeu',
  'saint_gilles': 'saint-gilles-croix-de-vie',
  'les_sables': 'les-sables-d-olonne',
  // Charentes
  'ile_re': 'ile-de-re-saint-martin',
  'la_rochelle': 'la-rochelle-pallice',
  'ile_oleron': 'ile-d-oleron-la-cotiniere',
  'pointe_gatseau': 'pointe-de-gatseau',
  // Gironde
  'cordouan': 'cordouan',
  'royan': 'royan',
  'pointe_grave': 'pointe-de-grave-port-bloc',
  'richards': 'richards',
  'pauillac': 'pauillac',
  'bordeaux': 'bordeaux',
  'cap_ferret': 'cap-ferret',
  'arcachon': 'arcachon',
  // Landes / Pays Basque
  'biscarrosse': 'biscarrosse',
  'mimizan': 'mimizan',
  'lacanau': 'lacanau-large',
  'vieux_boucau': 'vieux-boucau',
  'capbreton': 'boucau-bayonne-biarritz',
  'bayonne': 'boucau-bayonne-biarritz',
  'saint_jean_luz': 'saint-jean-de-luz',
  // Mediterranee : pas de marees significatives
  'port_vendres': null,
  'sete': null,
  'marseille': null,
  'toulon': null,
  'nice': null,
  'ajaccio': null,
  'bastia': null
};

// ============================================================
// WEBCAMS COTIERES - Source : Vision-Environnement (HD/4K)
// Couche toggleable affichee sur la carte avec popup integre
// ============================================================
var WEBCAMS = [
  // ============= NORMANDIE =============
  // Cote d'Albatre (Seine-Maritime)
  { id:'wc_treport', name:'Le Treport', lat:50.0578, lon:1.3742, url:'https://www.vision-environnement.com/live/player/letreport0.php' },
  { id:'wc_criel', name:'Criel-sur-Mer', lat:50.0214, lon:1.3097, url:'https://www.vision-environnement.com/live/player/criel0.php' },
  { id:'wc_dieppe_ango', name:'Dieppe - Ango', lat:49.9300, lon:1.0833, url:'https://www.vision-environnement.com/live/player/dieppe-ango0.php' },
  { id:'wc_ste_marguerite', name:'Sainte-Marguerite-sur-Mer', lat:49.9075, lon:0.9539, url:'https://www.vision-environnement.com/live/player/sainte-marguerite-sur-mer0.php' },
  { id:'wc_veules', name:'Veules-les-Roses', lat:49.8742, lon:0.7986, url:'https://www.vision-environnement.com/live/player/veules-les-roses0.php' },
  { id:'wc_svec', name:'Saint-Valery-en-Caux', lat:49.8678, lon:0.7100, url:'https://www.vision-environnement.com/live/player/saint-valery-en-caux-casino0.php' },
  { id:'wc_veulettes', name:'Veulettes-sur-Mer', lat:49.8492, lon:0.5972, url:'https://www.vision-environnement.com/live/player/veulettes-sur-mer0.php' },
  { id:'wc_cany', name:'Cany-Barville', lat:49.7861, lon:0.6394, url:'https://www.vision-environnement.com/live/player/cany-barville0.php' },
  { id:'wc_yport', name:'Yport', lat:49.7406, lon:0.3147, url:'https://www.vision-environnement.com/live/player/yport0.php' },
  { id:'wc_fecamp', name:'Fecamp', lat:49.7589, lon:0.3719, url:'https://www.vision-environnement.com/live/player/fecam0.php' },
  { id:'wc_etretat', name:'Etretat', lat:49.7075, lon:0.2058, url:'https://www.vision-environnement.com/live/player/etretat2-0.php' },
  { id:'wc_sjb', name:'Saint-Jouin-Bruneval', lat:49.6383, lon:0.1547, url:'https://www.vision-environnement.com/live/player/sjb0.php' },
  { id:'wc_le_havre', name:'Le Havre - Malraux', lat:49.4833, lon:0.1078, url:'https://www.vision-environnement.com/live/player/le-havre-malraux0.php' },
  // Cote Fleurie (Calvados)
  { id:'wc_trouville_port', name:'Trouville - Port', lat:49.3661, lon:0.0867, url:'https://www.vision-environnement.com/live/player/port-trouville-sur-mer0.php' },
  { id:'wc_trouville', name:'Trouville-sur-Mer', lat:49.3678, lon:0.0850, url:'https://www.vision-environnement.com/live/player/trouville0.php' },
  { id:'wc_houlgate', name:'Houlgate', lat:49.2986, lon:-0.0731, url:'https://www.vision-environnement.com/live/player/houlgate0.php' },
  { id:'wc_cabourg', name:'Cabourg', lat:49.2856, lon:-0.1247, url:'https://www.vision-environnement.com/live/player/cabourg0.php' },
  // Cote de Nacre (Calvados)
  { id:'wc_ouistreham', name:'Ouistreham', lat:49.2836, lon:-0.2492, url:'https://www.vision-environnement.com/live/player/ouistreham0.php' },
  { id:'wc_langrune', name:'Langrune-sur-Mer', lat:49.3289, lon:-0.3717, url:'https://www.vision-environnement.com/live/player/langrune-sur-mer0.php' },
  { id:'wc_luc', name:'Luc-sur-Mer', lat:49.3194, lon:-0.3539, url:'https://www.vision-environnement.com/live/player/luc-sur-mer0.php' },
  { id:'wc_staubin', name:'Saint-Aubin-sur-Mer', lat:49.3308, lon:-0.3936, url:'https://www.vision-environnement.com/live/player/staubin0.php' },
  // Cotentin (Manche)
  { id:'wc_stgermain', name:'Saint-Germain-sur-Ay', lat:49.2278, lon:-1.6181, url:'https://www.vision-environnement.com/live/player/stgermain0.php' },
  { id:'wc_pirou', name:'Pirou', lat:49.1717, lon:-1.5944, url:'https://www.vision-environnement.com/live/player/pirou0.php' },
  { id:'wc_jullouville', name:'Jullouville', lat:48.7711, lon:-1.5614, url:'https://www.vision-environnement.com/live/player/jullouville0.php' },
  // ============= BRETAGNE =============
  // Côte d'Émeraude (Ille-et-Vilaine, Côtes d'Armor Est)
  { id:'wc_saint_malo', name:'Saint-Malo', lat:48.6444, lon:-2.0258, url:'https://www.vision-environnement.com/live/player/saint-malo0.php' },
  { id:'wc_saint_malo_thermes', name:'Saint-Malo - Thermes', lat:48.6478, lon:-2.0492, url:'https://www.vision-environnement.com/live/player/saint-malo-thermes0.php' },
  { id:'wc_cancale', name:'Cancale', lat:48.6789, lon:-1.8511, url:'https://www.vision-environnement.com/live/player/cancale0.php' },
  { id:'wc_stcast', name:'Saint-Cast-le-Guildo', lat:48.6406, lon:-2.2647, url:'https://www.vision-environnement.com/live/player/stcast0.php' },
  { id:'wc_stcast_plage', name:'Saint-Cast - Plage', lat:48.6383, lon:-2.2706, url:'https://www.vision-environnement.com/live/player/st-cast-plage0.php' },
  { id:'wc_erquy', name:'Erquy', lat:48.6311, lon:-2.4675, url:'https://www.vision-environnement.com/live/player/erquy0.php' },
  // Côte du Goëlo (Côtes d'Armor)
  { id:'wc_etables', name:'Etables-sur-Mer', lat:48.6328, lon:-2.8403, url:'https://www.vision-environnement.com/live/player/etables-sur-mer0.php' },
  { id:'wc_binic', name:'Binic', lat:48.6017, lon:-2.8244, url:'https://www.vision-environnement.com/live/player/binic0.php' },
  { id:'wc_sqp', name:'Saint-Quay-Portrieux', lat:48.6481, lon:-2.8222, url:'https://www.vision-environnement.com/live/player/sqp0.php' },
  { id:'wc_sqpp', name:'Saint-Quay-Portrieux - Port', lat:48.6531, lon:-2.8189, url:'https://www.vision-environnement.com/live/player/sqpp0.php' },
  { id:'wc_plouezec', name:'Plouezec', lat:48.7322, lon:-3.0242, url:'https://www.vision-environnement.com/live/player/plouezec0.php' },
  { id:'wc_brehec', name:'Brehec', lat:48.7236, lon:-2.9858, url:'https://www.vision-environnement.com/live/player/brehec0.php' },
  { id:'wc_loguivy', name:'Ploubazlanec - Loguivy', lat:48.8328, lon:-3.0392, url:'https://www.vision-environnement.com/live/player/loguivy0.php' },
  // Côte de Granit Rose (Côtes d'Armor Ouest)
  { id:'wc_perrosguirec', name:'Perros-Guirec', lat:48.8131, lon:-3.4486, url:'https://www.vision-environnement.com/live/player/perrosguirec0.php' },
  { id:'wc_portperros', name:'Perros-Guirec - Port', lat:48.8156, lon:-3.4356, url:'https://www.vision-environnement.com/live/player/portperrosguirec0.php' },
  { id:'wc_perrosguirec4', name:'Perros-Guirec (vue 4)', lat:48.8181, lon:-3.4444, url:'https://www.vision-environnement.com/live/player/perrosguirec40.php' },
  { id:'wc_trestraou', name:'Perros-Guirec - Trestraou', lat:48.8244, lon:-3.4581, url:'https://www.vision-environnement.com/live/player/trestraou0.php' },
  { id:'wc_saint_guirec', name:'Perros-Guirec - Saint-Guirec', lat:48.8344, lon:-3.4811, url:'https://www.vision-environnement.com/live/player/saint-guirec0.php' },
  { id:'wc_ploumanach', name:'Ploumanach', lat:48.8311, lon:-3.4811, url:'https://www.vision-environnement.com/live/player/portploumanach0.php' },
  { id:'wc_tregastel', name:'Tregastel', lat:48.8267, lon:-3.5083, url:'https://www.vision-environnement.com/live/player/tregastel0.php' },
  { id:'wc_trevou', name:'Trevou-Treguignec', lat:48.8214, lon:-3.4083, url:'https://www.vision-environnement.com/live/player/trevou-treguinec0.php' },
  { id:'wc_locquirec', name:'Locquirec', lat:48.6917, lon:-3.6431, url:'https://www.vision-environnement.com/live/player/locquirec0.php' },
  // Baie de Morlaix / Léon (Finistère Nord)
  { id:'wc_plougasnou', name:'Plougasnou', lat:48.6997, lon:-3.7892, url:'https://www.vision-environnement.com/live/player/plougasnou0.php' },
  { id:'wc_morlaix', name:'Morlaix', lat:48.5783, lon:-3.8278, url:'https://www.vision-environnement.com/live/player/morlaix0.php' },
  { id:'wc_carantec', name:'Carantec', lat:48.6678, lon:-3.9111, url:'https://www.vision-environnement.com/live/player/carantec0.php' },
  { id:'wc_stpol', name:'Saint-Pol-de-Leon', lat:48.6856, lon:-3.9881, url:'https://www.vision-environnement.com/live/player/stpol0.php' },
  { id:'wc_roscoff', name:'Roscoff', lat:48.7256, lon:-3.9817, url:'https://www.vision-environnement.com/live/player/roscoff0.php' },
  { id:'wc_roscoff2', name:'Roscoff - Île de Batz', lat:48.7311, lon:-3.9928, url:'https://www.vision-environnement.com/live/player/Roscoff20.php' },
  { id:'wc_iledebatz', name:'Île de Batz', lat:48.7444, lon:-4.0125, url:'https://www.vision-environnement.com/live/player/iledebatz0.php' },
  { id:'wc_plouescat', name:'Plouescat', lat:48.6683, lon:-4.1817, url:'https://www.vision-environnement.com/live/player/plouescat0.php' },
  { id:'wc_plouescat_porsguen', name:'Plouescat - Porsguen', lat:48.6917, lon:-4.1972, url:'https://www.vision-environnement.com/live/player/plouescat-porsguen0.php' },
  // Pays des Abers / Iroise (Finistère Ouest)
  { id:'wc_landeda', name:'Landeda - Aber Wrac h', lat:48.5961, lon:-4.5594, url:'https://www.vision-environnement.com/live/player/landeda0.php' },
  { id:'wc_portsall', name:'Ploudalmezeau - Portsall', lat:48.5658, lon:-4.7094, url:'https://www.vision-environnement.com/live/player/portsall0.php' },
  { id:'wc_leconquet', name:'Le Conquet', lat:48.3614, lon:-4.7706, url:'https://www.vision-environnement.com/live/player/leconquet0.php' },
  { id:'wc_plougonvelin', name:'Plougonvelin', lat:48.3439, lon:-4.7178, url:'https://www.vision-environnement.com/live/player/plougonvelin0.php' },
  { id:'wc_brest_port', name:'Brest - Port', lat:48.3811, lon:-4.4953, url:'https://www.vision-environnement.com/live/player/brest-port0.php' },
  // Cap Sizun / Baie Audierne (Finistère SO)
  { id:'wc_pointe_raz', name:'Pointe du Raz', lat:48.0383, lon:-4.7392, url:'https://www.vision-environnement.com/live/player/pointe-du-raz0.php' },
  { id:'wc_trepasses', name:'Baie des Trepasses', lat:48.0414, lon:-4.6983, url:'https://www.vision-environnement.com/live/player/trepasses0.php' },
  { id:'wc_trepasses2', name:'Baie des Trepasses (vue 2)', lat:48.0397, lon:-4.7028, url:'https://www.vision-environnement.com/live/player/trepasses20.php' },
  { id:'wc_iledesein', name:'Île de Sein', lat:48.0367, lon:-4.8506, url:'https://www.vision-environnement.com/live/player/ile-de-sein0.php' },
  { id:'wc_esquibien', name:'Esquibien', lat:48.0167, lon:-4.5644, url:'https://www.vision-environnement.com/live/player/esquibien0.php' },
  { id:'wc_esquibien_pouldu', name:'Esquibien - Le Pouldu', lat:48.0114, lon:-4.5747, url:'https://www.vision-environnement.com/live/player/esquibien-le-pouldu0.php' },
  { id:'wc_audierne_port', name:'Audierne - Port', lat:48.0167, lon:-4.5333, url:'https://www.vision-environnement.com/live/player/audierne-port0.php' },
  { id:'wc_audierne_pass', name:'Audierne - Passerelle', lat:48.0142, lon:-4.5408, url:'https://www.vision-environnement.com/live/player/audierne-passerelle0.php' },
  { id:'wc_plouhinec', name:'Plouhinec - Pors Poulhan', lat:47.9892, lon:-4.4825, url:'https://www.vision-environnement.com/live/player/plouhinec-pors-poulhan0.php' },
  { id:'wc_douarnenez', name:'Douarnenez', lat:48.0950, lon:-4.3294, url:'https://www.vision-environnement.com/live/player/douarnenez0.php' },
  { id:'wc_douarnenez2', name:'Douarnenez (vue 2)', lat:48.0978, lon:-4.3322, url:'https://www.vision-environnement.com/live/player/douarnenez20.php' },
  { id:'wc_douarnenez_rosmeur', name:'Douarnenez - Rosmeur', lat:48.0956, lon:-4.3211, url:'https://www.vision-environnement.com/live/player/douarnenez-rosmeur0.php' },
  // Bretagne Sud (Morbihan)
  { id:'wc_quiberon', name:'Quiberon', lat:47.4839, lon:-3.1228, url:'https://www.vision-environnement.com/live/player/quiberon0.php' },
  { id:'wc_houat', name:'Houat', lat:47.3933, lon:-2.9528, url:'https://www.vision-environnement.com/live/player/houat0.php' },
  { id:'wc_gavres', name:'Gavres', lat:47.7042, lon:-3.3792, url:'https://www.vision-environnement.com/live/player/gavres0.php' },
  { id:'wc_vannes', name:'Vannes', lat:47.6478, lon:-2.7619, url:'https://www.vision-environnement.com/live/player/vannes0.php' },
  { id:'wc_damgan', name:'Damgan', lat:47.5083, lon:-2.5847, url:'https://www.vision-environnement.com/live/player/Damgan0.php' },
  { id:'wc_penestin', name:'Penestin', lat:47.4856, lon:-2.4858, url:'https://www.vision-environnement.com/live/player/penestin0.php' },
  // ============= PAYS DE LA LOIRE =============
  { id:'wc_piriac', name:'Piriac-sur-Mer', lat:47.3789, lon:-2.5469, url:'https://www.vision-environnement.com/live/player/piriac-sur-mer0.php' },
  { id:'wc_mesquer', name:'Mesquer - Lanseria', lat:47.3958, lon:-2.4503, url:'https://www.vision-environnement.com/live/player/lanseria0.php' },
  { id:'wc_labaule', name:'La Baule', lat:47.2867, lon:-2.4103, url:'https://www.vision-environnement.com/live/player/labaule0.php' },
  { id:'wc_gois', name:'Noirmoutier - Passage du Gois', lat:46.9419, lon:-2.1369, url:'https://www.vision-environnement.com/live/player/gois0.php' },
  { id:'wc_herbaudiere', name:'Noirmoutier - Herbaudiere', lat:47.0156, lon:-2.2997, url:'https://www.vision-environnement.com/live/player/herbaudiere0.php' },
  { id:'wc_portmorin', name:'Noirmoutier - Port de Morin', lat:46.9817, lon:-2.2728, url:'https://www.vision-environnement.com/live/player/noirmoutier-port-de-morin0.php' },
  { id:'wc_noirmoutier', name:'Noirmoutier en l Ile', lat:47.0028, lon:-2.2497, url:'https://www.vision-environnement.com/live/player/noirmoutier0.php' },
  { id:'wc_sthilaire', name:'Saint-Hilaire-de-Riez', lat:46.7197, lon:-1.9928, url:'https://www.vision-environnement.com/live/player/sthilairederiez0.php' },
  { id:'wc_olonnes', name:'Les Sables d Olonne', lat:46.4956, lon:-1.7958, url:'https://www.vision-environnement.com/live/player/olonnes0.php' },
  { id:'wc_jardsurmer', name:'Jard-sur-Mer', lat:46.4133, lon:-1.5772, url:'https://www.vision-environnement.com/live/player/jardsurmer0.php' },
  { id:'wc_latranche', name:'La Tranche-sur-Mer', lat:46.3461, lon:-1.4244, url:'https://www.vision-environnement.com/live/player/latranche0.php' },
  { id:'wc_tranche2', name:'La Tranche-sur-Mer (vue 2)', lat:46.3447, lon:-1.4275, url:'https://www.vision-environnement.com/live/player/tranche0.php' },
  // ============= NOUVELLE-AQUITAINE =============
  { id:'wc_bourcefranc', name:'Bourcefranc-le-Chapus', lat:45.8511, lon:-1.1492, url:'https://www.vision-environnement.com/live/player/bourcefranc0.php' },
  { id:'wc_chassiron', name:'Oleron - Phare de Chassiron', lat:46.0481, lon:-1.4111, url:'https://www.vision-environnement.com/live/player/chassiron0.php' },
  { id:'wc_stdenis', name:'Saint-Denis-d Oleron', lat:46.0339, lon:-1.3897, url:'https://www.vision-environnement.com/live/player/stdenis0.php' },
  { id:'wc_leshuttes', name:'Oleron - Les Huttes', lat:46.0181, lon:-1.4017, url:'https://www.vision-environnement.com/live/player/leshuttes0.php' },
  { id:'wc_ledouhet', name:'Port Le Douhet', lat:45.9697, lon:-1.3267, url:'https://www.vision-environnement.com/live/player/ledouhet0.php' },
  { id:'wc_perroche', name:'Oleron - La Perroche', lat:45.9131, lon:-1.3658, url:'https://www.vision-environnement.com/live/player/perroche0.php' },
  { id:'wc_cotiniere', name:'Oleron - La Cotiniere', lat:45.8969, lon:-1.3303, url:'https://www.vision-environnement.com/live/player/cotiniere0.php' },
  { id:'wc_sttrojan', name:'Saint-Trojan-les-Bains', lat:45.8344, lon:-1.2125, url:'https://www.vision-environnement.com/live/player/sttrojan0.php' },
  { id:'wc_tremblade', name:'La Tremblade', lat:45.7689, lon:-1.1394, url:'https://www.vision-environnement.com/live/player/tremblade0.php' },
  { id:'wc_mornac', name:'Mornac-sur-Seudre', lat:45.7283, lon:-1.0394, url:'https://www.vision-environnement.com/live/player/mornac0.php' },
  // ============= OCCITANIE =============
  { id:'wc_labenne', name:'Labenne', lat:43.5933, lon:-1.4639, url:'https://www.vision-environnement.com/live/player/labenne0.php' },
  { id:'wc_pilat', name:'Le Pilat', lat:44.5917, lon:-1.2156, url:'https://www.vision-environnement.com/live/player/pilat0.php' },
  { id:'wc_sete', name:'Sete', lat:43.4053, lon:3.6975, url:'https://www.vision-environnement.com/live/player/sete0.php' },
  // ============= PACA =============
  // Bouches-du-Rhone
  { id:'wc_carro', name:'Carro', lat:43.3328, lon:5.0414, url:'https://www.vision-environnement.com/live/player/carro0.php' },
  { id:'wc_marseilleport', name:'Marseille - Vieux Port', lat:43.2956, lon:5.3697, url:'https://www.vision-environnement.com/live/player/marseilleport0.php' },
  { id:'wc_marseille2', name:'Marseille - Panorama', lat:43.2864, lon:5.3589, url:'https://www.vision-environnement.com/live/player/marseille20.php' },
  { id:'wc_samena', name:'Marseille - Calanque Samena', lat:43.2419, lon:5.3614, url:'https://www.vision-environnement.com/live/player/samena0.php' },
  // Var
  { id:'wc_seyne', name:'La Seyne-sur-Mer', lat:43.0942, lon:5.8800, url:'https://www.vision-environnement.com/live/player/la-seyne-sur-mer0.php' },
  { id:'wc_lazaret', name:'Le Lazaret', lat:43.0789, lon:5.9183, url:'https://www.vision-environnement.com/live/player/le-lazaret0.php' },
  { id:'wc_st_mandrier', name:'Saint-Mandrier-sur-Mer', lat:43.0786, lon:5.9281, url:'https://www.vision-environnement.com/live/player/saint-mandrier0.php' },
  { id:'wc_sixfours', name:'Six-Fours-les-Plages', lat:43.0942, lon:5.8378, url:'https://www.vision-environnement.com/live/player/sixfours20.php' },
  { id:'wc_toulon_v', name:'Toulon - Vieille Darse', lat:43.1186, lon:5.9319, url:'https://www.vision-environnement.com/live/player/toulon-vieille-darse0.php' },
  { id:'wc_toulon_n', name:'Toulon - Darse Nord', lat:43.1175, lon:5.9342, url:'https://www.vision-environnement.com/live/player/toulon-darse-nord0.php' },
  { id:'wc_hyeres1', name:'Hyeres - Madrague', lat:43.0825, lon:6.1469, url:'https://www.vision-environnement.com/live/player/madrague0.php' },
  { id:'wc_hyeres2', name:'Hyeres', lat:43.0833, lon:6.1500, url:'https://www.vision-environnement.com/live/player/hyeres20.php' },
  { id:'wc_hyeres3', name:'Hyeres (vue 3)', lat:43.0856, lon:6.1517, url:'https://www.vision-environnement.com/live/player/hyeres30.php' },
  { id:'wc_hyeres4', name:'Hyeres (vue 4)', lat:43.0814, lon:6.1481, url:'https://www.vision-environnement.com/live/player/hyeres40.php' },
  { id:'wc_hyeres_kite', name:'Hyeres - Kite', lat:43.1011, lon:6.1497, url:'https://www.vision-environnement.com/live/player/hyeres-kite0.php' },
  { id:'wc_lavandou_a', name:'Le Lavandou - Aiguebelle', lat:43.1322, lon:6.3897, url:'https://www.vision-environnement.com/live/player/lavandou-aiguebelle0.php' },
  { id:'wc_lavandou_c', name:'Le Lavandou - Coco Beach', lat:43.1378, lon:6.3683, url:'https://www.vision-environnement.com/live/player/lavandou-coco-beach0.php' },
  { id:'wc_croix_valmer', name:'La Croix-Valmer', lat:43.2089, lon:6.5719, url:'https://www.vision-environnement.com/live/player/lily-of-the-valley-lily-of-the-valley0.php' },
  { id:'wc_croix_valmer2', name:'La Croix-Valmer - Lily of the Valley', lat:43.2114, lon:6.5747, url:'https://www.vision-environnement.com/live/player/lily-of-the-valley20.php' },
  { id:'wc_issambres', name:'Les Issambres', lat:43.3608, lon:6.7253, url:'https://www.vision-environnement.com/live/player/issambres0.php' },
  // Alpes-Maritimes
  { id:'wc_cannes', name:'Cannes', lat:43.5511, lon:7.0181, url:'https://www.vision-environnement.com/live/player/cannes0.php' },
  { id:'wc_cannes2', name:'Cannes (vue 2)', lat:43.5489, lon:7.0167, url:'https://www.vision-environnement.com/live/player/cannes20.php' },
  { id:'wc_cannes_qb', name:'Cannes - Quai Laubeuf', lat:43.5478, lon:7.0211, url:'https://www.vision-environnement.com/live/player/cannes-quai-laubeuf0.php' },
  { id:'wc_st_laurent', name:'Saint-Laurent-du-Var', lat:43.6661, lon:7.1872, url:'https://www.vision-environnement.com/live/player/saint-laurent-du-var0.php' },
  { id:'wc_villefranche1', name:'Villefranche-sur-Mer', lat:43.7039, lon:7.3097, url:'https://www.vision-environnement.com/live/player/villefranche-sur-mer0.php' },
  { id:'wc_villefranche2', name:'Villefranche-sur-Mer (vue 2)', lat:43.7058, lon:7.3128, url:'https://www.vision-environnement.com/live/player/villefranche-sur-mer20.php' },
  { id:'wc_menton', name:'Menton', lat:43.7747, lon:7.5025, url:'https://www.vision-environnement.com/live/player/menton0.php' },
  // ============= CORSE =============
  // Cap Corse / Bastia (Est)
  { id:'wc_bastia', name:'Bastia', lat:42.6975, lon:9.4503, url:'https://www.vision-environnement.com/live/player/bastia0.php' },
  // Balagne / Côte Ouest
  { id:'wc_ile_rousse', name:'L Ile Rousse', lat:42.6336, lon:8.9367, url:'https://www.vision-environnement.com/live/player/ile-rousse0.php' },
  { id:'wc_calvi', name:'Calvi', lat:42.5306, lon:8.7931, url:'https://www.vision-environnement.com/live/player/aero-calvi0.php' },
  { id:'wc_porto_ota', name:'Porto - Ota', lat:42.2725, lon:8.6953, url:'https://www.vision-environnement.com/live/player/porto-ota0.php' },
  { id:'wc_cargese', name:'Cargese', lat:42.1342, lon:8.5947, url:'https://www.vision-environnement.com/live/player/cargese0.php' },
  // Ajaccio
  { id:'wc_ajaccio_b', name:'Ajaccio', lat:41.9192, lon:8.7386, url:'https://www.vision-environnement.com/live/player/ajaccio-b0.php' },
  { id:'wc_ajaccio_pano', name:'Ajaccio - Panorama', lat:41.9244, lon:8.7361, url:'https://www.vision-environnement.com/live/player/ajaccio-panorama0.php' },
  { id:'wc_ajaccio4', name:'Ajaccio (vue 4)', lat:41.9281, lon:8.7344, url:'https://www.vision-environnement.com/live/player/ajaccio40.php' },
  { id:'wc_ajaccio_port', name:'Ajaccio - Port', lat:41.9214, lon:8.7383, url:'https://www.vision-environnement.com/live/player/ajaccioport0.php' },
  { id:'wc_ajaccio_port2', name:'Ajaccio - Port (vue 2)', lat:41.9217, lon:8.7375, url:'https://www.vision-environnement.com/live/player/ajaccioport20.php' },
  // Sud
  { id:'wc_propriano', name:'Propriano', lat:41.6764, lon:8.9039, url:'https://www.vision-environnement.com/live/player/propriano0.php' },
  { id:'wc_figari', name:'Figari', lat:41.5036, lon:9.0975, url:'https://www.vision-environnement.com/live/player/figari0.php' },
  { id:'wc_bonifacio', name:'Bonifacio', lat:41.3878, lon:9.1567, url:'https://www.vision-environnement.com/live/player/bonifacio0.php' },
  // Porto-Vecchio (Est)
  { id:'wc_porto_vecchio', name:'Porto-Vecchio', lat:41.5908, lon:9.2792, url:'https://www.vision-environnement.com/live/player/porto-vecchio0.php' },
  { id:'wc_pv_port', name:'Porto-Vecchio - Port', lat:41.5897, lon:9.2867, url:'https://www.vision-environnement.com/live/player/portportovecchio0.php' },
  { id:'wc_pv2', name:'Porto-Vecchio (vue 2)', lat:41.5908, lon:9.2839, url:'https://www.vision-environnement.com/live/player/portovecchio20.php' },
  { id:'wc_santa_giulia', name:'Porto-Vecchio - Santa Giulia', lat:41.5256, lon:9.2742, url:'https://www.vision-environnement.com/live/player/santa-giulia0.php' },
    // ============= COTENTIN (Viewsurf via encotentin.fr) =============
  { id:'wc_goury', name:'Goury - La Hague', lat:49.7178, lon:-1.9436, url:'https://pv.viewsurf.com/1552/La-Hague-Goury' },
  { id:'wc_urville', name:'Urville-Nacqueville - La Hague', lat:49.6794, lon:-1.7225, url:'https://pv.viewsurf.com/830/La-Hague-Nacqueville' },
  { id:'wc_vauville', name:'Vauville - La Hague', lat:49.6323, lon:-1.8493, url:'https://pv.viewsurf.com/826/La-Hague-Vauville' },
  { id:'wc_collignon', name:'Cherbourg - Plage de Collignon', lat:49.6567, lon:-1.5678, url:'https://pv.viewsurf.com/2322/Cherbourg-Plage-de-Colignon' },
];

var S_webcamsLayer = null;
var S_webcamsActive = false;

function toggleWebcams() {
  S_webcamsActive = !S_webcamsActive;
  if (S_webcamsActive) closeSpotPopup();
  var btn = document.getElementById('btnWebcams');
  if (btn) btn.classList.toggle('active', S_webcamsActive);
  if (S_webcamsActive) {
    showWebcamsLayer();
  } else {
    hideWebcamsLayer();
  }
}

function showWebcamsLayer() {
  if (S_webcamsLayer) return;
  var markers = [];
  WEBCAMS.forEach(function(wc) {
    var icon = L.divIcon({
      className: '',
      html: '<div class="webcam-marker">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="0.5">' +
        '<path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/>' +
        '</svg></div>',
      iconSize: [32, 32], iconAnchor: [16, 16]
    });
    var m = L.marker([wc.lat, wc.lon], { icon: icon });
    m.bindTooltip('<b>Webcam ' + wc.name + '</b><br><span style="font-size:10px;opacity:0.85">Cliquer pour voir le live</span>', {
      direction: 'top', className: 'visim-tooltip', offset: [0, -10]
    });
    m.on('click', function(e) {
      L.DomEvent.stopPropagation(e);
      openWebcamPopup(wc);
    });
    markers.push(m);
  });
  S_webcamsLayer = L.featureGroup(markers).addTo(S.map);
}

function hideWebcamsLayer() {
  if (S_webcamsLayer) {
    S.map.removeLayer(S_webcamsLayer);
    S_webcamsLayer = null;
  }
  closeWebcamPopup();
}

function openWebcamPopup(wc) {
  closeWebcamPopup();
  var html =
    '<div id="webcamPopup">' +
      '<div class="webcam-popup-header">' +
        '<div class="webcam-popup-title">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8E63D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;">' +
          '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' +
          'Webcam : ' + wc.name +
        '</div>' +
        '<button class="webcam-popup-close" onclick="closeWebcamPopup()">&times;</button>' +
      '</div>' +
      '<div class="webcam-popup-body">' +
        '<iframe src="' + wc.url + '" id="webcamIframe" allowfullscreen></iframe>' +
        '<div class="webcam-popup-fallback" id="webcamFallback" style="display:none;">' +
          '<p>L affichage integre n est pas disponible pour cette webcam.</p>' +
          '<a href="' + wc.url + '" target="_blank" rel="noopener" class="webcam-popup-btn">Voir le live HD →</a>' +
        '</div>' +
      '</div>' +
      '<div class="webcam-popup-footer">' +
        '<a href="' + wc.url + '" target="_blank" rel="noopener">Plein ecran ↗</a>' +
        '' +
      '</div>' +
    '</div>';
  var div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstChild);
  // Detection iframe bloquee : si elle ne charge pas en 4s, fallback
  setTimeout(function() {
    var iframe = document.getElementById('webcamIframe');
    if (!iframe) return;
    try {
      var doc = iframe.contentDocument || iframe.contentWindow.document;
      if (!doc || doc.body.innerHTML === '') {
        document.getElementById('webcamFallback').style.display = 'flex';
        iframe.style.display = 'none';
      }
    } catch(e) {
      // X-Frame-Options bloque l acces : c est ok l iframe charge quand meme
    }
  }, 4000);
}

function closeWebcamPopup() {
  var p = document.getElementById('webcamPopup');
  if (p) p.remove();
}

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

// ============================================================
// STATE MAREES MULTI-JOURS
// ============================================================
var TIDES = {
  siteId: null,
  siteName: null,
  lat: null,
  lon: null,
  from: null,
  days: 7,
  data: null,
  extremes: null,
  selectedDate: null
};
var CHASSABLE_WINDOW_MINUTES = 120;

// ============================================================
// STATE MAREES MULTI-JOURS
// ============================================================
var TIDES = {
  siteId: null,
  siteName: null,
  lat: null,
  lon: null,
  from: null,
  days: 7,
  data: null,
  extremes: null,
  selectedDate: null
};
var CHASSABLE_WINDOW_MINUTES = 120;

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
  canvas: null, ctx: null, _spotDepth: 5,
  showLitto3d: true, litto3d: null
};

var S_forecastOpen = false;
var S_windUnit = 'kt';
var S_lastForecastData = null;
var S_gridScores = [];
var S_gridUpdatedAt = null;
var S_spotWeatherCache = null;
var S_spotSatelliteCache = null;   // Sprint 2 : { lat, lon, data: {...} } ou null
var S_spotCoriolisCache = null;  // Sprint 3 — mesure terrain Coriolis Côtier IFREMER
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

// ============================================================
// FALLBACK PROFONDEUR EMODnet (zones hors-Europe)
// ------------------------------------------------------------
// Conservé uniquement pour les cas où EMODnet REST depth_sample
// échoue ou retourne null (DOM, Méditerranée hors couverture
// européenne, panne de service). Sur zone européenne, jamais
// appelé — la profondeur est lue directement depuis depth_sample
// avec précision sub-métrique (cf. fetchRealDepth ci-dessous).
// La calibration ×2.5 + plancher 3m vient d'une rustine Manche
// orientale ; ne pas étendre au chemin nominal.
// ============================================================
function correctEmodnetDepth(rawDepth) {
  if (rawDepth === null || rawDepth === undefined) return null;
  if (rawDepth < 1.2) return 3.0;
  return Math.round(rawDepth * 2.5 * 10) / 10;
}

// ============================================================
// fetchRealDepth - retourne la profondeur native EMODnet
// ------------------------------------------------------------
// Source : EMODnet REST depth_sample. Précision sub-métrique
// sur zones côtières densément levées (multi-beam), ~115m de
// base sinon (DTM 2024). Référence verticale LAT (zéro hydro).
//
// Point d'entrée unique pour toute consommation de profondeur
// dans l'app. Signature : Promise<number|null>. Tous les
// consommateurs (renderSpotPopup, visScoreV2, renderDecantation,
// buildVisExplanation, vzmRenderSpotMobile, loadSheetConditions,
// saveSession) passent par S._spotDepth qui sort d'ici.
//
// En parallèle, expose S._spotBathy avec les statistiques
// complètes (min, max, stdev, nbSondes, source) pour usages
// futurs : indicateur fiabilité, enrichissement algo, popup
// "fond varié". Aucun consommateur actuel ne lit S._spotBathy.
//
// Cache v3 : précision lat.toFixed(4) (~10m), invalide
// naturellement les anciens caches v2 corrompus.
//
// Fallback : si EMODnet REST échoue (hors-Europe, panne),
// bascule sur l'ancien endpoint depth/point + correctEmodnetDepth.
// ============================================================
function fetchRealDepth(lat, lon) {
  var cacheKey = 'vizi_depth_v3_' + lat.toFixed(4) + '_' + lon.toFixed(4);
  try {
    var cached = localStorage.getItem(cacheKey);
    if (cached) {
      var obj = JSON.parse(cached);
      if (obj && obj.bathy) S._spotBathy = obj.bathy;
      return Promise.resolve(obj.depth);
    }
  } catch(e) {}

  var url = 'https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(' + lon + ' ' + lat + ')';
  return fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && typeof data.avg === 'number') {
        var depth = Math.abs(data.avg);
        if (depth > 0 && depth < 1000) {
          var bathy = {
            avg: depth,
            // EMODnet retourne min/max en LAT (valeurs negatives en mer).
            // Math.abs(data.max) = profondeur la moins profonde (valeur la moins
            // negative). Math.abs(data.min) = profondeur la plus profonde
            // (valeur la plus negative). On inverse pour avoir la semantique
            // humaine attendue : min = peu profond, max = profond.
            min: typeof data.max === 'number' ? Math.abs(data.max) : null,
            max: typeof data.min === 'number' ? Math.abs(data.min) : null,
            stdev: typeof data.stdev === 'number' ? data.stdev : null,
            nbSondes: typeof data.elementarySurfaces === 'number' ? data.elementarySurfaces : null,
            source: data.reference && data.reference.identifier ? data.reference.identifier : 'EMODnet'
          };
          S._spotBathy = bathy;
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ depth: depth, bathy: bathy }));
          } catch(e) {}
          return depth;
        }
      }
      return fetchDepthFallback(lat, lon);
    })
    .catch(function() { return fetchDepthFallback(lat, lon); });
}

// Fallback hors-Europe ou panne EMODnet REST : ancien endpoint
// depth/point + correctEmodnetDepth. Ne jamais utiliser hors fallback.
function fetchDepthFallback(lat, lon) {
  var url = 'https://rest.emodnet-bathymetry.eu/depth/point?geom=POINT(' + lon + ' ' + lat + ')';
  return fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && typeof data.avg === 'number') {
        var rawDepth = Math.abs(data.avg);
        if (rawDepth > 0 && rawDepth < 1000) {
          S._spotBathy = null;
          return correctEmodnetDepth(rawDepth);
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
// ============================================================
// LITTO3D SHOM - Bathymetrie haute resolution cotiere France entiere
// ------------------------------------------------------------
// 6 sous-couches WMS SHOM regroupees dans un L.layerGroup, chacune
// avec son bounds geographique issu du GetCapabilities INSPIRE.
// L'usage des bounds evite les requetes hors emprise.
// Service WMS INSPIRE SHOM : libre d'usage avec mention obligatoire.
// Pas de proxy GAS necessaire pour l'affichage (tuiles PNG, pas CORS).
// ============================================================
function initLitto3dLayer() {
  var SHOM_WMS = 'https://services.data.shom.fr/INSPIRE/wms/r';
  var common = {
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    attribution: '&copy; SHOM Litto3D',
    opacity: 1.0,
    maxZoom: 19
  };
  function makeLayer(layerName, southWest, northEast) {
    var opts = Object.assign({}, common, {
      layers: layerName,
      bounds: L.latLngBounds(southWest, northEast)
    });
    return L.tileLayer.wms(SHOM_WMS, opts);
  }
  // Bounds [latMin, lonMin] / [latMax, lonMax] issus du GetCapabilities SHOM
  var subLayers = [
    // Bretagne
    makeLayer('LITTO3D_BZH_2018_2021_PYR_3857_WMSR', [47.24, -3.87], [49.00, -1.37]),
    // Normandie + Hauts-de-France
    makeLayer('L3D_MAR_NHDF_2016_2018_PYR_3857_WMSR', [48.57, -1.98], [51.17,  2.96]),
    // Nouvelle-Aquitaine
    makeLayer('LITTO3D_NAQ_2020_2022_PYR_3857_WMSR', [43.30, -1.85], [46.30, -0.95]),
    // Languedoc-Roussillon
    makeLayer('LITTO3D_LR_2009_PYR_3857_WMSR', [42.30,  2.85], [43.70,  4.85]),
    // PACA
    makeLayer('LITTO3D_PACA_2015_PYR_3857_WMSR', [42.95,  4.85], [43.95,  7.55]),
    // Corse
    makeLayer('L3D_LIDAR_CORSE_2017_2018_PYR_3857_WMSR', [41.30,  8.45], [43.10,  9.65])
  ];
  S.litto3d = L.layerGroup(subLayers);
}
function initMap() {
  S.map = L.map('map', { center:[49.32, -0.55], zoom:11, zoomControl:false });

S.basemapSat = L.layerGroup([
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imagery Esri | SHOM | EMODnet', maxZoom: 19
    }),
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: '', maxZoom: 19, opacity: 0.45
    })
  ]);
  S.basemapIGN = L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png', {
    attribution: 'IGN-F/Geoportail', maxZoom: 18
  });
  var savedBasemap = null;
  try { savedBasemap = localStorage.getItem('vizi_basemap'); } catch(e) {}
  if (savedBasemap === 'ign') { S.basemapIGN.addTo(S.map); S.currentBasemap = 'ign'; }
  else { S.basemapSat.addTo(S.map); S.currentBasemap = 'sat'; }

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

initLitto3dLayer();
  S.litto3d.addTo(S.map);
  S.litto3d.eachLayer(function(l) { if (l.bringToBack) l.bringToBack(); });
  if (S.basemapSat) S.basemapSat.eachLayer(function(l) { if (l.bringToBack) l.bringToBack(); });
  S.isoDeep.addTo(S.map);

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
    // Si le bandeau bas est déployé, le clic sur la carte le ferme et stop
    var sheet = document.getElementById('vzSheet');
    if (sheet && (sheet.classList.contains('sheet-half') || sheet.classList.contains('sheet-full'))) {
      closeSheetCompletely();
      return;
    }
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
  } else if (type === 'litto3d') {
    S.showLitto3d = !S.showLitto3d;
    var btnL = document.getElementById('btnLitto3d');
    if (btnL) btnL.classList.toggle('active', S.showLitto3d);
    if (S.showLitto3d) {
      S.litto3d.addTo(S.map);
      // Ordre Z : basemap < Litto3D < sediment/isobathes/markers
      S.litto3d.eachLayer(function(l) { if (l.bringToBack) l.bringToBack(); });
      // Remet la basemap encore plus en arriere
      if (S.currentBasemap === 'sat' && S.map.hasLayer(S.basemapSat)) {
        S.basemapSat.eachLayer(function(l) { if (l.bringToBack) l.bringToBack(); });
      } else if (S.currentBasemap === 'ign' && S.map.hasLayer(S.basemapIGN)) {
        if (S.basemapIGN.bringToBack) S.basemapIGN.bringToBack();
      }
    } else {
      if (S.map.hasLayer(S.litto3d)) S.map.removeLayer(S.litto3d);
    }
  }
}
function switchBasemap(type) {
  if (S.currentBasemap === type) return;
  if (S.currentBasemap === 'sat' && S.map.hasLayer(S.basemapSat)) S.map.removeLayer(S.basemapSat);
  else if (S.currentBasemap === 'ign' && S.map.hasLayer(S.basemapIGN)) S.map.removeLayer(S.basemapIGN);
  if (type === 'sat') {
    S.basemapSat.addTo(S.map);
    S.basemapSat.eachLayer(function(l){ if (l.bringToBack) l.bringToBack(); });
  } else {
    S.basemapIGN.addTo(S.map);
    if (S.basemapIGN.bringToBack) S.basemapIGN.bringToBack();
  }
  var btnSat = document.getElementById('btnBasemapSat');
  var btnIgn = document.getElementById('btnBasemapIGN');
  if (btnSat) btnSat.classList.toggle('active', type === 'sat');
  if (btnIgn) btnIgn.classList.toggle('active', type === 'ign');
  try { localStorage.setItem('vizi_basemap', type); } catch(e) {}
  S.currentBasemap = type;
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
// h.windspeed_10m / h.windgusts_10m sont en km/h (cf API Open-Meteo).
    // On convertit en nds pour computeZoneScore qui compare aux seuils nds.
    var windKmh = h.windspeed_10m ? (h.windspeed_10m[idx] || 0) : 0;
    var gustsKmh = h.windgusts_10m ? (h.windgusts_10m[idx] || 0) : 0;
    var wind = windKmh * 0.539957;
    var gusts = gustsKmh * 0.539957;
    var dir = h.winddirection_10m ? (h.winddirection_10m[idx] || 0) : 0;
    var wave = h.wave_height ? (h.wave_height[idx] || 0) : 0;
    var rain = h.precipitation ? (h.precipitation[idx] || 0) : 0;
    var score = computeZoneScore(wind, gusts, dir, wave, rain, props, h, idx, lat, lon);
    // Affichage : on conserve windKmh dans result.wind pour compatibilite tooltip
    var result = { score: score, wind: Math.round(windKmh), gusts: Math.round(gustsKmh), dir: Math.round(dir), wave: wave, label: scoreToLabel(score) };
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
  
  // Si on ouvre le panneau et qu'on n'a pas encore charge de previsions, on charge automatiquement
  if (S_forecastOpen && !S_lastForecastData) {
    var refLat = null, refLon = null, refName = null;
    
    // Priorite 1 : point clique sur la carte
    if (S.clickLatLng) {
      refLat = S.clickLatLng.lat;
      refLon = S.clickLatLng.lng;
    }
    // Priorite 2 : position GPS de l'utilisateur
    else if (GEO_STATE.userLatLng) {
      refLat = GEO_STATE.userLatLng.lat;
      refLon = GEO_STATE.userLatLng.lon;
    }
    
    // Si on a une reference, on cherche le port le plus proche
    if (refLat !== null) {
      var nearest = findNearestPort(refLat, refLon);
      if (nearest) {
        refLat = nearest.spot.lat;
        refLon = nearest.spot.lon;
        refName = nearest.spot.name;
      }
      loadForecast(refLat, refLon, refName);
    }
    // Sinon, port par defaut (Cherbourg)
    else {
      var defaultPort = SPOTS.find(function(s){ return s.id === 'cherbourg'; }) || SPOTS[0];
      if (defaultPort) {
        loadForecast(defaultPort.lat, defaultPort.lon, defaultPort.name);
      }
    }
  }
}

function closeForecast() {
  S_forecastOpen = false;
  document.getElementById('btnWind').classList.remove('active');
  document.getElementById('forecastPanel').style.display = 'none';
}
// ============================================================
// PATCH METEO VIZI - Remplacer les 2 fonctions existantes dans vizi-app.js
// ============================================================
// - loadForecast : utilise maintenant AROME (48h) + ARPEGE (au-dela)
// - renderForecastTable : fleches directionnelles + ligne nebulosite
//
// A copier/coller tel quel en remplacement des 2 fonctions actuelles.
// Ne touche a rien d'autre dans vizi-app.js.
// ============================================================

function loadForecast(lat, lon, locationName) {
  S_forecastOpen = true;
  document.getElementById('btnWind').classList.add('active');
  document.getElementById('forecastPanel').style.display = 'block';
  document.getElementById('forecastLocation').textContent = locationName || (lat.toFixed(4) + ', ' + lon.toFixed(4));
  document.getElementById('forecastCoords').textContent = lat.toFixed(4) + 'N ' + lon.toFixed(4) + 'E';
  document.getElementById('forecastTable').innerHTML = '<div style="padding:18px;text-align:center;color:#94A3B8;font-family:IBM Plex Mono,monospace;font-size:10px;">Chargement previsions...</div>';

  // Strategie hybride : AROME pour les 48 premieres heures (haute resolution 1.3km)
  // puis ARPEGE pour J+2 a J+4 (plus grossier mais couverture plus longue)
  // On fait 2 appels paralleles et on fusionne.

  var aromeUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon
    + '&hourly=windspeed_10m,winddirection_10m,windgusts_10m,wave_height,wave_period,wave_direction,temperature_2m,precipitation,cloud_cover'
    + '&wind_speed_unit=kmh&timezone=Europe/Paris&past_days=0&forecast_days=2'
    + '&models=meteofrance_arome_france';

  var arpegeUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon
    + '&hourly=windspeed_10m,winddirection_10m,windgusts_10m,wave_height,wave_period,wave_direction,temperature_2m,precipitation,cloud_cover'
    + '&wind_speed_unit=kmh&timezone=Europe/Paris&past_days=0&forecast_days=5'
    + '&models=meteofrance_arpege_europe';

  Promise.all([
    fetch(aromeUrl).then(function(r){ return r.json(); }),
    fetch(arpegeUrl).then(function(r){ return r.json(); })
  ]).then(function(results) {
    var arome = results[0];
    var arpege = results[1];

    if (!arome.hourly && !arpege.hourly) throw new Error('Pas de donnees');

    // Fusion : AROME prioritaire sur les heures couvertes, ARPEGE pour le reste
    var fused = fuseForecasts(arome.hourly, arpege.hourly);
    S_lastForecastData = { h: fused.h, now: new Date(), modelMap: fused.modelMap };
    renderForecastTable(fused.h, new Date(), fused.modelMap);
  }).catch(function(e) {
    document.getElementById('forecastTable').innerHTML = '<div style="padding:18px;color:#DC2626;font-family:IBM Plex Mono,monospace;font-size:10px;">Erreur : ' + e.message + '</div>';
  });
}

// Fusionne AROME (haute res, court terme) et ARPEGE (moyenne res, moyen terme)
// Retourne un objet hourly unifie + une carte timestamp -> 'AROME'|'ARPEGE'
function fuseForecasts(arome, arpege) {
  if (!arpege || !arpege.time) return { h: arome, modelMap: {} };
  if (!arome || !arome.time) {
    var mapAll = {};
    arpege.time.forEach(function(t){ mapAll[t] = 'ARPEGE'; });
    return { h: arpege, modelMap: mapAll };
  }

  var modelMap = {};
  var aromeSet = {};
  arome.time.forEach(function(t){ aromeSet[t] = true; });

  // On prend tout ARPEGE comme base, puis on ecrase avec AROME quand dispo
  var keys = ['windspeed_10m','winddirection_10m','windgusts_10m','wave_height','wave_period','wave_direction','temperature_2m','precipitation','cloud_cover'];
  var result = { time: arpege.time.slice() };
  keys.forEach(function(k){ result[k] = arpege[k] ? arpege[k].slice() : []; });

  // Pour chaque timestamp ARPEGE, si AROME l'a aussi, on prend AROME
  for (var i = 0; i < result.time.length; i++) {
    var t = result.time[i];
    if (aromeSet[t]) {
      var aIdx = arome.time.indexOf(t);
      if (aIdx >= 0) {
        keys.forEach(function(k){
          if (arome[k] && arome[k][aIdx] !== null && arome[k][aIdx] !== undefined) {
            result[k][i] = arome[k][aIdx];
          }
        });
        modelMap[t] = 'AROME';
      } else {
        modelMap[t] = 'ARPEGE';
      }
    } else {
      modelMap[t] = 'ARPEGE';
    }
  }

  return { h: result, modelMap: modelMap };
}

function renderForecastTable(h, now, modelMap) {
  modelMap = modelMap || {};
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

  // Fleche SVG en fonction de l'angle de provenance du vent
  // Le vent de 0 deg vient du Nord -> la fleche pointe vers le Sud (bas)
  // On ajoute donc 180 a la direction pour obtenir l'orientation de la fleche
  function windArrowSvg(deg, isNow) {
    if (deg === null || deg === undefined) return '-';
    var rot = deg;
    var col = isNow ? '#1A2535' : '#4A6080';
    return '<svg width="14" height="14" viewBox="0 0 20 20" style="transform:rotate(' + rot + 'deg);display:inline-block;vertical-align:middle;">'
      + '<path d="M10 2 L10 16 M10 16 L6 12 M10 16 L14 12" stroke="' + col + '" stroke-width="2" stroke-linecap="round" fill="none"/>'
      + '</svg>';
  }

  // Icone nebulosite + pluie : soleil < 25%, peu nuageux < 50%, nuageux < 80%, couvert >= 80%
  // Si pluie > 0.3mm/h, priorite a l'icone pluie
  function weatherIcon(cloudPct, rainMm, isNow) {
    var baseColor = isNow ? '#1A2535' : '#4A6080';
    if (rainMm !== null && rainMm !== undefined && rainMm >= 0.3) {
      var rainIntensity = rainMm >= 2 ? '3' : rainMm >= 1 ? '2' : '1';
      // Pluie : nuage avec gouttes
      return '<svg width="20" height="20" viewBox="0 0 24 24" style="display:inline-block;vertical-align:middle;">'
        + '<path d="M6 13 Q3 13 3 10 Q3 7 6 7 Q7 4 11 4 Q15 4 16 7 Q20 7 20 10 Q20 13 17 13 Z" fill="#64748B" stroke="' + baseColor + '" stroke-width="0.5"/>'
        + (rainIntensity >= '1' ? '<line x1="8" y1="16" x2="7" y2="20" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round"/>' : '')
        + (rainIntensity >= '2' ? '<line x1="12" y1="16" x2="11" y2="20" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round"/>' : '')
        + (rainIntensity >= '3' ? '<line x1="16" y1="16" x2="15" y2="20" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round"/>' : '')
        + '</svg>';
    }
    if (cloudPct === null || cloudPct === undefined) return '-';
    if (cloudPct < 25) {
      // Soleil
      return '<svg width="20" height="20" viewBox="0 0 24 24" style="display:inline-block;vertical-align:middle;">'
        + '<circle cx="12" cy="12" r="4" fill="#FBBF24"/>'
        + '<g stroke="#FBBF24" stroke-width="2" stroke-linecap="round">'
        + '<line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>'
        + '<line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>'
        + '<line x1="4.9" y1="4.9" x2="7" y2="7"/><line x1="17" y1="17" x2="19.1" y2="19.1"/>'
        + '<line x1="4.9" y1="19.1" x2="7" y2="17"/><line x1="17" y1="7" x2="19.1" y2="4.9"/>'
        + '</g></svg>';
    }
    if (cloudPct < 55) {
      // Soleil avec petit nuage
      return '<svg width="20" height="20" viewBox="0 0 24 24" style="display:inline-block;vertical-align:middle;">'
        + '<circle cx="9" cy="9" r="3.5" fill="#FBBF24"/>'
        + '<g stroke="#FBBF24" stroke-width="1.5" stroke-linecap="round">'
        + '<line x1="9" y1="2" x2="9" y2="4"/><line x1="2" y1="9" x2="4" y2="9"/>'
        + '<line x1="3.5" y1="3.5" x2="5" y2="5"/><line x1="14.5" y1="3.5" x2="13" y2="5"/>'
        + '</g>'
        + '<path d="M10 15 Q8 15 8 13 Q8 11 10 11 Q11 9 14 9 Q17 9 17 11 Q19 11 19 13 Q19 15 17 15 Z" fill="#CBD5E0" stroke="#64748B" stroke-width="0.5"/>'
        + '</svg>';
    }
    if (cloudPct < 85) {
      // Nuageux
      return '<svg width="20" height="20" viewBox="0 0 24 24" style="display:inline-block;vertical-align:middle;">'
        + '<path d="M6 17 Q3 17 3 14 Q3 11 6 11 Q7 8 11 8 Q15 8 16 11 Q20 11 20 14 Q20 17 17 17 Z" fill="#94A3B8" stroke="' + baseColor + '" stroke-width="0.5"/>'
        + '</svg>';
    }
    // Couvert
    return '<svg width="20" height="20" viewBox="0 0 24 24" style="display:inline-block;vertical-align:middle;">'
      + '<path d="M6 17 Q3 17 3 14 Q3 11 6 11 Q7 8 11 8 Q15 8 16 11 Q20 11 20 14 Q20 17 17 17 Z" fill="#475569" stroke="' + baseColor + '" stroke-width="0.5"/>'
      + '</svg>';
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
    html += '<td class="' + (c.isNow ? 'wg-now' : '') + '">' + windArrowSvg(h.winddirection_10m[c.i], c.isNow) + '</td>';
  });
  html += '</tr>';

  // Ligne ciel (icones nebulosite/pluie)
  html += '<tr><td class="row-label">Ciel</td>';
  cols.forEach(function(c) {
    var cloud = h.cloud_cover ? h.cloud_cover[c.i] : null;
    var rain = h.precipitation ? h.precipitation[c.i] : null;
    html += '<td class="' + (c.isNow ? 'wg-now' : '') + '">' + weatherIcon(cloud, rain, c.isNow) + '</td>';
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

  // Ligne modele (source AROME/ARPEGE par heure)
  html += '</tr><tr><td class="row-label" style="color:#94A3B8;font-size:10px;">Source</td>';
  cols.forEach(function(c) {
    var model = modelMap[c.t] || '-';
    var col = model === 'AROME' ? '#0BA888' : model === 'ARPEGE' ? '#CA8A04' : '#94A3B8';
    html += '<td class="' + (c.isNow ? 'wg-now' : '') + '" style="font-size:9px;color:' + col + ';font-weight:600;">' + model + '</td>';
  });

  html += '</tr></tbody></table>';
  html += '<div style="padding:4px 12px 6px;font-family:IBM Plex Mono,monospace;font-size:11px;color:#94A3B8;display:flex;gap:14px;flex-wrap:wrap;">'
    + '<span><span style="color:#0BA888;font-weight:600">AROME</span> 1.3km haute resolution (0-48h)</span>'
    + '<span><span style="color:#CA8A04;font-weight:600">ARPEGE</span> Europe moyen terme (48h-4j)</span>'
    + '</div>';
  document.getElementById('forecastTable').innerHTML = html;
}
function openSpotPopup(latlng, name) {
  // ============================================================
  // CHANTIER 1 — Pipeline séquentiel avec compteur génération
  // ------------------------------------------------------------
  // Architecture refactorée pour éliminer les désynchronisations
  // entre fetchs async parallèles. Les 4 étapes critiques pour
  // V4 (depth → sediment → marine → zone) s'exécutent en cascade
  // SÉQUENTIELLE, avec un compteur _pipelineGen qui invalide les
  // pipelines obsolètes (clics rapides).
  //
  // Un loader UI 4 segments (Patch Chantier 1 commit 1/3) montre
  // visuellement l'avancement.
  //
  // Le V4 final est calculé UNE SEULE FOIS à la fin, avec tout
  // le contexte (S._spotDepth, S._spotSediment, S_spotMarineCache,
  // S_spotZoneCache tous remplis). renderSpotPopup() unique en fin.
  //
  // fetchSpotWeather et loadDrawerTides restent en parallèle car
  // indépendants de la chaîne V4 (alimentent uniquement vent/PMBM).
  // ============================================================
  
  // ----- Incrémente le compteur de génération -----
  // Permet d'identifier si un .then() qui résout tardivement vient
  // d'un clic obsolète (utilisateur a cliqué ailleurs entre temps)
  if (typeof S._pipelineGen !== 'number') S._pipelineGen = 0;
  S._pipelineGen++;
  var myGen = S._pipelineGen;
  
  // ----- Helper interne : marque les étapes du loader -----
  function _setPipelineStep(stepName, state) {
    var loader = document.getElementById('vzPipelineLoader');
    if (!loader) return;
    var step = loader.querySelector('[data-step="' + stepName + '"]');
    if (!step) return;
    step.classList.remove('is-active', 'is-done');
    if (state === 'active') step.classList.add('is-active');
    else if (state === 'done') step.classList.add('is-done');
  }
  
  // ----- Helper : show/hide loader + reset état des steps -----
  function _showPipelineLoader() {
    var loader = document.getElementById('vzPipelineLoader');
    if (!loader) return;
    loader.style.display = 'block';
    loader.querySelectorAll('.vz-pipeline-step').forEach(function(s) {
      s.classList.remove('is-active', 'is-done');
    });
  }
  function _hidePipelineLoader() {
    var loader = document.getElementById('vzPipelineLoader');
    if (loader) loader.style.display = 'none';
  }
  
  // ----- Helper : vérifie si la génération est encore valide -----
  function _isGenValid() {
    return S._pipelineGen === myGen;
  }
  
  // ----- Reset cache de la chaîne physique (hygiène) -----
  if (typeof invalidateChainCache === 'function') {
    invalidateChainCache();
  invalidateCmemsCache();
  S_spotSatelliteCache = null;
  }
  
  // ----- Setup spot context -----
  S.clickLatLng = latlng;
  
  // Marées drawer ouvert : bascule sur port le plus proche
  if (typeof TIDES_DRAWER !== 'undefined' && TIDES_DRAWER.isOpen && VZ_SHEET.mode === 'tides') {
    var nearestPort = findNearestTidePort(latlng.lat, latlng.lng);
    if (nearestPort) {
      TIDES_DRAWER.currentPort = nearestPort;
      addTidesPortHalo(nearestPort.lat, nearestPort.lon);
      var today = new Date();
      TIDES_DRAWER.selectedDate = today.toISOString().split('T')[0];
      updateSheetHeader('Marées', nearestPort.name);
      fetchTidesSheetData();
    }
  }
  
  // Marker pulse sur le clic
  if (S.clickMarker) S.map.removeLayer(S.clickMarker);
  var pulseIcon = L.divIcon({
    className: '',
    html: '<div class="vz-pulse-marker">' +
            '<div class="vz-pulse-ring"></div>' +
            '<div class="vz-pulse-wave vz-pulse-wave-1"></div>' +
            '<div class="vz-pulse-wave vz-pulse-wave-2"></div>' +
            '<div class="vz-pulse-wave vz-pulse-wave-3"></div>' +
            '<div class="vz-pulse-core"></div>' +
            '<div class="vz-pulse-dot"></div>' +
          '</div>',
    iconSize: [40, 40], iconAnchor: [20, 20]
  });
  S.clickMarker = L.marker([latlng.lat, latlng.lng], { icon: pulseIcon, interactive: false }).addTo(S.map);
  
  // Estimation initiale (rendue temporaire jusqu'à fetchRealDepth)
  var distToCoastMeters = estimateDistanceToCoast(latlng.lat, latlng.lng);
  var depthEstimate = Math.max(1.5, Math.min(30, distToCoastMeters * 0.004 + 1.5));
  S._spotDepth = depthEstimate;
  S._distToCoast = distToCoastMeters;
  
// Skeleton loader sur PROFONDEUR/COEF
  var depthEl = document.getElementById('spotDepthVal');
  var coefEl = document.getElementById('spotCoefVal');
  if (depthEl) { depthEl.textContent = ''; depthEl.className = 'spot-depth-coef-val is-loading'; }
  if (coefEl) { coefEl.textContent = ''; coefEl.className = 'spot-depth-coef-val is-loading'; }
  // Injection one-shot du CSS skeleton du badge (idempotent)
  if (!document.getElementById('vzBadgeLoadingStyle')) {
    var bls = document.createElement('style');
    bls.id = 'vzBadgeLoadingStyle';
    bls.textContent =
      '#spotVisBadge.is-loading {' +
        'background: linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%) !important;' +
        'background-size: 200% 100% !important;' +
        'animation: vzBadgePulse 1.4s ease-in-out infinite;' +
      '}' +
      '#spotVisBadge.is-loading #spotVisLabel {' +
        'color: rgba(255,255,255,0.45);' +
        'font-weight: 500;' +
      '}' +
      '@keyframes vzBadgePulse {' +
        '0% { background-position: 200% 0; }' +
        '100% { background-position: -200% 0; }' +
      '}';
    document.head.appendChild(bls);
  }
  // ============================================================
  // PATCH UX : Skeleton du badge verdict pendant le pipeline
  // ------------------------------------------------------------
  // Évite d'afficher un verdict provisoire (souvent empirical)
  // pendant les 1-2s de chargement du pipeline séquentiel.
  // Le badge reprend sa valeur via renderSpotPopup quand
  // _hidePipelineLoader() est appelé en fin de pipeline.
  // ============================================================
  var badgeEl = document.getElementById('spotVisBadge');
  var labelEl = document.getElementById('spotVisLabel');
  var trendEl = document.getElementById('spotTrendArrow');
  if (badgeEl) badgeEl.classList.add('is-loading');
  if (labelEl) labelEl.textContent = 'Calcul...';
  if (trendEl) trendEl.style.display = 'none';
  // Reset les 5 segments en gris pendant le calcul
  for (var sIdx = 0; sIdx < 5; sIdx++) {
    var segEl = document.getElementById('visSeg' + sIdx);
    if (segEl) segEl.style.background = 'rgba(255,255,255,0.08)';
  }
  
  // Reset caches V4
  S_spotWeatherCache = null;
  S_spotMarineCache = null;
  S_spotSunCache = null;
  
  // Ouvre le drawer
  var now = new Date();
  document.getElementById('spotDate').value = now.toISOString().split('T')[0];
  document.getElementById('spotTime').value = now.getHours().toString().padStart(2, '0') + ':00';
  document.getElementById('spotSeaTemp').textContent = '-';
  document.getElementById('spotSunrise').textContent = '-';
  document.getElementById('spotSunset').textContent = '-';
  document.getElementById('spotDrawer').classList.add('open');
  
  // ----- Lance le loader 4 étapes -----
  _showPipelineLoader();
  _setPipelineStep('depth', 'active');
  
// ----- Fetches indépendants en parallèle (non bloquants pour le pipeline) -----
  fetchSpotWeather(latlng.lat, latlng.lng);
  loadDrawerTides(latlng.lat, latlng.lng);
  
  // Sprint 2 : fetch satellite CMEMS, indépendant du pipeline séquentiel.
  // Quand la donnée arrive, on vérifie que la génération est encore valide
  // (anti pollution clics rapides), on alimente S_spotSatelliteCache, on
  // invalide les caches V4 pour forcer recalcul incluant la voie satellite,
  // et on déclenche un re-render du drawer.
  fetchCmemsZSD(latlng.lat, latlng.lng).then(function(satData) {
    if (!_isGenValid()) return;  // clic obsolète, on ignore silencieusement
    if (!satData) {
      // Échec silencieux (réseau, GAS, ou no_data_72h)
      S_spotSatelliteCache = null;
      return;
    }
    // Stockage avec position de référence (anti-mélange entre spots)
    S_spotSatelliteCache = {
      lat: latlng.lat,
      lon: latlng.lng,
      data: satData
    };
    // Invalide les caches V4 pour forcer un recalcul incluant la voie satellite
    if (typeof _satelliteV4Cache !== 'undefined') _satelliteV4Cache = {};
    if (typeof _chainCache !== 'undefined') _chainCache = {};
    // Re-render du drawer avec la donnée satellite disponible
    if (typeof renderSpotPopup === 'function') renderSpotPopup();
  });
  // ============================================================
  // SPRINT 3 — FETCH CORIOLIS COTIER (parallèle, non-bloquant)
  // ------------------------------------------------------------
  // Lance en parallèle du satellite. Quand la donnée arrive, on
  // vérifie que la génération est encore valide (anti pollution
  // clics rapides), on alimente S_spotCoriolisCache, on invalide
  // les caches V4 pour forcer recalcul incluant la voie Coriolis,
  // et on déclenche un re-render du drawer.
  //
  // Aucun affichage forcé si pas de bouée dans le rayon (retour null
  // de fetchCoriolisTurbidity), le drawer reste comme avant.
  // ============================================================
  fetchCoriolisTurbidity(latlng.lat, latlng.lng).then(function(coriolisData) {
    if (!_isGenValid()) return;  // clic obsolète, on ignore silencieusement
    if (!coriolisData) {
      // Pas de bouée proche, ou mesure trop ancienne, ou erreur
      S_spotCoriolisCache = null;
      return;
    }
    // Stockage avec position de référence (anti-mélange entre spots)
    S_spotCoriolisCache = {
      lat: latlng.lat,
      lon: latlng.lng,
      data: coriolisData
    };
    // Invalide les caches V4 pour forcer un recalcul incluant la voie Coriolis
    if (typeof _coriolisV4Cache !== 'undefined') _coriolisV4Cache = {};
    if (typeof _satelliteV4Cache !== 'undefined') _satelliteV4Cache = {};
    if (typeof _chainCache !== 'undefined') _chainCache = {};
    // Re-render du drawer avec la donnée Coriolis disponible
    if (typeof renderSpotPopup === 'function') renderSpotPopup();
  });
  
  // ============================================================
  // PIPELINE SÉQUENTIEL : depth → sediment → marine → zone → V4
  // ============================================================
  
  fetchRealDepth(latlng.lat, latlng.lng)
    .then(function(realDepth) {
      if (!_isGenValid()) return Promise.reject({ obsolete: true });
      if (realDepth !== null && realDepth > 0) {
        S._spotDepth = realDepth;
      }
      // Affiche PROFONDEUR/COEF dès maintenant
      var lat = S.clickLatLng ? S.clickLatLng.lat : latlng.lat;
      var lon = S.clickLatLng ? S.clickLatLng.lng : latlng.lng;
      if (typeof renderDepthCoefBlock === 'function') {
        renderDepthCoefBlock(S._spotDepth, lat, lon);
      }
      _setPipelineStep('depth', 'done');
      _setPipelineStep('sediment', 'active');
      
      // Step 2 : sédiment ponctuel
      return fetchSedimentType(latlng.lat, latlng.lng);
    })
    .then(function(_sed) {
      if (!_isGenValid()) return Promise.reject({ obsolete: true });
      _setPipelineStep('sediment', 'done');
      _setPipelineStep('marine', 'active');
      
      // Step 3 : conditions mer + soleil
      return fetchSpotMarineAndSun(latlng.lat, latlng.lng);
    })
    .then(function(_marine) {
      if (!_isGenValid()) return Promise.reject({ obsolete: true });
      _setPipelineStep('marine', 'done');
      _setPipelineStep('zone', 'active');
      
      // Step 4 : sédiment zonal (avec profondeur instantanée LAT+marée)
      var lat = S.clickLatLng.lat;
      var lon = S.clickLatLng.lng;
      var nowTs = new Date().toISOString();
      var depthInstantNow = (typeof depthAtTimeCached === 'function')
        ? depthAtTimeCached(S._spotDepth, nowTs)
        : S._spotDepth;
      
      if (typeof fetchSedimentZone === 'function' && S._spotDepth && S._spotDepth > 0) {
        return fetchSedimentZone(lat, lon, depthInstantNow);
      } else {
        return null;  // zone optionnelle, on continue sans
      }
    })
    .then(function(_zone) {
      if (!_isGenValid()) return Promise.reject({ obsolete: true });
      _setPipelineStep('zone', 'done');
      
      // ----- FIN PIPELINE : V4 calculé une seule fois avec tout le contexte -----
      // Petit délai pour que l'utilisateur voie le 4e segment passer en done avant disparition
   setTimeout(function() {
        if (!_isGenValid()) return;
        _hidePipelineLoader();
        
        // CHANTIER 1 fix : invalide le cache V4 pour forcer recalcul
        // avec TOUT le contexte (depth, sediment, marine, zone tous remplis)
        // Le cache peut contenir un résultat empirical produit par un render
        // intermédiaire déclenché par fetchSpotWeather (parallèle, arrive
        // souvent avant la marine).
        if (typeof invalidateChainCache === 'function') {
          invalidateChainCache();
        }
        
   // Render unique du drawer avec tout le contexte
        if (typeof renderSpotPopup === 'function') {
          renderSpotPopup();
        }
        
        // Recalcule la profondeur instantanee maintenant que les
        // marees sont chargees (le 1er render au Step 1 a pu donner
        // le LAT seul si TIDES.data n'etait pas encore arrive).
        if (S._spotDepth && S.clickLatLng && typeof renderDepthCoefBlock === 'function') {
          renderDepthCoefBlock(S._spotDepth, S.clickLatLng.lat, S.clickLatLng.lng);
        }
        
        // Rafraîchit le bandeau Conditions s'il est ouvert (avec tout le contexte zonal)
        if (typeof VZ_SHEET !== 'undefined' && VZ_SHEET.mode === 'cond') {
          var newSpot = {
            lat: latlng.lat,
            lng: latlng.lng,
            name: name || getSpotDisplayName(latlng.lat, latlng.lng),
            depth: S._spotDepth || null
          };
          VZ_SHEET.spot = newSpot;
          updateSheetHeader('Prévisions 5 jours', newSpot.name);
          var bodySheet = document.getElementById('vzSheetBody');
          if (bodySheet) bodySheet.innerHTML = '<div class="vz-sheet-loading">Chargement des prévisions...</div>';
          loadSheetConditions(newSpot);
        }
      }, 250);
    })
    .catch(function(err) {
      // Erreur réseau OU pipeline obsolète
      if (err && err.obsolete) {
        // Pipeline obsolète, on ne fait rien (un autre pipeline plus récent prend la main)
        return;
      }
      // Vraie erreur réseau
      console.error('[openSpotPopup] échec pipeline:', err);
      if (!_isGenValid()) return;
      _hidePipelineLoader();
      // Render quand même avec ce qu'on a (mode dégradé)
      if (typeof renderSpotPopup === 'function') {
        renderSpotPopup();
      }
    });
}

function closeSpotPopup() {
  document.getElementById('spotDrawer').classList.remove('open');
  if (S.clickMarker) { S.map.removeLayer(S.clickMarker); S.clickMarker = null; }
}

function fetchSpotWeather(lat, lon) {
  // Strategie hybride : AROME (haute res 1.3km, 0-48h) + ARPEGE (moyen terme, 48h-5j)
  // Permet d avoir des donnees vent jusqu a J+5 dans le drawer spot
  var aromeUrl = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + lat + '&longitude=' + lon
    + '&hourly=windspeed_10m,windgusts_10m,winddirection_10m,wave_height,precipitation'
    + '&wind_speed_unit=kmh&timezone=Europe/Paris'
    + '&past_days=7&forecast_days=2'
    + '&models=meteofrance_arome_france';

  var arpegeUrl = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + lat + '&longitude=' + lon
    + '&hourly=windspeed_10m,windgusts_10m,winddirection_10m,wave_height,precipitation'
    + '&wind_speed_unit=kmh&timezone=Europe/Paris'
    + '&past_days=7&forecast_days=5'
    + '&models=meteofrance_arpege_europe';

  Promise.all([
    fetch(aromeUrl).then(function(r){ if (!r.ok) throw new Error('AROME ' + r.status); return r.json(); }),
    fetch(arpegeUrl).then(function(r){ if (!r.ok) throw new Error('ARPEGE ' + r.status); return r.json(); })
  ]).then(function(results) {
    var arome = results[0];
    var arpege = results[1];
    if (!arome.hourly && !arpege.hourly) throw new Error('Pas de donnees');
    // Fusion : AROME prioritaire la ou il couvre, ARPEGE pour le reste
    var fused = fuseForecasts(arome.hourly, arpege.hourly);
    S_spotWeatherCache = fused.h;
    renderSpotPopup();
  }).catch(function(err) {
    console.error('[VIZI] meteo spot failed:', err);
  });
}
// ============================================================
// SPRINT 2 — FETCH SATELLITE CMEMS OCEAN COLOUR
// ------------------------------------------------------------
// Wrapper frontend qui appelle le proxy GAS 'cmems_zsd_v5_test'
// livré au Sprint 1. Récupère la profondeur de Secchi mesurée par
// satellite (multi-1km, latence J-1 à J-3 selon couverture nuageuse)
// et la convertit en visibilité plongeur via Wright & Colling 1995.
//
// Cache TTL 6h indexé par (lat_4, lon_4, day) pour éviter de
// marteler le GAS et le serveur CMEMS. La donnée satellite ne
// change pas pendant la journée (1 dalle par jour).
//
// Comportement : retourne une Promise qui résout vers l'objet
// satellite ou null si erreur. Ne throw jamais (silent fail).
// ============================================================
var _cmemsCache = {};

function invalidateCmemsCache() {
  _cmemsCache = {};
}

function fetchCmemsZSD(lat, lon) {
  var dayStr = new Date().toISOString().slice(0, 10);
  var cacheKey = lat.toFixed(4) + '|' + lon.toFixed(4) + '|' + dayStr;

  if (_cmemsCache[cacheKey]) {
    var entry = _cmemsCache[cacheKey];
    var ageMs = Date.now() - entry.timestamp;
    if (ageMs < 6 * 3600 * 1000) {
      return Promise.resolve(entry.data);
    }
  }

  var url = GAS_URL + '?action=cmems_zsd_v5_test&lat=' + lat + '&lon=' + lon;
  return fetch(url)
    .then(function(r) {
      if (!r.ok) throw new Error('CMEMS HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      if (!data || data.error) {
        console.warn('[VIZI] CMEMS fetch returned error:', data ? data.error : 'no data');
        return null;
      }
      _cmemsCache[cacheKey] = {
        timestamp: Date.now(),
        data: data
      };
      return data;
    })
    .catch(function(err) {
      console.warn('[VIZI] CMEMS fetch failed:', err);
      return null;
    });
}
// ============================================================
// SPRINT 3 — FETCH CORIOLIS COTIER (bouée IFREMER COAST-HF)
// ------------------------------------------------------------
// Wrapper frontend qui appelle le proxy GAS 'coriolis_turbidity'
// livré au backend Sprint 3. Récupère la dernière mesure de
// turbidité (NTU) d'une bouée IFREMER, avec son qc et son âge.
//
// Registre des bouées : pour l'instant uniquement SMILE Luc-sur-Mer.
// Extensible à toutes les bouées COAST-HF en ajoutant des entrées
// dans CORIOLIS_BUOYS (nom, lat, lon, platformCode, radiusKm).
//
// Cache TTL 30 min indexé par (platformCode, slot_30min) pour
// limiter les appels IFREMER (mesure bouée toutes les 20 min en moyenne).
//
// Comportement : retourne une Promise qui résout vers l'objet
// coriolis enrichi (incluant distance au spot) ou null si :
//   - pas de bouée dans le rayon
//   - bouée trop ancienne (>6h)
//   - erreur réseau ou parse
// ============================================================

// Registre statique des bouées Coriolis COAST-HF
// Extensible : ajouter platformCode + coords + rayon d'influence
var CORIOLIS_BUOYS = [
  {
    name: 'SMILE Luc-sur-Mer',
    platformCode: '6200310',
    lat: 49.3438,
    lon: -0.3074,
    radiusKm: 15
  }
  // À étendre Sprint 3+ : Carnot Boulogne, MAREL Iroise, MOLIT Vilaine, MAGEST Gironde
];

var _coriolisCache = {};

function invalidateCoriolisCache() {
  _coriolisCache = {};
}

// Trouve la bouée Coriolis la plus proche d'un point, dans son rayon
// d'influence. Retourne { buoy, distanceKm } ou null si aucune match.
function findNearestCoriolisBuoy(lat, lon) {
  var R = 6371; // rayon Terre km
  var best = null;
  var bestDist = Infinity;
  CORIOLIS_BUOYS.forEach(function(buoy) {
    var dLat = (buoy.lat - lat) * Math.PI / 180;
    var dLon = (buoy.lon - lon) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2)
      + Math.cos(lat * Math.PI / 180) * Math.cos(buoy.lat * Math.PI / 180)
      * Math.sin(dLon/2) * Math.sin(dLon/2);
    var dist = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    if (dist <= buoy.radiusKm && dist < bestDist) {
      bestDist = dist;
      best = buoy;
    }
  });
  return best ? { buoy: best, distanceKm: bestDist } : null;
}

// Fetch turbidité Coriolis pour un point (lat, lon)
// Sélectionne automatiquement la bouée proche dans CORIOLIS_BUOYS
function fetchCoriolisTurbidity(lat, lon) {
  var match = findNearestCoriolisBuoy(lat, lon);
  if (!match) return Promise.resolve(null); // pas de bouée dans le rayon

  // Cache slot 30 min : Math.floor(timestamp_ms / 1800000)
  var slot30 = Math.floor(Date.now() / 1800000);
  var cacheKey = match.buoy.platformCode + '|' + slot30;

  if (_coriolisCache[cacheKey]) {
    var entry = _coriolisCache[cacheKey];
    // Enrichit avec distance/buoy car cache indexé par bouée pas par spot
    return Promise.resolve(Object.assign({}, entry.data, {
      buoy_name: match.buoy.name,
      buoy_lat: match.buoy.lat,
      buoy_lon: match.buoy.lon,
      distance_km: match.distanceKm
    }));
  }

  var url = GAS_URL + '?action=coriolis_turbidity'
    + '&platform=' + match.buoy.platformCode
    + '&parameter=135'
    + '&hours=720'; // 30 jours, fenêtre large requise par API IFREMER

  return fetch(url)
    .then(function(r) {
      if (!r.ok) throw new Error('Coriolis HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      if (!data || data.status !== 'ok') {
        console.warn('[VIZI] Coriolis fetch no data:', data ? data.error : 'null');
        return null;
      }
      // Filtre âge : > 6h on rejette (mesure trop ancienne)
      if (data.age_hours > 48) {
        console.warn('[VIZI] Coriolis mesure trop ancienne:', data.age_hours, 'h');
        return null;
      }
      _coriolisCache[cacheKey] = { timestamp: Date.now(), data: data };
      return Object.assign({}, data, {
        buoy_name: match.buoy.name,
        buoy_lat: match.buoy.lat,
        buoy_lon: match.buoy.lon,
        distance_km: match.distanceKm
      });
    })
    .catch(function(err) {
      console.warn('[VIZI] Coriolis fetch failed:', err);
      return null;
    });
}

// Conversion NTU → visibilité plongeur (mètres)
// Loi de puissance Secchi (Sestroretsky 2024) × facteur plongeur 0.7
// visi_m = 5.6 × NTU^(-0.5)
// Calibrage : 1 NTU = 5.6m | 3.43 NTU = 3.0m | 13 NTU = 1.5m | 50 NTU = 0.8m
// Formule à recalibrer si observations terrain SMILE divergent.
function inverseNTUtoVisibility(ntu) {
  if (!ntu || ntu <= 0) return null;
  return 5.6 * Math.pow(ntu, -0.5);
}
function shiftSpotDate(delta) {
  var input = document.getElementById('spotDate');
  if (!input.value) return;
  var d = new Date(input.value + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  var newDateStr = d.toISOString().split('T')[0];
  var today = new Date().toISOString().split('T')[0];
  // Limite : impossible de descendre en dessous d aujourd hui
  if (newDateStr < today) return;
  input.value = newDateStr;
  onSpotDateChange();
}

function onSpotDateChange() {
  // Met a jour l etat du bouton precedent (grise si on est sur aujourd hui)
  var input = document.getElementById('spotDate');
  var prevBtn = document.getElementById('spotDatePrev');
var today = new Date().toISOString().split('T')[0];
  if (prevBtn) prevBtn.disabled = (input.value <= today);
  refreshSpotPopup();
}
function refreshSpotPopup() {
  // Recalcule la profondeur instantanee a la nouvelle date/heure
  if (S._spotDepth && S.clickLatLng && typeof renderDepthCoefBlock === 'function') {
    renderDepthCoefBlock(S._spotDepth, S.clickLatLng.lat, S.clickLatLng.lng);
  }
  if (S_spotWeatherCache) renderSpotPopup();
  // Synchroniser le graphe de marée avec la date du haut
  var newDate = document.getElementById('spotDate').value;
  if (newDate && newDate !== TIDES.selectedDate) {
    TIDES.selectedDate = newDate;
    if (TIDES.data && isDateInLoadedRange(newDate)) {
      renderTidesForSelectedDate();
    } else if (TIDES.siteId) {
      fetchTidesRange();
    }
  }
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
  var dirFactor = getDirFactorForPoint(dir, lat, lon);
  // Patch 5/6 : remplacement visScoreV2 → computeVisibilityScore_V4
  // Stockage S._lastScoreObj pour consommation par buildVisExplanation
  var scoreObj = computeVisibilityScore_V4(h, idx, depth, lat, lon);
  var score = scoreObj.score;
  S._lastScoreObj = scoreObj;

// Échelle couleur basée sur visi_m (mètres) si disponible, fallback sur score sinon.
// Cohérent avec le chiffre affiché et avec le ressenti plongeur :
//   <1m  Nulle      (rouge)   "tu vois pas tes palmes"
//   1-2m Faible     (orange)  "tu vois ta main"
//   2-3m Moyenne    (jaune)   "tu vois ton binôme proche"
//   3-5m Bonne      (teal)    "tu vois confortablement"
//   ≥5m  Excellente (teal+)   "tu vois loin"
var visi_for_label = (typeof scoreObj.visi_m === 'number' && isFinite(scoreObj.visi_m) && scoreObj.visi_m > 0)
  ? scoreObj.visi_m
  : null;
var visLabel;
if (visi_for_label !== null) {
  visLabel = visi_for_label >= 5 ? 'Excellente'
           : visi_for_label >= 3 ? 'Bonne'
           : visi_for_label >= 2 ? 'Moyenne'
           : visi_for_label >= 1 ? 'Faible'
           : 'Nulle';
} else {
  // Fallback mode empirique : pas de visi_m, on garde le mapping score legacy.
  visLabel = score >= 80 ? 'Excellente'
           : score >= 60 ? 'Bonne'
           : score >= 40 ? 'Moyenne'
           : score >= 20 ? 'Faible'
           : 'Nulle';
}
var badgeColors = { 'Nulle': '#C94A3D', 'Faible': '#E89B3C', 'Moyenne': '#D8C84A', 'Bonne': '#2DA888', 'Excellente': '#4DD4A8' };
  var segColors = ['#C94A3D', '#E89B3C', '#D8C84A', '#2DA888', '#4DD4A8'];
  var levelIdx = ['Nulle', 'Faible', 'Moyenne', 'Bonne', 'Excellente'].indexOf(visLabel);
  
  // ============================================================
  // PATCH UX : Skip badge update tant que le pipeline tourne
  // ------------------------------------------------------------
  // renderSpotPopup peut etre appele par fetchSpotWeather avant
  // la fin du pipeline (chemin parallele). On ne met le badge a
  // jour que quand le loader est cache (= pipeline termine).
  // ============================================================
  // ============================================================
  // PATCH UX : Skip badge update tant que le pipeline tourne
  // ------------------------------------------------------------
  // renderSpotPopup peut etre appele par fetchSpotWeather avant
  // la fin du pipeline (chemin parallele). On ne met a jour le
  // verdict (badge + label + segments) QUE quand le loader est
  // cache (= pipeline termine). Le reste du rendu (vent, marees,
  // meteo) continue normalement plus bas dans renderSpotPopup
  // pour que l'utilisateur voie le vent et la meteo des que
  // fetchSpotWeather repond, sans attendre le pipeline.
  // ============================================================
  var loaderEl = document.getElementById('vzPipelineLoader');
  var pipelineRunning = loaderEl && loaderEl.style.display !== 'none' && loaderEl.style.display !== '';
  if (!pipelineRunning) {
    var badgeEl = document.getElementById('spotVisBadge');
    if (badgeEl) {
      badgeEl.classList.remove('is-loading');
      badgeEl.style.background = badgeColors[visLabel] || '#D8C84A';
    }
// SPRINT 2 : affichage du chiffre concret si visi_m disponible
    var visi_m_value = scoreObj.visi_m;
if (typeof visi_m_value === 'number' && isFinite(visi_m_value) && visi_m_value > 0) {
      var visi_rounded = Math.round(visi_m_value);
      document.getElementById('spotVisLabel').innerHTML =
        '<span style="font-size:1.15em;font-weight:700;">~ ' + visi_rounded + ' m</span>';
    } else {
      document.getElementById('spotVisLabel').textContent = '';
    }
    
// SPRINT 2 : libellé "prévision maintenant" sous le badge + fiabilité inline
    // Adaptatif : "prévision maintenant" si date/heure ≈ instant courant, sinon date sélectionnée
    // Fiabilité (option α) : pastille colorée selon confidence.label_color, inline après le contexte
    var predictionCtx = document.getElementById('vzPredictionContext');
    if (predictionCtx) {
      var nowMs = Date.now();
      var selectedMs = new Date(targetStr).getTime();
      var deltaH = Math.abs(nowMs - selectedMs) / 3600000;
      var ctxLabel;
      if (deltaH < 1.5) {
        ctxLabel = 'prévision maintenant';
      } else {
        var selDateFr = dateVal.split('-').reverse().slice(0, 2).join('/');
        var selTimeFr = timeVal.split(':')[0] + 'h';
        ctxLabel = 'prévision pour le ' + selDateFr + ' à ' + selTimeFr;
      }
      // Pastille fiabilité (uniquement si voie satellite active et confidence.pct disponible)
      var confidenceHTML = '';
      if (scoreObj.confidence && typeof scoreObj.confidence.pct === 'number' && isFinite(scoreObj.confidence.pct)) {
        var colorClass = 'is-' + (scoreObj.confidence.label_color || 'caution');
        confidenceHTML = ' · fiabilité <span class="vz-confidence-pill ' + colorClass + '">' +
          scoreObj.confidence.pct + '%</span>';
      }
      predictionCtx.innerHTML = ctxLabel + confidenceHTML;
      predictionCtx.style.display = 'block';
    }
    
    // SPRINT 2 : segments legacy (cachés par défaut via CSS .vz-spot-vis-ticks-legacy)
    // On les met à jour quand même au cas où on veut les réactiver plus tard
    for (var si = 0; si < 5; si++) {
      var seg = document.getElementById('visSeg' + si);
      if (seg) seg.style.background = si <= levelIdx ? segColors[si] : 'rgba(255,255,255,0.08)';
    }
    
    // SPRINT 2 : affichage de la carte mesure satellite si voie satellite active
    var satelliteCard = document.getElementById('vzSatelliteCard');
    if (satelliteCard) {
      if (scoreObj.engine === 'satellite_propagated' && scoreObj.satellite) {
        var sat = scoreObj.satellite;
        
        // Temps relatif : mapping age_hours → texte humain
        var ageH = sat.age_hours;
        var relativeTxt = '';
        if (typeof ageH === 'number' && isFinite(ageH)) {
          if (ageH < 24) relativeTxt = 'aujourd\'hui';
          else if (ageH < 36) relativeTxt = 'hier';
          else if (ageH < 60) relativeTxt = 'il y a 2 jours';
          else if (ageH < 84) relativeTxt = 'il y a 3 jours';
          else relativeTxt = 'il y a ' + Math.round(ageH / 24) + ' jours';
        }
        document.getElementById('vzSatelliteRelative').textContent = relativeTxt;
        
        // Visibilité mesurée arrondie à 0.1m
        var satVisi = typeof sat.visi_m === 'number' ? Math.round(sat.visi_m * 10) / 10 : null;
        document.getElementById('vzSatelliteVisi').textContent = satVisi !== null ? '~ ' + satVisi + ' m' : '—';
        
        // Date factuelle : format français "15/05/2026 - 02h00"
        var dateFactual = '—';
        if (sat.date_observed) {
          var d = new Date(sat.date_observed);
          if (!isNaN(d.getTime())) {
            var dd = String(d.getDate()).padStart(2, '0');
            var mm = String(d.getMonth() + 1).padStart(2, '0');
            var yyyy = d.getFullYear();
            var hh = String(d.getHours()).padStart(2, '0');
            var mn = String(d.getMinutes()).padStart(2, '0');
            dateFactual = dd + '/' + mm + '/' + yyyy + ' - ' + hh + 'h' + mn;
          }
        }
        document.getElementById('vzSatelliteDate').textContent = dateFactual;
        
        satelliteCard.style.display = 'flex';
      } else {
        satelliteCard.style.display = 'none';
      }
    }
    // SPRINT 3 : affichage de la carte mesure terrain Coriolis si bouée proche.
    // Affichée INDÉPENDAMMENT du moteur V4 actif (transparence épistémique) :
    // - engine=satellite_propagated : carte Coriolis en info complémentaire
    // - engine=coriolis_propagated : carte Coriolis = source principale
    // - engine=chain ou empirical : carte Coriolis quand même affichée si bouée dispo
    // Source : S_spotCoriolisCache directement, pas scoreObj.coriolis
    var coriolisCard = document.getElementById('vzCoriolisCard');
    if (coriolisCard) {
      if (typeof S_spotCoriolisCache !== 'undefined' &&
          S_spotCoriolisCache && S_spotCoriolisCache.data &&
          S_spotCoriolisCache.data.status === 'ok' &&
          typeof S_spotCoriolisCache.data.value_ntu === 'number') {
        
        var cor = S_spotCoriolisCache.data;
        
        // Visibilité convertie via loi de puissance Secchi
        var corVisi = inverseNTUtoVisibility(cor.value_ntu);
        document.getElementById('vzCoriolisVisi').textContent =
          (corVisi !== null && isFinite(corVisi))
            ? '~ ' + (Math.round(corVisi * 10) / 10) + ' m'
            : '—';
        
        // Nom bouée + distance
        document.getElementById('vzCoriolisBuoy').textContent =
          cor.buoy_name + ' · ' + cor.distance_km.toFixed(1) + ' km';
        
        // NTU brute (pour transparence scientifique)
        document.getElementById('vzCoriolisNtu').textContent =
          'turbidité ' + cor.value_ntu.toFixed(1) + ' NTU';
        
        // Temps relatif (mapping age_hours → texte humain, comme satellite)
        var corAge = cor.age_hours;
        var corRelTxt = '—';
        if (typeof corAge === 'number' && isFinite(corAge)) {
          if (corAge < 1) corRelTxt = 'il y a ' + Math.round(corAge * 60) + ' min';
          else if (corAge < 24) {
            var h = Math.floor(corAge);
            var m = Math.round((corAge - h) * 60);
            corRelTxt = 'il y a ' + (m > 0 ? h + 'h' + (m < 10 ? '0' + m : m) : h + 'h');
          }
          else corRelTxt = 'il y a ' + Math.round(corAge / 24) + ' jours';
        }
        document.getElementById('vzCoriolisRelative').textContent = corRelTxt;
        
        coriolisCard.style.display = 'flex';
      } else {
        coriolisCard.style.display = 'none';
      }
    }
  }
  // Si pipeline en cours, le badge garde son etat skeleton (Calcul...)
  // jusqu'au prochain render apres _hidePipelineLoader().
  function scoreToLabelKey(s) {
    if (s >= 80) return 4;
    if (s >= 60) return 3;
    if (s >= 40) return 2;
    if (s >= 20) return 1;
    return 0;
  }
  var labelNowKey = scoreToLabelKey(score);
  var futureMinScore = score, futureMaxScore = score;
 var lookAhead = (h && h.time && h.time.length) ? Math.min(24, h.time.length - idx - 1) : 0;
 for (var fIdx = idx + 1; fIdx <= idx + lookAhead; fIdx++) {
    // Patch 5/6 : on récupère juste le score (pas besoin de stocker la trace ici)
    var sFut = computeVisibilityScore_V4(h, fIdx, depth, lat, lon).score;
    if (sFut < futureMinScore) futureMinScore = sFut;
    if (sFut > futureMaxScore) futureMaxScore = sFut;
  }
  var labelMinKey = scoreToLabelKey(futureMinScore);
  var labelMaxKey = scoreToLabelKey(futureMaxScore);

  var trendArrowEl = document.getElementById('spotTrendArrow');
  if (trendArrowEl) {
    if (labelMinKey < labelNowKey) {
      trendArrowEl.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C94A3D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 7 17 17 7 17"/></svg>';
      trendArrowEl.style.display = 'flex';
      trendArrowEl.style.background = 'rgba(201,74,61,0.12)';
      trendArrowEl.style.borderColor = 'rgba(201,74,61,0.4)';
    } else if (labelMaxKey > labelNowKey) {
      trendArrowEl.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4DD4A8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="17 17 17 7 7 7"/></svg>';
      trendArrowEl.style.display = 'flex';
      trendArrowEl.style.background = 'var(--vz-accent-glow)';
      trendArrowEl.style.borderColor = 'var(--vz-accent-border)';
    } else {
      trendArrowEl.style.display = 'none';
    }
  }

  var windDisp = S_windUnit === 'kt' ? toKt(wind) : wind;
  var gustDisp = S_windUnit === 'kt' ? toKt(gusts) : gusts;
  var unitDisp = S_windUnit === 'kt' ? 'noeuds' : 'km/h';
  var windKt = S_windUnit === 'kt' ? windDisp : toKt(wind);
  var gustKt = S_windUnit === 'kt' ? gustDisp : toKt(gusts);

  var windEl = document.getElementById('spotWindSpeed');
  windEl.textContent = windDisp;
  windEl.className = 'spot-wind-val ' + windColorClass(windKt);

  var gustEl = document.getElementById('spotWindGusts');
  gustEl.textContent = gustDisp;
  gustEl.className = 'spot-wind-val ' + windColorClass(gustKt - 5);

  document.querySelectorAll('.spot-wind-unit').forEach(function(el, i) {
    if (i < 2) el.textContent = unitDisp;
  });

  var fromNames = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  var aidx = Math.round(dir / 45) % 8;
  var dirName = (dir !== null && dir !== undefined) ? fromNames[aidx] : '-';
  var dirEl = document.getElementById('spotWindDir');
  var dirClass = '';
  if (dirFactor < 0.4) dirClass = 'vz-dir-offshore';
  else if (dirFactor < 0.85) dirClass = 'vz-dir-lateral';
  else dirClass = 'vz-dir-onshore';

  if (dir !== null && dir !== undefined) {
    dirEl.className = 'spot-wind-dir ' + dirClass;
    dirEl.innerHTML = '<svg width="32" height="32" viewBox="0 0 20 20" style="transform:rotate(' + dir + 'deg);display:inline-block;vertical-align:middle;">'
      + '<path d="M10 2 L10 16 M10 16 L6 12 M10 16 L14 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'
      + '</svg>';
  } else {
    dirEl.textContent = '-';
  }
  document.getElementById('spotWindDeg').textContent = dir !== null ? dirName + ' ' + Math.round(dir) + 'deg' : '-';

renderDecantation(h, idx, depth, dir, S.clickLatLng);
  buildVisExplanation(h, idx, depth, dir, dirFactor, bathyFactor, wind, gusts, wave, score, visLabel, lat, lon);
  renderPmBmDuJour();
  renderTimelineDepuisMesure();
}
function renderDepthCoefBlock(depth, lat, lon) {
  var depthEl = document.getElementById('spotDepthVal');
  var coefEl = document.getElementById('spotCoefVal');
  var coefDescEl = document.getElementById('spotCoefDesc');
  if (!depthEl || !coefEl) return;

  // ============================================================
  // PATCH UX : Affichage profondeur reelle avec maree
  // ------------------------------------------------------------
  // Le chasseur a besoin de la profondeur INSTANTANEE a l'heure
  // selectionnee (LAT + hauteur de maree), pas du zero hydro
  // qui ne signifie rien dans le contexte d'une session.
  //
  // Calcul via depthAtTimeCached deja utilise par la chaine
  // physique 9 briques. Si TIDES.data pas encore charge
  // (race condition au premier clic), retourne le LAT inchange
  // - l'affichage sera recale des que les marees arrivent via
  // refreshSpotPopup -> renderDepthCoefBlock.
  // ============================================================
  if (depth && depth > 0) {
    var dateVal = document.getElementById('spotDate').value;
    var timeVal = document.getElementById('spotTime').value;
    var timeISO = dateVal + 'T' + timeVal + ':00';
    var depthInstant = (typeof depthAtTimeCached === 'function')
      ? depthAtTimeCached(depth, timeISO)
      : depth;
    depthEl.textContent = '~' + Math.round(depthInstant);
    depthEl.className = 'spot-depth-coef-val';
  } else {
    depthEl.textContent = '-';
    depthEl.className = 'spot-depth-coef-val';
  }

  // Coef de marée du jour
  var dateVal = document.getElementById('spotDate').value;
  var nearPort = findApiMareeSiteNear(lat, lon);
  var isMed = false;
  if (nearPort && nearPort.spot && nearPort.spot.region === 'Mediterranee') isMed = true;

  if (isMed || !nearPort) {
    coefEl.textContent = 'N/A';
    coefEl.className = 'spot-depth-coef-val coef-na';
    if (coefDescEl) coefDescEl.textContent = 'Méditerranée';
    return;
  }

  var coef = getCoefForDate(dateVal);
  coefEl.textContent = coef;
  // Couleur selon coef
  var coefClass = 'coef-low';
  if (coef >= 95) coefClass = 'coef-vhigh';
  else if (coef >= 70) coefClass = 'coef-high';
  else if (coef >= 45) coefClass = 'coef-mid';
  coefEl.className = 'spot-depth-coef-val ' + coefClass;

  // Description courte
  var desc = '';
  if (coef >= 95) desc = 'Très élevé';
  else if (coef >= 70) desc = 'Élevé';
  else if (coef >= 45) desc = 'Moyen';
  else desc = 'Faible';
  if (coefDescEl) coefDescEl.textContent = desc;
}
function windColorClass(windKt) {
  if (windKt < 10) return 'vz-wind-calm';
  if (windKt < 15) return 'vz-wind-watch';
  if (windKt < 22) return 'vz-wind-strong';
  return 'vz-wind-danger';
}

function toggleVisExplain() {
  var content = document.getElementById('vzExplainContent');
  var modalContent = document.getElementById('vzExplainModalContent');
  if (modalContent && content) {
    modalContent.innerHTML = content.innerHTML;
  }
  document.getElementById('vzExplainOverlay').classList.add('open');
}

function closeVisExplain() {
  document.getElementById('vzExplainOverlay').classList.remove('open');
}

function buildVisExplanation(h, idx, depth, dir, dirFactor, bathyFactor, wind, gusts, wave, score, visLabel, lat, lon) {
  var content = document.getElementById('vzExplainContent');
  if (!content) return;
  // ============================================================
  // PATCH 4/6 - Délégation au log scientifique V2 si disponible
  // ------------------------------------------------------------
  // Si S._lastScoreObj est disponible (rempli par renderSpotPopup
  // après Patch 5), on délègue à renderVisExplain_V2 qui produit
  // le log structuré 6 sections + warnings + verdict.
  //
  // Sinon, on garde le comportement actuel (4 paragraphes prose
  // construits ci-dessous). C'est le filet de sécurité tant que
  // Patch 5 n'est pas appliqué : aucune régression.
  // ============================================================
  if (typeof S._lastScoreObj !== 'undefined' &&
      S._lastScoreObj !== null &&
      typeof renderVisExplain_V2 === 'function') {
    content.innerHTML = renderVisExplain_V2(S._lastScoreObj);
    return;
  }

  // ===== Comportement legacy (4 paragraphes prose) =====
  // Conservé tel quel pour rétrocompatibilité si renderVisExplain_V2
  // n'est pas chargé ou si Patch 5 n'a pas encore stocké S._lastScoreObj.

  var fromNames = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  var dirName = (dir !== null && dir !== undefined) ? fromNames[Math.round(dir / 45) % 8] : '?';

  var dirQual, dirImpact;
  if (dirFactor < 0.4) {
    dirQual = '<strong>offshore</strong> (de la terre vers la mer)';
    dirImpact = 'protège la côte, l\'eau reste relativement claire malgré le vent';
  } else if (dirFactor < 0.85) {
    dirQual = '<strong>latéral</strong> à la côte';
    dirImpact = 'agite la surface mais brasse moins le sédiment qu\'un vent de mer';
  } else {
    dirQual = '<strong>onshore</strong> (de la mer vers la côte)';
    dirImpact = 'pousse la houle directement contre le fond, brasse fort';
  }

  var windKt = S_windUnit === 'kt' ? wind : toKt(wind);
  var gustKt = S_windUnit === 'kt' ? gusts : toKt(gusts);
  var windQual;
  if (windKt < 10) windQual = 'faible';
  else if (windKt < 15) windQual = 'modéré';
  else if (windKt < 22) windQual = 'soutenu';
  else windQual = 'fort';

  var depthQual, depthImpact;
  if (depth <= 2) {
    depthQual = '<strong>très peu profond</strong> (' + Math.round(depth) + 'm)';
    depthImpact = 'la moindre agitation se transmet au sédiment et trouble l\'eau (amplification ×4)';
  } else if (depth <= 5) {
    depthQual = '<strong>peu profond</strong> (' + Math.round(depth) + 'm)';
    depthImpact = 'le brassage atteint le fond facilement (amplification ×3)';
  } else if (depth <= 10) {
    depthQual = '<strong>moyen</strong> (' + Math.round(depth) + 'm)';
    depthImpact = 'le sédiment est moins remué qu\'à faible profondeur (amplification ×2)';
  } else if (depth <= 20) {
    depthQual = '<strong>profond</strong> (' + Math.round(depth) + 'm)';
    depthImpact = 'l\'agitation se dissipe avant d\'atteindre le fond (amplification ×1.3)';
  } else {
    depthQual = '<strong>profond</strong> (' + Math.round(depth) + 'm)';
    depthImpact = 'l\'eau reste claire même par vent soutenu (pas d\'amplification)';
  }

  var energie = energieResiduelle(h, idx, depth, lat, lon);
  var tau = decantTau(depth);
  var brassageMsg;
  if (energie > 30) {
    brassageMsg = 'Le vent souffle dans cette config depuis plusieurs heures. L\'énergie de brassage s\'est <strong>accumulée</strong> dans la colonne d\'eau et n\'a pas eu le temps de décanter (il faudrait environ <span class="vz-explain-num">' + Math.round(tau) + 'h</span> de calme à cette profondeur pour s\'éclaircir).';
  } else if (energie > 10) {
    brassageMsg = 'Le brassage des dernières heures laisse encore des particules en suspension. La décantation est en cours mais incomplète.';
  } else if (energie > 2) {
    brassageMsg = 'L\'eau a eu le temps de décanter en partie depuis le dernier coup de vent. Les conditions s\'améliorent.';
  } else {
    brassageMsg = 'Aucun brassage récent significatif. L\'eau a eu le temps de se clarifier.';
  }

  var verdict;
  if (score >= 80) {
    verdict = 'Conditions <strong>excellentes</strong>. C\'est le moment de sortir.';
  } else if (score >= 60) {
    verdict = 'Conditions <strong>bonnes</strong>. Spot chassable, visi suffisante pour traquer.';
  } else if (score >= 40) {
    verdict = 'Conditions <strong>moyennes</strong>. Visi limitée, mais ça reste possible si tu connais ton spot.';
  } else if (score >= 20) {
    verdict = 'Conditions <strong>faibles</strong>. Visi à peine d\'1-2m. Pour gagner un cran, il faudrait que le vent tombe sous 8 nds pendant ' + Math.round(tau) + 'h, ou que tu trouves un spot abrité avec fond > 8m.';
  } else {
    verdict = 'Conditions <strong>nulles</strong>. Pas la peine de mouiller la combi ici. Cherche un spot offshore (sous le vent de la côte) ou attends l\'accalmie.';
  }

  var html =
    '<div class="vz-explain-section">' +
      '<div class="vz-explain-section-title">Le vent</div>' +
      '<div class="vz-explain-section-body">' +
        'Vent de <strong>' + dirName + '</strong> à <span class="vz-explain-num">' + windKt + ' nds</span> (rafales <span class="vz-explain-num">' + gustKt + ' nds</span>), ' + windQual + '. Sur ce point, il arrive ' + dirQual + ' : il ' + dirImpact + '.' +
      '</div>' +
    '</div>' +

    '<div class="vz-explain-section">' +
      '<div class="vz-explain-section-title">Le fond</div>' +
      '<div class="vz-explain-section-body">' +
        'Tu es sur un fond ' + depthQual + '. À cette profondeur, ' + depthImpact + '.' +
      '</div>' +
    '</div>' +

    '<div class="vz-explain-section">' +
      '<div class="vz-explain-section-title">Brassage cumulé</div>' +
      '<div class="vz-explain-section-body">' +
        brassageMsg +
      '</div>' +
    '</div>' +

    '<div class="vz-explain-verdict">' +
      verdict +
    '</div>';

  content.innerHTML = html;
}
// ============================================================
// TIMELINE "DEPUIS LA MESURE" — Vraies données vent + coef
// ------------------------------------------------------------
// Remplit #vzTimelineList avec 3 événements significatifs entre
// la mesure satellite et maintenant :
//   - Bloc 1 (warning) : jour de la mesure satellite, vent dominant
//   - Bloc 2 : J-1 (hier), vent dominant + coef du jour
//   - Bloc 3 (now) : créneau actuel, vent instantané + coef du jour
//
// Si pas de S_spotSatelliteCache, fallback sur J-2 / J-1 / now.
// ============================================================
function renderTimelineDepuisMesure() {
  var list = document.getElementById('vzTimelineList');
  if (!list) return;
  var h = S_spotWeatherCache;
  if (!h || !h.time || !h.time.length) return;

  var fromNames = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  function dirToCardinal(deg) {
    if (deg === null || deg === undefined) return '?';
    return fromNames[Math.round(deg / 45) % 8];
  }

  // Trouve l'index météo le plus proche d'un timestamp
  function findIdxNearMs(targetMs) {
    var bestIdx = 0, bestDelta = Infinity;
    for (var i = 0; i < h.time.length; i++) {
      var delta = Math.abs(new Date(h.time[i]).getTime() - targetMs);
      if (delta < bestDelta) { bestDelta = delta; bestIdx = i; }
    }
    return bestIdx;
  }

  // Calcule le vent dominant (moyenne pondérée par rafales) sur 24h centrées
  function dominantWindAround(idx) {
    var n = h.time.length;
    var iStart = Math.max(0, idx - 12);
    var iEnd = Math.min(n - 1, idx + 12);
    var sumKt = 0, sumGustKt = 0, sumDirX = 0, sumDirY = 0, count = 0;
    for (var i = iStart; i <= iEnd; i++) {
      var wKmh = h.windspeed_10m[i] || 0;
      var gKmh = h.windgusts_10m[i] || 0;
      var d = h.winddirection_10m ? h.winddirection_10m[i] : null;
      if (d === null) continue;
      var rad = d * Math.PI / 180;
      sumDirX += Math.cos(rad);
      sumDirY += Math.sin(rad);
      sumKt += wKmh * 0.539957;
      sumGustKt += gKmh * 0.539957;
      count++;
    }
    if (count === 0) return null;
    var meanDir = (Math.atan2(sumDirY / count, sumDirX / count) * 180 / Math.PI + 360) % 360;
    return {
      windKt: Math.round(sumKt / count),
      gustKt: Math.round(sumGustKt / count),
      dirName: dirToCardinal(meanDir)
    };
  }

  // Date format "JJ mois" français
  function formatDayLabel(date) {
    var mois = ['janv', 'fév', 'mars', 'avril', 'mai', 'juin',
                'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    return date.getDate() + ' ' + mois[date.getMonth()];
  }

  // Détermine la date de référence pour le bloc 1
  // Si on a une mesure satellite, on l'utilise. Sinon J-2.
  var refDate;
  if (S_spotSatelliteCache && S_spotSatelliteCache.data && S_spotSatelliteCache.data.date_observed) {
    refDate = new Date(S_spotSatelliteCache.data.date_observed);
  } else {
    refDate = new Date();
    refDate.setDate(refDate.getDate() - 2);
  }

  var nowDate = new Date();
  var yesterdayDate = new Date(nowDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);

  // Bloc 1 — date de la mesure (warning)
  var idxRef = findIdxNearMs(refDate.getTime());
  var windRef = dominantWindAround(idxRef);
  var labelRef = formatDayLabel(refDate);
  var textRef = windRef
    ? 'vent ' + windRef.dirName + ' ' + windRef.windKt + ' nds · rafales ' + windRef.gustKt
    : 'données indisponibles';

  // Bloc 2 — hier
  var idxYest = findIdxNearMs(yesterdayDate.getTime());
  var windYest = dominantWindAround(idxYest);
  var coefYest = (typeof getCoefForDate === 'function')
    ? getCoefForDate(yesterdayDate.toISOString().slice(0, 10))
    : null;
  var textYest = windYest
    ? 'vent ' + windYest.dirName + ' ' + windYest.windKt
    : 'données indisponibles';
  if (coefYest !== null) textYest += ' · coef ' + coefYest;

  // Bloc 3 — maintenant (créneau sélectionné dans le drawer)
  var dateVal = document.getElementById('spotDate').value;
  var timeVal = document.getElementById('spotTime').value;
  var nowTargetMs = new Date(dateVal + 'T' + timeVal).getTime();
  var idxNow = findIdxNearMs(nowTargetMs);
  var windNowKt = Math.round((h.windspeed_10m[idxNow] || 0) * 0.539957);
  var dirNow = h.winddirection_10m ? h.winddirection_10m[idxNow] : null;
  var dirNowName = dirToCardinal(dirNow);
  var coefNow = (typeof getCoefForDate === 'function')
    ? getCoefForDate(dateVal)
    : null;
  var textNow = 'vent ' + dirNowName + ' ' + windNowKt;
  if (coefNow !== null) textNow += ' · coef ' + coefNow;

  // Injection HTML
  list.innerHTML =
    '<div class="vz-timeline-item is-warning">' +
      '<div class="vz-timeline-dot"></div>' +
      '<div class="vz-timeline-content">' +
        '<div class="vz-timeline-item-label">' + labelRef + '</div>' +
        '<div class="vz-timeline-item-text">' + textRef + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="vz-timeline-item">' +
      '<div class="vz-timeline-dot"></div>' +
      '<div class="vz-timeline-content">' +
        '<div class="vz-timeline-item-label">hier</div>' +
        '<div class="vz-timeline-item-text">' + textYest + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="vz-timeline-item is-now">' +
      '<div class="vz-timeline-dot"></div>' +
      '<div class="vz-timeline-content">' +
        '<div class="vz-timeline-item-label">Maintenant</div>' +
        '<div class="vz-timeline-item-text">' + textNow + '</div>' +
      '</div>' +
    '</div>';
}
function vzmTimeToMin(t){var p=t.split(':');return (+p[0])*60+(+p[1]);}
function vzmTideSVG(events, showNow){
  var W=340,TOP=22,BOT=84;
  var pts=[{t:0,h:events[events.length-1].h}].concat(events.map(function(e){return {t:vzmTimeToMin(e.time),h:e.h};}));
  var hMin=Math.min.apply(null,pts.map(function(p){return p.h;})),hMax=Math.max.apply(null,pts.map(function(p){return p.h;}));
  var xOf=function(t){return t/1440*W;},yOf=function(h){return TOP+(1-(h-hMin)/(hMax-hMin||1))*(BOT-TOP);};
  var hAt=function(t){for(var i=0;i<pts.length-1;i++){var a=pts[i],b=pts[i+1];if(t>=a.t&&t<=b.t){var f=(t-a.t)/(b.t-a.t);return a.h+(b.h-a.h)*(1-Math.cos(Math.PI*f))/2;}}return pts[pts.length-1].h;};
  var d='';for(var t=0;t<=1440;t+=10){d+=(t===0?'M':'L')+xOf(t).toFixed(1)+' '+yOf(hAt(t)).toFixed(1)+' ';}
  var s='<defs><linearGradient id="vzmTg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4DD4A8" stop-opacity="0.30"/><stop offset="1" stop-color="#4DD4A8" stop-opacity="0"/></linearGradient></defs>';
  s+='<path d="'+d+'L'+W+' '+BOT+' L0 '+BOT+' Z" fill="url(#vzmTg)"/><path d="'+d+'" fill="none" stroke="#4DD4A8" stroke-width="3" stroke-linejoin="round"/>';
  events.forEach(function(e){var x=xOf(vzmTimeToMin(e.time)),y=yOf(e.h),tx=Math.max(26,Math.min(W-26,x));
    s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" fill="#0F2438" stroke="rgba(255,255,255,0.65)" stroke-width="2"/>';
    s+='<text x="'+tx+'" y="104" fill="rgba(255,255,255,0.85)" font-family="\'IBM Plex Mono\',monospace" font-size="12.5" font-weight="600" text-anchor="middle">'+e.time+'</text>';
    s+='<text x="'+tx+'" y="118" fill="rgba(255,255,255,0.55)" font-family="\'IBM Plex Mono\',monospace" font-size="10.5" font-weight="600" text-anchor="middle">'+(e.type==='haute'?'PM':'BM')+' '+e.h.toFixed(1)+'m</text>';});
  if(showNow){var now=new Date(),nm=now.getHours()*60+now.getMinutes(),nx=xOf(nm),ny=yOf(hAt(nm));
    s+='<line x1="'+nx.toFixed(1)+'" y1="8" x2="'+nx.toFixed(1)+'" y2="'+BOT+'" stroke="#fff" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="2 3"/>';
    s+='<circle cx="'+nx.toFixed(1)+'" cy="'+ny.toFixed(1)+'" r="5.5" fill="#fff"/>';}
  return s;
}
function renderPmBmDuJour() {
  var content = document.getElementById('vzPmBmContent');
  if (!content) return;

  if (typeof TIDES === 'undefined' || !TIDES.extremes || !TIDES.selectedDate) {
    content.innerHTML = '<div class="vz-pmbm-empty">Marées non disponibles ici</div>';
    return;
  }

var selDate = TIDES.selectedDate;
  // Fenêtre 24h calée sur le jour civil sélectionné (00h00 inclus → lendemain 00h00 exclu).
  // Capture la 4ème marée quand elle tombe juste avant minuit.
  // Si elle tombe après minuit (lendemain matin), elle est dans la fenêtre du jour suivant.
// Fenêtre 28h : 00h00 du jour sélectionné → 04h00 du lendemain.
  // Capture la 4ème marée du cycle quand elle déborde de quelques heures
  // sur le jour suivant. 4h de marge couvre tous les cas Manche/Atlantique
  // (cycle tidal ~12h25min, donc 4 marées max sur 24h50min).
  var startMs = new Date(selDate + 'T00:00:00').getTime();
  var endMs = startMs + 28 * 3600 * 1000;
  var dayExtremes = TIDES.extremes.filter(function(e){
    var t = new Date(e.time).getTime();
    return t >= startMs && t < endMs;
  });

  if (dayExtremes.length === 0) {
    content.innerHTML = '<div class="vz-pmbm-empty">Pas de données pour cette date</div>';
    return;
  }

// On affiche toutes les marées de la fenêtre 28h, y compris celles de nuit.
  // Le chasseur planifie aussi pour les sorties tôt matin / fin de soirée,
  // il a besoin de voir le cycle tidal complet.
// Limite à 4 marées max : un cycle tidal complet sur ~25h en Manche.
  // Au-delà on a une marée qui appartient déjà au jour suivant.
  var displayExtremes = dayExtremes.slice(0, 4);

  var html = '<div class="vz-pmbm-grid">';
  displayExtremes.forEach(function(e) {
    var t = new Date(e.time);
    var timeStr = t.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
    var typeShort = e.type === 'high' ? 'PM' : 'BM';
    var typeClass = e.type === 'high' ? 'is-pm' : 'is-bm';
    html += '<div class="vz-pmbm-card">' +
      '<div class="vz-pmbm-card-top">' +
        '<span class="vz-pmbm-type ' + typeClass + '">' + typeShort + '</span>' +
        '<span class="vz-pmbm-height">' + e.height.toFixed(1) + 'm</span>' +
      '</div>' +
      '<div class="vz-pmbm-time">' + timeStr + '</div>' +
    '</div>';
  });
  html += '</div>';

  content.innerHTML = html;
}
function renderDecantation(h, currentIdx, depth, currentDir, latlng) {
  var banner = document.getElementById('decantBannerV2');
  if (!banner) return;
  banner.classList.remove('show', 'degradation', 'decantation', 'stable', 'neutre');

  if (!h || !h.windspeed_10m) return;

  var selectedDateStr = document.getElementById('spotDate').value;
  var todayStr = new Date().toISOString().split('T')[0];
  if (selectedDateStr > todayStr) return;

  var lat = latlng.lat;
  var lon = latlng.lng;
// Patch 5/6
  var scoreNow = computeVisibilityScore_V4(h, currentIdx, depth, lat, lon).score;

  function scoreToLabelKey(s) {
    if (s >= 80) return 4;
    if (s >= 60) return 3;
    if (s >= 40) return 2;
    if (s >= 20) return 1;
    return 0;
  }
  var labelNames = ['Nulle', 'Faible', 'Moyenne', 'Bonne', 'Excellente'];
  var labelNowKey = scoreToLabelKey(scoreNow);

  var lookForward = Math.min(24, h.time.length - currentIdx - 1);
  var futureMinScore = scoreNow, futureMaxScore = scoreNow;
  var futureMinIdx = currentIdx, futureMaxIdx = currentIdx;
for (var f = currentIdx + 1; f <= currentIdx + lookForward; f++) {
    // Patch 5/6
    var sf = computeVisibilityScore_V4(h, f, depth, lat, lon).score;
    if (sf < futureMinScore) { futureMinScore = sf; futureMinIdx = f; }
    if (sf > futureMaxScore) { futureMaxScore = sf; futureMaxIdx = f; }
  }
  var labelMinKey = scoreToLabelKey(futureMinScore);
  var labelMaxKey = scoreToLabelKey(futureMaxScore);

  var lookFar = Math.min(120, h.time.length - currentIdx - 1);
  var labelChangeIdx = -1;
  var labelChangeKey = -1;
for (var ff = currentIdx + 1; ff <= currentIdx + lookFar; ff++) {
    // Patch 5/6
    var sff = computeVisibilityScore_V4(h, ff, depth, lat, lon).score;
    var kff = scoreToLabelKey(sff);
    if (kff !== labelNowKey) {
      labelChangeIdx = ff;
      labelChangeKey = kff;
      break;
    }
  }

  var coastNormal = getCoastNormal(lat, lon);
  function onshoreFactor(windDir) {
    if (windDir === null || windDir === undefined) return 0;
    var windGoesTo = (windDir + 180) % 360;
    var angle = windGoesTo - coastNormal;
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return -Math.cos(angle * Math.PI / 180);
  }
  var fromNames = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  function dirName(deg) {
    if (deg === null || deg === undefined) return '?';
    return fromNames[Math.round(deg / 45) % 8];
  }
  var dayNames = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  function formatWhen(dateObj) {
    var now = new Date();
    var dayDiff = Math.floor((dateObj.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
    var hh = dateObj.getHours().toString().padStart(2, '0');
    if (dayDiff === 0) return "aujourd'hui " + hh + 'h';
    if (dayDiff === 1) return 'demain ' + hh + 'h';
    if (dayDiff === 2) return 'apres-demain ' + hh + 'h';
    return dayNames[dateObj.getDay()] + ' ' + hh + 'h';
  }
  var unit = S_windUnit === 'kt' ? 'nds' : 'km/h';

  // CAS 2 - Degradation : label va baisser dans 24h
  if (labelMinKey < labelNowKey) {
var futurePeakGusts = 0, futurePeakHoursAhead = -1, futurePeakDir = null;
    for (var fk = 1; fk <= lookForward; fk++) {
      var ffIdx = currentIdx + fk;
      // Conversion km/h -> nds pour comparaison aux seuils
      var fg = (h.windgusts_10m[ffIdx] || 0) * 0.539957;
      var fd = h.winddirection_10m ? h.winddirection_10m[ffIdx] : null;
      if (onshoreFactor(fd) < 0.3) continue;
      if (fg > futurePeakGusts) { futurePeakGusts = Math.round(fg); futurePeakHoursAhead = fk; futurePeakDir = fd; }
    }
 var degradeWhen = formatWhen(new Date(h.time[futureMinIdx]));
    var subText, detailText;
    if (futurePeakGusts >= 15) {
      // futurePeakGusts est deja en nds (cf conversion ci-dessus)
      var futKt = S_windUnit === 'kt' ? futurePeakGusts : Math.round(futurePeakGusts / 0.539957);
      subText = 'Coup de ' + dirName(futurePeakDir) + ' a ' + futKt + ' ' + unit + ' attendu';
      detailText = 'Coup de vent ' + dirName(futurePeakDir) + ' onshore avec rafales jusqu a ' + futKt + ' ' + unit + ' dans ' + futurePeakHoursAhead + 'h. Sur fond ~' + Math.round(depth) + 'm, prevoir plusieurs jours de decantation ensuite.';
    } else {
      subText = 'Conditions defavorables a venir';
      detailText = 'La visi va se degrader. Sur fond ~' + Math.round(depth) + 'm, prevoir une periode de decantation.';
    }
    banner.innerHTML =
      '<div class="decant-v2-title">' +
        '<span>L eau va se troubler ' + degradeWhen + '</span>' +
        '<button class="decant-v2-info-btn" onclick="toggleDecantInfo()">i</button>' +
      '</div>' +
      '<div class="decant-v2-sub">' + subText + '</div>' +
      '<div class="decant-v2-detail" id="decantDetail">' + detailText + '</div>';
    banner.classList.add('show', 'degradation');
    return;
  }

  // CAS 3 - Eclaircissement franc : label va monter dans 24h
  if (labelMaxKey > labelNowKey) {
  var pastPeakGusts = 0, pastPeakHoursAgo = -1, pastPeakDir = null;
    for (var k = 1; k <= Math.min(72, currentIdx); k++) {
      var pIdx = currentIdx - k;
      // Conversion km/h -> nds pour comparaison aux seuils
      var pg = (h.windgusts_10m[pIdx] || 0) * 0.539957;
      var pd = h.winddirection_10m ? h.winddirection_10m[pIdx] : null;
      if (onshoreFactor(pd) < 0.3) continue;
      if (pg > pastPeakGusts) { pastPeakGusts = Math.round(pg); pastPeakHoursAgo = k; pastPeakDir = pd; }
    }
  var clearWhen = formatWhen(new Date(h.time[futureMaxIdx]));
    var subText3, detailText3;
    if (pastPeakHoursAgo > 0 && pastPeakGusts >= 15) {
      // pastPeakGusts est deja en nds (cf conversion ci-dessus)
      var peakKt = S_windUnit === 'kt' ? pastPeakGusts : Math.round(pastPeakGusts / 0.539957);
      subText3 = 'Vent retombe depuis ' + pastPeakHoursAgo + 'h, decantation en cours';
      detailText3 = 'Pic onshore de ' + peakKt + ' ' + unit + ' ' + dirName(pastPeakDir) + ' detecte il y a ' + pastPeakHoursAgo + 'h. Les particules redescendent. Sur fond ~' + Math.round(depth) + 'm, l eau devrait s eclaircir vers ' + clearWhen + '.';
    } else {
      subText3 = 'Conditions s ameliorent';
      detailText3 = 'La visi devrait s eclaircir vers ' + clearWhen + '.';
    }
    banner.innerHTML =
      '<div class="decant-v2-title">' +
        '<span>L eau s eclaircit ' + clearWhen + '</span>' +
        '<button class="decant-v2-info-btn" onclick="toggleDecantInfo()">i</button>' +
      '</div>' +
      '<div class="decant-v2-sub">' + subText3 + '</div>' +
      '<div class="decant-v2-detail" id="decantDetail">' + detailText3 + '</div>';
    banner.classList.add('show', 'decantation');
    return;
  }

  // CAS 4 - Nulle ou Faible avec changement de label visible dans les 5j
  if (labelNowKey <= 1 && labelChangeIdx > 0 && labelChangeKey > labelNowKey) {
    var changeWhen = formatWhen(new Date(h.time[labelChangeIdx]));
    var newLabel = labelNames[labelChangeKey];
    banner.innerHTML =
      '<div class="decant-v2-title">' +
        '<span>' + newLabel + ' attendue ' + changeWhen + '</span>' +
        '<button class="decant-v2-info-btn" onclick="toggleDecantInfo()">i</button>' +
      '</div>' +
      '<div class="decant-v2-sub">Decantation longue, fond ~' + Math.round(depth) + 'm</div>' +
      '<div class="decant-v2-detail" id="decantDetail">' +
        'La visi reste ' + labelNames[labelNowKey].toLowerCase() + ' a court terme mais devrait remonter a ' + newLabel.toLowerCase() + ' vers ' + changeWhen + '. Sur fond ~' + Math.round(depth) + 'm, decantation lente.' +
      '</div>';
    banner.classList.add('show', 'decantation');
    return;
  }

  // CAS 1 - Nulle/Faible durable, aucune amelioration sur 5j
  if (labelNowKey <= 1 && labelChangeIdx === -1) {
    banner.innerHTML =
      '<div class="decant-v2-title">' +
        '<span>Aucune amelioration en vue</span>' +
        '<button class="decant-v2-info-btn" onclick="toggleDecantInfo()">i</button>' +
      '</div>' +
      '<div class="decant-v2-sub">Conditions defavorables sur les 5 prochains jours</div>' +
      '<div class="decant-v2-detail" id="decantDetail">' +
        'Score visi reste sous le seuil "plongeable" sur les 5 prochains jours. Sediments en suspension persistante sur fond ~' + Math.round(depth) + 'm.' +
      '</div>';
    banner.classList.add('show', 'neutre');
    return;
  }

  // CAS 5 - Stable bonne ou excellente : pas de bandeau
}

function toggleDecantInfo() {
  var detail = document.getElementById('decantDetail');
  if (detail) detail.classList.toggle('open');
}

// ============================================================
// ALGO DECANTATION V2 - Memoire d'energie cumulee + decroissance exponentielle
// Calibre sur observation terrain Courseulles 26/04/2026 (2m apres 60h NE 25-32 nds)
// Reference scientifique : Green & Coco 2014 (AGU Reviews of Geophysics)
// ============================================================
// ============================================================
// HELPER : profondeur d'eau réelle à un instant T
// ------------------------------------------------------------
// Additionne la profondeur LAT (zéro hydrographique, fixe pour
// le spot, fournie par EMODnet) à la hauteur de marée interpolée
// depuis TIDES.data au moment timeISO.
//
// Utilisé par energieResiduelle et visScoreV2 pour que l'algo
// de turbidité raisonne sur la VRAIE colonne d'eau au moment T,
// pas sur le LAT qui n'est correct qu'à BM grand coef.
//
// Clamp à 0.3m minimum : sur un estran à BM grand coef, la
// hauteur d'eau peut tomber sous le LAT du spot et donner du
// négatif. Physiquement le spot est à sec (non-plongeable),
// mais on protège bathyFactor d'une division par valeur trop
// petite qui ferait exploser les pénalités.
//
// Fallback : si TIDES.data n'est pas chargé (Méditerranée, ou
// chargement pas terminé), on retourne depthLAT inchangé. Pas
// de régression vs comportement actuel.
// ============================================================
function depthAtTime(depthLAT, timeISO) {
  if (typeof TIDES === 'undefined' || !TIDES.data || TIDES.data.length === 0) {
    return depthLAT;
  }
  var targetMs = new Date(timeISO).getTime();
  var nearest = null, bestDelta = Infinity;
  for (var i = 0; i < TIDES.data.length; i++) {
    var delta = Math.abs(new Date(TIDES.data[i].time).getTime() - targetMs);
    if (delta < bestDelta) { bestDelta = delta; nearest = TIDES.data[i]; }
  }
  if (!nearest || bestDelta > 1800000) return depthLAT;
  var realDepth = depthLAT + nearest.height;
  return Math.max(0.3, realDepth);
}
// ============================================================
// CONSTANTES PHYSIQUES (reutilisees par les briques 1-8)
// ------------------------------------------------------------
// Toutes les valeurs en SI (Systeme International).
// Sources : Soulsby 1997 ch. 2 "Properties of water and sand".
// ============================================================
var PHYSICS = {
  g: 9.81,                  // m/s^2 - acceleration pesanteur
  rho_water: 1025,          // kg/m^3 - densite eau de mer (salinite ~35 PSU, 10°C)
  rho_sediment: 2650,       // kg/m^3 - densite quartz (sable/gravier)
  nu_water: 1.36e-6,        // m^2/s - viscosite cinematique eau a 10°C
  kappa: 0.41               // constante von Karman (couche limite)
};

// ============================================================
// BRIQUE 1 - VITESSE ORBITALE AU FOND (theorie d'Airy)
// ------------------------------------------------------------
// Calcule la vitesse maximale du mouvement orbital au fond
// induite par la houle, en m/s. C'est la grandeur physique
// fondamentale qui determine la mise en suspension du sediment.
//
// Plus u_b est grand, plus le sediment est arrache du fond.
// Plus la profondeur est grande, plus u_b decroit (la vague
// "sent" moins le fond).
//
// Sources scientifiques :
//   - Airy 1845, "Tides and Waves", Encyclopaedia Metropolitana
//     (theorie originelle des ondes lineaires)
//   - Soulsby R.L. 1997, "Dynamics of Marine Sands", ch. 4
//     (formulation moderne pour applications cotieres)
//   - Eckart C. 1952, "The propagation of gravity waves from
//     deep to shallow water", PNAS (methode iterative pour
//     resoudre la relation de dispersion)
//
// Domaine de validite :
//   - H_s / D < 0.4 (houle non-deferlante)
//   - Pas de zone de surf direct
//   - D > 0.3m (clampe en amont par depthAtTime)
//
// Hors validite, la fonction retourne quand meme une valeur
// (ne crash pas) mais la precision se degrade. C'est documente
// mais non corrige - approche physique pure, pas de fudge.
// ============================================================

// Resout iterativement la relation de dispersion d'Airy :
//     omega^2 = g * k * tanh(k * D)
//
// Methode Eckart 1952 : iteration en virgule flottante stable,
// converge en 6-8 iterations a 0.1% pres pour les profondeurs
// cotieres typiques.
//
// Argument : omega (rad/s) = 2*pi / T_p
//            depth (m) = profondeur d'eau reelle
// Retour   : k (rad/m) = nombre d'onde
function solveDispersionWavenumber(omega, depth) {
  if (omega <= 0 || depth <= 0) return null;
  // Approximation initiale : eau profonde (k = omega^2 / g)
  var k = omega * omega / PHYSICS.g;
  // 8 iterations Eckart suffisent pour la precision visee
  for (var i = 0; i < 8; i++) {
    var tanhKD = Math.tanh(k * depth);
    if (tanhKD <= 0) return null;  // numerique deviant - rejet
    k = (omega * omega) / (PHYSICS.g * tanhKD);
  }
  return k;
}

// Calcule la vitesse orbitale maximale au fond.
//
// Argument : Hs (m)    = hauteur significative de la houle
//                        locale (wind_wave_height d'Open-Meteo)
//            Tp (s)    = periode de pic
//                        (wind_wave_peak_period d'Open-Meteo)
//            depth (m) = profondeur d'eau reelle
//                        (depthAtTime, deja clampee a 0.3m mini)
// Retour   : u_b (m/s) = vitesse orbitale au fond
//                        ou null si entrees invalides
//
// Formule : u_b = (pi * Hs) / (Tp * sinh(k * D))
// (Soulsby 1997, ch. 4, formule classique de la theorie d'Airy)
function computeOrbitalVelocityAtBed(Hs, Tp, depth) {
  // Cas pas de houle ou periode nulle : pas de brassage
  if (!Hs || Hs <= 0 || !Tp || Tp <= 0) return 0;
  // Cas profondeur invalide : on ne peut pas calculer
  if (!depth || depth <= 0) return null;

  var omega = 2 * Math.PI / Tp;
  var k = solveDispersionWavenumber(omega, depth);
  if (k === null) return null;

  var sinhKD = Math.sinh(k * depth);
  // Garde-fou : sinh peut etre tres grand en eau profonde
  // ce qui donne u_b -> 0 (correct physiquement, vague ne
  // sent plus le fond). Pas un cas d'erreur, juste a verifier
  // qu'on ne divise pas par zero numerique.
  if (sinhKD <= 0 || !isFinite(sinhKD)) return 0;

  var u_b = (Math.PI * Hs) / (Tp * sinhKD);

  // Sanity check : u_b ne devrait jamais depasser quelques m/s
  // meme pour des houles extremes. Au-dela, c'est un bug.
  if (!isFinite(u_b) || u_b < 0) return null;
  if (u_b > 10) {
    // Hors domaine validite Airy (deferlement probable).
    // On retourne quand meme la valeur mais on log pour suivi.
    console.warn('[Brique1] u_b > 10 m/s, hors domaine Airy:', u_b);
  }

  return u_b;
}

// ============================================================
// BRIQUE 2 - CONTRAINTE DE CISAILLEMENT AU FOND PAR LA HOULE
// ------------------------------------------------------------
// Calcule la contrainte de cisaillement (en Pascals) qu'exerce
// le mouvement orbital au fond sur le sediment. C'est la "force
// de friction" entre l'eau qui oscille et les grains de sable.
//
// Plus tau_w est grand, plus la probabilite que le sediment
// soit arrache du fond est elevee. Cette contrainte sera comparee
// au seuil critique de Shields (Brique 5) pour decider de la mise
// en suspension.
//
// Sources scientifiques :
//   - Swart D.H. 1974, "Offshore sediment transport and
//     equilibrium beach profiles", Delft Hydraulics Lab. Publ. 131
//     (formule originelle du coefficient de friction f_w)
//   - Soulsby R.L. 1997, "Dynamics of Marine Sands", ch. 4,
//     equations 60 a 62 (formulation moderne avec plafond 0.3)
//   - Nikuradse J. 1933, "Stromungsgesetze in rauhen Rohren"
//     (rugosite equivalente k_s = 2.5 * D50 pour fonds sableux)
//
// Domaine de validite :
//   - Sediments non-cohesifs (D50 > 63 microns)
//   - Regime turbulent (u_b > ~0.05 m/s pratique)
//   - Pas de ripples (sous-estimation possible si fond ride)
//
// Hors validite :
//   - Vase (regime cohesif) : retourne null, traite en Brique 5
//   - Roche : retourne null (pas de sediment mobilisable)
// ============================================================

// Calcule la contrainte de cisaillement induite par la houle.
//
// Argument : u_b (m/s)   = vitesse orbitale au fond (Brique 1)
//            omega (rad/s) = pulsation de la houle (2*pi/Tp)
//            sediment    = objet S._spotSediment (Brique 0)
//                          contient D50_m et regime
// Retour   : tau_w (Pa)  = contrainte de cisaillement par la houle
//                          ou null si entrees invalides ou hors validite
function computeBedShearStressWaves(u_b, omega, sediment) {
  // Cas pas de houle ou pulsation nulle : pas de contrainte
  if (u_b === 0) return 0;
  // Cas entrees invalides (Brique 1 a retourne null)
  if (u_b === null || u_b === undefined || omega <= 0) return null;
  // Cas sediment absent ou hors champ d'application
  if (!sediment || !sediment.D50_m) return null;
  if (sediment.regime === 'cohesive') return null;  // traite en Brique 5
  if (sediment.regime === 'rock') return null;       // pas mobilisable

  // Etape 1 : amplitude orbitale au fond (m)
  // A = u_b / omega : longueur du va-et-vient de l'eau au fond
  var A = u_b / omega;
  if (A <= 0 || !isFinite(A)) return null;

  // Etape 2 : rugosite equivalente de Nikuradse (m)
  // Pour un fond sableux non-cohesif : k_s = 2.5 * D50
  // (Soulsby 1997, ch. 4 ; Nikuradse 1933 etendu aux fonds marins)
  var k_s = 2.5 * sediment.D50_m;

  // Etape 3 : coefficient de friction de la houle (sans dimension)
  // Formule de Swart 1974 / Soulsby 1997 eq. 62a
  // Plafond 0.3 pour les rugosites tres fortes (Soulsby 1997)
  var ratio = k_s / A;
  var f_w = Math.exp(5.213 * Math.pow(ratio, 0.194) - 5.977);
  f_w = Math.min(f_w, 0.3);

  // Etape 4 : contrainte de cisaillement (Pa)
  // Definition standard en mecanique des fluides :
  // tau_w = 0.5 * rho * f_w * u_b^2
  var tau_w = 0.5 * PHYSICS.rho_water * f_w * u_b * u_b;

  // Sanity check : tau_w doit etre fini et positif
  if (!isFinite(tau_w) || tau_w < 0) return null;

  return tau_w;
}
// ============================================================
// BRIQUE 3 - CONTRAINTE DE CISAILLEMENT AU FOND PAR LE COURANT
// ------------------------------------------------------------
// Calcule la contrainte de cisaillement (en Pascals) qu'exerce
// l'ecoulement quasi-stationnaire (courant tidal + courant
// oceanique) sur le sediment du fond. Distinct de la Brique 2
// qui traite la houle (mouvement oscillatoire).
//
// Sources scientifiques :
//   - Prandtl L. 1925, "Bericht uber Untersuchungen zur
//     ausgebildeten Turbulenz", ZAMM 5 (theorie de la couche
//     limite turbulente, profil logarithmique)
//   - von Karman T. 1930, "Mechanische Ahnlichkeit und
//     Turbulenz", Nachr. Ges. Wiss. Gottingen (constante kappa)
//   - Soulsby R.L. 1997, "Dynamics of Marine Sands", ch. 3,
//     equations 25-27 (formulation moderne pour fonds marins)
//   - Nikuradse J. 1933 (rugosite k_s = 2.5 * D50, idem Brique 2)
//
// Domaine de validite :
//   - Sediments non-cohesifs (D50 > 63 microns)
//   - Regime turbulent (toujours vrai en mer cotiere : Re > 2300)
//   - Profondeur > 1m (sinon profil log non valide)
//
// LIMITES DE DOMAINE A SURVEILLER (Option A, validee par Edouard) :
//   - Resolution Open-Meteo Marine ~1.5 km (modele Copernicus IBI)
//     insuffisante en zones de courant fort cotier : Raz Blanchard,
//     pointe de Barfleur, Saint-Malo. La vitesse retournee est
//     moyennee sur une cellule trop grossiere et peut sous-estimer
//     d'un facteur 2 a 5 dans ces zones a forte heterogeneite.
//   - U_surface utilisee comme proxy de U_1m (vitesse a 1m du fond).
//     Valide en eau cotiere bien melangee (<30m), degradee en cas
//     de stratification thermique forte (rare en Manche, frequent
//     en Mediterranee estivale).
//   - En cas de derive observee terrain, remplacer la source
//     de donnee (ocean_current_velocity) par atlas SHOM PREVIMER
//     ou calcul harmonique tidal, SANS toucher a la formule.
//
// Hors validite :
//   - Vase (regime cohesif) : retourne null
//   - Roche : retourne null (pas de rugosite Nikuradse applicable)
// ============================================================

// Calcule la contrainte de cisaillement induite par le courant.
//
// Argument : U (m/s)        = vitesse du courant a la hauteur de
//                              reference z = 1m au-dessus du fond
//                              (S_spotMarineCache.ocean_current_velocity)
//            sediment       = objet S._spotSediment (Brique 0)
//                              contient D50_m et regime
//            depth (m)      = profondeur d'eau (pour validation
//                              du domaine z << depth)
// Retour   : tau_c (Pa)     = contrainte de cisaillement par le courant
//                              ou null si entrees invalides ou hors validite
//
// Formule logarithmique (Soulsby 1997 eq. 25-27) :
//     u_*  = kappa * U / ln(z / z_0)         vitesse de friction
//     tau_c = rho * u_*^2                    contrainte au fond
//   avec z_0 = k_s / 30 (rugosite hydraulique de Nikuradse)
function computeBedShearStressCurrent(U, sediment, depth) {
  // Cas pas de courant : pas de contrainte
  if (U === 0) return 0;
  // Cas entrees invalides
  if (U === null || U === undefined || !isFinite(U) || U < 0) return null;
  if (!depth || depth <= 1) return null;  // profil log invalide en surface
  if (!sediment || !sediment.D50_m) return null;
  if (sediment.regime === 'cohesive') return null;  // traite en Brique 5
  if (sediment.regime === 'rock') return null;       // pas mobilisable

  // Hauteur de reference standard cotier : 1m au-dessus du fond
  // (Soulsby 1997, ch. 3, choix par defaut pour applications cotieres)
  var z = 1.0;

  // Rugosite equivalente de Nikuradse - meme valeur que Brique 2
  // pour coherence dans la chaine. k_s = 2.5 * D50 pour fond sableux.
  var k_s = 2.5 * sediment.D50_m;

  // Rugosite hydraulique : longueur a laquelle la vitesse extrapolee
  // du profil log est nulle. Relation classique k_s / 30 (Nikuradse).
  var z_0 = k_s / 30;

  // Profil logarithmique : ln(z / z_0) doit etre > 0, donc z > z_0
  // En pratique z = 1m et z_0 ~ 1e-5 a 1e-4 m, donc tres robuste.
  var lnRatio = Math.log(z / z_0);
  if (lnRatio <= 0 || !isFinite(lnRatio)) return null;

  // Vitesse de friction : u_* = kappa * U / ln(z/z_0)
  // (Prandtl 1925 / von Karman 1930, profil de couche limite turbulente)
  var u_star = (PHYSICS.kappa * U) / lnRatio;

  // Contrainte de cisaillement au fond : tau_c = rho * u_*^2
  // (definition standard en mecanique des fluides)
  var tau_c = PHYSICS.rho_water * u_star * u_star;

  // Sanity check : tau_c doit etre fini et positif
  if (!isFinite(tau_c) || tau_c < 0) return null;

  return tau_c;
}
// ============================================================
// BRIQUE 4 - CONTRAINTE DE CISAILLEMENT COMBINEE HOULE + COURANT
// ------------------------------------------------------------
// Combine les contraintes de la Brique 2 (houle, oscillatoire)
// et de la Brique 3 (courant, quasi-stationnaire) en une
// contrainte totale au fond, qui est la grandeur physique
// determinant la mise en suspension du sediment (Brique 5).
//
// L'addition naive tau_w + tau_c sous-estime systematiquement
// la realite, car la couche limite turbulente du courant est
// modifiee par l'oscillation de la houle. Cette interaction
// non-lineaire est le coeur de la Brique 4.
//
// Sources scientifiques :
//   - Grant W.D. & Madsen O.S. 1979, "Combined wave and current
//     interaction with a rough bottom", J. Geophys. Res. 84
//     (theorie originelle de la couche limite combinee)
//   - Soulsby R.L. et al. 1993, "Wave-current interaction within
//     and outside the bottom boundary layer", Coastal Eng. 21
//     (formulation algebrique DATA13, calibree sur 13 jeux
//     de donnees experimentaux)
//   - Soulsby R.L. & Clarke S. 2005, "Bed shear-stresses under
//     combined waves and currents on smooth and rough beds",
//     HR Wallingford Report TR137 (raffinement DATA13, formule
//     algebrique fermee, pas d'iteration)
//
// Choix de Soulsby & Clarke 2005 :
//   - Coherence avec Briques 2 et 3 (meme ecole Soulsby 1997)
//   - Formulation algebrique fermee (stabilite numerique)
//   - Standard des modeles operationnels europeens (Delft3D,
//     MIKE21, ROMS-CSTM)
//
// Domaine de validite :
//   - Identique aux Briques 2 et 3 (non-cohesif, depth > 1m,
//     regime turbulent)
//   - Houle et courant non-deferlants
//
// Comportement aux limites (par construction) :
//   - tau_w = 0 (pas de houle)   -> tau_max = tau_c
//   - tau_c = 0 (pas de courant) -> tau_max = tau_w
//   - tau_w ou tau_c = null     -> tau_max = null
// ============================================================

// Calcule la contrainte de cisaillement maximale au fond
// sous l'action combinee de la houle et du courant.
//
// Argument : tau_w (Pa)        = contrainte de houle (Brique 2)
//                                 ou null si hors domaine
//            tau_c (Pa)        = contrainte de courant (Brique 3)
//                                 ou null si hors domaine
//            wave_dir (deg)    = direction de propagation de la houle
//                                 (S_spotMarineCache.wave_direction)
//            current_dir (deg) = direction du courant
//                                 (S_spotMarineCache.ocean_current_direction)
// Retour   : tau_max (Pa)      = contrainte combinee maximale au fond
//                                 ou null si entrees invalides
//
// Formule de Soulsby & Clarke 2005 :
//     X = tau_c / (tau_c + tau_w)         ratio de dominance courant
//     tau_m = tau_c * (1 + 1.2 * X^3.2)   contrainte moyenne ajustee
//     tau_max = sqrt( (tau_m + tau_w * cos(phi))^2
//                   + (tau_w * sin(phi))^2 )
//   ou phi est l'angle entre la direction du courant et celle
//   de la houle. tau_m majore tau_c pour rendre compte de la
//   turbulence supplementaire generee par la houle.
function computeBedShearStressCombined(tau_w, tau_c, wave_dir, current_dir) {
  // Cas entrees null (au moins une Brique en amont a retourne null) :
  // on ne peut pas combiner, on remonte le null.
  if (tau_w === null || tau_w === undefined) return null;
  if (tau_c === null || tau_c === undefined) return null;

  // Cas degenere : pas de houle, on retombe sur le courant pur
  if (tau_w === 0) return tau_c;
  // Cas degenere : pas de courant, on retombe sur la houle pure
  if (tau_c === 0) return tau_w;

  // Validation numerique des entrees
  if (!isFinite(tau_w) || !isFinite(tau_c) || tau_w < 0 || tau_c < 0) return null;

  // Angle entre courant et houle (en radians)
  // Si une des deux directions est manquante, on suppose colineaires
  // (cas le plus penalisant, conservateur). Documentation explicite
  // de l'hypothese plutot que retour null qui casserait la chaine.
  var phi_deg;
  if (wave_dir === null || wave_dir === undefined ||
      current_dir === null || current_dir === undefined) {
    phi_deg = 0;
  } else {
    phi_deg = current_dir - wave_dir;
    // Normalisation dans [-180, 180]
    while (phi_deg > 180) phi_deg -= 360;
    while (phi_deg < -180) phi_deg += 360;
  }
  var phi_rad = phi_deg * Math.PI / 180;

  // Etape 1 : ratio de dominance du courant
  // X = 0 -> houle pure ; X = 1 -> courant pur
  var X = tau_c / (tau_c + tau_w);

  // Etape 2 : contrainte moyenne ajustee (Soulsby & Clarke 2005 eq. 3)
  // Le facteur (1 + 1.2 * X^3.2) majore tau_c quand le courant domine
  // (X proche de 1) et reste proche de 1 quand la houle domine.
  var tau_m = tau_c * (1 + 1.2 * Math.pow(X, 3.2));

  // Etape 3 : contrainte maximale combinee (Soulsby & Clarke 2005 eq. 4)
  // Composition vectorielle : composante du courant + projection de la houle
  var componentX = tau_m + tau_w * Math.cos(phi_rad);
  var componentY = tau_w * Math.sin(phi_rad);
  var tau_max = Math.sqrt(componentX * componentX + componentY * componentY);

  // Sanity check : tau_max doit etre fini, positif, et au moins egal
  // a chacune des contraintes de depart (la combinaison ne peut pas
  // diminuer la contrainte par rapport a tau_w ou tau_c seul).
  if (!isFinite(tau_max) || tau_max < 0) return null;
  // Garde-fou : tau_max doit etre superieur ou egal au max des deux
  // (la combinaison amplifie, ne reduit pas)
  var minExpected = Math.max(tau_w, tau_c);
  if (tau_max < minExpected * 0.99) {
    console.warn('[Brique4] tau_max < max(tau_w, tau_c), anomalie:',
                 tau_max, 'vs', minExpected);
  }

  return tau_max;
}
// ============================================================
// BRIQUE 5 - CRITERE DE SHIELDS (SEUIL DE MISE EN MOUVEMENT)
// ------------------------------------------------------------
// Determine si la contrainte de cisaillement au fond (sortie
// de la Brique 4) est suffisante pour mettre le sediment en
// mouvement. C'est le passage de la "force appliquee" (tau)
// au "comportement du grain" (mobilisation ou repos).
//
// Sources scientifiques :
//   - Shields A. 1936, "Anwendung der Aehnlichkeitsmechanik
//     und der Turbulenzforschung auf die Geschiebebewegung",
//     PhD thesis, Technische Hochschule Berlin (courbe
//     experimentale originelle, fondement de la discipline)
//   - Traduction anglaise : Shields A. 1936, "Application of
//     similarity principles and turbulence research to
//     bed-load movement", US Soil Conservation Service,
//     California Institute of Technology
//   - Soulsby R.L. 1997, "Dynamics of Marine Sands", ch. 6,
//     equations 76-77 (parametrage algebrique de la courbe
//     de Shields, precision <5% sur tout le domaine D* > 0.1)
//
// Parametre de Shields (sans dimension) :
//     theta = tau / ((rho_s - rho_w) * g * D50)
// rapport entre force motrice (cisaillement) et force de
// rappel (poids immerge du grain).
//
// Diametre adimensionnel (sans dimension) :
//     D* = D50 * ((s - 1) * g / nu^2)^(1/3)
// avec s = rho_s / rho_w, prend en compte gravite, viscosite
// et taille pour collapser tous les sediments sur une seule
// courbe universelle.
//
// Seuil critique de Shields (Soulsby 1997 eq. 77) :
//     theta_cr = 0.30 / (1 + 1.2 * D*)
//                + 0.055 * (1 - exp(-0.020 * D*))
//
// Comparaison :
//     excess = theta / theta_cr
//   - excess < 1 : pas de mobilisation, sediment au repos
//   - excess = 1 : seuil exact (mise en mouvement incipient)
//   - excess > 1 : mobilisation effective, alimente Brique 6
//
// Domaine de validite :
//   - Sediments non-cohesifs (D50 > 63 microns)
//   - Regime turbulent (toujours vrai en mer cotiere)
//   - D* > 0.1 (toujours vrai pour D50 > 10 microns)
//
// Hors validite :
//   - Vase (regime cohesif) : Shields classique inapplicable,
//     la cohesion electrostatique change le seuil. Retourne
//     null. Sera traite en module separe (Whitehouse et al.
//     2000, "Dynamics of estuarine muds") - voir passation.
//   - Roche : pas de mobilisation possible. Retourne null.
// ============================================================

// Calcule le critere de Shields pour un couple (contrainte, sediment).
//
// Argument : tau_max (Pa)  = contrainte combinee au fond (Brique 4)
//                            ou null si hors domaine
//            sediment      = objet S._spotSediment (Brique 0)
//                            contient D50_m et regime
// Retour   : objet {theta, theta_cr, excess} si calcul possible
//                  - theta      : parametre de Shields actuel (sans dim)
//                  - theta_cr   : seuil critique pour ce D50 (sans dim)
//                  - excess     : ratio theta/theta_cr (sans dim)
//          ou null si entrees invalides ou hors validite
function computeShieldsCriterion(tau_max, sediment) {
  // Cas entrees null (Brique 4 a retourne null) : on remonte le null
  if (tau_max === null || tau_max === undefined) return null;
  // Cas sediment absent ou hors champ d'application
  if (!sediment || !sediment.D50_m) return null;
  if (sediment.regime === 'cohesive') return null;  // traite separement
  if (sediment.regime === 'rock') return null;       // pas mobilisable

  // Validation numerique
  if (!isFinite(tau_max) || tau_max < 0) return null;

  var D50 = sediment.D50_m;
  var rho_s = PHYSICS.rho_sediment;  // 2650 kg/m^3 (quartz)
  var rho_w = PHYSICS.rho_water;     // 1025 kg/m^3 (eau de mer 10C)
  var g = PHYSICS.g;                  // 9.81 m/s^2
  var nu = PHYSICS.nu_water;          // 1.36e-6 m^2/s

  // Parametre de Shields actuel
  // theta = tau / ((rho_s - rho_w) * g * D50)
  var theta = tau_max / ((rho_s - rho_w) * g * D50);

  // Diametre adimensionnel D*
  // D* = D50 * ((s - 1) * g / nu^2)^(1/3)
  var s = rho_s / rho_w;
  var D_star = D50 * Math.pow((s - 1) * g / (nu * nu), 1 / 3);

  // Seuil critique de Shields (Soulsby 1997 eq. 77)
  // theta_cr = 0.30 / (1 + 1.2 * D*) + 0.055 * (1 - exp(-0.020 * D*))
  var theta_cr = 0.30 / (1 + 1.2 * D_star)
               + 0.055 * (1 - Math.exp(-0.020 * D_star));

  // Sanity check : theta_cr doit etre dans une plage physique plausible
  // (typiquement entre 0.03 et 0.30 sur tout le domaine sedimentaire)
  if (!isFinite(theta_cr) || theta_cr <= 0 || theta_cr > 1) return null;

  // Ratio de depassement du seuil
  var excess = theta / theta_cr;

  if (!isFinite(excess) || excess < 0) return null;

  return {
    theta: theta,
    theta_cr: theta_cr,
    excess: excess
  };
}
// ============================================================
// BRIQUE 7 - VITESSE DE CHUTE TERMINALE DES SEDIMENTS
// ------------------------------------------------------------
// Calcule la vitesse a laquelle un grain en suspension redescend
// vers le fond, sous l'action combinee de la gravite et de la
// trainee hydrodynamique. C'est la grandeur fondamentale de la
// decantation : plus w_s est grand, plus l'eau se clarifie vite.
//
// Sources scientifiques :
//   - Stokes G.G. 1851, "On the effect of the internal friction
//     of fluids on the motion of pendulums", Trans. Cambridge
//     Phil. Soc. 9 (loi de Stokes pour regime laminaire,
//     valable pour D50 < 100 microns)
//   - Soulsby R.L. 1997, "Dynamics of Marine Sands", ch. 8,
//     equation 102 (formulation unifiee, valable de la vase
//     au gravier, precision +/-5% sur 0.1 < D* < 1000)
//
// Formule unifiee Soulsby 1997 eq. 102 :
//     w_s = (nu / D50) * (sqrt(10.36^2 + 1.049 * D*^3) - 10.36)
// avec D* le diametre adimensionnel deja utilise en Brique 5 :
//     D* = D50 * ((s - 1) * g / nu^2)^(1/3)
//
// Reproduit :
//   - Le regime de Stokes pour D* < 5 (vase, sable tres fin)
//   - Le regime turbulent pour D* > 100 (gravier)
//   - La transition lisse entre les deux (sable medium/grossier)
//
// Domaine de validite :
//   - Sediments non-cohesifs (D50 > 63 microns)
//   - Eau salee a temperature moyenne (10-15C, viscosite nu_water)
//   - Grains spheriques quasi-quartz (rho_s = 2650 kg/m^3)
//
// Hors validite :
//   - Vase (cohesive) : flocculation en milieu salin (formation
//     d'agregats avec vitesse de chute differente du grain
//     individuel). Voir Whitehouse et al. 2000 "Dynamics of
//     estuarine muds". Retourne null. Sera traite separement.
//   - Roche : pas de sediment mobilisable. Retourne null.
// ============================================================

// Calcule la vitesse de chute terminale d'un grain de sediment.
//
// Argument : sediment   = objet S._spotSediment (Brique 0)
//                          contient D50_m et regime
// Retour   : w_s (m/s)  = vitesse de chute terminale (positive,
//                          vers le bas par convention)
//          ou null si regime hors domaine
function computeSettlingVelocity(sediment) {
  // Cas sediment absent ou hors champ d'application
  if (!sediment || !sediment.D50_m) return null;
  if (sediment.regime === 'cohesive') return null;  // flocs, traite separement
  if (sediment.regime === 'rock') return null;       // pas de sediment

  var D50 = sediment.D50_m;
  var rho_s = PHYSICS.rho_sediment;  // 2650 kg/m^3
  var rho_w = PHYSICS.rho_water;     // 1025 kg/m^3
  var g = PHYSICS.g;                  // 9.81 m/s^2
  var nu = PHYSICS.nu_water;          // 1.36e-6 m^2/s

  // Diametre adimensionnel (identique Brique 5, Soulsby 1997 eq. 75)
  var s = rho_s / rho_w;
  var D_star = D50 * Math.pow((s - 1) * g / (nu * nu), 1 / 3);

  // Sanity check : D_star doit etre dans le domaine de validite
  if (!isFinite(D_star) || D_star <= 0) return null;

  // Vitesse de chute unifiee Soulsby 1997 eq. 102
  // w_s = (nu / D50) * (sqrt(10.36^2 + 1.049 * D*^3) - 10.36)
  var w_s = (nu / D50) * (Math.sqrt(10.36 * 10.36 + 1.049 * Math.pow(D_star, 3)) - 10.36);

  // Sanity check : w_s doit etre fini et positif (gravite vers le bas)
  if (!isFinite(w_s) || w_s < 0) return null;

  // Sanity check superieur : w_s ne devrait jamais depasser quelques
  // dizaines de cm/s meme pour gros graviers. Au-dela, c'est un bug.
  if (w_s > 1.0) {
    console.warn('[Brique7] w_s > 1 m/s, hors domaine plausible:', w_s);
  }

  return w_s;
}
// ============================================================
// BRIQUE 6 - CONCENTRATION DE SEDIMENT EN SUSPENSION
// ------------------------------------------------------------
// Calcule la concentration moyenne de sediment dans la colonne
// d'eau, sous l'action combinee de la mise en suspension par
// turbulence (Brique 4 -> 5) et de la chute par gravite (Brique 7).
//
// Sortie : concentration en kg/m^3, qui alimentera Brique 8
// (Beer-Lambert) pour produire la visi en metres.
//
// Sources scientifiques :
//   - Rouse H. 1937, "Modern conceptions of the mechanics of
//     fluid turbulence", Trans. ASCE 102 (profil vertical de
//     concentration, equilibre turbulence/gravite)
//   - van Rijn L.C. 1984, "Sediment transport, part II:
//     Suspended load transport", J. Hydraul. Eng. 110 (formule
//     pour concentration de reference c_a au fond)
//   - Soulsby R.L. 1997, "Dynamics of Marine Sands", ch. 8,
//     equations 134 et 138 (formulation cotiere unifiee,
//     adaptation algebrique de van Rijn)
//
// Trois etapes :
//   1. Concentration de reference au fond c_a (Soulsby eq. 134)
//        c_a = 0.015 * (D50 / a) * T_s^1.5 / D*^0.3
//      avec T_s = excess - 1, a = max(0.01*H, 0.5*D50)
//   2. Profil vertical de Rouse
//        c(z)/c_a = ((H-z)/z * a/(H-a))^P
//      avec P = w_s / (kappa * u_*)
//   3. Concentration moyenne par integration trapezoidale
//        c_moyen = (1/(H-a)) * integrale(c(z), a, H)
//
// Conversion finale en kg/m^3 :
//   c_moyen_kg = c_moyen * rho_sediment
//
// Domaine de validite :
//   - Sediments non-cohesifs (D50 > 63 microns)
//   - Profondeur > 1m (sinon profil de Rouse degenere)
//   - excess > 1 sinon c = 0 par construction
//
// Hors validite (retourne null) :
//   - Vase (cohesive) : agregats/flocs, profil different
//   - Roche : pas de sediment mobilisable
//   - Toute Brique amont (4, 5, 7) qui retourne null
//
// Conditions limites par construction :
//   - excess <= 1 -> c_moyen = 0 (pas de mobilisation)
//   - tau_max = 0 -> c_moyen = 0 (pas de turbulence)
// ============================================================

// Calcule la concentration moyenne de sediment en suspension
// dans la colonne d'eau et la convertit en kg/m^3.
//
// Argument : tau_max (Pa)        = contrainte combinee (Brique 4)
//            shieldsResult       = sortie {theta, theta_cr, excess}
//                                   de Brique 5
//            w_s (m/s)           = vitesse de chute (Brique 7)
//            depth (m)           = profondeur d'eau totale H
//            sediment            = objet S._spotSediment
// Retour   : objet {c_a, c_moyen, c_moyen_kg, rouse_number, u_star}
//          ou null si entrees invalides ou hors validite
function computeSuspendedConcentration(tau_max, shieldsResult, w_s, depth, sediment) {
  // Validation : toute entree null en amont -> remontee du null
  if (tau_max === null || tau_max === undefined) return null;
  if (shieldsResult === null || shieldsResult === undefined) return null;
  if (w_s === null || w_s === undefined) return null;
  if (!depth || depth <= 1) return null;  // profil log invalide
  if (!sediment || !sediment.D50_m) return null;
  if (sediment.regime === 'cohesive') return null;
  if (sediment.regime === 'rock') return null;

  // Validation numerique
  if (!isFinite(tau_max) || tau_max < 0) return null;
  if (!isFinite(w_s) || w_s < 0) return null;

  var D50 = sediment.D50_m;
  var H = depth;
  var rho_s = PHYSICS.rho_sediment;
  var rho_w = PHYSICS.rho_water;
  var g = PHYSICS.g;
  var nu = PHYSICS.nu_water;
  var kappa = PHYSICS.kappa;

  // Cas degenere : pas de mobilisation -> eau claire
  // (cohérence avec Brique 5 : excess <= 1 signifie sediment au repos)
  if (shieldsResult.excess <= 1.0) {
    return {
      c_a: 0,
      c_moyen: 0,
      c_moyen_kg: 0,
      rouse_number: null,
      u_star: null
    };
  }

  // Cas degenere : pas de contrainte -> pas de turbulence -> pas de suspension
  if (tau_max === 0) {
    return {
      c_a: 0,
      c_moyen: 0,
      c_moyen_kg: 0,
      rouse_number: null,
      u_star: 0
    };
  }

  // ETAPE 1 : Concentration de reference c_a (Soulsby 1997 eq. 134)
  // ------------------------------------------------------------
  // Hauteur de reference a : 1% de H, mais au minimum 0.5*D50
  // (le sediment ne peut pas etre "en suspension" sous une demi-taille de grain)
  var a = Math.max(0.01 * H, 0.5 * D50);

  // Diametre adimensionnel D* (idem Brique 5 et 7)
  var s = rho_s / rho_w;
  var D_star = D50 * Math.pow((s - 1) * g / (nu * nu), 1 / 3);

  // Parametre de transport T_s
  var T_s = shieldsResult.excess - 1;

  // Formule Soulsby 1997 eq. 134 : c_a = 0.015 * D50/a * T_s^1.5 / D*^0.3
  // Sortie sans dimension (volume sediment / volume eau)
  var c_a = 0.015 * (D50 / a) * Math.pow(T_s, 1.5) / Math.pow(D_star, 0.3);

  if (!isFinite(c_a) || c_a < 0) return null;

  // ETAPE 2 : Calcul du nombre de Rouse P = w_s / (kappa * u_*)
  // ------------------------------------------------------------
  // Vitesse de friction u_* a partir de tau_max
  // u_* = sqrt(tau / rho_w)
  var u_star = Math.sqrt(tau_max / rho_w);
  if (!isFinite(u_star) || u_star <= 0) return null;

  var rouse_number = w_s / (kappa * u_star);
  if (!isFinite(rouse_number) || rouse_number < 0) return null;

  // ETAPE 3 : Integration trapezoidale du profil de Rouse
  // ------------------------------------------------------------
  // Profil : c(z)/c_a = ((H-z)/z * a/(H-a))^P
  // On integre de z = a a z = H, sur 100 points (precision <1%)
  var N = 100;
  var dz = (H - a) / N;
  var integral = 0;

  // Methode des trapezes : (h/2) * (f(x_0) + 2*sum(f(x_i)) + f(x_n))
  for (var i = 0; i <= N; i++) {
    var z = a + i * dz;
    // Eviter division par zero si z exactement a la surface
    if (z >= H) z = H - 1e-9;
    var ratio = ((H - z) / z) * (a / (H - a));
    if (ratio <= 0) continue;  // numeriquement aux limites
    var c_z_over_c_a = Math.pow(ratio, rouse_number);
    if (!isFinite(c_z_over_c_a)) continue;

    // Coefficient trapezoidal : 1 aux extremites, 2 a l'interieur
    var weight = (i === 0 || i === N) ? 1 : 2;
    integral += weight * c_z_over_c_a;
  }
  integral *= dz / 2;

  // Concentration moyenne sans dimension : (1/(H-a)) * integrale * c_a
  var c_moyen = (c_a / (H - a)) * integral;

  if (!isFinite(c_moyen) || c_moyen < 0) return null;

  // Conversion en kg/m^3 : c (sans dim) * rho_s
  var c_moyen_kg_brut = c_moyen * rho_s;

  // ============================================================
  // PATCH 9-B - GATE DE SUSPENSION SELON LE NOMBRE DE ROUSE
  // ------------------------------------------------------------
  // La sortie c_moyen_kg de Rouse 1937 represente la concentration
  // TOTALE en suspension dans la colonne d'eau, sans distinction
  // du mode de transport. Or selon le nombre de Rouse P, le
  // sediment ne contribue pas de la meme maniere a la visibilite
  // horizontale du chasseur sous-marin :
  //
  //   - P < 0.8 : pleine suspension (Soulsby 1997 ch.8 §3.1)
  //     Sediment reparti dans toute la colonne d'eau, contribue
  //     a la visi horizontale a toutes les profondeurs.
  //     => Facteur d'attenuation optique : 1.0 (pleine contribution)
  //
  //   - 0.8 <= P <= 2.5 : suspension partielle / saltation
  //     Concentration decroit fortement avec la hauteur au-dessus
  //     du fond. Contribue principalement dans les 1-2 m
  //     au-dessus du fond, peu dans le reste de la colonne.
  //     => Transition lineaire de 1.0 a 0.1.
  //
  //   - P > 2.5 : charriage / transport de fond
  //     Sediment confine dans les premiers centimetres au-dessus
  //     du fond, ne contribue PAS a la visi horizontale dans la
  //     colonne d'eau. L'oeil du chasseur en percoit eventuellement
  //     une trace en proximite immediate du fond.
  //     => Facteur residuel : 0.1
  //
  // Justification physique :
  // Le nombre de Rouse P = w_s / (kappa * u_*) caracterise
  // l'equilibre entre la vitesse de chute (gravite) et la
  // turbulence ascendante (cisaillement au fond). Plus P est
  // grand, plus le sediment est "lourd" relativement a la
  // turbulence disponible, et plus il reste confine au fond.
  //
  // Sources scientifiques :
  //   - Rouse H. 1937, "Modern conceptions of the mechanics of
  //     fluid turbulence", Trans. ASCE 102 (profil vertical de
  //     concentration et nombre adimensionnel P)
  //   - Bagnold R.A. 1966, "An approach to the sediment transport
  //     problem from general physics", USGS Prof. Paper 422-I
  //     (distinction charriage vs suspension)
  //   - van Rijn L.C. 1984, "Sediment transport, part II:
  //     Suspended load transport", J. Hydraul. Eng. 110
  //     (seuils P=0.8 pour pleine suspension, P=2.5 pour charriage)
  //   - Soulsby R.L. 1997, "Dynamics of Marine Sands", ch.8 §3.1
  //     (synthese moderne des regimes de transport cotier)
  //
  // Compatibilite France entiere :
  // Le gate est purement physique, sans coordonnee geographique.
  // Il s'applique identiquement de Dunkerque a Menton :
  //   - Sables fins en panache fluvial : P ~ 0.3, gate sans effet
  //   - Sables medium en tempete : P ~ 1.0-1.5, gate en transition
  //   - Cailloutis mobilises : P > 5, gate a 0.1 (charriage)
  //
  // Limites assumees :
  //   - L'utilisateur en proximite immediate du fond (< 1m) percoit
  //     plus de turbidite que la prediction. Acceptable car le
  //     chasseur explore typiquement les 2-8m au-dessus du fond.
  //   - La valeur residuelle 0.1 en charriage est conservatrice.
  //     Calibrable en Phase 2 sur observations communautaires.
  // ============================================================
  var rouse_factor;
  if (rouse_number < 0.8) {
    rouse_factor = 1.0;
  } else if (rouse_number > 2.5) {
    rouse_factor = 0.1;
  } else {
    // Transition lineaire entre P=0.8 (facteur 1.0) et P=2.5 (facteur 0.1)
    rouse_factor = 1.0 - 0.9 * (rouse_number - 0.8) / (2.5 - 0.8);
  }
  var c_moyen_kg = c_moyen_kg_brut * rouse_factor;

  // Determine le label du mode de transport pour le log scientifique
  var transport_mode;
  if (rouse_number < 0.8) transport_mode = 'pleine suspension';
  else if (rouse_number > 2.5) transport_mode = 'charriage';
  else transport_mode = 'suspension partielle';

  // Sanity check : concentration plausible
  // En suspension cotiere typique : 0 - 100 kg/m^3 (Soulsby 1997 fig. 39)
  // Au-dela, on est en regime hyperconcentre (rare, tempete extreme)
  if (c_moyen_kg > 1000) {
    console.warn('[Brique6] c_moyen_kg > 1000 kg/m3, hors domaine plausible:', c_moyen_kg);
  }

  return {
    c_a: c_a,
    c_moyen: c_moyen,
    c_moyen_kg: c_moyen_kg,
    c_moyen_kg_brut: c_moyen_kg_brut,
    rouse_number: rouse_number,
    rouse_factor: rouse_factor,
    transport_mode: transport_mode,
    u_star: u_star
  };
}
// ============================================================
// COEFFICIENTS OPTIQUES REGIONAUX - COTES FRANCAISES
// ------------------------------------------------------------
// Retourne les coefficients optiques (c_baseline, b_local)
// adaptes a la region geographique du clic. Permet a la chaine
// de fonctionner sur les 4 grands regimes optiques des cotes
// francaises, qui different par ordre de grandeur.
//
// Sources scientifiques :
//   - Babin M., Stramski D., Ferrari G.M., Claustre H.,
//     Bricaud A., Obolensky G., Hoepffner N. 2003, "Variations
//     in the light absorption coefficients of phytoplankton,
//     nonalgal particles, and dissolved organic matter in
//     coastal waters around Europe", J. Geophys. Res. 108(C7),
//     doi:10.1029/2001JC000882 (mesures a 350 stations
//     europeennes : Manche, Mediterranee, Mer du Nord,
//     Baltique, Adriatique)
//   - Babin M., Morel A., Fournier-Sicre V., Fell F.,
//     Stramski D. 2003, "Light scattering properties of marine
//     particles in coastal and open ocean waters as related to
//     the particle mass concentration", Limnol. Oceanogr. 48(2)
//     (b moyen Case 1 = 1.0 m^2/g, Case 2 = 0.5 m^2/g)
//   - Tessier C. 2013, "Dynamique des matieres en suspension
//     minerales des eaux de surface de la Manche observee par
//     satellite et modelisee numeriquement", these IFREMER,
//     theses.hal.science/tel-01016236 (MES Manche : silts >70%,
//     resuspension cotiere en Manche orientale)
//   - Smith R.C. & Baker K.S. 1981, "Optical properties of
//     the clearest natural waters", Applied Optics 20
//     (c_water = 0.05 m^-1 en eaux marines pures - applicable
//     uniquement aux eaux oligotrophes type Mediterranee)
//
// Decoupage en 4 zones (Case 1 vs Case 2, Babin 2003) :
//   - Mediterranee francaise : Case 1, eaux claires
//   - Atlantique sud (Gascogne, Aquitaine) : Case 2 clair
//   - Manche occidentale + Bretagne nord : Case 2 modere
//   - Manche orientale + baie de Seine + Mer du Nord sud :
//     Case 2 turbide
//
// IMPORTANT : ces valeurs representent l'etat optique typique
// de la masse d'eau hors evenement de mobilisation locale.
// La chaine 8 briques ajoute la mobilisation locale a c_baseline.
// Calibration finale par observations communautaires en Phase 2.
// ============================================================

// Determine la zone optique d'un point lat/lon et retourne
// les coefficients (c_baseline, b_local) correspondants.
//
// Argument : lat (deg), lon (deg)
// Retour   : { c_baseline, b_local, zone, sources } ou null
// ============================================================
// PATCH 8-B : Table b_local_by_folk par classe Folk5 et zone
// ------------------------------------------------------------
// Différenciation optique des sédiments par taille de grain
// dans chaque zone optique. Les fines (mud, Folk5=1) ont une
// surface spécifique massique 5-10× plus grande que les gros
// sables (coarse, Folk5=3), donc atténuent davantage la lumière
// par kg/m³ à concentration égale.
//
// Sources scientifiques :
//   - Babin M. et al. 2003, "Variations in the light absorption
//     coefficients of phytoplankton, non-algal particles, and
//     dissolved organic matter in coastal waters around Europe",
//     J. Geophys. Res. 108 (C7) (coefficients spectraux par
//     taille de grain)
//   - Bowers D.G. et al. 2006, "Light scattering properties
//     of particles in coastal and ocean waters as related to
//     the particle mass concentration", Limnol. Oceanogr. 54
//     (modèle bi-composantes inorganique/organique)
//   - Mobley C.D. 1994, "Light and Water: Radiative Transfer
//     in Natural Waters", Academic Press (relation surface
//     spécifique / atténuation pour particules minérales)
//
// Convention indexation : Folk5 numérique 1-5
//   1 = Mud (vase), 2 = Sand (sable), 3 = Coarse sediment
//   (cailloutis/gravier), 4 = Mixed sediment, 5 = Rock
//
// Valeurs initiales théoriques, recalibrables par observations
// communautaires en Phase 2.
// ============================================================
var B_LOCAL_BY_FOLK = {
  // ZONE 1 - Méditerranée (Case 1, oligotrophe)
  // Fines réduites, sables medium dominants en zones côtières
  'mediterranee': {
    1: 80,    // mud : rare en Med mais très atténuant
    2: 50,    // sand : valeur de base (Babin 2003 Case 1)
    3: 40,    // coarse : moins efficient optiquement
    4: 65,    // mixed : entre mud et sand
    5: 30     // rock : pas de sédiment mobilisable, plancher
  },
  // ZONE 2 - Atlantique sud (Case 2 transition)
  'atlantique_sud': {
    1: 350,   // mud : silts atlantiques (Loire, Gironde)
    2: 200,   // sand : valeur de base (Bowers 2006)
    3: 150,   // coarse
    4: 270,   // mixed
    5: 80     // rock
  },
  // ZONE 3 - Manche occidentale / Bretagne (Case 2 modéré)
  'manche_occidentale_bretagne': {
    1: 550,   // mud : panaches Vilaine, Rance
    2: 350,   // sand : valeur de base (Tessier 2013 zones non-turbides)
    3: 280,   // coarse
    4: 450,   // mixed
    5: 120    // rock
  },
  // ZONE 4 - Manche orientale (Case 2 turbide, silts dominants Tessier 2013)
  'manche_orientale_mer_du_nord_sud': {
    1: 750,   // mud : silts chroniques Seine, hyper-atténuants
    2: 500,   // sand : valeur de base (Babin 2003 Case 2 turbide)
    3: 400,   // coarse
    4: 620,   // mixed : très commun en baie de Seine
    5: 150    // rock
  },
  // FALLBACK - Médianes Europe (Babin 2003)
  'fallback_europe': {
    1: 450,
    2: 300,
    3: 220,
    4: 380,
    5: 100
  }
};
function getRegionalOpticalBaseline(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  if (!isFinite(lat) || !isFinite(lon)) return null;

  // ZONE 1 - Mediterranee francaise (Provence, Cote d'Azur, Corse)
  // Eaux Case 1, oligotrophes, peu de fines en suspension
  // Secchi typique 15-30m, c_baseline 0.05-0.10 m^-1
  if (lat >= 41.0 && lat <= 43.5 && lon >= 3.0 && lon <= 10.0) {
    return {
     c_baseline: 0.08,   // c_water + tres faible MES ambient
      b_local: 50,        // m^2/kg, sediment Case 1 fin (rétrocompat = sand Folk5=2)
      b_local_by_folk: B_LOCAL_BY_FOLK.mediterranee,  // Patch 8-B
      zone: 'mediterranee',
      sources: 'Smith & Baker 1981, Babin 2003 (Case 1)'
    };
  }

  // ZONE 2 - Atlantique sud (Gascogne, Aquitaine, Landes,
  // Pays Basque, sud Vendee)
  // Case 2 clair, transition oceanique
  // Secchi typique 8-15m, c_baseline 0.15-0.25 m^-1
  if (lat >= 43.0 && lat <= 46.5 && lon >= -3.5 && lon <= -0.5) {
    return {
  c_baseline: 0.20,
      b_local: 200,
      b_local_by_folk: B_LOCAL_BY_FOLK.atlantique_sud,  // Patch 8-B
      zone: 'atlantique_sud',
      sources: 'Babin 2003 (Case 2 transition), Bowers 2006'
    };
  }

  // ZONE 3 - Manche occidentale, Bretagne, Loire, nord Vendee
  // Case 2 modere, panaches fluviaux locaux
  // Secchi typique 4-10m, c_baseline 0.25-0.50 m^-1
  if ((lat >= 46.5 && lat <= 49.0 && lon >= -5.5 && lon <= -1.0) ||
      (lat >= 48.5 && lat <= 49.7 && lon >= -2.5 && lon <= -0.5)) {
    return {
  c_baseline: 0.35,
      b_local: 350,
      b_local_by_folk: B_LOCAL_BY_FOLK.manche_occidentale_bretagne,  // Patch 8-B
      zone: 'manche_occidentale_bretagne',
      sources: 'Babin 2003 (Case 2 modere), Tessier 2013'
    };
  }

  // ZONE 4 - Manche orientale, baie de Seine, Pas de Calais,
  // Mer du Nord sud (Calvados, Seine-Maritime, Somme, Pas de Calais, Nord)
  // Case 2 turbide, silts >70% (Tessier 2013), panache Seine,
  // resuspension cotiere chronique, plumes intertidales
  // Secchi typique 1-5m, c_baseline 0.50-1.50 m^-1
  if (lat >= 49.0 && lat <= 51.5 && lon >= -0.5 && lon <= 2.5) {
    return {
    c_baseline: 0.80,
      b_local: 500,
      b_local_by_folk: B_LOCAL_BY_FOLK.manche_orientale_mer_du_nord_sud,  // Patch 8-B
      zone: 'manche_orientale_mer_du_nord_sud',
      sources: 'Babin 2003 (Case 2 turbide), Tessier 2013, Bowers 2006'
    };
  }

  // FALLBACK - Zone hors France metropolitaine ou frontalieres
  // Valeurs medianes Case 2 europeennes (Babin 2003)
  // Documenter visuellement a l'utilisateur que la prediction
  // est en domaine fallback (a faire en UI plus tard)
  return {
    c_baseline: 0.30,
    b_local: 300,
    b_local_by_folk: B_LOCAL_BY_FOLK.fallback_europe,  // Patch 8-B
    zone: 'fallback_europe',
    sources: 'Babin 2003 (Case 2 mediane europeenne)'
  };
}
// ============================================================
// BRIQUE 8 - VISIBILITE SOUS-MARINE PAR LOI DE BEER-LAMBERT
// ------------------------------------------------------------
// Convertit la concentration de sediment en suspension
// (Brique 6, en kg/m^3) en distance de visibilite horizontale
// sous-marine (en metres) - la grandeur que verra l'utilisateur.
//
// C'est la brique finale de la chaine. Elle clot le passage
// physique : conditions hydrodynamiques -> contrainte au fond
// -> mobilisation -> concentration -> attenuation lumineuse
// -> visibilite.
//
// Sources scientifiques :
//   - Bouguer P. 1729, "Essai d'optique sur la gradation
//     de la lumiere" (loi originelle d'attenuation
//     exponentielle)
//   - Lambert J.H. 1760, "Photometria sive de mensura
//     et gradibus luminis, colorum et umbrae"
//     (formalisation mathematique)
//   - Beer A. 1852, "Bestimmung der Absorption des rothen
//     Lichts in farbigen Flussigkeiten", Ann. Physik 162
//     (extension aux solutions colorees)
//   - Secchi A. 1865, mesures de transparence en
//     Mediterranee a bord du Pie IX (origine du disque
//     de Secchi, mesure standard d'oceanographie)
//   - Smith R.C. & Baker K.S. 1981, "Optical properties
//     of the clearest natural waters", Applied Optics 20
//     (coefficient d'attenuation des eaux marines pures)
//   - Davies-Colley R.J. 1988, "Measuring water clarity
//     with a black disk", Limnol. Oceanogr. 33 (relation
//     visi horizontale = 1.4 * profondeur de Secchi)
//   - Davies-Colley R.J. & Smith D.G. 2001, "Turbidity,
//     suspended sediment, and water clarity", JAWRA 37
//     (coefficient d'attenuation specifique du sediment
//     marin cotier b = 1.0 m^2/kg, valeur mediane sur
//     etudes Pejrup 1988, Bunt et al. 1999)
//
// Loi de Beer-Lambert :
//     I(d) / I_0 = exp(-c_total * d)
// avec c_total = c_water + b * C
//   - c_water = 0.05 m^-1 (eau de mer claire, Smith & Baker 1981)
//   - b = 1.0 m^2/kg (sediment marin cotier, Davies-Colley
//     & Smith 2001, valeur mediane litterature)
//   - C = concentration en kg/m^3 (sortie Brique 6)
//
// Profondeur de Secchi (critere I/I_0 = 0.16) :
//     d_secchi = 1.7 / c_total
//
// Visibilite horizontale (Davies-Colley 1988) :
//     visi_m = 1.4 * d_secchi = 2.38 / c_total
//
// Domaine de validite :
//   - Sediments mineraux marins (sable, vase reconstitue,
//     gravier en suspension)
//   - Eau de mer cotiere claire (pas d'algue dominante,
//     pas de matiere organique majoritaire)
//   - Domaine de visi 0.5m - 30m (Davies-Colley 1988)
//
// LIMITES DE PRECISION (a documenter pour l'utilisateur) :
//   - Le coefficient b = 1.0 m^2/kg est une mediane
//     litterature, avec incertitude +/-50% selon le type
//     de sediment et la longueur d'onde. C'est le seul
//     coefficient libre de toute la chaine. Sera calibre
//     sur les observations communautaires en Phase 2.
//   - L'erreur typique sur la visi predite est de l'ordre
//     de +/-50% en valeur absolue pour la premiere version,
//     mais la TENDANCE et les RATIOS entre spots sont
//     fiables car bases sur la physique pure des Briques 1-7.
//
// Hors validite :
//   - Brique 6 a retourne null -> on retourne null
//   - Eaux profondes >50m en pleine journee : la lumiere
//     incidente change, formule a raffiner. Hors domaine
//     cotier de Visimer.
// ============================================================

// Calcule la visibilite horizontale sous-marine (en metres)
// a partir de la concentration de sediment en suspension.
//
// Argument : concentrationResult = sortie de Brique 6
//                                   contient c_moyen_kg
// Retour   : objet {visi_m, d_secchi, c_total, c_water, c_sediment}
//          ou null si entree invalide
function computeVisibility(concentrationResult, lat, lon, sediment) {
  // PATCH 8-B : sediment optionnel pour choisir b_local par classe Folk5
  // Validation : entree null en amont -> remontee du null
  if (concentrationResult === null || concentrationResult === undefined) return null;
  if (typeof concentrationResult.c_moyen_kg !== 'number') return null;
  if (!isFinite(concentrationResult.c_moyen_kg) || concentrationResult.c_moyen_kg < 0) return null;

  // Recupere les coefficients optiques regionaux selon lat/lon
  var optical = getRegionalOpticalBaseline(lat, lon);
  if (optical === null) return null;

var c_baseline = optical.c_baseline;  // turbidite ambiante de la zone (m^-1)
  
  // PATCH 8-B : choix b_local selon classe Folk du sédiment passé en arg
  // Si sediment fourni ET table b_local_by_folk disponible, on utilise
  // le coefficient spécifique à la classe Folk5. Sinon, fallback sur
  // b_local scalaire (rétrocompatibilité totale).
  var b_local;
  if (sediment && sediment.folk5 && optical.b_local_by_folk && optical.b_local_by_folk[sediment.folk5]) {
    b_local = optical.b_local_by_folk[sediment.folk5];
  } else {
    b_local = optical.b_local;
  }

  var C = concentrationResult.c_moyen_kg;

  // Coefficient d'attenuation total (1/m)
  // c_total = c_baseline_regional + b_local * C_mobilise_localement
  var c_sediment_contribution = b_local * C;
  var c_total = c_baseline + c_sediment_contribution;

  if (!isFinite(c_total) || c_total <= 0) return null;

  // Profondeur de Secchi : d_secchi = 1.7 / c_total (Preisendorfer 1986)
  var d_secchi = 1.7 / c_total;

  // Visibilite horizontale chasseur sous-marin
  // visi_m = 1.4 * d_secchi (Davies-Colley 1988)
  var visi_m = 2.38 / c_total;

  // Sanity check
  if (!isFinite(visi_m) || visi_m < 0) return null;
  if (visi_m > 50) {
    console.warn('[Brique8] visi_m > 50m, plafond physique depasse:', visi_m);
  }

  return {
    visi_m: visi_m,
    d_secchi: d_secchi,
    c_total: c_total,
    c_baseline: c_baseline,
    c_sediment: c_sediment_contribution,
    zone: optical.zone,
    sources: optical.sources
  };
}
// ============================================================
// MAPPING VISIBILITÉ (MÈTRES) → SCORE 0-100
// ------------------------------------------------------------
// Convertit la sortie de la chaîne 9 briques (Brique 8 : visi en
// mètres, loi de Beer-Lambert) en score 0-100 compatible avec
// l'UI existante (badge "Excellente/Bonne/Moyenne/Faible/Nulle"
// et bandeau Conditions 5 jours).
//
// Mapping logarithmique calibré sur le barème visuel actuel
// affiché sous le badge ("1m / 2m / 4m / 6m / 8m") :
//   visi = 0.3 m  -> score 0    (Nulle absolue)
//   visi = 1.0 m  -> score 25   (Faible)
//   visi = 2.0 m  -> score 42   (frontière Faible/Moyenne)
//   visi = 4.0 m  -> score 65   (Bonne)
//   visi = 8.0 m  -> score 93   (Excellente)
//   visi = 10.0 m -> score 100  (plafond)
//
// Choix logarithmique : la perception humaine de la visibilité
// sous-marine est non-linéaire. Passer de 1 m à 2 m double
// l'utilité plongée ; passer de 9 m à 10 m est imperceptible.
// L'échelle log capte cette non-linéarité (Weber-Fechner 1860,
// loi psychophysique standard appliquée à la perception
// visuelle subaquatique par Lythgoe 1979 "The Ecology of Vision").
//
// Convention Visimer : seul coefficient de cette chaîne qui n'est
// pas issu directement de la littérature physique. Sera recalibré
// par les observations communautaires en Phase 2.
//
// Domaine de validité : 0.3 m ≤ visi ≤ 10 m (au-delà, plafond 100).
// ============================================================
function mapVisiToScore(visi_m) {
  if (visi_m === null || visi_m === undefined || !isFinite(visi_m)) return 0;
  if (visi_m < 0.3) return 0;
  if (visi_m >= 10) return 100;
  // Mapping log : 0.3 m → 0, 10 m → 100
  var score = 100 * Math.log(visi_m / 0.3) / Math.log(10 / 0.3);
  return Math.max(0, Math.min(100, Math.round(score)));
}
// ============================================================
// ORCHESTRATEUR CENTRAL - CHAÎNE 9 BRIQUES → SCORE UI
// ------------------------------------------------------------
// Point d'entrée unique pour toute prédiction de visibilité.
// Substitue visScoreV2 dans les 5 consommateurs UI tout en
// conservant la rétrocompatibilité (l'attribut .score retourné
// est strictement équivalent au nombre retourné par visScoreV2).
//
// Stratégie strangler pattern :
//   - Tente d'abord la chaîne physique 9 briques (mode 'chain')
//   - Si pré-condition non satisfaite OU si une brique retourne
//     null en cours, bascule transparent sur visScoreV2 (mode
//     'empirical' ou 'fallback' selon le point de bascule)
//   - L'UI consommatrice reçoit toujours un score 0-100 valide
//
// Cache mémo (_chainCache) indexé par (lat_4, lon_4, idx, depth_3)
// pour absorber les ~220 appels par rafraîchissement drawer
// (24h tendance + 40 créneaux + 7 jours frise).
//
// Sources : voir Briques 1-8 individuellement. Le présent
// orchestrateur n'ajoute aucune physique nouvelle, il enchaîne.
// ============================================================

var _chainCache = {};

// Sprint 2 : cache séparé pour la voie satellite propagée.
// Mémoïse les sorties complètes de computeVisibilityScore_V4 quand
// la voie satellite est active, indexées par (lat, lon, idx, depth).
// Évite de re-propager à chaque rotation date/heure dans le drawer.
var _satelliteV4Cache = {};

// Sprint 3 : cache voie Coriolis propagée (même logique que satellite).
var _coriolisV4Cache = {};

function invalidateChainCache() {
  _chainCache = {};
  _satelliteV4Cache = {};
}

function computeVisibilityScore_V4(h, idx, depth, lat, lon) {
  // ----- Garde-fous d'entrée -----
  // Mêmes pré-conditions que visScoreV2 pour compatibilité signature
  if (!h || !h.windspeed_10m || idx < 0 || idx >= h.time.length) {
    return _buildEmpiricalResult(h, idx, depth, lat, lon, 'inputs invalides');
  }

  // ----- Cache mémo -----
  var cacheKey = lat.toFixed(4) + '|' + lon.toFixed(4) + '|' + idx + '|' + (depth || 0).toFixed(2);
  if (_chainCache[cacheKey]) return _chainCache[cacheKey];
// ============================================================
  // SPRINT 2 — VOIE SATELLITE PROPAGÉE (priorité 1)
  // ------------------------------------------------------------
  // Si une mesure satellite CMEMS valide est disponible pour ce
  // spot, on l'utilise comme point de départ et on propage jusqu'à
  // l'instant cible via Krone 1962 / Mehta 1989. Cette voie remplace
  // la chaîne 9 briques (qui dérive en régime advectif fort) par
  // une assimilation directe de la donnée terrain satellite.
  //
  // Fallback strangler : si satellite indisponible (no_data_72h,
  // pas de cache, ou erreur en cascade), on continue avec la voie
  // chaîne 9 briques (étape suivante de la fonction).
  //
  // Sources scientifiques (cf. fonctions appelées) :
  //   - inverseBeerLambert : Preisendorfer 1986, Babin 2003
  //   - propagate0D : Krone 1962, Mehta 1989, Soulsby 1997 ch.9
  //   - computeConfidence : raisonnement multifactoriel V1
  // ============================================================
  if (typeof S_spotSatelliteCache !== 'undefined' && S_spotSatelliteCache &&
      typeof S_spotSatelliteCache.lat === 'number' && typeof S_spotSatelliteCache.lon === 'number' &&
      Math.abs(S_spotSatelliteCache.lat - lat) < 0.01 &&
      Math.abs(S_spotSatelliteCache.lon - lon) < 0.01 &&
      S_spotSatelliteCache.data && S_spotSatelliteCache.data.status &&
(S_spotSatelliteCache.data.status === 'ok' ||
       S_spotSatelliteCache.data.status === 'cloudy_J1' ||
       S_spotSatelliteCache.data.status === 'cloudy_J2') &&
      // Sprint 3 : check fraîcheur 72h. Au-delà, fall-through vers Coriolis.
      (typeof S_spotSatelliteCache.data.age_hours !== 'number' ||
       S_spotSatelliteCache.data.age_hours <= 72)) {

    // ----- Cache satellite : early return si hit -----
    if (_satelliteV4Cache[cacheKey]) return _satelliteV4Cache[cacheKey];

    var satResult = S_spotSatelliteCache.data;
    var sediment = S._spotSediment;

    // ----- Étape A : Inversion Beer-Lambert (ZSD → C_kg_m3) -----
    var inversionResult = inverseBeerLambert_ZSDtoConcentration(satResult.value_zsd_m, lat, lon);
    if (inversionResult !== null) {
      var C_initial = inversionResult.C_kg_m3;

      // ----- Étape B : Propagation 0D jusqu'à idx cible -----
      var propResult = propagate0D(
        C_initial,
        satResult.date_observed,
        h,
        idx,
        depth,
        lat,
        lon,
        sediment
      );

      if (propResult !== null) {
        // ----- Étape C : Calcul confiance F1-F5 -----
        // idxStart = index dans h.time correspondant à date_observed
        // (recalculé ici pour la confiance ; propagate0D l'a aussi
        // calculé en interne mais ne l'expose pas)
        var satMs = new Date(satResult.date_observed).getTime();
        var idxStart_conf = 0;
        var bestDelta = Infinity;
        for (var ic = 0; ic < h.time.length; ic++) {
          var d = Math.abs(new Date(h.time[ic]).getTime() - satMs);
          if (d < bestDelta) { bestDelta = d; idxStart_conf = ic; }
        }

        var confResult = computeConfidence(satResult, propResult, h, idxStart_conf, idx, lat, lon);

        // ----- Étape D : Construction objet result enrichi -----
        var visi_propagated = propResult.visi_propagated_m;
        var score_satellite = mapVisiToScore(visi_propagated);

        var satelliteResult = {
          // Champs legacy (rétrocompatibilité 5 consommateurs UI)
          score: score_satellite,
          visi_m: visi_propagated,
          label: _scoreToLabel(score_satellite),
          engine: 'satellite_propagated',
          trace: {
            fallback_reason: null,
            spot: {
              depth_lat: depth,
              sediment_name: sediment ? sediment.nameFr : 'inconnu',
              zone_optique: inversionResult.zone
            },
            satellite_source: 'CMEMS Ocean Colour multi-1km',
            propagation: propResult.trace
          },
          verdict: _buildVerdictSatelliteProse(satResult, propResult, confResult),
          warnings: propResult.warnings || [],

          // Nouveaux champs satellite (Sprint 2)
          satellite: {
            visi_m: satResult.visi_plongeur_m,
            zsd_m: satResult.value_zsd_m,
            date_observed: satResult.date_observed,
            age_hours: satResult.age_hours,
            status: satResult.status
          },
          propagated: {
            visi_m: visi_propagated,
            C_propagated_kg_m3: propResult.C_propagated_kg_m3,
            n_steps_integrated: propResult.n_steps_integrated,
            dominant_phase: propResult.dominant_phase
          },
          confidence: confResult || { pct: null, label_color: 'caution' }
        };

        _satelliteV4Cache[cacheKey] = satelliteResult;
        return satelliteResult;
      }
    }
    // Si inversion ou propagation a échoué, fall-through vers voie chaîne.
    // Comportement défensif : on ne jette pas, on dégrade silencieusement.
  }
  // Fin voie satellite. Si pas de satellite dispo ou échec, on continue
  // avec la voie chaîne 9 briques (code existant ci-dessous).
// ============================================================
  // SPRINT 3 — VOIE CORIOLIS PROPAGÉE (priorité 2)
  // ------------------------------------------------------------
  // Si une mesure bouée IFREMER COAST-HF (Coriolis Côtier) est
  // disponible pour la zone de ce spot (rayon configurable), on
  // l'utilise comme ancrage in-situ. Plus précis que satellite
  // mais limité géographiquement aux 10+ bouées du réseau national.
  //
  // Activée uniquement si la voie satellite a échoué (no_data,
  // mesure > 72h, propagation impossible). Si Coriolis échoue
  // aussi → fall-through vers voie chaîne 9 briques.
  //
  // Sources scientifiques :
  //   - Bouée SMILE Luc-sur-Mer : réseau COAST-HF IFREMER
  //   - Inversion NTU → visi : loi de puissance Sestroretsky 2024
  //     (visi = 5.6 × NTU^(-0.5)) × facteur 0.7 plongeur
  //   - Propagation 0D : identique voie satellite (Krone 1962)
  // ============================================================
  if (typeof S_spotCoriolisCache !== 'undefined' && S_spotCoriolisCache &&
      typeof S_spotCoriolisCache.lat === 'number' && typeof S_spotCoriolisCache.lon === 'number' &&
      Math.abs(S_spotCoriolisCache.lat - lat) < 0.01 &&
      Math.abs(S_spotCoriolisCache.lon - lon) < 0.01 &&
      S_spotCoriolisCache.data && S_spotCoriolisCache.data.status === 'ok' &&
      typeof S_spotCoriolisCache.data.value_ntu === 'number') {

    // ----- Cache Coriolis : early return si hit -----
    if (typeof _coriolisV4Cache !== 'undefined' && _coriolisV4Cache[cacheKey]) {
      return _coriolisV4Cache[cacheKey];
    }
    if (typeof _coriolisV4Cache === 'undefined') {
      _coriolisV4Cache = {};
    }

    var coriolisData = S_spotCoriolisCache.data;

    // ----- Étape A : NTU → visi plongeur (mètres) -----
    var visi_coriolis = inverseNTUtoVisibility(coriolisData.value_ntu);

    if (visi_coriolis !== null && isFinite(visi_coriolis)) {
      // ----- Étape B : Construction objet result -----
      // NB : pas de propagation 0D ici dans cette première version
      // (besoin C_kg_m3 → dérivation NTU empirique incertaine pour
      // l'instant). On affiche la mesure brute convertie. La voie
      // satellite_propagated reste la seule à propager via Beer-Lambert.
      // Évolution Sprint 3.5 : ajouter propagation Coriolis avec
      // NTU → C empirique calibré sur 1 an d'historique SMILE.
      var score_coriolis = mapVisiToScore(visi_coriolis);

      var coriolisResult = {
        // Champs legacy (rétrocompatibilité 5 consommateurs UI)
        score: score_coriolis,
        visi_m: visi_coriolis,
        label: _scoreToLabel(score_coriolis),
        engine: 'coriolis_propagated',
        trace: {
          fallback_reason: null,
          buoy_name: coriolisData.buoy_name,
          buoy_distance_km: coriolisData.distance_km,
          ntu_measured: coriolisData.value_ntu,
          qc: coriolisData.qc,
          age_hours: coriolisData.age_hours
        },
        verdict: 'Mesure terrain IFREMER ' + coriolisData.buoy_name
          + ' (' + coriolisData.distance_km.toFixed(1) + ' km) : '
          + coriolisData.value_ntu.toFixed(1) + ' NTU mesurés il y a '
          + Math.round(coriolisData.age_hours * 10) / 10 + ' h, '
          + 'visibilité estimée ' + visi_coriolis.toFixed(1) + ' m.',
        warnings: [],

        // Nouveau bloc coriolis (pour drawer)
        coriolis: {
          value_ntu: coriolisData.value_ntu,
          visi_m: visi_coriolis,
          buoy_name: coriolisData.buoy_name,
          distance_km: coriolisData.distance_km,
          timestamp_observed: coriolisData.timestamp_observed,
          age_hours: coriolisData.age_hours,
          qc: coriolisData.qc
        },
        confidence: {
          pct: 75,  // fiabilité statique correcte (mesure in-situ < 6h)
          label_color: 'success'
        }
      };

      _coriolisV4Cache[cacheKey] = coriolisResult;
      return coriolisResult;
    }
    // Si inversion NTU a échoué, fall-through vers chaîne (comme satellite).
  }
  // Fin voie Coriolis. Si pas de bouée proche ou échec, on continue
  // avec la voie chaîne 9 briques (code existant ci-dessous).
  // ----- Initialisation du résultat -----
  var result = {
    score: 0,
    visi_m: null,
    label: 'Nulle',
    engine: 'chain',
    trace: {},
    verdict: '',
    warnings: []
  };

  // ----- Pré-condition 1 : sédiment connu et mobilisable -----
  // S._spotSediment est rempli par fetchSedimentType au clic.
  // En race condition (clic avant retour SHOM), S._spotSediment
  // est null → fallback empirical.
  if (!S._spotSediment) {
    var r1 = _buildEmpiricalResult(h, idx, depth, lat, lon, 'sédiment non chargé');
    _chainCache[cacheKey] = r1;
    return r1;
  }

var sediment = S._spotSediment;
  if (sediment.regime === 'rock') {
    // ============================================================
    // PATCH 8-H : Tentative Mode B amont avant fallback empirical
    // ------------------------------------------------------------
    // Si le sediment ponctuel SHOM est rocheux MAIS qu'une zone
    // sedimentaire est disponible dans le rayon advectif, on tente
    // d'activer le Mode B mono-classe zonal AVANT de basculer en
    // empirical. Justification : SHOM 1:250k a une resolution de
    // 250m, donc un pixel "rocheux" peut etre adjacent a une plage
    // de sable dont la turbidite advectee influence reellement la
    // visibilite locale via les courants tidaux.
    //
    // Test d'activation Mode B amont :
    //   - Cache zonal disponible (sinon empirical comme avant)
    //   - >= 1 classe non-rock dans la zone
    //   - dominance relative parmi non-rock >= 65%
    //   - surface absolue de la dominante >= 15%
    //
    // Si activation : on utilise le sediment zonal dominant comme
    // sediment de reference pour la chaine 1-9 (briques 2,3,5,7
    // exigent D50 valide, donc on substitue le sediment rock par
    // le sediment zonal).
    //
    // Sinon : early-return empirical comme avant (vraie zone
    // rocheuse a grande echelle).
    // ============================================================
  // Patch 8-I : pipe final pour eviter collisions de prefixe
    // (ex: 49.66|-1.905 matche 49.6618|-1.9053 sans pipe).
    var zoneKeyRockPrefix = lat.toFixed(4) + '|' + lon.toFixed(4) + '|';
    var zoneRock = null;
    if (typeof S_spotZoneCache !== 'undefined') {
      var zRockKeys = Object.keys(S_spotZoneCache).filter(function(k) {
        return k.indexOf(zoneKeyRockPrefix) === 0;
      });
      if (zRockKeys.length > 0) zoneRock = S_spotZoneCache[zRockKeys[0]];
    }
    
    var canActivateModeBUpstream = false;
    var dominantZonalSediment = null;
    
    if (zoneRock && zoneRock.classes && zoneRock.classes.length > 0) {
      var nonRockZ = zoneRock.classes.filter(function(c) {
        return c.sediment && c.sediment.regime !== 'rock';
      });
      if (nonRockZ.length > 0) {
        var dominantZ = nonRockZ.reduce(function(prev, curr) {
          return (curr.surface_pct > (prev ? prev.surface_pct : 0)) ? curr : prev;
        }, null);
        var totalNonRockZ = nonRockZ.reduce(function(s, c) {
          return s + (c.surface_pct || 0);
        }, 0);
        var dominanceRelZ = (totalNonRockZ > 0 && dominantZ)
          ? (dominantZ.surface_pct / totalNonRockZ)
          : 0;
        if (dominantZ && dominanceRelZ >= 0.65 && dominantZ.surface_pct >= 15) {
          canActivateModeBUpstream = true;
          dominantZonalSediment = dominantZ.sediment;
        }
      }
    }
    
    if (canActivateModeBUpstream) {
      // Substitue le sediment ponctuel rocheux par le sediment
      // zonal dominant pour permettre l'execution de la chaine 1-9.
      // Note : on ne mute pas S._spotSediment (effets de bord
      // cross-fonction), on utilise une variable locale.
      sediment = dominantZonalSediment;
      // Le flux V4 continue normalement avec ce nouveau sediment.
      // La branche Mode B en aval detectera deja l'activation et
      // documentera correctement la trace.
    } else {
      // Vraie zone rocheuse a grande echelle : fallback empirical.
      var r2 = _buildEmpiricalResult(h, idx, depth, lat, lon,
        'fond rocheux (pas de sédiment mobilisable)');
      _chainCache[cacheKey] = r2;
      return r2;
    }
  }
  if (sediment.regime === 'cohesive') {
    // Vase : chaîne non applicable (flocs en milieu salin,
    // hors domaine Soulsby 1997). Voir Whitehouse et al. 2000
    // pour une future extension cohésive.
    var r3 = _buildEmpiricalResult(h, idx, depth, lat, lon,
      'fond vaseux (modèle cohésif non implémenté)');
    _chainCache[cacheKey] = r3;
    return r3;
  }

  // ----- Pré-condition 2 : données marines disponibles -----
  if (!S_spotMarineCache || !S_spotMarineCache.wave_height) {
    var r4 = _buildEmpiricalResult(h, idx, depth, lat, lon,
      'données marines non chargées');
    _chainCache[cacheKey] = r4;
    return r4;
  }

// ----- Pré-condition 3 : profondeur LAT valide (non-null) -----
  // On accepte les spots à très faible profondeur LAT (estran)
  // car ils peuvent être chassables à pleine mer.
  // La garde stricte (< 0.5m) sera appliquée APRÈS calcul de
  // depthInstant pour rejeter uniquement les créneaux où l'eau
  // est réellement insuffisante au moment T (à BM grand coef).
  if (!depth || depth <= 0) {
    var r5 = _buildEmpiricalResult(h, idx, depth, lat, lon,
      'profondeur LAT non disponible');
    _chainCache[cacheKey] = r5;
    return r5;
  }

  // ----- Récupération des variables marines au créneau idx -----
  // Les caches météo (h) et marine (S_spotMarineCache) ne sont
  // pas alignés sur les mêmes timestamps. On aligne par index
  // approximatif si même résolution horaire, sinon par recherche.
  var marineIdx = idx;
  if (S_spotMarineCache.time && h.time && S_spotMarineCache.time.length !== h.time.length) {
    // Resync par recherche : trouve le créneau marine le plus proche
    var targetMs = new Date(h.time[idx]).getTime();
    var bestDelta = Infinity;
    for (var mi = 0; mi < S_spotMarineCache.time.length; mi++) {
      var d = Math.abs(new Date(S_spotMarineCache.time[mi]).getTime() - targetMs);
      if (d < bestDelta) { bestDelta = d; marineIdx = mi; }
    }
    if (bestDelta > 1800000) {  // > 30 min de décalage
      var r6 = _buildEmpiricalResult(h, idx, depth, lat, lon,
        'décalage temporel marine > 30 min');
      _chainCache[cacheKey] = r6;
      return r6;
    }
  }

  var Hs = S_spotMarineCache.wave_height[marineIdx] || 0;
  var Tp = S_spotMarineCache.wave_period ? (S_spotMarineCache.wave_period[marineIdx] || 0) : 0;
  var U = S_spotMarineCache.ocean_current_velocity ? (S_spotMarineCache.ocean_current_velocity[marineIdx] || 0) : 0;
  var waveDir = S_spotMarineCache.wave_direction ? S_spotMarineCache.wave_direction[marineIdx] : null;
  var currentDir = S_spotMarineCache.ocean_current_direction ? S_spotMarineCache.ocean_current_direction[marineIdx] : null;

// Profondeur instantanée (LAT + marée) pour le créneau idx.
  // C'est sur cette valeur que la chaîne physique opère, car les
  // briques 1 (Airy), 3 (profil log courant) et 6 (Rouse) ont
  // toutes besoin de la VRAIE colonne d'eau au moment T, pas du
  // zéro hydrographique.
  var depthInstant = depthAtTimeCached(depth, h.time[idx]);

  // Garde stricte : si l'eau est réellement insuffisante à ce
  // moment précis (estran émergé à BM grand coef, par exemple),
  // la chaîne n'est pas applicable - le spot est à sec ou
  // quasi-sec, la notion de visibilité sous-marine n'a plus
  // de sens.
  if (depthInstant < 0.5) {
    var r5b = _buildEmpiricalResult(h, idx, depth, lat, lon,
      'eau insuffisante à cet instant (depth_instant=' + depthInstant.toFixed(2) + 'm)');
    _chainCache[cacheKey] = r5b;
    return r5b;
  }

  // Vent pour métadonnées trace (pas utilisé par la chaîne physique,
  // qui n'a besoin que de Hs/Tp/U déjà calculés par AROME en intégrant
  // le vent comme forçage en amont).
  var windKmh = h.windspeed_10m[idx] || 0;
  var gustsKmh = h.windgusts_10m[idx] || 0;
  var windDir = h.winddirection_10m ? h.winddirection_10m[idx] : null;

  // ----- Récupération de la zone optique régionale -----
  var optical = getRegionalOpticalBaseline(lat, lon);
  if (!optical) {
    var r7 = _buildEmpiricalResult(h, idx, depth, lat, lon,
      'zone optique non identifiée');
    _chainCache[cacheKey] = r7;
    return r7;
  }

  // ----- Trace : données de contexte (avant calcul physique) -----
  result.trace.spot = {
    depth_lat: depth,
    depth_instant: depthInstant,
    sediment_name: sediment.nameFr,
    sediment_D50_mm: sediment.D50_mm,
    zone_optique: optical.zone,
    c_baseline: optical.c_baseline,
    b_local: optical.b_local
  };
  result.trace.surface = {
    wind_kt: Math.round(windKmh * 0.539957),
    gusts_kt: Math.round(gustsKmh * 0.539957),
    wind_dir: windDir,
    wave_total: Hs,
    wave_period: Tp,
    current_velocity: U,
    current_dir: currentDir,
    source: 'AROME 1.3km + Open-Meteo Marine'
  };

  // ============================================================
  // EXÉCUTION DE LA CHAÎNE PHYSIQUE 9 BRIQUES
  // ============================================================

  // BRIQUE 1 — Vitesse orbitale au fond (Airy 1845)
  var omega = Tp > 0 ? (2 * Math.PI / Tp) : 0;
  var u_b = computeOrbitalVelocityAtBed(Hs, Tp, depthInstant);
  if (u_b === null) {
    var r8 = _buildEmpiricalResult(h, idx, depth, lat, lon,
      'Brique 1 (Airy) a retourné null');
    _chainCache[cacheKey] = r8;
    return r8;
  }
result.trace.brique1 = { u_b: u_b };

  // ----- Garde-fou scientifique : détection hors domaine Airy -----
  // Source : Soulsby 1997 ch.4 "Domaine de validité d'Airy : H/D < 0.4"
  // Au-delà, la vague entre en zone de déferlement et la formule
  // surestime fortement u_b. La chaîne reste exécutée pour donner
  // une indication, mais l'utilisateur est alerté que la prédiction
  // est hors domaine de validité scientifique.
  if (Hs > 0 && depthInstant > 0) {
    var HsOverD = Hs / depthInstant;
    if (HsOverD > 0.4) {
      result.warnings.push(
        'Hors domaine de validité Airy : Hs/D = ' + HsOverD.toFixed(2) +
        ' > 0.4 (déferlement probable). La prédiction de mobilisation est ' +
        'probablement surestimée. Modèle de surf zone (Battjes & Janssen 1978) ' +
        'à implémenter en Phase 2.'
      );
    }
  }

  // BRIQUE 2 — Cisaillement par la houle (Swart 1974 / Soulsby 1997)
  var tau_w = computeBedShearStressWaves(u_b, omega, sediment);
  if (tau_w === null) {
    var r9 = _buildEmpiricalResult(h, idx, depth, lat, lon,
      'Brique 2 (cisaillement houle) a retourné null');
    _chainCache[cacheKey] = r9;
    return r9;
  }
  result.trace.brique2 = { tau_w: tau_w };

  // ----- Garde-fou scientifique : détection courant aberrant -----
  // Sources :
  //   - SHOM "Atlas des courants de marée de la côte ouest de France"
  //     Manche : courants tidaux côtiers max 0.5-1.0 m/s en vive-eau
  //   - Copernicus Marine IBI : grille 1.5km, valeurs aberrantes
  //     possibles près des côtes par lissage numérique
  //
  // Hors zones de courant fort connues (Raz Blanchard, Fromveur,
  // Cap Sizun, Passage de la Déroute, Goulet de Brest), un courant
  // > 1.5 m/s est physiquement suspect et probablement issu d'un
  // artefact de modèle Open-Meteo. On bascule U à 0 et on alerte
  // l'utilisateur via warning. Pas de clamp arbitraire : soit on
  // a confiance et on garde, soit on n'a pas confiance et on annule.
  var U_effectif = U;
  if (Math.abs(U) > 1.5) {
    var inStrongCurrentZone = (
      // Raz Blanchard
      (lat >= 49.60 && lat <= 49.75 && lon >= -2.00 && lon <= -1.85) ||
      // Fromveur
      (lat >= 48.40 && lat <= 48.50 && lon >= -5.10 && lon <= -4.90) ||
      // Goulet de Brest
      (lat >= 48.32 && lat <= 48.38 && lon >= -4.55 && lon <= -4.45) ||
      // Cap Sizun / Raz de Sein
      (lat >= 48.00 && lat <= 48.10 && lon >= -4.85 && lon <= -4.65) ||
      // Passage de la Déroute (entre Cotentin et Iles Anglo-Normandes)
      (lat >= 49.00 && lat <= 49.30 && lon >= -1.85 && lon <= -1.65)
    );
    if (!inStrongCurrentZone) {
      result.warnings.push(
        'Courant Open-Meteo aberrant : ' + U.toFixed(2) +
        ' m/s détecté hors zone de courant fort connue. ' +
        'Composante courant ignorée dans le calcul (Brique 3 mise à zéro).'
      );
      U_effectif = 0;
    }
  }

  // BRIQUE 3 — Cisaillement par le courant (Prandtl 1925 / Soulsby 1997)
  var tau_c = computeBedShearStressCurrent(U_effectif, sediment, depthInstant);
  if (tau_c === null) {
    // Si courant null mais houle OK, on continue avec tau_c=0 (cas
    // dégénéré accepté par Brique 4). On ne fallback pas pour ça.
    tau_c = 0;
  }
  result.trace.brique3 = { tau_c: tau_c };

  // BRIQUE 4 — Combinaison houle + courant (Soulsby & Clarke 2005)
  var tau_max = computeBedShearStressCombined(tau_w, tau_c, waveDir, currentDir);
  if (tau_max === null) {
    var r10 = _buildEmpiricalResult(h, idx, depth, lat, lon,
      'Brique 4 (combinaison) a retourné null');
    _chainCache[cacheKey] = r10;
    return r10;
  }
  result.trace.brique4 = { tau_max: tau_max };

  // BRIQUE 5 — Critère de Shields (Shields 1936 / Soulsby 1997)
  var shieldsResult = computeShieldsCriterion(tau_max, sediment);
  if (shieldsResult === null) {
    var r11 = _buildEmpiricalResult(h, idx, depth, lat, lon,
      'Brique 5 (Shields) a retourné null');
    _chainCache[cacheKey] = r11;
    return r11;
  }
  result.trace.brique5 = {
    theta: shieldsResult.theta,
    theta_cr: shieldsResult.theta_cr,
    excess: shieldsResult.excess,
    mobilized: shieldsResult.excess > 1.0
  };

  // BRIQUE 7 — Vitesse de chute (Stokes 1851 / Soulsby 1997)
  // Calculée avant Brique 6 car Brique 6 en a besoin
  var w_s = computeSettlingVelocity(sediment);
  if (w_s === null) {
    var r12 = _buildEmpiricalResult(h, idx, depth, lat, lon,
      'Brique 7 (vitesse de chute) a retourné null');
    _chainCache[cacheKey] = r12;
    return r12;
  }
  result.trace.brique7 = { w_s: w_s };

  // BRIQUE 6 — Concentration en suspension (Rouse 1937 / Soulsby 1997)
  var concResult = computeSuspendedConcentration(tau_max, shieldsResult, w_s, depthInstant, sediment);
  if (concResult === null) {
    var r13 = _buildEmpiricalResult(h, idx, depth, lat, lon,
      'Brique 6 (concentration) a retourné null');
    _chainCache[cacheKey] = r13;
    return r13;
  }
result.trace.brique6 = {
    c_moyen_kg: concResult.c_moyen_kg,
    c_moyen_kg_brut: concResult.c_moyen_kg_brut,
    rouse_number: concResult.rouse_number,
    rouse_factor: concResult.rouse_factor,
    transport_mode: concResult.transport_mode
  };

// ============================================================
  // BRIQUE 9 — CINÉTIQUE DE DÉCANTATION (mémoire temporelle)
  // ------------------------------------------------------------
  // Insertion Patch 7-C : la Brique 8 (Beer-Lambert) reçoit
  // C_kinetic au lieu de C_équilibre. Permet de capturer la
  // mémoire temporelle de décantation Krone 1962 / Soulsby 1997
  // ch.9. Voir computeKineticConcentration plus haut pour la
  // théorie complète.
  // ============================================================
  var kinResult = computeKineticConcentration(
    h, idx, depth, lat, lon, sediment, concResult.c_moyen_kg
  );
  // Push des éventuels warnings (cache tronqué, profondeur nulle...)
  if (kinResult.warnings && kinResult.warnings.length > 0) {
    kinResult.warnings.forEach(function(w) { result.warnings.push(w); });
  }
  result.trace.brique9 = {
    C_equilibre_now: concResult.c_moyen_kg,
    C_inherited: kinResult.C_inherited,
    C_kinetic: kinResult.C_kinetic,
    tau_dep_seconds: kinResult.tau_dep_at_idx,
    dominant: kinResult.dominant,
    n_contributions: kinResult.n_contributions
  };
// On construit un concResult modifié pour Brique 8 (Beer-Lambert)
  // contenant C_kinetic au lieu de C_équilibre.
  var concResultKinetic = {
    c_moyen_kg: kinResult.C_kinetic,
    rouse_number: concResult.rouse_number
  };

  // ============================================================
  // PATCH 8-C-2d — Branche multi-classes (si zone disponible)
  // ------------------------------------------------------------
  // Si S_spotZoneCache contient ≥2 classes non-rock pour ce
  // spot, on exécute computeChainPerClass pour chaque classe et
  // on combine via combineMultiClassOptics. Sinon, fallback sur
  // le mono-classe actuel (chemin Beer-Lambert standard).
  //
  // Asynchronicité : le cache zonal est rempli ~1-2s après le
  // clic par fetchSedimentZone (déclenché dans openSpotPopup).
  // Premier rendu = mono-classe (cache vide). Après résolution
  // de la promise, re-render → multi-classes.
  //
  // Trace zonale : result.trace.zone est rempli dans tous les
  // cas où la zone a été tentée (avec error si fallback).
  // ============================================================
  var visResult = null;
  var multiClassesActive = false;
  
// ============================================================
  // PATCH 8-I : Lecture cache zonal compatible Patch 8-F
  // ------------------------------------------------------------
  // Depuis Patch 8-F, la cle de cache contient le rayon arrondi
  // (lat|lon|R{rayon}). On cherche toutes les cles qui commencent
  // par lat|lon| et on prend la premiere (normalement une seule).
  // Sans ce correctif, Mode A multi-classes et Mode B aval ne
  // lisent jamais le cache zonal et tombent systematiquement en
  // fallback empirical, annulant tout l'effet du rayon adaptatif.
  // ============================================================
  var zoneKeyPrefix = lat.toFixed(4) + '|' + lon.toFixed(4) + '|';
  var zone = null;
  if (typeof S_spotZoneCache !== 'undefined') {
    var zoneKeys = Object.keys(S_spotZoneCache).filter(function(k) {
      return k.indexOf(zoneKeyPrefix) === 0;
    });
    if (zoneKeys.length > 0) zone = S_spotZoneCache[zoneKeys[0]];
  }
  
if (zone && zone.classes && zone.classes.length >= 1) {
    // Filtre les classes non-rock pour le calcul zonal
    var nonRockClasses = zone.classes.filter(function(c) {
      return c.sediment && c.sediment.regime !== 'rock';
    });
    
    // ============================================================
    // PATCH 8-E — Activation intelligente : 3 modes
    // ------------------------------------------------------------
    // Mode A "multi-classes pondéré" : >=2 classes non-rock chacune >=30%
    //   → chaîne 1-9 par classe + combineMultiClassOptics
    //
    // Mode B "mono-classe zonal" : 1 classe dominante non-rock >=65%
    //   ET D50 différent du ponctuel (>=0.1mm)
    //   → chaîne 1-9 sur classe zonale + computeVisibility scalaire
    //   → corrige le cas EMODnet 1:250k imprécis au point exact
    //
    // Mode C "fallback ponctuel" : aucun des deux
    //   → comportement historique sur sediment ponctuel
    //
    // Sources :
    //   - Soulsby 1997 "Dynamics of Marine Sands" ch.9 §3 (seuil 70%
    //     approche homogénéisée vs pondérée)
    //   - Le Hir et al. 2011 "Sediment erodability in sediment transport
    //     modelling" Cont. Shelf Res. 31 (modèles MARS3D 60-70%)
    //   - Folk 1954 (classes définies par 50% de masse)
    // ============================================================
    
    // Mode A : tentative multi-classes pondéré
    var classesMin30pct = nonRockClasses.filter(function(c) {
      return c.surface_pct >= 30;
    });
    
    if (classesMin30pct.length >= 2) {
      // Construit le contexte hydrodynamique commun à toutes les classes
      var commonCtx = {
        h: h,
        idx: idx,
        depth: depth,
        lat: lat,
        lon: lon,
        depthInstant: depthInstant,
        Hs: Hs,
        Tp: Tp,
        U_effectif: U_effectif,
        waveDir: waveDir,
        currentDir: currentDir
      };
      
      // Exécute la chaîne 1-9 pour chaque classe non-rock
      var classes_with_C = [];
      var anyError = false;
      
      for (var iZone = 0; iZone < nonRockClasses.length; iZone++) {
        var classEntry = nonRockClasses[iZone];
        var ctxClass = Object.assign({}, commonCtx);
        ctxClass.sediment = classEntry.sediment;
        
        var chainRes = computeChainPerClass(ctxClass);
        if (chainRes.error) {
          console.warn('[V4 multi-classes] classe ' + classEntry.nameFr + ' échouée:', chainRes.error);
          anyError = true;
          continue;
        }
        
        classes_with_C.push({
          sediment: classEntry.sediment,
          C_kinetic: chainRes.C_kinetic || 0,
          surface_pct: classEntry.surface_pct,
          chain_trace: chainRes.trace
        });
      }
      
      if (classes_with_C.length >= 2) {
        var multiVisResult = combineMultiClassOptics(classes_with_C, optical);
        if (multiVisResult !== null) {
          visResult = multiVisResult;
          multiClassesActive = true;
          
          result.trace.zone = {
            radius_m: zone.radius_m,
            classes: classes_with_C.map(function(c) {
              return {
                folk5: c.sediment.folk5,
                nameFr: c.sediment.nameFr,
                D50_mm: c.sediment.D50_mm,
                surface_pct: c.surface_pct,
                C_kinetic: c.C_kinetic
              };
            }),
            total_surface_pct: zone.total_surface_pct,
            multi_class_active: true,
            n_classes_used: classes_with_C.length,
            n_classes_skipped: nonRockClasses.length - classes_with_C.length
         };
        }
      }
    }
    
// ============================================================
    // PATCH 8-E — Mode B : mono-classe zonal (si Mode A pas activé)
    // ------------------------------------------------------------
    // PATCH 8-G : Dominance relative parmi les classes non-rock
    // ------------------------------------------------------------
    // Le seuil de 65% est applique sur la PROPORTION RELATIVE
    // parmi les sediments mobilisables, pas sur la surface absolue.
    // Justification : en zone cotiere, 30-50% du cercle Monte Carlo
    // tombe hors polygones EMODnet (mer ouverte non cartographiee),
    // ce qui ferait artificiellement chuter les pourcentages.
    // Ce qui compte physiquement, c'est le rapport entre classes
    // sedimentaires mobilisables qui contribuent a l'optique.
    //
    // Garde supplementaire : surface absolue >= 15% pour eviter
    // d'activer Mode B sur une poche minuscule de sediment au
    // milieu d'une zone majoritairement rocheuse.
    //
    // Source : Krumbein W.C. & Sloss L.L. 1963, "Stratigraphy
    // and sedimentation", Freeman, ch.4 (geostatistique
    // sedimentaire, normalisation sur base mobilisable).
    // ============================================================
    if (visResult === null) {
      // Cherche la classe non-rock dominante
      var dominantClass = nonRockClasses.reduce(function(prev, curr) {
        return (curr.surface_pct > (prev ? prev.surface_pct : 0)) ? curr : prev;
      }, null);
      
      // Calcule la dominance relative parmi les classes non-rock
      var totalNonRockPct = nonRockClasses.reduce(function(s, c) {
        return s + (c.surface_pct || 0);
      }, 0);
      var dominanceRelative = (totalNonRockPct > 0 && dominantClass)
        ? (dominantClass.surface_pct / totalNonRockPct)
        : 0;
      
      // Mode B s'active si : dominance relative >= 65% ET surface absolue >= 15%
      if (dominantClass && dominanceRelative >= 0.65 && dominantClass.surface_pct >= 15) {
        // Vérifie que D50 zonal diffère significativement du ponctuel
        var d50Ponctuel = sediment.D50_mm || 0;
        var d50Zonal = dominantClass.D50_mm || 0;
        var deltaD50 = Math.abs(d50Zonal - d50Ponctuel);
        
        // Active mono-classe zonal si D50 différent OU si sediment ponctuel = rock
        // (cas EMODnet imprécis sur 1:250k : ponctuel rock mais zone à dominante sable)
        var shouldActivate = (deltaD50 >= 0.1) || (sediment.regime === 'rock');
        
        if (shouldActivate) {
          // Exécute la chaîne 1-9 sur le sédiment zonal dominant
          var ctxZonal = {
            h: h, idx: idx, depth: depth, lat: lat, lon: lon,
            sediment: dominantClass.sediment,
            depthInstant: depthInstant,
            Hs: Hs, Tp: Tp, U_effectif: U_effectif,
            waveDir: waveDir, currentDir: currentDir
          };
          
          var chainZonal = computeChainPerClass(ctxZonal);
          
          if (!chainZonal.error && chainZonal.C_kinetic !== undefined) {
            // Reconstruit concResultKinetic avec C_kinetic zonal
            var concResultKineticZonal = {
              c_moyen_kg: chainZonal.C_kinetic,
              rouse_number: chainZonal.rouse_number
            };
            
            // Visi via Beer-Lambert mono-classe (avec b_local_by_folk de la classe zonale)
            visResult = computeVisibility(concResultKineticZonal, lat, lon, dominantClass.sediment);
            
            if (visResult !== null) {
              // Trace : mode mono-classe zonal
              result.trace.zone = {
                radius_m: zone.radius_m,
                classes: zone.classes.map(function(c) {
                  return {
                    folk5: c.folk5,
                    nameFr: c.nameFr,
                    D50_mm: c.D50_mm,
                    surface_pct: c.surface_pct,
                    C_kinetic: (c.folk5 === dominantClass.folk5) ? chainZonal.C_kinetic : null
                  };
                }),
                total_surface_pct: zone.total_surface_pct,
                multi_class_active: false,
                mono_class_zonal: true,
                dominant_class: dominantClass.nameFr,
                dominant_pct: dominantClass.surface_pct,
                original_sediment_name: sediment.nameFr,
                original_sediment_d50: sediment.D50_mm,
                activation_reason: (sediment.regime === 'rock') 
                  ? 'sédiment ponctuel rocheux (EMODnet 1:250k imprécis), zone à dominante ' + dominantClass.nameFr + ' (' + dominantClass.surface_pct.toFixed(1) + '%)'
                  : 'classe zonale dominante ' + dominantClass.nameFr + ' (' + dominantClass.surface_pct.toFixed(1) + '%) avec D50 différent du ponctuel'
              };
            }
          }
        }
      }
    }
  }
  
  // BRIQUE 8 — Visibilité (Beer-Lambert / Davies-Colley 1988)
  // Si Mode A et Mode B n'ont pas pris (Mode C : fallback ponctuel),
  // chemin mono-classe historique sur sédiment ponctuel.
  if (visResult === null) {
    visResult = computeVisibility(concResultKinetic, lat, lon, sediment);
    
    if (zone) {
      result.trace.zone = {
        radius_m: zone.radius_m,
        classes: zone.classes.map(function(c) {
          return {
            folk5: c.folk5,
            nameFr: c.nameFr,
            D50_mm: c.D50_mm,
            surface_pct: c.surface_pct
          };
        }),
        total_surface_pct: zone.total_surface_pct,
        multi_class_active: false,
        fallback_reason: zone.classes.length < 2 ? 'zone homogène' : 'moins de 2 classes non-rock après filtrage'
      };
    } else {
      result.trace.zone = {
        multi_class_active: false,
        fallback_reason: 'cache zonal non disponible (premier rendu ou échec WFS)'
      };
    }
  }
  if (visResult === null) {
    var r14 = _buildEmpiricalResult(h, idx, depth, lat, lon,
      'Brique 8 (Beer-Lambert) a retourné null');
    _chainCache[cacheKey] = r14;
    return r14;
  }
  result.trace.brique8 = {
    c_baseline: visResult.c_baseline,
    c_sediment: visResult.c_sediment,
    c_total: visResult.c_total,
    visi_m: visResult.visi_m,
    d_secchi: visResult.d_secchi
  };

  // ============================================================
  // CONVERSION VISI (m) → SCORE 0-100
  // ============================================================
  result.visi_m = visResult.visi_m;
  result.score = mapVisiToScore(visResult.visi_m);
  result.label = _scoreToLabel(result.score);

  // ============================================================
  // DÉTECTION DES LIMITES CONNUES DU MODÈLE (warnings)
  // ============================================================
  // Vent offshore + zone côtière : la chaîne surestime
  // probablement la mobilisation car AROME 1.3km lisse la
  // limite de fetch côtière (cf. discussion 10/05/26 Cotentin).
  // Pas de correction, juste avertissement honnête.
  if (windDir !== null && typeof getDirFactorForPoint === 'function') {
    var dirFactor = getDirFactorForPoint(windDir, lat, lon);
    if (dirFactor < 0.4 && Hs > 0.2) {
      result.warnings.push(
        'Vent offshore détecté : la mer du vent locale est probablement ' +
        'plus faible que ce que donne AROME (résolution 1.3 km). ' +
        'La visi terrain est sans doute meilleure que la prédiction.'
      );
    }
  }

  // ============================================================
  // VERDICT EN PROSE (humain, basé sur les valeurs réelles)
  // ============================================================
  result.verdict = _buildVerdictProse(result);

  _chainCache[cacheKey] = result;
  return result;
}

// ----- Helper : construction du résultat en mode empirique -----
// Bascule transparente vers visScoreV2, en conservant la structure
// d'objet pour rétrocompatibilité avec les consommateurs.
function _buildEmpiricalResult(h, idx, depth, lat, lon, reason) {
  var empiricalScore = 50;  // valeur de secours absolue
  try {
    if (typeof visScoreV2 === 'function') {
      empiricalScore = visScoreV2(h, idx, depth, lat, lon);
    }
  } catch (e) {
    console.warn('[V4] visScoreV2 fallback a planté:', e);
  }
  return {
    score: empiricalScore,
    visi_m: null,
    label: _scoreToLabel(empiricalScore),
    engine: 'empirical',
    trace: { fallback_reason: reason },
    verdict: 'Modèle physique non applicable sur ce point (' + reason +
             '). Score calculé par le modèle empirique de secours ' +
             '(calibré Courseulles avril 2026).',
    warnings: []
  };
}

// ----- Helper : score → label texte (cohérent avec UI existante) -----
function _scoreToLabel(score) {
  if (score >= 80) return 'Excellente';
  if (score >= 60) return 'Bonne';
  if (score >= 40) return 'Moyenne';
  if (score >= 20) return 'Faible';
  return 'Nulle';
}
// ============================================================
// BRIQUE 9 — CINÉTIQUE DE DÉCANTATION (mémoire temporelle)
// ------------------------------------------------------------
// Calcule la concentration en suspension à l'instant T en
// intégrant l'historique des contributions sédimentaires
// atténuées par décantation cinétique.
//
// Principe scientifique (Krone 1962 / Mehta 1989) :
//
//   dC/dt = E(τ) - w_s × C × (1 - τ/τ_cd)
//
// Sans terme d'érosion (phase de décantation pure), la solution
// analytique est :
//
//   C(t) = C(0) × exp(-t/τ_dep)    avec τ_dep = H / w_s
//
// Pour une succession de N créneaux passés, chacun ayant
// érodé une quantité C_équilibre(k) maintenant en cours de
// décantation depuis (T - k×Δt), la concentration héritée est :
//
//   C_inherited(T) = Σ C_équilibre(k) × exp(-(T-k×Δt) / τ_dep(k))
//
// On utilise τ_dep DU CRÉNEAU PASSÉ (pas du créneau actuel)
// car la décantation s'est faite dans les conditions de
// profondeur et de sédiment du moment k.
//
// La concentration finale est :
//
//   C_final(T) = max( C_équilibre(T) , C_inherited(T) )
//
// Le MAX traduit le principe physique : on ne peut pas
// décanter en-dessous de ce que l'érosion active maintient.
// Si à T le vent remobilise (C_équilibre dominant), Brique 9
// n'a aucun effet. Si à T c'est calme mais le passé était
// agité (C_inherited dominant), Brique 9 prend le relais.
//
// Sources :
//   - Krone R.B. 1962, "Flume studies of the transport of
//     sediment in estuarial shoaling processes", UC Berkeley
//   - Mehta A.J. 1989, "On estuarine cohesive sediment
//     suspension behavior", J. Geophys. Res. 94, 14303-14314
//   - Soulsby R.L. 1997, "Dynamics of Marine Sands", Thomas
//     Telford, ch.9 §2 "Time-dependent suspended load"
//   - Sanford L.P. & Halka J.P. 1993, "Assessing the paradigm
//     of mutually exclusive erosion and deposition of mud",
//     Marine Geology 114, 37-57
//   - Green M.O. & Coco G. 2014, "Review of wave-driven
//     sediment resuspension and transport in estuaries",
//     Reviews of Geophysics 52, 77-117
//
// Limitations honnêtes :
//   1. Modèle 0D (concentration moyenne dans la colonne)
//      pas 1D vertical complet. Justifié Soulsby §9.2 pour
//      applications côtières.
//   2. Pas de transport advectif horizontal (panache).
//   3. Hystérésis dépôt/érosion simplifiée (un seul seuil
//      Shields utilisé, pas deux distincts τ_ce et τ_cd).
//   4. Pas de consolidation du sédiment au fond.
//   5. Sédiments cohésifs déjà exclus en amont par
//      computeVisibilityScore_V4 (regime === 'cohesive').
// ============================================================
function computeKineticConcentration(h, idxNow, depth_lat, lat, lon, sediment, C_equilibre_now) {
  // Vitesse de chute du sédiment (Brique 7, déjà sourcée Soulsby 1997 eq.102)
  var w_s = computeSettlingVelocity(sediment);
  if (w_s === null || w_s <= 0) {
    return {
      C_kinetic: C_equilibre_now,
      C_inherited: 0,
      tau_dep_at_idx: null,
      dominant: 'equilibre',
      n_contributions: 0,
      warnings: []
    };
  }

  // Profondeur instantanée au créneau actuel (LAT + marée)
  var depth_instant_now = depthAtTimeCached(depth_lat, h.time[idxNow]);
  if (depth_instant_now <= 0) {
    return {
      C_kinetic: C_equilibre_now,
      C_inherited: 0,
      tau_dep_at_idx: null,
      dominant: 'equilibre',
      n_contributions: 0,
      warnings: ['Profondeur instantanée nulle au créneau actuel']
    };
  }

  // Temps de décantation au créneau actuel (en secondes)
  var tau_dep_now = depth_instant_now / w_s;

  // Fenêtre de lookback adaptative : 5 × τ_dep capte 99% de
  // l'énergie sédimentaire (résiduel < 0.7%).
  // Bornée à 72h (limite cache marine étendu par Patch 7-A).
  // Bornée minimum à 1h (sinon Brique 9 n'a pas de sens).
  var lookback_seconds = 5 * tau_dep_now;
  var SEC_PER_HOUR = 3600;
  var MAX_LOOKBACK_HOURS = 72;
  var lookback_hours = Math.min(MAX_LOOKBACK_HOURS, Math.max(1, lookback_seconds / SEC_PER_HOUR));

  // Pas AROME = 1h (vérifié sur cache météo)
  var n_creneaux = Math.floor(lookback_hours);

  var warnings = [];
  if (lookback_seconds / SEC_PER_HOUR > MAX_LOOKBACK_HOURS) {
    warnings.push(
      'Mémoire temporelle tronquée à 72h (limite cache marine). ' +
      'τ_dep = ' + (tau_dep_now/3600).toFixed(1) + 'h, lookback souhaité = ' +
      (5 * tau_dep_now / 3600).toFixed(1) + 'h. La décantation post-tempête ' +
      'longue peut être sous-estimée.'
    );
  }

  // Borne inférieure : pas de créneau passé disponible
  var idx_min = Math.max(0, idxNow - n_creneaux);
  if (idx_min === idxNow) {
    return {
      C_kinetic: C_equilibre_now,
      C_inherited: 0,
      tau_dep_at_idx: tau_dep_now,
      dominant: 'equilibre',
      n_contributions: 0,
      warnings: warnings.concat(['Aucun créneau passé disponible (début de cache)'])
    };
  }

  // ----- Sommation pondérée des contributions passées -----
  // Pour chaque créneau k de [idx_min, idxNow - 1] :
  //   1. Calcul C_équilibre(k) via la chaîne 1-6 (mémoïsée par _chainCache)
  //   2. Calcul depth_instant(k) → tau_dep(k)
  //   3. Décroissance exponentielle exp(-(idxNow - k) × 3600 / tau_dep(k))
  //   4. Sommation
  //
  // ATTENTION : pour éviter une boucle infinie via mémoïsation,
  // on appelle directement le pipeline interne (pas V4), parce
  // que V4 lui-même appelle Brique 9.
  var C_inherited = 0;
  var contributions_count = 0;

  for (var k = idx_min; k < idxNow; k++) {
    // Re-calcule C_équilibre au créneau k SANS Brique 9
    // (= équivalent V4 mais sans cinétique, pour éviter récursion)
    var C_eq_k = _computeEquilibriumConcentrationAt(h, k, depth_lat, lat, lon, sediment);
    if (C_eq_k === null || C_eq_k === 0) continue;

    // Profondeur instantanée et τ_dep AU CRÉNEAU k (pas now)
    var depth_k = depthAtTimeCached(depth_lat, h.time[k]);
    if (depth_k <= 0) continue;
    var tau_dep_k = depth_k / w_s;

    // Temps écoulé depuis le créneau k (en secondes)
    var dt = (idxNow - k) * SEC_PER_HOUR;

    // Décroissance exponentielle (solution analytique de Krone sans érosion)
    var decay = Math.exp(-dt / tau_dep_k);
    var contribution = C_eq_k * decay;

    C_inherited += contribution;
    contributions_count++;
  }

  // ----- Combinaison équilibre actuel + héritage -----
  // Le MAX traduit le principe physique : la décantation ne peut
  // pas descendre la concentration sous le niveau d'érosion active.
  var C_kinetic = Math.max(C_equilibre_now, C_inherited);
  var dominant = (C_kinetic === C_equilibre_now) ? 'equilibre' : 'inherited';

  return {
    C_kinetic: C_kinetic,
    C_inherited: C_inherited,
    tau_dep_at_idx: tau_dep_now,
    dominant: dominant,
    n_contributions: contributions_count,
    warnings: warnings
  };
}

// ----- Helper interne : C_équilibre à un créneau k -----
// Exécute la chaîne 1-6 sans appeler V4 (pour éviter récursion
// infinie via la mémoïsation de Brique 9).
//
// Retourne null si les pré-conditions ne sont pas satisfaites au
// créneau k (donnée marine manquante, profondeur insuffisante, etc).
// Dans ce cas, Brique 9 saute ce créneau sans planter.
function _computeEquilibriumConcentrationAt(h, k, depth_lat, lat, lon, sediment) {
  // Pré-condition marine : timestamp aligné dans le cache marine étendu
  if (!S_spotMarineCache || !S_spotMarineCache.wave_height) return null;

  var targetMs = new Date(h.time[k]).getTime();
  var marineIdx = -1;
  var bestDelta = Infinity;
  for (var mi = 0; mi < S_spotMarineCache.time.length; mi++) {
    var d = Math.abs(new Date(S_spotMarineCache.time[mi]).getTime() - targetMs);
    if (d < bestDelta) { bestDelta = d; marineIdx = mi; }
  }
  if (bestDelta > 1800000) return null;  // décalage > 30 min

  var Hs = S_spotMarineCache.wave_height[marineIdx] || 0;
  var Tp = S_spotMarineCache.wave_period ? (S_spotMarineCache.wave_period[marineIdx] || 0) : 0;
  var U = S_spotMarineCache.ocean_current_velocity ? (S_spotMarineCache.ocean_current_velocity[marineIdx] || 0) : 0;
  var waveDir = S_spotMarineCache.wave_direction ? S_spotMarineCache.wave_direction[marineIdx] : null;
  var currentDir = S_spotMarineCache.ocean_current_direction ? S_spotMarineCache.ocean_current_direction[marineIdx] : null;

  var depth_k = depthAtTimeCached(depth_lat, h.time[k]);
  if (depth_k < 0.5) return null;

  // Application de la garde courant aberrant (même que V4)
  if (Math.abs(U) > 1.5) {
    var inStrongCurrentZone = (
      (lat >= 49.60 && lat <= 49.75 && lon >= -2.00 && lon <= -1.85) ||
      (lat >= 48.40 && lat <= 48.50 && lon >= -5.10 && lon <= -4.90) ||
      (lat >= 48.32 && lat <= 48.38 && lon >= -4.55 && lon <= -4.45) ||
      (lat >= 48.00 && lat <= 48.10 && lon >= -4.85 && lon <= -4.65) ||
      (lat >= 49.00 && lat <= 49.30 && lon >= -1.85 && lon <= -1.65)
    );
    if (!inStrongCurrentZone) U = 0;
  }

  var omega = Tp > 0 ? (2 * Math.PI / Tp) : 0;
  var u_b = computeOrbitalVelocityAtBed(Hs, Tp, depth_k);
  if (u_b === null) return null;

  var tau_w = computeBedShearStressWaves(u_b, omega, sediment);
  if (tau_w === null) return null;

  var tau_c = computeBedShearStressCurrent(U, sediment, depth_k);
  if (tau_c === null) tau_c = 0;

  var tau_max = computeBedShearStressCombined(tau_w, tau_c, waveDir, currentDir);
  if (tau_max === null) return null;

  var shieldsResult = computeShieldsCriterion(tau_max, sediment);
  if (shieldsResult === null) return null;

  var w_s = computeSettlingVelocity(sediment);
  if (w_s === null) return null;

  var concResult = computeSuspendedConcentration(tau_max, shieldsResult, w_s, depth_k, sediment);
  if (concResult === null) return null;

  return concResult.c_moyen_kg;
}
// ============================================================
// SPRINT 2 — INVERSION BEER-LAMBERT (ZSD satellite → C_kg_m3)
// ------------------------------------------------------------
// Convertit la profondeur de Secchi mesurée par satellite en
// concentration de sédiment équivalente dans la colonne d'eau.
// C'est l'opération inverse de la Brique 8 (computeVisibility).
//
// Loi de Beer-Lambert appliquée au coefficient d'atténuation :
//     c_total = 1.7 / ZSD                       (Preisendorfer 1986)
//     c_total = c_baseline_régional + b_local·C
//     => C_kg_m3 = (c_total - c_baseline) / b_local
//
// Sources scientifiques :
//   - Preisendorfer R.W. 1986, "Secchi disk science: visual
//     optics of natural waters", Limnol. Oceanogr. 31(5)
//     (relation Secchi vs c_total : facteur 1.7)
//   - Babin M. et al. 2003, "Variations in the light absorption
//     coefficients of phytoplankton, non-algal particles, and
//     dissolved organic matter in coastal waters around Europe",
//     J. Geophys. Res. 108(C7) (b_local par zone optique)
//   - Davies-Colley R.J. & Smith D.G. 2001, "Turbidity,
//     suspended sediment, and water clarity", JAWRA 37
//     (coefficient d'atténuation spécifique du sédiment marin
//     côtier b = 1.0 m²/kg médiane, recalibré régionalement
//     dans Babin 2003)
//
// Gestion des cas dégénérés :
//   - ZSD null/invalide → retourne null (chaîne arrêtée)
//   - c_sediment négatif (eau plus claire que baseline régional,
//     rare mais possible en Atlantique sud par temps calme) →
//     clamp à C_kg_m3 = 0 (eau ambient pure)
//   - C résultant > 5 kg/m³ → warning (hyperconcentré, rare,
//     possible en panache estuarien tempête)
//
// Domaine de validité :
//   - Identique à la Brique 8 : sédiments minéraux marins,
//     eaux côtières claires à très turbides (0.5m < ZSD < 30m)
//   - Coefficients régionaux préexistants pour Manche/Atlantique
//     via getRegionalOpticalBaseline
// ============================================================
function inverseBeerLambert_ZSDtoConcentration(ZSD_m, lat, lon) {
  if (ZSD_m === null || ZSD_m === undefined || !isFinite(ZSD_m) || ZSD_m <= 0) {
    return null;
  }

  var optical = getRegionalOpticalBaseline(lat, lon);
  if (!optical) return null;

  var c_total = 1.7 / ZSD_m;
  var c_sediment = c_total - optical.c_baseline;

  // Cas dégénéré : eau plus claire que le baseline régional.
  // Physiquement, ça signifie que le baseline régional est
  // surestimé pour ce pixel à cette date (variabilité naturelle
  // de la masse d'eau, non capturée par la table régionale).
  // On clamp à 0 plutôt que de retourner du négatif.
  if (c_sediment < 0) {
    return {
      C_kg_m3: 0,
      c_total: c_total,
      c_baseline: optical.c_baseline,
      zone: optical.zone,
      warning: 'Eau plus claire que baseline régional (c_sediment=' +
        c_sediment.toFixed(3) + '). Concentration clampée à 0.'
    };
  }

  var C_kg_m3 = c_sediment / optical.b_local;

  // Sanity check : concentration plausible
  // Domaine côtier typique 0-5 kg/m³. Au-delà = hyperconcentré.
  var warning = null;
  if (C_kg_m3 > 5) {
    warning = 'Concentration extrême ' + C_kg_m3.toFixed(2) +
      ' kg/m³ (panache estuarien ou tempête majeure ?). À vérifier.';
  }

  return {
    C_kg_m3: C_kg_m3,
    c_total: c_total,
    c_baseline: optical.c_baseline,
    b_local: optical.b_local,
    zone: optical.zone,
    warning: warning
  };
}

// ============================================================
// SPRINT 2 — PROPAGATION 0D DE LA MESURE SATELLITE
// ------------------------------------------------------------
// Propage la concentration de sédiment mesurée par satellite à
// T-ageHours jusqu'à l'instant cible T, en intégrant l'équation
// de Krone 1962 / Mehta 1989 par pas horaire avec les forçages
// hydrodynamiques réels de l'intervalle.
//
// Différence fondamentale avec Brique 9 actuelle :
//   - Brique 9 : part de C(passé)=0, accumule sur lookback 5×τ_dep
//                pour calculer C_équilibre courant via la chaîne
//   - Sprint 2 : part de C(T-48h)=C_satellite mesuré, évolue
//                vers T avec les forçages observés
//
// Architecture stratégique : option A "assimilation pure".
// La mesure satellite est la vérité de référence. Le passé
// pré-satellite est oublié. Pas de filtre de Kalman, pas de
// terme de rappel. C'est défensif scientifiquement et clair
// pour l'utilisateur : "on part de ce qu'on a mesuré le 15/05".
//
// Équation intégrée à chaque pas horaire (Δt = 3600s) :
//     dC/dt = E(k) · (1/τ_resp) - w_s · C / H
//
// Solution analytique sur 1h avec E supposé constant sur 1h :
//     C(k+1) = E(k) · (1 - decay) + C(k) · decay
//     avec decay = exp(-w_s · 3600 / H(k))
//     et E(k) = C_équilibre(k) calculé via chaîne 1-6
//
// Sources scientifiques :
//   - Krone R.B. 1962, "Flume studies of the transport of
//     sediment in estuarial shoaling processes", UC Berkeley
//   - Mehta A.J. 1989, "On estuarine cohesive sediment
//     suspension behavior", J. Geophys. Res. 94, 14303-14314
//   - Soulsby R.L. 1997, "Dynamics of Marine Sands", Thomas
//     Telford, ch.9 §2 "Time-dependent suspended load"
//   - Sanford L.P. & Halka J.P. 1993, "Assessing the paradigm
//     of mutually exclusive erosion and deposition of mud",
//     Marine Geology 114, 37-57
//
// Limitations honnêtes (à signaler dans confiance F1-F5) :
//   1. Modèle 0D (pas de dimension verticale ni horizontale)
//   2. Pas d'advection horizontale (panache déplacé par
//      courant non capturé)
//   3. Hypothèse E constant sur 1h (forçages échantillonnés
//      AROME/Marine au pas horaire, suffisant pour Visimer V1)
//   4. Si sédiment ponctuel inconnu, fallback sable medium
// ============================================================
function propagate0D(C_sat_kg_m3, dateSatISO, h, idxTarget, depth, lat, lon, sediment) {
  // ----- Garde-fous d'entrée -----
  if (C_sat_kg_m3 === null || C_sat_kg_m3 === undefined || !isFinite(C_sat_kg_m3) || C_sat_kg_m3 < 0) {
    return null;
  }
  if (!h || !h.time || idxTarget < 0 || idxTarget >= h.time.length) {
    return null;
  }
  if (!depth || depth <= 0) return null;

  var warnings = [];

  // ----- Sédiment : fallback sable medium Manche si inconnu -----
  // Race condition possible si fetchSedimentType pas encore résolu
  // au moment du clic. On utilise un défaut conservateur plutôt
  // que de bloquer la propagation.
  if (!sediment || sediment.regime === 'rock' || sediment.regime === 'cohesive') {
    sediment = {
      folk5: 2,
      name: 'Sand (fallback)',
      nameFr: 'Sable (défaut)',
      D50_mm: 0.250,
      D50_m: 0.000250,
      regime: 'non-cohesive',
      canSuspend: true
    };
    warnings.push('Sédiment ponctuel indisponible, fallback sable medium (D50=0.25mm)');
  }

  // ----- Localisation de l'instant satellite dans le cache météo -----
  var satMs = new Date(dateSatISO).getTime();
  var idxStart = -1;
  var bestDelta = Infinity;
  for (var i = 0; i < h.time.length; i++) {
    var d = Math.abs(new Date(h.time[i]).getTime() - satMs);
    if (d < bestDelta) { bestDelta = d; idxStart = i; }
  }

  // Si la photo satellite est antérieure au cache météo disponible,
  // on tronque l'intégration à h.time[0] et on signale.
  // Cache météo = past_days=7 (cf. fetchSpotWeather), donc largement
  // suffisant pour des photos satellite J-1 à J-3.
  if (bestDelta > 7200000) {  // > 2h de décalage
    warnings.push('Photo satellite hors fenêtre cache météo (' +
      Math.round(bestDelta / 3600000) + 'h de décalage). Intégration tronquée.');
    idxStart = 0;
  }

  // Cas dégénéré : satellite plus récent que l'instant cible.
  // Peut arriver si l'utilisateur consulte une date passée alors que
  // le satellite a une donnée plus récente. On retourne C_sat directement
  // (pas de rétropropagation, cf. décision architecturale Sprint 2).
  if (idxStart >= idxTarget) {
    return _buildPropagationResult(C_sat_kg_m3, C_sat_kg_m3, 0, lat, lon, sediment,
      'Photo satellite plus récente que cible, pas de propagation', warnings, []);
  }

  // ----- Vitesse de chute (constante sur l'intégration) -----
  var w_s = computeSettlingVelocity(sediment);
  if (w_s === null || w_s <= 0) {
    return null;
  }

// ----- Garde-fou domaine validité : fenêtre max 36h -----
  // Au-delà, le modèle 0D Krone diverge en régime advectif fort
  // (vive-eau + vent persistant). Source : Soulsby 1997 ch.9 §3.
  // On retourne C_sat inchangé (mesure terrain fiable) avec un
  // warning, plutôt que de propager dans un domaine où le modèle
  // explose.
  var n_steps_max = idxTarget - idxStart;
  if (n_steps_max > 36) {
    warnings.push('Mesure satellite trop ancienne (' + n_steps_max + 
      'h) pour une propagation 0D fiable. Affichage de la mesure terrain ' +
      'sans dérive. Modèle Krone limité à 36h par construction.');
    return _buildPropagationResult(
      C_sat_kg_m3, C_sat_kg_m3, 0,
      lat, lon, sediment,
      'Propagation skippée (fenêtre > 36h)', warnings, []
    );
  }

  // ----- Boucle d'intégration horaire -----
  var C_current = C_sat_kg_m3;
  var C_evolution = [{ idx: idxStart, time: h.time[idxStart], C: C_current, E: null }];
  var n_skipped = 0;

  for (var k = idxStart; k < idxTarget; k++) {
    // Profondeur instantanée au pas k (LAT + marée)
    var depth_k = depthAtTimeCached(depth, h.time[k]);

    // Cas dégénéré : eau insuffisante (estran émergé à BM grand coef).
    // On conserve C inchangé (eau quasi-stagnante) plutôt que de planter.
    if (depth_k < 0.5) {
      C_evolution.push({ idx: k + 1, time: h.time[k + 1], C: C_current, E: 0, skipped: true });
      n_skipped++;
      continue;
    }

    // Calcul E(k) via chaîne 1-6 (réutilise fonction existante de Brique 9)
    var E_k = _computeEquilibriumConcentrationAt(h, k, depth, lat, lon, sediment);
    if (E_k === null) E_k = 0;  // pré-conditions non satisfaites → pas d'érosion ce pas

    // Solution analytique Krone sur 1h
    var decay = Math.exp(-w_s * 3600 / depth_k);
    C_current = E_k * (1 - decay) + C_current * decay;

    C_evolution.push({ idx: k + 1, time: h.time[k + 1], C: C_current, E: E_k });
  }

  if (n_skipped > 0) {
    warnings.push(n_skipped + ' pas horaires sautés (eau insuffisante à ces instants)');
  }

  return _buildPropagationResult(
    C_sat_kg_m3, C_current, idxTarget - idxStart,
    lat, lon, sediment, null, warnings, C_evolution
  );
}

// ----- Helper interne : construction du résultat de propagation -----
// Encapsule la conversion C → visi (Beer-Lambert direct) et l'analyse
// de la phase dominante (érosion, décantation, équilibre) pour le récit
// utilisateur dans l'UI.
function _buildPropagationResult(C_initial, C_final, n_steps, lat, lon, sediment, note, warnings, evolution) {
  // Conversion C_final → visi via Beer-Lambert direct (Brique 8)
  var optical = getRegionalOpticalBaseline(lat, lon);
  if (!optical) return null;

  var c_total = optical.c_baseline + optical.b_local * C_final;
  if (!isFinite(c_total) || c_total <= 0) return null;
  var visi_m = 2.38 / c_total;

  // Analyse de la phase dominante sur la trajectoire d'évolution
  var dominant_phase = 'équilibre';
  if (evolution && evolution.length >= 2) {
    var delta = C_final - C_initial;
    var threshold = C_initial * 0.10;  // ±10% de variation = phase active
    if (delta > threshold) dominant_phase = 'érosion';
    else if (delta < -threshold) dominant_phase = 'décantation';
  }

  return {
    C_initial_kg_m3: C_initial,
    C_propagated_kg_m3: C_final,
    visi_propagated_m: visi_m,
    n_steps_integrated: n_steps,
    dominant_phase: dominant_phase,
    delta_C_pct: C_initial > 0 ? ((C_final - C_initial) / C_initial * 100) : 0,
    note: note,
    warnings: warnings,
    trace: {
      sediment_used: sediment.nameFr,
      zone_optique: optical.zone,
      c_baseline: optical.c_baseline,
      b_local: optical.b_local,
      evolution_length: evolution ? evolution.length : 0
      // evolution complète disponible si besoin debug, omise par défaut pour taille
    }
  };
}
// ============================================================
// SPRINT 2 — CALCUL DE LA CONFIANCE F1-F5
// ------------------------------------------------------------
// Quantifie honnêtement la fiabilité d'une prédiction satellite
// propagée, en combinant 5 facteurs indépendants chacun normalisé
// dans [0, 1]. Le produit est ensuite reéchelonné via une racine
// pour donner un pourcentage intuitif pour l'utilisateur final.
//
// F1 : fraîcheur de la donnée satellite (exp décroissante)
// F2 : distance entre centre pixel CMEMS et clic utilisateur
// F3 : variabilité des forçages hydrodynamiques sur la fenêtre
// F4 : qualité intrinsèque CMEMS (mapping discret par status)
// F5 : cohérence inter-produits satellite (placeholder Sprint 2)
//
// Affichage final via la formule :
//     pct = round( (F1·F2·F3·F4·F5)^0.4 × 100 )
//
// L'exposant 0.4 réétalonne le produit (qui plafonne autour de
// 0.5 même en conditions idéales) vers une échelle perçue par
// l'utilisateur (0-100% lisible). Pas de mensonge : la valeur
// brute reste accessible via _total_raw pour debug.
//
// Sources scientifiques du choix de chaque formule :
//   - F1 demi-vie 48h : Tessier 2013 (autocorrélation MES en
//     Manche 24-72h selon zones côtières/large)
//   - F2 demi-vie 500m : Soulsby 1997 ch.9, échelles de cohérence
//     spatiale du sédiment côtier (~1km en moyenne)
//   - F3 indice composite : raisonnement sur la stabilité du
//     régime hydrodynamique nécessaire à la validité de la
//     propagation 0D Krone (E supposé constant sur l'intervalle)
//   - F4 mapping discret : cumul J-1/J-2/J-3 = dégradation 
//     additive de la qualité d'observation
//   - F5 = 1.0 en V1 : honnête, on n'a qu'un produit (multi-1km),
//     activé en Sprint 3 quand Sentinel-2 100m sera intégré
//
// Limitations honnêtes :
//   1. La calibration des seuils et demi-vies est conservatrice,
//      basée sur la littérature. Phase 2 raffinera avec les
//      observations communautaires (régression empirique).
//   2. F5 = 1.0 surestime la confiance V1 (on accepte ce biais
//      car on a une seule source satellite, donc rien à dire
//      sur la cohérence inter-produits).
//   3. L'exposant 0.4 du réétalonnage est empirique. Si phase 2
//      montre qu'il faut ajuster pour calibrer sur les vraies
//      observations terrain, c'est trivial à modifier.
// ============================================================
function computeConfidence(satResult, propResult, h, idxStart, idxTarget, lat, lon) {
  // ----- Garde-fous d'entrée -----
  if (!satResult || !propResult) return null;
  if (!h || idxStart < 0 || idxTarget < 0 || idxStart > idxTarget) return null;

  // ============================================================
  // F1 — Fraîcheur de la mesure satellite
  // ------------------------------------------------------------
  // Formule : F1 = exp(-age_h / 48)
  // À 0h : F1 = 1.00 (impossible avec NRT, latence J-1 minimum)
  // À 24h : F1 = 0.61
  // À 48h : F1 = 0.37 (Bernières aujourd'hui, cloudy_J1)
  // À 72h : F1 = 0.22 (cloudy_J2, limite acceptable)
  // ============================================================
  var age_h = satResult.age_hours;
  if (typeof age_h !== 'number' || !isFinite(age_h) || age_h < 0) age_h = 48; // fallback
  var F1 = Math.exp(-age_h / 48);

  // ============================================================
  // F2 — Distance entre centre pixel CMEMS et clic utilisateur
  // ------------------------------------------------------------
  // Formule : F2 = exp(-dist_m / 500)
  // À 100m : F2 = 0.82 (pixel quasi-au-dessus du spot)
  // À 500m : F2 = 0.37 (mi-distance d'un pixel voisin)
  // À 1km : F2 = 0.14 (pixel adjacent, structure côtière différente)
  // ------------------------------------------------------------
  // NOTE BUG SPRINT 1 : la sortie GAS de fetchCmemsZSD_ inverse
  // sémantiquement lat_pixel et lon_pixel. On lit donc :
  //   lat réelle du pixel = satResult.lon_pixel
  //   lon réelle du pixel = satResult.lat_pixel
  // À corriger côté GAS en Sprint 5 lors du raffinement API.
  // ============================================================
  var pixel_lat_actual = satResult.lon_pixel;  // swap volontaire (bug sprint 1)
  var pixel_lon_actual = satResult.lat_pixel;  // swap volontaire (bug sprint 1)
  var dist_m = 0;
  if (typeof pixel_lat_actual === 'number' && typeof pixel_lon_actual === 'number' &&
      isFinite(pixel_lat_actual) && isFinite(pixel_lon_actual)) {
    dist_m = haversineM(lat, lon, pixel_lat_actual, pixel_lon_actual);
  } else {
    dist_m = 500;  // fallback si pas de coords pixel (status no_data)
  }
  var F2 = Math.exp(-dist_m / 500);

  // ============================================================
  // F3 — Variabilité des forçages hydrodynamiques
  // ------------------------------------------------------------
  // Indice composite max(Δvent, Δhoule, Δcourant) normalisé
  // entre 0 et 1. Capture le pire des trois, qui domine la
  // non-linéarité de la propagation 0D.
  //
  // Δvent = stdev(windspeed_10m sur [idxStart, idxTarget]) / 20 kt
  // Δhoule = stdev(wave_height) / 1.5 m
  // Δcourant = stdev(ocean_current_velocity) / 0.5 m/s
  //
  // F3 = 1 / (1 + 1.5 × Δforcing)
  // Δforcing=0.1 (calme) → F3 = 0.87
  // Δforcing=0.5 (perturbé) → F3 = 0.57
  // Δforcing=1.0 (passage frontal majeur) → F3 = 0.40
  // ============================================================
  function _stdev(arr) {
    if (!arr || arr.length < 2) return 0;
    var n = 0, sum = 0, sumSq = 0;
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (typeof v === 'number' && isFinite(v)) {
        n++;
        sum += v;
        sumSq += v * v;
      }
    }
    if (n < 2) return 0;
    var mean = sum / n;
    var variance = (sumSq / n) - (mean * mean);
    return variance > 0 ? Math.sqrt(variance) : 0;
  }

  function _slice(arr, start, end) {
    if (!arr) return [];
    return arr.slice(Math.max(0, start), Math.min(arr.length, end + 1));
  }

  // Vent depuis h (cache météo)
  var wind_slice = _slice(h.windspeed_10m, idxStart, idxTarget);
  var dWind_kmh = _stdev(wind_slice);
  var dWind_kt = dWind_kmh * 0.539957;
  var Delta_vent = dWind_kt / 20.0;

  // Houle et courant depuis S_spotMarineCache (variable globale du frontend)
  var Delta_houle = 0;
  var Delta_courant = 0;
  if (typeof S_spotMarineCache !== 'undefined' && S_spotMarineCache && S_spotMarineCache.time) {
    // Re-aligner les indices marine sur les indices météo (les caches peuvent
    // avoir des longueurs différentes mais commencent au même past_days=7).
    // Pour simplifier en V1, on utilise les mêmes indices : assomption que
    // h.time et S_spotMarineCache.time sont alignés à l'heure près (vérifié
    // empiriquement en V1, raffinable en Sprint 5 si besoin).
    var wave_slice = _slice(S_spotMarineCache.wave_height, idxStart, idxTarget);
    var current_slice = _slice(S_spotMarineCache.ocean_current_velocity, idxStart, idxTarget);
    Delta_houle = _stdev(wave_slice) / 1.5;
    Delta_courant = _stdev(current_slice) / 0.5;
  }

  var Delta_forcing = Math.max(Delta_vent, Delta_houle, Delta_courant);
  if (!isFinite(Delta_forcing) || Delta_forcing < 0) Delta_forcing = 0;
  var F3 = 1 / (1 + 1.5 * Delta_forcing);

  // ============================================================
  // F4 — Qualité intrinsèque CMEMS via status
  // ------------------------------------------------------------
  // Mapping discret basé sur le champ status retourné par
  // fetchCmemsZSD_ (Sprint 1).
  //   'ok' (J-1)        → 1.00 (qualité optimale)
  //   'cloudy_J1' (J-2) → 0.80 (un jour de retard supplémentaire)
  //   'cloudy_J2' (J-3) → 0.60 (deux jours de retard supplémentaires)
  //   'no_data_72h'     → chaîne arrêtée en amont, on ne calcule pas
  //
  // Note : F4 est partiellement redondant avec F1 (les deux pénalisent
  // l'âge), mais F4 capture une dégradation **qualitative** (la dalle
  // a-t-elle été obtenue facilement ou après plusieurs trous nuageux ?)
  // tandis que F1 capture la dégradation **temporelle** pure. Acceptable
  // en V1, on observera en Phase 2 si la corrélation est trop forte.
  // ============================================================
  var F4;
  switch (satResult.status) {
    case 'ok':         F4 = 1.00; break;
    case 'cloudy_J1':  F4 = 0.80; break;
    case 'cloudy_J2':  F4 = 0.60; break;
    default:           F4 = 0.50;  // status inconnu, prudence
  }

  // ============================================================
  // F5 — Cohérence inter-produits satellite
  // ------------------------------------------------------------
  // V1 : placeholder à 1.0 (on n'a qu'un produit, multi-1km ZSD).
  // V2/Sprint 3 : intégration Sentinel-2 MSI 100m sur NWS/IBI.
  // Si écart > 30% entre produits, F5 dégradé proportionnellement.
  // ============================================================
  var F5 = 1.00;

  // ============================================================
  // COMBINAISON ET RÉÉTALONNAGE
  // ============================================================
  var total_raw = F1 * F2 * F3 * F4 * F5;
  var pct_displayed = Math.round(Math.pow(total_raw, 0.4) * 100);
  pct_displayed = Math.max(0, Math.min(100, pct_displayed));

  // Couleur de l'affichage selon palette Talisker
  var label_color;
  if (pct_displayed >= 75)      label_color = 'success';   // teal #4DD4A8
  else if (pct_displayed >= 50) label_color = 'warning';   // jaune #D8C84A
  else if (pct_displayed >= 30) label_color = 'caution';   // orange #E89B3C
  else                          label_color = 'danger';    // rouge #C94A3D

  return {
    pct: pct_displayed,
    label_color: label_color,
    _factors: { F1: F1, F2: F2, F3: F3, F4: F4, F5: F5 },
    _total_raw: total_raw,
    _diagnostics: {
      age_hours: age_h,
      pixel_distance_m: Math.round(dist_m),
      delta_forcing: Delta_forcing,
      cmems_status: satResult.status,
      f5_note: 'V1 placeholder, intégration Sentinel-2 100m en Sprint 3'
    }
  };
}
// ----- Helper : construction de la phrase verdict en prose -----
function _buildVerdictProse(result) {
  if (result.engine !== 'chain') return result.verdict || '';

  var visi = result.visi_m;
  var spot = result.trace.spot;
  var b5 = result.trace.brique5;

  var phrases = [];

  if (visi < 0.5) {
    phrases.push('Visibilité quasi nulle prévue.');
  } else if (visi < 1.5) {
    phrases.push('Visibilité très faible, sortie peu recommandée.');
  } else if (visi < 3) {
    phrases.push('Visibilité limitée mais chassable si tu connais ton spot.');
  } else if (visi < 6) {
    phrases.push('Bonne visibilité, conditions confortables.');
  } else {
    phrases.push('Excellente visibilité, conditions idéales.');
  }

  // Contexte sédiment + zone
  if (b5.mobilized) {
    phrases.push('Le ' + spot.sediment_name.toLowerCase() +
                 ' est mobilisé (force au fond ' + b5.excess.toFixed(1) +
                 '× au-dessus du seuil de mise en mouvement).');
  } else {
    phrases.push('Le sédiment de fond (' + spot.sediment_name.toLowerCase() +
                 ') reste au repos.');
  }

  // Zone turbide ?
  if (spot.c_baseline >= 0.5) {
    phrases.push('Zone naturellement turbide (silts en suspension chronique).');
  }

  return phrases.join(' ');
}
// ----- Helper : verdict prose pour la voie satellite propagée -----
// Compose un récit humain de la prédiction satellite, mentionnant
// la mesure d'origine, l'évolution propagée, et la confiance.
// Différent de _buildVerdictProse qui s'adresse à la voie chaîne.
function _buildVerdictSatelliteProse(satResult, propResult, confResult) {
  if (!satResult || !propResult) return '';

  var phrases = [];

  // Mesure d'origine
  var dateStr = satResult.date_observed ? satResult.date_observed.slice(0, 10) : '';
  var visi_sat = satResult.visi_plongeur_m;
  if (typeof visi_sat === 'number' && isFinite(visi_sat)) {
    phrases.push('Mesure satellite du ' + dateStr + ' : visibilité ' + visi_sat.toFixed(1) + 'm.');
  }

  // Évolution propagée
  var visi_prop = propResult.visi_propagated_m;
  if (typeof visi_prop === 'number' && isFinite(visi_prop)) {
    if (propResult.dominant_phase === 'décantation') {
      phrases.push("Depuis, l'eau s'est éclaircie.");
    } else if (propResult.dominant_phase === 'érosion') {
      phrases.push('Depuis, le vent et la houle ont remis du sédiment en suspension.');
    } else {
      phrases.push("Depuis, les conditions sont restées stables.");
    }
    phrases.push('Prévision actuelle : ' + Math.round(visi_prop) + 'm.');
  }

  // Confiance
  if (confResult && typeof confResult.pct === 'number') {
    phrases.push('Fiabilité ' + confResult.pct + '%.');
  }

  return phrases.join(' ');
}
// ============================================================
// RENDU DU LOG SCIENTIFIQUE - "POURQUOI CETTE VISIBILITÉ"
// ------------------------------------------------------------
// Construit le HTML du module "Pourquoi cette visibilité" du
// drawer spot. Consomme l'objet riche retourné par
// computeVisibilityScore_V4 et produit un log structuré en
// 6 sections + verdict + warnings.
//
// Langage : termes simplifiés mais valeurs numériques gardées
// pour permettre la vérification scientifique et le debug.
// Sections numérotées pour la lisibilité.
//
// Comportement selon engine :
//   - 'chain'     : log complet 6 sections + warnings + verdict
//   - 'empirical' : message honnête "modèle physique non
//                   applicable" + raison + verdict empirique
//
// Le HTML retourné est inséré dans #vzExplainContent (drawer
// desktop) et #vzmExplainContent (drawer mobile V4) via
// buildVisExplanation patché en aval.
// ============================================================
function renderVisExplain_V2(scoreResult) {
  if (!scoreResult) {
    return '<div class="vz-explain-empty">Aucune donnée à analyser.</div>';
  }

  // ----- Mode empirique : message honnête, pas de log technique -----
  if (scoreResult.engine !== 'chain') {
    var reason = (scoreResult.trace && scoreResult.trace.fallback_reason)
      ? scoreResult.trace.fallback_reason
      : 'cause inconnue';
return (
      '<div class="vz-explain-engine-tag vz-engine-empirical">' +
        'MODÈLE EMPIRIQUE — chaîne physique non disponible' +
      '</div>' +
      (S.clickLatLng
        ? '<div class="vz-explain-section">' +
            '<div class="vz-explain-section-title">Coordonnées du spot</div>' +
            '<div class="vz-explain-section-body">' +
              '<div class="vz-explain-row"><span>GPS</span><span class="vz-explain-num">' +
                S.clickLatLng.lat.toFixed(4) + ' / ' + S.clickLatLng.lng.toFixed(4) +
              '</span></div>' +
            '</div>' +
          '</div>'
        : '') +
      '<div class="vz-explain-section">' +
        '<div class="vz-explain-section-title">Pourquoi le modèle physique ne s\'applique pas</div>' +
        '<div class="vz-explain-section-body">' +
          'Raison : ' + reason + '.<br><br>' +
          'Le score affiché provient du modèle empirique de secours ' +
          '(calibré sur des observations à Courseulles en avril 2026). ' +
          'Il reste indicatif mais moins précis que la chaîne physique 9 briques.' +
        '</div>' +
      '</div>' +
      '<div class="vz-explain-verdict">' + (scoreResult.verdict || '') + '</div>'
    );
  }

  // ----- Mode chaîne : log complet 6 sections -----
  var t = scoreResult.trace;
  var html = '';

  // Tag moteur
  html +=
    '<div class="vz-explain-engine-tag vz-engine-chain">' +
      'MODÈLE PHYSIQUE — chaîne 9 briques' +
    '</div>';

  // Warnings éventuels (en haut, très visibles)
  if (scoreResult.warnings && scoreResult.warnings.length > 0) {
    html += '<div class="vz-explain-warnings">';
    html += '<div class="vz-explain-warnings-title">⚠ Limites de validité détectées</div>';
    scoreResult.warnings.forEach(function(w) {
      html += '<div class="vz-explain-warning-item">' + w + '</div>';
    });
    html += '</div>';
  }

  // SECTION 1 - Données du spot
  html +=
'<div class="vz-explain-section-title">1. Données du spot</div>' +
      '<div class="vz-explain-section-body">' +
        (S.clickLatLng
          ? '<div class="vz-explain-row"><span>Coordonnées GPS</span><span class="vz-explain-num">' +
              S.clickLatLng.lat.toFixed(4) + ' / ' + S.clickLatLng.lng.toFixed(4) +
            '</span></div>'
          : '') +
        '<div class="vz-explain-row"><span>Profondeur (zéro hydro)</span><span class="vz-explain-num">' +
          t.spot.depth_lat.toFixed(2) + ' m</span></div>' +
        '<div class="vz-explain-row"><span>Profondeur avec marée</span><span class="vz-explain-num">' +
          t.spot.depth_instant.toFixed(2) + ' m</span></div>' +
        '<div class="vz-explain-row"><span>Type de fond</span><span>' +
          t.spot.sediment_name + ' (D50 ' + t.spot.sediment_D50_mm.toFixed(2) + ' mm)</span></div>' +
        '<div class="vz-explain-row"><span>Zone optique</span><span>' +
          _zoneOptiqueLabel(t.spot.zone_optique) + '</span></div>' +
      '</div>' +
    '</div>';
// SECTION 1-BIS - Composition zonale du fond (Patch 8-D)
  // Affichée uniquement si trace.zone est rempli ET que la zone WFS a
  // retourné des classes (cache hit, pas un échec WFS).
  if (t.zone && (t.zone.multi_class_active === true ||
                 (Array.isArray(t.zone.classes) && t.zone.classes.length > 0))) {
    
    var isMulti = t.zone.multi_class_active === true;
    var sectionTitle = isMulti
      ? '1-bis. Composition zonale du fond (multi-classes)'
      : '1-bis. Composition zonale du fond';
    
    html +=
      '<div class="vz-explain-section">' +
        '<div class="vz-explain-section-title">' + sectionTitle + '</div>' +
        '<div class="vz-explain-section-body">';
    
    // Ligne rayon analysé
    if (typeof t.zone.radius_m === 'number') {
      html +=
        '<div class="vz-explain-row">' +
          '<span>Rayon hydrodynamique analysé</span>' +
          '<span class="vz-explain-num">' + Math.round(t.zone.radius_m) + ' m</span>' +
        '</div>';
    }
    
    // Lignes par classe (avec barre de répartition)
    if (Array.isArray(t.zone.classes)) {
      t.zone.classes.forEach(function(c) {
        var pct = (typeof c.surface_pct === 'number') ? c.surface_pct : 0;
        var pctClamped = Math.max(0, Math.min(100, pct));
        var d50Text = (typeof c.D50_mm === 'number')
          ? 'D50 ' + c.D50_mm.toFixed(2) + ' mm'
          : 'non mobilisable';
        var contribText = '';
        if (isMulti && typeof c.C_kinetic === 'number') {
          contribText = ' — C cinétique ' + c.C_kinetic.toFixed(4) + ' kg/m³';
        }
        
        html +=
          '<div class="vz-explain-zone-class">' +
            '<div class="vz-explain-zone-class-header">' +
              '<span>' + (c.nameFr || '?') + ' (' + d50Text + ')</span>' +
              '<span class="vz-explain-num">' + pctClamped.toFixed(1) + '%</span>' +
            '</div>' +
            '<div class="vz-explain-zone-bar-track">' +
              '<div class="vz-explain-zone-bar-fill" style="width:' + pctClamped + '%"></div>' +
            '</div>' +
            (contribText ? '<div class="vz-explain-zone-class-contrib">' + contribText + '</div>' : '') +
          '</div>';
      });
    }
    
    // Conclusion adaptative
    if (isMulti) {
      var nUsed = t.zone.n_classes_used || 0;
      html +=
        '<div class="vz-explain-row vz-explain-row-conclusion">' +
          '<span class="vz-explain-yes">' +
            'Chaîne 1-9 exécutée ' + nUsed + ' fois en parallèle, ' +
            'combinaison optique pondérée par surface (Soulsby 1997 ch.9)' +
          '</span>' +
        '</div>';
    } else if (t.zone.fallback_reason) {
      html +=
        '<div class="vz-explain-row vz-explain-row-conclusion">' +
          '<span class="vz-explain-faint">' +
            'Calcul mono-classe sur sédiment ponctuel — ' + t.zone.fallback_reason +
          '</span>' +
        '</div>';
    }
    
    html +=
        '</div>' +
      '</div>';
  }

  // SECTION 2 - Conditions de surface
  // SECTION 2 - Conditions de surface
  var windDirName = _bearingToCardinal(t.surface.wind_dir);
  var waveDirName = _bearingToCardinal(t.surface.wave_dir);
  var currentDirName = _bearingToCardinal(t.surface.current_dir);
  html +=
    '<div class="vz-explain-section">' +
      '<div class="vz-explain-section-title">2. Conditions de surface</div>' +
      '<div class="vz-explain-section-body">' +
        '<div class="vz-explain-row"><span>Vent</span><span>' +
          windDirName + ' ' + t.surface.wind_kt + ' nds (rafales ' + t.surface.gusts_kt + ' nds)</span></div>' +
        '<div class="vz-explain-row"><span>Houle totale</span><span class="vz-explain-num">' +
          t.surface.wave_total.toFixed(2) + ' m, période ' + t.surface.wave_period.toFixed(1) + ' s</span></div>' +
       '<div class="vz-explain-row"><span>Courant</span><span class="vz-explain-num">' +
          t.surface.current_velocity.toFixed(2) + ' m/s ' + (t.surface.current_dir !== null ? currentDirName : '') + '</span></div>' +
        '<div class="vz-explain-row"><span>Source</span><span class="vz-explain-faint">' +
          t.surface.source + '</span></div>' +
      '</div>' +
    '</div>';

  // SECTION 3 - Calcul du brassage
  html +=
    '<div class="vz-explain-section">' +
      '<div class="vz-explain-section-title">3. Calcul du brassage au fond</div>' +
      '<div class="vz-explain-section-body">' +
        '<div class="vz-explain-row"><span>Vitesse de l\'eau au fond (Airy 1845)</span><span class="vz-explain-num">' +
          t.brique1.u_b.toFixed(3) + ' m/s</span></div>' +
        '<div class="vz-explain-row"><span>Force de la houle au fond</span><span class="vz-explain-num">' +
          t.brique2.tau_w.toFixed(3) + ' Pa</span></div>' +
        '<div class="vz-explain-row"><span>Force du courant au fond</span><span class="vz-explain-num">' +
          t.brique3.tau_c.toFixed(3) + ' Pa</span></div>' +
        '<div class="vz-explain-row vz-explain-row-total"><span>Force totale combinée</span><span class="vz-explain-num">' +
          t.brique4.tau_max.toFixed(3) + ' Pa</span></div>' +
      '</div>' +
    '</div>';

  // SECTION 4 - Est-ce que le sédiment bouge ?
  var mobiliseMsg = t.brique5.mobilized
    ? '<span class="vz-explain-yes">OUI — le sédiment est remis en suspension</span>'
    : '<span class="vz-explain-no">NON — le sédiment reste au repos</span>';
  html +=
    '<div class="vz-explain-section">' +
      '<div class="vz-explain-section-title">4. Le sédiment bouge-t-il ?</div>' +
      '<div class="vz-explain-section-body">' +
        '<div class="vz-explain-row"><span>Seuil de mise en mouvement (Shields 1936)</span><span class="vz-explain-num">' +
          t.brique5.theta_cr.toFixed(3) + '</span></div>' +
        '<div class="vz-explain-row"><span>Contrainte appliquée</span><span class="vz-explain-num">' +
          t.brique5.theta.toFixed(3) + '</span></div>' +
        '<div class="vz-explain-row"><span>Ratio appliqué / seuil</span><span class="vz-explain-num">' +
          t.brique5.excess.toFixed(2) + '×</span></div>' +
        '<div class="vz-explain-row vz-explain-row-conclusion">' + mobiliseMsg + '</div>' +
      '</div>' +
    '</div>';

  // SECTION 5 - Concentration en suspension
  html +=
    '<div class="vz-explain-section">' +
      '<div class="vz-explain-section-title">5. Combien de particules dans l\'eau</div>' +
      '<div class="vz-explain-section-body">' +
        '<div class="vz-explain-row"><span>Vitesse de chute (Stokes/Soulsby 1997)</span><span class="vz-explain-num">' +
          (t.brique7.w_s * 1000).toFixed(1) + ' mm/s</span></div>' +
        '<div class="vz-explain-row"><span>Concentration moyenne (Rouse 1937)</span><span class="vz-explain-num">' +
          t.brique6.c_moyen_kg.toFixed(4) + ' kg/m³</span></div>' +
      (t.brique6.rouse_number !== null && t.brique6.rouse_number !== undefined
          ? '<div class="vz-explain-row"><span>Nombre de Rouse</span><span class="vz-explain-num">' +
              t.brique6.rouse_number.toFixed(2) + '</span></div>'
          : '') +
        (t.brique6.transport_mode
          ? '<div class="vz-explain-row"><span>Mode de transport</span><span>' +
              t.brique6.transport_mode + '</span></div>'
          : '') +
        (t.brique6.rouse_factor !== undefined && t.brique6.rouse_factor < 1.0
          ? '<div class="vz-explain-row"><span>Atténuation suspension</span><span class="vz-explain-num">×' +
              t.brique6.rouse_factor.toFixed(2) + '</span></div>'
          : '') +
      '</div>' +
    '</div>';
// SECTION 5-bis - Mémoire temporelle (Brique 9, Patch 7-C)
  if (t.brique9) {
    var tauDepMin = t.brique9.tau_dep_seconds ? (t.brique9.tau_dep_seconds / 60).toFixed(1) : 'N/A';
    var tauDepDisplay = t.brique9.tau_dep_seconds
      ? (t.brique9.tau_dep_seconds < 3600
          ? tauDepMin + ' min'
          : (t.brique9.tau_dep_seconds / 3600).toFixed(1) + ' h')
      : 'N/A';
    var dominantMsg = t.brique9.dominant === 'inherited'
      ? '<span class="vz-explain-yes">MÉMOIRE DOMINANTE — décantation en cours</span>'
      : '<span class="vz-explain-no">ÉQUILIBRE DOMINANT — érosion active</span>';

    html +=
      '<div class="vz-explain-section">' +
        '<div class="vz-explain-section-title">5-bis. Mémoire temporelle (cinétique)</div>' +
        '<div class="vz-explain-section-body">' +
          '<div class="vz-explain-row"><span>Temps de décantation actuel</span><span class="vz-explain-num">' +
            tauDepDisplay + '</span></div>' +
          '<div class="vz-explain-row"><span>Concentration héritée du passé</span><span class="vz-explain-num">' +
            t.brique9.C_inherited.toFixed(4) + ' kg/m³</span></div>' +
          '<div class="vz-explain-row"><span>Concentration d\'équilibre actuelle</span><span class="vz-explain-num">' +
            t.brique9.C_equilibre_now.toFixed(4) + ' kg/m³</span></div>' +
          '<div class="vz-explain-row vz-explain-row-total"><span>Concentration cinétique finale (max)</span><span class="vz-explain-num">' +
            t.brique9.C_kinetic.toFixed(4) + ' kg/m³</span></div>' +
          '<div class="vz-explain-row"><span>Créneaux passés intégrés</span><span class="vz-explain-num">' +
            t.brique9.n_contributions + '</span></div>' +
          '<div class="vz-explain-row vz-explain-row-conclusion">' + dominantMsg + '</div>' +
        '</div>' +
      '</div>';
  }

  // SECTION 6 - Visibilité finale
  // SECTION 6 - Visibilité finale
  html +=
    '<div class="vz-explain-section">' +
      '<div class="vz-explain-section-title">6. Visibilité finale (Beer-Lambert)</div>' +
      '<div class="vz-explain-section-body">' +
        '<div class="vz-explain-row"><span>Turbidité ambiante de la zone</span><span class="vz-explain-num">' +
          t.brique8.c_baseline.toFixed(3) + ' m⁻¹</span></div>' +
        '<div class="vz-explain-row"><span>Contribution du sédiment (cinétique)</span><span class="vz-explain-num">' +
          t.brique8.c_sediment.toFixed(3) + ' m⁻¹</span></div>' +
        '<div class="vz-explain-row vz-explain-row-total"><span>Atténuation totale</span><span class="vz-explain-num">' +
          t.brique8.c_total.toFixed(3) + ' m⁻¹</span></div>' +
        '<div class="vz-explain-row vz-explain-row-conclusion">' +
          '<span>VISIBILITÉ ESTIMÉE</span>' +
          '<span class="vz-explain-num vz-explain-num-final">' + t.brique8.visi_m.toFixed(2) + ' m</span>' +
        '</div>' +
      '</div>' +
    '</div>';

  // Verdict en prose
  html +=
    '<div class="vz-explain-verdict">' +
      scoreResult.verdict +
    '</div>';

  return html;
}

// ----- Helper : label humain d'une zone optique -----
function _zoneOptiqueLabel(zone) {
  var labels = {
    'mediterranee': 'Méditerranée (eaux claires)',
    'atlantique_sud': 'Atlantique sud (eaux peu chargées)',
    'manche_occidentale_bretagne': 'Manche occidentale / Bretagne',
    'manche_orientale_mer_du_nord_sud': 'Manche orientale (turbide, silts dominants)',
    'fallback_europe': 'Europe (valeurs médianes par défaut)'
  };
  return labels[zone] || zone;
}

// ----- Helper : bearing → nom cardinal -----
function _bearingToCardinal(deg) {
  if (deg === null || deg === undefined || isNaN(deg)) return '?';
  var names = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return names[Math.round(deg / 45) % 8];
}
// Constante de temps (heures) pour la decantation, selon profondeur
// Plus le fond est peu profond, plus tau est long (re-brassage marees + houle residuelle)
// Calibration originale : Courseulles 26/04/2026 (2m visi apres 60h NE 25-32 nds, fond 5m)
function decantTau(depth) {
  // Calibration v3 : observations terrain Calvados/Cotentin mai 2026.
  // La decantation est plus rapide que la version originale (calibree sur
  // un cas de tempete extreme) car le brassage de marees Manche evacue
  // activement les sediments a chaque cycle (4 cycles par 24h).
  if (depth <= 2)  return 24;
  if (depth <= 5)  return 18;
  if (depth <= 10) return 12;
  if (depth <= 20) return 8;
  return 6;
}
// Energie de brassage instantanee a une heure i
// Vent effectif = mix vent soutenu + rafales, seuil critique 8 nds
// Effet quadratique de l'onshore (un vent lateral brasse beaucoup moins)
// IMPORTANT : w et g sont stockes en km/h dans S_spotWeatherCache (cf API
// Open-Meteo wind_speed_unit=kmh). On convertit explicitement en nds avant
// de comparer aux seuils, qui sont tous en nds (8 nds = 15 km/h ~ seuil de
// remise en suspension sediments cote sablo-vaseuse).
function brassageInstant(h, i, lat, lon) {
  // h.windspeed_10m et h.windgusts_10m sont en km/h (cf API Open-Meteo).
  // On convertit en nds avant comparaison aux seuils (tous en nds).
  // Calibration v3 : formule lineaire avec cap au lieu de quadratique.
  // La quadratique d'origine faisait exploser les valeurs (un coup a 30
  // nds comptait 16x plus qu'a 12 nds) et generait un cumul aberrant qui
  // plombait le score plusieurs jours apres meme en conditions calmes.
  if (i < 0 || i >= h.time.length) return 0;
  var wKt = (h.windspeed_10m[i] || 0) * 0.539957;
  var gKt = (h.windgusts_10m[i] || 0) * 0.539957;
  var d = h.winddirection_10m ? h.winddirection_10m[i] : null;
  if (d === null) return 0;
  var ventEff = wKt * 0.6 + gKt * 0.4;
  if (ventEff < 8) return 0;
  var coast = getCoastNormal(lat, lon);
  var windGoesTo = (d + 180) % 360;
  var angle = windGoesTo - coast;
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  var onshore = -Math.cos(angle * Math.PI / 180);
  if (onshore < 0.2) return 0;
  var excess = ventEff - 8;
  return Math.min(excess * onshore, 30);
}

// Energie residuelle cumulee au temps idx (sommation exponentielle decroissante)
// Regarde jusqu'a 5*tau heures en arriere (capte 99% de l'energie)
// Cache mémoïsé pour depthAtTime : évite de relooké TIDES.data
// pour chaque heure plusieurs fois quand le bandeau Conditions
// calcule les scores des 40 cellules de 5 jours.
var _depthAtTimeCache = {};
function depthAtTimeCached(depthLAT, timeISO) {
  var key = depthLAT + '|' + timeISO;
  if (_depthAtTimeCache[key] !== undefined) return _depthAtTimeCache[key];
  var v = depthAtTime(depthLAT, timeISO);
  _depthAtTimeCache[key] = v;
  return v;
}

function energieResiduelle(h, idx, depth, lat, lon) {
  var depthNow = depthAtTimeCached(depth, h.time[idx]);
  var tauNow = decantTau(depthNow);
  var lookback = Math.min(Math.round(tauNow * 5), idx);
  var total = 0;
  for (var k = 1; k <= lookback; k++) {
    var pastIdx = idx - k;
    var brass = brassageInstant(h, pastIdx, lat, lon);
    if (brass > 0) {
      var depthAtPast = depthAtTimeCached(depth, h.time[pastIdx]);
      var tauPast = decantTau(depthAtPast);
      // bathyFactor appliqué AU MOMENT du brassage : un coup de vent à BM
      // (peu d'eau) remue beaucoup plus le sédiment qu'à PM (beaucoup d'eau).
      // C'est cette énergie déjà amplifiée qui décante ensuite selon tau.
      var bathyFactorPast = 1.0 + 3.0 * Math.exp(-depthAtPast / 4);
      total += brass * bathyFactorPast * Math.exp(-k / tauPast);
    }
  }
  return total;
}

// Score visi unifie (utilise par timeline ET score instantane)
// Combine penalite instantanee + penalite cumulee de brassage residuel
// IMPORTANT : h.windspeed_10m et h.windgusts_10m sont en km/h (cf API).
// On convertit explicitement en nds avant comparaison aux seuils (qui sont
// tous en nds : 5 nds = vent calme, 25 nds = saturation pénalité).
function visScoreV2(h, idx, depth, lat, lon) {
  if (!h || !h.windspeed_10m || idx < 0) return 50;
  var w = (h.windspeed_10m[idx] || 0) * 0.539957;
  var g = (h.windgusts_10m[idx] || 0) * 0.539957;
  var d = h.winddirection_10m ? h.winddirection_10m[idx] : null;
  var wave = h.wave_height ? (h.wave_height[idx] || 0) : 0;

  // Bathy factor lisse (exponentiel, plus de saut brutal)
  // Profondeur instantanée à l'heure analysée : c'est la vraie colonne
  // d'eau au moment T (LAT + marée). Un spot à 1m LAT peut être à 8m
  // d'eau à PM, donc bathyFactor est correct seulement si on raisonne
  // sur la profondeur instantanée, pas LAT.
  var depthAtIdx = depthAtTimeCached(depth, h.time[idx]);
  var bathyFactor = 1.0 + 3.0 * Math.exp(-depthAtIdx / 4);

  // Penalite instantanee (vent du moment)
  var dirFactor = getDirFactorForPoint(d, lat, lon);
  var windPenalty = Math.min(Math.max(w - 5, 0) / 20, 1) * 55 * dirFactor;
  var gustPenalty = Math.min(Math.max(g - 10, 0) / 25, 1) * 30 * dirFactor;
  var wavePenalty = Math.min(wave / 1.2, 1) * 35;
  var penaliteInstant = (windPenalty + gustPenalty + wavePenalty) * bathyFactor;

// Penalite cumulee (energie de brassage des dernieres heures/jours)
  var energie = energieResiduelle(h, idx, depth, lat, lon);
  // Calibration v3 : avec la formule lineaire de brassageInstant, l'energie
  // typique passe de ~1000-2000 (ancienne quadratique) a ~20-200 (lineaire).
  // Le multiplicateur 0.33 vise une penalite cumulee de ~80 pour energie 200
  // (vraie tempete) et ~15 pour energie 30 (decantation en cours).
// Calibration v3 : avec la formule lineaire de brassageInstant, l'energie
  // typique passe de ~1000-2000 (ancienne quadratique) a ~20-200 (lineaire).
  // bathyFactor est déjà appliqué à l'intérieur d'energieResiduelle pour chaque
  // brassage individuel selon la profondeur de son heure. Ne pas le réappliquer
  // ici, ça créerait une double amplification.
  var penaliteCumulee = energie * 0.33 * 0.5;

  // On prend la plus forte des deux (l'instant ou le cumule, selon ce qui domine)
  // Cela evite la double-comptabilisation quand le vent est en train de souffler
  var penaliteFinale = Math.max(penaliteInstant, penaliteCumulee);
  penaliteFinale = Math.min(penaliteFinale, 100);

  return Math.max(0, Math.min(100, 100 - penaliteFinale));
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
// ============================================================
// PATCH 8-C-1 — fetchSedimentZone + helpers d'intersection
// ------------------------------------------------------------
// Récupère la composition zonale Folk5 dans un cercle de rayon
// adaptatif autour d'un point, via EMODnet WFS bbox direct
// frontend (pas de GAS).
//
// Permet à la chaîne 1-9 de tourner en parallèle sur les
// classes Folk dominantes de la zone hydrodynamique du
// chasseur, au lieu d'un seul sédiment ponctuel.
//
// Rayon adaptatif R = max(100, 30 × depth_instant) m
// (Source : Green & Coco 2014, Reviews of Geophysics 52)
//
// Algorithme d'intersection cercle-polygone : Monte Carlo
// 40×40 = 1600 samples dans le cercle, comptage des hits
// par polygone. Précision ~1-2% sur la fraction surfacique.
// ============================================================

// Cache zonal indexé par (lat_4, lon_4, depth_round)
// Vidé automatiquement par invalidateChainCache() au clic.
var S_spotZoneCache = {};

function invalidateZoneCache() {
  S_spotZoneCache = {};
}

// ----- Helper : ray-casting sur MultiPolygon GeoJSON -----
// EMODnet retourne souvent des MultiPolygon (plusieurs polygones
// séparés dans une seule feature). On teste l'appartenance à
// chacun des sous-polygones (rings extérieurs uniquement, on
// ignore les trous pour simplicité — précision suffisante).
function _pointInMultiPolygon(point, geometry) {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') {
    // coordinates = [outerRing, hole1, hole2, ...]
    return pointInPolygon(point, geometry.coordinates[0]);
  }
  if (geometry.type === 'MultiPolygon') {
    // coordinates = [[outerRing1, ...], [outerRing2, ...], ...]
    for (var i = 0; i < geometry.coordinates.length; i++) {
      if (pointInPolygon(point, geometry.coordinates[i][0])) return true;
    }
    return false;
  }
  return false;
}

// ----- Helper : intersection cercle-polygone Monte Carlo -----
// Échantillonne 1600 points uniformément dans le cercle
// (grille 40×40 sur la bbox du cercle, filtre dans le disque),
// compte les hits dans la géométrie, retourne la fraction.
// 
// lat, lon : centre du cercle (degrés)
// radius_m : rayon en mètres
// geometry : Polygon ou MultiPolygon GeoJSON
function _intersectCirclePolygon(lat, lon, radius_m, geometry) {
  // ============================================================
  // PATCH 8-F : Ponderation exponentielle distance-decroissante
  // ------------------------------------------------------------
  // Au lieu d'une fraction surfacique uniforme dans le cercle, on
  // pondere chaque sample par exp(-d / R_decroissance) ou d est sa
  // distance au centre. R_decroissance = radius_m / 2 (e-folding
  // a mi-rayon), choix coherent avec la solution analytique du
  // modele 1D advection-diffusion-decantation de Soulsby 1997
  // ch.9 eq.142 : C(x) = C_source × exp(-x × w_s / (U × H)).
  //
  // Pour conditions cotieres typiques (w_s = 10 mm/s sable fin,
  // U = 0.5 m/s, H = 5m), l'e-folding theorique = (U × H) / w_s
  // = 250m, soit la moitie de R = 600m. La pondération
  // exp(-d / (R/2)) reproduit cette decroissance.
  //
  // Sources :
  //   - Soulsby R.L. 1997, "Dynamics of Marine Sands", Thomas
  //     Telford, ch.9 §3 (modele 1D advection-diffusion)
  //   - Le Hir P. et al. 2011, "Sediment erodability in sediment
  //     transport modelling", Cont. Shelf Res. 31 (calibration
  //     MARS3D zones cotieres Manche/Atlantique)
  // ============================================================
  var dLat = radius_m / 111000;
  var dLon = radius_m / (111000 * Math.cos(lat * Math.PI / 180));
  var R_decay = radius_m / 2;  // e-folding a mi-rayon
  
  var GRID = 40;
  var weightedHitsInPolygon = 0;
  var weightedHitsInCircle = 0;
  
  for (var i = 0; i < GRID; i++) {
    for (var j = 0; j < GRID; j++) {
      var nx = -1 + 2 * (i + 0.5) / GRID;
      var ny = -1 + 2 * (j + 0.5) / GRID;
      
      var normSq = nx * nx + ny * ny;
      if (normSq > 1) continue;
      
      // Distance au centre en metres (norme L2 × radius_m)
      var d_meters = Math.sqrt(normSq) * radius_m;
      // Poids exponentiel decroissant
      var weight = Math.exp(-d_meters / R_decay);
      
      weightedHitsInCircle += weight;
      
      var pLon = lon + nx * dLon;
      var pLat = lat + ny * dLat;
      
      if (_pointInMultiPolygon([pLon, pLat], geometry)) {
        weightedHitsInPolygon += weight;
      }
    }
  }
  
  if (weightedHitsInCircle === 0) return 0;
  return weightedHitsInPolygon / weightedHitsInCircle;
}
// ============================================================
// HELPER : Estimation du courant tidal moyen pour rayon advectif
// ------------------------------------------------------------
// Retourne le courant tidal moyen (m/s) utilise pour calculer le
// rayon d'advection sedimentaire dans fetchSedimentZone.
//
// Strategie :
//   1. Si S_spotMarineCache rempli avec valeurs valides :
//      moyenne 6h glissante centree sur l'heure actuelle
//      (capture le cycle tidal local complet)
//   2. Sinon (race condition au premier clic ou cache vide) :
//      fallback geographique base sur zones tidales documentees
//      (Atlas SHOM "Courants de maree cote ouest de France")
//
// Sources fallback geographique :
//   - SHOM 1996, "Atlas des courants de maree de la cote ouest
//     de France" (valeurs vives-eau/mortes-eau moyennees)
//   - Bouligand & Tabeaud 1998, "Les courants en Manche orientale"
//     (Geographie Physique et Quaternaire 52, p.137)
//   - Pingree & Maddock 1977, "Tidal residuals in the English
//     Channel" (J. Marine Biol. Assoc. UK 57)
// ============================================================
function getMeanTidalCurrent(lat, lon) {
  // ----- Cas A : cache marine rempli avec valeurs valides -----
  if (typeof S_spotMarineCache !== 'undefined' && S_spotMarineCache &&
      S_spotMarineCache.ocean_current_velocity && S_spotMarineCache.time) {
    var nowMs = Date.now();
    var validValues = [];
    for (var i = 0; i < S_spotMarineCache.time.length; i++) {
      var tMs = new Date(S_spotMarineCache.time[i]).getTime();
      var dtHours = Math.abs(tMs - nowMs) / 3600000;
      if (dtHours <= 6) {
        var v = S_spotMarineCache.ocean_current_velocity[i];
        if (typeof v === 'number' && isFinite(v) && v >= 0 && v < 3.5) {
          validValues.push(v);
        }
      }
    }
    if (validValues.length >= 3) {
      var sum = 0;
      for (var k = 0; k < validValues.length; k++) sum += validValues[k];
      return { U: sum / validValues.length, source: 'marine_6h_avg' };
    }
  }

  // ----- Cas B : fallback geographique -----
  // Mediterranee francaise (lat 41-43.5, lon 3-10)
  if (lat >= 41.0 && lat <= 43.5 && lon >= 3.0 && lon <= 10.0) {
    return { U: 0.15, source: 'fallback_mediterranee' };
  }
  // Zones de courants extremes (Raz Blanchard, Fromveur, Goulet Brest)
  if ((lat >= 49.55 && lat <= 49.80 && lon >= -2.10 && lon <= -1.75) ||  // Raz Blanchard + Hague
      (lat >= 48.40 && lat <= 48.55 && lon >= -5.15 && lon <= -4.85) ||  // Fromveur
      (lat >= 48.30 && lat <= 48.40 && lon >= -4.60 && lon <= -4.40)) {  // Goulet Brest
    return { U: 1.6, source: 'fallback_courants_forts' };
  }
  // Cotentin (hors Raz/Hague deja couverts ci-dessus)
  if (lat >= 49.20 && lat <= 49.75 && lon >= -1.95 && lon <= -1.15) {
    return { U: 0.9, source: 'fallback_cotentin' };
  }
  // Manche orientale (baie de Seine, Calvados, Picardie)
  if (lat >= 49.00 && lat <= 51.20 && lon >= -1.10 && lon <= 2.50) {
    return { U: 0.6, source: 'fallback_manche_orientale' };
  }
  // Bretagne nord et Manche occidentale
  if ((lat >= 48.50 && lat <= 49.00 && lon >= -5.50 && lon <= -1.00) ||
      (lat >= 48.50 && lat <= 49.70 && lon >= -2.50 && lon <= -0.50)) {
    return { U: 0.8, source: 'fallback_bretagne_nord' };
  }
  // Bretagne sud
  if (lat >= 47.20 && lat <= 48.50 && lon >= -4.90 && lon <= -2.00) {
    return { U: 0.5, source: 'fallback_bretagne_sud' };
  }
  // Atlantique sud (Loire, Vendee, Charentes, Aquitaine, Pays Basque)
  if (lat >= 43.30 && lat <= 47.20 && lon >= -3.50 && lon <= -0.50) {
    return { U: 0.3, source: 'fallback_atlantique_sud' };
  }
  // Defaut prudent (Manche moyenne)
  return { U: 0.5, source: 'fallback_default' };
}
// ----- Fonction principale : fetchSedimentZone -----
// 
// Retourne une Promise qui résout vers un objet :
//   {
//     radius_m: 210,
//     classes: [
//       { folk5: 2, nameFr: 'Sable', D50_mm: 0.250, surface_pct: 62, sediment: {...} },
//       { folk5: 3, nameFr: 'Sediment grossier', D50_mm: 1.000, surface_pct: 23, sediment: {...} },
//       ...
//     ],
//     total_surface_pct: 95,
//     error: null  // ou string si problème
//   }
//
// Sources : EMODnet Geology, couche gtk:seabed_substrate_250k
// (résolution 1:250 000, couverture complète France métropolitaine).
function fetchSedimentZone(lat, lon, depth_instant) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || !isFinite(lat) || !isFinite(lon)) {
    return Promise.resolve({ radius_m: 0, classes: [], total_surface_pct: 0, error: 'invalid lat/lon' });
  }
  if (!depth_instant || depth_instant <= 0) {
    return Promise.resolve({ radius_m: 0, classes: [], total_surface_pct: 0, error: 'invalid depth' });
  }
  
// Cache 24h, clé indépendante de la profondeur (mosaïque sédimentaire
  // invariante avec la marée). Patch 8-C-2c v2.
// ============================================================
  // PATCH 8-F : Rayon adaptatif au regime tidal (advectif)
  // ------------------------------------------------------------
  // Remplace l'ancien rayon hydrodynamique strict Green & Coco
  // (R = max(100, 30 × depth)) par un rayon advectif base sur
  // le courant tidal local, conforme aux modeles operationnels
  // Manche/Atlantique (Le Hir 2011, MARS3D).
  //
  // Formule : R = max(150, U × 600s) avec cap a 1500m
  //   - 600s = duree de vie typique de turbidite sable fin
  //     avant decantation (Soulsby 1997 ch.9 §3)
  //   - Plancher 150m : evite rayons inutilement petits en zone
  //     mediterraneenne ou tres calme
  //   - Cap 1500m : evite d'inclure des conditions trop eloignees
  //     dans les zones extremes (Raz Blanchard, Fromveur)
  //
  // Exemples par zone :
  //   - Mediterranee (U~0.15) : R = 150m (plancher)
  //   - Atlantique sud (U~0.3) : R = 180m
  //   - Calvados (U~0.5) : R = 300m
  //   - Cotentin (U~1.0) : R = 600m
  //   - Raz Blanchard (U~2.5) : R = 1500m (cap)
  //
  // Sources scientifiques :
  //   - Soulsby R.L. 1997, "Dynamics of Marine Sands", ch.9 §3
  //   - Le Hir P. et al. 2011, Cont. Shelf Res. 31
  //   - Tessier C. 2013, these IFREMER (panaches 2-5km baie de Seine)
  //   - SHOM 1996, "Atlas des courants de maree cote ouest France"
  // ============================================================
  var currentInfo = getMeanTidalCurrent(lat, lon);
  var U_courant = currentInfo.U;
  var R = Math.min(1500, Math.max(150, U_courant * 600));
  
  // Cle de cache : on inclut R arrondi a 50m pour invalider
  // automatiquement le cache si U_courant change significativement
  // (ex: cache marine pas rempli au 1er clic, rempli au 2e).
  var R_rounded = Math.round(R / 50) * 50;
  var cacheKey = lat.toFixed(4) + '|' + lon.toFixed(4) + '|R' + R_rounded;
  if (S_spotZoneCache[cacheKey]) {
    return Promise.resolve(S_spotZoneCache[cacheKey]);
  }
  
  // Conversion R → bbox (avec marge 1.1× pour capturer les polygones qui débordent)
  var dLat = (R * 1.1) / 111000;
  var dLon = (R * 1.1) / (111000 * Math.cos(lat * Math.PI / 180));
  var lat_min = lat - dLat;
  var lat_max = lat + dLat;
  var lon_min = lon - dLon;
  var lon_max = lon + dLon;
  
  // URL EMODnet WFS
var url = 'https://drive.emodnet-geology.eu/geoserver/gtk/wfs'
    + '?service=WFS&version=2.0.0&request=GetFeature'
    + '&typeNames=gtk:seabed_substrate_250k'
    + '&srsName=EPSG:4326'  // PATCH 8-C-1 v2 : force la projection de sortie (sinon EMODnet retourne EPSG:3857 par défaut)
    + '&bbox=' + lon_min + ',' + lat_min + ',' + lon_max + ',' + lat_max + ',EPSG:4326'
    + '&outputFormat=application/json';
  
  return fetch(url)
    .then(function(r) {
      if (!r.ok) throw new Error('WFS HTTP ' + r.status);
      return r.json();
    })
    .then(function(geojson) {
      if (!geojson.features || geojson.features.length === 0) {
        var emptyResult = { radius_m: R, classes: [], total_surface_pct: 0, error: 'no features in bbox' };
        S_spotZoneCache[cacheKey] = emptyResult;
        return emptyResult;
      }
      
      // Pour chaque feature : intersection avec le cercle + mapping sédiment
      // Regroupement par classe Folk5 (plusieurs polygones peuvent appartenir à la même classe)
      var classesByFolk = {};
      
      geojson.features.forEach(function(feature) {
        var props = feature.properties || {};
        var sediment = mapFolkToSediment(
          props.folk_5cl_txt,
          props.original_substrate,
          props.folk_16cl_txt
        );
        if (!sediment) return;  // classe non-mappable, on saute
        
        // Intersection cercle-polygone
        var fraction = _intersectCirclePolygon(lat, lon, R, feature.geometry);
        if (fraction <= 0) return;  // pas dans le cercle
        
        var key = sediment.folk5;
        if (!classesByFolk[key]) {
          classesByFolk[key] = {
            folk5: sediment.folk5,
            nameFr: sediment.nameFr,
            D50_mm: sediment.D50_mm,
            surface_pct: 0,
            sediment: sediment  // objet complet pour la chaîne 1-9
          };
        }
        classesByFolk[key].surface_pct += fraction * 100;
      });
      
      // Conversion en tableau trié par surface décroissante
      var classes = Object.values(classesByFolk).sort(function(a, b) {
        return b.surface_pct - a.surface_pct;
      });
      
      var total = classes.reduce(function(s, c) { return s + c.surface_pct; }, 0);
      
     var result = {
        radius_m: R,
        radius_decay_m: R / 2,
        U_courant_used: U_courant,
        U_source: currentInfo.source,
        classes: classes,
        total_surface_pct: total,
        error: null
      };
      
      S_spotZoneCache[cacheKey] = result;
      return result;
    })
    .catch(function(err) {
      console.warn('[fetchSedimentZone] échec WFS:', err.message);
      var errorResult = { radius_m: R, classes: [], total_surface_pct: 0, error: err.message };
      S_spotZoneCache[cacheKey] = errorResult;  // cache aussi les erreurs pour éviter les retries
      return errorResult;
    });
}
// ============================================================
// PATCH 8-C-2a — computeChainPerClass
// ------------------------------------------------------------
// Exécute la chaîne hydrodynamique Briques 1 → 9 pour UNE
// classe sédimentaire donnée, en réutilisant les variables
// marines déjà calculées (Hs, Tp, U_effectif, waveDir,
// currentDir, depthInstant) issues du contexte V4.
//
// Cette fonction est appelée :
//   - par computeVisibilityScore_V4 dans le chemin mono-classe
//     (refactoring du code existant)
//   - par la branche multi-classes (Patch 8-C-2d) pour chaque
//     classe Folk5 non-rock retournée par fetchSedimentZone
//
// Le sédiment passé en arg détermine les D50, w_s, tau_cr de
// la chaîne. Le reste (forçages hydrodynamiques) est identique
// pour toutes les classes d'une même zone.
//
// Retour :
//   {
//     C_kinetic: kg/m³ (concentration cinétique Brique 9),
//     C_equilibre: kg/m³ (concentration équilibre Brique 6),
//     rouse_number: nombre de Rouse Brique 6,
//     w_s: vitesse de chute Brique 7,
//     tau_max: cisaillement combiné Brique 4,
//     theta_excess: dépassement Shields Brique 5,
//     trace: { brique1, brique2, ..., brique9 },
//     error: null ou string si une brique a échoué
//   }
//
// Argument ctx : objet contenant toutes les variables marines :
//   { h, idx, depth, lat, lon, sediment, depthInstant,
//     Hs, Tp, U_effectif, waveDir, currentDir }
// ============================================================
function computeChainPerClass(ctx) {
  var trace = {};
  
  // BRIQUE 1 — Vitesse orbitale au fond (Airy 1845)
  var omega = ctx.Tp > 0 ? (2 * Math.PI / ctx.Tp) : 0;
  var u_b = computeOrbitalVelocityAtBed(ctx.Hs, ctx.Tp, ctx.depthInstant);
  if (u_b === null) {
    return { error: 'Brique 1 (Airy) a retourné null', trace: trace };
  }
  trace.brique1 = { u_b: u_b };

  // BRIQUE 2 — Cisaillement par la houle (Swart 1974 / Soulsby 1997)
  var tau_w = computeBedShearStressWaves(u_b, omega, ctx.sediment);
  if (tau_w === null) {
    return { error: 'Brique 2 (cisaillement houle) a retourné null', trace: trace };
  }
  trace.brique2 = { tau_w: tau_w };

  // BRIQUE 3 — Cisaillement par le courant (Prandtl 1925 / Soulsby 1997)
  var tau_c = computeBedShearStressCurrent(ctx.U_effectif, ctx.sediment, ctx.depthInstant);
  if (tau_c === null) {
    // Cas dégénéré accepté par Brique 4
    tau_c = 0;
  }
  trace.brique3 = { tau_c: tau_c };

  // BRIQUE 4 — Combinaison houle + courant (Soulsby & Clarke 2005)
  var tau_max = computeBedShearStressCombined(tau_w, tau_c, ctx.waveDir, ctx.currentDir);
  if (tau_max === null) {
    return { error: 'Brique 4 (combinaison) a retourné null', trace: trace };
  }
  trace.brique4 = { tau_max: tau_max };

  // BRIQUE 5 — Critère de Shields (Shields 1936 / Soulsby 1997)
  var shieldsResult = computeShieldsCriterion(tau_max, ctx.sediment);
  if (shieldsResult === null) {
    return { error: 'Brique 5 (Shields) a retourné null', trace: trace };
  }
  trace.brique5 = {
    theta: shieldsResult.theta,
    theta_cr: shieldsResult.theta_cr,
    excess: shieldsResult.excess,
    mobilized: shieldsResult.excess > 1.0
  };

  // BRIQUE 7 — Vitesse de chute (Stokes 1851 / Soulsby 1997)
  var w_s = computeSettlingVelocity(ctx.sediment);
  if (w_s === null) {
    return { error: 'Brique 7 (vitesse de chute) a retourné null', trace: trace };
  }
  trace.brique7 = { w_s: w_s };

// BRIQUE 6 — Concentration en suspension (Rouse 1937 / Soulsby 1997)
  var concResult = computeSuspendedConcentration(
    tau_max, shieldsResult, w_s, ctx.depthInstant, ctx.sediment
  );
  // PATCH 8-C-2a v2 : si Brique 6 retourne null (Rouse > 2.5 ou
  // sédiment non-suspendable), c'est physiquement légitime — pas
  // une erreur. Le sédiment est non-mobilisable hydrodynamiquement
  // dans la colonne d'eau actuelle. On retourne C_kinetic=0 pour
  // que cette classe contribue 0 à l'optique combinée (Patch 8-C-2b).
  // En mono-classe, V4 fallbackera empirical comme avant.
  if (concResult === null) {
    trace.brique6 = { c_moyen_kg: 0, rouse_number: null, non_suspendable: true };
    trace.brique9 = { C_kinetic: 0, non_suspendable: true };
    return {
      C_kinetic: 0,
      C_equilibre: 0,
      rouse_number: null,
      w_s: w_s,
      tau_max: tau_max,
      theta_excess: shieldsResult.excess,
      warnings: ['Sédiment non-suspendable (Rouse > 2.5 ou colonne d\'eau insuffisante)'],
      trace: trace,
      error: null,
      non_suspendable: true  // marqueur pour V4 mono-classe : si seul sédiment et non_suspendable → fallback empirical
    };
  }
trace.brique6 = {
    c_moyen_kg: concResult.c_moyen_kg,
    c_moyen_kg_brut: concResult.c_moyen_kg_brut,
    rouse_number: concResult.rouse_number,
    rouse_factor: concResult.rouse_factor,
    transport_mode: concResult.transport_mode
  };
  // BRIQUE 9 — Cinétique de décantation (mémoire temporelle Krone 1962)
  var kinResult = computeKineticConcentration(
    ctx.h, ctx.idx, ctx.depth, ctx.lat, ctx.lon,
    ctx.sediment, concResult.c_moyen_kg
  );
  trace.brique9 = {
    C_equilibre_now: concResult.c_moyen_kg,
    C_inherited: kinResult.C_inherited,
    C_kinetic: kinResult.C_kinetic,
    tau_dep_seconds: kinResult.tau_dep_at_idx,
    dominant: kinResult.dominant,
    n_contributions: kinResult.n_contributions
  };

  return {
    C_kinetic: kinResult.C_kinetic,
    C_equilibre: concResult.c_moyen_kg,
    rouse_number: concResult.rouse_number,
    w_s: w_s,
    tau_max: tau_max,
    theta_excess: shieldsResult.excess,
    warnings: kinResult.warnings || [],
    trace: trace,
    error: null
  };
}
// ============================================================
// PATCH 8-C-2b — combineMultiClassOptics
// ------------------------------------------------------------
// Combine les contributions optiques de plusieurs classes
// sédimentaires (sortie multi-classes), pondérées par leur
// fraction de surface dans le rayon hydrodynamique.
//
// Formule (Soulsby 1997 ch.9 §3, atténuation optique additive
// pondérée par fraction surfacique) :
//
//   c_sediment_total = Σ b_local_by_folk[Folk5] × C_kinetic × (surface_pct/100)
//   c_total = c_baseline + c_sediment_total
//   visi_m = 2.38 / c_total  (Davies-Colley 1988)
//
// Justification : sur une zone hydrodynamique mosaïquée, l'eau
// au-dessus des différentes classes sédimentaires se mélange
// rapidement (constante de mélange < 1 min pour ~100m, Soulsby
// 1997). L'œil du chasseur intègre donc la turbidité moyenne
// pondérée par les surfaces relatives.
//
// Argument :
//   classes_with_C : [{ sediment, C_kinetic, surface_pct }, ...]
//   optical : sortie de getRegionalOpticalBaseline (c_baseline,
//             b_local_by_folk, zone)
//
// Retour : même format que computeVisibility, substituable.
// ============================================================
function combineMultiClassOptics(classes_with_C, optical) {
  if (!classes_with_C || classes_with_C.length === 0) return null;
  if (!optical || typeof optical.c_baseline !== 'number') return null;
  
  var c_baseline = optical.c_baseline;
  var b_local_by_folk = optical.b_local_by_folk;
  
  // Garde : si pas de table b_local_by_folk (zone non couverte par
  // Patch 8-B), on ne peut pas combiner par classe. Retour null →
  // V4 fallback sur mono-classe.
  if (!b_local_by_folk) return null;
  
  // Somme pondérée des contributions sédimentaires
  var c_sediment_total = 0;
  var contributions = [];  // pour trace/debug
  
  for (var i = 0; i < classes_with_C.length; i++) {
    var entry = classes_with_C[i];
    var sediment = entry.sediment;
    var C = entry.C_kinetic;
    var surface_pct = entry.surface_pct;
    
    // Validation entrée
    if (!sediment || typeof sediment.folk5 !== 'number') continue;
    if (typeof C !== 'number' || !isFinite(C) || C < 0) continue;
    if (typeof surface_pct !== 'number' || !isFinite(surface_pct) || surface_pct <= 0) continue;
    
    var folk5 = sediment.folk5;
    var b_local = b_local_by_folk[folk5];
    
    // Si classe rock (folk5=5) ou b_local manquant → contribution 0
    if (sediment.regime === 'rock' || typeof b_local !== 'number') continue;
    
    var weight = surface_pct / 100;
    var contribution = b_local * C * weight;
    c_sediment_total += contribution;
    
    contributions.push({
      folk5: folk5,
      nameFr: sediment.nameFr,
      b_local: b_local,
      C_kinetic: C,
      surface_pct: surface_pct,
      contribution: contribution
    });
  }
  
  var c_total = c_baseline + c_sediment_total;
  if (!isFinite(c_total) || c_total <= 0) return null;
  
  // Profondeur Secchi (Preisendorfer 1986)
  var d_secchi = 1.7 / c_total;
  // Visibilité horizontale chasseur sous-marin (Davies-Colley 1988)
  var visi_m = 2.38 / c_total;
  
  // Sanity check
  if (!isFinite(visi_m) || visi_m < 0) return null;
  if (visi_m > 50) {
    console.warn('[combineMultiClassOptics] visi_m > 50m, plafond physique dépassé:', visi_m);
  }
  
  return {
    visi_m: visi_m,
    d_secchi: d_secchi,
    c_total: c_total,
    c_baseline: c_baseline,
    c_sediment: c_sediment_total,
    zone: optical.zone,
    sources: optical.sources + ' + multi-classes Soulsby 1997 ch.9',
    multi_class: true,
    contributions: contributions  // pour trace 8-D
  };
}
// ============================================================
// fetchSpotMarineAndSun - donnees marines + soleil pour un point
// ------------------------------------------------------------
// Appelle Open-Meteo Marine API pour recuperer toutes les
// variables hydrodynamiques utiles a la chaine physique :
//   - Houle locale generee par le vent (wind_wave_*)
//   - Houle de fond / swell (swell_wave_*)
//   - Houle totale (wave_*)
//   - Courant tidal/oceanique (ocean_current_*) - probablement
//     issu du modele Copernicus IBI ~1.5km
//   - Temperature eau (sea_surface_temperature) - utile pour
//     viscosite cinematique dans Soulsby/Stokes
//
// Source : Open-Meteo Marine API (free tier, no key required).
// Couverture validee 100% sur points cotiers FR (test 09/05/26).
//
// Effets de bord :
//   - Stocke l'integralite des donnees marines dans
//     S_spotMarineCache (objet hourly Open-Meteo natif)
//   - Met a jour le DOM (#spotSeaTemp) et S._sunriseTime,
//     S._sunsetTime - comportement legacy preserve
//
// Etend la fenetre temporelle a 5 jours (pour aligner sur
// la couverture meteo AROME+ARPEGE et permettre aux briques
// physiques de raisonner sur la meme plage temporelle).
// ============================================================
function fetchSpotMarineAndSun(lat, lon) {
  // Patch 7-A/3 : extension du cache marine à 3 jours de passé
  // Justification scientifique : la Brique 9 (mémoire temporelle de
  // décantation, Krone 1962 / Mehta 1989 / Soulsby 1997 ch.9) a besoin
  // des concentrations C_equilibre(t) des créneaux passés pour calculer
  // la somme pondérée des contributions atténuées.
  //
  // 3 jours capte 99% de l'énergie sédimentaire pour les sédiments
  // non-cohésifs en Manche (Tessier 2013 : éclaircissement post-tempête
  // typique 24-72h). Au-delà, la contribution exp(-dt/tau_dep) devient
  // négligeable.
  //
  // Surcoût : +60 datapoints par variable (3j × 24h = 72 datapoints
  // supplémentaires). Pour ~6 variables marines, environ +20 KB par
  // cache marine. Négligeable.
  //
  // L'index marineIdx est ré-aligné automatiquement par recherche de
  // timestamp dans computeVisibilityScore_V4 (code existant), donc
  // aucune modification ailleurs nécessaire.
  var now = new Date();
  var start = new Date(now);
  start.setDate(start.getDate() - 3);  // 3 jours de passé pour Brique 9
  var end = new Date(now);
  end.setDate(end.getDate() + 5);
  // Helper local de formatage de date pour l'API Open-Meteo
  // (yyyy-MM-dd). Supprimée accidentellement lors du Patch 7-A,
  // ré-injectée ici.
  function fmt(d) {
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  // 16 variables marines validees Etape 1.1 (couverture 100% France)
  var marineVars = [
    'wave_height', 'wave_direction', 'wave_period',
    'wind_wave_height', 'wind_wave_direction', 'wind_wave_period', 'wind_wave_peak_period',
    'swell_wave_height', 'swell_wave_direction', 'swell_wave_period', 'swell_wave_peak_period',
    'sea_surface_temperature',
    'ocean_current_velocity', 'ocean_current_direction',
    'sea_level_height_msl', 'invert_barometer_height'
  ].join(',');

  var marineUrl = 'https://marine-api.open-meteo.com/v1/marine'
    + '?latitude=' + lat + '&longitude=' + lon
    + '&hourly=' + marineVars
    + '&timezone=Europe/Paris'
    + '&start_date=' + fmt(start) + '&end_date=' + fmt(end);

var marinePromise = fetch(marineUrl).then(function(r) { return r.json(); }).then(function(d) {
if (!d.hourly) return;
    // ============================================================
    // PATCH UNITÉ : Conversion ocean_current_velocity km/h → m/s
    // ------------------------------------------------------------
    // L'API Open-Meteo Marine retourne ocean_current_velocity en
    // km/h (confirmé par d.hourly_units.ocean_current_velocity =
    // 'km/h'), mais toute la chaîne physique Visimer (Brique 3
    // Prandtl/Soulsby, garde V4 "courant aberrant", Patch 8-F
    // rayon adaptatif, helper getMeanTidalCurrent) attend des m/s.
    //
    // Sans cette conversion, toutes les valeurs de courant sont
    // surestimées d'un facteur 3.6, causant :
    //   - Surestimation des contraintes au fond (Brique 3)
    //   - Déclenchement abusif de la garde "courant aberrant"
    //   - Rayon advectif Patch 8-F démesurément grand
    //   - Visi prédite catastrophiquement basse sur spots côtiers
    //
    // Conversion à la source pour garantir cohérence sémantique :
    // tous les consommateurs lisent désormais des m/s comme prévu.
    //
    // Garde de nullité : Open-Meteo peut retourner null sur les
    // cellules de terre ferme ou hors couverture maritime.
    // ============================================================
    if (d.hourly.ocean_current_velocity && Array.isArray(d.hourly.ocean_current_velocity)) {
      d.hourly.ocean_current_velocity = d.hourly.ocean_current_velocity.map(function(v) {
        return (v === null || v === undefined || !isFinite(v)) ? v : (v / 3.6);
      });
    }
    // Stockage complet pour les briques physiques en aval
    S_spotMarineCache = d.hourly;

    // Mise a jour DOM temperature (legacy preserve) - lit l'heure courante
    if (d.hourly.sea_surface_temperature && d.hourly.sea_surface_temperature.length > 0) {
      var temp = d.hourly.sea_surface_temperature[0];
      if (temp !== null && temp !== undefined) {
        document.getElementById('spotSeaTemp').textContent = temp.toFixed(1) + ' C';
      }
    }
}).catch(function(err) {
    console.warn('[VIZI] marine API failed:', err);
    S_spotMarineCache = null;
    throw err;  // CHANTIER 1 : rethrow pour propager au pipeline séquentiel
  });

  // Lever/coucher soleil - inchange
  var sunUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&daily=sunrise,sunset&timezone=Europe/Paris&start_date=' + fmt(start) + '&end_date=' + fmt(start);
  fetch(sunUrl).then(function(r) { return r.json(); }).then(function(d) {
    if (!d.daily) return;
    if (d.daily.sunrise && d.daily.sunrise[0]) {
      document.getElementById('spotSunrise').textContent = d.daily.sunrise[0].slice(11, 16);
      S._sunriseTime = d.daily.sunrise[0].slice(11, 16);
    }
    if (d.daily.sunset && d.daily.sunset[0]) {
      document.getElementById('spotSunset').textContent = d.daily.sunset[0].slice(11, 16);
      S._sunsetTime = d.daily.sunset[0].slice(11, 16);
    }
if (TIDES.data && TIDES.extremes) renderTidesForSelectedDate();
  }).catch(function() {});
  
  // CHANTIER 1 : retourne la promise marine pour le pipeline séquentiel
  // (le sun reste en side-effect, non critique pour V4)
  return marinePromise;
}

// ============================================================
// MAPPING FOLK 5 -> PROPRIETES PHYSIQUES DU SEDIMENT
// ------------------------------------------------------------
// Source : EMODnet Geology III (classification Folk 5 classes
// officielle, modified Folk triangle + rock & boulders).
// Reference : EMODnet Seabed Substrate, EuroGeoSurveys.
//
// Echelle granulometrique : Udden-Wentworth (Wentworth 1922,
// "A scale of grade and class terms for clastic sediments",
// J. of Geology 30(5)).
//
// D50 retenu par classe : valeur mediane representative,
// utilisee comme entree pour les briques physiques (Soulsby 1997,
// "Dynamics of Marine Sands", Thomas Telford).
//
// Seuil cohesif/non-cohesif : 63 microns (Soulsby 1997, ch. 6).
// En dessous, Stokes simple ne s'applique plus, on bascule sur
// le regime cohesif (vitesse de chute par flocs, Whitehouse et
// al. 2000 "Dynamics of estuarine muds").
//
// La classe 5 (Rock & boulders) sort du champ d'application
// du modele sedimentaire : pas de mise en suspension locale
// possible, regime specifique a traiter en aval.
// ============================================================
var FOLK5_TABLE = {
  // Classe 1 : Mud to sandy mud (vase a vase sableuse)
  // Plage Wentworth : <63 microns (silt+clay) majoritaire
  'mud': {
    folk5: 1,
    name: 'Mud to sandy mud',
    nameFr: 'Vase',
    D50_mm: 0.030,        // 30 microns - silt moyen, valeur typique cote francaise
    D50_m: 0.000030,
    regime: 'cohesive',   // Stokes inapplicable, cohesion van der Waals dominante
    canSuspend: true
  },
  // Classe 2 : Sand (sable propre, fin a grossier)
  // Plage Wentworth : 63 microns - 2 mm
  'sand': {
    folk5: 2,
    name: 'Sand',
    nameFr: 'Sable',
    D50_mm: 0.250,        // 250 microns - sable medium (Wentworth)
    D50_m: 0.000250,
    regime: 'non-cohesive',
    canSuspend: true
  },
  // Classe 3 : Coarse sediment (sable grossier, graviers)
  // Plage Wentworth : 0.5 - 2 mm + au-dela
  'coarse': {
    folk5: 3,
    name: 'Coarse sediment',
    nameFr: 'Sediment grossier',
    D50_mm: 1.000,        // 1 mm - sable tres grossier / granule
    D50_m: 0.001000,
    regime: 'non-cohesive',
    canSuspend: true
  },
  // Classe 4 : Mixed sediment (melange sable/vase/gravier)
  // Plage variable - on prend une valeur intermediaire
  'mixed': {
    folk5: 4,
    name: 'Mixed sediment',
    nameFr: 'Sediment mixte',
    D50_mm: 0.200,        // 200 microns - sable fin (compromis)
    D50_m: 0.000200,
    regime: 'non-cohesive',
    canSuspend: true
  },
  // Classe 5 : Rock & boulders (roche, blocs)
  // Pas de sediment mobilisable
  'rock': {
    folk5: 5,
    name: 'Rock & boulders',
    nameFr: 'Roche',
    D50_mm: null,
    D50_m: null,
    regime: 'rock',       // hors champ modele sedimentaire
    canSuspend: false
  }
};

// Mappe une classification Folk 5 textuelle (telle que retournee
// par EMODnet/SHOM via le proxy GAS) vers la structure FOLK5_TABLE.
// Argument primaire : folk5_txt (ex: "3. Coarse-grained sediment").
// Argument secondaire : original_txt (ex: "Graviers sableux") sert
// de fallback ou de raffinage (Mediterranee notamment).
//
// Retourne une copie de l'entree FOLK5_TABLE enrichie de :
//   - sourceText : texte original retenu pour la classification
//   - folk16 : si dispo dans la couche EMODnet (souvent absent en France)
function mapFolkToSediment(folk5_txt, original_txt, folk16_txt) {
  var f5 = (folk5_txt || '').toLowerCase();
  var orig = (original_txt || '').toLowerCase();
  var entry = null;

  // ============================================================
  // PATCH 8-A : Pré-passe enrichissement sur original_substrate
  // ------------------------------------------------------------
  // Distingue sable fin / moyen / grossier / vaseux / graviers
  // à partir des libellés français SHOM, avec D50 sourcés
  // Wentworth 1922 (échelle granulométrique standard).
  //
  // Rétrocompatibilité totale : si original_substrate est ambigu
  // (libellés composites SHOM avec pourcentages, anglais EMODnet,
  // ou absent), on tombe sur le mapping Folk5 actuel ci-dessous.
  //
  // Justification scientifique : w_s ∝ D50² (Stokes/Soulsby 1997
  // eq.102), donc le passage de D50=0.250 (sable medium standard)
  // à D50=0.125 (sable fin) change w_s d'un facteur 4, ce qui
  // change tau_dep (Brique 9) d'un facteur 4 et la mémoire
  // temporelle de décantation devient significative.
  //
  // Source D50 : Wentworth 1922, "A scale of grade and class
  // terms for clastic sediments", J. of Geology 30(5).
  // ============================================================
  
  // Exclusion : libellés composites SHOM (contiennent / ou %)
  var isComposite = orig.indexOf('/') !== -1 || orig.indexOf('%') !== -1;
  
  if (!isComposite && orig) {
    var richD50 = null;
    var richName = null;
    var richNameFr = null;
    var richFolk5 = null;
    var richRegime = 'non-cohesive';
    
    // Sable vaseux / vase sableuse : régime de transition
    if (/vase\s*sableuse|sables?\s*vaseux|vases?\s*sableuses?|muddy\s*sand/.test(orig)) {
      richD50 = 0.100;
      richName = 'Muddy sand (very fine)';
      richNameFr = 'Sable vaseux';
      richFolk5 = 4; // Mixed sediment
      richRegime = 'non-cohesive'; // limite, mais traitable par Stokes/Soulsby
    }
    // Cailloutis / galets / graviers purs (pas de sable mentionné)
    else if (/cailloutis|galets|^graviers?$|^graviers?\s|^gravels?$/.test(orig)
             && !/sable|sand/.test(orig)) {
      richD50 = 8.000;
      richName = 'Pebbles / cobbles';
      richNameFr = 'Cailloutis';
      richFolk5 = 3; // Coarse sediment
    }
    // Gravier sableux / sable graviers / sandy gravel / gravelly sand
    else if (/sables?\s*graviers?|graviers?\s*sableux?|sandy\s*gravel|gravelly\s*sand|sable\s*graveleux/.test(orig)) {
      richD50 = 2.000;
      richName = 'Sandy gravel';
      richNameFr = 'Sable graveleux';
      richFolk5 = 3;
    }
    // Sable grossier (avant sable medium pour éviter faux match sur "sable")
    else if (/sables?\s*(tres\s*)?gros(sier|s)|coarse\s*sand/.test(orig)) {
      richD50 = 0.600;
      richName = 'Coarse sand';
      richNameFr = 'Sable grossier';
      richFolk5 = 2;
    }
    // Sable fin / très fin / sablon
    else if (/sables?\s*(tres\s*)?fins?|sablons?|fine\s*sand|very\s*fine\s*sand/.test(orig)) {
      richD50 = 0.125;
      richName = 'Fine sand';
      richNameFr = 'Sable fin';
      richFolk5 = 2;
    }
    // Sable moyen
    else if (/sables?\s*moyens?|medium\s*sand/.test(orig)) {
      richD50 = 0.300;
      richName = 'Medium sand';
      richNameFr = 'Sable moyen';
      richFolk5 = 2;
    }
    
    if (richD50 !== null) {
      return {
        folk5: richFolk5,
        name: richName,
        nameFr: richNameFr,
        D50_mm: richD50,
        D50_m: richD50 / 1000,
        regime: richRegime,
        canSuspend: true,
        sourceText: original_txt || folk5_txt || null,
        folk5_raw: folk5_txt || null,
        folk16_raw: folk16_txt || null,
        enriched: true  // marqueur pour debug/log
      };
    }
  }
  
  // ============================================================
  // Fin pré-passe enrichissement. Si pas de match, fallback
  // sur le mapping Folk5 standard ci-dessous (comportement
  // historique préservé).
  // ============================================================

  // Priorite : numero de classe Folk 5 explicite
  if (/^\s*1\.|mud to sandy mud|^mud\b/.test(f5)) entry = FOLK5_TABLE.mud;
  else if (/^\s*2\.|^sand\b/.test(f5)) entry = FOLK5_TABLE.sand;
  else if (/^\s*3\.|coarse/.test(f5)) entry = FOLK5_TABLE.coarse;
  else if (/^\s*4\.|mixed/.test(f5)) entry = FOLK5_TABLE.mixed;
  else if (/^\s*5\.|rock|boulder/.test(f5)) entry = FOLK5_TABLE.rock;

  // Fallback : analyse du texte original SHOM si Folk 5 ambigu/absent
  if (!entry) {
    if (/roche|rocher|rock/.test(orig)) entry = FOLK5_TABLE.rock;
    else if (/vase|mud|silt/.test(orig)) entry = FOLK5_TABLE.mud;
    else if (/gravier|caillou|galet|coarse/.test(orig)) entry = FOLK5_TABLE.coarse;
    else if (/sable|sand/.test(orig)) entry = FOLK5_TABLE.sand;
  }

  if (!entry) return null;

  // Copie pour ne pas muter la table de reference
  return {
    folk5: entry.folk5,
    name: entry.name,
    nameFr: entry.nameFr,
    D50_mm: entry.D50_mm,
    D50_m: entry.D50_m,
    regime: entry.regime,
    canSuspend: entry.canSuspend,
    sourceText: original_txt || folk5_txt || null,
    folk5_raw: folk5_txt || null,
    folk16_raw: folk16_txt || null
  };
}
// ============================================================
// fetchSedimentType - point d'entree unique pour le sediment
// ------------------------------------------------------------
// Appelle le proxy GAS qui interroge la couche SHOM/EMODnet
// (action=sediment). Retourne une Promise<SedimentInfo|null>.
//
// Effets de bord :
//   - Stocke le resultat dans S._spotSediment (consomme par
//     les briques physiques en aval)
//   - Met a jour le DOM (#sedimentType, #sedSwatchColor) -
//     comportement legacy preserve pour compatibilite UI
//
// Resilience : si EMODnet hors couverture ou erreur reseau,
// retourne null et S._spotSediment = null. Les consommateurs
// doivent gerer le cas null explicitement.
// ============================================================
function fetchSedimentType(lat, lon) {
  // Acces DOM defensif : les elements legacy peuvent ne pas exister
  // dans toutes les vues (drawer mobile V4, refonte UI). On verifie
  // a chaque acces pour ne jamais crasher la chaine de promises.
  var typeEl = document.getElementById('sedimentType');
  var swatchEl = document.getElementById('sedSwatchColor');
  if (typeEl) typeEl.textContent = '...';
  if (swatchEl) swatchEl.style.background = '#E2E8F0';

  return gasGet('sediment', { lat: lat, lon: lon }).then(function(data) {
    if (!data || !data.text) {
      fallbackSediment();
      S._spotSediment = null;
      return null;
    }
    try {
      var json = JSON.parse(data.text);
      if (!json.features || json.features.length === 0) {
        if (typeEl) typeEl.textContent = 'Hors couverture';
        S._spotSediment = null;
        return null;
      }
      var props = json.features[0].properties;
      var raw = props.original_substrate || props.folk_5cl_txt || '?';
      var lower = raw.toLowerCase();

      // Couleur swatch (comportement legacy preserve, defensif)
      var color = '#CBD5E0';
      if (lower.indexOf('gravier') !== -1 || lower.indexOf('caillou') !== -1) color = '#CC2200';
      else if (lower.indexOf('sable gros') !== -1) color = '#E86030';
      else if (lower.indexOf('sable fin') !== -1) color = '#F5E8A0';
      else if (lower.indexOf('sable') !== -1) color = '#F0C060';
      else if (lower.indexOf('vase') !== -1) color = '#8B6A40';
      else if (lower.indexOf('roche') !== -1) color = '#909090';
      if (typeEl) typeEl.textContent = raw.slice(0, 60);
      if (swatchEl) swatchEl.style.background = color;

      // Classification scientifique pour les briques physiques
      var sediment = mapFolkToSediment(props.folk_5cl_txt, props.original_substrate, props.folk_16cl_txt);
      S._spotSediment = sediment;
      return sediment;
    } catch (e) {
      fallbackSediment();
      S._spotSediment = null;
      return null;
    }
  }).catch(function() {
    fallbackSediment();
    S._spotSediment = null;
    return null;
  });
}

function fallbackSediment() {
  // Acces DOM defensif - cf fetchSedimentType
  var typeEl = document.getElementById('sedimentType');
  var swatchEl = document.getElementById('sedSwatchColor');
  if (typeEl) typeEl.textContent = 'Non disponible';
  if (swatchEl) swatchEl.style.background = '#E2E8F0';
}

function loadDrawerTides(lat, lon) {
  var near = findApiMareeSiteNear(lat, lon);
  if (!near) {
    TIDES.siteId = null;
    TIDES.data = null;
    TIDES.extremes = null;
    renderPmBmDuJour();
    if (S_spotWeatherCache) renderSpotPopup();
    return;
  }

  TIDES.siteId = near.siteId;
  TIDES.siteName = near.name;
  TIDES.lat = lat;
  TIDES.lon = lon;

  var today = new Date();
  TIDES.selectedDate = today.toISOString().split('T')[0];
  TIDES.from = TIDES.selectedDate;

  fetchTidesRange();
}

function renderTidesShell() {
  var container = document.getElementById('drawerTides');
  container.innerHTML =
    '<div class="tides-label">Marees</div>' +
    '<div class="tides-port-name">' + TIDES.siteName + '</div>' +
    '<div id="tideDaySummary" style="margin:0 0 12px;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;">' +
      '<div style="padding:10px;text-align:center;color:var(--text-3);font-family:IBM Plex Mono,monospace;font-size:11px;">Chargement...</div>' +
    '</div>' +
    '<div id="tideCurve" style="margin-bottom:10px;"></div>' +
    '<div id="tideWindows"></div>';

}

function fetchTidesRange() {
  var sel = new Date(TIDES.selectedDate + 'T00:00:00Z');
  var start = new Date(sel);
  start.setDate(start.getDate() - 2);
  var fromStr = start.toISOString().split('T')[0];
  TIDES.from = fromStr;
  TIDES.days = 14;

  var url = GAS_URL + '?action=tides_range&site=' + TIDES.siteId + '&from=' + fromStr + '&days=' + TIDES.days;

  fetch(url).then(function(r){ return r.json(); }).then(function(data) {
    if (!data.data || data.error) {
      console.error('[VIZI] Erreur marées :', data.error || 'pas de données');
      return;
    }
    TIDES.data = data.data;
    TIDES.extremes = data.extremes || [];
    renderPmBmDuJour();
    if (S_spotWeatherCache) renderSpotPopup();
  }).catch(function(err) {
    console.error('[VIZI] Erreur réseau marées :', err);
  });
}
function onTideDateChange(newDate) {
  TIDES.selectedDate = newDate;
  if (!isDateInLoadedRange(newDate)) {
    fetchTidesRange();
  } else {
    renderTidesForSelectedDate();
  }
}

function isDateInLoadedRange(dateStr) {
  if (!TIDES.from || !TIDES.data) return false;
  var selected = new Date(dateStr + 'T12:00:00Z');
  var from = new Date(TIDES.from + 'T00:00:00Z');
  var to = new Date(from);
  to.setDate(to.getDate() + TIDES.days);
  return selected >= from && selected < to;
}

function shiftTideDate(daysFromToday) {
  var d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  var newDate = d.toISOString().split('T')[0];
  TIDES.selectedDate = newDate;
  document.getElementById('tideDatePicker').value = newDate;
  if (!isDateInLoadedRange(newDate)) {
    fetchTidesRange();
  } else {
    renderTidesForSelectedDate();
  }
}

function shiftTideDateBy(delta) {
  var d = new Date(TIDES.selectedDate + 'T12:00:00Z');
  d.setDate(d.getDate() + delta);
  var newDate = d.toISOString().split('T')[0];
  TIDES.selectedDate = newDate;
  document.getElementById('tideDatePicker').value = newDate;
  if (!isDateInLoadedRange(newDate)) {
    fetchTidesRange();
  } else {
    renderTidesForSelectedDate();
  }
}

function renderTidesForSelectedDate() {
  if (!TIDES.data || !TIDES.extremes) return;

  var dayPoints = TIDES.data.filter(function(p) {
    return p.time.slice(0, 10) === TIDES.selectedDate;
  });

  if (dayPoints.length === 0) {
    document.getElementById('tideCurve').innerHTML =
      '<div style="padding:14px;color:var(--text-3);font-family:IBM Plex Mono,monospace;font-size:11px;">Aucune donnee pour cette date</div>';
    return;
  }

  var dayExtremes = TIDES.extremes.filter(function(e) {
    return e.time.slice(0, 10) === TIDES.selectedDate;
  });

  var heights = dayPoints.map(function(p){ return p.height; });
  var marnage = Math.max.apply(null, heights) - Math.min.apply(null, heights);
  var info = marnageToTideLabel(marnage);

  document.getElementById('tideDaySummary').innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
    '<div>' +
      '<div style="font-family:Inter,sans-serif;font-size:17px;font-weight:700;color:' + info.color + ';">' + info.label + '</div>' +
      '<div style="font-family:IBM Plex Mono,monospace;font-size:11px;color:var(--text-3);margin-top:3px;">' + info.desc + '</div>' +
    '</div>' +
    '<div style="text-align:right;">' +
      '<div style="font-family:IBM Plex Mono,monospace;font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.08em;">Marnage</div>' +
      '<div style="font-family:IBM Plex Mono,monospace;font-size:22px;font-weight:700;color:var(--accent);line-height:1;margin-top:2px;">' + marnage.toFixed(1) + 'm</div>' +
    '</div></div>';

  renderTideCurveWithWindows(dayPoints, dayExtremes);
  renderChassableWindows(dayExtremes);
}

function renderTideCurveWithWindows(points, extremes) {
  if (points.length === 0) return;
  var w = 320, h = 160, pad = 20;

  var heights = points.map(function(p){ return p.height; });
  var minH = Math.min.apply(null, heights);
  var maxH = Math.max.apply(null, heights);
  var rangeH = Math.max(maxH - minH, 0.1);

  function xOf(time) {
    var d = new Date(time);
    return pad + ((d.getHours() * 60 + d.getMinutes()) / 1440) * (w - pad * 2);
  }
  function yOf(height) {
    return pad + (1 - (height - minH) / rangeH) * (h - pad * 2);
  }
// Zones de nuit : rectangles gris de 0h au lever et du coucher a 24h
  var nightBands = '';
  if (S._sunriseTime && S._sunsetTime) {
    var sunriseMin = parseInt(S._sunriseTime.slice(0,2)) * 60 + parseInt(S._sunriseTime.slice(3,5));
    var sunsetMin = parseInt(S._sunsetTime.slice(0,2)) * 60 + parseInt(S._sunsetTime.slice(3,5));
    var xSunrise = pad + (sunriseMin / 1440) * (w - pad * 2);
    var xSunset = pad + (sunsetMin / 1440) * (w - pad * 2);
    nightBands += '<rect x="' + pad + '" y="' + pad + '" width="' + (xSunrise - pad).toFixed(1) + '" height="' + (h - pad * 2) + '" fill="#1A2535" opacity="0.30"/>';
    nightBands += '<rect x="' + xSunset.toFixed(1) + '" y="' + pad + '" width="' + (w - pad - xSunset).toFixed(1) + '" height="' + (h - pad * 2) + '" fill="#1A2535" opacity="0.30"/>';
  }
  var chassableBands = extremes.map(function(e) {
    var t = new Date(e.time);
    var startMin = t.getHours() * 60 + t.getMinutes() - CHASSABLE_WINDOW_MINUTES;
    var endMin = t.getHours() * 60 + t.getMinutes() + CHASSABLE_WINDOW_MINUTES;
    startMin = Math.max(0, startMin);
    endMin = Math.min(1440, endMin);
    var x1 = pad + (startMin / 1440) * (w - pad * 2);
    var x2 = pad + (endMin / 1440) * (w - pad * 2);
    return '<rect x="' + x1.toFixed(1) + '" y="' + pad + '" width="' + (x2 - x1).toFixed(1) + '" height="' + (h - pad * 2) + '" fill="#A8E63D" opacity="0.18"/>';
  }).join('');

  var etaleBands = extremes.map(function(e) {
    var cx = xOf(e.time);
    var w30 = (30 / 1440) * (w - pad * 2);
    return '<rect x="' + (cx - w30).toFixed(1) + '" y="' + pad + '" width="' + (w30 * 2).toFixed(1) + '" height="' + (h - pad * 2) + '" fill="#A8E63D" opacity="0.3"/>';
  }).join('');

  var path = '';
  points.forEach(function(p, i) {
    path += (i === 0 ? 'M' : 'L') + xOf(p.time).toFixed(1) + ',' + yOf(p.height).toFixed(1) + ' ';
  });
  var lastX = xOf(points[points.length-1].time).toFixed(1);
  var firstX = xOf(points[0].time).toFixed(1);

  var now = new Date();
  var isToday = TIDES.selectedDate === now.toISOString().split('T')[0];
  var nowLine = '';
  if (isToday) {
    var nowX = pad + ((now.getHours() * 60 + now.getMinutes()) / 1440) * (w - pad * 2);
    nowLine =
      '<line x1="' + nowX.toFixed(1) + '" y1="' + pad + '" x2="' + nowX.toFixed(1) + '" y2="' + (h - pad) + '" stroke="#DC2626" stroke-width="2" stroke-dasharray="3,3"/>' +
      '<circle cx="' + nowX.toFixed(1) + '" cy="' + pad + '" r="4" fill="#DC2626"/>';
  }

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

  var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;max-width:100%;">' +
    nightBands +
    chassableBands +
    etaleBands +
    '<path d="' + path + 'L' + lastX + ',' + (h - pad) + ' L' + firstX + ',' + (h - pad) + ' Z" fill="#0BA888" opacity="0.1"/>' +
    '<path d="' + path + '" stroke="#0BA888" stroke-width="2" fill="none"/>' +
    nowLine +
    markers +
    hourLabels +
    '</svg>';

  document.getElementById('tideCurve').innerHTML = svg +
    '<div style="font-family:IBM Plex Mono,monospace;font-size:10px;color:var(--text-3);text-align:center;margin-top:4px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">' +
      '<span><span style="display:inline-block;width:10px;height:6px;background:#A8E63D;opacity:0.5;vertical-align:middle;margin-right:3px;"></span>chassable (+/-2h)</span>' +
      '<span style="color:#0BA888">&#9679; PM</span>' +
      '<span style="color:#D97706">&#9679; BM</span>' +
      (isToday ? '<span style="color:#DC2626">&#9679; maintenant</span>' : '') +
    '</div>';
}

function renderChassableWindows(extremes) {
  var container = document.getElementById('tideWindows');
  if (!container) return;
  if (!extremes || extremes.length === 0) {
    container.innerHTML = '';
    return;
  }

  var now = new Date();
  var isToday = TIDES.selectedDate === now.toISOString().split('T')[0];

  var windows = extremes.map(function(e) {
    var etaleTime = new Date(e.time);
    var startTime = new Date(etaleTime.getTime() - CHASSABLE_WINDOW_MINUTES * 60000);
    var endTime = new Date(etaleTime.getTime() + CHASSABLE_WINDOW_MINUTES * 60000);
    var isPast = isToday && endTime < now;
    var isCurrent = isToday && now >= startTime && now <= endTime;
    return {
      etaleTime: etaleTime,
      startTime: startTime,
      endTime: endTime,
      type: e.type,
      height: e.height,
      marnage: e.marnage || 0,
      isPast: isPast,
      isCurrent: isCurrent
    };
  });

  var html = '<div style="font-family:IBM Plex Mono,monospace;font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Creneaux chassables</div>';
  html += '<div style="display:flex;flex-direction:column;gap:6px;">';

  windows.forEach(function(w) {
    var typeLabel = w.type === 'high' ? 'Pleine mer' : 'Basse mer';
    var typeColor = w.type === 'high' ? '#0BA888' : '#D97706';
    var startStr = w.startTime.toLocaleTimeString('fr', { hour:'2-digit', minute:'2-digit' });
    var endStr = w.endTime.toLocaleTimeString('fr', { hour:'2-digit', minute:'2-digit' });
    var etaleStr = w.etaleTime.toLocaleTimeString('fr', { hour:'2-digit', minute:'2-digit' });

    var opacity = w.isPast ? '0.4' : '1';
    var border = w.isCurrent ? '2px solid #A8E63D' : '1px solid var(--border)';
    var bg = w.isCurrent ? 'rgba(168,230,61,0.1)' : 'var(--surface)';
    var badge = w.isCurrent ? '<span style="font-family:IBM Plex Mono,monospace;font-size:9px;background:#A8E63D;color:#1A2535;padding:2px 6px;border-radius:4px;font-weight:700;margin-left:6px;">EN COURS</span>' : '';

    html += '<div style="padding:10px 12px;background:' + bg + ';border:' + border + ';border-radius:8px;opacity:' + opacity + ';">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
        '<div>' +
          '<span style="font-family:Inter,sans-serif;font-size:14px;font-weight:700;color:' + typeColor + ';">' + typeLabel + '</span>' +
          badge +
        '</div>' +
        '<span style="font-family:IBM Plex Mono,monospace;font-size:11px;color:var(--text-3);">etale ' + etaleStr + '</span>' +
      '</div>' +
      '<div style="font-family:IBM Plex Mono,monospace;font-size:13px;font-weight:600;color:var(--text);margin-top:4px;">' +
        startStr + ' &rarr; ' + endStr +
        (w.marnage ? ' <span style="color:var(--text-3);font-weight:400;margin-left:6px;">marnage ' + w.marnage.toFixed(1) + 'm</span>' : '') +
      '</div>' +
    '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}


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
var LAND_MESSAGES = [
  "Hey, on chasse pas sur la terre !",
  "Pas de bar sur le bitume...",
  "T'as oublie ta combi ?",
  "C'est sec par ici, vise plus a gauche.",
  "Les daurades preferent l'eau, en general.",
  "Clique sur la mer, pas sur les vaches.",
  "Ton fusil rouille deja a sec...",
  "Meme avec une grande maree, ca le fera pas.",
  "Range ton bi et clique sur l'eau bleue.",
  "Pas de visi sur le sable.",
  "T'as pris ton tuba pour rien la.",
  "Le poisson est dans l'autre sens.",
  "Faut chercher le bleu, pas le marron.",
  "Visi nulle ici : c'est de la terre.",
  "Le bar habite dans la mer, pas dans la baie.",
  "On dirait un coin a champignons plus qu'a poissons.",
  "Spot sec, declinaison echec.",
  "Apnee impossible sans eau.",
  "Tu vas casser ta lame sur les cailloux.",
  "Reessaie, mais cette fois en mer."
];

var _landToastTimer = null;
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
  document.getElementById('obsSheetTime').value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  document.getElementById('obsSheetCoords').textContent = latlng.lat.toFixed(4) + 'N · ' + Math.abs(latlng.lng).toFixed(4) + (latlng.lng < 0 ? 'O' : 'E');
  document.getElementById('obsSheetVisSlider').value = 4;
  updateObsSheetVis(4);
  setObsFond(true);
  document.getElementById('obsSheetNote').value = '';
  document.getElementById('obsNoteCount').textContent = '0';
// Pseudo activé par défaut, anonyme désactivé (encourage la signature)
  var anonBtn = document.getElementById('obsAnonToggle');
  var pseudoInput = document.getElementById('obsSheetPseudo');
  if (anonBtn.classList.contains('on')) {
    anonBtn.classList.remove('on');
  }
  pseudoInput.disabled = false;
  // Restaure le pseudo précédent si stocké
  try {
    var savedPseudo = localStorage.getItem('vizi_pseudo');
    pseudoInput.value = savedPseudo || '';
  } catch(e) { pseudoInput.value = ''; }
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

// Échelle visi 5 paliers (aligné drawer spot)
var OBS_VIS_LEVELS = [
  { v: 1,  label: 'Nulle',      color: '#C94A3D' },
  { v: 2,  label: 'Faible',     color: '#E89B3C' },
  { v: 4,  label: 'Moyenne',    color: '#D8C84A' },
  { v: 6,  label: 'Bonne',      color: '#2DA888' },
  { v: 10, label: 'Excellente', color: '#4DD4A8' }
];

function updateObsSheetVis(idx) {
  idx = parseInt(idx);
  var v = OBS_VIS_LEVELS[idx];
  var el = document.getElementById('obsSheetVisVal');
  el.textContent = v.label;
  el.style.color = v.color;
}

function updateNoteCounter() {
  var note = document.getElementById('obsSheetNote');
  var counter = document.getElementById('obsNoteCount');
  if (note && counter) counter.textContent = note.value.length;
}

function toggleObsAnon() {
  var btn = document.getElementById('obsAnonToggle');
  var input = document.getElementById('obsSheetPseudo');
  var isAnon = btn.classList.contains('on');
  if (isAnon) {
    btn.classList.remove('on');
    btn.innerHTML = btn.innerHTML.replace('Anonyme', 'Signer');
    input.disabled = false;
    input.focus();
  } else {
    btn.classList.add('on');
    btn.innerHTML = btn.innerHTML.replace('Signer', 'Anonyme');
    input.disabled = true;
    input.value = '';
  }
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
  var visLevel = OBS_VIS_LEVELS[idx];
  var note = document.getElementById('obsSheetNote').value.trim();
  var anonBtn = document.getElementById('obsAnonToggle');
  var pseudo = anonBtn.classList.contains('on') ? '' : document.getElementById('obsSheetPseudo').value.trim();
// Mémorise le pseudo pour les prochaines obs
if (pseudo) {
  try { localStorage.setItem('vizi_pseudo', pseudo); } catch(e) {}
}
  gasGet('submit_observation', {
    lat: latlng.lat, lon: latlng.lng,
    date: document.getElementById('obsSheetDate').value,
    time: document.getElementById('obsSheetTime').value,
    visibility_m: visLevel.v,
    visibility_label: visLevel.label,
    bottom_visible: OBS_FOND,
    comment: note,
    pseudo: pseudo || 'Anonyme'
  }).then(function(result) {
    OBS_SUBMITTING = false;
    if (result && result.success) {
      btn.style.display = 'none';
      document.getElementById('obsSheetSuccessMsg').textContent = 'Merci !';
      document.getElementById('obsSheetSuccessSub').textContent = 'Ton observation aide la communauté.';
      document.getElementById('obsSheetSuccess').style.display = 'block';
      setTimeout(closeObsSheet, 2200);
    } else {
      btn.disabled = false;
      btn.textContent = 'Partager à la communauté';
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

// ============================================================
// VISIMER - Page Marees plein ecran (V2 : jour unique + coef)
// Overlay avec mini carte ports + jour selectionne en detail
// ============================================================


function computeCoefBrest(dateObj) {
  // Vitesses angulaires (degres par heure) des composantes harmoniques
  var M2_speed = 28.9841042;  // lunaire semi-diurne
  var S2_speed = 30.0;         // solaire semi-diurne

  // Phases de reference a 00:00 UTC le 1er janvier 2000
  // Ajustees pour caler le resultat sur les valeurs SHOM publiees
  var M2_phase0 = 135.0;
  var S2_phase0 = 0.0;

  // Ecart en heures depuis epoch 2000-01-01 00:00 UTC
  var epoch = Date.UTC(2000, 0, 1, 0, 0, 0);
  var hoursSinceEpoch = (dateObj.getTime() - epoch) / 3600000;

  // Phases instantanees des deux composantes
  var phaseM2 = (M2_phase0 + M2_speed * hoursSinceEpoch) % 360;
  var phaseS2 = (S2_phase0 + S2_speed * hoursSinceEpoch) % 360;

  // Difference de phase : determine si on est en vive-eau (phases alignees)
  // ou morte-eau (phases opposees). Cycle de 14.77 jours.
  var phaseDiff = (phaseM2 - phaseS2) * Math.PI / 180;

  // Amplitude de la composition : |A1 + A2 cos(dPhi)|
  // Normalisee pour que le coef tombe entre 20 et 120
  var M2_amp = 2.036;
  var S2_amp = 0.740;
  var amplitude = Math.sqrt(
    M2_amp * M2_amp + S2_amp * S2_amp + 2 * M2_amp * S2_amp * Math.cos(phaseDiff)
  );

  // Calibrage : amplitude min (~M2-S2=1.296) -> coef 20
  //             amplitude max (~M2+S2=2.776) -> coef 120
  var ampMin = M2_amp - S2_amp;
  var ampMax = M2_amp + S2_amp;
  var coef = 20 + (amplitude - ampMin) / (ampMax - ampMin) * 100;

  return Math.max(20, Math.min(120, Math.round(coef)));
}

// Table des coefficients SHOM officiels pour Brest (avril a decembre 2026)
// Source : MeteoConsult / SHOM (sous licence officielle)
// Le coefficient SHOM est UNIQUE pour toute la facade Manche/Atlantique
// (calcule pour Brest, applicable de Dunkerque a Saint-Jean-de-Luz)
// Pour la Mediterranee : pas de coef applicable (marnage trop faible)
// Mise a jour annuelle requise (refaire le scrape pour 2027 fin 2026)
var BREST_COEFS_2026 = {
  "2026-04-01": 90, "2026-04-02": 93, "2026-04-03": 92, "2026-04-04": 87, "2026-04-05": 80,
  "2026-04-06": 70, "2026-04-07": 59, "2026-04-08": 46, "2026-04-09": 34, "2026-04-10": 26,
  "2026-04-11": 26, "2026-04-12": 32, "2026-04-13": 46, "2026-04-14": 62, "2026-04-15": 77,
  "2026-04-16": 90, "2026-04-17": 99, "2026-04-18": 104, "2026-04-19": 103, "2026-04-20": 96,
  "2026-04-21": 84, "2026-04-22": 69, "2026-04-23": 54, "2026-04-24": 45, "2026-04-25": 44,
  "2026-04-26": 49, "2026-04-27": 58, "2026-04-28": 68, "2026-04-29": 75, "2026-04-30": 80,
  "2026-05-01": 82, "2026-05-02": 82, "2026-05-03": 79, "2026-05-04": 75, "2026-05-05": 68,
  "2026-05-06": 60, "2026-05-07": 51, "2026-05-08": 42, "2026-05-09": 36, "2026-05-10": 36,
  "2026-05-11": 38, "2026-05-12": 48, "2026-05-13": 61, "2026-05-14": 74, "2026-05-15": 86,
  "2026-05-16": 94, "2026-05-17": 99, "2026-05-18": 98, "2026-05-19": 93, "2026-05-20": 84,
  "2026-05-21": 73, "2026-05-22": 62, "2026-05-23": 54, "2026-05-24": 51, "2026-05-25": 51,
  "2026-05-26": 54, "2026-05-27": 59, "2026-05-28": 64, "2026-05-29": 68, "2026-05-30": 70,
  "2026-05-31": 71,
  "2026-06-01": 71, "2026-06-02": 69, "2026-06-03": 67, "2026-06-04": 63, "2026-06-05": 58,
  "2026-06-06": 53, "2026-06-07": 49, "2026-06-08": 47, "2026-06-09": 47, "2026-06-10": 50,
  "2026-06-11": 57, "2026-06-12": 66, "2026-06-13": 76, "2026-06-14": 85, "2026-06-15": 91,
  "2026-06-16": 94, "2026-06-17": 93, "2026-06-18": 88, "2026-06-19": 81, "2026-06-20": 71,
  "2026-06-21": 61, "2026-06-22": 55, "2026-06-23": 49, "2026-06-24": 46, "2026-06-25": 46,
  "2026-06-26": 50, "2026-06-27": 55, "2026-06-28": 60, "2026-06-29": 64, "2026-06-30": 68,
  "2026-07-01": 70, "2026-07-02": 71, "2026-07-03": 72, "2026-07-04": 70, "2026-07-05": 67,
  "2026-07-06": 62, "2026-07-07": 57, "2026-07-08": 52, "2026-07-09": 52, "2026-07-10": 52,
  "2026-07-11": 58, "2026-07-12": 67, "2026-07-13": 78, "2026-07-14": 88, "2026-07-15": 95,
  "2026-07-16": 98, "2026-07-17": 95, "2026-07-18": 88, "2026-07-19": 78, "2026-07-20": 66,
  "2026-07-21": 53, "2026-07-22": 45, "2026-07-23": 38, "2026-07-24": 35, "2026-07-25": 38,
  "2026-07-26": 46, "2026-07-27": 55, "2026-07-28": 63, "2026-07-29": 70, "2026-07-30": 76,
  "2026-07-31": 81,
  "2026-08-01": 83, "2026-08-02": 82, "2026-08-03": 78, "2026-08-04": 72, "2026-08-05": 63,
  "2026-08-06": 54, "2026-08-07": 47, "2026-08-08": 46, "2026-08-09": 50, "2026-08-10": 62,
  "2026-08-11": 77, "2026-08-12": 90, "2026-08-13": 98, "2026-08-14": 102, "2026-08-15": 99,
  "2026-08-16": 92, "2026-08-17": 81, "2026-08-18": 67, "2026-08-19": 53, "2026-08-20": 39,
  "2026-08-21": 30, "2026-08-22": 26, "2026-08-23": 30, "2026-08-24": 41, "2026-08-25": 54,
  "2026-08-26": 65, "2026-08-27": 76, "2026-08-28": 84, "2026-08-29": 90, "2026-08-30": 93,
  "2026-08-31": 92,
  "2026-09-01": 87, "2026-09-02": 78, "2026-09-03": 66, "2026-09-04": 52, "2026-09-05": 42,
  "2026-09-06": 41, "2026-09-07": 49, "2026-09-08": 64, "2026-09-09": 80, "2026-09-10": 93,
  "2026-09-11": 100, "2026-09-12": 102, "2026-09-13": 99, "2026-09-14": 91, "2026-09-15": 80,
  "2026-09-16": 67, "2026-09-17": 53, "2026-09-18": 38, "2026-09-19": 26, "2026-09-20": 22,
  "2026-09-21": 27, "2026-09-22": 39, "2026-09-23": 54, "2026-09-24": 68, "2026-09-25": 80,
  "2026-09-26": 90, "2026-09-27": 96, "2026-09-28": 99, "2026-09-29": 97, "2026-09-30": 90,
  "2026-10-01": 78, "2026-10-02": 64, "2026-10-03": 50, "2026-10-04": 41, "2026-10-05": 42,
  "2026-10-06": 52, "2026-10-07": 66, "2026-10-08": 80, "2026-10-09": 89, "2026-10-10": 95,
  "2026-10-11": 95, "2026-10-12": 92, "2026-10-13": 86, "2026-10-14": 77, "2026-10-15": 65,
  "2026-10-16": 53, "2026-10-17": 40, "2026-10-18": 30, "2026-10-19": 25, "2026-10-20": 28,
  "2026-10-21": 37, "2026-10-22": 52, "2026-10-23": 66, "2026-10-24": 79, "2026-10-25": 90,
  "2026-10-26": 96, "2026-10-27": 100, "2026-10-28": 97, "2026-10-29": 90, "2026-10-30": 79,
  "2026-10-31": 66,
  "2026-11-01": 53, "2026-11-02": 47, "2026-11-03": 50, "2026-11-04": 54, "2026-11-05": 63,
  "2026-11-06": 73, "2026-11-07": 79, "2026-11-08": 83, "2026-11-09": 84, "2026-11-10": 82,
  "2026-11-11": 78, "2026-11-12": 72, "2026-11-13": 65, "2026-11-14": 56, "2026-11-15": 47,
  "2026-11-16": 39, "2026-11-17": 34, "2026-11-18": 36, "2026-11-19": 41, "2026-11-20": 48,
  "2026-11-21": 60, "2026-11-22": 73, "2026-11-23": 83, "2026-11-24": 91, "2026-11-25": 96,
  "2026-11-26": 96, "2026-11-27": 92, "2026-11-28": 84, "2026-11-29": 73, "2026-11-30": 64,
  "2026-12-01": 57, "2026-12-02": 53, "2026-12-03": 53, "2026-12-04": 56, "2026-12-05": 61,
  "2026-12-06": 65, "2026-12-07": 70, "2026-12-08": 73, "2026-12-09": 74, "2026-12-10": 74,
  "2026-12-11": 72, "2026-12-12": 68, "2026-12-13": 64, "2026-12-14": 59, "2026-12-15": 54,
  "2026-12-16": 48, "2026-12-17": 45, "2026-12-18": 45, "2026-12-19": 48, "2026-12-20": 53,
  "2026-12-21": 64, "2026-12-22": 75, "2026-12-23": 85, "2026-12-24": 93, "2026-12-25": 97,
  "2026-12-26": 99, "2026-12-27": 95, "2026-12-28": 87, "2026-12-29": 76, "2026-12-30": 64,
  "2026-12-31": 53
};

// Retourne le coef SHOM officiel du jour, ou null si la date est hors table
// (jan-mars 2026 deja passes, ou annee != 2026)
// Lookup direct en O(1) sur la table BREST_COEFS_2026
function getCoefForDate(dateStr) {
  // dateStr au format "YYYY-MM-DD"
  if (BREST_COEFS_2026[dateStr] !== undefined) {
    return BREST_COEFS_2026[dateStr];
  }
  // Fallback : formule astronomique approximative pour dates hors table
  // (precision +/- 6-15 points, suffisant pour ne pas planter l'affichage)
  var d = new Date(dateStr + 'T12:00:00Z');
  return computeCoefBrest(d);
}

function coefColor(coef) {
  if (coef < 50) return '#16A34A';      // vert - faible (morte-eau)
  if (coef < 80) return '#D97706';      // orange - moyen (maree moyenne)
  return '#DC2626';                      // rouge - eleve (vive-eau/grande maree)
}

function coefLabel(coef) {
  if (coef < 40) return 'tres faible';
  if (coef < 50) return 'faible';
  if (coef < 70) return 'moyen';
  if (coef < 95) return 'eleve';
  return 'tres eleve';
}

function coefDescription(coef) {
  if (coef < 50) return 'Longues etales, peu de courant';
  if (coef < 70) return 'Etales confortables, courant modere';
  if (coef < 95) return 'Bon creneau, courants marques';
  return 'Etales courtes, courants forts';
}


// ============================================================
// Modale "Ajouter a l'agenda" + generation ICS
// ============================================================
function openAgendaModal(btn) {
  var etale = new Date(btn.dataset.etale);
  var type = btn.dataset.type;
  var start = new Date(btn.dataset.start);
  var end = new Date(btn.dataset.end);

  var typeLabel = type === 'high' ? 'Pleine mer' : 'Basse mer';
  var portName = TIDES_PAGE.currentSiteName || 'spot';
  var selDate = TIDES_PAGE.selectedDate;
  var coef = getCoefForDate(selDate);
  var isMed = isMediterraneanPort(TIDES_PAGE.currentSite);

  // Format YYYY-MM-DD et HH:MM pour les inputs
  function toDateInput(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function toTimeInput(d) {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  var defaultTitle = 'Chasse sous-marine - ' + typeLabel + ' ' + portName;
  var defaultNotes = 'Etale ' + etale.toLocaleTimeString('fr', { hour:'2-digit', minute:'2-digit' }) +
    (isMed ? '' : ' - Coef ' + coef) +
    ' - Creneau chassable +/-2h';

  // Construction de la modale
  var modal = document.createElement('div');
  modal.id = 'agendaModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(26,37,53,0.6);z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML =
    '<div style="background:#fff;border-radius:12px;max-width:440px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.25);">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<h3 style="margin:0;font-family:Space Grotesk,sans-serif;font-size:18px;color:var(--text-1);">Ajouter a l\'agenda</h3>' +
        '<button onclick="closeAgendaModal()" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--text-3);font-size:20px;line-height:1;">&times;</button>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;">' +
        '<div>' +
          '<label class="agenda-label">Titre</label>' +
          '<input type="text" id="agendaTitle" value="' + defaultTitle.replace(/"/g, '&quot;') + '" class="agenda-input"/>' +
        '</div>' +
        '<div>' +
          '<label class="agenda-label">Date</label>' +
          '<input type="date" id="agendaDate" value="' + toDateInput(start) + '" class="agenda-input"/>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
          '<div>' +
            '<label class="agenda-label">Debut</label>' +
            '<input type="time" id="agendaStart" value="' + toTimeInput(start) + '" class="agenda-input"/>' +
          '</div>' +
          '<div>' +
            '<label class="agenda-label">Fin</label>' +
            '<input type="time" id="agendaEnd" value="' + toTimeInput(end) + '" class="agenda-input"/>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<label class="agenda-label">Notes</label>' +
          '<textarea id="agendaNotes" class="agenda-input" rows="2">' + defaultNotes + '</textarea>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:20px;">' +
        '<button onclick="closeAgendaModal()" class="agenda-btn-secondary">Annuler</button>' +
        '<button onclick="exportAgendaICS()" class="agenda-btn-primary">Exporter</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  // Ferme si clic en dehors
  modal.addEventListener('click', function(evt) {
    if (evt.target === modal) closeAgendaModal();
  });
}

function closeAgendaModal() {
  var m = document.getElementById('agendaModal');
  if (m) m.remove();
}

// Genere et telecharge un fichier .ics compatible Apple Calendar, Google Agenda, Outlook
function exportAgendaICS() {
  var title = document.getElementById('agendaTitle').value || 'Chasse sous-marine';
  var dateStr = document.getElementById('agendaDate').value;
  var startStr = document.getElementById('agendaStart').value;
  var endStr = document.getElementById('agendaEnd').value;
  var notes = document.getElementById('agendaNotes').value || '';

  if (!dateStr || !startStr || !endStr) {
    alert('Date, debut et fin sont obligatoires');
    return;
  }

  // Construit les Date objects en heure locale
  var startDate = new Date(dateStr + 'T' + startStr + ':00');
  var endDate = new Date(dateStr + 'T' + endStr + ':00');

  if (endDate <= startDate) {
    alert('La fin doit etre apres le debut');
    return;
  }

  // Format ICS : YYYYMMDDTHHMMSSZ (UTC)
  function toICSDate(d) {
    function pad(n) { return String(n).padStart(2, '0'); }
    return d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) + 'Z';
  }

  function escapeICS(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  var uid = 'vizi-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '@vizi.app';
  var portName = TIDES_PAGE.currentSiteName || '';

  var ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vizi//Chasse sous-marine//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + uid,
    'DTSTAMP:' + toICSDate(new Date()),
    'DTSTART:' + toICSDate(startDate),
    'DTEND:' + toICSDate(endDate),
    'SUMMARY:' + escapeICS(title),
    'DESCRIPTION:' + escapeICS(notes),
    'LOCATION:' + escapeICS(portName),
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:' + escapeICS(title),
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  // Telechargement du .ics
  var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = 'vizi-' + dateStr + '.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  closeAgendaModal();
}
// ============================================================
// VIZI - DRAWER MAREES (refonte : 60% a droite, sur carte Esri)
// Remplace l'ancien overlay plein ecran #tidesPageOverlay
// Le drawer s'ouvre par-dessus la carte principale, avec geoloc
// auto sur le port le plus proche et halo vert pulsant.
// ============================================================

var TIDES_DRAWER = {
  isOpen: false,
  currentPort: null,
  data: null,
  extremes: null,
  fromDate: null,
  daysToShow: 14,
  selectedDate: null,
  haloMarker: null
};

// Liste des ports avec marees disponibles (Manche/Atlantique, pas Med)
function getTidePortsForDrawer() {
  var ports = [];
  for (var i = 0; i < SPOTS.length; i++) {
    var spot = SPOTS[i];
    var siteId = API_MAREE_SITES[spot.id];
    if (siteId) {
      ports.push({
        id: spot.id,
        name: spot.name,
        lat: spot.lat,
        lon: spot.lon,
        siteId: siteId,
        region: spot.region
      });
    }
  }
  return ports;
}

// Trouve le port (avec maree) le plus proche d'une position donnee
function findNearestTidePort(lat, lon) {
  var ports = getTidePortsForDrawer();
  if (ports.length === 0) return null;
  var best = null;
  var bestDist = Infinity;
  ports.forEach(function(p) {
    var d = haversineKm(lat, lon, p.lat, p.lon);
    if (d < bestDist) { bestDist = d; best = p; }
  });
  return best;
}

// Un port Mediterraneen n'a pas de coef SHOM applicable
function isMediterraneanTidePort(siteId) {
  for (var i = 0; i < SPOTS.length; i++) {
    if (API_MAREE_SITES[SPOTS[i].id] === siteId && SPOTS[i].region === 'Mediterranee') return true;
  }
  return false;
}

// ============================================================
// Ouverture / fermeture du drawer
// ============================================================
function openTidesDrawer() {
  var drawer = document.getElementById('tidesDrawer');
  if (!drawer) return;

  drawer.classList.add('open');
  TIDES_DRAWER.isOpen = true;

  if (TIDES_DRAWER.currentPort) {
    selectTidePortForDrawer(TIDES_DRAWER.currentPort);
    return;
  }

  var refLat = null, refLon = null;
  // Priorite : si l utilisateur a clique quelque part, c est sa reference
    // Sinon on utilise sa position GPS
    if (S.clickLatLng) {
      refLat = S.clickLatLng.lat;
      refLon = S.clickLatLng.lng;
    } else if (typeof GEO_STATE !== 'undefined' && GEO_STATE.userLatLng) {
      refLat = GEO_STATE.userLatLng.lat;
      refLon = GEO_STATE.userLatLng.lon;
    }

  var port;
  if (refLat !== null) {
    port = findNearestTidePort(refLat, refLon);
  }
  if (!port) {
    var ports = getTidePortsForDrawer();
    port = ports.find(function(p){ return p.id === 'cherbourg'; }) || ports[0];
  }

  if (port) selectTidePortForDrawer(port);
}

function closeTidesDrawer() {
  var drawer = document.getElementById('tidesDrawer');
  if (drawer) drawer.classList.remove('open');
  TIDES_DRAWER.isOpen = false;
  removeTidesPortHalo();
}

// ============================================================
// Halo vert pulsant sur le port selectionne (sur la carte Esri)
// ============================================================
function addTidesPortHalo(lat, lon) {
  removeTidesPortHalo();
  var haloIcon = L.divIcon({
    className: '',
    html: '<div class="tides-port-halo">' +
            '<div class="tides-port-halo-ring"></div>' +
            '<div class="tides-port-halo-ring tides-port-halo-ring2"></div>' +
            '<div class="tides-port-halo-dot"></div>' +
          '</div>',
    iconSize: [50, 50],
    iconAnchor: [25, 25]
  });
  TIDES_DRAWER.haloMarker = L.marker([lat, lon], {
    icon: haloIcon,
    interactive: false,
    zIndexOffset: 800
  }).addTo(S.map);
}

function removeTidesPortHalo() {
  if (TIDES_DRAWER.haloMarker) {
    S.map.removeLayer(TIDES_DRAWER.haloMarker);
    TIDES_DRAWER.haloMarker = null;
  }
}

// ============================================================
// Selection d'un port -> charge donnees + affiche
// ============================================================
function selectTidePortForDrawer(port) {
  TIDES_DRAWER.currentPort = port;

  var portNameEl = document.getElementById('tidesDrawerPortName');
  if (portNameEl) portNameEl.textContent = port.name;

  addTidesPortHalo(port.lat, port.lon);
// Pas de recentrage : la carte reste ou l utilisateur l a laissee
    if (S.map) {
      var bounds = S.map.getBounds();
      var portLatLng = L.latLng(port.lat, port.lon);
      if (!bounds.contains(portLatLng)) S.map.panTo(portLatLng, { animate: true, duration: 0.6 });
    }

  var today = new Date();
  TIDES_DRAWER.selectedDate = today.toISOString().split('T')[0];

  fetchTidesDrawerData();
}

// ============================================================
// Chargement des donnees (14 jours pour permettre la nav)
// ============================================================
function fetchTidesDrawerData() {
  var today = new Date();
  TIDES_DRAWER.fromDate = today.toISOString().split('T')[0];

  var body = document.getElementById('tidesDrawerBody');
  if (body) {
    body.innerHTML = '<div style="padding:60px 20px;text-align:center;color:var(--text-3);font-family:IBM Plex Mono,monospace;font-size:13px;">Chargement marees...</div>';
  }

  var url = GAS_URL + '?action=tides_range&site=' + TIDES_DRAWER.currentPort.siteId
    + '&from=' + TIDES_DRAWER.fromDate + '&days=' + TIDES_DRAWER.daysToShow;

  fetch(url).then(function(r){ return r.json(); }).then(function(data) {
    if (!data.data || data.error) {
      if (body) body.innerHTML = '<div style="padding:40px;color:var(--bad);font-family:IBM Plex Mono,monospace;font-size:12px;">Erreur : ' + (data.error || 'pas de donnees') + '</div>';
      return;
    }
    TIDES_DRAWER.data = data.data;
    TIDES_DRAWER.extremes = data.extremes || [];
    renderTidesDrawerContent();
  }).catch(function(err) {
    if (body) body.innerHTML = '<div style="padding:40px;color:var(--bad);font-family:IBM Plex Mono,monospace;font-size:12px;">Erreur reseau</div>';
  });
}

// ============================================================
// Navigation date dans le drawer
// ============================================================
function shiftTidesDrawerDate(delta) {
  var d = new Date(TIDES_DRAWER.selectedDate + 'T12:00:00Z');
  d.setDate(d.getDate() + delta);
  var newDate = d.toISOString().split('T')[0];

  var from = new Date(TIDES_DRAWER.fromDate + 'T00:00:00Z');
  var to = new Date(from);
  to.setDate(to.getDate() + TIDES_DRAWER.daysToShow);

  TIDES_DRAWER.selectedDate = newDate;
  if (d < from || d >= to) {
    fetchTidesDrawerData();
  } else {
    renderTidesDrawerContent();
  }
}

function onTidesDrawerDateChange(newDate) {
  TIDES_DRAWER.selectedDate = newDate;
  var from = new Date(TIDES_DRAWER.fromDate + 'T00:00:00Z');
  var to = new Date(from);
  to.setDate(to.getDate() + TIDES_DRAWER.daysToShow);
  var d = new Date(newDate + 'T12:00:00Z');
  if (d < from || d >= to) {
    fetchTidesDrawerData();
  } else {
    renderTidesDrawerContent();
  }
}

function tidesDrawerGoToToday() {
  var today = new Date();
  TIDES_DRAWER.selectedDate = today.toISOString().split('T')[0];
  renderTidesDrawerContent();
}

// ============================================================
// Rendu du contenu du drawer (date nav + coef + creneaux + courbe)
// ============================================================
function renderTidesDrawerContent() {
  var body = document.getElementById('tidesDrawerBody');
  if (!body) return;

  var selDate = TIDES_DRAWER.selectedDate;
  var port = TIDES_DRAWER.currentPort;
  if (!port) return;

  var dayPoints = (TIDES_DRAWER.data || []).filter(function(p){ return p.time.slice(0,10) === selDate; });
  var dayExtremes = (TIDES_DRAWER.extremes || []).filter(function(e){ return e.time.slice(0,10) === selDate; });

  if (dayPoints.length === 0) {
    body.innerHTML = '<div style="padding:60px;text-align:center;color:var(--text-3);">Aucune donnee pour cette date</div>';
    return;
  }

  var heights = dayPoints.map(function(p){ return p.height; });
  var marnage = Math.max.apply(null, heights) - Math.min.apply(null, heights);
  var coef = getCoefForDate(selDate);
  var color = coefColor(coef);
  var isMed = isMediterraneanTidePort(port.siteId);
  var label = coefLabel(coef);
  var description = coefDescription(coef);

  var dateObj = new Date(selDate + 'T12:00:00Z');
  var now = new Date();
  var today = now.toISOString().split('T')[0];
  var isToday = selDate === today;
  var dayLabel = dateObj.toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  var dateNav =
    '<div class="tides-date-nav">' +
      '<button class="tides-date-btn" onclick="shiftTidesDrawerDate(-1)">&#9664;</button>' +
      '<input type="date" id="tidesDrawerDatePicker" value="' + selDate + '" onchange="onTidesDrawerDateChange(this.value)">' +
      '<button class="tides-date-btn" onclick="shiftTidesDrawerDate(1)">&#9654;</button>' +
      (isToday ? '' : '<button class="tides-today-btn" onclick="tidesDrawerGoToToday()">Aujourd hui</button>') +
      '<div class="tides-date-label">' + dayLabel + '</div>' +
    '</div>';

  var coefCard;
  if (isMed) {
    coefCard =
      '<div class="tides-coef-card">' +
        '<div class="tides-coef-info" style="width:100%;">' +
          '<div class="tides-coef-label" style="color:var(--text-3);">coefficient non applicable</div>' +
          '<div class="tides-coef-desc">Le coefficient SHOM ne concerne que la facade Manche-Atlantique</div>' +
          '<div class="tides-coef-marnage">marnage ' + marnage.toFixed(1) + 'm</div>' +
        '</div>' +
      '</div>';
  } else {
    coefCard =
      '<div class="tides-coef-card">' +
        '<div class="tides-coef-big" style="color:' + color + ';border-color:' + color + ';">' + coef + '</div>' +
        '<div class="tides-coef-info">' +
          '<div class="tides-coef-label" style="color:' + color + ';">coefficient ' + label + '</div>' +
          '<div class="tides-coef-desc">' + description + '</div>' +
          '<div class="tides-coef-marnage">marnage ' + marnage.toFixed(1) + 'm</div>' +
        '</div>' +
      '</div>';
  }

  var windowsHtml = renderTidesDrawerWindows(dayExtremes, isToday, now);
  var curveHtml = renderTidesDrawerCurve(dayPoints, dayExtremes, isToday, now);

  body.innerHTML = dateNav + coefCard + windowsHtml + curveHtml;
}

// ============================================================
// Creneaux chassables (cards format large)
// ============================================================
function renderTidesDrawerWindows(extremes, isToday, now) {
  if (!extremes || extremes.length === 0) return '';

  var html = '<div class="tides-windows-grid">';
  extremes.forEach(function(e) {
    var etaleTime = new Date(e.time);
    var startTime = new Date(etaleTime.getTime() - 120 * 60000);
    var endTime = new Date(etaleTime.getTime() + 120 * 60000);
    var isPast = isToday && endTime < now;
    var isCurrent = isToday && now >= startTime && now <= endTime;

    var typeColor = e.type === 'high' ? '#0BA888' : '#D97706';
    var typeLabel = e.type === 'high' ? 'Pleine mer' : 'Basse mer';
    var typeShort = e.type === 'high' ? 'PM' : 'BM';
    var startStr = startTime.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
    var endStr = endTime.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
    var etaleStr = etaleTime.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });

    var opacity = isPast ? '0.45' : '1';
    var border = isCurrent ? '2px solid #A8E63D' : '1px solid var(--border)';
    var bg = isCurrent ? 'rgba(168,230,61,0.1)' : 'var(--surface)';
    var badge = isCurrent ? '<span class="tides-window-badge">MAINTENANT</span>' : '';

    var agendaBtn = isPast ? '' : (
      '<button class="tides-agenda-btn" ' +
      'data-etale="' + etaleTime.toISOString() + '" ' +
      'data-type="' + e.type + '" ' +
      'data-start="' + startTime.toISOString() + '" ' +
      'data-end="' + endTime.toISOString() + '" ' +
      'onclick="openAgendaModalFromDrawer(this)" ' +
      'title="Ajouter a mon agenda">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>' +
        '<line x1="16" y1="2" x2="16" y2="6"></line>' +
        '<line x1="8" y1="2" x2="8" y2="6"></line>' +
        '<line x1="3" y1="10" x2="21" y2="10"></line>' +
      '</svg>' +
      '<span>Agenda</span>' +
      '</button>'
    );

    html += '<div class="tides-window-card" style="border:' + border + ';background:' + bg + ';opacity:' + opacity + ';">' +
      '<div class="tides-window-top">' +
        '<div class="tides-window-type" style="color:' + typeColor + ';">' + typeShort + ' &mdash; ' + typeLabel + badge + '</div>' +
        '<div class="tides-window-etale">etale ' + etaleStr + '</div>' +
      '</div>' +
      '<div class="tides-window-range">' +
        '<span class="tides-window-time">' + startStr + '</span>' +
        '<span class="tides-window-arrow">&rarr;</span>' +
        '<span class="tides-window-time">' + endStr + '</span>' +
      '</div>' +
      agendaBtn +
    '</div>';
  });
  html += '</div>';
  return html;
}

// Wrapper agenda : utilise les memes fonctions openAgendaModal/exportAgendaICS
function openAgendaModalFromDrawer(btn) {
  if (typeof TIDES_PAGE === 'undefined') {
    window.TIDES_PAGE = {};
  }
  TIDES_PAGE.currentSiteName = TIDES_DRAWER.currentPort ? TIDES_DRAWER.currentPort.name : '';
  TIDES_PAGE.currentSite = TIDES_DRAWER.currentPort ? TIDES_DRAWER.currentPort.siteId : null;
  TIDES_PAGE.selectedDate = TIDES_DRAWER.selectedDate;
  openAgendaModal(btn);
}

// ============================================================
// Grande courbe de maree
// ============================================================
function renderTidesDrawerCurve(points, extremes, isToday, now) {
  if (points.length === 0) return '';

  var w = 800, h = 240, pad = 40;
  var heights = points.map(function(p){ return p.height; });
  var minH = Math.min.apply(null, heights);
  var maxH = Math.max.apply(null, heights);
  var rangeH = Math.max(maxH - minH, 0.1);

  function xOf(time) {
    var d = new Date(time);
    return pad + ((d.getHours() * 60 + d.getMinutes()) / 1440) * (w - pad * 2);
  }
  function yOf(height) {
    return pad + (1 - (height - minH) / rangeH) * (h - pad * 2);
  }

  var chassableBands = extremes.map(function(e) {
    var t = new Date(e.time);
    var startMin = t.getHours() * 60 + t.getMinutes() - 120;
    var endMin = t.getHours() * 60 + t.getMinutes() + 120;
    startMin = Math.max(0, startMin);
    endMin = Math.min(1440, endMin);
    var x1 = pad + (startMin / 1440) * (w - pad * 2);
    var x2 = pad + (endMin / 1440) * (w - pad * 2);
    return '<rect x="' + x1.toFixed(1) + '" y="' + pad + '" width="' + (x2 - x1).toFixed(1) + '" height="' + (h - pad * 2) + '" fill="#A8E63D" opacity="0.15"/>';
  }).join('');

  var path = '';
  points.forEach(function(p, i) {
    path += (i === 0 ? 'M' : 'L') + xOf(p.time).toFixed(1) + ',' + yOf(p.height).toFixed(1) + ' ';
  });
  var lastX = xOf(points[points.length-1].time).toFixed(1);
  var firstX = xOf(points[0].time).toFixed(1);

  var markers = extremes.map(function(e) {
    var x = xOf(e.time), y = yOf(e.height);
    var color = e.type === 'high' ? '#0BA888' : '#D97706';
    var timeLabel = new Date(e.time).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
    var ty = e.type === 'high' ? y - 14 : y + 22;
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6" fill="' + color + '" stroke="white" stroke-width="2.5"/>' +
      '<text x="' + x.toFixed(1) + '" y="' + ty.toFixed(1) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="13" fill="' + color + '" font-weight="700">' + timeLabel + '</text>' +
      '<text x="' + x.toFixed(1) + '" y="' + (ty + 14).toFixed(1) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" fill="' + color + '" opacity="0.7">' + e.height.toFixed(1) + 'm</text>';
  }).join('');

  var nowLine = '';
  if (isToday) {
    var nowX = pad + ((now.getHours() * 60 + now.getMinutes()) / 1440) * (w - pad * 2);
    nowLine =
      '<line x1="' + nowX.toFixed(1) + '" y1="' + pad + '" x2="' + nowX.toFixed(1) + '" y2="' + (h - pad) + '" stroke="#DC2626" stroke-width="2" stroke-dasharray="4,3"/>' +
      '<circle cx="' + nowX.toFixed(1) + '" cy="' + pad + '" r="5" fill="#DC2626"/>' +
      '<text x="' + nowX.toFixed(1) + '" y="' + (h - 70) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" fill="#C94A3D" font-weight="700" letter-spacing="0.08em">NOW</text>';
  }

  var hourLabels = '';
  [0, 3, 6, 9, 12, 15, 18, 21, 24].forEach(function(hr) {
    var x = pad + (hr * 60 / 1440) * (w - pad * 2);
    hourLabels += '<line x1="' + x.toFixed(1) + '" y1="' + (h - 80) + '" x2="' + x.toFixed(1) + '" y2="' + (h - 75) + '" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>';
    hourLabels += '<text x="' + x.toFixed(1) + '" y="' + (h - 60) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="13" fill="rgba(255,255,255,0.5)">' + hr + 'h</text>';
  });

  var xAxis = '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" stroke="#CBD5E0" stroke-width="1"/>';

  var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;max-width:100%;">' +
    chassableBands +
    '<path d="' + path + 'L' + lastX + ',' + (h - pad) + ' L' + firstX + ',' + (h - pad) + ' Z" fill="#0BA888" opacity="0.12"/>' +
    '<path d="' + path + '" stroke="#0BA888" stroke-width="2.5" fill="none"/>' +
    xAxis +
    nowLine +
    markers +
    hourLabels +
    '</svg>';

  return '<div class="tides-curve-wrap">' +
    '<div class="tides-curve-title">Courbe de maree - 24h</div>' +
    svg +
    '<div class="tides-curve-legend">' +
      '<span><span class="legend-band"></span>creneau chassable (+/-2h autour de l etale)</span>' +
      '<span style="color:#0BA888">&#9679; Pleine mer</span>' +
      '<span style="color:#D97706">&#9679; Basse mer</span>' +
      (isToday ? '<span style="color:#DC2626">&#9679; maintenant</span>' : '') +
    '</div>' +
  '</div>';
}
// ============================================================
// VIZI - GEOLOCALISATION UTILISATEUR
// ============================================================

var GEO_STATE = {
  userMarker: null,
  userLatLng: null,
  hasAsked: false
};

function initGeolocationFlow() {
  var choice = null;
  try { choice = localStorage.getItem('vizi_geo_choice'); } catch(e) {}

  if (choice === 'accepted') {
    geolocateUser(false);
  } else if (choice === 'dismissed') {
    return;
  } else {
    setTimeout(function() {
      var banner = document.getElementById('geoBanner');
      if (banner) banner.classList.add('show');
    }, 1500);
  }
}

function dismissGeoBanner() {
  var banner = document.getElementById('geoBanner');
  if (banner) banner.classList.remove('show');
  try { localStorage.setItem('vizi_geo_choice', 'dismissed'); } catch(e) {}
}

function acceptGeolocation() {
  var banner = document.getElementById('geoBanner');
  if (banner) banner.classList.remove('show');
  try { localStorage.setItem('vizi_geo_choice', 'accepted'); } catch(e) {}
  geolocateUser(true);
}

function geolocateUser(userInitiated) {
  // Force le GPS frais : on oublie le dernier clic carte pour que la geoloc reprenne la priorite
  S.clickLatLng = null;
  var btn = document.getElementById('locateBtn');
  if (btn) btn.classList.add('locating');

  if (!navigator.geolocation) {
    if (btn) btn.classList.remove('locating');
    if (userInitiated) fallbackToIPGeolocation(true);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function(position) {
      if (btn) btn.classList.remove('locating');
      handleUserPosition(position.coords.latitude, position.coords.longitude, 'gps');
    },
    function(err) {
      if (btn) btn.classList.remove('locating');
      console.log('[VIZI] GPS non disponible:', err.message);
      fallbackToIPGeolocation(userInitiated);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function fallbackToIPGeolocation(userInitiated) {
  fetch('https://ipapi.co/json/').then(function(r) {
    return r.json();
  }).then(function(data) {
    if (data && data.latitude && data.longitude) {
      handleUserPosition(data.latitude, data.longitude, 'ip');
    } else if (userInitiated) {
      showGeolocError();
    }
  }).catch(function() {
    if (userInitiated) showGeolocError();
  });
}

function showGeolocError() {
  var toast = document.getElementById('landToast');
  if (!toast) return;
  toast.textContent = 'Localisation impossible. Clique sur la carte pour choisir ton spot.';
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 4000);
}

function handleUserPosition(lat, lon, source) {
  GEO_STATE.userLatLng = { lat: lat, lon: lon };

  if (GEO_STATE.userMarker) S.map.removeLayer(GEO_STATE.userMarker);
  var posIcon = L.divIcon({
    className: '',
    html: '<div class="user-position-marker"><div class="user-position-pulse"></div><div class="user-position-dot"></div></div>',
    iconSize: [24, 24], iconAnchor: [12, 12]
  });
  GEO_STATE.userMarker = L.marker([lat, lon], { icon: posIcon, interactive: false, zIndexOffset: 500 }).addTo(S.map);

  var nearest = findNearestPort(lat, lon);
  if (!nearest) {
    S.map.setView([lat, lon], 11);
    return;
  }

  var bounds = L.latLngBounds([[lat, lon], [nearest.spot.lat, nearest.spot.lon]]);
  S.map.fitBounds(bounds, { padding: [80, 80], maxZoom: 12 });

  var distKm = Math.round(nearest.distanceKm * 10) / 10;
  var toast = document.getElementById('landToast');
  if (toast) {
    var sourceLabel = source === 'gps' ? '' : ' (approximatif)';
    toast.textContent = 'Port le plus proche : ' + nearest.spot.name + ' (' + distKm + ' km)' + sourceLabel;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 4000);
  }

  // Sur mobile : pas d'ouverture auto du drawer spot, juste centrage carte
  // Sur desktop : on ouvre le drawer pour montrer les conditions
  if (!isMobile()) {
    setTimeout(function() {
      openSpotPopup(L.latLng(nearest.spot.lat, nearest.spot.lon), nearest.spot.name);
      if (S_forecastOpen) loadForecast(nearest.spot.lat, nearest.spot.lon, nearest.spot.name);
    }, 1000);
  }
}

function findNearestPort(lat, lon) {
  if (!SPOTS || SPOTS.length === 0) return null;
  var best = null;
  var bestDist = Infinity;
  SPOTS.forEach(function(spot) {
    var dKm = haversineKm(lat, lon, spot.lat, spot.lon);
    if (dKm < bestDist) {
      bestDist = dKm;
      best = spot;
    }
  });
  if (!best) return null;
  return { spot: best, distanceKm: bestDist };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function zoomMapIn() {
  if (S.map) S.map.zoomIn();
}

function zoomMapOut() {
  if (S.map) S.map.zoomOut();
}
function boot() {
  initCanvas();
  initMap();
  var headerH = document.getElementById('header').offsetHeight;
  document.getElementById('sedLegend').style.top = (headerH + 8) + 'px';
  if (window.innerWidth > 768) {
    document.getElementById('spotDrawer').style.top = headerH + 'px';
  }
  // Init bouton unite vent : noeuds par defaut
  var windBtn = document.getElementById('windUnitToggle');
  if (windBtn) {
    windBtn.textContent = S_windUnit === 'kt' ? 'noeuds' : 'km/h';
    windBtn.style.color = S_windUnit === 'kt' ? '#A8E63D' : 'rgba(255,255,255,0.7)';
    windBtn.style.borderColor = S_windUnit === 'kt' ? '#A8E63D' : 'rgba(255,255,255,0.15)';
  }
  // Charge les observations communautaires + auto-refresh 5min
  loadCommunityObservations();
  OBS_REFRESH_INTERVAL = setInterval(loadCommunityObservations, 5 * 60 * 1000);
  initGeolocationFlow();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
// ============================================================
// BANDEAU BAS UNIFIÉ - Conditions (Marées dans étape suivante)
// Peek <-> Half sur desktop, Peek -> Half -> Full sur mobile
// ============================================================

var css = `
    .vz-sheet-cond-wrap { padding: 12px 18px 18px; color: var(--vz-text-on-dark); }
    .vz-sheet-cond-meta {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      color: var(--vz-text-on-dark-faint);
      letter-spacing: 0.06em;
      margin-bottom: 16px;
    }
    .vz-sheet-cond-header {
      display: flex;
      align-items: baseline;
      gap: 18px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-wrap: wrap;
    }
    .vz-sheet-depth-inline {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .vz-sheet-depth-mini {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: var(--vz-text-on-dark-faint);
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .vz-sheet-depth-num {
      font-family: 'Inter', sans-serif;
      font-size: 22px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: -0.02em;
      color: #4DD4A8;
    }
    .vz-sheet-depth-unit-mini {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: #4DD4A8;
      opacity: 0.75;
    }
    .vz-sheet-coords-inline {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 12px;
      color: var(--vz-text-on-dark);
      letter-spacing: 0.04em;
    }
    .vz-sheet-source-inline {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 10px;
      color: var(--vz-text-on-dark-faint);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-left: auto;
    }
    .vz-cond-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 13px;
      color: var(--vz-text-on-dark);
    }
    .vz-cond-table th, .vz-cond-table td {
      padding: 0 10px;
      height: 40px;
      text-align: center;
      white-space: nowrap;
      border-right: 1px solid rgba(255,255,255,0.05);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .vz-cond-rowlabel {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: var(--vz-accent);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      text-align: left !important;
      padding: 0 16px !important;
      min-width: 130px;
      position: sticky;
      left: 0;
      background: var(--vz-bg-deep);
      z-index: 3;
      border-right: 1px solid var(--vz-accent-border) !important;
    }
    .vz-cond-cornerlabel, .vz-cond-cornerhour {
      position: sticky;
      left: 0;
      background: var(--vz-bg-deep);
      z-index: 3;
      border-right: 1px solid var(--vz-accent-border) !important;
      min-width: 130px;
    }
    .vz-cond-dayhead {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: var(--vz-text-on-dark);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      background: rgba(255,255,255,0.04);
      border-bottom: 1px solid var(--vz-accent-border) !important;
      padding: 10px !important;
      height: auto;
    }
    .vz-cond-hourhead {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      font-weight: 500;
      color: var(--vz-text-on-dark-muted);
      background: rgba(255,255,255,0.02);
      letter-spacing: 0.04em;
      height: 32px;
    }
    .vz-cond-dayboundary { border-left: 1px solid var(--vz-accent-border) !important; }
    .vz-cond-now {
      background: rgba(77,212,168,0.10) !important;
      box-shadow: inset 2px 0 0 var(--vz-accent), inset -1px 0 0 var(--vz-accent);
    }
    .vz-cond-now-header {
      background: rgba(77,212,168,0.20) !important;
      color: var(--vz-accent) !important;
      font-weight: 700 !important;
      box-shadow: inset 2px 0 0 var(--vz-accent);
    }
    /* Visi : grosse typo Inter, couleurs saturées */
    .vz-cond-row-vis td {
      font-family: 'Inter', sans-serif !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      color: #fff !important;
      cursor: pointer;
      letter-spacing: 0;
      transition: filter 0.15s;
    }
    .vz-cond-row-vis td:hover { filter: brightness(1.15); }
    .vz-cond-vis-0 { background: rgba(201,74,61,0.92) !important; }
    .vz-cond-vis-1 { background: rgba(232,155,60,0.85) !important; }
    .vz-cond-vis-2 { background: rgba(216,200,74,0.75) !important; color: #1A2535 !important; }
    .vz-cond-vis-3 { background: rgba(77,212,168,0.65) !important; color: #1A2535 !important; }
    .vz-cond-vis-4 { background: rgba(45,168,136,0.92) !important; }
    /* Vent : Inter 600 */
    .vz-cond-row-wind td, .vz-cond-row-gusts td {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 12px;
    }
    .vz-cond-w-0 { background: rgba(77,212,168,0.10); }
    .vz-cond-w-1 { background: rgba(77,212,168,0.20); }
    .vz-cond-w-2 { background: rgba(216,200,74,0.20); }
    .vz-cond-w-3 { background: rgba(232,155,60,0.30); }
    .vz-cond-w-4 { background: rgba(232,155,60,0.50); }
    .vz-cond-w-5 { background: rgba(201,74,61,0.55); }
    .vz-cond-w-6 { background: rgba(201,74,61,0.75); color: #fff; }
    /* Cellules par défaut (Marée, Direction, Ciel) : taille uniforme */
    .vz-cond-table tbody td:not(.vz-cond-rowlabel) {
      font-size: 12px;
    }
    /* Coef */
    .vz-cond-coef-low { color: var(--vz-text-on-dark-muted); }
    .vz-cond-coef-mid { color: var(--vz-medium); font-weight: 600; }
    .vz-cond-coef-high { color: var(--vz-warning); font-weight: 700; }
    .vz-cond-footer {
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid rgba(255,255,255,0.08);
      font-family: 'IBM Plex Mono', monospace;
      font-size: 10px;
      color: var(--vz-text-on-dark-faint);
      letter-spacing: 0.05em;
      line-height: 1.7;
      display: flex;
      gap: 22px;
      flex-wrap: wrap;
    }
    .vz-cond-footer strong { color: var(--vz-accent); font-weight: 600; }
    @media (max-width: 768px) {
      .vz-sheet-cond-wrap { padding: 12px 12px 20px; }
      .vz-cond-table { font-size: 12px; }
      .vz-cond-table th, .vz-cond-table td { padding: 0 7px; height: 34px; }
      .vz-cond-rowlabel { min-width: 96px; padding: 0 12px !important; font-size: 10px; }
      .vz-cond-cornerlabel, .vz-cond-cornerhour { min-width: 96px; }
      .vz-cond-row-vis td { font-size: 13px !important; }
    }
     /* Scrollbar horizontale discrète type Apple */
    .vz-sheet-cond-wrap > div[style*="overflow-x"] {
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.18) transparent;
    }
    .vz-sheet-cond-wrap > div[style*="overflow-x"]::-webkit-scrollbar {
      height: 6px;
      background: transparent;
    }
    .vz-sheet-cond-wrap > div[style*="overflow-x"]::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.18);
      border-radius: 4px;
    }
    .vz-sheet-cond-wrap > div[style*="overflow-x"]::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.32);
    }
    .vz-sheet-cond-wrap > div[style*="overflow-x"]::-webkit-scrollbar-track {
      background: transparent;
    }
  `;
  var style = document.createElement('style');
  style.id = 'vzSheetTableCSS';
  style.textContent = css;
  document.head.appendChild(style);

window.VZ_SHEET = {
  state: 'peek',
  mode: null,
  spot: null,
  data: null
};

// ----- Cycle : desktop = peek<->half ; mobile = peek->half->full->peek -----
window.cycleSheetState = function() {
  var sheet = document.getElementById('vzSheet');
  if (!sheet) return;
  var isMobile = window.innerWidth < 769;
  var current = VZ_SHEET.state;
  var next;
  if (isMobile) {
    if (current === 'peek')      next = 'half';
    else if (current === 'half') next = 'full';
    else                         next = 'peek';
  } else {
    next = (current === 'peek') ? 'half' : 'peek';
  }
  setSheetState(next);
};

window.setSheetState = function(state) {
  var sheet = document.getElementById('vzSheet');
  if (!sheet) return;
  sheet.classList.remove('sheet-peek', 'sheet-half', 'sheet-full');
  sheet.classList.add('sheet-' + state);
  VZ_SHEET.state = state;
};

function updateSheetHeader(modeLabel, spotLabel) {
  var modeEl = document.getElementById('vzSheetModeLabel');
  var spotEl = document.getElementById('vzSheetSpotLabel');
  if (modeEl) modeEl.textContent = modeLabel || '';
  if (spotEl) spotEl.textContent = spotLabel ? '· ' + spotLabel : '';
}

// ============================================================
// CONDITIONS dans le bandeau
// ============================================================

window.openConditionsInSheet = function() {
  // Toggle : si déjà en mode cond, on ferme complètement
  if (VZ_SHEET.mode === 'cond') {
    closeCondDrawer();
    return;
  }
  
  VZ_SHEET.mode = 'cond';
  // Affiche le bandeau s'il était caché
  var sheet = document.getElementById('vzSheet');
  if (sheet) sheet.style.display = '';

  var tabCond = document.getElementById('vzTabCond');
  var tabTides = document.getElementById('vzTabTides');
  if (tabCond) tabCond.classList.add('active');
  if (tabTides) tabTides.classList.remove('active');

  if (VZ_SHEET.state === 'peek') setSheetState('half');

  var spot = resolveSheetSpot();
  VZ_SHEET.spot = spot;

  updateSheetHeader('Prévisions 5 jours', spot ? spot.name : 'Choisis un point en mer');

  var body = document.getElementById('vzSheetBody');
  if (!body) return;

  if (!spot) {
    body.innerHTML = '<div class="vz-sheet-loading">Clique un point en mer ou un port pour afficher les prévisions</div>';
    return;
  }

  body.innerHTML = '<div class="vz-sheet-loading">Chargement des prévisions...</div>';
  loadSheetConditions(spot);
};

window.openCondDrawer = function() { 
  closeSpotPopup(); 
  openConditionsInSheet(); 
};
window.closeCondDrawer = function() {
  setSheetState('peek');
  VZ_SHEET.mode = null;
  var tabCond = document.getElementById('vzTabCond');
  if (tabCond) tabCond.classList.remove('active');
  // Cache complètement le bandeau
  var sheet = document.getElementById('vzSheet');
  if (sheet) sheet.style.display = 'none';
};


// ----- Récupère le spot courant -----
function resolveSheetSpot() {
  // 1) Un point a ete clique : c'est lui qu'on analyse, peu importe que le
  // drawer spot soit encore ouvert. Ca evite que la fermeture du drawer
  // (en ouvrant Conditions par exemple) fasse retomber sur le centre carte.
  // S._spotDepth est deja la valeur corrigee renvoyee par fetchRealDepth.
  if (S && S.clickLatLng) {
    var lat = S.clickLatLng.lat;
    var lng = S.clickLatLng.lng;
    var name = getSpotDisplayName(lat, lng);
    return { lat: lat, lng: lng, name: name, depth: S._spotDepth || null };
  }

  // 2) Drawer marées ouvert : utilise le port sélectionné
  if (typeof TIDES_DRAWER !== 'undefined' && TIDES_DRAWER.isOpen && TIDES_DRAWER.currentPort) {
    var p = TIDES_DRAWER.currentPort;
    return { lat: p.lat, lng: p.lon, name: p.name, depth: null };
  }

  // 3) Géoloc utilisateur si dispo
  if (typeof GEO_STATE !== 'undefined' && GEO_STATE.userLatLng) {
    var u = GEO_STATE.userLatLng;
    var nearest = findNearestPort(u.lat, u.lon);
    if (nearest && nearest.spot) {
      return { lat: nearest.spot.lat, lng: nearest.spot.lon, name: nearest.spot.name, depth: null };
    }
    return { lat: u.lat, lng: u.lon, name: getSpotDisplayName(u.lat, u.lon), depth: null };
  }

  // 4) Centre carte (dernier recours)
  if (S && S.map && S.map.getCenter) {
    var c = S.map.getCenter();
    return { lat: c.lat, lng: c.lng, name: getSpotDisplayName(c.lat, c.lng), depth: null };
  }

  return null;
}

function getSpotDisplayName(lat, lng) {
  if (typeof findNearestPort === 'function') {
    try {
      var p = findNearestPort(lat, lng);
      if (p && p.spot && p.spot.name) {
        var distKm = p.distanceKm;
        if (distKm < 1) {
          return p.spot.name;
        } else if (distKm < 5) {
          return 'Au large de ' + p.spot.name + ' · ' + distKm.toFixed(1) + ' km';
        } else {
          return 'Point en mer · ' + lat.toFixed(3) + 'N ' + Math.abs(lng).toFixed(3) + (lng < 0 ? 'O' : 'E');
        }
      }
    } catch(e) {}
  }
  return lat.toFixed(3) + 'N ' + Math.abs(lng).toFixed(3) + (lng < 0 ? 'O' : 'E');
}

// ----- Chargement parallèle météo + profondeur -----
function loadSheetConditions(spot) {
  var meteoPromise = fetchSheetMeteo(spot.lat, spot.lng);
  var depthPromise = (spot.depth != null && spot.depth > 0)
    ? Promise.resolve(spot.depth)
    : (typeof fetchRealDepth === 'function'
        ? fetchRealDepth(spot.lat, spot.lng).catch(function(){ return null; })
        : Promise.resolve(null));
  var tidesPromise = fetchSheetTides(spot);

  Promise.all([meteoPromise, depthPromise, tidesPromise]).then(function(results) {
    if (VZ_SHEET.mode !== 'cond') return;
    var meteo = results[0];
    var depth = results[1];
    var tides = results[2];
    if (!meteo || !meteo.time) {
      document.getElementById('vzSheetBody').innerHTML = '<div class="vz-sheet-loading">Données météo indisponibles</div>';
      return;
    }
    VZ_SHEET.data = { meteo: meteo, depth: depth, tides: tides, spot: spot };
    renderSheetTable();
  }).catch(function(err) {
    console.error('[Sheet] erreur chargement', err);
    document.getElementById('vzSheetBody').innerHTML = '<div class="vz-sheet-loading">Erreur de chargement</div>';
  });
}

// Récupère les hauteurs de marée sur 5 jours via le GAS proxy existant
function fetchSheetTides(spot) {
  var near = (typeof findApiMareeSiteNear === 'function') ? findApiMareeSiteNear(spot.lat, spot.lng) : null;
  if (!near) return Promise.resolve(null);
  var today = new Date();
  var fromStr = today.toISOString().slice(0, 10);
  var url = GAS_URL + '?action=tides_range&site=' + near.siteId + '&from=' + fromStr + '&days=5';
  return fetch(url).then(function(r) { return r.json(); }).then(function(data) {
    if (!data || !data.data) return null;
    return { points: data.data, port: near };
  }).catch(function() { return null; });
}

// Réutilise AROME + ARPEGE comme dans loadForecast (haute res 0-48h + ARPEGE 48h-5j)
function fetchSheetMeteo(lat, lon) {
  var aromeUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon
    + '&hourly=windspeed_10m,winddirection_10m,windgusts_10m,wave_height,temperature_2m,precipitation,cloud_cover'
    + '&wind_speed_unit=kmh&timezone=Europe/Paris&forecast_days=2'
    + '&models=meteofrance_arome_france';
  var arpegeUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon
    + '&hourly=windspeed_10m,winddirection_10m,windgusts_10m,wave_height,temperature_2m,precipitation,cloud_cover'
    + '&wind_speed_unit=kmh&timezone=Europe/Paris&forecast_days=5'
    + '&models=meteofrance_arpege_europe';
  return Promise.all([
    fetch(aromeUrl).then(function(r){ return r.json(); }),
    fetch(arpegeUrl).then(function(r){ return r.json(); })
  ]).then(function(results) {
    var arome = results[0].hourly;
    var arpege = results[1].hourly;
    var fused = fuseForecasts(arome, arpege);
    return fused.h;
  });
}

// ============================================================
// RENDU TABLEAU 7 lignes × 5 jours (créneaux 3h)
// ============================================================
function renderSheetTable() {
  var body = document.getElementById('vzSheetBody');
  if (!body || !VZ_SHEET.data) return;
  var data = VZ_SHEET.data;
  var h = data.meteo;
  var spot = data.spot;
  var depth = data.depth || 5;

  // Filtre créneaux 3h sur 5 jours
  var slots = [];
  for (var i = 0; i < h.time.length; i++) {
    var dt = new Date(h.time[i]);
    if (dt.getHours() % 3 === 0) {
      slots.push({ i: i, time: dt, t: h.time[i] });
    }
    if (slots.length >= 40) break;
  }
  if (slots.length === 0) {
    body.innerHTML = '<div class="vz-sheet-loading">Pas de données disponibles</div>';
    return;
  }

  // Now
  var nowMs = Date.now();
  var nowIdx = -1, minDelta = Infinity;
  slots.forEach(function(s, idx) {
    var d = Math.abs(s.time.getTime() - nowMs);
    if (d < minDelta) { minDelta = d; nowIdx = idx; }
  });

  // Groupes jours
  var dayGroups = [];
  var lastDay = null;
  slots.forEach(function(s, idx) {
    var dKey = s.time.toDateString();
    if (dKey !== lastDay) {
      lastDay = dKey;
      dayGroups.push({ label: formatSheetDayLabel(s.time), count: 1 });
    } else {
      dayGroups[dayGroups.length - 1].count++;
    }
  });

  // Helpers
  function visClass(score) {
    if (score < 20) return 'vz-cond-vis-0';
    if (score < 40) return 'vz-cond-vis-1';
    if (score < 60) return 'vz-cond-vis-2';
    if (score < 80) return 'vz-cond-vis-3';
    return 'vz-cond-vis-4';
  }
function visLabel(score) {
    // Aligne sur l'echelle officielle du drawer spot : 1m / 2m / 4m / 6m / 8m
    if (score < 20) return '1m';
    if (score < 40) return '2m';
    if (score < 60) return '4m';
    if (score < 80) return '6m';
    return '8m';
  }
  function windCls(v) {
    if (v < 10) return 'vz-cond-w-0';
    if (v < 15) return 'vz-cond-w-1';
    if (v < 20) return 'vz-cond-w-2';
    if (v < 28) return 'vz-cond-w-3';
    if (v < 38) return 'vz-cond-w-4';
    if (v < 50) return 'vz-cond-w-5';
    return 'vz-cond-w-6';
  }
  function dirArrowSvg(deg) {
    if (deg == null) return '—';
    return '<svg width="14" height="14" viewBox="0 0 20 20" style="transform:rotate(' + deg + 'deg);display:inline-block;vertical-align:middle;">'
      + '<path d="M10 2 L10 16 M10 16 L6 12 M10 16 L14 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  }
  function skyIcon(cloud, rain) {
    var color = '#4DD4A8'; // vert Talisker pour cohérence
    var grayCloud = 'rgba(216,200,74,0.85)'; // jaune Talisker pour nuageux
    var darkCloud = 'rgba(232,155,60,0.9)'; // orange Talisker pour couvert
    var rainColor = 'rgba(77,150,212,0.95)'; // bleu pour pluie
    
    // Pluie : nuage avec gouttes
    if (rain != null && rain >= 0.3) {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + rainColor + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;">'
        + '<path d="M5 13 Q3 13 3 11 Q3 9 5 9 Q6 6 9 6 Q12 6 13 8 Q15 7 17 9 Q19 9 19 11 Q19 13 17 13 Z"/>'
        + '<line x1="8" y1="16" x2="7" y2="19"/>'
        + '<line x1="12" y1="16" x2="11" y2="19"/>'
        + '<line x1="16" y1="16" x2="15" y2="19"/>'
        + '</svg>';
    }
    
    if (cloud == null) return '—';
    
    // Soleil clair < 25%
    if (cloud < 25) {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" style="display:inline-block;vertical-align:middle;">'
        + '<circle cx="12" cy="12" r="4"/>'
        + '<line x1="12" y1="3" x2="12" y2="5"/>'
        + '<line x1="12" y1="19" x2="12" y2="21"/>'
        + '<line x1="3" y1="12" x2="5" y2="12"/>'
        + '<line x1="19" y1="12" x2="21" y2="12"/>'
        + '<line x1="5.6" y1="5.6" x2="7" y2="7"/>'
        + '<line x1="17" y1="17" x2="18.4" y2="18.4"/>'
        + '<line x1="5.6" y1="18.4" x2="7" y2="17"/>'
        + '<line x1="17" y1="7" x2="18.4" y2="5.6"/>'
        + '</svg>';
    }
    
    // Peu nuageux 25-55% : soleil + petit nuage
    if (cloud < 55) {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;">'
        + '<circle cx="9" cy="9" r="3"/>'
        + '<line x1="9" y1="3" x2="9" y2="4.5"/>'
        + '<line x1="3" y1="9" x2="4.5" y2="9"/>'
        + '<line x1="4.7" y1="4.7" x2="5.6" y2="5.6"/>'
        + '<path d="M10 16 Q8 16 8 14 Q8 12 10 12 Q11 10 13.5 10 Q16 10 16.5 12 Q18 12 18 14 Q18 16 16 16 Z" stroke="' + grayCloud + '"/>'
        + '</svg>';
    }
    
    // Nuageux 55-85% : nuage simple
    if (cloud < 85) {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + grayCloud + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;">'
        + '<path d="M5 16 Q3 16 3 14 Q3 11 6 11 Q7 8 10 8 Q14 8 15 11 Q19 11 19 14 Q19 16 17 16 Z"/>'
        + '</svg>';
    }
    
    // Couvert >= 85% : nuage rempli
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="' + darkCloud + '" stroke="' + darkCloud + '" stroke-width="1.5" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;">'
      + '<path d="M5 16 Q3 16 3 14 Q3 11 6 11 Q7 8 10 8 Q14 8 15 11 Q19 11 19 14 Q19 16 17 16 Z"/>'
      + '</svg>';
  }
  function coefCls(c) {
    if (c < 50) return 'vz-cond-coef-low';
    if (c < 80) return 'vz-cond-coef-mid';
    return 'vz-cond-coef-high';
  }

  var unitLabel = S_windUnit === 'kt' ? 'nds' : 'km/h';
  var conv = S_windUnit === 'kt' ? toKt : function(v){ return Math.round(v); };

  // ---- Build HTML ----
  var html = '<div class="vz-sheet-cond-wrap">';

// Header sur une seule ligne : profondeur + coords + source
  var depthLabel = depth != null ? Math.round(depth) : '—';

  html += '<div class="vz-sheet-cond-header">';
  html += '<div class="vz-sheet-depth-inline"><span class="vz-sheet-depth-mini">FOND</span><span class="vz-sheet-depth-num">' + depthLabel + '</span><span class="vz-sheet-depth-unit-mini">m</span></div>';
  html += '<div class="vz-sheet-coords-inline">' + spot.lat.toFixed(4) + 'N · ' + Math.abs(spot.lng).toFixed(4) + (spot.lng < 0 ? 'O' : 'E') + '</div>';
  html += '<div class="vz-sheet-source-inline">EMODnet ~115m</div>';
  html += '</div>';

  html += '<div style="overflow-x:auto;">';
  html += '<table class="vz-cond-table">';

  // Header jours
  html += '<tr><th class="vz-cond-cornerlabel"></th>';
  dayGroups.forEach(function(g, gIdx) {
    var cls = 'vz-cond-dayhead' + (gIdx > 0 ? ' vz-cond-dayboundary' : '');
    html += '<th class="' + cls + '" colspan="' + g.count + '">' + g.label + '</th>';
  });
  html += '</tr>';

  // Header heures
  html += '<tr><th class="vz-cond-cornerhour"></th>';
  slots.forEach(function(s, idx) {
    var cls = 'vz-cond-hourhead';
    if (idx === nowIdx) cls += ' vz-cond-now-header';
    if (idx > 0 && s.time.toDateString() !== slots[idx-1].time.toDateString()) cls += ' vz-cond-dayboundary';
    html += '<th class="' + cls + '">' + String(s.time.getHours()).padStart(2,'0') + 'h</th>';
  });
  html += '</tr>';

  function renderRow(label, rowCls, cellFn) {
    var row = '<tr' + (rowCls ? ' class="' + rowCls + '"' : '') + '>';
    row += '<td class="vz-cond-rowlabel">' + label + '</td>';
    slots.forEach(function(s, idx) {
      var cell = cellFn(s, idx);
      var cls = cell.cls || '';
      if (idx === nowIdx) cls += ' vz-cond-now';
      if (idx > 0 && s.time.toDateString() !== slots[idx-1].time.toDateString()) cls += ' vz-cond-dayboundary';
      var attrs = cell.attrs || '';
      row += '<td class="' + cls.trim() + '"' + attrs + '>' + cell.html + '</td>';
    });
    row += '</tr>';
    return row;
  }
// Patch 5/6 : utilise computeVisibilityScore_V4 (chaîne 9 briques)
  html += renderRow('Visibilité', 'vz-cond-row-vis', function(s) {
    var score = computeVisibilityScore_V4(h, s.i, depth, spot.lat, spot.lng).score;
    return {
      cls: visClass(score),
      html: visLabel(score),
      attrs: ' onclick="vzSheetCellClick(\'' + s.t + '\')" title="Voir détail"'
    };
  });

  // Marée (m) — interpolation depuis les hauteurs SHOM
  var tideData = VZ_SHEET.data.tides;
  html += renderRow('Marée (m)', null, function(s) {
    if (!tideData || !tideData.points) return { cls: '', html: '—' };
    var target = s.time.getTime();
    var best = null, bestDiff = Infinity;
    for (var k = 0; k < tideData.points.length; k++) {
      var diff = Math.abs(new Date(tideData.points[k].time).getTime() - target);
      if (diff < bestDiff) { bestDiff = diff; best = tideData.points[k]; }
    }
    if (!best || bestDiff > 1800000) return { cls: '', html: '—' }; // > 30min
    return { cls: '', html: best.height.toFixed(1) };
  });

  // Coef
  html += renderRow('Coef', null, function(s) {
    var c = getCoefForDate(s.time.toISOString().slice(0,10));
    return { cls: coefCls(c), html: '<strong>' + c + '</strong>' };
  });

  // Vent
  html += renderRow('Vent (' + unitLabel + ')', 'vz-cond-row-wind', function(s) {
    var v = h.windspeed_10m[s.i] || 0;
    return { cls: windCls(v), html: conv(v) };
  });

  // Rafales
  html += renderRow('Rafales (' + unitLabel + ')', 'vz-cond-row-gusts', function(s) {
    var v = h.windgusts_10m[s.i] || 0;
    return { cls: windCls(v), html: conv(v) };
  });

  // Direction
  html += renderRow('Direction', null, function(s) {
    return { cls: '', html: dirArrowSvg(h.winddirection_10m[s.i]) };
  });

  // Ciel
  html += renderRow('Ciel', null, function(s) {
    var cloud = h.cloud_cover ? h.cloud_cover[s.i] : null;
    var rain = h.precipitation ? h.precipitation[s.i] : null;
    return { cls: '', html: skyIcon(cloud, rain) };
  });

  html += '</table></div>';

  html += '<div class="vz-cond-footer">'
    + '<span><strong>AROME</strong> 1.3km (0-48h)</span>'
    + '<span><strong>ARPEGE</strong> Europe (48h-5j)</span>'
    + '<span>Marées : SHOM via WorldTides</span>'
    + '<span>Algo visi calibré Courseulles 04/26</span>'
    + '</div>';

  html += '</div>';
  body.innerHTML = html;
}

// Click cellule visi → ouvre drawer spot à la date/heure choisie
window.vzSheetCellClick = function(timeStr) {
  if (!VZ_SHEET.spot) return;
  var spot = VZ_SHEET.spot;
  var latlng = L.latLng(spot.lat, spot.lng);
  if (typeof openSpotPopup === 'function') {
    openSpotPopup(latlng, spot.name);
    setTimeout(function() {
      var dateInput = document.getElementById('spotDate');
      var timeInput = document.getElementById('spotTime');
      if (dateInput && timeInput) {
        // timeStr est au format "2026-04-29T15:00" (heure locale Open-Meteo)
        dateInput.value = timeStr.slice(0, 10);
        var hh = timeStr.slice(11, 13);
        timeInput.value = hh + ':00';
        if (typeof refreshSpotPopup === 'function') {
          // Petit délai pour que l'API spot ait le temps de répondre
          setTimeout(refreshSpotPopup, 600);
        }
      }
    }, 200);
  }
};

function formatSheetDayLabel(date) {
  var jours = ['DIM.', 'LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.'];
  var mois = ['JANV', 'FÉV', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
  return jours[date.getDay()] + ' ' + date.getDate() + ' ' + mois[date.getMonth()];
}
// ============================================================
// MAREES dans le bandeau bas #vzSheet (refonte Talisker)
// Remplace l'ancien drawer 60% à droite #tidesDrawer
// ============================================================

window.openTidesInSheet = function() {
  // Toggle : si déjà en mode tides, on ferme
  if (VZ_SHEET.mode === 'tides') {
    closeTidesInSheet();
    return;
  }

  // Ferme le drawer spot pour libérer toute la largeur
  if (typeof closeSpotPopup === 'function') closeSpotPopup();

  VZ_SHEET.mode = 'tides';
  var sheet = document.getElementById('vzSheet');
  if (sheet) sheet.style.display = '';

  // Sync visuel onglets
  var tabCond = document.getElementById('vzTabCond');
  var tabTides = document.getElementById('vzTabTides');
  if (tabCond) tabCond.classList.remove('active');
  if (tabTides) tabTides.classList.add('active');

  if (VZ_SHEET.state === 'peek') setSheetState('half');

  // Détermine le port le plus proche
  var refLat = null, refLon = null;
  if (S.clickLatLng) {
    refLat = S.clickLatLng.lat;
    refLon = S.clickLatLng.lng;
  } else if (typeof GEO_STATE !== 'undefined' && GEO_STATE.userLatLng) {
    refLat = GEO_STATE.userLatLng.lat;
    refLon = GEO_STATE.userLatLng.lon;
  }

  var port;
  if (refLat !== null) {
    port = findNearestTidePort(refLat, refLon);
  }
  if (!port) {
    var ports = getTidePortsForDrawer();
    port = ports.find(function(p){ return p.id === 'cherbourg'; }) || ports[0];
  }

  if (!port) {
    document.getElementById('vzSheetBody').innerHTML = '<div class="vz-tides-loading">Aucun port trouvé</div>';
    return;
  }

  TIDES_DRAWER.currentPort = port;
  TIDES_DRAWER.isOpen = true;

  // Halo vert sur la carte
  addTidesPortHalo(port.lat, port.lon);

  // Recadre la carte si le port n'est pas visible
  if (S.map) {
    var bounds = S.map.getBounds();
    var portLatLng = L.latLng(port.lat, port.lon);
    if (!bounds.contains(portLatLng)) {
      S.map.panTo(portLatLng, { animate: true, duration: 0.6 });
    }
  }

  // Date du jour
  var today = new Date();
  TIDES_DRAWER.selectedDate = today.toISOString().split('T')[0];

  updateSheetHeader('', '');
  fetchTidesSheetData();
};

window.closeTidesInSheet = function() {
  setSheetState('peek');
  VZ_SHEET.mode = null;
  TIDES_DRAWER.isOpen = false;
  var tabTides = document.getElementById('vzTabTides');
  if (tabTides) tabTides.classList.remove('active');
  var sheet = document.getElementById('vzSheet');
  if (sheet) sheet.style.display = 'none';
  removeTidesPortHalo();
};

function fetchTidesSheetData() {
  var today = new Date();
  TIDES_DRAWER.fromDate = today.toISOString().split('T')[0];

  var body = document.getElementById('vzSheetBody');
  if (body) {
    body.innerHTML = '<div class="vz-tides-loading">Chargement marées...</div>';
  }

  var url = GAS_URL + '?action=tides_range&site=' + TIDES_DRAWER.currentPort.siteId
    + '&from=' + TIDES_DRAWER.fromDate + '&days=' + TIDES_DRAWER.daysToShow;

  fetch(url).then(function(r){ return r.json(); }).then(function(data) {
    if (!data.data || data.error) {
      if (body) body.innerHTML = '<div class="vz-tides-loading" style="color:var(--vz-danger);">Erreur : ' + (data.error || 'pas de données') + '</div>';
      return;
    }
    TIDES_DRAWER.data = data.data;
    TIDES_DRAWER.extremes = data.extremes || [];
    renderTidesSheetContent();
  }).catch(function(err) {
    if (body) body.innerHTML = '<div class="vz-tides-loading" style="color:var(--vz-danger);">Erreur réseau</div>';
  });
}

window.shiftTidesSheetDate = function(delta) {
  var d = new Date(TIDES_DRAWER.selectedDate + 'T12:00:00Z');
  d.setDate(d.getDate() + delta);
  var newDate = d.toISOString().split('T')[0];
  var from = new Date(TIDES_DRAWER.fromDate + 'T00:00:00Z');
  var to = new Date(from);
  to.setDate(to.getDate() + TIDES_DRAWER.daysToShow);
  TIDES_DRAWER.selectedDate = newDate;
  if (d < from || d >= to) {
    fetchTidesSheetData();
  } else {
    renderTidesSheetContent();
  }
};

window.onTidesSheetDateChange = function(newDate) {
  TIDES_DRAWER.selectedDate = newDate;
  var from = new Date(TIDES_DRAWER.fromDate + 'T00:00:00Z');
  var to = new Date(from);
  to.setDate(to.getDate() + TIDES_DRAWER.daysToShow);
  var d = new Date(newDate + 'T12:00:00Z');
  if (d < from || d >= to) {
    fetchTidesSheetData();
  } else {
    renderTidesSheetContent();
  }
};

window.tidesSheetGoToToday = function() {
  var today = new Date();
  TIDES_DRAWER.selectedDate = today.toISOString().split('T')[0];
  renderTidesSheetContent();
};

// ============================================================
// VIZI MARÉES v8 — Refonte hiérarchie + sémantique charte Talisker
//
// Remplace les 2 fonctions ci-dessous dans vizi-app.js :
//   1. renderTidesSheetContent
//   2. renderTidesDateNav  →  renommée + remplacée par renderTidesDateChips
//   3. renderTidesSheetCurve  →  réécrite avec cursor "now" + bandes colorées
//
// Tu peux supprimer aussi l'ancienne fonction renderTidesDateNav
// (remplacée ici par renderTidesDateChips).
// ============================================================

function renderTidesSheetContent() {
  var body = document.getElementById('vzSheetBody');
  if (!body) return;

  var selDate = TIDES_DRAWER.selectedDate;
  var port = TIDES_DRAWER.currentPort;
  if (!port) return;

  var dayPoints = (TIDES_DRAWER.data || []).filter(function(p){ return p.time.slice(0,10) === selDate; });
  var dayExtremes = (TIDES_DRAWER.extremes || []).filter(function(e){ return e.time.slice(0,10) === selDate; });

  if (dayPoints.length === 0) {
    body.innerHTML = '<div class="vz-tides-loading">Aucune donnée pour cette date</div>';
    return;
  }

  var heights = dayPoints.map(function(p){ return p.height; });
  var marnage = Math.max.apply(null, heights) - Math.min.apply(null, heights);
  var coef = getCoefForDate(selDate);
  var color = coefColorV8(coef);
  var isMed = isMediterraneanTidePort(port.siteId);
  var label = coefLabel(coef);
  var description = coefDescription(coef);

  var now = new Date();
  var today = now.toISOString().split('T')[0];
  var isToday = selDate === today;

// ===== Soleil pour filtrer les créneaux nuit =====
  var sunTimes = getSunTimesForDate(selDate);
  function isDaytimeSlot(timeStr) {
    var t = new Date(timeStr);
    var hh = t.getHours();
    var mm = t.getMinutes();
    var slotMinutes = hh * 60 + mm;
    var srParts = sunTimes.sunrise.split(':');
    var ssParts = sunTimes.sunset.split(':');
    if (srParts.length < 2 || ssParts.length < 2) return true;
    var sunriseMin = parseInt(srParts[0]) * 60 + parseInt(srParts[1]);
    var sunsetMin = parseInt(ssParts[0]) * 60 + parseInt(ssParts[1]);
    return slotMinutes >= sunriseMin && slotMinutes <= sunsetMin;
  }

  // ===== Détecter le prochain créneau (uniquement de jour, futur) =====
  var nextExtremeIdx = -1;
  if (dayExtremes && dayExtremes.length > 0) {
    for (var i = 0; i < dayExtremes.length; i++) {
      if (!isDaytimeSlot(dayExtremes[i].time)) continue;
      if (isToday) {
        var endT = new Date(new Date(dayExtremes[i].time).getTime() + 120 * 60000);
        if (endT > now) { nextExtremeIdx = i; break; }
      } else {
        nextExtremeIdx = i;
        break;
      }
    }
  }

  // ===== Phase actuelle (mer montante / descendante) =====
  var phase = computeTidalPhase(dayPoints, now, isToday);

  updateSheetHeader('Marées', port.name);

var html = '<div class="vz-tides-wrap">';

  // ====== COLONNE GAUCHE ======
  html += '<div class="vz-tides-leftcol">';

  // --- Bloc coef ---
  if (isMed) {
    html += '<div class="vz-tides-coefbloc">' +
      '<div class="vz-tides-coefinfo">' +
        '<div class="vz-tides-coeftitle">Méditerranée</div>' +
        '<div class="vz-tides-coefmeta">marnage ' + marnage.toFixed(1) + 'm · marées faibles</div>' +
      '</div>' +
    '</div>';
  } else {
    html += '<div class="vz-tides-coefbloc">' +
      '<div class="vz-tides-coefbig" style="color:' + color + ';border-color:' + color + ';">' + coef + '</div>' +
      '<div class="vz-tides-coefinfo">' +
        '<div class="vz-tides-coeftitle">' + capitalize(label) + '</div>' +
        '<div class="vz-tides-coefmeta">marnage ' + marnage.toFixed(1) + 'm · ' + description.toLowerCase() + '</div>' +
      '</div>' +
    '</div>';
  }

  // --- Date chips ---
  html += renderTidesDateChips(selDate);

  // --- Section title ---
  html += '<div class="vz-tides-sectiontitle">Créneaux chassables</div>';

// --- Grid 2x2 (créneaux jour uniquement, fenêtre ±2h chevauchant le jour ≥30 min) ---
  function slotOverlapsDay(timeStr) {
    var t = new Date(timeStr);
    var startMin = t.getHours() * 60 + t.getMinutes() - 120;
    var endMin = t.getHours() * 60 + t.getMinutes() + 120;
    var srParts = sunTimes.sunrise.split(':');
    var ssParts = sunTimes.sunset.split(':');
    if (srParts.length < 2 || ssParts.length < 2) return true;
    var sunriseMin = parseInt(srParts[0]) * 60 + parseInt(srParts[1]);
    var sunsetMin = parseInt(ssParts[0]) * 60 + parseInt(ssParts[1]);
    var overlap = Math.min(endMin, sunsetMin) - Math.max(startMin, sunriseMin);
    return overlap >= 30;
  }
  var dayOnlyExtremes = dayExtremes.filter(function(e){ return slotOverlapsDay(e.time); });
  if (dayOnlyExtremes && dayOnlyExtremes.length > 0) {
    html += '<div class="vz-tides-windowsgrid">';
    dayOnlyExtremes.forEach(function(e, idx) {
      var etaleTime = new Date(e.time);
      var startTime = new Date(etaleTime.getTime() - 120 * 60000);
      var endTime = new Date(etaleTime.getTime() + 120 * 60000);
      var isPast = isToday && endTime < now;
      var origIdx = dayExtremes.indexOf(e);
      var isNext = (origIdx === nextExtremeIdx);
      var isNight = false;

      var typeColor = e.type === 'high' ? 'var(--vz-accent)' : '#E89B3C';
      var typeShort = e.type === 'high' ? 'PM' : 'BM';
      var startStr = startTime.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
      var endStr = endTime.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
      var etaleStr = etaleTime.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });

      var cardClass = 'vz-tides-windowcard';
      if (isNext) cardClass += ' is-next';
      if (isPast) cardClass += ' is-past';
      if (isNight) cardClass += ' is-night';

      // Badge "PROCHAIN" en débordement
      var nextBadge = isNext ? '<div class="vz-tides-windownext-badge">PROCHAIN</div>' : '';

      // Bouton agenda (icône seule)
      var agendaBtn = isPast ? '' : (
        '<button class="vz-tides-agendabtn" title="Ajouter à l\'agenda" ' +
        'data-etale="' + etaleTime.toISOString() + '" ' +
        'data-type="' + e.type + '" ' +
        'data-start="' + startTime.toISOString() + '" ' +
        'data-end="' + endTime.toISOString() + '" ' +
        'onclick="openAgendaModalFromSheet(this)">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>' +
          '<line x1="16" y1="2" x2="16" y2="6"></line>' +
          '<line x1="8" y1="2" x2="8" y2="6"></line>' +
          '<line x1="3" y1="10" x2="21" y2="10"></line>' +
        '</svg>' +
        '</button>'
      );

      // Footer : chip "Dans X" si prochain et aujourd'hui, "Passé" si passé
      var footerEl = '';
      if (isNext && isToday) {
        var diffMs = startTime.getTime() - now.getTime();
        var inLabel;
        if (diffMs < 0) {
          inLabel = 'EN COURS';
        } else {
          var diffMin = Math.round(diffMs / 60000);
          if (diffMin < 60) {
            inLabel = 'DANS ' + diffMin + ' MIN';
          } else {
            var hours = Math.floor(diffMin / 60);
            var mins = diffMin % 60;
            inLabel = 'DANS ' + hours + 'H' + (mins > 0 ? String(mins).padStart(2, '0') : '');
          }
        }
        footerEl = '<div class="vz-tides-windownow-chip">' + inLabel + '</div>';
      } else if (isPast) {
        footerEl = '<div class="vz-tides-windowpast-tag">Passé</div>';
      }

      html += '<div class="' + cardClass + '">' +
        nextBadge +
        '<div class="vz-tides-windowtop">' +
          '<span class="vz-tides-windowtype" style="color:' + typeColor + ';">' + typeShort + '</span>' +
          '<span class="vz-tides-windowetale">' + etaleStr + '</span>' +
          agendaBtn +
        '</div>' +
        '<div class="vz-tides-windowrange">' +
          '<span class="vz-tides-windowtime">' + startStr + '</span>' +
          '<span class="vz-tides-windowarrow">→</span>' +
          '<span class="vz-tides-windowtime">' + endStr + '</span>' +
        '</div>' +
        footerEl +
      '</div>';
    });
    html += '</div>'; // fin .vz-tides-windowsgrid
  }

  // --- Footer contextuel : phase / courant approx / soleil ---
  html += renderTidesContextFooter(phase, coef, dayPoints, selDate);

  html += '</div>'; // fin .vz-tides-leftcol

  // ====== COLONNE DROITE : courbe ======
  html += renderTidesSheetCurve(dayPoints, dayExtremes, isToday, now, nextExtremeIdx);

  html += '</div>'; // fin .vz-tides-wrap
  body.innerHTML = html;
}

// ============================================================
// Helper : couleur sémantique du coef (charte Talisker)
// <45 = teal calme | 45-70 = jaune | 70-95 = orange vigilance | >95 = rouge danger
// ============================================================
function coefColorV8(coef) {
  if (coef < 45) return '#4DD4A8';
  if (coef < 70) return '#D8C84A';
  if (coef < 95) return '#E89B3C';
  return '#C94A3D';
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================
// Helper : chips de date (Aujourd'hui / Demain / +2j / +3j / +4j / picker)
// ============================================================
function renderTidesDateChips(selDate) {
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var html = '<div class="vz-tides-datechips">';

  var joursShort = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

  for (var offset = 0; offset < 4; offset++) {
    var d = new Date(today.getTime() + offset * 86400000);
    var iso = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    var isActive = (iso === selDate);
    var isToday = (offset === 0);

    var dayNum = d.getDate();
    var dayLabel = (dayNum === 1) ? '1er' : dayNum;
    var chipLabel = joursShort[d.getDay()] + ' ' + dayLabel;
    var subLabel = isToday ? "<span class='vz-tides-datechip-sub'>Aujourd'hui</span>" : '';

    html += '<button class="vz-tides-datechip' + (isActive ? ' active' : '') + (isToday ? ' is-today' : '') + '" ' +
      'onclick="onTidesSheetDateChange(\'' + iso + '\')">' +
      '<span class="vz-tides-datechip-main">' + chipLabel + '</span>' +
      subLabel +
      '</button>';
  }

  // Bouton picker custom
  html += '<label class="vz-tides-datepicker-btn" title="Choisir une date">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>' +
      '<line x1="16" y1="2" x2="16" y2="6"></line>' +
      '<line x1="8" y1="2" x2="8" y2="6"></line>' +
      '<line x1="3" y1="10" x2="21" y2="10"></line>' +
    '</svg>' +
    '<input type="date" value="' + selDate + '" onchange="onTidesSheetDateChange(this.value)">' +
  '</label>';

  html += '</div>';
  return html;
}

// ============================================================
// Helper : phase tidale actuelle
// ============================================================
function computeTidalPhase(dayPoints, now, isToday) {
  if (!isToday || !dayPoints || dayPoints.length < 2) {
    return { type: 'flat', label: '—', icon: 'flat' };
  }
  // Trouver le point le plus proche de maintenant
  var nowMs = now.getTime();
  var bestIdx = -1, bestDelta = Infinity;
  for (var i = 0; i < dayPoints.length; i++) {
    var pMs = new Date(dayPoints[i].time).getTime();
    var d = Math.abs(pMs - nowMs);
    if (d < bestDelta) { bestDelta = d; bestIdx = i; }
  }
  if (bestIdx < 0 || bestIdx >= dayPoints.length - 1) {
    return { type: 'flat', label: '—', icon: 'flat' };
  }
  var nextH = dayPoints[Math.min(bestIdx + 1, dayPoints.length - 1)].height;
  var currH = dayPoints[bestIdx].height;
  if (nextH > currH + 0.05) return { type: 'rising', label: 'Mer montante', icon: 'up' };
  if (nextH < currH - 0.05) return { type: 'falling', label: 'Mer descendante', icon: 'down' };
  return { type: 'flat', label: 'Étale', icon: 'flat' };
}

// ============================================================
// Helper : footer contextuel (phase + courant approx + soleil)
// ============================================================
function renderTidesContextFooter(phase, coef, dayPoints, selDate) {
  // Estimation grossière du courant basée sur le coef
  // (en nœuds, max ~2.5 pour coef 120, min ~0.3 pour coef 20)
  var currentEst = (coef / 120 * 2.2 + 0.3).toFixed(1);

  // Lever / coucher (approx pour la latitude France métropolitaine)
  // Si tu as déjà une fonction getSunTimes(date, lat, lng), utilise-la
  var sunTimes = getSunTimesForDate(selDate);

  var iconSvg;
  if (phase.icon === 'up') {
    iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 16 12 8 18 16"/><line x1="12" y1="8" x2="12" y2="20"/></svg>';
  } else if (phase.icon === 'down') {
    iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 8 12 16 18 8"/><line x1="12" y1="4" x2="12" y2="16"/></svg>';
  } else {
    iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  }

  return '<div class="vz-tides-contextfooter">' +
    '<div class="vz-tides-ctxitem">' +
      '<div class="vz-tides-ctxlabel">Phase</div>' +
      '<div class="vz-tides-ctxvalue">' + iconSvg + '<span>' + phase.label + '</span></div>' +
    '</div>' +
    '<div class="vz-tides-ctxitem">' +
      '<div class="vz-tides-ctxlabel">Courant</div>' +
      '<div class="vz-tides-ctxvalue is-mono">~' + currentEst + ' nœud' + (parseFloat(currentEst) >= 2 ? 's' : '') + '</div>' +
    '</div>' +
    '<div class="vz-tides-ctxitem">' +
      '<div class="vz-tides-ctxlabel">Soleil</div>' +
      '<div class="vz-tides-ctxvalue is-mono">' + sunTimes.sunrise + ' → ' + sunTimes.sunset + '</div>' +
    '</div>' +
  '</div>';
}

// ============================================================
// Helper : approximation lever/coucher soleil (fallback simple)
// Si tu as déjà SunCalc ou une autre API, remplace cette fonction.
// ============================================================
function getSunTimesForDate(isoDate) {
  // Approximation pour latitude France métropolitaine (~47°N)
  // Précision ±15 min, suffisant pour un repère visuel
  try {
    var d = new Date(isoDate + 'T12:00:00Z');
    var dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    // Variation sinusoidale autour du solstice (jour 172 = 21 juin)
    var phase = (dayOfYear - 172) / 365 * 2 * Math.PI;
    var dayLength = 12 + 4.3 * Math.cos(phase); // entre 7.7h (déc) et 16.3h (juin)
    var noonTime = 13.5; // midi solaire approx France été
    var sunrise = noonTime - dayLength / 2;
    var sunset = noonTime + dayLength / 2;
    var fmt = function(h) {
      var hh = Math.floor(h);
      var mm = Math.round((h - hh) * 60);
      if (mm === 60) { hh++; mm = 0; }
      return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    };
    return { sunrise: fmt(sunrise), sunset: fmt(sunset) };
  } catch (e) {
    return { sunrise: '—', sunset: '—' };
  }
}

// ============================================================
// Courbe SVG v8 : cursor "now", bandes ±2h colorées par type, point prochain accentué
// ============================================================
function renderTidesSheetCurve(dayPoints, dayExtremes, isToday, now, nextExtremeIdx) {
  if (!dayPoints || dayPoints.length === 0) return '';

  var w = 1200, h = 520;
  var padL = 56, padR = 24, padT = 50, padB = 70;

  var heights = dayPoints.map(function(p){ return p.height; });
  var maxH = Math.max.apply(null, heights);
  var minH = Math.min.apply(null, heights);
  var rangeH = (maxH - minH) || 1;

  var dayStart = new Date(dayPoints[0].time);
  dayStart.setHours(0, 0, 0, 0);
  var dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
  var totalMs = dayEnd - dayStart;

  // Récupère lever/coucher pour cette date
  var selDate = TIDES_DRAWER.selectedDate;
  var sunTimes = getSunTimesForDate(selDate);
  var srParts = sunTimes.sunrise.split(':');
  var ssParts = sunTimes.sunset.split(':');
  var sunriseMin = parseInt(srParts[0]) * 60 + parseInt(srParts[1]);
  var sunsetMin = parseInt(ssParts[0]) * 60 + parseInt(ssParts[1]);

  function xOf(time) {
    var t = new Date(time).getTime() - dayStart.getTime();
    return padL + (t / totalMs) * (w - padL - padR);
  }
  function xOfMin(min) {
    return padL + (min / 1440) * (w - padL - padR);
  }
  function yOf(height) {
    return padT + (1 - (height - minH) / rangeH) * (h - padT - padB);
  }

  var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:100%;display:block;">';

  // === Defs : gradient sous courbe ===
  svg += '<defs>' +
    '<linearGradient id="vzTideFill" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0%" stop-color="#4DD4A8" stop-opacity="0.32"/>' +
      '<stop offset="100%" stop-color="#4DD4A8" stop-opacity="0.04"/>' +
    '</linearGradient>' +
  '</defs>';

  // === Zones de NUIT (avant lever + après coucher) ===
  // Variables soleil (zones nuit dessinées en overlay tout en bas)
  var xSunrise = xOfMin(sunriseMin);
  var xSunset = xOfMin(sunsetMin);

  // === Grille horizontale (3 lignes) ===
  for (var g = 0; g < 3; g++) {
    var gy = padT + (g / 2) * (h - padT - padB);
    svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '" stroke="rgba(255,255,255,0.05)" stroke-dasharray="2,4"/>';
  }

  // === Bandes ±2h autour des extrêmes (colorées par type, atténuées si nuit) ===
  if (dayExtremes && dayExtremes.length > 0) {
    dayExtremes.forEach(function(e) {
      var et = new Date(e.time);
      var slotMin = et.getHours() * 60 + et.getMinutes();
      var isNight = slotMin < sunriseMin || slotMin > sunsetMin;
      if (isNight) return; // pas de bande sur les créneaux nuit
      var bs = new Date(et.getTime() - 120 * 60000);
      var be = new Date(et.getTime() + 120 * 60000);
      var bx1 = Math.max(padL, xOf(bs));
      var bx2 = Math.min(w - padR, xOf(be));
      if (bx2 <= bx1) return;
      var bandColor = e.type === 'high' ? '#4DD4A8' : '#E89B3C';
      var bandOp = e.type === 'high' ? 0.14 : 0.10;
      svg += '<rect x="' + bx1.toFixed(1) + '" y="' + padT + '" width="' + (bx2 - bx1).toFixed(1) + '" height="' + (h - padT - padB) + '" fill="' + bandColor + '" fill-opacity="' + bandOp + '"/>';
    });
  }

  // === Axe X ===
  svg += '<line x1="' + padL + '" y1="' + (h - padB) + '" x2="' + (w - padR) + '" y2="' + (h - padB) + '" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>';

  // === Construction path courbe ===
  var pathD = '';
  var areaD = '';
  dayPoints.forEach(function(p, i) {
    var x = xOf(p.time);
    var y = yOf(p.height);
    if (i === 0) {
      pathD = 'M ' + x.toFixed(1) + ' ' + y.toFixed(1);
      areaD = 'M ' + x.toFixed(1) + ' ' + (h - padB) + ' L ' + x.toFixed(1) + ' ' + y.toFixed(1);
    } else {
      pathD += ' L ' + x.toFixed(1) + ' ' + y.toFixed(1);
      areaD += ' L ' + x.toFixed(1) + ' ' + y.toFixed(1);
    }
  });
  var lastX = xOf(dayPoints[dayPoints.length - 1].time);
  areaD += ' L ' + lastX.toFixed(1) + ' ' + (h - padB) + ' Z';

  svg += '<path d="' + areaD + '" fill="url(#vzTideFill)"/>';
  svg += '<path d="' + pathD + '" fill="none" stroke="#4DD4A8" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>';

  // === Labels Y (max / mid / min) ===
  svg += '<text x="' + (padL - 12) + '" y="' + (padT + 5) + '" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="14" fill="rgba(255,255,255,0.55)">' + maxH.toFixed(1) + 'm</text>';
  svg += '<text x="' + (padL - 12) + '" y="' + (padT + (h - padT - padB) / 2 + 5) + '" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="14" fill="rgba(255,255,255,0.55)">' + ((maxH + minH) / 2).toFixed(1) + 'm</text>';
  svg += '<text x="' + (padL - 12) + '" y="' + (h - padB + 5) + '" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="14" fill="rgba(255,255,255,0.55)">' + minH.toFixed(1) + 'm</text>';

  // === Labels X (heures) ===
  [0, 3, 6, 9, 12, 15, 18, 21, 24].forEach(function(hr) {
    var x = padL + (hr / 24) * (w - padL - padR);
    svg += '<line x1="' + x.toFixed(1) + '" y1="' + (h - padB) + '" x2="' + x.toFixed(1) + '" y2="' + (h - padB + 6) + '" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>';
    svg += '<text x="' + x.toFixed(1) + '" y="' + (h - padB + 26) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="15" fill="rgba(255,255,255,0.6)" font-weight="500">' + hr + 'h</text>';
  });

// === Cursor NOW (trait teal discret, point sur la courbe) ===
  if (isToday) {
    var nowX = xOf(now);
    if (nowX >= padL && nowX <= w - padR) {
      var nowMs = now.getTime();
      var nowY = padT + (h - padT - padB) / 2;
      for (var k = 0; k < dayPoints.length - 1; k++) {
        var t1 = new Date(dayPoints[k].time).getTime();
        var t2 = new Date(dayPoints[k + 1].time).getTime();
        if (nowMs >= t1 && nowMs <= t2) {
          var ratio = (nowMs - t1) / (t2 - t1);
          var interpH = dayPoints[k].height + ratio * (dayPoints[k + 1].height - dayPoints[k].height);
          nowY = yOf(interpH);
          break;
        }
      }

      svg += '<line x1="' + nowX.toFixed(1) + '" y1="' + padT + '" x2="' + nowX.toFixed(1) + '" y2="' + (h - padB) + '" stroke="#4DD4A8" stroke-width="1.2" opacity="0.55"/>';
      svg += '<circle cx="' + nowX.toFixed(1) + '" cy="' + nowY.toFixed(1) + '" r="6" fill="#4DD4A8" stroke="#0A1520" stroke-width="2"/>';
    }
  }

  // === Points extrêmes + labels (PM teal / BM orange, atténués si nuit) ===
  if (dayExtremes && dayExtremes.length > 0) {
    dayExtremes.forEach(function(e, idx) {
      var x = xOf(e.time);
      var y = yOf(e.height);
      var color = e.type === 'high' ? '#4DD4A8' : '#E89B3C';
      var et = new Date(e.time);
      var slotMin = et.getHours() * 60 + et.getMinutes();
      var isNight = slotMin < sunriseMin || slotMin > sunsetMin;
      var isPast = isToday && new Date(et.getTime() + 120 * 60000) < now;
      var isNext = (idx === nextExtremeIdx);

      var opacity = isNight ? 0.35 : (isPast ? 0.45 : 1);
      var radius = isNext ? 8 : 6;
      var strokeW = isNext ? 3 : 2.5;
      var labelTime = et.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });

      var ty1, ty2;
      if (e.type === 'high') {
        ty1 = y - 28; ty2 = y - 12;
      } else {
        ty1 = y + 36; ty2 = y + 22;
      }
      var fontSize = isNext ? 16 : 14;
      var fontSizeH = isNext ? 13 : 12;

      svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + radius + '" fill="' + color + '" stroke="#0A1520" stroke-width="' + strokeW + '" opacity="' + opacity + '"/>';
      svg += '<text x="' + x.toFixed(1) + '" y="' + ty2.toFixed(1) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="' + fontSize + '" fill="' + color + '" font-weight="700" opacity="' + opacity + '">' + labelTime + '</text>';
      svg += '<text x="' + x.toFixed(1) + '" y="' + ty1.toFixed(1) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="' + fontSizeH + '" fill="' + color + '" opacity="' + (opacity * 0.75) + '">' + e.height.toFixed(1) + 'm</text>';
    });
  }

  // === OVERLAY NUIT (par-dessus la courbe, comme la vraie nuit qui couvre tout) ===
  svg += '<rect x="' + padL + '" y="' + padT + '" width="' + (xSunrise - padL).toFixed(1) + '" height="' + (h - padT - padB) + '" fill="#000" fill-opacity="0.42" pointer-events="none"/>';
  svg += '<rect x="' + xSunset.toFixed(1) + '" y="' + padT + '" width="' + (w - padR - xSunset).toFixed(1) + '" height="' + (h - padT - padB) + '" fill="#000" fill-opacity="0.42" pointer-events="none"/>';

  // Labels lever / coucher (par-dessus l'overlay)
  svg += '<text x="' + xSunrise.toFixed(1) + '" y="' + (padT - 18) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="12" fill="#D8C84A" font-weight="600">☀ ' + sunTimes.sunrise + '</text>';
  svg += '<line x1="' + xSunrise.toFixed(1) + '" y1="' + padT + '" x2="' + xSunrise.toFixed(1) + '" y2="' + (h - padB) + '" stroke="#D8C84A" stroke-width="1" stroke-dasharray="2,3" opacity="0.5"/>';
  svg += '<text x="' + xSunset.toFixed(1) + '" y="' + (padT - 18) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="12" fill="#D8C84A" font-weight="600">☾ ' + sunTimes.sunset + '</text>';
  svg += '<line x1="' + xSunset.toFixed(1) + '" y1="' + padT + '" x2="' + xSunset.toFixed(1) + '" y2="' + (h - padB) + '" stroke="#D8C84A" stroke-width="1" stroke-dasharray="2,3" opacity="0.5"/>';

  svg += '</svg>';

  var legendHtml = '<div class="vz-tides-curvelegend">' +
    '<span><span class="legend-band"></span>±2h étale</span>' +
    '<span><span class="legend-dot" style="background:#4DD4A8;"></span>PM</span>' +
    '<span><span class="legend-dot" style="background:#E89B3C;"></span>BM</span>' +
    '<span style="color:#FBBF24;">☀ jour</span>' +
    '<span style="color:rgba(255,255,255,0.4);">▮ nuit</span>' +
    (isToday ? '<span><span class="legend-line"></span>maintenant</span>' : '') +
  '</div>';

  return '<div class="vz-tides-curvewrap">' +
    '<div class="vz-tides-curveinner">' + svg + '</div>' +
    legendHtml +
  '</div>';
}
console.log('[VZ_SHEET] Bandeau bas Conditions v2 initialisé');
window.closeSheetCompletely = function() {
  var sheet = document.getElementById('vzSheet');
  if (!sheet) return;
  setSheetState('peek');
  sheet.style.display = 'none';
  // Reset des états de tab
  if (typeof VZ_SHEET !== 'undefined') VZ_SHEET.mode = null;
  ['vzTabCond', 'vzTabTides', 'vzTabWebcams'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
};
// Swipe-down pour fermer le bandeau bas (mobile)
(function() {
  var sheet = document.getElementById('vzSheet');
  if (!sheet) return;
  var handle = sheet.querySelector('.vz-sheet-handle');
  if (!handle) return;
  
  var startY = 0;
  var currentY = 0;
  var isDragging = false;
  
  handle.addEventListener('touchstart', function(e) {
    if (sheet.classList.contains('sheet-peek')) return;
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });
  
  handle.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
  }, { passive: true });
  
  handle.addEventListener('touchend', function(e) {
    if (!isDragging) return;
    isDragging = false;
    var deltaY = currentY - startY;
    if (deltaY > 60) {
      // Swipe down > 60px = ferme
      if (sheet.classList.contains('sheet-full')) {
        setSheetState('half');
      } else if (sheet.classList.contains('sheet-half')) {
        closeSheetCompletely();
      }
    }
  }, { passive: true });
})();
// Swipe-down pour fermer le drawer spot (mobile) - écoute sur tout le drawer
(function() {
  var spotDrawer = document.getElementById('spotDrawer');
  if (!spotDrawer) return;
  
  var startY = 0;
  var currentY = 0;
  var isDragging = false;
  var startScrollTop = 0;
  
  spotDrawer.addEventListener('touchstart', function(e) {
    if (window.innerWidth > 768) return;
    if (!spotDrawer.classList.contains('open')) return;
    // On ne tracke que si l'utilisateur est tout en haut du drawer (sinon il scrolle)
    var body = spotDrawer.querySelector('.drawer-body');
    startScrollTop = body ? body.scrollTop : 0;
    if (startScrollTop > 0) return; // si déjà scrollé, on laisse le scroll naturel
    startY = e.touches[0].clientY;
    currentY = startY;
    isDragging = true;
  }, { passive: true });
  
  spotDrawer.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    var deltaY = currentY - startY;
    // Feedback visuel : on suit le doigt légèrement
    if (deltaY > 0) {
      spotDrawer.style.transform = 'translateY(' + Math.min(deltaY, 200) + 'px)';
      spotDrawer.style.transition = 'none';
    }
  }, { passive: true });
  
  spotDrawer.addEventListener('touchend', function(e) {
    if (!isDragging) return;
    isDragging = false;
    var deltaY = currentY - startY;
    // Reset transitions
    spotDrawer.style.transform = '';
    spotDrawer.style.transition = '';
    if (deltaY > 80) {
      closeSpotPopup();
    }
  }, { passive: true });
})();
// ============================================================
// OBSERVATIONS COMMUNAUTAIRES - Affichage carte
// ============================================================

var OBS_MARKERS_LAYER = null;
var OBS_REFRESH_INTERVAL = null;

function loadCommunityObservations() {
  return gasGet('get_observations', {}).then(function(result) {
    if (!result || !result.observations) return;
    renderObservationMarkers(result.observations);
  }).catch(function(err) {
    console.error('Erreur chargement observations:', err);
  });
}

function renderObservationMarkers(observations) {
  if (!S.map) return;
  if (OBS_MARKERS_LAYER) S.map.removeLayer(OBS_MARKERS_LAYER);
  OBS_MARKERS_LAYER = L.layerGroup();

  observations.forEach(function(obs) {
  var ageMs = Date.now() - new Date(obs.timestamp).getTime();
  var ageH = ageMs / (1000 * 60 * 60);
  var freshness = ageH < 6 ? 'fresh' : (ageH < 24 ? 'recent' : 'dated');

  // Couleur selon la visibilité
  var visColor = '#4DD4A8'; // défaut excellent
  var label = obs.visibility_label || '';
  if (/null|nulle/i.test(label)) visColor = '#C94A3D';
  else if (/faible/i.test(label)) visColor = '#E89B3C';
  else if (/moyen/i.test(label)) visColor = '#D8C84A';
  else if (/bonne/i.test(label)) visColor = '#2DA888';
  else if (/excellente/i.test(label)) visColor = '#4DD4A8';
  // Fallback sur visibility_m si label pas reconnu (anciennes obs "1m", "2m", etc.)
  else if (obs.visibility_m <= 1) visColor = '#C94A3D';
  else if (obs.visibility_m <= 2) visColor = '#E89B3C';
  else if (obs.visibility_m <= 4) visColor = '#D8C84A';
  else if (obs.visibility_m <= 6) visColor = '#2DA888';
  else visColor = '#4DD4A8';

  var maskSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';

  var icon = L.divIcon({
    className: 'vz-obs-marker ' + freshness,
    html: '<div class="vz-obs-marker-inner" style="background:' + visColor + '; box-shadow: 0 3px 10px ' + hexToRgba(visColor, 0.5) + ', 0 0 0 4px ' + hexToRgba(visColor, 0.15) + ';">' + maskSvg + '</div>',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  var marker = L.marker([obs.lat, obs.lon], { icon: icon });
  marker.bindPopup(buildObsPopupHTML(obs), {
    className: 'vz-obs-popup',
    maxWidth: 280,
    minWidth: 260,
    closeButton: true,
    autoPan: true
  });
  marker.addTo(OBS_MARKERS_LAYER);
});

  OBS_MARKERS_LAYER.addTo(S.map);
}

function buildObsPopupHTML(obs) {
  var ageMs = Date.now() - new Date(obs.timestamp).getTime();
  var ageH = ageMs / (1000 * 60 * 60);
  var when;
  if (ageH < 1) when = 'Il y a ' + Math.max(1, Math.round(ageH * 60)) + ' min';
  else if (ageH < 24) when = 'Il y a ' + Math.round(ageH) + ' h';
  else when = 'Il y a ' + Math.round(ageH / 24) + ' j';

  var visColor = '#4DD4A8';
  var label = obs.visibility_label || '';
  if (/null|nulle/i.test(label)) visColor = '#C94A3D';
  else if (/faible/i.test(label)) visColor = '#E89B3C';
  else if (/moyen/i.test(label)) visColor = '#D8C84A';
  else if (/bonne/i.test(label)) visColor = '#2DA888';
  else if (/excellente/i.test(label)) visColor = '#4DD4A8';

  var visM = obs.visibility_m ? obs.visibility_m + ' m' : '-';
  var fondClass = obs.bottom_visible ? '' : 'no';
  var fondText = obs.bottom_visible ? '✓ Fond visible' : '✕ Fond invisible';
  var comment = (obs.comment && obs.comment.trim()) ? '<div class="vz-obs-pop-comment">« ' + escapeHtml(obs.comment) + ' »</div>' : '';

  return '<div class="vz-obs-pop-head">' +
           '<div class="vz-obs-pop-pseudo">' + escapeHtml(obs.pseudo || 'Anonyme') + '</div>' +
           '<div class="vz-obs-pop-when">' + when + '</div>' +
         '</div>' +
         '<div class="vz-obs-pop-body">' +
           '<div class="vz-obs-pop-vis" style="color:' + visColor + '">' + (label || '-') + '</div>' +
           '<div class="vz-obs-pop-vis-sub">Visibilite ' + visM + '</div>' +
           '<div class="vz-obs-pop-fond ' + fondClass + '">' + fondText + '</div>' +
           comment +
         '</div>';
}
function hexToRgba(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
// ============================================================
// VISIMER MOCKUP V4 — DRAWER MOBILE (LOGIQUE JS)
// À COLLER à la toute fin de vizi-app.js
// ============================================================

(function() {
  'use strict';

  // === Helpers ===
  function vzmCoefClass(coef) {
    if (coef === null || coef === undefined || isNaN(coef)) return 'vzm-coef-na';
    if (coef >= 95) return 'vzm-coef-very-high';
    if (coef >= 70) return 'vzm-coef-high';
    if (coef >= 45) return 'vzm-coef-low';
    return 'vzm-coef-very-low';
  }

  function vzmVerdictKey(label) {
    if (!label) return 'nulle';
    var l = label.toLowerCase();
    if (l.indexOf('excellente') !== -1) return 'excellente';
    if (l.indexOf('bonne') !== -1) return 'bonne';
    if (l.indexOf('moyenne') !== -1 || l.indexOf('correcte') !== -1) return 'correcte';
    if (l.indexOf('faible') !== -1) return 'faible';
    return 'nulle';
  }

  // Pour la frise : choisit l'étale du jour la plus pertinente (en journée, proche midi)
  function vzmPickDayTide(extremesOfDay) {
    if (!extremesOfDay || extremesOfDay.length === 0) return null;
    function parseHour(t) {
      var d = new Date(t);
      return d.getHours() + d.getMinutes() / 60;
    }
    var dayOnes = extremesOfDay.filter(function(e) {
      var h = parseHour(e.time);
      return h >= 7 && h <= 20;
    });
    if (dayOnes.length === 0) return null;
    if (dayOnes.length === 1) {
      var e = dayOnes[0];
      var d = new Date(e.time);
      return {
        type: e.type,
        time: ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2),
        arrow: e.type === 'high' ? '↑' : '↓'
      };
    }
    // Plusieurs : on prend la plus proche de midi
    dayOnes.sort(function(a, b) {
      return Math.abs(parseHour(a.time) - 12) - Math.abs(parseHour(b.time) - 12);
    });
    var picked = dayOnes[0];
    var pd = new Date(picked.time);
    return {
      type: picked.type,
      time: ('0' + pd.getHours()).slice(-2) + ':' + ('0' + pd.getMinutes()).slice(-2),
      arrow: picked.type === 'high' ? '↑' : '↓'
    };
  }

  // === État interne du drawer mobile ===
  var VZM = {
    selectedDayIndex: -1,
    currentSnap: 'mid',
    forecastDays: []  // les 7 jours pour la frise
  };

  // === Utilité : check si on est en mobile (drawer mobile actif) ===
  function vzmIsActive() {
    return window.innerWidth <= 768;
  }

  // === Mise à jour du hint selon le tier ===
  function vzmUpdateTierHint(snap) {
    var hintText = document.getElementById('vzmTierHintText');
    if (!hintText) return;
    if (snap === 'peek') hintText.textContent = 'Tire vers le haut pour les conditions détaillées';
    else if (snap === 'mid') hintText.textContent = 'Tire encore pour l\'analyse complète';
    else hintText.textContent = '';
  }

  // === Drag handle peek/mid/full ===
  var SNAP_POINTS = { peek: 38, mid: 70, full: 95 };
  var isDragging = false;
  var startY = 0, startTranslate = 0, currentTranslate = 0;
  var velocity = 0, lastY = 0, lastTime = 0;

  function vzmGetTranslateForSnap(snap) {
    var drawer = document.getElementById('spotDrawerMobile');
    if (!drawer) return window.innerHeight;
    if (snap === 'closed') return window.innerHeight;
    return window.innerHeight - (SNAP_POINTS[snap] * window.innerHeight / 100);
  }

  function vzmSetSnap(snap) {
    var drawer = document.getElementById('spotDrawerMobile');
    if (!drawer) return;
    VZM.currentSnap = snap;
    drawer.classList.remove('vzm-peek', 'vzm-mid', 'vzm-full', 'vzm-closed', 'vzm-dragging');
    drawer.classList.add('vzm-' + snap);
    drawer.style.transform = '';
    vzmUpdateTierHint(snap);
  }

  function vzmFindClosestSnap(translate, vel) {
    if (Math.abs(vel) > 0.6) {
      if (vel > 0) {
        if (VZM.currentSnap === 'full') return 'mid';
        if (VZM.currentSnap === 'mid') return 'peek';
        return 'closed';
      } else {
        if (VZM.currentSnap === 'peek') return 'mid';
        if (VZM.currentSnap === 'mid') return 'full';
        return 'full';
      }
    }
    var positions = {
      peek: vzmGetTranslateForSnap('peek'),
      mid: vzmGetTranslateForSnap('mid'),
      full: vzmGetTranslateForSnap('full')
    };
    var closest = 'mid', minDist = Infinity;
    Object.keys(positions).forEach(function(key) {
      var dist = Math.abs(translate - positions[key]);
      if (dist < minDist) { minDist = dist; closest = key; }
    });
    return closest;
  }

  function vzmOnPointerDown(e) {
    if (!vzmIsActive()) return;
    isDragging = true;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    lastY = startY;
    lastTime = Date.now();
    velocity = 0;
    startTranslate = vzmGetTranslateForSnap(VZM.currentSnap);
    var drawer = document.getElementById('spotDrawerMobile');
    if (drawer) drawer.classList.add('vzm-dragging');
    e.preventDefault();
  }

  function vzmOnPointerMove(e) {
    if (!isDragging) return;
    var y = e.touches ? e.touches[0].clientY : e.clientY;
    var now = Date.now();
    var dt = now - lastTime;
    if (dt > 0) velocity = (y - lastY) / dt;
    lastY = y;
    lastTime = now;
    var delta = y - startY;
    currentTranslate = startTranslate + delta;
    var minTranslate = vzmGetTranslateForSnap('full');
    var maxTranslate = window.innerHeight;
    currentTranslate = Math.max(minTranslate, Math.min(maxTranslate, currentTranslate));
    var drawer = document.getElementById('spotDrawerMobile');
    if (drawer) drawer.style.transform = 'translateY(' + currentTranslate + 'px)';
    e.preventDefault();
  }

  function vzmOnPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    var snap = vzmFindClosestSnap(currentTranslate, velocity);
    if (snap === 'closed') {
      // Ferme complètement le drawer (équivalent à closeSpotPopup)
      if (typeof closeSpotPopup === 'function') closeSpotPopup();
      return;
    }
    vzmSetSnap(snap);
  }

  // === Toggle expand d'un jour de la frise ===
  function vzmToggleDayDetail(idx) {
    var detail = document.getElementById('vzmDayDetail');
    if (!detail) return;
    if (VZM.selectedDayIndex === idx) {
      VZM.selectedDayIndex = -1;
      detail.classList.remove('vzm-open');
      document.querySelectorAll('.vzm-day').forEach(function(d) {
        d.classList.remove('vzm-selected');
      });
      return;
    }
    VZM.selectedDayIndex = idx;
    document.querySelectorAll('.vzm-day').forEach(function(d, i) {
      d.classList.toggle('vzm-selected', i === idx);
    });
    var day = VZM.forecastDays[idx];
    if (!day) return;
    var dateObj = new Date(day.dateISO + 'T12:00:00');
    var jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    var mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    document.getElementById('vzmDetailDayLabel').textContent = jours[dateObj.getDay()] + ' ' + dateObj.getDate() + ' ' + mois[dateObj.getMonth()];
    var vizEl = document.getElementById('vzmDetailViz');
    var verdictKey = vzmVerdictKey(day.vizLabel);
    vizEl.textContent = day.vizLabel || '—';
    vizEl.className = 'vzm-day-detail-viz vzm-' + verdictKey;

    var tidesHtml = '';
    if (day.pm) {
      tidesHtml += '<div class="vzm-tide-cell">' +
        '<span class="vzm-tide-icon">↑</span>' +
        '<div class="vzm-tide-info">' +
          '<span class="vzm-tide-type">Pleine mer</span>' +
          '<span class="vzm-tide-time-h">' + day.pm.time + '</span>' +
          '<span class="vzm-tide-h">' + (day.pm.height ? day.pm.height.toFixed(1) + 'm' : '') + '</span>' +
        '</div>' +
      '</div>';
    }
    if (day.bm) {
      tidesHtml += '<div class="vzm-tide-cell">' +
        '<span class="vzm-tide-icon vzm-bm">↓</span>' +
        '<div class="vzm-tide-info">' +
          '<span class="vzm-tide-type">Basse mer</span>' +
          '<span class="vzm-tide-time-h">' + day.bm.time + '</span>' +
          '<span class="vzm-tide-h">' + (day.bm.height ? day.bm.height.toFixed(1) + 'm' : '') + '</span>' +
        '</div>' +
      '</div>';
    }
   document.getElementById('vzmDetailTides').innerHTML = tidesHtml || '<div style="color:var(--vz-text-on-dark-faint);font-size:11px;">Marées non disponibles</div>';
    detail.classList.add('vzm-open');
    
    // CHANTIER MOBILE Commit 2/2 : met à jour le mini-bloc Vent/Houle
    // avec les valeurs du jour sélectionné (créneau BM).
    vzmUpdateConditionsMini(day);
  }
  
  // CHANTIER MOBILE Commit 2/2 : helper pour remplir le mini-bloc
  function vzmUpdateConditionsMini(day) {
    var windEl = document.getElementById('vzmCondWind');
    var swellEl = document.getElementById('vzmCondSwell');
    if (!day) {
      if (windEl) windEl.textContent = '—';
      if (swellEl) swellEl.textContent = '—';
      return;
    }
    // Vent : "O 23 nds (rafales 31)"
    if (windEl) {
      if (day.windData) {
        var w = day.windData;
        var speedKnots = Math.round(w.speed * 0.539957);  // km/h -> nds
        var dirLabel = vzmDirectionToCardinal(w.direction);
        var text = dirLabel + ' ' + speedKnots + ' nds';
        if (w.gusts !== null) {
          var gustsKnots = Math.round(w.gusts * 0.539957);
          text += ' (rafales ' + gustsKnots + ')';
        }
        windEl.textContent = text;
      } else {
        windEl.textContent = '—';
      }
    }
    // Houle : "1.1m · 5.5s"
    if (swellEl) {
      if (day.swellData) {
        var s = day.swellData;
        var text = s.height.toFixed(1) + 'm';
        if (s.period !== null) {
          text += ' · ' + s.period.toFixed(1) + 's';
        }
        swellEl.textContent = text;
      } else {
        swellEl.textContent = '—';
      }
    }
  }
  
  // CHANTIER MOBILE Commit 2/2 : conversion degrés -> point cardinal abrégé
  function vzmDirectionToCardinal(deg) {
    if (deg === null || deg === undefined) return '';
    var dirs = ['N','NE','E','SE','S','SO','O','NO'];
    var idx = Math.round(((deg % 360) / 45)) % 8;
    return dirs[idx];
  }

  // === Construction de la frise 7 jours ===
  // Utilise S_spotWeatherCache (météo) et TIDES.extremes (marées) pour calculer chaque jour
  function vzmBuildForecastDays() {
    if (typeof S_spotWeatherCache === 'undefined' || !S_spotWeatherCache || !S_spotWeatherCache.time) {
      return [];
    }
    var h = S_spotWeatherCache;
    var depth = (typeof S !== 'undefined' && S._spotDepth) ? S._spotDepth : 5;
    var lat = (typeof S !== 'undefined' && S.clickLatLng) ? S.clickLatLng.lat : 49.35;
    var lon = (typeof S !== 'undefined' && S.clickLatLng) ? S.clickLatLng.lng : -0.5;

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var days = [];
    for (var d = 0; d < 7; d++) {
      var date = new Date(today.getTime() + d * 86400000);
      var dateISO = date.getFullYear() + '-' +
        ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
        ('0' + date.getDate()).slice(-2);

   // CHANTIER MOBILE Commit 2/2 : marées du jour AVANT calcul idx
      // ----------------------------------------------------------------
      // On a besoin de bm.time pour calibrer l'idx météo sur le créneau
      // de marée basse (cohérence terrain : la chasse se fait à la BM).
      // Calcul anticipé (déplacé en amont de la logique score) :
      var pmEarly = null, bmEarly = null;
      if (typeof TIDES !== 'undefined' && TIDES.extremes) {
        var dayExtremesEarly = TIDES.extremes.filter(function(e) {
          return e.time.slice(0, 10) === dateISO;
        });
        var pmExEarly = dayExtremesEarly.filter(function(e) { return e.type === 'high'; });
        var bmExEarly = dayExtremesEarly.filter(function(e) { return e.type === 'low'; });
        if (pmExEarly.length > 0) {
          var pdtEarly = new Date(pmExEarly[0].time);
          pmEarly = { time: ('0' + pdtEarly.getHours()).slice(-2) + ':' + ('0' + pdtEarly.getMinutes()).slice(-2), height: pmExEarly[0].height, isoTime: pmExEarly[0].time };
        }
        if (bmExEarly.length > 0) {
          var bdtEarly = new Date(bmExEarly[0].time);
          bmEarly = { time: ('0' + bdtEarly.getHours()).slice(-2) + ':' + ('0' + bdtEarly.getMinutes()).slice(-2), height: bmExEarly[0].height, isoTime: bmExEarly[0].time };
        }
      }
      
      // Indice météo : créneau de la BM si dispo, fallback midi
      var targetMs;
      if (bmEarly && bmEarly.isoTime) {
        targetMs = new Date(bmEarly.isoTime).getTime();
      } else {
        targetMs = new Date(dateISO + 'T12:00:00').getTime();
      }
      var bestIdx = 0, bestDelta = Infinity;
      for (var i = 0; i < h.time.length; i++) {
        var diff = Math.abs(new Date(h.time[i]).getTime() - targetMs);
        if (diff < bestDelta) { bestDelta = diff; bestIdx = i; }
      }
      
      // Score V4 calculé au créneau BM (chaîne 9 briques)
      var score = (typeof computeVisibilityScore_V4 === 'function')
        ? computeVisibilityScore_V4(h, bestIdx, depth, lat, lon).score
        : 50;
      
      // CHANTIER MOBILE Commit 2/2 : capture Vent + Houle au même idx
      // ----------------------------------------------------------------
      // Le mini-bloc Vent + Houle dans le tier peek doit afficher les
      // valeurs au créneau de chasse (BM), pas à midi. Idem si l'utilisateur
      // tape sur un autre jour : valeurs prévues à la BM de ce jour.
      var windData = null, swellData = null;
      if (h.windspeed_10m && h.winddirection_10m && h.windspeed_10m[bestIdx] !== null) {
        windData = {
          speed: h.windspeed_10m[bestIdx],
          direction: h.winddirection_10m[bestIdx],
          gusts: (h.windgusts_10m && h.windgusts_10m[bestIdx] !== null) ? h.windgusts_10m[bestIdx] : null
        };
      }
      if (typeof S_spotMarineCache !== 'undefined' && S_spotMarineCache && S_spotMarineCache.wave_height) {
        // Trouve l'idx marine équivalent au targetMs (les arrays peuvent différer)
        var marineIdx = -1;
        var bestMarineDelta = Infinity;
        if (S_spotMarineCache.time) {
          for (var mi = 0; mi < S_spotMarineCache.time.length; mi++) {
            var mdiff = Math.abs(new Date(S_spotMarineCache.time[mi]).getTime() - targetMs);
            if (mdiff < bestMarineDelta) { bestMarineDelta = mdiff; marineIdx = mi; }
          }
        }
        if (marineIdx >= 0 && S_spotMarineCache.wave_height[marineIdx] !== null && S_spotMarineCache.wave_height[marineIdx] !== undefined) {
          swellData = {
            height: S_spotMarineCache.wave_height[marineIdx],
            period: (S_spotMarineCache.wave_period && S_spotMarineCache.wave_period[marineIdx] !== null) ? S_spotMarineCache.wave_period[marineIdx] : null
          };
        }
      }
      var vizLabel, vizKey;
      if (score >= 80) { vizLabel = 'Excellente'; vizKey = 'excellente'; }
      else if (score >= 60) { vizLabel = 'Bonne'; vizKey = 'bonne'; }
      else if (score >= 40) { vizLabel = 'Moyenne'; vizKey = 'correcte'; }
      else if (score >= 20) { vizLabel = 'Faible'; vizKey = 'faible'; }
      else { vizLabel = 'Nulle'; vizKey = 'nulle'; }

      // Coef du jour
      var coef = null;
      if (typeof getCoefForDate === 'function') {
        try { coef = getCoefForDate(dateISO); } catch(e) { coef = null; }
      }

// Marées du jour : variables pmEarly/bmEarly déjà calculées plus haut
      // (besoin anticipé pour calibrer bestIdx sur la BM). On les renomme.
      var pm = pmEarly, bm = bmEarly;

      // Tide pour la frise (étale principale en journée)
      var tideForFrise = null;
      if (typeof TIDES !== 'undefined' && TIDES.extremes) {
        var dayExt = TIDES.extremes.filter(function(e) {
          return e.time.slice(0, 10) === dateISO;
        });
        tideForFrise = vzmPickDayTide(dayExt);
      }

days.push({
        dateISO: dateISO,
        dayLabel: ['DIM','LUN','MAR','MER','JEU','VEN','SAM'][date.getDay()],
        dayNum: ('0' + date.getDate()).slice(-2),
        score: score,
        vizLabel: vizLabel,
        vizKey: vizKey,
        coef: coef,
        pm: pm,
        bm: bm,
        tideForFrise: tideForFrise,
        bestIdx: bestIdx,
        windData: windData,
        swellData: swellData
      });
    }
    return days;
  }

  // === Rendu de la frise 7 jours ===
function vzmRenderForecast() {
    var grid = document.getElementById('vzmForecastGrid');
    if (!grid) return;
    VZM.forecastDays = vzmBuildForecastDays();
    grid.innerHTML = '';
    
    // CHANTIER MOBILE Commit 2/2 : remplit le mini-bloc avec aujourd'hui
    // par défaut (créneau BM). L'utilisateur peut taper sur un autre jour
    // pour réactualiser le mini-bloc.
    if (VZM.forecastDays.length > 0 && typeof vzmUpdateConditionsMini === 'function') {
      vzmUpdateConditionsMini(VZM.forecastDays[0]);
    }
    VZM.forecastDays.forEach(function(day, i) {
      var cClass = vzmCoefClass(day.coef);
      var coefDisplay = (day.coef === null || day.coef === undefined) ? '—' : day.coef;
      var tideHtml = '';
      if (day.tideForFrise) {
        tideHtml = '<div class="vzm-day-tide">' +
          '<span class="vzm-day-tide-arrow ' + (day.tideForFrise.type === 'low' ? 'vzm-bm' : '') + '">' + day.tideForFrise.arrow + '</span>' +
          day.tideForFrise.time +
        '</div>';
      } else {
        tideHtml = '<div class="vzm-day-tide-empty">—</div>';
      }
      var el = document.createElement('div');
      el.className = 'vzm-day' + (i === 0 ? ' vzm-today' : '') + (i === VZM.selectedDayIndex ? ' vzm-selected' : '');
      el.innerHTML =
        '<div class="vzm-day-name">' + day.dayLabel + '</div>' +
        '<div class="vzm-day-date">' + day.dayNum + '</div>' +
        '<div class="vzm-day-pill vzm-' + day.vizKey + '"></div>' +
        '<div class="vzm-day-coef ' + cClass + '">' + coefDisplay + '</div>' +
        tideHtml;
      el.addEventListener('click', function() { vzmToggleDayDetail(i); });
      grid.appendChild(el);
    });
  }

  // === Rendu de la phrase explicative dans le verdict ===
  function vzmBuildVerdictExplain(score, depth, wind, gusts, dir, dirFactor) {
    var fromNames = ['N','NE','E','SE','S','SO','O','NO'];
    var dirName = (dir !== null && dir !== undefined) ? fromNames[Math.round(dir / 45) % 8] : '?';
    var windKt = (typeof toKt === 'function') ? toKt(wind) : Math.round(wind * 0.539957);

    var parts = [];
    // Vent
    if (windKt >= 15) parts.push('<strong>vent ' + dirName + ' de ' + windKt + ' nœuds</strong>');
    else if (windKt >= 10) parts.push('<strong>vent ' + dirName + ' modéré (' + windKt + ' nds)</strong>');
    else if (windKt > 0) parts.push('vent ' + dirName + ' faible (' + windKt + ' nds)');

    // Profondeur
    var depthInt = Math.round(depth);
    if (depth <= 5) parts.push('fond peu profond (' + depthInt + 'm)');
    else if (depth <= 10) parts.push('fond moyen (' + depthInt + 'm)');
    else parts.push('fond profond (' + depthInt + 'm)');

    // Verdict
    var verdict;
    if (score >= 80) {
      verdict = 'Conditions optimales : ' + parts.join(', ') + '. C\'est le moment de sortir.';
    } else if (score >= 60) {
      verdict = 'Bonnes conditions : ' + parts.join(', ') + '. Spot chassable.';
    } else if (score >= 40) {
      verdict = 'Conditions moyennes : ' + parts.join(', ') + '. Visi limitée mais possible.';
    } else if (score >= 20) {
      verdict = 'Conditions faibles : ' + parts.join(', ') + '. Visi très limitée.';
    } else {
      verdict = 'Conditions défavorables : ' + parts.join(', ') + '. Mieux vaut attendre.';
    }
    return verdict;
  }

  // === Rendu du bloc "Pourquoi cette visi" ===
  function vzmBuildExplainContent(score, depth, wind, gusts, dir, dirFactor, lat, lon) {
    var fromNames = ['N','NE','E','SE','S','SO','O','NO'];
    var dirName = (dir !== null && dir !== undefined) ? fromNames[Math.round(dir / 45) % 8] : '?';
    var windKt = (typeof toKt === 'function') ? toKt(wind) : Math.round(wind * 0.539957);

    var windQual;
    if (windKt < 10) windQual = 'faible';
    else if (windKt < 15) windQual = 'modéré';
    else if (windKt < 22) windQual = 'soutenu';
    else windQual = 'fort';

    var dirQual, dirImpact;
    if (dirFactor < 0.4) {
      dirQual = '<strong>offshore</strong> (de la terre vers la mer)';
      dirImpact = 'protège la côte, l\'eau reste relativement claire malgré le vent';
    } else if (dirFactor < 0.85) {
      dirQual = '<strong>latéral</strong> à la côte';
      dirImpact = 'agite la surface mais brasse moins le sédiment';
    } else {
      dirQual = '<strong>onshore</strong> (de la mer vers la côte)';
      dirImpact = 'pousse la houle directement contre le fond, brasse fort';
    }

    var depthQual, depthImpact;
    if (depth <= 2) {
      depthQual = '<strong>très peu profond</strong> (' + Math.round(depth) + 'm)';
      depthImpact = 'la moindre agitation se transmet au sédiment (amplification ×4)';
    } else if (depth <= 5) {
      depthQual = '<strong>peu profond</strong> (' + Math.round(depth) + 'm)';
      depthImpact = 'le brassage atteint le fond facilement (amplification ×3)';
    } else if (depth <= 10) {
      depthQual = '<strong>moyen</strong> (' + Math.round(depth) + 'm)';
      depthImpact = 'le sédiment est moins remué (amplification ×2)';
    } else if (depth <= 20) {
      depthQual = '<strong>profond</strong> (' + Math.round(depth) + 'm)';
      depthImpact = 'l\'agitation se dissipe avant d\'atteindre le fond';
    } else {
      depthQual = '<strong>très profond</strong> (' + Math.round(depth) + 'm)';
      depthImpact = 'l\'eau reste claire même par vent soutenu';
    }

    var brassageMsg;
    if (score < 40) {
      brassageMsg = 'Le vent souffle dans cette config depuis plusieurs heures. L\'énergie de brassage s\'est <strong>accumulée</strong> dans la colonne d\'eau et n\'a pas eu le temps de décanter.';
    } else if (score < 60) {
      brassageMsg = 'Le brassage des dernières heures laisse encore des particules en suspension. La décantation est en cours.';
    } else if (score < 80) {
      brassageMsg = 'L\'eau a eu le temps de décanter en partie. Les conditions s\'améliorent.';
    } else {
      brassageMsg = 'Aucun brassage récent significatif. L\'eau a eu le temps de se clarifier.';
    }

    var verdictMsg;
    if (score >= 80) verdictMsg = 'Conditions <strong>excellentes</strong>. C\'est le moment de sortir.';
    else if (score >= 60) verdictMsg = 'Conditions <strong>bonnes</strong>. Spot chassable, visi suffisante pour traquer.';
    else if (score >= 40) verdictMsg = 'Conditions <strong>moyennes</strong>. Visi limitée mais ça reste possible si tu connais ton spot.';
    else if (score >= 20) verdictMsg = 'Conditions <strong>faibles</strong>. Cherche un spot plus profond ou attends que le vent tombe.';
    else verdictMsg = 'Conditions <strong>nulles</strong>. Pas la peine de mouiller la combi ici. Cherche un spot offshore ou attends l\'accalmie.';

    return {
      wind: 'Vent de <strong>' + dirName + ' à ' + windKt + ' nds</strong>, ' + windQual + '. Sur ce point, il arrive ' + dirQual + ' : il ' + dirImpact + '.',
      bottom: 'Tu es sur un fond ' + depthQual + '. ' + depthImpact + '.',
      brassage: brassageMsg,
      verdict: verdictMsg
    };
  }

  // === Rendu du bloc Marées de la semaine ===
  function vzmRenderWeekTides() {
    var container = document.getElementById('vzmWeektidesContent');
    if (!container) return;
    container.innerHTML = '';
    if (!VZM.forecastDays || VZM.forecastDays.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:var(--vz-text-on-dark-faint);font-size:11px;padding:12px;">Marées non disponibles</div>';
      return;
    }
    VZM.forecastDays.forEach(function(day) {
      var cClass = vzmCoefClass(day.coef);
      var coefDisplay = (day.coef === null || day.coef === undefined) ? 'N/A' : day.coef;
      var pmStr = day.pm ? ('<span class="vzm-weektide-time"><span class="vzm-weektide-arrow">↑</span>' + day.pm.time + '</span>') : '';
      var bmStr = day.bm ? ('<span class="vzm-weektide-time"><span class="vzm-weektide-arrow vzm-bm">↓</span>' + day.bm.time + '</span>') : '';
      var row = document.createElement('div');
      row.className = 'vzm-weektide-day';
      row.innerHTML =
        '<div class="vzm-weektide-date">' +
          '<span class="vzm-weektide-name">' + day.dayLabel + '</span>' +
          '<span class="vzm-weektide-num">' + day.dayNum + '</span>' +
        '</div>' +
        '<div class="vzm-weektide-coef ' + cClass + '">' + coefDisplay + '</div>' +
        '<div class="vzm-weektide-times">' + pmStr + bmStr + '</div>';
      container.appendChild(row);
    });
  }

  // === Rendu principal du drawer mobile ===
  // À appeler depuis renderSpotPopup() existant après que les données soient prêtes
  window.vzmRenderSpotMobile = function() {
    if (!vzmIsActive()) return;
    var drawer = document.getElementById('spotDrawerMobile');
    if (!drawer) return;

    // Récupère les valeurs déjà calculées dans le drawer desktop (par renderSpotPopup)
    var visLabel = document.getElementById('spotVisLabel');
    var spotWindSpeed = document.getElementById('spotWindSpeed');
    var spotWindGusts = document.getElementById('spotWindGusts');
    var spotWindDeg = document.getElementById('spotWindDeg');
    var spotDepth = document.getElementById('spotDepthVal');
    var spotCoef = document.getElementById('spotCoefVal');
    var spotCoefDesc = document.getElementById('spotCoefDesc');
    var spotSeaTemp = document.getElementById('spotSeaTemp');

    var label = visLabel ? visLabel.textContent.trim() : '—';
    var verdictKey = vzmVerdictKey(label);

    // Header spot
    var titleEl = document.getElementById('vzmSpotTitle');
    if (titleEl) {
      var title = 'Point en mer';
      if (S && S.clickLatLng) {
        // Cherche un nom de port proche
        if (typeof findNearestPort === 'function') {
          var near = findNearestPort(S.clickLatLng.lat, S.clickLatLng.lng);
          if (near && near.spot && near.distanceKm < 5) {
            title = near.spot.name;
          } else if (near) {
            title = 'Point en mer';
          }
        }
      }
      titleEl.textContent = title;
    }
    var distEl = document.getElementById('vzmSpotDistance');
    if (distEl && S && S.clickLatLng && typeof findNearestPort === 'function') {
      var n = findNearestPort(S.clickLatLng.lat, S.clickLatLng.lng);
      distEl.textContent = n ? (n.distanceKm.toFixed(1) + ' KM') : '—';
    }

    // Verdict
    var verdict = document.getElementById('vzmVerdict');
    if (verdict) {
      verdict.classList.remove('vzm-nulle','vzm-faible','vzm-correcte','vzm-moyenne','vzm-bonne','vzm-excellente');
      verdict.classList.add('vzm-' + verdictKey);
    }
    var badge = document.getElementById('vzmVerdictBadge');
    if (badge) badge.textContent = label;

// Visi en mètres : valeur réelle écrite plus bas, une fois scoreResult calculé.

    // Calcul des params pour la phrase explicative
    var depth = (S && S._spotDepth) ? S._spotDepth : 5;
    var lat = (S && S.clickLatLng) ? S.clickLatLng.lat : 49.35;
    var lon = (S && S.clickLatLng) ? S.clickLatLng.lng : -0.5;
    var wind = 0, gusts = 0, dir = null, dirFactor = 1.0, score = 50, scoreResult = null;
    if (S_spotWeatherCache) {
      var dateVal = document.getElementById('spotDate') ? document.getElementById('spotDate').value : '';
      var timeVal = document.getElementById('spotTime') ? document.getElementById('spotTime').value : '12:00';
      var targetStr = dateVal + 'T' + timeVal;
      var idx = 0, best = Infinity;
      S_spotWeatherCache.time.forEach(function(t, i) {
        var d = Math.abs(new Date(t) - new Date(targetStr));
        if (d < best) { best = d; idx = i; }
      });
      wind = Math.round(S_spotWeatherCache.windspeed_10m[idx] || 0);
      gusts = Math.round(S_spotWeatherCache.windgusts_10m[idx] || 0);
      dir = S_spotWeatherCache.winddirection_10m[idx];
      if (typeof getDirFactorForPoint === 'function') {
        dirFactor = getDirFactorForPoint(dir, lat, lon);
      }
    // Patch visi réelle : on garde l'objet complet, pas juste .score.
      if (typeof computeVisibilityScore_V4 === 'function') {
        scoreResult = computeVisibilityScore_V4(S_spotWeatherCache, idx, depth, lat, lon);
        score = scoreResult.score;
      }
    }

    // Verdict en mètres : vraie valeur (Coriolis > chaîne > empirique).
    var valueEl = document.getElementById('vzmVerdictValue');
    if (valueEl) valueEl.textContent = vzmFormatVisiM(vzmGetVisiM(scoreResult));

    // Phrase explicative
    var explainEl = document.getElementById('vzmVerdictExplain');
    if (explainEl) {
      explainEl.innerHTML = vzmBuildVerdictExplain(score, depth, wind, gusts, dir, dirFactor);
    }

    // Stats grid
    var unitLabel = (typeof S_windUnit !== 'undefined' && S_windUnit === 'kt') ? 'nœuds' : 'km/h';
    var conv = function(v) {
      return (typeof S_windUnit !== 'undefined' && S_windUnit === 'kt' && typeof toKt === 'function') ? toKt(v) : Math.round(v);
    };
    var setText = function(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
    setText('vzmStatWind', conv(wind));
    setText('vzmStatWindUnit', unitLabel);
    setText('vzmStatGusts', conv(gusts));
    setText('vzmStatGustsUnit', unitLabel);

    var fromNames = ['N','NE','E','SE','S','SO','O','NO'];
    if (dir !== null && dir !== undefined) {
      var dirArrow = document.getElementById('vzmStatDir');
      if (dirArrow) {
        dirArrow.innerHTML = '<svg width="22" height="22" viewBox="0 0 20 20" style="transform:rotate(' + dir + 'deg);display:inline-block;vertical-align:middle;">' +
          '<path d="M10 2 L10 16 M10 16 L6 12 M10 16 L14 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>' +
          '</svg>';
      }
      setText('vzmStatDirLabel', fromNames[Math.round(dir / 45) % 8] + ' ' + Math.round(dir) + '°');
    } else {
      setText('vzmStatDir', '—');
      setText('vzmStatDirLabel', '—');
    }
    setText('vzmStatDepth', '~' + Math.round(depth));
    setText('vzmStatCoef', spotCoef ? spotCoef.textContent : '—');
    setText('vzmStatCoefDesc', spotCoefDesc ? spotCoefDesc.textContent : '');
    setText('vzmStatTemp', spotSeaTemp ? spotSeaTemp.textContent : '—');

    // Bloc Pourquoi
    var explainBlock = vzmBuildExplainContent(score, depth, wind, gusts, dir, dirFactor, lat, lon);
    var setHTML = function(id, v) { var el = document.getElementById(id); if (el) el.innerHTML = v; };
    setHTML('vzmExplainWind', explainBlock.wind);
    setHTML('vzmExplainBottom', explainBlock.bottom);
    setHTML('vzmExplainBrassage', explainBlock.brassage);
    setHTML('vzmExplainVerdict', explainBlock.verdict);

    // Frise + marées semaine
    vzmRenderForecast();
    vzmRenderWeekTides();
  };

  // === Ouverture/fermeture du drawer mobile ===
  // Hook sur openSpotPopup et closeSpotPopup existants
  var _origOpenSpot = window.openSpotPopup;
  window.openSpotPopup = function(latlng, name) {
    if (typeof _origOpenSpot === 'function') _origOpenSpot.call(this, latlng, name);
    if (vzmIsActive()) {
      var drawer = document.getElementById('spotDrawerMobile');
      if (drawer) {
        drawer.classList.remove('vzm-closed');
        if (!drawer.classList.contains('vzm-peek') && !drawer.classList.contains('vzm-mid') && !drawer.classList.contains('vzm-full')) {
          drawer.classList.add('vzm-mid');
          VZM.currentSnap = 'mid';
        }
        vzmUpdateTierHint(VZM.currentSnap);
      }
    }
  };

  var _origCloseSpot = window.closeSpotPopup;
  window.closeSpotPopup = function() {
    if (typeof _origCloseSpot === 'function') _origCloseSpot.call(this);
    var drawer = document.getElementById('spotDrawerMobile');
    if (drawer) {
      drawer.classList.remove('vzm-peek','vzm-mid','vzm-full');
      drawer.classList.add('vzm-closed');
      VZM.currentSnap = 'closed';
      VZM.selectedDayIndex = -1;
      var detail = document.getElementById('vzmDayDetail');
      if (detail) detail.classList.remove('vzm-open');
    }
  };

  // === Hook sur renderSpotPopup pour synchroniser le drawer mobile ===
  var _origRenderSpot = window.renderSpotPopup;
  window.renderSpotPopup = function() {
    if (typeof _origRenderSpot === 'function') _origRenderSpot.apply(this, arguments);
    if (typeof window.vzmRenderSpotMobile === 'function') {
      try { window.vzmRenderSpotMobile(); } catch(e) { console.warn('[vzm] render mobile failed:', e); }
    }
  };

  // === Sections repliables (toggle générique) ===
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.vzm-section-toggle');
    if (!btn) return;
    var section = btn.closest('.vzm-section');
    if (section) section.classList.toggle('vzm-open');
  });

  // === Init au DOMContentLoaded ===
function vzmInit() {
    // PATCH : drag géré par PATCH 6, on garde juste l'état initial fermé
    var drawer = document.getElementById('spotDrawerMobile');
    if (!drawer) {
      setTimeout(vzmInit, 200);
      return;
    }
    drawer.classList.remove('vzm-mid');
    drawer.classList.add('vzm-closed');
    VZM.currentSnap = 'closed';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', vzmInit);
  } else {
    vzmInit();
  }

})();
// ============================================================
// VISIMER PATCH 2 — Ouverture en peek + handle toujours accessible
// À COLLER à la toute fin de vizi-app.js (après PATCH_DRAG.js)
// ============================================================

(function() {
  'use strict';

  function vzmPatch2() {
    var drawer = document.getElementById('spotDrawerMobile');
    if (!drawer) {
      setTimeout(vzmPatch2, 200);
      return;
    }

    // === 1. Ouvrir en PEEK par défaut au lieu de MID ===
    var _origOpen = window.openSpotPopup;
    window.openSpotPopup = function(latlng, name) {
      if (typeof _origOpen === 'function') _origOpen.call(this, latlng, name);
      if (window.innerWidth > 768) return;
      var d = document.getElementById('spotDrawerMobile');
      if (d) {
        d.classList.remove('vzm-closed', 'vzm-mid', 'vzm-full');
        d.classList.add('vzm-peek');
        d.style.transform = '';
        var hint = document.getElementById('vzmTierHintText');
        if (hint) hint.textContent = 'Tire vers le haut pour les conditions détaillées';
      }
    };

    // === 2. Handle plus gros et toujours accessible ===
    var handle = document.getElementById('vzmHandle');
    if (handle) {
      handle.style.height = '40px';
      handle.style.position = 'relative';
      handle.style.zIndex = '10';
      handle.style.touchAction = 'none';
      handle.style.flexShrink = '0';
    }

    // === 3. Bouton close prioritaire ===
    var closeBtn = drawer.querySelector('.vzm-close');
    if (closeBtn) {
      closeBtn.style.zIndex = '20';
      closeBtn.style.touchAction = 'manipulation';
    }

    // === 4. Scroll containment pour pas bloquer le drag ===
    var content = drawer.querySelector('.vzm-content');
    if (content) {
      content.style.overscrollBehavior = 'contain';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', vzmPatch2);
  } else {
    vzmPatch2();
  }
})();
// ============================================================
// VISIMER PATCH 5 JS — Limite le drag à mid (suppression de full)
// ============================================================

(function() {
  'use strict';

  function vzmPatch5() {
    var drawer = document.getElementById('spotDrawerMobile');
    if (!drawer) {
      setTimeout(vzmPatch5, 200);
      return;
    }

    var headerZone = drawer.querySelector('.vzm-spot-header');
    if (!headerZone) return;

    var newHeader = headerZone.cloneNode(true);
    headerZone.parentNode.replaceChild(newHeader, headerZone);

    var startY = 0, startTranslate = 0, isDragging = false;
    var velocity = 0, lastY = 0, lastTime = 0;

    function getTranslate(snap) {
      if (snap === 'closed') return window.innerHeight;
      var pts = { peek: 38, mid: 70 };
      var vh = window.innerHeight;
      return vh - (pts[snap] * vh / 100);
    }

    function getCurrentSnap() {
      if (drawer.classList.contains('vzm-peek')) return 'peek';
      return 'mid';
    }

    function findClosestSnap(translate, vel) {
      var current = getCurrentSnap();
      if (vel > 0.5) {
        if (current === 'mid') return 'peek';
        return 'closed';
      }
      if (vel < -0.5) {
        return 'mid';
      }
      var positions = {
        peek: getTranslate('peek'),
        mid: getTranslate('mid')
      };
      return Math.abs(translate - positions.peek) < Math.abs(translate - positions.mid) ? 'peek' : 'mid';
    }

    newHeader.addEventListener('touchstart', function(e) {
      if (e.target.closest('button')) return;
      isDragging = true;
      startY = e.touches[0].clientY;
      lastY = startY;
      lastTime = Date.now();
      velocity = 0;
      startTranslate = getTranslate(getCurrentSnap());
      drawer.classList.add('vzm-dragging');
    }, { passive: true });

    newHeader.addEventListener('touchmove', function(e) {
      if (!isDragging) return;
      var y = e.touches[0].clientY;
      var now = Date.now();
      var dt = now - lastTime;
      if (dt > 0) velocity = (y - lastY) / dt;
      lastY = y;
      lastTime = now;
      var delta = y - startY;
      var newTranslate = startTranslate + delta;
      var minT = getTranslate('mid');
      newTranslate = Math.max(minT, Math.min(window.innerHeight, newTranslate));
      drawer.style.transform = 'translateY(' + newTranslate + 'px)';
      e.preventDefault();
    }, { passive: false });

    newHeader.addEventListener('touchend', function() {
      if (!isDragging) return;
      isDragging = false;
      drawer.classList.remove('vzm-dragging');
      var currentTranslate = parseFloat((drawer.style.transform || '').replace(/[^\d.-]/g, '')) || getTranslate(getCurrentSnap());
      var snap = findClosestSnap(currentTranslate, velocity);
      if (snap === 'closed') {
        if (typeof closeSpotPopup === 'function') closeSpotPopup();
        return;
      }
      drawer.classList.remove('vzm-peek', 'vzm-mid', 'vzm-full');
      drawer.classList.add('vzm-' + snap);
      drawer.style.transform = '';
    });

    var handle = document.getElementById('vzmHandle');
    if (handle) {
      var newHandle = handle.cloneNode(true);
      handle.parentNode.replaceChild(newHandle, handle);

      newHandle.addEventListener('touchstart', function(e) {
        isDragging = true;
        startY = e.touches[0].clientY;
        lastY = startY;
        lastTime = Date.now();
        velocity = 0;
        startTranslate = getTranslate(getCurrentSnap());
        drawer.classList.add('vzm-dragging');
        e.preventDefault();
      }, { passive: false });

      newHandle.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        var y = e.touches[0].clientY;
        var now = Date.now();
        var dt = now - lastTime;
        if (dt > 0) velocity = (y - lastY) / dt;
        lastY = y;
        lastTime = now;
        var delta = y - startY;
        var newTranslate = startTranslate + delta;
        var minT = getTranslate('mid');
        newTranslate = Math.max(minT, Math.min(window.innerHeight, newTranslate));
        drawer.style.transform = 'translateY(' + newTranslate + 'px)';
        e.preventDefault();
      }, { passive: false });

      newHandle.addEventListener('touchend', function() {
        if (!isDragging) return;
        isDragging = false;
        drawer.classList.remove('vzm-dragging');
        var currentTranslate = parseFloat((drawer.style.transform || '').replace(/[^\d.-]/g, '')) || getTranslate(getCurrentSnap());
        var snap = findClosestSnap(currentTranslate, velocity);
        if (snap === 'closed') {
          if (typeof closeSpotPopup === 'function') closeSpotPopup();
          return;
        }
        drawer.classList.remove('vzm-peek', 'vzm-mid', 'vzm-full');
        drawer.classList.add('vzm-' + snap);
        drawer.style.transform = '';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', vzmPatch5);
  } else {
    vzmPatch5();
  }
})();
// ============================================================
// VISIMER PATCH 6 — Drag propre 2 tiers (remplace définitivement)
// À COLLER à la toute fin de vizi-app.js (après PATCH 5)
// ============================================================

(function() {
  'use strict';

  // On attend que le DOM soit prêt ET que les patchs précédents aient fini
  function vzmPatch6() {
    var drawer = document.getElementById('spotDrawerMobile');
    if (!drawer) {
      setTimeout(vzmPatch6, 200);
      return;
    }

    // === ÉTAPE 1 : Détruire complètement les anciens handle et header (avec leurs listeners) ===
    // On clone les éléments parents pour casser TOUS les listeners attachés
    var oldHandle = document.getElementById('vzmHandle');
    var oldHeader = drawer.querySelector('.vzm-spot-header');
    
    if (oldHandle) {
      var newHandle = oldHandle.cloneNode(true);
      oldHandle.parentNode.replaceChild(newHandle, oldHandle);
    }
    if (oldHeader) {
      var newHeader = oldHeader.cloneNode(true);
      oldHeader.parentNode.replaceChild(newHeader, oldHeader);
    }

    // Récupère les nouveaux éléments propres
    var handle = document.getElementById('vzmHandle');
    var header = drawer.querySelector('.vzm-spot-header');
    if (!handle || !header) return;

    // === ÉTAPE 2 : État partagé du drag ===
    var startY = 0, startTranslate = 0, isDragging = false;
    var velocity = 0, lastY = 0, lastTime = 0;

    function getTranslate(snap) {
      if (snap === 'closed') return window.innerHeight;
      var pts = { peek: 38, mid: 70 };
      return window.innerHeight - (pts[snap] * window.innerHeight / 100);
    }

    function getCurrentSnap() {
      if (drawer.classList.contains('vzm-peek')) return 'peek';
      return 'mid';
    }

    function findClosestSnap(currentTranslate, vel) {
      var current = getCurrentSnap();
      // Vélocité forte vers le bas
      if (vel > 0.4) {
        if (current === 'mid') return 'peek';
        return 'closed';
      }
      // Vélocité forte vers le haut
      if (vel < -0.4) {
        return 'mid';
      }
      // Sans vélocité : snap au plus proche
      var posPeek = getTranslate('peek');
      var posMid = getTranslate('mid');
      return Math.abs(currentTranslate - posPeek) < Math.abs(currentTranslate - posMid) ? 'peek' : 'mid';
    }

    function applySnap(snap) {
      drawer.classList.remove('vzm-peek', 'vzm-mid', 'vzm-full', 'vzm-closed', 'vzm-dragging');
      if (snap === 'closed') {
        if (typeof closeSpotPopup === 'function') closeSpotPopup();
        return;
      }
      drawer.classList.add('vzm-' + snap);
      drawer.style.transform = '';
    }

    // === ÉTAPE 3 : Handlers communs pour handle ET header ===
    function onStart(e) {
      if (e.target.closest('button')) return;
      isDragging = true;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      lastY = startY;
      lastTime = Date.now();
      velocity = 0;
      startTranslate = getTranslate(getCurrentSnap());
      drawer.classList.add('vzm-dragging');
    }

    function onMove(e) {
      if (!isDragging) return;
      var y = e.touches ? e.touches[0].clientY : e.clientY;
      var now = Date.now();
      var dt = now - lastTime;
      if (dt > 0) velocity = (y - lastY) / dt;
      lastY = y;
      lastTime = now;
      var delta = y - startY;
      var newTranslate = startTranslate + delta;
      // Limite : entre mid (le plus haut autorisé) et hors écran (le plus bas)
      var minT = getTranslate('mid');
      newTranslate = Math.max(minT, Math.min(window.innerHeight, newTranslate));
      drawer.style.transform = 'translateY(' + newTranslate + 'px)';
      if (e.cancelable) e.preventDefault();
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      drawer.classList.remove('vzm-dragging');
      // Lit la position actuelle depuis le transform
      var transformStr = drawer.style.transform || '';
      var match = transformStr.match(/translateY\(([-\d.]+)px\)/);
      var currentTranslate = match ? parseFloat(match[1]) : getTranslate(getCurrentSnap());
      var snap = findClosestSnap(currentTranslate, velocity);
      applySnap(snap);
    }

    // === ÉTAPE 4 : Attache sur handle ET header ===
    handle.addEventListener('touchstart', onStart, { passive: true });
    handle.addEventListener('touchmove', onMove, { passive: false });
    handle.addEventListener('touchend', onEnd);

    header.addEventListener('touchstart', onStart, { passive: true });
    header.addEventListener('touchmove', onMove, { passive: false });
    header.addEventListener('touchend', onEnd);

    console.log('[VZM Patch 6] Drag 2 tiers installé proprement');
  }

  // On lance APRÈS que tous les patchs précédents aient eu leur tour
  // Délai 800ms pour être sûr que vzmInit + patch 2 + patch 5 aient fini
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(vzmPatch6, 800);
    });
  } else {
    setTimeout(vzmPatch6, 800);
  }
})();
// ============================================================
// VISIMER PATCH SIMPLIFICATION DRAWER MOBILE v3
// - Retire hint + conditions actuelles + bouton parasite "Améliorer"
// - 2 boutons EMPILÉS pleine largeur : Partager visibilité + Enregistrer session
// REMPLACE le PATCH SIMPLIFY DRAWER v2 dans vizi-app.js
// ============================================================

(function() {
  'use strict';

  function vzmPatchSimplify() {
    if (window.innerWidth > 768) {
      console.log('[VZM Simplify v3] Desktop, patch ignoré');
      return;
    }

    var drawer = document.getElementById('spotDrawerMobile');
    if (!drawer) {
      setTimeout(vzmPatchSimplify, 200);
      return;
    }

    // === 1. RETIRE le hint "Tire vers le haut" ===
    var hintText = drawer.querySelector('#vzmTierHintText');
    if (hintText && hintText.parentElement) {
      hintText.parentElement.style.display = 'none';
    }

    // === 2. RETIRE la section "Conditions actuelles" ===
    var sections = drawer.querySelectorAll('.vzm-section');
    sections.forEach(function(section) {
      var title = section.querySelector('.vzm-section-title, .vzm-section-toggle');
      if (title && /conditions actuelles/i.test(title.textContent)) {
        section.style.display = 'none';
      }
    });

    // === 3. RETIRE le bouton parasite "Améliorer prévisions" ===
    var allBtns = drawer.querySelectorAll('button, a');
    allBtns.forEach(function(btn) {
      var txt = btn.textContent || '';
      if (/améliorer|ameliorer/i.test(txt) && btn.id !== 'vzmShareObsBtn' && btn.id !== 'vzmSaveSessionBtn') {
        btn.style.display = 'none';
      }
    });

    // === 4. AJOUTE les 2 boutons EMPILÉS (pleine largeur) ===
    if (drawer.querySelector('#vzmActionRow')) return;

    var actionRow = document.createElement('div');
    actionRow.id = 'vzmActionRow';
    actionRow.className = 'vzm-action-row';
    actionRow.innerHTML =
      '<button id="vzmShareObsBtn" class="vzm-action-btn vzm-action-primary">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">' +
          '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>' +
          '<circle cx="12" cy="12" r="3"/>' +
        '</svg>' +
        '<span>Partager la visibilité</span>' +
      '</button>' +
      '<button id="vzmSaveSessionBtn" class="vzm-action-btn vzm-action-secondary">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">' +
          '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>' +
          '<polyline points="17 21 17 13 7 13 7 21"/>' +
          '<polyline points="7 3 7 8 15 8"/>' +
        '</svg>' +
        '<span>Enregistrer ma session</span>' +
      '</button>';

    actionRow.querySelector('#vzmShareObsBtn').onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof openObsSheet === 'function') openObsSheet();
    };
    actionRow.querySelector('#vzmSaveSessionBtn').onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof openSessionModal === 'function') openSessionModal();
    };

    // Style charte Talisker - empilés
    if (!document.getElementById('vzmActionRowStyle')) {
      var style = document.createElement('style');
      style.id = 'vzmActionRowStyle';
      style.textContent =
        '.vzm-action-row {' +
          'display: flex;' +
          'flex-direction: column;' +
          'gap: 8px;' +
          'padding: 14px 12px 12px;' +
          'width: 100%;' +
          'box-sizing: border-box;' +
        '}' +
        '.vzm-action-btn {' +
          'width: 100%;' +
          'display: flex;' +
          'align-items: center;' +
          'justify-content: center;' +
          'gap: 10px;' +
          'padding: 14px 18px;' +
          'border-radius: var(--vz-radius-pill, 24px);' +
          'font-family: Inter, sans-serif;' +
          'font-size: 15px;' +
          'font-weight: 600;' +
          'letter-spacing: 0.01em;' +
          'cursor: pointer;' +
          'transition: transform 0.15s ease, box-shadow 0.15s ease;' +
          '-webkit-tap-highlight-color: transparent;' +
          'box-sizing: border-box;' +
        '}' +
        '.vzm-action-primary {' +
          'background: var(--vz-accent);' +
          'color: var(--vz-bg-deep);' +
          'border: none;' +
          'box-shadow: 0 4px 14px var(--vz-accent-glow, rgba(77,212,168,0.25));' +
        '}' +
        '.vzm-action-primary:active {' +
          'transform: scale(0.98);' +
          'box-shadow: 0 2px 8px var(--vz-accent-glow, rgba(77,212,168,0.18));' +
        '}' +
        '.vzm-action-secondary {' +
          'background: rgba(255,255,255,0.04);' +
          'color: var(--vz-text-on-dark);' +
          'border: 1px solid var(--vz-accent-border, rgba(77,212,168,0.3));' +
        '}' +
        '.vzm-action-secondary:active {' +
          'transform: scale(0.98);' +
          'background: rgba(77,212,168,0.08);' +
        '}';
      document.head.appendChild(style);
    }

    // Insère après la frise
    var forecast = drawer.querySelector('#vzmForecastGrid');
    if (forecast && forecast.parentElement) {
      forecast.parentElement.insertAdjacentElement('afterend', actionRow);
    } else {
      var content = drawer.querySelector('.vzm-content');
      if (content) content.appendChild(actionRow);
    }

    console.log('[VZM Simplify v3] 2 boutons empilés OK');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(vzmPatchSimplify, 1000);
    });
  } else {
    setTimeout(vzmPatchSimplify, 1000);
  }
})();
// ============================================================
// VISIMER PATCH UI ARRIVÉE MOBILE
// - Retire le gros bouton "Analyser ce point" (CTA central teal)
// - Retire le bouton "Améliorer les prévisions" (capsule sombre)
// - Retire le bouton œil flottant en bas-droite
// - Ajoute message glassmorphism Talisker centré bas :
//   "Touche un point en mer pour voir la visibilité"
// À COLLER à la toute fin de vizi-app.js
// ============================================================

(function() {
  'use strict';

  function vzmPatchArrival() {
    // Mobile uniquement
    if (window.innerWidth > 768) {
      console.log('[VZM Arrival] Desktop, patch ignoré');
      return;
    }

    // === 1. RETIRE les 3 boutons parasites ===
    // On scanne tous les boutons/links de la page (hors drawers spot/marée)
    var allBtns = document.querySelectorAll('button, a');
    allBtns.forEach(function(btn) {
      // Skip si dans un drawer (spot, marée, sheet, modale, login...)
      if (btn.closest('#spotDrawerMobile')) return;
      if (btn.closest('#spotDrawer')) return;
      if (btn.closest('#tidesDrawer')) return;
      if (btn.closest('#vzSheet')) return;
      if (btn.closest('#obsSheet')) return;
      if (btn.closest('#sessionOverlay')) return;
      if (btn.closest('#loginOverlay')) return;
      if (btn.closest('#carnetDrawer')) return;
      if (btn.closest('#vzExplainOverlay')) return;
      if (btn.closest('.leaflet-control-container')) return;

      var txt = (btn.textContent || '').trim();

      // Cible : "Analyser ce point", "Améliorer les prévisions"
      if (/analyser ce point/i.test(txt)) {
        btn.style.display = 'none';
      }
      if (/améliorer les prévisions|ameliorer les previsions/i.test(txt)) {
        btn.style.display = 'none';
      }
    });

    // === 2. RETIRE le bouton œil flottant bas-droite ===
    // Identifié par l'icône SVG œil en position fixed bas-droite
    // On cherche les boutons en position fixed/absolute bas-droite contenant un SVG œil
    var floatingBtns = document.querySelectorAll('button, div[onclick]');
    floatingBtns.forEach(function(el) {
      if (el.closest('#spotDrawerMobile')) return;
      if (el.closest('#spotDrawer')) return;
      if (el.closest('#tidesDrawer')) return;
      if (el.closest('#vzSheet')) return;

      var style = window.getComputedStyle(el);
      var pos = style.position;
      if (pos !== 'fixed' && pos !== 'absolute') return;

      // Vérifie si bas-droite (right < 100, bottom < 200)
      var right = parseInt(style.right) || 9999;
      var bottom = parseInt(style.bottom) || 9999;
      if (right > 100 || bottom > 200) return;

      // Vérifie qu'il contient un SVG avec un path d'œil (M2 12s3-7 10-7...)
      var svgs = el.querySelectorAll('svg path');
      var isEyeBtn = false;
      svgs.forEach(function(p) {
        var d = p.getAttribute('d') || '';
        if (/M2 12s3-7|M2,12s3,-7|m2 12s3-7/i.test(d)) isEyeBtn = true;
      });
      // Aussi détecter par circle cx="12" cy="12" r="3" (pupille)
      var circles = el.querySelectorAll('svg circle');
      if (!isEyeBtn) {
        circles.forEach(function(c) {
          if (c.getAttribute('cx') === '12' && c.getAttribute('cy') === '12' && c.getAttribute('r') === '3') {
            isEyeBtn = true;
          }
        });
      }

      // Évite de virer la pastille principale Conditions/Marée/Webcams (qui est en haut)
      if (isEyeBtn && bottom < 200) {
        el.style.display = 'none';
      }
    });

    // === 3. AJOUTE le message glassmorphism centré en bas ===
    if (document.getElementById('vzmTapHint')) return;

    var hint = document.createElement('div');
    hint.id = 'vzmTapHint';
    hint.className = 'vzm-tap-hint';
    hint.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">' +
        '<path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74"/>' +
        '<path d="M14 11h3a3 3 0 0 1 3 3v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6"/>' +
        '<path d="M9 14l3 3 3-3"/>' +
      '</svg>' +
      '<span>Touche un point en mer pour voir la visibilité</span>';

    var style = document.createElement('style');
    style.id = 'vzmTapHintStyle';
    style.textContent =
      '.vzm-tap-hint {' +
        'position: fixed;' +
        'bottom: calc(24px + env(safe-area-inset-bottom, 0px));' +
        'left: 50%;' +
        'transform: translateX(-50%);' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 10px;' +
        'padding: 12px 18px;' +
        'background: var(--vz-bg-glass-strong, rgba(15, 36, 56, 0.88));' +
        'backdrop-filter: blur(var(--vz-blur, 14px));' +
        '-webkit-backdrop-filter: blur(var(--vz-blur, 14px));' +
        'border: 1px solid var(--vz-accent-border, rgba(77, 212, 168, 0.3));' +
        'border-radius: var(--vz-radius-pill, 24px);' +
        'color: var(--vz-text-on-dark, #fff);' +
        'font-family: Inter, sans-serif;' +
        'font-size: 13px;' +
        'font-weight: 500;' +
        'letter-spacing: 0.01em;' +
        'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);' +
        'z-index: 600;' +
        'pointer-events: none;' +
        'max-width: calc(100vw - 32px);' +
        'transition: opacity 0.25s ease, transform 0.25s ease;' +
      '}' +
      '.vzm-tap-hint svg {' +
        'stroke: var(--vz-accent, #4DD4A8);' +
      '}' +
      '.vzm-tap-hint.is-hidden {' +
        'opacity: 0;' +
        'transform: translateX(-50%) translateY(20px);' +
        'pointer-events: none;' +
      '}';
    if (!document.getElementById('vzmTapHintStyle')) {
      document.head.appendChild(style);
    }
    document.body.appendChild(hint);

    // === 4. Cache le hint quand un drawer est ouvert ===
    function updateHintVisibility() {
      var spotMobile = document.getElementById('spotDrawerMobile');
      var sheet = document.getElementById('vzSheet');
      var carnet = document.getElementById('carnetDrawer');
      var login = document.getElementById('loginOverlay');
      var session = document.getElementById('sessionOverlay');
      var obs = document.getElementById('obsSheet');
      var explain = document.getElementById('vzExplainOverlay');

      var anyDrawerOpen =
        (spotMobile && !spotMobile.classList.contains('vzm-closed') &&
          (spotMobile.classList.contains('vzm-peek') ||
           spotMobile.classList.contains('vzm-mid') ||
           spotMobile.classList.contains('vzm-full'))) ||
        (sheet && sheet.style.display !== 'none' &&
          (sheet.classList.contains('sheet-half') || sheet.classList.contains('sheet-full'))) ||
        (carnet && carnet.classList.contains('open')) ||
        (login && login.classList.contains('open')) ||
        (session && session.classList.contains('open')) ||
        (obs && obs.classList.contains('open')) ||
        (explain && explain.classList.contains('open'));

      hint.classList.toggle('is-hidden', anyDrawerOpen);
    }

    // Observe les changements de classe sur les drawers principaux
    var observer = new MutationObserver(updateHintVisibility);
    var targets = ['spotDrawerMobile', 'vzSheet', 'carnetDrawer', 'loginOverlay',
                   'sessionOverlay', 'obsSheet', 'vzExplainOverlay'];
    targets.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        observer.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
      }
    });

    updateHintVisibility();

    console.log('[VZM Arrival] UI arrivée nettoyée + hint ajouté');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(vzmPatchArrival, 1200);
    });
  } else {
    setTimeout(vzmPatchArrival, 1200);
  }
})();
