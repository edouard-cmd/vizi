---
name: Visimer
description: Instrument de prévision de visibilité sous-marine pour chasseurs sous-marins, lisible en plein soleil et aux doigts mouillés.
colors:
  ink: "#0A1520"
  chrome: "#0F2438"
  surface: "#FFFFFF"
  group: "#EDF1F4"
  selected: "#DCEFE7"
  accent: "#4DD4A8"
  accent-mid: "#2DA888"
  accent-deep: "#1A6B5D"
  text: "#0A1520"
  text-2: "#33475A"
  text-3: "#51677A"
  line: "#C3D0DA"
  warning: "#D8C84A"
  caution: "#E89B3C"
  danger: "#C94A3D"
typography:
  number-large:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1
  number-medium:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.1
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.45
  meta:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  kicker:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.11em"
  provenance:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  panel: "16px"
  card: "14px"
  group: "12px"
  row: "10px"
  control: "9px"
spacing:
  g1: "2px"
  g2: "4px"
  g3: "6px"
  g4: "8px"
  g5: "11px"
  g6: "14px"
  gutter: "16px"
  block-gap: "12px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "0 18px"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "0 14px"
    height: "56px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "0 16px"
    height: "56px"
  chip-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "0 16px"
    height: "56px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "0 14px"
    height: "56px"
  nav-tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    height: "60px"
  nav-tab-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.accent-deep}"
    height: "60px"
  panel-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    height: "60px"
---

# Design System: Visimer

## Overview

**Creative North Star: "Talisker, l'instrument de terrain"**

Visimer ne se lit pas dans un bureau. Il se lit sur un bateau ou sur une cale, en plein soleil, téléphone tenu à bout de bras, mains mouillées, par des chasseurs de 45 à 65 ans. Chaque décision visuelle part de cette scène : un écran émet de la lumière qui s'ajoute à la lumière ambiante, donc les surfaces claires et opaques gagnent, les nuances fines disparaissent, et ce qui n'est pas net n'existe pas.

Le système oppose deux plans. La carte est le fond sombre (ink, #0A1520 sur le fond de carte). Les instruments posés dessus sont des plaques blanches opaques cerclées d'un trait noir de 2 px : recherche, barre basse, panneaux, boutons. L'accent teal marque ce qui est actif ou choisi, jamais la décoration. Les chiffres sont toujours en IBM Plex Mono : une donnée se reconnaît à sa police avant même d'être lue.

L'honnêteté épistémique du produit se voit aussi dans le design : une source absente est dite (« pas d'image exploitable »), jamais remplacée par une valeur rassurante, et la provenance d'un chiffre reste lisible au même plancher que le reste.

**Key Characteristics:**
- Plaques blanches opaques sur carte sombre, séparées par un trait noir de 2 px.
- Teal clair en aplat pour l'actif et le choisi, teal profond pour le texte d'accent.
- Toute donnée chiffrée en IBM Plex Mono, toute interface en Inter.
- Cibles de 56 px, texte jamais sous 12 px.
- Un seul panneau ouvert à la fois, ancré sur des lignes mesurées.

## Colors

Une palette d'instrument : un noir d'encre, un blanc de plaque, un teal à trois profondeurs et trois couleurs d'alerte, rien d'autre.

