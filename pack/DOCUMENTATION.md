# Visimer · Documentation iconographie

## 1. Règles d'usage

### Tailles
| Contexte                  | Taille  | Stroke |
|---------------------------|---------|--------|
| Inline texte (caption)    | 14–16px | 1.8–2px (compensation densité) |
| UI standard (boutons, listes) | 24px | 1.5px |
| Header de section, drawer | 32–40px | 2px |
| Marqueurs carte           | 32–44px | 2.4px |
| Illustrations onboarding  | 120–200px | natif (2.5px) |

**Taille minimale absolue : 14px.** En dessous, retirer les éléments avec
`opacity < 0.6` (ils disparaissent visuellement et créent du bruit).

### Espacement
- 8px minimum autour de l'icône
- 12px à 24px+
- 16px à 32px+
- 8px entre icône + label texte (alignement baseline)

### Contextes
- **Fond Talisker `#0A1520`** : couleur teal `#4DD4A8` par défaut
- **Fond satellite (carte)** : icône dans une **pastille blanche** (36–44px) ou **ring deep+teal**.
  Stroke à `2.4px` minimum pour contraster avec l'imagerie satellite chargée.

### Interdits
- Gradient sur stroke ou fill
- Filter / drop-shadow sur l'icône (l'ombre va sur le conteneur, pas l'icône)
- Couleurs hors palette sémantique
- Mélange de directions (toujours Cascade organique B)

---

## 2. Convention de couleurs

| Token              | Hex         | Usage                                         |
|--------------------|-------------|-----------------------------------------------|
| `--visimer-teal`   | `#4DD4A8`   | Couleur par défaut, état nominal, action      |
| `--visimer-teal-mid` | `#2DA888` | État positif secondaire, visi bonne           |
| `--visimer-yellow` | `#D8C84A`   | Visi moyenne, warning faible                  |
| `--visimer-orange` | `#E89B3C`   | Visi faible, warning                          |
| `--visimer-red`    | `#C94A3D`   | Danger, visi nulle, signalement               |
| Blanc              | `#FFFFFF`   | Sur marqueurs blancs uniquement               |

### Variantes Observation (5 niveaux sémantiques)
La couleur du stroke change selon la visibilité reportée — **pas de redessin**.
Voir `observation.css` pour les classes `.obs-visi-{none,poor,medium,good,excellent}`.

### Variantes fraîcheur (3 niveaux)
- `.obs-fresh` — < 6h, halo pulsant teal (anim 1.8s)
- `.obs-recent` — 6–24h, opacité 0.55
- `.obs-old` — 24–72h, opacité 0.28 (fantôme)

Au-delà de 72h : ne pas afficher le marqueur.

---

## 3. Intégration

### En SVG inline (recommandé)
```html
<svg width="24" height="24" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round">
  <path d="…"/>
</svg>
```
Avantage : la couleur suit `color` du parent, animations CSS possibles.

### En `<img>`
```html
<img src="icons/01-navigation/conditions.svg" width="24" height="24" alt="" />
```
Plus simple mais perd `currentColor` — la couleur ne suit plus le parent.

### Avec une pastille de marqueur
```html
<span class="map-marker">
  <svg>…</svg>
</span>
<style>
  .map-marker {
    width: 36px; height: 36px;
    background: white;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: var(--visimer-deep);
    box-shadow: 0 2px 10px rgba(0,0,0,0.35);
  }
</style>
```

---

## 4. Ajouter une nouvelle icône au système

### Checklist
- [ ] viewBox `0 0 24 24` (ou 32 si marqueur, 200 si illustration)
- [ ] Aire utile maximum 22×22 (1px de marge minimum)
- [ ] `stroke="currentColor"` — pas de couleur en dur
- [ ] `stroke-width="1.5"` ou `"2"` (pas de demi-pixel autre)
- [ ] `stroke-linecap="round"` + `stroke-linejoin="round"`
- [ ] Privilégier les courbes `Q` (quadratic) et `C` (cubic) — pas de segments droits sauf nécessité fonctionnelle
- [ ] Hiérarchie : `stroke-width="2"` pour l'élément principal, `1.5` + `opacity` pour secondaire
- [ ] 2 poids de stroke maximum par icône
- [ ] Tester à 14px, 24px, 40px avant de valider

### Template
```svg
<svg xmlns="http://www.w3.org/2000/svg"
     width="24" height="24"
     viewBox="0 0 24 24"
     fill="none"
     stroke="currentColor"
     stroke-linecap="round"
     stroke-linejoin="round">
  <path d="…" stroke-width="2"/>
  <path d="…" stroke-width="1.5" opacity="0.65"/>
</svg>
```

### Nommage
`icon-{categorie-courte}-{nom}.svg` ou simplement `{nom}.svg` dans le dossier de catégorie.
Tout en kebab-case, anglais (sauf catégories métier comme `seiche`, `daurade`).
