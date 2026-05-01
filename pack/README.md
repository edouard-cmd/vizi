# Visimer · Système d'icônes

Direction **B — Cascade organique**. 56 icônes core + bonus monogramme.
Stroke 1.5–2px, terminaisons rondes, sans gradient ni filtre.

## Contenu du pack

```
pack/
├── README.md                                   ← ce fichier
├── DOCUMENTATION.md                            ← règles d'usage, couleurs, intégration
├── observation.css                             ← classes CSS fraîcheur + sémantique
├── visimer-icon-system-demo.html               ← page démo complète
├── visimer-iconography-moodboard.html          ← mood board 3 directions (archive)
└── icons/
    ├── 01-navigation/         (3 icônes)
    ├── 02-actions/            (4 icônes)
    ├── 03-layers/             (5 icônes)
    ├── 04-markers/            (4 icônes)
    ├── 05-observation-freshness/ (3 variantes du masque)
    ├── 06-observation-popup/  (4 icônes)
    ├── 07-observation-actions/ (3 icônes)
    ├── 08-community-v2/       (3 icônes — V2)
    ├── 09-conditions/         (5 icônes)
    ├── 10-visibility/         (5 icônes)
    ├── 11-weather/            (6 icônes)
    ├── 12-secondary/          (5 icônes)
    ├── 13-species-v2/         (8 icônes — V2)
    ├── 14-onboarding/         (3 illustrations)
    └── 15-monogram/            (1 monogramme bonus)
```

## Démarrage rapide

1. Ouvre `visimer-icon-system-demo.html` pour voir le système au complet.
2. Lis `DOCUMENTATION.md` pour les règles d'usage.
3. Copie un fichier `.svg` dans ton projet et utilise-le inline ou en `<img>`.
4. Pour les Observations, importe `observation.css` et applique les classes.

## Specs techniques

| Format            | SVG inline-friendly, viewBox 24×24 (32×32 pour marqueurs, 200×200 pour onboarding) |
|-------------------|------------------------------------------------------------------------------------|
| Stroke par défaut | `1.5px` à 24px · `2px` à 32-48px · `2.4px` sur marqueurs carte                     |
| Couleur stroke    | `currentColor` — héritage CSS                                                       |
| Couleur défaut    | `#4DD4A8` (Talisker teal)                                                          |
| Linecap/linejoin  | `round` (deux poids max par icône)                                                 |
| Pas de            | gradient · filter · drop-shadow sur l'icône elle-même                              |

## Inventaire

- **48 core V1** — production immédiate
- **8 espèces V2** — chasse spécifique, à activer plus tard
- **3 illustrations onboarding** — chasseur silhouette · carte · masque
- **1 bonus** — monogramme Cascade pour favicon alt / watermark