### Primary
- **Teal signal** (#4DD4A8) : aplat de ce qui est actif ou choisi (bouton principal, chip sélectionnée, bouton de pile actif, créneau coché). Toujours avec du texte ink par-dessus (9,9:1).
- **Teal courant** (#2DA888) : traits et repères de carte (réticule, marqueurs de port), jamais du texte.
- **Teal profond** (#1A6B5D) : la seule couleur de texte d'accent sur blanc (6,35:1). Onglet actif de la barre basse, compteurs, liens, valeurs mises en avant.

### Neutral
- **Encre** (#0A1520) : texte principal, traits de 2 px, fond de la carte.
- **Coque** (#0F2438) : surfaces sombres d'exception (bandeau d'alerte géographique, bloc marque desktop).
- **Plaque** (#FFFFFF) : toutes les surfaces d'instrument.
- **Groupe** (#EDF1F4) : fond d'un groupe de lignes à l'intérieur d'une plaque.
- **Sélection douce** (#DCEFE7) : fond de l'onglet actif et des lignes choisies, avec texte teal profond (5,31:1).
- **Texte second** (#33475A) : libellés secondaires, surtitres (9,59:1).
- **Texte trois** (#51677A) : provenance, dates, mentions « aucune donnée ». C'est le gris le plus clair autorisé pour du texte (5,88:1 sur blanc).
- **Trait fin** (#C3D0DA) : séparateurs internes et bordure d'un champ au repos. Jamais du texte.

### Tertiary
- **Vigilance** (#D8C84A), **Prudence** (#E89B3C), **Danger** (#C94A3D) : états de visibilité et d'alerte. Vigilance et Prudence sont des aplats avec texte ink (10,76:1 et 8,05:1), jamais du texte sur blanc. Danger peut porter du texte blanc ou être du texte sur blanc (4,64:1) à partir de 14 px gras.

### Named Rules
**The Aplat-Only Rule.** Le teal signal #4DD4A8 ne s'écrit jamais en texte sur fond clair (1,86:1). Il remplit ; le teal profond écrit.

**The Source unique Rule.** Chaque jeton `--vz-*` est défini une seule fois, dans un seul `:root`. Deux définitions du même jeton dans deux fichiers, c'est le chargement le plus tardif qui gagne en silence : c'est ainsi que tout le texte d'accent d'index.html est passé de lisible à illisible.

**The Gris plancher Rule.** Aucun texte plus clair que #51677A. Un gris qui ne passe pas 4,5:1 sur sa plaque n'est pas discret, il est absent au soleil.

## Typography

**Display Font:** IBM Plex Mono (avec monospace) pour les chiffres
**Body Font:** Inter (avec system-ui, sans-serif)
**Label/Mono Font:** IBM Plex Mono pour surtitres, provenance et toute valeur mesurée

**Character:** Inter porte l'interface, sobre et dense ; Plex Mono porte la mesure, et sa chasse fixe aligne les colonnes de prévision. Le contraste entre les deux dit au premier coup d'œil ce qui est une commande et ce qui est une donnée.

### Hierarchy
- **Nombre large** (700, 30px, 1) : la visibilité annoncée, la valeur héros d'un panneau.
- **Nombre moyen** (700, 19px, 1.1) : valeurs de tableau, compteurs.
- **Title** (800, 17px, 1.2) : titre de panneau, nom du secteur.
- **Label** (700, 15px, 1.25) : texte de bouton, de chip, de ligne d'action.
- **Body** (500, 14px, 1.45) : texte courant des panneaux. 16px pour tout champ de saisie mobile (en dessous, iOS zoome la page au focus).
- **Meta** (500, 13px, 1.4) : sous-lignes et explications courtes.
- **Kicker** (600, 12px, 0.11em, capitales, Plex Mono) : surtitres de section (« CES 7 DERNIERS JOURS »), en texte second.
- **Provenance** (500, 12px, 1.35, Plex Mono) : source et date d'une valeur, en texte trois.

### Named Rules
**The Plancher 12 Rule.** Aucun texte sous 12 px, provenance comprise. La hiérarchie se fait par la graisse, la casse et la police, pas en rapetissant.

**The Chiffre en Mono Rule.** Toute valeur mesurée ou calculée (mètres, nœuds, coefficients, heures) est en IBM Plex Mono. Un chiffre en Inter se lit comme du texte décoratif.

## Layout

Mobile (jusqu'à 768 px) : la carte occupe tout l'écran. En haut, la rangée recherche, Me localiser et compte, en plaques de 52 px. En bas, la barre de navigation à quatre onglets (60 px plus la zone de sécurité) surmontée de la ligne d'identité du point visé. Les panneaux s'ouvrent en plein écran entre le haut de l'écran et la ligne d'identité.

Tout élément flottant mobile se positionne par rapport à deux lignes mesurées en continu : `--vzm-topline` (bas de la boîte de recherche) et `--vzm-navline` (haut de la ligne d'identité, plus 8 px de respiration). `--vzm-navh` donne la hauteur exacte de l'empilement bas pour les bandeaux pleine largeur.

Desktop : géométrie dérivée de sept jetons (`--vz-gut` 16px, `--vz-gap` 12px, `--vz-unit` 44px, `--vz-rail` 64px, `--vz-r` 14px, `--vz-logo-w` 148px, `--vz-zoom-h` 92px) d'où se calculent les rangées et colonnes `--vz-row2`, `--vz-row3`, `--vz-col2`, `--vz-col3`. Le formulaire de dépôt devient une feuille centrée au-delà de 900 px, l'espace chasseur un panneau latéral de 420 px.

La vue d'ouverture est toujours la France entière, jamais une position mémorisée.

### Named Rules
**The Deux Lignes Rule.** Aucune surface flottante mobile ne porte un `top` ou un `bottom` en pixels écrits à la main : elle dérive de `--vzm-topline` ou `--vzm-navline`. Une valeur en dur finit toujours sous la barre basse.

**The Un Panneau Rule.** Un seul panneau ouvert à la fois, et tous passent par le même point d'entrée (`VZM_NAV.open`, ou une porte publique qu'il enveloppe). Un outil qui s'ouvre ferme les autres.

## Elevation & Depth

Le système est plat. La profondeur se lit par contraste de plans (plaque blanche sur carte sombre) et par le trait noir de 2 px, pas par l'ombre. Sur une carte sombre, une ombre sombre est invisible ; en plein soleil, un flou se lit comme une tache. Les ombres portées encore présentes sur certaines commandes flottantes (recherche, Me localiser, pile latérale) sont un héritage à retirer, pas un vocabulaire.

### Named Rules
**The Trait Noir Rule.** La séparation entre deux plans est un trait #0A1520 de 2 px. Pas d'ombre portée, pas de `backdrop-filter`, pas de surface translucide, pas de dégradé.

## Shapes

Des coins doucement arrondis sur une échelle fermée : panneau 16 px (coins hauts seulement quand il monte du bas), carte et bouton 14 px, groupe 12 px, ligne 10 px, petit contrôle 9 px. Les cibles circulaires sont réservées aux marqueurs de carte et au bouton communauté. Les icônes sont des SVG au trait (1,9 à 2,6 px selon la taille), jamais des emoji, jamais des icônes remplies.

## Components

### Buttons
- **Shape:** coins doucement arrondis (14px), hauteur minimale 56px.
- **Primary:** aplat teal signal, trait encre 2px, texte encre Label 16px 800. Sur pression, `scale(.97)` en 0,16 s.
- **Secondary / Fermer:** plaque blanche, trait encre 2px, icône et texte encre ; la croix de fermeture porte le mot « Fermer » à côté de l'icône.
- **Désactivé:** opacité 0,5, aucune interaction.

### Chips
- **Style:** plaque blanche, trait encre 2px, 14px, hauteur 56px, Label 15px.
- **State:** sélectionnée = aplat teal signal, texte encre. Les choix de créneau et de visibilité sont des grilles de chips à colonnes rétrécissables (`minmax(0,1fr)`), jamais plus larges que l'écran.

### Cards / Containers
- **Corner Style:** 16px pour un panneau, 14px pour une carte, 12px pour un groupe.
- **Background:** plaque blanche ; groupe #EDF1F4 à l'intérieur.
- **Shadow Strategy:** aucune (voir Elevation & Depth).
- **Border:** trait encre 2px pour le contour d'un panneau ou d'une commande, trait fin #C3D0DA pour les séparateurs internes.
- **Internal Padding:** 12px pour une carte, 14px pour un bloc.

### Inputs / Fields
- **Style:** plaque blanche, trait #C3D0DA de 2px au repos, 14px, hauteur 56px. Le champ lui-même s'étire sur toute la hauteur de sa boîte (`align-self:stretch`) : toute la surface blanche répond au doigt.
- **Focus:** le trait passe à l'encre.
- **Texte:** 16px sur mobile.

### Navigation
- **Barre basse mobile:** plaque blanche, trait encre 2px en haut, quatre onglets égaux de 60px séparés par un filet #C9D4DC. Icône SVG 24px au trait encre, libellé Inter 12px 700.
- **Onglet actif:** fond sélection douce, icône et libellé teal profond, libellé 800.
- **Pastille de compte:** cercle teal profond, chiffre blanc en Plex Mono 12px.

### Ligne d'identité (signature)
Bandeau blanc posé sur la barre basse : réticule teal courant, nom du point visé en Title, lecture en Plex Mono (« déplace la carte », distance au port). Il dit toujours ce que vise la croix au centre de l'écran, et monte au-dessus d'un panneau ouvert.

## Do's and Don'ts

### Do:
- **Do** écrire le texte d'accent en teal profond (#1A6B5D) et réserver le teal signal (#4DD4A8) aux aplats avec texte encre.
- **Do** donner 56px de zone de toucher à toute commande, y compris les croix et cases à cocher (le dessin peut rester petit, la zone non).
- **Do** composer toute valeur mesurée en IBM Plex Mono.
- **Do** ancrer chaque surface flottante mobile sur `--vzm-navline` ou `--vzm-topline`.
- **Do** ouvrir chaque panneau par le point d'entrée unique, pour que la barre basse, la ligne d'identité et le bouton communauté sachent ce qui est ouvert.
- **Do** dire l'absence de donnée en texte trois (« pas d'image exploitable »), jamais la masquer.
- **Do** préfixer les classes `vz-` (desktop) et `vzm-` (mobile).

### Don't:
- **Don't** écrire du texte en #4DD4A8 sur une surface claire.
- **Don't** utiliser de flou, de `backdrop-filter`, de surface translucide, de dégradé ou d'ombre portée.
- **Don't** descendre sous 12px de texte, ni plus clair que #51677A pour un texte.
- **Don't** positionner un élément flottant mobile avec un `bottom` ou `top` en pixels écrits à la main.
- **Don't** définir un jeton `--vz-*` dans un second `:root`.
- **Don't** utiliser d'emoji dans l'interface ni de tiret cadratin dans le code ou l'interface.
- **Don't** ouvrir l'application sur une position mémorisée : la vue d'ouverture est la France entière.
