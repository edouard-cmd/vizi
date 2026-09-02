/* ==========================================================================
   VISIMER - DEPOT D'UN RETOUR
   ==========================================================================
   Fichier autonome, charge APRES vizi-app.js et vizi-espace.js. Il ne
   redefinit rien : il consomme les jetons --vz-* poses par vizi-espace.js, la
   recherche de secteur de VZ_SEARCH, l'ecriture de VZ_RETOUR et le chemin
   d'envoi unique vzSubmitObservation.

   POURQUOI UN ECRAN PLEIN ET PAS UNE FEUILLE
   L'ancienne #obsSheet deduisait le secteur du centre de la carte. Ouverte
   depuis l'espace, elle rattachait donc le retour a ce que la carte montrait
   par hasard. Ici le secteur est CHOISI : chips des secteurs suivis, ou
   recherche nationale. Le point depose ne depend plus de la camera.

   UN SEUL POINT D'ENTREE. openObsSheet delegue a VZ_DEPOT.open. Les cinq
   boutons de la carte n'ont pas une ligne a changer, exactement le principe
   qui a permis a VZ_AUTH de reutiliser les identifiants de l'ancienne modale.
   L'ancienne feuille reste en place comme repli si ce module ne charge pas :
   un chasseur ne doit jamais se retrouver sans moyen de deposer.

   CE QUI PART, CE QUI RESTE
   Le secteur ne recoit QUE la valeur de visibilite et le pseudo. La date, le
   commentaire, la vie aquatique, la taille et les photos vivent dans
   users/{uid}/retours et n'en sortent jamais. Le bloc de transparence dit
   cela en une seconde et SUIT la case de consentement : quand le partage est
   refuse, le recapitulatif bascule, sinon il mentirait.

   INTERDITS REPRIS DU PRODUIT
     aucune synthese, aucune note globale, aucun feu tricolore
     aucun conseil, aucune incitation a sortir
     aucune celebration, aucun emoji, aucun tiret cadratin
     le mot "declarer" n'apparait nulle part
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CSS - prefixe vzd-, jetons --vz-* herites de vizi-espace.js
     ------------------------------------------------------------------------ */
  var CSS = ''
    + '#vzDepot{position:fixed;inset:0;z-index:1500;display:none;'
    +   'background:var(--vz-surface,#fff);font-family:var(--vz-font-ui,Inter,sans-serif);'
    +   'color:var(--vz-text,#0A1520);flex-direction:column;overflow:hidden;}'
    + '#vzDepot.open{display:flex;}'
    // Le banc l'a montre : sans cette regle, les quatre onglets de la barre du
    // bas restaient TAPABLES par dessus l'ecran plein. Un chasseur en train de
    // deposer pouvait donc atterrir sur les Previsions et perdre sa saisie.
    // Meme liste que body.vz-espace-open : ces controles pilotent la carte et
    // ne veulent rien dire ici.
    + 'body.vz-depot-open #vzmNavBar,body.vz-depot-open #vzmIdent,'
    +   'body.vz-depot-open #vzAccountBtn,body.vz-depot-open #vzAccountMenu,'
    +   'body.vz-depot-open .vzm-sonar-fab,body.vz-depot-open .vzm-sonar-menu,'
    +   'body.vz-depot-open #vzRainCtrl,body.vz-depot-open #vzHuntBar,'
    +   'body.vz-depot-open #mobileAnalyzeBtn,body.vz-depot-open #mobileShareBtn,'
    +   'body.vz-depot-open #vzFabImprove,body.vz-depot-open .vz-layers-popover,'
    +   'body.vz-depot-open #vzSearch,'
    +   'body.vz-depot-open .leaflet-control-attribution{display:none !important;}'
    // Desktop : la feuille est centree et laisse la carte visible derriere, on
    // ne masque donc que ce qui passerait par dessus le scrim.
    + '@media (min-width:900px){'
    +   'body.vz-depot-open #vzmNavBar,body.vz-depot-open #vzSearch,'
    +   'body.vz-depot-open #vzmIdent{display:revert !important;}'
    + '}'

    // --- barre de titre ----------------------------------------------------
    + '#vzDepot .vzd-head{display:flex;align-items:center;gap:12px;flex-shrink:0;'
    +   'height:var(--vz-panel-head-h,60px);padding:0 12px;background:var(--vz-surface,#fff);'
    +   'border-bottom:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);}'
    + '#vzDepot .vzd-x{display:flex;align-items:center;justify-content:center;'
    +   'width:44px;height:44px;flex-shrink:0;padding:0;background:var(--vz-surface,#fff);'
    +   'border:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);border-radius:11px;'
    +   'color:var(--vz-ink,#0A1520);cursor:pointer;-webkit-tap-highlight-color:transparent;}'
    + '#vzDepot .vzd-x svg{width:20px;height:20px;fill:none;stroke:currentColor;'
    +   'stroke-width:2.6;stroke-linecap:round;}'
    + '#vzDepot .vzd-head h2{margin:0;font-size:var(--vz-fs-title,17px);font-weight:800;'
    +   'letter-spacing:-.01em;}'

    // --- corps -------------------------------------------------------------
    + '#vzDepot .vzd-body{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;'
    +   'padding:14px 12px 20px;display:grid;gap:16px;align-content:start;}'
    + '#vzDepot .vzd-f{display:grid;gap:8px;}'
    + '#vzDepot .vzd-k{font-family:var(--vz-font-num,monospace);font-size:11px;font-weight:600;'
    +   'text-transform:uppercase;letter-spacing:.11em;color:var(--vz-text-2,#33475A);}'

    // --- secteur : chips + recherche --------------------------------------
    + '#vzDepot .vzd-chips{display:flex;flex-wrap:wrap;gap:8px;}'
    + '#vzDepot .vzd-chip{min-height:56px;padding:0 16px;background:var(--vz-surface,#fff);'
    +   'border:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);border-radius:var(--vz-r-card,14px);'
    +   'font-family:inherit;font-size:15px;font-weight:700;color:var(--vz-ink,#0A1520);'
    +   'cursor:pointer;-webkit-tap-highlight-color:transparent;'
    +   'transition:background var(--vz-t-state,.2s);}'
    + '#vzDepot .vzd-chip.on{background:var(--vz-accent,#4DD4A8);}'
    + '#vzDepot .vzd-search{position:relative;}'
    + '#vzDepot .vzd-search-box{display:flex;align-items:center;gap:10px;min-height:56px;'
    +   'padding:0 14px;background:var(--vz-surface,#fff);'
    +   'border:var(--vz-bd,2px) solid var(--vz-line,#C3D0DA);border-radius:var(--vz-r-card,14px);}'
    + '#vzDepot .vzd-search-box svg{width:18px;height:18px;flex-shrink:0;fill:none;'
    +   'stroke:var(--vz-text-2,#33475A);stroke-width:2;stroke-linecap:round;}'
    // Hauteur portee par l'input LUI-MEME, pas seulement par la boite : sinon
    // seule une bande de 19px au milieu de la ligne donne le focus, et le reste
    // de la surface blanche ne repond pas au doigt.
    + '#vzDepot .vzd-search-box input{flex:1;min-width:0;align-self:stretch;min-height:52px;'
    +   'border:none;outline:none;background:none;'
    +   'font-family:inherit;font-size:15px;font-weight:500;color:var(--vz-ink,#0A1520);}'
    + '#vzDepot .vzd-search-box input::placeholder{color:var(--vz-text-2,#33475A);font-weight:400;}'
    + '#vzDepot .vzd-res{display:none;margin-top:6px;padding:5px;max-height:260px;overflow-y:auto;'
    +   'background:var(--vz-surface,#fff);border:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);'
    +   'border-radius:var(--vz-r-card,14px);}'
    + '#vzDepot .vzd-res.show{display:block;}'
    + '#vzDepot .vzd-res button{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;'
    +   'padding:6px 10px;border:none;border-radius:9px;background:none;cursor:pointer;'
    +   'text-align:left;font-family:inherit;color:var(--vz-ink,#0A1520);}'
    + '#vzDepot .vzd-res button:active{background:var(--vz-selected,#DCEFE7);}'
    + '#vzDepot .vzd-res .rn{font-size:15px;font-weight:700;}'
    + '#vzDepot .vzd-res .rs{font-family:var(--vz-font-num,monospace);font-size:11px;'
    +   'color:var(--vz-text-2,#33475A);}'

    // --- date : libelle stylise, input natif transparent par-dessus --------
    + '#vzDepot .vzd-date{position:relative;display:flex;align-items:center;gap:12px;'
    +   'min-height:56px;padding:0 14px;background:var(--vz-surface,#fff);'
    +   'border:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);border-radius:var(--vz-r-card,14px);}'
    + '#vzDepot .vzd-date svg{width:20px;height:20px;flex-shrink:0;fill:none;'
    +   'stroke:var(--vz-ink,#0A1520);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}'
    + '#vzDepot .vzd-date .d{flex:1;min-width:0;font-size:16px;font-weight:700;}'
    + '#vzDepot .vzd-date .chev{width:20px;height:20px;flex-shrink:0;fill:none;'
    +   'stroke:var(--vz-text-2,#33475A);stroke-width:2.6;stroke-linecap:round;'
    +   'stroke-linejoin:round;transition:transform var(--vz-t-state,.2s);}'
    + '#vzDepot .vzd-date.open .chev{transform:rotate(90deg);}'

    // --- calendrier --------------------------------------------------------
    // Ecrit a la main plutot que de compter sur input[type=date]. Le picker
    // natif ne s'ouvre pas au clic sur desktop (seul l'indicateur minuscule
    // repond) et son rendu differe sur chaque plateforme. Un instrument doit
    // se comporter pareil partout.
    + '#vzDepot .vzd-cal{margin-top:8px;padding:10px;background:var(--vz-surface,#fff);'
    +   'border:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);'
    +   'border-radius:var(--vz-r-card,14px);}'
    + '#vzDepot .vzd-cal-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;}'
    + '#vzDepot .vzd-cal-head .m{flex:1;min-width:0;text-align:center;font-size:15px;'
    +   'font-weight:800;text-transform:capitalize;}'
    + '#vzDepot .vzd-cal-nav{display:flex;align-items:center;justify-content:center;'
    +   'width:44px;height:44px;flex-shrink:0;padding:0;background:var(--vz-surface,#fff);'
    +   'border:var(--vz-bd,2px) solid var(--vz-line,#C3D0DA);border-radius:11px;'
    +   'color:var(--vz-ink,#0A1520);cursor:pointer;-webkit-tap-highlight-color:transparent;}'
    + '#vzDepot .vzd-cal-nav svg{width:18px;height:18px;fill:none;stroke:currentColor;'
    +   'stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;}'
    + '#vzDepot .vzd-cal-nav[disabled]{opacity:.35;pointer-events:none;}'
    + '#vzDepot .vzd-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}'
    + '#vzDepot .vzd-cal-w{height:24px;display:flex;align-items:center;justify-content:center;'
    +   'font-family:var(--vz-font-num,monospace);font-size:10px;font-weight:600;'
    +   'letter-spacing:.06em;color:var(--vz-text-2,#33475A);}'
    + '#vzDepot .vzd-cal-d{height:48px;display:flex;align-items:center;justify-content:center;'
    +   'padding:0;background:var(--vz-surface,#fff);border:var(--vz-bd,2px) solid transparent;'
    +   'border-radius:10px;cursor:pointer;font-family:var(--vz-font-num,monospace);'
    +   'font-size:15px;font-weight:600;color:var(--vz-ink,#0A1520);'
    +   '-webkit-tap-highlight-color:transparent;}'
    + '#vzDepot .vzd-cal-d.today{border-color:var(--vz-line,#C3D0DA);}'
    + '#vzDepot .vzd-cal-d.on{background:var(--vz-accent,#4DD4A8);'
    +   'border-color:var(--vz-ink,#0A1520);font-weight:800;}'
    // Une sortie ne peut pas avoir eu lieu demain. Les jours a venir restent
    // AFFICHES mais inertes : les masquer ferait croire a un calendrier casse.
    + '#vzDepot .vzd-cal-d[disabled]{opacity:.28;pointer-events:none;}'
    + '#vzDepot .vzd-cal-d.vide{visibility:hidden;pointer-events:none;}'

    // --- grille de visibilite : meme echelle que #obsVisGrid ---------------
    + '#vzDepot .vzd-vis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}'
    + '#vzDepot .vzd-vism{min-height:56px;border:var(--vz-bd,2px) solid var(--vz-line,#C3D0DA);'
    +   'background:var(--vz-surface,#fff);border-radius:var(--vz-r-card,14px);'
    +   'font-family:var(--vz-font-num,monospace);font-size:14px;font-weight:700;'
    +   'color:var(--vz-text-2,#33475A);cursor:pointer;-webkit-tap-highlight-color:transparent;}'

    // --- triplets : eau, vie, taille ---------------------------------------
    + '#vzDepot .vzd-tri{display:flex;gap:8px;}'
    + '#vzDepot .vzd-tri button{flex:1;min-width:0;min-height:56px;padding:8px 4px;'
    +   'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;'
    +   'background:var(--vz-surface,#fff);border:var(--vz-bd,2px) solid var(--vz-line,#C3D0DA);'
    +   'border-radius:var(--vz-r-card,14px);cursor:pointer;font-family:inherit;'
    +   'color:var(--vz-text-2,#33475A);-webkit-tap-highlight-color:transparent;}'
    + '#vzDepot .vzd-tri .lb{font-size:14px;font-weight:700;}'
    + '#vzDepot .vzd-tri .sb{font-family:var(--vz-font-num,monospace);font-size:10px;'
    +   'font-weight:500;opacity:.8;text-align:center;line-height:1.2;}'
    + '#vzDepot .vzd-tri button.on{border-color:var(--vz-ink,#0A1520);}'
    + '#vzDepot .vzd-dots{display:inline-flex;gap:3px;align-items:center;height:9px;}'
    + '#vzDepot .vzd-dots i{width:4px;height:4px;border-radius:50%;background:currentColor;'
    +   'opacity:.85;}'

    // --- commentaire -------------------------------------------------------
    + '#vzDepot .vzd-note{width:100%;min-height:92px;padding:12px 14px;resize:vertical;'
    +   'background:var(--vz-surface,#fff);border:var(--vz-bd,2px) solid var(--vz-line,#C3D0DA);'
    +   'border-radius:var(--vz-r-card,14px);font-family:inherit;font-size:15px;font-weight:500;'
    +   'color:var(--vz-ink,#0A1520);outline:none;box-sizing:border-box;}'
    + '#vzDepot .vzd-note:focus{border-color:var(--vz-ink,#0A1520);}'

    // --- album photo -------------------------------------------------------
    + '#vzDepot .vzd-album{display:flex;flex-wrap:wrap;gap:8px;}'
    + '#vzDepot .vzd-shot{position:relative;width:84px;height:84px;border-radius:12px;'
    +   'overflow:hidden;border:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);}'
    + '#vzDepot .vzd-shot img{width:100%;height:100%;object-fit:cover;display:block;}'
    + '#vzDepot .vzd-shot .rm{position:absolute;top:3px;right:3px;width:26px;height:26px;'
    +   'display:flex;align-items:center;justify-content:center;padding:0;border:none;'
    +   'border-radius:50%;background:rgba(10,21,32,.82);color:#fff;cursor:pointer;}'
    + '#vzDepot .vzd-shot .rm svg{width:13px;height:13px;fill:none;stroke:currentColor;'
    +   'stroke-width:2.6;stroke-linecap:round;}'
    + '#vzDepot .vzd-add{width:84px;height:84px;display:flex;flex-direction:column;'
    +   'align-items:center;justify-content:center;gap:4px;background:var(--vz-surface,#fff);'
    +   'border:var(--vz-bd,2px) dashed var(--vz-line,#C3D0DA);border-radius:12px;cursor:pointer;'
    +   'font-family:inherit;font-size:11px;font-weight:600;color:var(--vz-text-2,#33475A);'
    +   '-webkit-tap-highlight-color:transparent;}'
    + '#vzDepot .vzd-add svg{width:20px;height:20px;fill:none;stroke:currentColor;'
    +   'stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}'
    + '#vzDepot .vzd-priv{display:flex;align-items:flex-start;gap:7px;'
    +   'font-family:var(--vz-font-num,monospace);font-size:11px;line-height:1.4;'
    +   'color:var(--vz-text-2,#33475A);}'
    + '#vzDepot .vzd-priv svg{width:13px;height:13px;flex-shrink:0;margin-top:1px;fill:none;'
    +   'stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}'

    // --- consentement et transparence --------------------------------------
    + '#vzDepot .vzd-consent{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;'
    +   'padding:8px 14px;background:var(--vz-surface,#fff);'
    +   'border:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);border-radius:var(--vz-r-card,14px);'
    +   'cursor:pointer;text-align:left;font-family:inherit;font-size:15px;font-weight:700;'
    +   'color:var(--vz-ink,#0A1520);-webkit-tap-highlight-color:transparent;}'
    + '#vzDepot .vzd-box{display:flex;align-items:center;justify-content:center;flex-shrink:0;'
    +   'width:26px;height:26px;border:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);'
    +   'border-radius:7px;background:var(--vz-surface,#fff);color:transparent;}'
    + '#vzDepot .vzd-box svg{width:16px;height:16px;fill:none;stroke:currentColor;'
    +   'stroke-width:3;stroke-linecap:round;stroke-linejoin:round;}'
    + '#vzDepot .vzd-consent.on .vzd-box{background:var(--vz-accent,#4DD4A8);'
    +   'color:var(--vz-ink,#0A1520);}'
    + '#vzDepot .vzd-share{display:grid;gap:2px;padding:4px;background:var(--vz-group,#EDF1F4);'
    +   'border-radius:var(--vz-r-group,12px);}'
    + '#vzDepot .vzd-share-r{display:flex;align-items:flex-start;gap:11px;padding:11px 12px;'
    +   'background:var(--vz-surface,#fff);border-radius:var(--vz-r-row,10px);}'
    + '#vzDepot .vzd-share-r svg{width:17px;height:17px;flex-shrink:0;margin-top:1px;fill:none;'
    +   'stroke:var(--vz-text-2,#33475A);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}'
    + '#vzDepot .vzd-share-r.pub svg{stroke:var(--vz-accent-deep,#1A6B5D);}'
    + '#vzDepot .vzd-share-r .tx{display:grid;gap:2px;min-width:0;}'
    + '#vzDepot .vzd-share-r .t{font-size:14px;font-weight:700;color:var(--vz-ink,#0A1520);}'
    + '#vzDepot .vzd-share-r .s{font-family:var(--vz-font-num,monospace);font-size:11px;'
    +   'font-weight:500;line-height:1.35;color:var(--vz-text-2,#33475A);}'

    // --- erreur reseau -----------------------------------------------------
    + '#vzDepot .vzd-err{display:flex;align-items:flex-start;gap:11px;padding:13px 14px;'
    +   'background:#FCEEEC;border:var(--vz-bd,2px) solid var(--vz-danger,#C94A3D);'
    +   'border-radius:var(--vz-r-card,14px);}'
    + '#vzDepot .vzd-err svg{width:19px;height:19px;flex-shrink:0;margin-top:1px;fill:none;'
    +   'stroke:var(--vz-danger,#C94A3D);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}'
    + '#vzDepot .vzd-err .t{font-size:15px;font-weight:800;color:var(--vz-danger,#C94A3D);}'
    + '#vzDepot .vzd-err .s{font-size:14px;font-weight:500;color:var(--vz-ink,#0A1520);}'

    // --- pied collant ------------------------------------------------------
    + '#vzDepot .vzd-foot{flex-shrink:0;padding:12px;background:var(--vz-surface,#fff);'
    +   'border-top:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);'
    +   'padding-bottom:calc(12px + env(safe-area-inset-bottom,0px));}'
    + '#vzDepot .vzd-cta{display:flex;align-items:center;justify-content:center;gap:8px;'
    +   'width:100%;min-height:56px;padding:0 18px;border-radius:var(--vz-r-card,14px);'
    +   'background:var(--vz-accent,#4DD4A8);border:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);'
    +   'cursor:pointer;font-family:inherit;font-size:16px;font-weight:800;'
    +   'color:var(--vz-ink,#0A1520);-webkit-tap-highlight-color:transparent;'
    +   'transition:transform var(--vz-t-press,.16s);}'
    + '#vzDepot .vzd-cta:active{transform:scale(.97);}'
    + '#vzDepot .vzd-cta[disabled]{opacity:.5;pointer-events:none;}'

    // --- confirmation ------------------------------------------------------
    + '#vzDepot .vzd-ok{flex:1;min-height:0;overflow-y:auto;padding:32px 18px;display:grid;'
    +   'gap:12px;align-content:start;justify-items:center;text-align:center;}'
    + '#vzDepot .vzd-ok .mk{display:flex;align-items:center;justify-content:center;'
    +   'width:66px;height:66px;border-radius:50%;background:var(--vz-accent,#4DD4A8);'
    +   'border:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);color:var(--vz-ink,#0A1520);}'
    + '#vzDepot .vzd-ok .mk svg{width:30px;height:30px;fill:none;stroke:currentColor;'
    +   'stroke-width:3;stroke-linecap:round;stroke-linejoin:round;}'
    + '#vzDepot .vzd-ok .t{font-size:20px;font-weight:800;}'
    + '#vzDepot .vzd-ok .s{font-size:15px;font-weight:500;color:var(--vz-text-2,#33475A);}'
    + '#vzDepot .vzd-rec{width:100%;max-width:420px;margin-top:10px;display:grid;gap:2px;'
    +   'padding:4px;background:var(--vz-group,#EDF1F4);border-radius:var(--vz-r-group,12px);}'
    + '#vzDepot .vzd-rec .r{display:flex;align-items:center;justify-content:space-between;'
    +   'gap:12px;padding:12px;background:var(--vz-surface,#fff);'
    +   'border-radius:var(--vz-r-row,10px);}'
    + '#vzDepot .vzd-rec .k{font-family:var(--vz-font-num,monospace);font-size:11px;'
    +   'font-weight:600;text-transform:uppercase;letter-spacing:.09em;'
    +   'color:var(--vz-text-2,#33475A);}'
    + '#vzDepot .vzd-rec .v{font-family:var(--vz-font-num,monospace);font-size:15px;'
    +   'font-weight:700;color:var(--vz-ink,#0A1520);}'
    + '#vzDepot .vzd-rec .v.ui{font-family:var(--vz-font-ui,Inter,sans-serif);}'

    // --- desktop : feuille centree, jamais un formulaire noye dans la page --
    + '@media (min-width:900px){'
    +   '#vzDepot{inset:auto;top:50%;left:50%;transform:translate(-50%,-50%);'
    +     'width:520px;max-width:calc(100vw - 48px);height:min(88vh,860px);'
    +     'border:var(--vz-bd,2px) solid var(--vz-ink,#0A1520);'
    +     'border-radius:var(--vz-r-panel,16px);overflow:hidden;'
    +     'box-shadow:0 18px 50px rgba(8,17,27,.34);}'
    + '}'
    + '#vzDepotScrim{position:fixed;inset:0;z-index:1499;display:none;'
    +   'background:rgba(8,17,27,.45);}'
    + '#vzDepotScrim.open{display:block;}'
    + '@media (max-width:899px){#vzDepotScrim{display:none !important;}}';

  var ICO = {
    x:      '<svg viewBox="0 0 24 24"><path d="M6 6 L18 18"/><path d="M18 6 L6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 L21 21"/></svg>',
    cal:    '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10 H21"/><path d="M8 3 V7"/><path d="M16 3 V7"/></svg>',
    check:  '<svg viewBox="0 0 24 24"><path d="M4 12.5 l5.5 5.5 L20 7"/></svg>',
    lock:   '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10 V7 a4 4 0 0 1 8 0 v3"/></svg>',
    up:     '<svg viewBox="0 0 24 24"><path d="M12 19 V5"/><path d="M6 11 l6-6 6 6"/></svg>',
    warn:   '<svg viewBox="0 0 24 24"><path d="M12 4 l9 16 H3 Z"/><path d="M12 10 v4"/><path d="M12 17.2 v.1"/></svg>',
    cam:    '<svg viewBox="0 0 24 24"><path d="M3 8.5 A2 2 0 0 1 5 6.5 h2.2 l1.3-2 h7 l1.3 2 H19 a2 2 0 0 1 2 2 V18 a2 2 0 0 1-2 2 H5 a2 2 0 0 1-2-2 Z"/><circle cx="12" cy="13" r="3.6"/></svg>',
    chev:   '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6 l6 6 -6 6"/></svg>',
    prev:   '<svg viewBox="0 0 24 24"><path d="M15 5 l-7 7 7 7"/></svg>',
    next:   '<svg viewBox="0 0 24 24"><path d="M9 5 l7 7 -7 7"/></svg>'
  };

  /* ------------------------------------------------------------------------
     ECHELLES
     ------------------------------------------------------------------------
     La grille de visibilite reprend EXACTEMENT #obsVisGrid : memes paliers,
     memes couleurs, meme regle de texte fonce. Deux echelles differentes pour
     la meme mesure feraient diverger ce que le chasseur croit deposer et ce
     que le moteur recoit.
     ------------------------------------------------------------------------ */
  var VIS = [
    { m: 1, c: '#E89B3C', lb: '1 m' }, { m: 2, c: '#D8C84A', lb: '2 m' },
    { m: 3, c: '#2DA888', lb: '3 m' }, { m: 4, c: '#2DA888', lb: '4 m' },
    { m: 5, c: '#4DD4A8', lb: '5 m' }, { m: 6, c: '#4DD4A8', lb: '6 m' },
    { m: 7, c: '#4DD4A8', lb: '7 m' }, { m: 8, c: '#4DD4A8', lb: '8 m +' }
  ];
  // obsDarkText de l'app rendait du BLANC sur #2DA888 : 2,97:1 mesure au banc,
  // sous le seuil de 4,5:1. Illisible en plein soleil, ce qui est precisement
  // la condition d'usage. Encre foncee sur les deux verts, blanc sur l'orange.
  function darkText(c) {
    if (c === '#D8C84A') return '#3D3A10';
    if (c === '#4DD4A8' || c === '#2DA888') return '#06251C';
    return '#fff';
  }

  var EAU = [
    { k: 'claire',  c: '#2DA888', lb: 'Claire',  n: 1 },
    { k: 'voilee',  c: '#D8C84A', lb: 'Voil\u00e9e',  n: 4 },
    { k: 'chargee', c: '#E89B3C', lb: 'Charg\u00e9e', n: 8 }
  ];
  var VIE = [
    { k: 'faible',  lb: 'Faible',  sb: 'peu de poissons' },
    { k: 'moyenne', lb: 'Moyenne', sb: 'quelques bancs' },
    { k: 'forte',   lb: 'Forte',   sb: 'poisson partout' }
  ];
  var TAILLE = [
    { k: 'petits',  lb: 'Petits',  sb: 'sous la maille' },
    { k: 'normaux', lb: 'Normaux', sb: 'taille courante' },
    { k: 'grands',  lb: 'Grands',  sb: 'beaux sujets' }
  ];

  var JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  // Semaine commencant le lundi, usage francais.
  var SEM = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  var MOIS  = ['janvier', 'f\u00e9vrier', 'mars', 'avril', 'mai', 'juin', 'juillet',
               'ao\u00fbt', 'septembre', 'octobre', 'novembre', 'd\u00e9cembre'];

  /* ------------------------------------------------------------------------
     ETAT
     ------------------------------------------------------------------------
     _photos garde des Blob locaux et leur URL d'apercu. Rien ne monte dans
     Storage avant l'envoi : un formulaire abandonne ne doit pas laisser de
     fichiers orphelins dans le bucket.
     ------------------------------------------------------------------------ */
  var _built = false, _el = null, _scrim = null, _body = null, _foot = null;
  var _secteur = null;        // { nom, lat, lon }
  var _date = '';             // AAAA-MM-JJ
  var _vis = null;
  var _eau = null;
  var _vie = null;
  var _taille = null;
  var _notes = '';
  var _photos = [];           // [{ blob, url }]
  var _consent = true;
  var _error = false;
  var _sending = false;
  var _done = null;           // recapitulatif apres envoi
  var _searchTimer = null;
  var _searchItems = [];
  var _calOpen = false;
  var _calMois = null;        // Date positionnee au 1er du mois affiche

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function dateLongue(iso) {
    var d = iso ? new Date(iso + 'T12:00:00') : new Date();
    if (isNaN(d.getTime())) d = new Date();
    return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
  }

  function dateCourteFr(iso) {
    var d = iso ? new Date(iso + 'T12:00:00') : new Date();
    if (isNaN(d.getTime())) d = new Date();
    return d.getDate() + ' ' + MOIS[d.getMonth()].slice(0, 4) + '.';
  }

  function pseudo() {
    try {
      if (typeof VZ_RETOUR !== 'undefined' && VZ_RETOUR && VZ_RETOUR.isLogged()) {
        var p = VZ_RETOUR.pseudo();
        if (p) return p;
      }
      return localStorage.getItem('vizi_pseudo') || '';
    } catch (e) { return ''; }
  }

  /* ------------------------------------------------------------------------
     SECTEURS SUIVIS - source des chips d'acces rapide
     ------------------------------------------------------------------------
     Lus a l'ouverture depuis VZ_ESPACE. Absents ou vides, les chips
     disparaissent et la recherche reste seule : un cadre vide au-dessus d'un
     champ de recherche ne dit rien au chasseur.
     ------------------------------------------------------------------------ */
  function secteursSuivis() {
    try {
      if (typeof VZ_ESPACE !== 'undefined' && VZ_ESPACE && VZ_ESPACE.secteurs) {
        return (VZ_ESPACE.secteurs() || []).filter(function (s) {
          return s && typeof s.lat === 'number' && typeof s.lon === 'number' && s.nom;
        }).slice(0, 6);
      }
    } catch (e) {}
    return [];
  }

  /* ------------------------------------------------------------------------
     RENDU
     ------------------------------------------------------------------------ */
  function vueForm() {
    var h = '';

    if (_error) {
      h += '<div class="vzd-err">' + ICO.warn + '<span class="tx" style="display:grid;gap:2px;">'
        +    '<span class="t">Envoi impossible</span>'
        +    '<span class="s">Pas de r\u00e9seau. Ta saisie est conserv\u00e9e.</span>'
        +  '</span></div>';
    }

    // --- secteur ---
    var suivis = secteursSuivis();
    h += '<div class="vzd-f"><span class="vzd-k">Secteur</span>';
    if (suivis.length) {
      h += '<div class="vzd-chips">';
      suivis.forEach(function (s) {
        var on = _secteur && _secteur.nom === s.nom;
        h += '<button type="button" class="vzd-chip' + (on ? ' on' : '') + '"'
          +  ' data-sec="' + esc(s.nom) + '|' + s.lat + '|' + s.lon + '">'
          +  esc(s.nom) + '</button>';
      });
      h += '</div>';
    }
    var libelle = (_secteur && !suivis.some(function (s) { return s.nom === _secteur.nom; }))
      ? _secteur.nom : '';
    h += '<div class="vzd-search">'
      +    '<div class="vzd-search-box">' + ICO.search
      +      '<input type="text" id="vzdSearch" autocomplete="off" '
      +      'placeholder="Chercher un autre secteur" value="' + esc(libelle) + '" />'
      +    '</div>'
      +    '<div class="vzd-res" id="vzdRes"></div>'
      +  '</div>';
    h += '</div>';

    // --- date ---
    h += '<div class="vzd-f"><span class="vzd-k">Date de la sortie</span>'
      +    '<button type="button" class="vzd-date' + (_calOpen ? ' open' : '') + '" id="vzdDateBtn">'
      +      ICO.cal
      +      '<span class="d">' + esc(dateLongue(_date)) + '</span>'
      +      ICO.chev
      +    '</button>'
      +    (_calOpen ? calendrier() : '')
      +  '</div>';

    // --- visibilite ---
    h += '<div class="vzd-f"><span class="vzd-k">Visibilit\u00e9 moyenne observ\u00e9e</span>'
      +    '<div class="vzd-vis">';
    VIS.forEach(function (v) {
      var on = _vis === v.m;
      var st = on ? 'background:' + v.c + ';border-color:' + v.c + ';color:' + darkText(v.c) + ';' : '';
      h += '<button type="button" class="vzd-vism" data-vis="' + v.m + '" style="' + st + '">'
        +  v.lb + '</button>';
    });
    h += '</div></div>';

    // --- etat de l'eau ---
    h += '<div class="vzd-f"><span class="vzd-k">L\'eau \u00e9tait comment ?</span>'
      +    '<div class="vzd-tri">';
    EAU.forEach(function (e) {
      var on = _eau === e.k;
      var st = on ? 'background:' + e.c + ';border-color:' + e.c + ';color:' + darkText(e.c) + ';' : '';
      var dots = '';
      for (var i = 0; i < e.n; i++) dots += '<i></i>';
      h += '<button type="button" data-eau="' + e.k + '" class="' + (on ? 'on' : '') + '" style="' + st + '">'
        +    '<span class="vzd-dots">' + dots + '</span>'
        +    '<span class="lb">' + e.lb + '</span>'
        +  '</button>';
    });
    h += '</div></div>';

    // --- vie aquatique et taille ---
    // Aucune couleur d'echelle sur ces deux champs : une vie faible ou des
    // poissons petits ne sont pas un mauvais resultat. Les colorer en orange
    // transformerait une observation en jugement.
    h += triBloc('Vie aquatique', 'vie', VIE, _vie);
    h += triBloc('Taille des poissons', 'taille', TAILLE, _taille);

    // --- commentaire ---
    h += '<div class="vzd-f"><span class="vzd-k">Commentaire</span>'
      +    '<textarea class="vzd-note" id="vzdNotes" maxlength="180" '
      +    'placeholder="Optionnel">' + esc(_notes) + '</textarea>'
      +  '</div>';

    // --- photos ---
    h += '<div class="vzd-f"><span class="vzd-k">Mes photos</span><div class="vzd-album">';
    _photos.forEach(function (p, i) {
      h += '<div class="vzd-shot"><img src="' + esc(p.url) + '" alt="" />'
        +    '<button type="button" class="rm" data-rm="' + i + '" aria-label="Retirer">'
        +      ICO.x + '</button></div>';
    });
    if (_photos.length < 4) {
      h += '<button type="button" class="vzd-add" id="vzdAdd">' + ICO.cam + '<span>Ajouter</span></button>';
    }
    h += '</div>'
      +  '<div class="vzd-priv">' + ICO.lock
      +    '<span>Album personnel. Aucune photo n\'est publi\u00e9e ni partag\u00e9e au secteur.</span>'
      +  '</div></div>';

    // --- consentement ---
    h += '<div class="vzd-f">'
      +    '<button type="button" class="vzd-consent' + (_consent ? ' on' : '') + '" id="vzdConsent">'
      +      '<span class="vzd-box">' + ICO.check + '</span>'
      +      '<span>Partager la visibilit\u00e9 avec la communaut\u00e9</span>'
      +    '</button>'
      +  '</div>';

    // --- transparence, qui SUIT la case ---
    h += '<div class="vzd-f">' + blocPartage() + '</div>';

    return h;
  }

  /* ------------------------------------------------------------------------
     CALENDRIER
     ------------------------------------------------------------------------
     Grille mensuelle ecrite a la main. input[type=date] a ete retire : son
     picker ne s'ouvre pas au clic sur desktop, et son rendu change a chaque
     plateforme. Ici le comportement est le meme partout, ce qu'on attend d'un
     instrument.

     Aucune date future selectionnable : une sortie ne peut pas avoir eu lieu
     demain. Les jours a venir restent affiches et inertes, les masquer ferait
     croire a un calendrier casse.
     ------------------------------------------------------------------------ */
  function moisAffiche() {
    if (_calMois) return _calMois;
    var d = _date ? new Date(_date + 'T12:00:00') : new Date();
    if (isNaN(d.getTime())) d = new Date();
    _calMois = new Date(d.getFullYear(), d.getMonth(), 1);
    return _calMois;
  }

  function iso(y, m, j) {
    return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(j).padStart(2, '0');
  }

  function calendrier() {
    var cur = moisAffiche();
    var an = cur.getFullYear(), mo = cur.getMonth();
    var auj = new Date();
    var isoAuj = iso(auj.getFullYear(), auj.getMonth(), auj.getDate());

    // getDay() rend 0 pour dimanche ; on decale pour une semaine au lundi.
    var premier = new Date(an, mo, 1).getDay();
    var decal = (premier + 6) % 7;
    var nbJours = new Date(an, mo + 1, 0).getDate();

    // Le mois suivant n'est atteignable que s'il contient au moins un jour
    // passe ou aujourd'hui.
    var suivantOk = new Date(an, mo + 1, 1) <= new Date(auj.getFullYear(), auj.getMonth(), 1);

    var h = '<div class="vzd-cal">'
      +   '<div class="vzd-cal-head">'
      +     '<button type="button" class="vzd-cal-nav" data-mois="-1" aria-label="Mois pr\u00e9c\u00e9dent">'
      +       ICO.prev + '</button>'
      +     '<span class="m">' + MOIS[mo] + ' ' + an + '</span>'
      +     '<button type="button" class="vzd-cal-nav" data-mois="1" aria-label="Mois suivant"'
      +       (suivantOk ? '' : ' disabled') + '>' + ICO.next + '</button>'
      +   '</div>'
      +   '<div class="vzd-cal-grid">';

    SEM.forEach(function (w) { h += '<span class="vzd-cal-w">' + w + '</span>'; });
    for (var i = 0; i < decal; i++) h += '<span class="vzd-cal-d vide"></span>';

    for (var j = 1; j <= nbJours; j++) {
      var v = iso(an, mo, j);
      var futur = v > isoAuj;
      var cls = 'vzd-cal-d'
        + (v === _date ? ' on' : '')
        + (v === isoAuj ? ' today' : '');
      h += '<button type="button" class="' + cls + '" data-jour="' + v + '"'
        + (futur ? ' disabled' : '') + '>' + j + '</button>';
    }

    return h + '</div></div>';
  }

  function triBloc(titre, cle, liste, sel) {
    var h = '<div class="vzd-f"><span class="vzd-k">' + titre + '</span><div class="vzd-tri">';
    liste.forEach(function (o) {
      var on = sel === o.k;
      var st = on ? 'background:var(--vz-accent,#4DD4A8);border-color:var(--vz-ink,#0A1520);'
                  + 'color:var(--vz-ink,#0A1520);' : '';
      h += '<button type="button" data-' + cle + '="' + o.k + '" class="' + (on ? 'on' : '') + '"'
        +  ' style="' + st + '">'
        +    '<span class="lb">' + o.lb + '</span>'
        +    '<span class="sb">' + o.sb + '</span>'
        +  '</button>';
    });
    return h + '</div></div>';
  }

  function blocPartage() {
    if (!_consent) {
      return '<div class="vzd-share">'
        +      '<div class="vzd-share-r">' + ICO.lock + '<span class="tx">'
        +        '<span class="t">Rien ne part au secteur</span>'
        +        '<span class="s">ton retour et tes photos restent dans ton historique</span>'
        +      '</span></div>'
        +    '</div>';
    }
    return '<div class="vzd-share">'
      +      '<div class="vzd-share-r pub">' + ICO.up + '<span class="tx">'
      +        '<span class="t">Ce qui alimente le secteur</span>'
      +        '<span class="s">la valeur de visibilit\u00e9, ton pseudo</span>'
      +      '</span></div>'
      +      '<div class="vzd-share-r">' + ICO.lock + '<span class="tx">'
      +        '<span class="t">Ce qui reste priv\u00e9</span>'
      +        '<span class="s">la date, ton commentaire, la vie aquatique, la taille, tes photos</span>'
      +      '</span></div>'
      +    '</div>';
  }

  function vueDone() {
    var d = _done || {};
    return '<div class="vzd-ok">'
      +      '<span class="mk">' + ICO.check + '</span>'
      +      '<div class="t">C\'est enregistr\u00e9</div>'
      +      '<div class="s">' + (d.partage
             ? 'Ta visibilit\u00e9 alimente le secteur.'
             : 'Ton retour reste dans ton historique.') + '</div>'
      +      '<div class="vzd-rec">'
      +        '<div class="r"><span class="k">Secteur</span>'
      +          '<span class="v ui">' + esc(d.secteur || '?') + '</span></div>'
      +        '<div class="r"><span class="k">Visibilit\u00e9</span>'
      +          '<span class="v">' + esc(d.vis != null ? d.vis + ' m' : '?') + '</span></div>'
      +        '<div class="r"><span class="k">Sortie</span>'
      +          '<span class="v">' + esc(dateCourteFr(d.date)) + '</span></div>'
      +      '</div>'
      +    '</div>';
  }

  function labelCta() {
    if (_sending) return 'Envoi...';
    if (_error)   return 'R\u00e9essayer';
    return _consent ? 'D\u00e9poser et partager' : 'Enregistrer sans partager';
  }

  function render() {
    if (!_built || !_el) return;
    if (_done) {
      _body.className = '';
      _body.innerHTML = vueDone();
      _foot.innerHTML = '<button type="button" class="vzd-cta" id="vzdBack">Revenir \u00e0 mon espace</button>';
      var b = document.getElementById('vzdBack');
      if (b) b.addEventListener('click', fermerVersEspace);
      return;
    }
    // Chaque appui sur une pastille reconstruit tout le formulaire. Sans cette
    // restauration, choisir "Grands" en bas du formulaire renvoyait le chasseur
    // en haut de l'ecran a chaque fois.
    var sc = _body.scrollTop;
    _body.className = 'vzd-body';
    _body.innerHTML = vueForm();
    _body.scrollTop = sc;
    _foot.innerHTML = '<button type="button" class="vzd-cta" id="vzdGo"'
      + (pretAEnvoyer() ? '' : ' disabled') + '>' + labelCta() + '</button>';
    bind();
  }

  // Le secteur et la visibilite sont les deux seules donnees sans lesquelles
  // un retour ne veut rien dire. Tout le reste est optionnel par construction.
  function pretAEnvoyer() {
    return !_sending && !!_secteur && _vis != null;
  }

  /* ------------------------------------------------------------------------
     LIAISONS
     ------------------------------------------------------------------------ */
  function bind() {
    _body.querySelectorAll('[data-sec]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = String(b.getAttribute('data-sec')).split('|');
        _secteur = { nom: p[0], lat: parseFloat(p[1]), lon: parseFloat(p[2]) };
        render();
      });
    });
    _body.querySelectorAll('[data-vis]').forEach(function (b) {
      b.addEventListener('click', function () {
        _vis = parseInt(b.getAttribute('data-vis'), 10);
        render();
      });
    });
    ['eau', 'vie', 'taille'].forEach(function (cle) {
      _body.querySelectorAll('[data-' + cle + ']').forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-' + cle);
          // Second appui = deselection. Ces trois champs sont optionnels, ils
          // doivent pouvoir revenir a l'absence de reponse.
          if (cle === 'eau')         _eau    = (_eau === v)    ? null : v;
          else if (cle === 'vie')    _vie    = (_vie === v)    ? null : v;
          else                       _taille = (_taille === v) ? null : v;
          render();
        });
      });
    });

    var db = document.getElementById('vzdDateBtn');
    if (db) db.addEventListener('click', function () {
      _calOpen = !_calOpen;
      // Le calendrier s'ouvre TOUJOURS sur le mois de la date retenue, pas sur
      // le dernier mois feuillete lors d'une ouverture precedente.
      if (_calOpen) _calMois = null;
      render();
    });
    _body.querySelectorAll('[data-mois]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = moisAffiche();
        _calMois = new Date(c.getFullYear(), c.getMonth() + parseInt(b.getAttribute('data-mois'), 10), 1);
        render();
      });
    });
    _body.querySelectorAll('[data-jour]').forEach(function (b) {
      b.addEventListener('click', function () {
        _date = b.getAttribute('data-jour');
        _calOpen = false;
        render();
      });
    });

    var nt = document.getElementById('vzdNotes');
    // Pas de re-rendu a la frappe : il detruirait le champ et ferait perdre le
    // curseur a chaque caractere.
    if (nt) nt.addEventListener('input', function () { _notes = nt.value; });

    var cs = document.getElementById('vzdConsent');
    if (cs) cs.addEventListener('click', function () { _consent = !_consent; render(); });

    var ad = document.getElementById('vzdAdd');
    if (ad) ad.addEventListener('click', choisirPhoto);
    _body.querySelectorAll('[data-rm]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = parseInt(b.getAttribute('data-rm'), 10);
        var p = _photos[i];
        if (p && p.url) { try { URL.revokeObjectURL(p.url); } catch (e) {} }
        _photos.splice(i, 1);
        render();
      });
    });

    var se = document.getElementById('vzdSearch');
    if (se) {
      se.addEventListener('input', function () {
        if (_searchTimer) clearTimeout(_searchTimer);
        _searchTimer = setTimeout(function () { chercher(se.value); }, 200);
      });
    }

    var go = document.getElementById('vzdGo');
    if (go) go.addEventListener('click', envoyer);
  }

  /* ------------------------------------------------------------------------
     RECHERCHE DE SECTEUR
     ------------------------------------------------------------------------
     Aucune logique de recherche ici : VZ_SEARCH possede deja les 134 ports de
     SPOTS, les communes littorales de l'API Adresse, le filtre a 30 km de
     cote, la dedup et le cache. On lui demande, on affiche.
     ------------------------------------------------------------------------ */
  function chercher(q) {
    var box = document.getElementById('vzdRes');
    if (!box) return;
    if (!q || q.length < 1) { box.className = 'vzd-res'; box.innerHTML = ''; return; }
    if (typeof VZ_SEARCH === 'undefined' || !VZ_SEARCH || !VZ_SEARCH.suggest) return;
    VZ_SEARCH.suggest(q, function (items) {
      var b = document.getElementById('vzdRes');
      if (!b) return;
      _searchItems = items || [];
      if (!_searchItems.length) { b.className = 'vzd-res'; b.innerHTML = ''; return; }
      var h = '';
      _searchItems.forEach(function (it, i) {
        h += '<button type="button" data-res="' + i + '">'
          +    '<span style="display:grid;gap:1px;min-width:0;">'
          +      '<span class="rn">' + esc(it.name) + '</span>'
          +      '<span class="rs">' + esc(it.sub || '') + '</span>'
          +    '</span></button>';
      });
      b.innerHTML = h;
      b.className = 'vzd-res show';
      b.querySelectorAll('[data-res]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var it = _searchItems[parseInt(btn.getAttribute('data-res'), 10)];
          if (!it) return;
          // Une commune n'est pas un point de mesure : on rattache le retour au
          // port le plus proche, celui dont le moteur possede la donnee.
          var nom = (it.kind === 'city' && it.port && it.port.name) ? it.port.name : it.name;
          _secteur = { nom: nom, lat: it.lat, lon: it.lon };
          render();
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     PHOTOS
     ------------------------------------------------------------------------ */
  function choisirPhoto() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      inp.remove();
      if (!f) return;
      _photos.push({ blob: f, url: URL.createObjectURL(f) });
      render();
    });
    inp.click();
  }

  // Compression au moment de l'envoi seulement. Le passage par canvas retire
  // l'EXIF, donc la position GPS du cliche ne monte pas dans Storage.
  function compresser(file, maxSide, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, hh = img.naturalHeight;
        if (!w || !hh) { reject(new Error('image illisible')); return; }
        var r = Math.min(1, maxSide / Math.max(w, hh));
        var cv = document.createElement('canvas');
        cv.width = Math.round(w * r); cv.height = Math.round(hh * r);
        var ctx = cv.getContext('2d');
        if (!ctx) { reject(new Error('canvas indisponible')); return; }
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob(function (blob) {
          if (blob) resolve(blob); else reject(new Error('compression echouee'));
        }, 'image/jpeg', quality);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image illisible')); };
      img.src = url;
    });
  }

  function monterPhotos() {
    var logue = (typeof VZ_RETOUR !== 'undefined' && VZ_RETOUR && VZ_RETOUR.isLogged());
    if (!_photos.length || !logue || !window.fbStorage || !window.fbStorageRef) {
      return Promise.resolve([]);
    }
    var uid = (window.fbAuth && window.fbAuth.currentUser) ? window.fbAuth.currentUser.uid : null;
    if (!uid) return Promise.resolve([]);
    var base = 'users/' + uid + '/retours/' + Date.now() + '-';
    return Promise.all(_photos.map(function (p, i) {
      return compresser(p.blob, 1280, 0.8).then(function (blob) {
        var ref = window.fbStorageRef(window.fbStorage, base + i + '.jpg');
        return window.fbUploadBytes(ref, blob, { contentType: 'image/jpeg' })
          .then(function () { return window.fbGetDownloadURL(ref); });
      }).catch(function (e) {
        console.warn('[depot] photo', e);
        return null;
      });
    })).then(function (urls) {
      return urls.filter(Boolean);
    });
  }

  /* ------------------------------------------------------------------------
     ENVOI
     ------------------------------------------------------------------------
     Un seul chemin d'ecriture : vzSubmitObservation, partage par cet ecran et
     par l'ancienne feuille. En cas d'echec, la saisie est INTACTE : on ne
     remet a zero que sur succes.
     ------------------------------------------------------------------------ */
  function envoyer() {
    if (!pretAEnvoyer()) return;
    if (typeof vzSubmitObservation !== 'function') {
      console.warn('[depot] vzSubmitObservation absent');
      return;
    }
    _sending = true; _error = false; render();

    var now = new Date();
    monterPhotos().then(function (urls) {
      return vzSubmitObservation({
        lat: _secteur.lat, lon: _secteur.lon,
        secteur: _secteur.nom,
        date: _date,
        heure: String(now.getHours()).padStart(2, '0') + ':'
             + String(now.getMinutes()).padStart(2, '0'),
        visibilityM: _vis,
        eau: _eau || '',
        vie: _vie || '',
        taille: _taille || '',
        notes: _notes.slice(0, 180),
        photos: urls,
        pseudo: pseudo(),
        partage: _consent
      });
    }).then(function (res) {
      _sending = false;
      if (!res || !res.success) { _error = true; render(); return; }
      _done = { secteur: _secteur.nom, vis: _vis, date: _date, partage: !!_consent };
      render();
      // L'espace doit refleter le depot sans rechargement complet.
      try {
        if (typeof VZ_ESPACE !== 'undefined' && VZ_ESPACE && VZ_ESPACE.refresh) VZ_ESPACE.refresh();
      } catch (e) {}
    }).catch(function (e) {
      console.warn('[depot] envoi', e);
      _sending = false; _error = true; render();
    });
  }

  /* ------------------------------------------------------------------------
     CONSTRUCTION, OUVERTURE, FERMETURE
     ------------------------------------------------------------------------ */
  function build() {
    if (_built) return;
    var st = document.createElement('style');
    st.id = 'vzDepotCss';
    st.textContent = CSS;
    document.head.appendChild(st);

    _scrim = document.createElement('div');
    _scrim.id = 'vzDepotScrim';
    _scrim.addEventListener('click', close);
    document.body.appendChild(_scrim);

    _el = document.createElement('div');
    _el.id = 'vzDepot';
    _el.innerHTML = '<div class="vzd-head">'
      +   '<button type="button" class="vzd-x" aria-label="Fermer">' + ICO.x + '</button>'
      +   '<h2 id="vzdTitre">D\u00e9poser un retour</h2>'
      + '</div>'
      + '<div class="vzd-body" id="vzdBody"></div>'
      + '<div class="vzd-foot" id="vzdFoot"></div>';
    document.body.appendChild(_el);

    _body = document.getElementById('vzdBody');
    _foot = document.getElementById('vzdFoot');
    _el.querySelector('.vzd-x').addEventListener('click', close);
    _built = true;
  }

  function reset(pt) {
    _secteur = null;
    _vis = null; _eau = null; _vie = null; _taille = null;
    _notes = ''; _consent = true; _error = false; _sending = false; _done = null;
    _photos.forEach(function (p) { try { URL.revokeObjectURL(p.url); } catch (e) {} });
    _photos = [];
    _date = new Date().toISOString().slice(0, 10);

    // Point impose par l'appelant (carte, espace, secteur suivi). On lui donne
    // le nom du port le plus proche, meme source que le libelle de l'ancienne
    // feuille : l'email d'alerte cite donc le lieu que le deposant a vu.
    if (pt && typeof pt.lat === 'number') {
      var nom = '';
      if (typeof findNearestPort === 'function') {
        var np = findNearestPort(pt.lat, pt.lon != null ? pt.lon : pt.lng);
        if (np && np.spot && np.spot.name) nom = np.spot.name;
      }
      if (nom) _secteur = { nom: nom, lat: pt.lat, lon: (pt.lon != null ? pt.lon : pt.lng) };
    }
  }

  function open(pt) {
    build();
    reset(pt);
    var t = document.getElementById('vzdTitre');
    if (t) t.textContent = 'D\u00e9poser un retour';
    _el.classList.add('open');
    _scrim.classList.add('open');
    document.body.classList.add('vz-depot-open');
    render();
  }

  function close() {
    if (!_el) return;
    _el.classList.remove('open');
    _scrim.classList.remove('open');
    document.body.classList.remove('vz-depot-open');
    _photos.forEach(function (p) { try { URL.revokeObjectURL(p.url); } catch (e) {} });
    _photos = [];
    _done = null;
  }

  function fermerVersEspace() {
    close();
    try {
      if (typeof VZ_ESPACE !== 'undefined' && VZ_ESPACE && VZ_ESPACE.open) VZ_ESPACE.open('espace');
    } catch (e) {}
  }

  window.VZ_DEPOT = {
    open: open,
    close: close,
    isOpen: function () { return !!(_el && _el.classList.contains('open')); }
  };
})();
