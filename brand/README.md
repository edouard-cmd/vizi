# Visimer — Brand assets

Logo retenu : **CA4 — Cascade épaisseurs** (3 vagues, strokes 3/2/1 px).

## Structure

```
brand/
├── svg/                                 Logos vectoriels (sources)
│   ├── visimer-mark-teal.svg            Mark seul, teal sur transparent
│   ├── visimer-mark-white.svg           Mark seul, blanc
│   ├── visimer-mark-deep.svg            Mark seul, deep navy
│   ├── visimer-mark-on-dark.svg         Mark + fond #0A1520 (rounded)
│   ├── visimer-mark-on-light.svg        Mark + fond blanc (rounded)
│   ├── visimer-horizontal-on-dark.svg   Lockup horizontal pour fond sombre
│   ├── visimer-horizontal-on-light.svg  Lockup horizontal pour fond clair
│   ├── visimer-horizontal-mono-white.svg
│   ├── visimer-horizontal-mono-deep.svg
│   ├── visimer-horizontal-bg-dark.svg   Lockup avec fond sombre intégré
│   └── visimer-horizontal-bg-light.svg  Lockup avec fond clair intégré
│
└── web/                                 Assets web prêts à l'emploi
    ├── favicon.svg                      Favicon vectoriel (preferred)
    ├── favicon-dark.svg | favicon-light.svg
    ├── favicon-{16,32,48,64,96,128,192,256,384,512}.png
    ├── apple-touch-icon.svg | .png      iOS home screen (180x180)
    ├── android-chrome-192.png | -512.png
    ├── og-image.svg | .png               Open Graph (1200×630)
    ├── twitter-card.png                  Twitter card (1200×600)
    ├── site.webmanifest                  PWA manifest
    ├── browserconfig.xml                 Windows tile
    ├── visimer-tokens.css                CSS custom properties
    └── HEAD-SNIPPETS.html                À copier dans <head>
```

## Intégration rapide

1. Copier le dossier `brand/` dans votre projet (ou `public/brand/`).
2. Ouvrir `brand/web/HEAD-SNIPPETS.html` et coller les `<meta>`/`<link>` dans la `<head>` de votre site.
3. Ajuster les chemins si besoin (par défaut : `/brand/web/...`).
4. Importer `visimer-tokens.css` pour disposer des variables de marque.

## Spécifications

| Token             | Valeur     | Usage                          |
| ----------------- | ---------- | ------------------------------ |
| Deep              | `#0A1520`  | Fond principal                 |
| Surface           | `#0F2438`  | Cards, panneaux                |
| Teal              | `#4DD4A8`  | Accent signature, CTA          |
| Teal mid          | `#2DA888`  | États hover, secondaire        |
| Teal deep         | `#1A6B5D`  | Bordures, strokes discrets     |
| Warning / Caution / Danger | `#D8C84A` / `#E89B3C` / `#C94A3D` | Statuts visi |

| Typo              | Famille            | Usage                         |
| ----------------- | ------------------ | ----------------------------- |
| Inter 400-800     | Sans-serif         | Wordmark, UI, copy            |
| IBM Plex Mono     | Monospace          | Data numériques uniquement    |

Letter-spacing uppercase : 0.08–0.12 em.

## Construction du mark

Le mark est composé de 3 courbes Q (sinusoïdales légères) parallèles, avec stroke décroissant :

```
path 1 — stroke 3.2 px — surface
path 2 — stroke 2.0 px — médian
path 3 — stroke 1.0 px — fond
stroke-linecap: round
viewBox 120×120 (mark seul) ou 480×120 (lockup)
```

En favicon 32×32, les strokes sont adaptés à 1.6 / 1 / 0.5 px pour garder la lisibilité.

## Zone de protection

Réservez une marge minimale équivalente à la hauteur de la dernière vague (la plus fine) tout autour du logo. Ne placez aucun élément dans cette zone.

## Tailles minimales

- **Mark seul** : 24 px (web), 12 mm (print).
- **Lockup horizontal** : 96 px de large (web), 30 mm (print).

## Ce qu'il ne faut pas faire

- ❌ Modifier les épaisseurs ou ajouter une 4e vague.
- ❌ Appliquer un dégradé multi-couleurs (le mark est mono-stroke).
- ❌ Faire pivoter le mark.
- ❌ Utiliser sur fond saturé sans le mettre dans son cartouche `on-dark`/`on-light`.
- ❌ Étirer le wordmark (letter-spacing fixe à 4 unités sur 52 px).
