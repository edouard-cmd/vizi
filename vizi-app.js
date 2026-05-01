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
  canvas: null, ctx: null, _spotDepth: 5
};

var S_forecastOpen = false;
var S_windUnit = 'kt';
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
  S.clickLatLng = latlng;
  // Si le drawer marees est ouvert, on bascule sur le port le plus proche du clic
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
  var distToCoastMeters = estimateDistanceToCoast(latlng.lat, latlng.lng);
  var depthEstimate = Math.max(1.5, Math.min(30, distToCoastMeters * 0.004 + 1.5));
  S._spotDepth = depthEstimate;
  S._distToCoast = distToCoastMeters;
  // Skeleton loader pendant le fetch de la profondeur reelle
  var depthEl = document.getElementById('spotDepthVal');
  var coefEl = document.getElementById('spotCoefVal');
  if (depthEl) { depthEl.textContent = ''; depthEl.className = 'spot-depth-coef-val is-loading'; }
  if (coefEl) { coefEl.textContent = ''; coefEl.className = 'spot-depth-coef-val is-loading'; }
fetchRealDepth(latlng.lat, latlng.lng).then(function(realDepth) {
    if (realDepth !== null && realDepth > 0) {
      S._spotDepth = realDepth;
    }
    // Met a jour PROFONDEUR/COEF immediatement, meme si la meteo n'est pas encore arrivee
    var lat = S.clickLatLng ? S.clickLatLng.lat : latlng.lat;
    var lon = S.clickLatLng ? S.clickLatLng.lng : latlng.lng;
    if (typeof renderDepthCoefBlock === 'function') {
      renderDepthCoefBlock(S._spotDepth, lat, lon);
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
    // Si le bandeau Conditions est ouvert, on le rafraîchit avec le nouveau spot
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
  var score = visScoreV2(h, idx, depth, lat, lon);

  var visLabel = score >= 80 ? 'Excellente' : score >= 60 ? 'Bonne' : score >= 40 ? 'Moyenne' : score >= 20 ? 'Faible' : 'Nulle';
  var badgeColors = { 'Nulle': '#C94A3D', 'Faible': '#E89B3C', 'Moyenne': '#D8C84A', 'Bonne': '#2DA888', 'Excellente': '#4DD4A8' };
  var segColors = ['#C94A3D', '#E89B3C', '#D8C84A', '#2DA888', '#4DD4A8'];
  var levelIdx = ['Nulle', 'Faible', 'Moyenne', 'Bonne', 'Excellente'].indexOf(visLabel);
  document.getElementById('spotVisBadge').style.background = badgeColors[visLabel] || '#D8C84A';

  function scoreToLabelKey(s) {
    if (s >= 80) return 4;
    if (s >= 60) return 3;
    if (s >= 40) return 2;
    if (s >= 20) return 1;
    return 0;
  }
  var labelNowKey = scoreToLabelKey(score);
  var futureMinScore = score, futureMaxScore = score;
  var lookAhead = Math.min(24, h.time.length - idx - 1);
  for (var fIdx = idx + 1; fIdx <= idx + lookAhead; fIdx++) {
    var sFut = visScoreV2(h, fIdx, depth, lat, lon);
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
  document.getElementById('spotVisLabel').textContent = visLabel;
  for (var si = 0; si < 5; si++) {
    var seg = document.getElementById('visSeg' + si);
    if (seg) seg.style.background = si <= levelIdx ? segColors[si] : 'rgba(255,255,255,0.08)';
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
}
function renderDepthCoefBlock(depth, lat, lon) {
  var depthEl = document.getElementById('spotDepthVal');
  var coefEl = document.getElementById('spotCoefVal');
  var coefDescEl = document.getElementById('spotCoefDesc');
  if (!depthEl || !coefEl) return;

  // Profondeur (toujours teal)
  if (depth && depth > 0) {
    depthEl.textContent = '~' + Math.round(depth);
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

function renderPmBmDuJour() {
  var content = document.getElementById('vzPmBmContent');
  if (!content) return;

  if (typeof TIDES === 'undefined' || !TIDES.extremes || !TIDES.selectedDate) {
    content.innerHTML = '<div class="vz-pmbm-empty">Marées non disponibles ici</div>';
    return;
  }

  var selDate = TIDES.selectedDate;
  var dayExtremes = TIDES.extremes.filter(function(e){ return e.time.slice(0,10) === selDate; });

  if (dayExtremes.length === 0) {
    content.innerHTML = '<div class="vz-pmbm-empty">Pas de données pour cette date</div>';
    return;
  }

  var sunrise = S._sunriseTime || '06:00';
  var sunset = S._sunsetTime || '21:00';
  var srMin = parseInt(sunrise.slice(0,2)) * 60 + parseInt(sunrise.slice(3,5));
  var ssMin = parseInt(sunset.slice(0,2)) * 60 + parseInt(sunset.slice(3,5));

  var dayOnly = dayExtremes.filter(function(e) {
    var t = new Date(e.time);
    var min = t.getHours() * 60 + t.getMinutes();
    return min >= srMin && min <= ssMin;
  });

  if (dayOnly.length === 0) {
    content.innerHTML = '<div class="vz-pmbm-empty">Toutes les marées sont de nuit aujourd\'hui</div>';
    return;
  }

  var html = '<div class="vz-pmbm-grid">';
  dayOnly.forEach(function(e) {
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
  var scoreNow = visScoreV2(h, currentIdx, depth, lat, lon);

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
    var sf = visScoreV2(h, f, depth, lat, lon);
    if (sf < futureMinScore) { futureMinScore = sf; futureMinIdx = f; }
    if (sf > futureMaxScore) { futureMaxScore = sf; futureMaxIdx = f; }
  }
  var labelMinKey = scoreToLabelKey(futureMinScore);
  var labelMaxKey = scoreToLabelKey(futureMaxScore);

  var lookFar = Math.min(120, h.time.length - currentIdx - 1);
  var labelChangeIdx = -1;
  var labelChangeKey = -1;
  for (var ff = currentIdx + 1; ff <= currentIdx + lookFar; ff++) {
    var sff = visScoreV2(h, ff, depth, lat, lon);
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
      var fg = h.windgusts_10m[ffIdx] || 0;
      var fd = h.winddirection_10m ? h.winddirection_10m[ffIdx] : null;
      if (onshoreFactor(fd) < 0.3) continue;
      if (fg > futurePeakGusts) { futurePeakGusts = Math.round(fg); futurePeakHoursAhead = fk; futurePeakDir = fd; }
    }
    var degradeWhen = formatWhen(new Date(h.time[futureMinIdx]));
    var subText, detailText;
    if (futurePeakGusts >= 15) {
      var futKt = S_windUnit === 'kt' ? toKt(futurePeakGusts) : futurePeakGusts;
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
      var pg = h.windgusts_10m[pIdx] || 0;
      var pd = h.winddirection_10m ? h.winddirection_10m[pIdx] : null;
      if (onshoreFactor(pd) < 0.3) continue;
      if (pg > pastPeakGusts) { pastPeakGusts = Math.round(pg); pastPeakHoursAgo = k; pastPeakDir = pd; }
    }
    var clearWhen = formatWhen(new Date(h.time[futureMaxIdx]));
    var subText3, detailText3;
    if (pastPeakHoursAgo > 0 && pastPeakGusts >= 15) {
      var peakKt = S_windUnit === 'kt' ? toKt(pastPeakGusts) : pastPeakGusts;
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

// Constante de temps (heures) pour la decantation, selon profondeur
// Plus le fond est peu profond, plus tau est long (re-brassage marees + houle residuelle)
function decantTau(depth) {
  if (depth <= 2)  return 36;  // estran, beaucoup d'energie residuelle
  if (depth <= 5)  return 30;  // cote de Nacre type Courseulles (calibre)
  if (depth <= 10) return 22;
  if (depth <= 20) return 14;
  return 8;                     // au-dela 20m, decantation rapide
}

// Energie de brassage instantanee a une heure i
// Vent effectif = mix vent soutenu + rafales, seuil critique 8 nds
// Effet quadratique de l'onshore (un vent lateral brasse beaucoup moins)
function brassageInstant(h, i, lat, lon) {
  if (i < 0 || i >= h.time.length) return 0;
  var w = h.windspeed_10m[i] || 0;
  var g = h.windgusts_10m[i] || 0;
  var d = h.winddirection_10m ? h.winddirection_10m[i] : null;
  if (d === null) return 0;
  var ventEff = w * 0.6 + g * 0.4;
  if (ventEff < 8) return 0; // sous le seuil critique, pas de remise en suspension
  var coast = getCoastNormal(lat, lon);
  var windGoesTo = (d + 180) % 360;
  var angle = windGoesTo - coast;
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  var onshore = -Math.cos(angle * Math.PI / 180);
  if (onshore < 0.2) return 0; // vent offshore ou tres lateral, pas de brassage cote
  var excess = ventEff - 8;
  return excess * excess * onshore * onshore;
}

// Energie residuelle cumulee au temps idx (sommation exponentielle decroissante)
// Regarde jusqu'a 5*tau heures en arriere (capte 99% de l'energie)
function energieResiduelle(h, idx, depth, lat, lon) {
  var tau = decantTau(depth);
  var lookback = Math.min(Math.round(tau * 5), idx);
  var total = 0;
  for (var k = 1; k <= lookback; k++) {
    var pastIdx = idx - k;
    var brass = brassageInstant(h, pastIdx, lat, lon);
    if (brass > 0) {
      total += brass * Math.exp(-k / tau);
    }
  }
  return total;
}

// Score visi unifie (utilise par timeline ET score instantane)
// Combine penalite instantanee + penalite cumulee de brassage residuel
function visScoreV2(h, idx, depth, lat, lon) {
  if (!h || !h.windspeed_10m || idx < 0) return 50;
  var w = h.windspeed_10m[idx] || 0;
  var g = h.windgusts_10m[idx] || 0;
  var d = h.winddirection_10m ? h.winddirection_10m[idx] : null;
  var wave = h.wave_height ? (h.wave_height[idx] || 0) : 0;

  // Bathy factor lisse (exponentiel, plus de saut brutal)
  var bathyFactor = 1.0 + 3.0 * Math.exp(-depth / 4);

  // Penalite instantanee (vent du moment)
  var dirFactor = getDirFactorForPoint(d, lat, lon);
  var windPenalty = Math.min(Math.max(w - 5, 0) / 20, 1) * 55 * dirFactor;
  var gustPenalty = Math.min(Math.max(g - 10, 0) / 25, 1) * 30 * dirFactor;
  var wavePenalty = Math.min(wave / 1.2, 1) * 35;
  var penaliteInstant = (windPenalty + gustPenalty + wavePenalty) * bathyFactor;

  // Penalite cumulee (energie de brassage des dernieres heures/jours)
  var energie = energieResiduelle(h, idx, depth, lat, lon);
  // Calibration : energie ~30-50 = brassage actif, ~5-15 = decantation en cours, <2 = eau claire
  var penaliteCumulee = Math.min(energie * 1.2, 100) * bathyFactor * 0.5;

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
    if (d.daily.sunrise && d.daily.sunrise[0]) {
  document.getElementById('spotSunrise').textContent = d.daily.sunrise[0].slice(11, 16);
  S._sunriseTime = d.daily.sunrise[0].slice(11, 16);
}
if (d.daily.sunset && d.daily.sunset[0]) {
  document.getElementById('spotSunset').textContent = d.daily.sunset[0].slice(11, 16);
  S._sunsetTime = d.daily.sunset[0].slice(11, 16);
}
// Re-render du graphe maree avec les zones de nuit
if (TIDES.data && TIDES.extremes) renderTidesForSelectedDate();
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
  // 1) Drawer spot ouvert : S.clickLatLng est la source de vérité dans ton code
  var spotDrawer = document.getElementById('spotDrawer');
  if (spotDrawer && spotDrawer.classList.contains('open') && S && S.clickLatLng) {
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
      if (p && p.spot && p.spot.name) return p.spot.name;
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
    if (score < 20) return '<1m';
    if (score < 40) return '1-2m';
    if (score < 60) return '2-4m';
    if (score < 80) return '4-8m';
    return '+8m';
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

  // Visi (utilise visScoreV2 avec la VRAIE signature : h, idx, depth, lat, lon)
  html += renderRow('Visibilité', 'vz-cond-row-vis', function(s) {
    var score = visScoreV2(h, s.i, depth, spot.lat, spot.lng);
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

      // Indice météo : on prend midi du jour
      var targetMs = new Date(dateISO + 'T12:00:00').getTime();
      var bestIdx = 0, bestDelta = Infinity;
      for (var i = 0; i < h.time.length; i++) {
        var diff = Math.abs(new Date(h.time[i]).getTime() - targetMs);
        if (diff < bestDelta) { bestDelta = diff; bestIdx = i; }
      }
      var score = (typeof visScoreV2 === 'function') ? visScoreV2(h, bestIdx, depth, lat, lon) : 50;
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

      // Marées du jour (extraites de TIDES.extremes)
      var pm = null, bm = null;
      if (typeof TIDES !== 'undefined' && TIDES.extremes) {
        var dayExtremes = TIDES.extremes.filter(function(e) {
          return e.time.slice(0, 10) === dateISO;
        });
        var pmEx = dayExtremes.filter(function(e) { return e.type === 'high'; });
        var bmEx = dayExtremes.filter(function(e) { return e.type === 'low'; });
        if (pmEx.length > 0) {
          var pdt = new Date(pmEx[0].time);
          pm = { time: ('0' + pdt.getHours()).slice(-2) + ':' + ('0' + pdt.getMinutes()).slice(-2), height: pmEx[0].height };
        }
        if (bmEx.length > 0) {
          var bdt = new Date(bmEx[0].time);
          bm = { time: ('0' + bdt.getHours()).slice(-2) + ':' + ('0' + bdt.getMinutes()).slice(-2), height: bmEx[0].height };
        }
      }

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
        tideForFrise: tideForFrise
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

    // Valeur visi en mètres approx (basée sur le label)
    var valueText = '—';
    if (verdictKey === 'excellente') valueText = '~ 8 m';
    else if (verdictKey === 'bonne') valueText = '~ 6 m';
    else if (verdictKey === 'correcte') valueText = '~ 4 m';
    else if (verdictKey === 'faible') valueText = '~ 2 m';
    else if (verdictKey === 'nulle') valueText = '~ 1 m';
    var valueEl = document.getElementById('vzmVerdictValue');
    if (valueEl) valueEl.textContent = valueText;

    // Calcul des params pour la phrase explicative
    var depth = (S && S._spotDepth) ? S._spotDepth : 5;
    var lat = (S && S.clickLatLng) ? S.clickLatLng.lat : 49.35;
    var lon = (S && S.clickLatLng) ? S.clickLatLng.lng : -0.5;
    var wind = 0, gusts = 0, dir = null, dirFactor = 1.0, score = 50;
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
      if (typeof visScoreV2 === 'function') {
        score = visScoreV2(S_spotWeatherCache, idx, depth, lat, lon);
      }
    }

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
// VISIMER PATCH 7 — Rend le contenu scrollable pour atteindre les boutons
// À COLLER à la toute fin de vizi-app.js (après PATCH 6)
// ============================================================

(function() {
  'use strict';

  function vzmPatch7() {
    var drawer = document.getElementById('spotDrawerMobile');
    if (!drawer) {
      setTimeout(vzmPatch7, 200);
      return;
    }

    var content = drawer.querySelector('.vzm-content');
    if (!content) {
      setTimeout(vzmPatch7, 200);
      return;
    }

    // Force le contenu à être scrollable verticalement
    content.style.overflowY = 'auto';
    content.style.overflowX = 'hidden';
    content.style.webkitOverflowScrolling = 'touch';
    content.style.overscrollBehavior = 'contain';
    content.style.touchAction = 'pan-y';
    
    // Le drawer doit être un flex column avec content qui prend tout l'espace dispo
    drawer.style.display = 'flex';
    drawer.style.flexDirection = 'column';
    content.style.flex = '1 1 auto';
    content.style.minHeight = '0';

    console.log('[VZM Patch 7] Scroll interne activé');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(vzmPatch7, 1000);
    });
  } else {
    setTimeout(vzmPatch7, 1000);
  }
})();
// ============================================================
// VISIMER PATCH 8 — Padding bottom pour atteindre les boutons
// À COLLER à la toute fin de vizi-app.js (après PATCH 7)
// ============================================================

(function() {
  'use strict';

  function vzmPatch8() {
    var drawer = document.getElementById('spotDrawerMobile');
    if (!drawer) {
      setTimeout(vzmPatch8, 200);
      return;
    }

    var content = drawer.querySelector('.vzm-content');
    if (!content) {
      setTimeout(vzmPatch8, 200);
      return;
    }

    // Ajoute un gros padding bottom : 200px pour que tout le contenu (boutons inclus)
    // soit accessible au scroll même quand le drawer est en mid (70vh)
    // + safe-area pour iOS notch
    content.style.paddingBottom = 'calc(200px + env(safe-area-inset-bottom, 0px))';

    console.log('[VZM Patch 8] Padding bottom 200px ajouté');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(vzmPatch8, 1200);
    });
  } else {
    setTimeout(vzmPatch8, 1200);
  }
})();
// ============================================================
// VISIMER PATCH 9 v2 — Drag étendu (MOBILE UNIQUEMENT)
// REMPLACE le PATCH 9 précédent dans vizi-app.js
// ============================================================

(function() {
  'use strict';

  function vzmPatch9() {
    // GARDE-FOU CRITIQUE : ne fait absolument rien sur desktop
    if (window.innerWidth > 768) {
      console.log('[VZM Patch 9] Desktop détecté, patch désactivé');
      return;
    }

    var drawer = document.getElementById('spotDrawerMobile');
    if (!drawer) {
      setTimeout(vzmPatch9, 200);
      return;
    }

    var zones = [];
    var hint = drawer.querySelector('#vzmTierHintText');
    if (hint && hint.parentElement) zones.push(hint.parentElement);
    var verdict = drawer.querySelector('#vzmVerdict');
    if (verdict) zones.push(verdict);
    var forecast = drawer.querySelector('#vzmForecastGrid');
    if (forecast && forecast.parentElement) zones.push(forecast.parentElement);

    if (zones.length === 0) {
      setTimeout(vzmPatch9, 300);
      return;
    }

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
      if (vel > 0.4) {
        if (current === 'mid') return 'peek';
        return 'closed';
      }
      if (vel < -0.4) return 'mid';
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

    function onStart(e) {
      if (e.target.closest('button')) return;
      if (getCurrentSnap() === 'mid') {
        var content = drawer.querySelector('.vzm-content');
        if (content && content.scrollTop > 5) return;
      }
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
      var minT = getTranslate('mid');
      newTranslate = Math.max(minT, Math.min(window.innerHeight, newTranslate));
      drawer.style.transform = 'translateY(' + newTranslate + 'px)';
      if (e.cancelable) e.preventDefault();
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      drawer.classList.remove('vzm-dragging');
      var transformStr = drawer.style.transform || '';
      var match = transformStr.match(/translateY\(([-\d.]+)px\)/);
      var currentTranslate = match ? parseFloat(match[1]) : getTranslate(getCurrentSnap());
      var snap = findClosestSnap(currentTranslate, velocity);
      applySnap(snap);
    }

    // ATTACHE UNIQUEMENT touchstart/touchmove/touchend (pas mousedown/mouseup)
    // Ça évite tout effet de bord sur desktop
    zones.forEach(function(zone) {
      zone.addEventListener('touchstart', onStart, { passive: true });
      zone.addEventListener('touchmove', onMove, { passive: false });
      zone.addEventListener('touchend', onEnd);
    });

    console.log('[VZM Patch 9 v2] Drag mobile étendu sur ' + zones.length + ' zones');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(vzmPatch9, 1400);
    });
  } else {
    setTimeout(vzmPatch9, 1400);
  }
})();
