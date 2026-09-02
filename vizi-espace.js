/* ==========================================================================
   VISIMER - ESPACE CHASSEUR
   ==========================================================================
   Fichier autonome, charge APRES vizi-app.js. Il ne redefinit rien : il lit
   S_currentUser, S_userProfile, S_windUnit et les helpers Firebase exposes sur
   window par le socle d'identite.

   DOCTRINE, reprise du cahier des charges v2 :

   Le compte est une surcouche de la carte, jamais une destination. La carte
   reste rigoureusement identique pour tout le monde : memes previsions, memes
   calques, meme panneau secteur, meme possibilite de deposer un retour. Le
   compte ne debloque rien, il memorise. Toute fonctionnalite qui rendrait la
   carte moins bonne sans compte est refusee.

   L'espace est une vue plein ecran ouverte par la pastille de profil. Il
   masque la barre du bas pendant qu'il est ouvert : ces quatre onglets
   pilotent des panneaux de carte et ne veulent rien dire ici. Une croix le
   referme et rend la carte.

   Navigation a UN SEUL niveau de profondeur. Toute vue enfant porte la meme
   barre de 60px, controle a gauche, titre a sa droite. Sur la racine, ce
   controle est la croix.

   AUCUN ECRAN DE DETAIL DE SECTEUR n'est construit : un appui sur un secteur
   suivi ferme l'espace, recentre la carte et deroule le panneau secteur
   existant. Deux panneaux secteur finiraient par diverger.

   INTERDITS ABSOLUS, verifies a chaque ajout :
     aucune synthese, aucune note globale, aucun feu tricolore
     aucun conseil, aucune incitation a sortir
     aucune celebration, aucun niveau, aucun titre, aucun badge
     aucun emoji, aucun tiret cadratin
     une mesure porte sa source et son age, une prevision porte son echeance
     un secteur sans mesure recente porte un point d'interrogation lisible,
     jamais un etat grise : afficher une valeur rassurante que la mer
     contredira est le seul interdit absolu du produit.

   VOCABULAIRE. Interdit : declarer, saisir, capture, valider votre sortie,
   classement, felicitations, bravo. Juste : retour, sortie, visibilite
   observee, partager pour aider les autres chasseurs, suivre ce secteur,
   les plus actifs.

   ECRAN DE CONNEXION. Il remplace l'ancienne modale mais REPREND SES
   IDENTIFIANTS DOM a la lettre (loginOverlay, loginError, loginOk, loginEmail,
   loginPwd, loginSubmit, loginToggle). Le bloc VZ_AUTH de vizi-app.js n'a donc
   pas une ligne a changer : on remplace le contenant, pas le contenu. C'est le
   meme principe qui a permis a VZM_NAV de reutiliser #vzSheet.
   ========================================================================== */

(function () {
  'use strict';

  var VERSION = '2.5.0';

  /* ------------------------------------------------------------------------
     TOKENS
     ------------------------------------------------------------------------
     Echelle typographique et echelle d'espacement FERMEES : aucune valeur hors
     de ces pas ne doit apparaitre dans un composant. --vz-fs-provenance est le
     plancher, la source et la date ne descendent jamais plus bas, c'est
     l'information la moins negociable de l'ecran.
     ------------------------------------------------------------------------ */
  var TOKENS = ':root{'
    + '--vz-accent:#4DD4A8;--vz-accent-mid:#2DA888;--vz-accent-deep:#1A6B5D;'
    + '--vz-ink:#0A1520;--vz-chrome:#0F2438;--vz-surface:#FFFFFF;'
    + '--vz-group:#EDF1F4;--vz-selected:#DCEFE7;'
    + '--vz-text:#0A1520;--vz-text-2:#33475A;--vz-line:#C3D0DA;'
    + '--vz-warning:#D8C84A;--vz-caution:#E89B3C;--vz-danger:#C94A3D;'
    + '--vz-bd:2px;--vz-bd-ctl:1.5px;--vz-blur:0px;'
    + '--vz-r-panel:16px;--vz-r-card:14px;--vz-r-group:12px;--vz-r-row:10px;--vz-r-ctl:9px;'
    + '--vz-font-ui:Inter,system-ui,sans-serif;--vz-font-num:"IBM Plex Mono",monospace;'
    + '--vz-fs-provenance:11px;--vz-fs-section:11px;--vz-fs-gloss:12px;--vz-fs-meta:13px;'
    + '--vz-fs-body:14px;--vz-fs-label:15px;--vz-fs-title:17px;'
    + '--vz-fs-num-m:19px;--vz-fs-num-l:30px;'
    + '--vz-gap-1:2px;--vz-gap-2:4px;--vz-gap-3:6px;--vz-gap-4:8px;--vz-gap-5:11px;--vz-gap-6:14px;'
    + '--vz-pad-row:6px 8px;--vz-pad-group:8px;--vz-pad-card:12px;--vz-pad-block:14px;'
    + '--vz-tap:48px;--vz-tap-min:44px;--vz-tap-row:56px;'
    + '--vz-press:scale(.96);--vz-t-press:.16s ease;--vz-t-state:.22s cubic-bezier(.4,0,.2,1);'
    + '--vz-panel-w:420px;--vz-panel-head-h:60px;'
    + '}';

  /* ------------------------------------------------------------------------
     CSS
     ------------------------------------------------------------------------
     Mobile : plein ecran. Desktop : panneau lateral droit de 420px. Ce n'est
     pas une version distincte, c'est le meme ecran dans un autre contenant :
     meme contenu, meme ordre, meme hierarchie, memes classes.
     ------------------------------------------------------------------------ */
  var CSS = ''
    // --- contenant ---------------------------------------------------------
    + '#vzEspace{position:fixed;inset:0;z-index:1400;display:none;'
    +   'background:var(--vz-surface);font-family:var(--vz-font-ui);color:var(--vz-text);'
    +   'flex-direction:column;overflow:hidden;}'
    + '#vzEspace.open{display:flex;}'
    // L'espace ouvert masque la barre du bas et tout le flottant de carte :
    // un seul objet a la fois, doctrine du panneau unique.
    + 'body.vz-espace-open #vzmNavBar,body.vz-espace-open #vzmIdent,'
    +   'body.vz-espace-open #vzAccountBtn,body.vz-espace-open #vzAccountMenu,'
    +   'body.vz-espace-open .vzm-sonar-fab,body.vz-espace-open .vzm-sonar-menu,'
    +   'body.vz-espace-open #vzRainCtrl,body.vz-espace-open #vzHuntBar,'
    +   'body.vz-espace-open #mobileAnalyzeBtn,body.vz-espace-open #mobileShareBtn,'
    +   'body.vz-espace-open #vzFabImprove,body.vz-espace-open .vz-layers-popover,'
    +   'body.vz-espace-open .leaflet-control-attribution{display:none !important;}'
    + '@media (min-width:769px){'
    +   '#vzEspace{left:auto;width:var(--vz-panel-w);max-width:100%;'
    +     'border-left:var(--vz-bd) solid var(--vz-ink);box-shadow:-8px 0 34px rgba(8,17,27,.4);}'
    + '}'

    // --- barre de tete -----------------------------------------------------
    + '#vzEspace .vze-head{flex:0 0 auto;height:var(--vz-panel-head-h);display:flex;align-items:center;'
    +   'gap:var(--vz-gap-5);padding:0 10px;background:var(--vz-surface);'
    +   'border-bottom:var(--vz-bd) solid var(--vz-ink);padding-top:env(safe-area-inset-top,0px);'
    +   'height:calc(var(--vz-panel-head-h) + env(safe-area-inset-top,0px));}'
    + '#vzEspace .vze-back{flex:0 0 44px;width:44px;height:44px;padding:0;border-radius:var(--vz-r-row);'
    +   'background:var(--vz-surface);border:var(--vz-bd) solid var(--vz-ink);'
    +   'display:flex;align-items:center;justify-content:center;cursor:pointer;'
    +   'transition:transform var(--vz-t-press);-webkit-tap-highlight-color:transparent;}'
    + '#vzEspace .vze-back:active{transform:var(--vz-press);}'
    + '#vzEspace .vze-back svg{width:20px;height:20px;stroke:var(--vz-ink);fill:none;'
    +   'stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;}'
    + '#vzEspace .vze-title{flex:1;min-width:0;font-size:var(--vz-fs-title);font-weight:800;'
    +   'line-height:1.1;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'

    // --- corps -------------------------------------------------------------
    + '#vzEspace .vze-body{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;'
    +   'padding:var(--vz-pad-card);padding-bottom:calc(28px + env(safe-area-inset-bottom,0px));'
    +   'display:grid;gap:var(--vz-gap-6);align-content:start;}'

    // --- briques communes --------------------------------------------------
    + '#vzEspace .vze-group{background:var(--vz-group);border-radius:var(--vz-r-group);'
    +   'padding:var(--vz-gap-3);display:grid;gap:var(--vz-gap-1);}'
    + '#vzEspace .vze-sect{font-family:var(--vz-font-num);font-size:var(--vz-fs-section);'
    +   'font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--vz-ink);'
    +   'padding:8px 10px 4px;}'
    + '#vzEspace .vze-gloss{font-family:var(--vz-font-num);font-size:var(--vz-fs-provenance);'
    +   'font-weight:500;line-height:1.35;color:var(--vz-text-2);padding:2px 10px 8px;}'
    + '#vzEspace .vze-row{display:flex;align-items:center;gap:var(--vz-gap-5);width:100%;'
    +   'min-height:var(--vz-tap-row);padding:6px 10px;border:none;border-radius:var(--vz-r-row);'
    +   'background:var(--vz-surface);cursor:pointer;text-align:left;font-family:inherit;'
    +   'color:var(--vz-text);transition:transform var(--vz-t-press),background var(--vz-t-state);'
    +   '-webkit-tap-highlight-color:transparent;}'
    + '#vzEspace .vze-row:active{transform:scale(.98);background:var(--vz-selected);}'
    + '#vzEspace .vze-row.flat{background:transparent;}'
    + '#vzEspace .vze-row.flat:active{background:var(--vz-surface);}'
    + '#vzEspace .vze-row .nm{flex:1;min-width:0;font-size:var(--vz-fs-label);font-weight:700;'
    +   'line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '#vzEspace .vze-row .sub{font-size:var(--vz-fs-gloss);font-weight:500;line-height:1.2;'
    +   'color:var(--vz-text-2);}'
    + '#vzEspace .vze-row .val{font-family:var(--vz-font-num);font-size:var(--vz-fs-meta);'
    +   'font-weight:600;color:var(--vz-text-2);flex-shrink:0;}'
    + '#vzEspace .vze-chev{width:20px;height:20px;flex-shrink:0;stroke:var(--vz-text-2);fill:none;'
    +   'stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;}'

    // --- en-tete identite --------------------------------------------------
    + '#vzEspace .vze-id{display:flex;align-items:center;gap:var(--vz-gap-5);width:100%;'
    +   'min-height:var(--vz-tap-row);padding:8px 10px;border:var(--vz-bd) solid var(--vz-line);'
    +   'border-radius:var(--vz-r-group);background:var(--vz-surface);cursor:pointer;text-align:left;'
    +   'font-family:inherit;color:var(--vz-text);'
    +   'transition:transform var(--vz-t-press),border-color var(--vz-t-state);'
    +   '-webkit-tap-highlight-color:transparent;}'
    + '#vzEspace .vze-id:active{transform:scale(.98);border-color:var(--vz-accent-deep);}'
    + '#vzEspace .vze-av{position:relative;flex:0 0 44px;width:44px;height:44px;'
    +   'border-radius:var(--vz-r-group);background:var(--vz-accent);'
    +   'border:var(--vz-bd) solid var(--vz-ink);overflow:hidden;'
    +   'display:flex;align-items:center;justify-content:center;'
    +   'font-size:var(--vz-fs-num-m);font-weight:800;color:var(--vz-ink);}'
    + '#vzEspace .vze-av img{width:100%;height:100%;object-fit:cover;display:block;}'
    + '#vzEspace .vze-av.lg{flex:0 0 72px;width:72px;height:72px;border-radius:16px;'
    +   'font-size:var(--vz-fs-num-l);}'

    // --- statistiques ------------------------------------------------------
    + '#vzEspace .vze-stats{display:grid;grid-template-columns:1fr 1fr;gap:var(--vz-gap-3);}'
    + '#vzEspace .vze-stat{background:var(--vz-surface);border-radius:var(--vz-r-row);'
    +   'padding:var(--vz-pad-card);display:grid;gap:3px;align-content:start;}'
    + '#vzEspace .vze-stat .v{display:flex;align-items:baseline;gap:var(--vz-gap-2);}'
    + '#vzEspace .vze-stat .n{font-family:var(--vz-font-num);font-size:var(--vz-fs-num-l);'
    +   'font-weight:700;line-height:1;letter-spacing:-.01em;color:var(--vz-ink);}'
    + '#vzEspace .vze-stat .u{font-family:var(--vz-font-num);font-size:var(--vz-fs-meta);'
    +   'font-weight:600;color:var(--vz-text-2);}'
    + '#vzEspace .vze-stat .l{font-size:var(--vz-fs-meta);font-weight:700;line-height:1.2;'
    +   'color:var(--vz-ink);}'

    // --- historique annuel -------------------------------------------------
    // Barres proportionnelles, pas un graphique : aucune echelle, aucun axe,
    // aucune tendance suggeree. La barre sert a comparer d'un coup d'oeil deux
    // annees, le chiffre reste la seule donnee lue.
    + '#vzEspace .vze-yr{display:flex;align-items:center;gap:var(--vz-gap-5);min-height:44px;'
    +   'padding:6px 10px;background:var(--vz-surface);border-radius:var(--vz-r-row);}'
    + '#vzEspace .vze-yr .y{font-family:var(--vz-font-num);font-size:var(--vz-fs-meta);'
    +   'font-weight:700;color:var(--vz-ink);flex:0 0 38px;}'
    + '#vzEspace .vze-yr .bar{flex:1;min-width:0;height:8px;border-radius:4px;'
    +   'background:var(--vz-group);overflow:hidden;}'
    + '#vzEspace .vze-yr .bar i{display:block;height:100%;border-radius:4px;'
    +   'background:var(--vz-accent-mid);}'
    + '#vzEspace .vze-yr .n{font-family:var(--vz-font-num);font-size:var(--vz-fs-meta);'
    +   'font-weight:700;color:var(--vz-ink);flex:0 0 auto;}'
    + '#vzEspace .vze-yr .m{font-family:var(--vz-font-num);font-size:var(--vz-fs-provenance);'
    +   'font-weight:500;color:var(--vz-text-2);flex:0 0 44px;text-align:right;}'

    // --- etats vides -------------------------------------------------------
    // Un etat vide est une information honnete, pas un chargement deguise ni
    // une faute. Il dit ce qui manque et comment le remplir, sans inciter.
    + '#vzEspace .vze-empty{border:var(--vz-bd) dashed var(--vz-line);border-radius:var(--vz-r-group);'
    +   'padding:var(--vz-pad-block);display:grid;gap:var(--vz-gap-3);}'
    + '#vzEspace .vze-empty .t{font-size:var(--vz-fs-body);font-weight:700;color:var(--vz-ink);}'
    + '#vzEspace .vze-empty .g{font-size:var(--vz-fs-meta);font-weight:500;line-height:1.4;'
    +   'color:var(--vz-text-2);}'

    // --- boutons -----------------------------------------------------------
    + '#vzEspace .vze-btn{display:flex;align-items:center;justify-content:center;gap:var(--vz-gap-4);'
    +   'width:100%;min-height:var(--vz-tap-row);padding:0 18px;border-radius:var(--vz-r-card);'
    +   'background:var(--vz-accent);border:var(--vz-bd) solid var(--vz-ink);cursor:pointer;'
    +   'font-family:inherit;font-size:16px;font-weight:800;color:var(--vz-ink);'
    +   'transition:transform var(--vz-t-press);-webkit-tap-highlight-color:transparent;}'
    + '#vzEspace .vze-btn:active{transform:scale(.97);}'
    + '#vzEspace .vze-btn.ghost{background:var(--vz-surface);border-color:var(--vz-line);'
    +   'color:var(--vz-text-2);font-size:var(--vz-fs-label);}'
    + '#vzEspace .vze-btn.danger{background:var(--vz-surface);border-color:var(--vz-danger);'
    +   'color:var(--vz-danger);}'
    + '#vzEspace .vze-btn[disabled]{opacity:.5;pointer-events:none;}'

    // --- segment d'unites --------------------------------------------------
    + '#vzEspace .vze-seg{display:flex;gap:var(--vz-gap-2);padding:3px;background:var(--vz-surface);'
    +   'border:var(--vz-bd) solid var(--vz-line);border-radius:var(--vz-r-row);flex-shrink:0;}'
    + '#vzEspace .vze-seg button{min-width:52px;height:38px;padding:0 10px;border:none;'
    +   'border-radius:7px;background:transparent;cursor:pointer;font-family:var(--vz-font-num);'
    +   'font-size:var(--vz-fs-meta);font-weight:500;color:var(--vz-ink);'
    +   'transition:transform var(--vz-t-press),background var(--vz-t-state);'
    +   '-webkit-tap-highlight-color:transparent;}'
    + '#vzEspace .vze-seg button:active{transform:var(--vz-press);}'
    + '#vzEspace .vze-seg button[aria-pressed="true"]{background:var(--vz-accent);font-weight:700;}'

    // --- champ de saisie ---------------------------------------------------
    + '#vzEspace .vze-in{width:100%;min-height:var(--vz-tap-min);padding:10px 12px;'
    +   'background:var(--vz-surface);border:var(--vz-bd) solid var(--vz-ink);'
    +   'border-radius:var(--vz-r-row);font-family:var(--vz-font-num);font-size:var(--vz-fs-label);'
    +   'font-weight:600;color:var(--vz-text);outline:none;box-sizing:border-box;}'
    + '#vzEspace .vze-in::placeholder{color:#5F6B73;font-weight:400;}'

    // --- les plus actifs ---------------------------------------------------
    + '#vzEspace .vze-act{display:flex;align-items:center;gap:var(--vz-gap-6);'
    +   'min-height:var(--vz-tap-row);padding:8px 12px;border-radius:var(--vz-r-row);}'
    + '#vzEspace .vze-act .rg{flex:0 0 26px;font-family:var(--vz-font-num);font-size:16px;'
    +   'font-weight:700;color:var(--vz-text-2);}'
    + '#vzEspace .vze-act .ps{flex:1;min-width:0;font-family:var(--vz-font-num);'
    +   'font-size:var(--vz-fs-label);color:var(--vz-ink);'
    +   'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '#vzEspace .vze-act .nb{font-family:var(--vz-font-num);font-size:var(--vz-fs-title);'
    +   'font-weight:700;color:var(--vz-ink);}'
    + '#vzEspace .vze-act.me{background:var(--vz-selected);}'
    + '#vzEspace .vze-act.me .ps{font-weight:700;}'

    // --- note explicative --------------------------------------------------
    + '#vzEspace .vze-note{border:var(--vz-bd) solid var(--vz-line);border-radius:var(--vz-r-group);'
    +   'padding:var(--vz-pad-block);display:grid;gap:var(--vz-gap-3);}'
    + '#vzEspace .vze-note .h{font-family:var(--vz-font-num);font-size:var(--vz-fs-section);'
    +   'font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--vz-ink);}'
    + '#vzEspace .vze-note .b{font-size:var(--vz-fs-meta);font-weight:500;line-height:1.4;'
    +   'color:var(--vz-text-2);}'

    // --- quoi de neuf ------------------------------------------------------
    + '#vzEspace .vze-new{border:var(--vz-bd) solid var(--vz-line);border-radius:var(--vz-r-card);'
    +   'padding:var(--vz-pad-block);background:var(--vz-surface);display:grid;gap:7px;}'
    + '#vzEspace .vze-new.is-new{border-color:var(--vz-ink);}'
    + '#vzEspace .vze-new .d{font-family:var(--vz-font-num);font-size:var(--vz-fs-provenance);'
    +   'font-weight:600;color:var(--vz-text-2);}'
    + '#vzEspace .vze-new .t{font-size:16px;font-weight:800;line-height:1.2;color:var(--vz-ink);}'
    + '#vzEspace .vze-new .b{font-size:var(--vz-fs-body);font-weight:500;line-height:1.4;'
    +   'color:var(--vz-text-2);}'
    + '#vzEspace .vze-tag{display:inline-flex;align-items:center;height:24px;padding:0 8px;'
    +   'border-radius:12px;background:var(--vz-ink);font-size:var(--vz-fs-gloss);'
    +   'font-weight:800;color:var(--vz-surface);}'
    + '#vzEspace .vze-dot{min-width:24px;height:24px;padding:0 6px;border-radius:12px;'
    +   'background:var(--vz-ink);border:var(--vz-bd) solid var(--vz-surface);'
    +   'display:inline-flex;align-items:center;justify-content:center;'
    +   'font-size:var(--vz-fs-meta);font-weight:800;line-height:1;color:var(--vz-surface);}'

    // --- pied ---------------------------------------------------------------
    + '#vzEspace .vze-ver{font-family:var(--vz-font-num);font-size:var(--vz-fs-provenance);'
    +   'font-weight:500;color:var(--vz-text-2);text-align:center;padding:4px 0 8px;}'

    /* ----------------------------------------------------------------------
       ECRAN DE CONNEXION
       ----------------------------------------------------------------------
       Google en bouton dominant : c'est le cas majoritaire et il ne demande
       aucune saisie. Email et mot de passe en secours, present mais secondaire.
       Aucun pseudo demande a l'inscription : il est repris du profil Google ou
       derive de l'email, et reste modifiable dans le profil.
       Aucun flou : --vz-blur vaut 0px, l'ancienne modale portait un blur(4px)
       hors charte que la suppression de son CSS emporte avec elle.
       ---------------------------------------------------------------------- */
    + '#loginOverlay{position:fixed;inset:0;z-index:1500;display:none;'
    +   'align-items:center;justify-content:center;padding:16px;'
    +   'background:rgba(10,21,32,.62);font-family:var(--vz-font-ui);}'
    + '#loginOverlay.open{display:flex;}'
    + '#loginModal{position:relative;width:100%;max-width:380px;max-height:92vh;overflow-y:auto;'
    +   'background:var(--vz-surface);border:var(--vz-bd) solid var(--vz-ink);'
    +   'border-radius:var(--vz-r-panel);padding:22px 18px 18px;'
    +   'display:grid;gap:var(--vz-gap-5);box-shadow:0 12px 34px rgba(8,17,27,.4);}'
    + '#loginModal .login-close{position:absolute;top:10px;right:10px;width:44px;height:44px;'
    +   'padding:0;border:none;background:transparent;cursor:pointer;'
    +   'display:flex;align-items:center;justify-content:center;'
    +   '-webkit-tap-highlight-color:transparent;}'
    + '#loginModal .login-close svg{width:18px;height:18px;stroke:var(--vz-ink);fill:none;'
    +   'stroke-width:2.6;stroke-linecap:round;}'
    + '#loginModal .login-title{font-size:22px;font-weight:800;line-height:1.1;'
    +   'letter-spacing:-.02em;color:var(--vz-ink);padding-right:44px;}'
    + '#loginModal .login-sub{font-size:var(--vz-fs-meta);font-weight:500;line-height:1.45;'
    +   'color:var(--vz-text-2);margin-top:-6px;}'
    // Bouton Google conforme aux Branding Guidelines : surface blanche, logo G
    // quatre couleurs, libelle officiel. La bordure noire de 2px et le rayon
    // de la charte Terrain sont conserves : rien n'oblige a copier le bouton
    // Material, seuls le logo et le libelle sont contraints.
    + '#loginModal .login-google-btn{display:flex;align-items:center;justify-content:center;'
    +   'gap:12px;width:100%;min-height:var(--vz-tap-row);padding:0 16px;'
    +   'background:var(--vz-surface);border:var(--vz-bd) solid var(--vz-ink);'
    +   'border-radius:var(--vz-r-card);cursor:pointer;font-family:inherit;font-size:16px;'
    +   'font-weight:700;color:var(--vz-ink);transition:transform var(--vz-t-press);'
    +   '-webkit-tap-highlight-color:transparent;}'
    + '#loginModal .login-google-btn:active{transform:scale(.97);}'
    + '#loginModal .login-google-btn svg{flex-shrink:0;}'
    + '#loginModal .login-divider{display:flex;align-items:center;gap:10px;'
    +   'font-family:var(--vz-font-num);font-size:var(--vz-fs-provenance);font-weight:600;'
    +   'text-transform:uppercase;letter-spacing:.08em;color:var(--vz-text-2);}'
    + '#loginModal .login-divider::before,#loginModal .login-divider::after{content:"";flex:1;'
    +   'height:2px;background:var(--vz-line);}'
    + '#loginModal .login-input{width:100%;min-height:var(--vz-tap-min);padding:11px 12px;'
    +   'background:var(--vz-surface);border:var(--vz-bd) solid var(--vz-ink);'
    +   'border-radius:var(--vz-r-row);font-family:var(--vz-font-num);'
    +   'font-size:var(--vz-fs-label);font-weight:600;color:var(--vz-text);outline:none;'
    +   'box-sizing:border-box;}'
    + '#loginModal .login-input::placeholder{color:#5F6B73;font-weight:400;}'
    + '#loginModal .login-submit{width:100%;min-height:var(--vz-tap-row);border:none;'
    +   'border-radius:var(--vz-r-card);background:var(--vz-ink);color:var(--vz-surface);'
    +   'font-family:inherit;font-size:16px;font-weight:800;cursor:pointer;'
    +   'transition:transform var(--vz-t-press);-webkit-tap-highlight-color:transparent;}'
    + '#loginModal .login-submit:active{transform:scale(.97);}'
    // Deux secours sur UNE ligne, en liens et non en boutons pleine largeur.
    // Cinq boutons empiles donnaient cinq actions d'egale importance a un
    // ecran qui n'en a qu'une : se connecter. Le mot de passe oublie et le
    // lien par email sont des recours, leur poids visuel doit le dire.
    + '#loginModal .login-alt{display:flex;align-items:center;justify-content:center;'
    +   'gap:6px;flex-wrap:wrap;}'
    + '#loginModal .login-alt-btn{min-height:var(--vz-tap-min);padding:11px 8px;'
    +   'background:transparent;border:none;cursor:pointer;font-family:var(--vz-font-num);'
    +   'font-size:var(--vz-fs-provenance);font-weight:600;color:var(--vz-text-2);'
    +   'text-decoration:underline;-webkit-tap-highlight-color:transparent;}'
    + '#loginModal .login-alt-btn:active{color:var(--vz-accent-deep);}'
    + '#loginModal .login-alt .sep{font-family:var(--vz-font-num);'
    +   'font-size:var(--vz-fs-provenance);color:var(--vz-line);}'
    // Les deux benefices du compte, en clair. L'ancien texte expliquait ce que
    // le compte NE fait pas : loyal, mais ce n'est pas une raison de creer un
    // compte. La promesse de carte identique reste, en bas et en petit.
    + '#loginModal .login-why{display:grid;gap:var(--vz-gap-4);padding:2px 0;}'
    + '#loginModal .login-why div{display:flex;align-items:flex-start;gap:10px;'
    +   'font-size:var(--vz-fs-body);font-weight:600;line-height:1.35;color:var(--vz-ink);}'
    + '#loginModal .login-why b{flex:0 0 auto;width:22px;height:22px;border-radius:7px;'
    +   'background:var(--vz-accent);display:flex;align-items:center;justify-content:center;}'
    + '#loginModal .login-why b svg{width:13px;height:13px;stroke:var(--vz-ink);fill:none;'
    +   'stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;}'
    + '#loginModal .login-foot{font-family:var(--vz-font-num);'
    +   'font-size:var(--vz-fs-provenance);font-weight:500;line-height:1.45;'
    +   'color:var(--vz-text-2);text-align:center;}'
    + '#loginModal .login-toggle{text-align:center;font-family:var(--vz-font-num);'
    +   'font-size:var(--vz-fs-provenance);font-weight:500;color:var(--vz-text-2);cursor:pointer;'
    +   'min-height:var(--vz-tap-min);display:flex;align-items:center;justify-content:center;}'
    + '#loginModal .login-toggle span{color:var(--vz-accent-deep);font-weight:700;'
    +   'text-decoration:underline;}'
    + '#loginModal .login-error,#loginModal .login-ok{display:none;padding:10px 12px;'
    +   'border-radius:var(--vz-r-row);font-family:var(--vz-font-num);'
    +   'font-size:var(--vz-fs-provenance);font-weight:600;line-height:1.5;text-align:center;}'
    + '#loginModal .login-error{background:#FBE4E1;border:var(--vz-bd-ctl) solid var(--vz-danger);'
    +   'color:#8C2F25;}'
    + '#loginModal .login-ok{background:var(--vz-selected);'
    +   'border:var(--vz-bd-ctl) solid var(--vz-accent-mid);color:var(--vz-accent-deep);}'
    // Champ mot de passe avec revelation. Sans compte, un mot de passe tape a
    // l'aveugle sur un parking mouille est refuse deux fois sur trois, et le
    // chasseur abandonne avant d'avoir compris qu'il ne s'etait pas trompe.
    + '#loginModal .login-pwd-wrap{position:relative;display:flex;}'
    + '#loginModal .login-pwd-wrap .login-input{padding-right:52px;}'
    + '#loginModal .login-eye{position:absolute;top:0;right:0;width:48px;height:100%;'
    +   'min-height:var(--vz-tap-min);padding:0;border:none;background:transparent;cursor:pointer;'
    +   'display:flex;align-items:center;justify-content:center;color:var(--vz-text-2);'
    +   '-webkit-tap-highlight-color:transparent;}'
    + '#loginModal .login-eye svg{width:20px;height:20px;}'

    /* ----------------------------------------------------------------------
       ETOILE DE SUIVI
       ----------------------------------------------------------------------
       Elle vit dans le panneau secteur, sur la carte, PAS derriere un onglet.
       C'est le point le plus important de la conception et le plus facile a
       rater : un chasseur ouvre Langrune, il veut le retrouver demain matin, il
       tape l'etoile. C'est a cet instant precis, et pas avant, qu'on lui propose
       un compte. Il comprend immediatement pourquoi.
       ---------------------------------------------------------------------- */
    + '.vz-follow{position:absolute;top:0;right:56px;width:56px;height:56px;padding:0;'
    +   'border:none;background:transparent;cursor:pointer;display:flex;align-items:center;'
    +   'justify-content:center;z-index:4;-webkit-tap-highlight-color:transparent;'
    +   'transition:transform var(--vz-t-press);}'
    + '.vz-follow:active{transform:var(--vz-press);}'
    + '.vz-follow svg{width:24px;height:24px;fill:none;stroke:#0A1520;stroke-width:1.9;'
    +   'stroke-linejoin:round;transition:fill var(--vz-t-state),stroke var(--vz-t-state);}'
    + '.vz-follow[aria-pressed="true"] svg{fill:var(--vz-accent);stroke:var(--vz-accent-deep);'
    +   'stroke-width:1.6;}'
    + '.vz-follow[disabled]{opacity:.45;pointer-events:none;}'

    /* Demande de compte contextuelle. Une ligne dans le panneau, fermable, qui
       nait du geste et meurt avec lui. Jamais une modale bloquante, jamais une
       banniere d'accueil : le compte ne debloque rien, il memorise. */
    + '.vz-follow-ask{position:fixed;left:12px;right:12px;z-index:1420;'
    +   'bottom:calc(var(--vzm-navline,94px) + 12px);'
    +   'background:var(--vz-surface);border:var(--vz-bd) solid var(--vz-ink);'
    +   'border-radius:var(--vz-r-card);padding:var(--vz-pad-block);'
    +   'box-shadow:0 6px 20px rgba(8,17,27,.3);display:grid;gap:var(--vz-gap-5);'
    +   'font-family:var(--vz-font-ui);}'
    + '@media (min-width:769px){.vz-follow-ask{left:auto;right:16px;bottom:16px;width:360px;}}'
    + '.vz-follow-ask .t{font-size:var(--vz-fs-label);font-weight:800;color:var(--vz-ink);'
    +   'line-height:1.25;}'
    + '.vz-follow-ask .g{font-size:var(--vz-fs-meta);font-weight:500;line-height:1.4;'
    +   'color:var(--vz-text-2);}'
    + '.vz-follow-ask .r{display:flex;gap:var(--vz-gap-4);}'
    + '.vz-follow-ask button{flex:1;min-height:var(--vz-tap-min);border-radius:var(--vz-r-row);'
    +   'cursor:pointer;font-family:inherit;font-size:var(--vz-fs-body);font-weight:800;'
    +   '-webkit-tap-highlight-color:transparent;}'
    + '.vz-follow-ask .go{background:var(--vz-accent);border:var(--vz-bd) solid var(--vz-ink);'
    +   'color:var(--vz-ink);}'
    + '.vz-follow-ask .no{background:transparent;border:var(--vz-bd) solid var(--vz-line);'
    +   'color:var(--vz-text-2);}'

    /* Avatar editable dans le profil */
    + '#vzEspace .vze-av.edit{cursor:pointer;}'
    + '#vzEspace .vze-av .badge{position:absolute;right:-2px;bottom:-2px;width:26px;height:26px;'
    +   'border-radius:50%;background:var(--vz-ink);border:2px solid var(--vz-surface);'
    +   'display:flex;align-items:center;justify-content:center;}'
    + '#vzEspace .vze-av .badge svg{width:13px;height:13px;stroke:var(--vz-surface);fill:none;'
    +   'stroke-width:2.2;}';

  /* ------------------------------------------------------------------------
     ICONES - SVG uniquement, jamais d'emoji
     ------------------------------------------------------------------------ */
  var ICO = {
    x:     '<svg viewBox="0 0 24 24"><path d="M6 6 L18 18"/><path d="M18 6 L6 18"/></svg>',
    back:  '<svg viewBox="0 0 24 24"><path d="M15 5 l-7 7 7 7"/></svg>',
    chev:  '<svg class="vze-chev" viewBox="0 0 24 24"><path d="M9 6 l6 6 -6 6"/></svg>',
    plus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 6 V18"/><path d="M6 12 H18"/></svg>',
    // Etoile : le meme trace en creux et en plein. Le passage de l'un a l'autre
    // est le seul retour visuel du suivi, il doit donc etre lisible au premier
    // coup d'oeil, en plein soleil, sans lire de texte.
    star:  '<svg viewBox="0 0 24 24"><path d="M12 3.2 l2.7 5.6 6.1.9 -4.4 4.3 1 6.1 -5.4-2.9 -5.4 2.9 1-6.1 -4.4-4.3 6.1-.9 Z"/></svg>',
    eye:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7 -3.6 7-10 7 -10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7c2 0 3.7.5 5.2 1.3"/><path d="M21.4 9.3c.4.5.6 1 .6 1.2 0 0-3.6 7-10 7-1.3 0-2.5-.2-3.5-.6"/><path d="M4 3 L20 21"/></svg>',
    cam:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5A2 2 0 0 1 5 6.5h2.2l1.2-2h7.2l1.2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.6"/></svg>',
    // Logo G officiel, quatre couleurs Google. Les Sign-In Branding Guidelines
    // l'imposent : ce n'est pas une preference esthetique, c'est contractuel.
    // C'est aussi ce qui rend le bouton reconnaissable en un quart de seconde
    // par un chasseur de soixante ans qui ne lit pas le libelle.
    google:'<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">'
      + '<path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>'
      + '<path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>'
      + '<path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>'
      + '<path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>'
      + '</svg>'
  };

  /* ------------------------------------------------------------------------
     ROUTES - un seul niveau de profondeur depuis la racine
     ------------------------------------------------------------------------ */
  var ROUTES = {
    espace: { titre: 'Mon espace',     racine: true  },
    profil: { titre: 'Mon profil',     racine: false },
    actifs: { titre: 'Les plus actifs', racine: false },
    neuf:   { titre: 'Quoi de neuf',   racine: false }
  };

  /* ------------------------------------------------------------------------
     QUOI DE NEUF - liste antechronologique, la plus recente en tete
     ------------------------------------------------------------------------ */
  var NOUVEAUTES = [
    { v: '2.5.0', date: '27 aout 2026', titre: 'Ton espace personnel',
      corps: "Tes secteurs suivis, tes retours et tes statistiques se retrouvent d'une session a l'autre. La carte, elle, ne change pas : elle reste identique avec ou sans compte." },
    { v: '2.4.0', date: '28 juillet 2026', titre: 'Le relief du fond couvre la Manche est',
      corps: "Le calque Relief du fond est disponible de Ouistreham a Barfleur. Source SHOM, leve de 2019 a 2023." },
    { v: '2.3.0', date: '11 juin 2026', titre: 'Les epaves passent en SHOM',
      corps: "Les positions d'epaves proviennent maintenant du SHOM et portent leur date de leve." }
  ];

  /* ------------------------------------------------------------------------
     ETAT
     ------------------------------------------------------------------------ */
  var _route = 'espace';
  var _built = false;
  var _el = null, _body = null, _title = null, _back = null;
  var _retours = null;      // null = pas encore lu, [] = lu et vide
  var _secteurs = null;
  var _obs = null;          // retours communautaires nationaux, pour les secteurs
  var _loading = false;

  /* ------------------------------------------------------------------------
     HELPERS
     ------------------------------------------------------------------------ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function user() {
    return (typeof S_currentUser !== 'undefined') ? S_currentUser : null;
  }

  function profil() {
    return (typeof S_userProfile !== 'undefined' && S_userProfile) ? S_userProfile : {};
  }

  function initiale() {
    var u = user();
    if (!u) return '?';
    var src = u.displayName || u.email || '?';
    return src.trim().charAt(0).toUpperCase();
  }

  function avatarHtml(cls, editable) {
    var u = user();
    var inner = u && u.photoURL
      ? '<img src="' + esc(u.photoURL) + '" alt="" referrerpolicy="no-referrer">'
      : esc(initiale());
    var badge = editable ? '<span class="badge">' + ICO.cam + '</span>' : '';
    var id = editable ? ' id="vzeAvatar" role="button" tabindex="0"' : '';
    return '<span class="vze-av' + (cls ? ' ' + cls : '') + '"' + id + '>' + inner + badge + '</span>';
  }

  /* ------------------------------------------------------------------------
     PHOTO DE PROFIL
     ------------------------------------------------------------------------
     Compression cote client OBLIGATOIRE avant envoi. Une photo de telephone
     pese 3 a 8 Mo : la televerser telle quelle depuis un parking en 4G prend
     une minute et sature le quota Storage pour une image affichee en 44px.
     Canvas, 512px sur le grand cote pour un avatar, qualite 0.82.

     La meme mecanique servira aux photos de retours, avec 1600px et 0.8 : seuls
     les deux nombres changent, d'ou le parametrage plutot que le codage en dur.
     ------------------------------------------------------------------------ */
  function compressImage(file, maxSide, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, hgt = img.naturalHeight;
        if (!w || !hgt) { reject(new Error('image illisible')); return; }
        var r = Math.min(1, maxSide / Math.max(w, hgt));
        var cw = Math.round(w * r), ch = Math.round(hgt * r);
        var cv = document.createElement('canvas');
        cv.width = cw; cv.height = ch;
        var ctx = cv.getContext('2d');
        if (!ctx) { reject(new Error('canvas indisponible')); return; }
        ctx.drawImage(img, 0, 0, cw, ch);
        // Le passage par canvas retire l'EXIF au passage, donc la position GPS
        // du cliche ne part pas dans le fichier stocke. Pour les photos de
        // retours il faudra la LIRE avant, l'ecrire en champ Firestore, puis
        // laisser cette compression la supprimer du fichier.
        cv.toBlob(function (blob) {
          if (blob) resolve(blob); else reject(new Error('compression echouee'));
        }, 'image/jpeg', quality);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image illisible')); };
      img.src = url;
    });
  }

  function pickPhoto() {
    var u = user();
    if (!u || !window.fbStorage) { alert('Envoi indisponible pour le moment.'); return; }
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      inp.remove();
      if (!f) return;
      uploadPhoto(f);
    });
    inp.click();
  }

  function uploadPhoto(file) {
    var u = user();
    var av = document.getElementById('vzeAvatar');
    if (av) av.style.opacity = '.5';

    compressImage(file, 512, 0.82).then(function (blob) {
      // Chemin fixe : une seule photo de profil par compte, ecrasee a chaque
      // changement. Pas d'accumulation de fichiers orphelins dans Storage.
      var ref = window.fbStorageRef(window.fbStorage, 'users/' + u.uid + '/profil.jpg');
      return window.fbUploadBytes(ref, blob, { contentType: 'image/jpeg' })
        .then(function () { return window.fbGetDownloadURL(ref); });
    }).then(function (url) {
      // Deux ecritures : le profil Auth porte photoURL pour la trombine, le
      // document Firestore le porte pour l'espace. Les deux doivent rester
      // alignes, sinon la trombine et le profil montrent des images differentes.
      return window.fbUpdateProfile(u, { photoURL: url }).then(function () {
        return window.fbSetDoc(window.fbDoc(window.fbDb, 'users', u.uid),
                               { photoURL: url }, { merge: true });
      }).then(function () {
        if (S_userProfile) S_userProfile.photoURL = url;
        if (typeof VZ_ACCOUNT !== 'undefined' && VZ_ACCOUNT && VZ_ACCOUNT.sync) {
          VZ_ACCOUNT.sync(user());
        }
        render();
      });
    }).catch(function (err) {
      if (av) av.style.opacity = '';
      console.warn('[espace] photo', err);
      alert('Envoi de la photo impossible : ' + (err && err.message ? err.message : 'erreur'));
    });
  }

  // Une valeur absente s'ecrit avec un point d'interrogation lisible, jamais
  // avec un zero ni un tiret qui se confondrait avec une mesure.
  function num(v, dec) {
    if (v === null || v === undefined || isNaN(v)) return '?';
    var n = dec ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v));
    return n.replace('.', ',');
  }

  function moisFr(d) {
    return ['janvier','fevrier','mars','avril','mai','juin','juillet','aout',
            'septembre','octobre','novembre','decembre'][d.getMonth()];
  }

  function dateCourte(iso) {
    if (!iso) return '?';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '?';
    var m = ['janv','fevr','mars','avr','mai','juin','juil','aout','sept','oct','nov','dec'];
    return d.getDate() + ' ' + m[d.getMonth()];
  }

  /* ------------------------------------------------------------------------
     PREFERENCE D'UNITE
     ------------------------------------------------------------------------
     S_windUnit est deja la source de verite unique de toute l'application :
     setWindUnit et toggleWindUnit y ecrivent, et les 27 endroits qui affichent
     du vent la lisent. On ne cree donc AUCUN second systeme. Ce module se
     contente de rendre le reglage durable, en local et sur le compte.
     ------------------------------------------------------------------------ */
  function windUnit() {
    return (typeof S_windUnit !== 'undefined' && S_windUnit === 'kt') ? 'kt' : 'kmh';
  }

  function setUnit(u) {
    if (u === windUnit()) return;
    if (typeof setWindUnit === 'function') setWindUnit(u);
    else if (typeof toggleWindUnit === 'function') toggleWindUnit();
    render();
  }

  /* ------------------------------------------------------------------------
     LECTURE DES DONNEES
     ------------------------------------------------------------------------
     users/{uid}/retours et users/{uid}/secteurs. Les deux collections sont
     vides tant que le depot de retour et l'etoile de suivi ne sont pas livres.
     C'est un etat NORMAL, affiche comme tel et jamais comme un chargement.
     ------------------------------------------------------------------------ */
  function loadData() {
    var u = user();
    if (!u || !window.fbDb || !window.fbCollection) {
      _retours = []; _secteurs = []; return Promise.resolve();
    }
    if (_loading) return Promise.resolve();
    _loading = true;

    function readSub(name) {
      var col = window.fbCollection(window.fbDb, 'users', u.uid, name);
      return window.fbGetDocs(col).then(function (snap) {
        var out = [];
        snap.forEach(function (d) {
          var o = d.data() || {};
          o.id = d.id;
          out.push(o);
        });
        return out;
      }).catch(function (err) {
        console.warn('[espace] lecture ' + name, err);
        return [];
      });
    }

    // Les retours communautaires partent en meme temps que les deux
    // sous-collections, et ne bloquent pas l'affichage : l'espace se dessine
    // des que Firestore repond, les mesures s'ajoutent ensuite. Une liste qui
    // attend un appel reseau pour montrer un nom de secteur est une liste
    // qu'on croit cassee.
    var obsP = (typeof vzEnsureObservations === 'function')
      ? vzEnsureObservations().catch(function () { return []; })
      : Promise.resolve([]);

    return Promise.all([readSub('retours'), readSub('secteurs')]).then(function (r) {
      _retours = r[0];
      _secteurs = r[1];
      _loading = false;
      render();
      return obsP.then(function (all) {
        _obs = all || [];
        render();
      });
    });
  }

  /* ------------------------------------------------------------------------
     MESURE LA PLUS PROCHE D'UN SECTEUR SUIVI
     ------------------------------------------------------------------------
     Rend le retour communautaire le plus RECENT dans un rayon de 12 km et
     moins de 7 jours, exactement la meme fenetre que le panneau secteur. Deux
     ecrans qui parlent du meme point doivent afficher le meme chiffre, sinon
     le chasseur ne sait plus lequel croire.

     Aucune moyenne, aucune synthese, aucun feu tricolore : une mesure, sa
     date, et rien d'autre. Un secteur sans mesure recente porte un point
     d'interrogation lisible, jamais un etat grise ni une valeur rassurante.
     ------------------------------------------------------------------------ */
  function mesureSecteur(lat, lon) {
    if (!_obs || !_obs.length || typeof haversineKm !== 'function') return null;
    var best = null;
    var maxAge = 7 * 86400000;
    var now = Date.now();
    for (var i = 0; i < _obs.length; i++) {
      var o = _obs[i];
      if (typeof o.lat !== 'number' || typeof o.lon !== 'number') continue;
      if (!(o.visibility_m > 0)) continue;
      if (haversineKm(lat, lon, o.lat, o.lon) > 12) continue;
      var t = new Date(o.timestamp).getTime();
      if (isNaN(t) || (now - t) > maxAge) continue;
      if (!best || t > best.ts) best = { visi: o.visibility_m, ts: t };
    }
    if (!best) return null;
    var h = Math.round((now - best.ts) / 3600000);
    return {
      visi: best.visi,
      age: h < 1 ? 'a l\u2019instant'
         : h < 24 ? ('il y a ' + h + ' h')
         : ('il y a ' + Math.round(h / 24) + ' j')
    };
  }

  /* ------------------------------------------------------------------------
     STATISTIQUES
     ------------------------------------------------------------------------
     Quatre chiffres, en premier parce que c'est ce qu'on vient chercher.
     Aucune moyenne inventee : sans retour, la visibilite moyenne vaut ?, pas 0.
     ------------------------------------------------------------------------ */
  function ecartMoteur() {
    var rs = _retours || [];
    var n = 0, somme = 0;
    rs.forEach(function (r) {
      if (typeof r.predictedVisM === 'number' && typeof r.visibilityM === 'number'
          && r.visibilityM > 0) {
        somme += Math.abs(r.predictedVisM - r.visibilityM);
        n++;
      }
    });
    if (!n) return null;
    return { moyen: somme / n, n: n };
  }

  function stats() {
    var rs = _retours || [];
    var an = new Date().getFullYear();
    var dansAn = 0, somme = 0, n = 0, derniere = null;
    rs.forEach(function (r) {
      var d = r.date ? new Date(r.date) : null;
      if (d && !isNaN(d.getTime())) {
        if (d.getFullYear() === an) dansAn++;
        if (!derniere || d > derniere) derniere = d;
      }
      if (typeof r.visibilityM === 'number') { somme += r.visibilityM; n++; }
    });
    return [
      { n: String(dansAn), u: '', l: 'sorties en ' + an },
      { n: n ? num(somme / n, true) : '?', u: n ? 'm' : '', l: 'visibilit\u00e9 moyenne observ\u00e9e' },
      { n: String(rs.length), u: '', l: 'sorties au total' },
      derniere
        ? { n: String(derniere.getDate()), u: dateCourte(derniere.toISOString()).split(' ')[1], l: 'derni\u00e8re sortie' }
        : { n: '?', u: '', l: 'derni\u00e8re sortie' }
    ];
  }

  /* ------------------------------------------------------------------------
     HISTORIQUE ANNUEL ET SPOTS FAVORIS
     ------------------------------------------------------------------------
     Les deux sont DERIVES des retours a chaque rendu, jamais stockes en
     compteur. Meme regle que les points : un compteur persiste diverge le jour
     ou un retour est efface ou une regle change, et il faut alors migrer des
     donnees pour rattraper un chiffre qu'on savait deja calculer.

     L'annee en cours est exclue de l'historique : elle est deja la premiere
     statistique de l'ecran. La repeter deux blocs plus bas ferait croire a
     deux mesures differentes du meme fait.

     Un secteur favori porte les coordonnees de son retour le plus recent,
     pas une moyenne des positions : une moyenne de points GPS tombe en mer
     entre deux spots, a un endroit ou personne n'a jamais plonge.
     ------------------------------------------------------------------------ */
  function histoire() {
    var rs = _retours || [];
    var anCourante = new Date().getFullYear();
    var parAn = {}, parSecteur = {};

    rs.forEach(function (r) {
      var d = r.date ? new Date(r.date) : null;
      var t = (d && !isNaN(d.getTime())) ? d.getTime() : 0;

      if (t && d.getFullYear() !== anCourante) {
        var y = d.getFullYear();
        if (!parAn[y]) parAn[y] = { an: y, n: 0, somme: 0, mesures: 0 };
        parAn[y].n++;
        if (typeof r.visibilityM === 'number' && r.visibilityM > 0) {
          parAn[y].somme += r.visibilityM;
          parAn[y].mesures++;
        }
      }

      var nom = String(r.secteur || '').trim();
      if (nom) {
        if (!parSecteur[nom]) parSecteur[nom] = { nom: nom, n: 0, ts: 0, lat: null, lon: null };
        parSecteur[nom].n++;
        if (t >= parSecteur[nom].ts && typeof r.lat === 'number' && typeof r.lon === 'number') {
          parSecteur[nom].ts = t;
          parSecteur[nom].lat = r.lat;
          parSecteur[nom].lon = r.lon;
        }
      }
    });

    var annees = Object.keys(parAn).map(function (k) { return parAn[k]; })
      .sort(function (a, b) { return b.an - a.an; });
    var favoris = Object.keys(parSecteur).map(function (k) { return parSecteur[k]; })
      .sort(function (a, b) { return (b.n - a.n) || a.nom.localeCompare(b.nom); })
      .slice(0, 3);

    return { annees: annees, favoris: favoris };
  }

  /* ------------------------------------------------------------------------
     RENDU - ECRAN RACINE
     ------------------------------------------------------------------------ */
  function viewEspace() {
    var u = user();
    var p = profil();
    var nom = p.prenom || (u && u.displayName ? u.displayName.split(' ')[0] : '') || (u ? (u.email || '').split('@')[0] : '');
    var h = '';

    // En-tete identite. Photo, prenom, une ligne. Tapable vers le profil.
    h += '<button type="button" class="vze-id" data-go="profil">'
      +    avatarHtml('')
      +    '<span class="nm" style="flex:1;min-width:0;font-size:var(--vz-fs-title);font-weight:800;">' + esc(nom) + '</span>'
      +    ICO.chev
      + '</button>';

    // Statistiques
    h += '<div class="vze-group"><span class="vze-sect">Statistiques</span><div class="vze-stats">';
    stats().forEach(function (s) {
      h += '<div class="vze-stat"><span class="v"><span class="n">' + esc(s.n) + '</span>'
        + (s.u ? '<span class="u">' + esc(s.u) + '</span>' : '') + '</span>'
        + '<span class="l">' + esc(s.l) + '</span></div>';
    });
    h += '</div></div>';

    // Ecart du moteur. N'apparait que quand au moins un retour porte une
    // prevision archivee : afficher une precision calculee sur rien serait
    // exactement le genre de chiffre rassurant que le produit refuse.
    var em = ecartMoteur();
    if (em) {
      h += '<div class="vze-note">'
        +    '<span class="h">Ton moteur</span>'
        +    '<span class="b" style="font-family:var(--vz-font-num);font-size:var(--vz-fs-num-m);'
        +      'font-weight:700;color:var(--vz-ink);">'
        +      esc(num(em.moyen, true)) + ' m d\'\u00e9cart moyen</span>'
        +    '<span class="b">Diff\u00e9rence moyenne entre la visibilit\u00e9 annonc\u00e9e par Visimer et '
        +      'celle que tu as vue dans l\'eau, sur ' + em.n + ' sortie'
        +      (em.n > 1 ? 's' : '') + '. Chaque retour que tu d\u00e9poses affine ce chiffre.</span>'
        + '</div>';
    }

    // Historique par annee et spots favoris, derives des retours a chaque
    // rendu. Les deux blocs n'apparaissent que quand ils ont de la matiere :
    // un historique vide n'est pas une information, c'est un cadre vide.
    var hi = histoire();

    if (hi.annees.length) {
      var maxAn = 1;
      hi.annees.forEach(function (a) { if (a.n > maxAn) maxAn = a.n; });
      h += '<div class="vze-group"><span class="vze-sect">Les ann\u00e9es pr\u00e9c\u00e9dentes</span>';
      hi.annees.forEach(function (a) {
        var moy = a.mesures ? (num(a.somme / a.mesures, true) + ' m') : '?';
        h += '<div class="vze-yr">'
          +    '<span class="y">' + esc(String(a.an)) + '</span>'
          +    '<span class="bar"><i style="width:' + Math.round(a.n / maxAn * 100) + '%;"></i></span>'
          +    '<span class="n">' + esc(String(a.n)) + '</span>'
          +    '<span class="m">' + esc(moy) + '</span>'
          + '</div>';
      });
      h += '</div>';
      h += '<span class="vze-gloss" style="padding:0 4px;">nombre de sorties et visibilit\u00e9 '
        + 'moyenne observ\u00e9e par ann\u00e9e. Un point d\'interrogation veut dire qu\'aucun retour '
        + 'de cette ann\u00e9e ne porte de visibilit\u00e9.</span>';
    }

    if (hi.favoris.length) {
      h += '<div style="display:grid;gap:var(--vz-gap-4);">';
      h += '<span class="vze-sect" style="padding:0 4px;">Mes spots favoris</span>';
      h += '<div class="vze-group">';
      hi.favoris.forEach(function (f) {
        // Un favori sans coordonnees reste affiche mais n'est pas tapable :
        // ouvrir la carte sur un point inconnu vaut moins que ne rien faire.
        var cible = (typeof f.lat === 'number' && typeof f.lon === 'number')
          ? f.lat + ',' + f.lon : '';
        h += '<' + (cible ? 'button type="button" data-point="' + esc(cible) + '"' : 'div style="cursor:default;"')
          +    ' class="vze-row">'
          +    '<span class="nm">' + esc(f.nom) + '</span>'
          +    '<span class="val">' + esc(String(f.n)) + ' sortie' + (f.n > 1 ? 's' : '') + '</span>'
          +    (cible ? ICO.chev : '')
          + '</' + (cible ? 'button' : 'div') + '>';
      });
      h += '</div></div>';
    }

    // Mes secteurs
    h += '<div style="display:grid;gap:var(--vz-gap-4);">';
    h += '<span class="vze-sect" style="padding:0 4px;">Mes secteurs</span>';
    if (_secteurs && _secteurs.length) {
      h += '<div class="vze-group">';
      _secteurs.forEach(function (sec) {
        var m = mesureSecteur(sec.lat, sec.lon);
        // Tant que les retours ne sont pas revenus, on n'affiche RIEN a droite
        // plutot qu'un point d'interrogation : un ? veut dire "mesure absente",
        // pas "mesure en cours". Confondre les deux ferait croire au chasseur
        // qu'un secteur est muet alors qu'on n'a simplement pas fini de lire.
        var val = (_obs === null)
          ? ''
          : (m
              ? '<span class="val" style="text-align:right;display:grid;gap:1px;">'
                +   '<span style="font-size:var(--vz-fs-num-m);font-weight:700;color:var(--vz-ink);">'
                +     esc(num(m.visi, true)) + ' m</span>'
                +   '<span style="font-size:var(--vz-fs-provenance);font-weight:500;">'
                +     esc(m.age) + '</span>'
                + '</span>'
              : '<span class="val" style="font-size:var(--vz-fs-num-m);font-weight:700;">?</span>');
        h += '<button type="button" class="vze-row" data-secteur="' + esc(sec.id) + '">'
          +    '<span class="nm">' + esc(sec.nom || 'Secteur') + '</span>'
          +    val
          +    ICO.chev
          + '</button>';
      });
      h += '</div>';
      h += '<span class="vze-gloss" style="padding:0 4px;">visibilit\u00e9 observ\u00e9e par un chasseur '
        + 'dans les 12 km, sur les 7 derniers jours. Un point d\'interrogation veut dire '
        + 'qu\'aucune mesure r\u00e9cente n\'existe : la carte reste la seule \u00e0 montrer une pr\u00e9vision.</span>';
    } else {
      h += '<div class="vze-empty">'
        +    '<span class="t">Aucun secteur suivi</span>'
        +    '<span class="g">L\'\u00e9toile du panneau secteur permet de suivre un point et de le retrouver ici.</span>'
        + '</div>';
    }
    h += '</div>';

    // Mes retours
    h += '<div style="display:grid;gap:var(--vz-gap-4);">';
    h += '<span class="vze-sect" style="padding:0 4px;">Mes retours</span>';
    // Le depot est le SEUL point d'entree de la donnee du chasseur : il
    // alimente son historique et, pour la seule valeur de visibilite, le
    // secteur. Il figure donc au-dessus de la liste, atteignable que le
    // chasseur ait deja depose ou non.
    h += '<button type="button" class="vze-btn" data-act="depot">'
      +    ICO.plus + 'D\u00e9poser un retour</button>';
    if (_retours && _retours.length) {
      h += '<div class="vze-group">';
      _retours.slice().sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || ''));
      }).forEach(function (r) {
        // Prevu contre observe, cote a cote. C'est la lecture qui donne son
        // sens au retour : elle montre au chasseur ce que son depot a servi
        // a mesurer, au lieu de lui renvoyer son propre chiffre.
        var sousTitre = dateCourte(r.date);
        if (typeof r.predictedVisM === 'number' && r.predictedVisM > 0) {
          sousTitre += '  \u00b7  annonce ' + num(r.predictedVisM, true) + ' m';
        }
        h += '<div class="vze-row" style="cursor:default;">'
          +    '<span style="flex:1;min-width:0;display:grid;gap:2px;">'
          +      '<span class="nm">' + esc(r.secteur || 'Secteur') + '</span>'
          +      '<span class="sub" style="font-family:var(--vz-font-num);">'
          +        esc(sousTitre) + '</span>'
          +    '</span>'
          +    '<span class="val" style="font-size:var(--vz-fs-num-m);font-weight:700;color:var(--vz-ink);">'
          +      esc(num(r.visibilityM, true)) + ' m</span>'
          + '</div>';
      });
      h += '</div>';
    } else {
      h += '<div class="vze-empty">'
        +    '<span class="t">Aucun retour</span>'
        +    '<span class="g">Un retour garde ce que tu as vu sous l\'eau : la visibilit\u00e9 observ\u00e9e, tes notes, tes photos. Il reste priv\u00e9. Seule la valeur de visibilit\u00e9 peut \u00eatre partag\u00e9e, si tu le d\u00e9cides.</span>'
        + '</div>';
    }
    h += '</div>';

    // Pied
    h += '<div class="vze-group">';
    h += '<button type="button" class="vze-row flat" data-go="neuf">'
      +    '<span class="nm">Quoi de neuf</span>'
      +    (unread() ? '<span class="vze-dot">' + unread() + '</span>' : '')
      +    ICO.chev
      + '</button>';
    h += '<button type="button" class="vze-row flat" data-go="actifs">'
      +    '<span class="nm">Les plus actifs</span>' + ICO.chev
      + '</button>';
    h += '</div>';
    h += '<div class="vze-ver">Visimer ' + VERSION + '</div>';

    return h;
  }

  /* ------------------------------------------------------------------------
     RENDU - PROFIL
     ------------------------------------------------------------------------
     Export et suppression sont VISIBLES et LISIBLES, pas relegues en gris
     clair. Un produit qui respecte ses utilisateurs le demontre a cet endroit
     precis.
     ------------------------------------------------------------------------ */
  function viewProfil() {
    var u = user();
    var p = profil();
    var nomComplet = [p.prenom, p.nom].filter(Boolean).join(' ')
      || (u && u.displayName) || (u ? (u.email || '').split('@')[0] : '');
    var kt = windUnit() === 'kt';
    var h = '';

    h += '<div style="display:flex;align-items:center;gap:var(--vz-gap-6);padding:4px;">'
      +    avatarHtml('lg edit', true)
      +    '<span style="flex:1;min-width:0;display:grid;gap:3px;">'
      +      '<span style="font-size:22px;font-weight:800;line-height:1.05;">' + esc(nomComplet) + '</span>'
      +      '<span style="font-family:var(--vz-font-num);font-size:var(--vz-fs-provenance);font-weight:500;color:var(--vz-text-2);overflow:hidden;text-overflow:ellipsis;">' + esc(u ? u.email : '') + '</span>'
      +    '</span>'
      + '</div>';

    // Pseudo modifiable. C'est le seul nom visible par les autres chasseurs.
    h += '<div class="vze-group">'
      +    '<span class="vze-sect">Mon pseudo</span>'
      +    '<div style="padding:var(--vz-gap-3);display:grid;gap:var(--vz-gap-4);">'
      +      '<input class="vze-in" id="vzePseudo" type="text" maxlength="24" autocomplete="off" '
      +        'spellcheck="false" value="' + esc(p.pseudo || '') + '" placeholder="ton-pseudo">'
      +      '<button type="button" class="vze-btn ghost" id="vzePseudoSave">Enregistrer</button>'
      +    '</div>'
      +    '<span class="vze-gloss">le seul nom visible par les autres chasseurs. Il n\'appara\u00eet nulle part ailleurs.</span>'
      + '</div>';

    // Unit\u00e9s. Le reglage s'applique a toute l'application, pas seulement ici.
    h += '<div class="vze-group">'
      +    '<span class="vze-sect">Unit\u00e9s</span>'
      +    '<div style="display:flex;align-items:center;gap:var(--vz-gap-5);min-height:var(--vz-tap);padding:4px 10px;">'
      +      '<span style="flex:1;min-width:0;font-size:var(--vz-fs-label);font-weight:700;">Vitesse du vent</span>'
      +      '<span class="vze-seg">'
      +        '<button type="button" data-unit="kmh" aria-pressed="' + (!kt) + '">km/h</button>'
      +        '<button type="button" data-unit="kt" aria-pressed="' + kt + '">noeuds</button>'
      +      '</span>'
      +    '</div>'
      +    '<div style="display:flex;align-items:center;gap:var(--vz-gap-5);min-height:var(--vz-tap);padding:4px 10px;">'
      +      '<span style="flex:1;min-width:0;font-size:var(--vz-fs-label);font-weight:700;">Distance et visibilit\u00e9</span>'
      +      '<span class="val" style="font-family:var(--vz-font-num);font-size:var(--vz-fs-meta);font-weight:600;color:var(--vz-text-2);">m\u00e8tres</span>'
      +    '</div>'
      +    '<span class="vze-gloss">s\'applique \u00e0 toute l\'application, pas seulement \u00e0 l\'espace.</span>'
      + '</div>';

    // Mes donn\u00e9es
    h += '<div class="vze-group">'
      +    '<span class="vze-sect">Mes donn\u00e9es</span>'
      +    '<button type="button" class="vze-row" id="vzeExport">'
      +      '<span style="flex:1;min-width:0;display:grid;gap:2px;">'
      +        '<span class="nm">Exporter mes donn\u00e9es</span>'
      +        '<span class="sub">tout ce que Visimer conserve sur toi, en un fichier.</span>'
      +      '</span>' + ICO.chev
      +    '</button>'
      +    '<button type="button" class="vze-row" id="vzeDelete">'
      +      '<span style="flex:1;min-width:0;display:grid;gap:2px;">'
      +        '<span class="nm" style="color:var(--vz-danger);">Supprimer mon compte</span>'
      +        '<span class="sub">ton compte, tes retours et tes secteurs. D\u00e9finitif.</span>'
      +      '</span>' + ICO.chev
      +    '</button>'
      + '</div>';

    h += '<button type="button" class="vze-btn danger" id="vzeLogout">Se d\u00e9connecter</button>';
    return h;
  }

  /* ------------------------------------------------------------------------
     RENDU - LES PLUS ACTIFS
     ------------------------------------------------------------------------
     Le mot classement est ecarte : il suppose une competition entre chasseurs,
     alors que ce qu'on montre est autre chose, qui alimente la mesure
     collective. Sans eux, la carte est aveugle.
     Les donnees viennent d'un declencheur GAS nocturne, livre plus tard. Tant
     qu'il n'existe pas, on le dit au lieu d'inventer un tableau.
     ------------------------------------------------------------------------ */
  function viewActifs() {
    return '<div class="vze-empty">'
      +      '<span class="t">Pas encore de d\u00e9compte</span>'
      +      '<span class="g">Le d\u00e9compte des retours partag\u00e9s se calcule chaque nuit sur les 90 derniers jours. Il appara\u00eetra ici d\u00e8s que la premi\u00e8re s\u00e9rie sera compl\u00e8te.</span>'
      +    '</div>'
      +  '<div class="vze-note">'
      +    '<span class="h">Ce qui est compt\u00e9</span>'
      +    '<span class="b">Le nombre de retours partag\u00e9s sur 90 jours glissants, un seul par secteur et par jour. Ni la qualit\u00e9 des sorties, ni les prises. Le texte et les photos d\'un retour ne sortent jamais de ton espace.</span>'
      +  '</div>';
  }

  /* ------------------------------------------------------------------------
     RENDU - QUOI DE NEUF
     ------------------------------------------------------------------------ */
  function lastSeen() {
    var p = profil();
    if (p.lastSeenVersion) return p.lastSeenVersion;
    try { return localStorage.getItem('vizi_last_version') || ''; } catch (e) { return ''; }
  }

  function unread() {
    var seen = lastSeen();
    if (!seen) return NOUVEAUTES.length ? 1 : 0;
    var n = 0;
    for (var i = 0; i < NOUVEAUTES.length; i++) {
      if (NOUVEAUTES[i].v === seen) break;
      n++;
    }
    return n;
  }

  function markSeen() {
    if (!NOUVEAUTES.length) return;
    var v = NOUVEAUTES[0].v;
    try { localStorage.setItem('vizi_last_version', v); } catch (e) {}
    var u = user();
    if (u && window.fbDb && window.fbSetDoc) {
      window.fbSetDoc(window.fbDoc(window.fbDb, 'users', u.uid), { lastSeenVersion: v }, { merge: true })
        .then(function () { if (typeof S_userProfile === 'object' && S_userProfile) S_userProfile.lastSeenVersion = v; })
        .catch(function (err) { console.warn('[espace] lastSeenVersion', err); });
    }
  }

  function viewNeuf() {
    var seen = lastSeen();
    var neuf = true;
    var h = '';
    NOUVEAUTES.forEach(function (n) {
      if (n.v === seen) neuf = false;
      h += '<div class="vze-new' + (neuf ? ' is-new' : '') + '">'
        +    '<div style="display:flex;align-items:baseline;gap:10px;">'
        +      '<span class="d">' + esc(n.date) + '</span><span style="flex:1;"></span>'
        +      (neuf ? '<span class="vze-tag">nouveau</span>' : '')
        +    '</div>'
        +    '<span class="t">' + esc(n.titre) + '</span>'
        +    '<span class="b">' + esc(n.corps) + '</span>'
        + '</div>';
      if (n.v === seen) neuf = false;
    });
    return h;
  }

  /* ------------------------------------------------------------------------
     ACTIONS
     ------------------------------------------------------------------------ */
  function savePseudo() {
    var inp = document.getElementById('vzePseudo');
    var btn = document.getElementById('vzePseudoSave');
    var u = user();
    if (!inp || !u || !window.fbSetDoc) return;
    var v = inp.value.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
    if (!v) { inp.value = profil().pseudo || ''; return; }
    inp.value = v;
    if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement...'; }
    window.fbSetDoc(window.fbDoc(window.fbDb, 'users', u.uid), { pseudo: v }, { merge: true })
      .then(function () {
        if (typeof S_userProfile === 'object' && S_userProfile) S_userProfile.pseudo = v;
        if (btn) { btn.disabled = false; btn.textContent = 'Enregistre'; setTimeout(function () { btn.textContent = 'Enregistrer'; }, 1600); }
      })
      .catch(function (err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer'; }
        alert('Enregistrement impossible : ' + (err && err.message ? err.message : 'erreur'));
      });
  }

  // Export complet, cote client, sans passer par un serveur. Le fichier ne
  // quitte jamais l'appareil autrement que par la volonte du chasseur.
  function exportData() {
    var u = user();
    if (!u) return;
    var payload = {
      exporte_le: new Date().toISOString(),
      compte: { uid: u.uid, email: u.email || '', nom_affiche: u.displayName || '' },
      profil: profil(),
      secteurs: _secteurs || [],
      retours: _retours || []
    };
    try {
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'visimer-mes-donnees-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch (e) {
      alert('Export impossible sur ce navigateur.');
    }
  }

  // Suppression en deux temps. Firestore d'abord, compte ensuite : dans
  // l'autre sens, la session disparaitrait avant d'avoir le droit d'effacer
  // les documents, et ils resteraient orphelins pour toujours.
  function deleteAccount() {
    var u = user();
    if (!u) return;
    if (!window.confirm('Supprimer ton compte, tes retours et tes secteurs ? Cette action est definitive.')) return;
    if (!window.confirm('Derniere verification. Tout sera efface et rien ne pourra etre recupere.')) return;

    function delAll(name) {
      if (!window.fbGetDocs || !window.fbDeleteDoc) return Promise.resolve();
      var col = window.fbCollection(window.fbDb, 'users', u.uid, name);
      return window.fbGetDocs(col).then(function (snap) {
        var jobs = [];
        snap.forEach(function (d) {
          jobs.push(window.fbDeleteDoc(window.fbDoc(window.fbDb, 'users', u.uid, name, d.id)));
        });
        return Promise.all(jobs);
      }).catch(function (err) { console.warn('[espace] suppression ' + name, err); });
    }

    Promise.all([delAll('retours'), delAll('secteurs')])
      .then(function () { return window.fbDeleteDoc(window.fbDoc(window.fbDb, 'users', u.uid)); })
      .catch(function (err) { console.warn('[espace] suppression profil', err); })
      .then(function () { return window.fbDeleteUser(u); })
      .then(function () { close(); })
      .catch(function (err) {
        var c = (err && err.code) || '';
        if (c === 'auth/requires-recent-login') {
          alert('Par securite, reconnecte-toi puis relance la suppression. Tes documents ont deja ete effaces.');
          if (typeof logout === 'function') logout();
          close();
          return;
        }
        alert('Suppression incomplete : ' + (err && err.message ? err.message : 'erreur'));
      });
  }

  // Un appui sur un secteur suivi ferme l'espace, recentre la carte et ouvre
  // les Previsions sur ce point. Aucun ecran de detail n'est construit ici :
  // deux panneaux secteur finiraient par diverger.
  //
  // Le recadrage doit passer par vzSearchGoTo et pas par un setView centre.
  // openCondDrawer ne recoit aucun point en argument : il va LIRE lui-meme
  // vzmAimLatLng(), c'est-a-dire le point sous la croix, au tiers de la
  // hauteur de l'ecran. Centrer le secteur au milieu de la carte ferait donc
  // analyser un point situe plus au large, et le chasseur lirait une
  // prevision qui ne parle pas de son secteur. C'est exactement le genre
  // d'ecart silencieux que le produit ne tolere pas.
  /* Un seul chemin de recadrage pour les trois entrees qui en ont besoin :
     un secteur suivi, un spot favori, et le depot d'un retour. Trois copies
     de ce bloc finiraient par diverger sur le decalage mobile. */
  function allerAuPoint(lat, lon) {
    if (typeof lat !== 'number' || typeof lon !== 'number') return;
    close();
    try {
      if (typeof window.vzSearchGoTo === 'function') {
        window.vzSearchGoTo(lat, lon, 0);
      } else if (typeof S !== 'undefined' && S && S.map) {
        S.map.setView([lat, lon], 12);
        if (typeof isMobile === 'function' && isMobile()) {
          var sz = S.map.getSize();
          S.map.setView(S.map.containerPointToLatLng([sz.x / 2, sz.y * 2 / 3]), 12,
                        { animate: false });
        }
      }

      var mob = (typeof isMobile === 'function') && isMobile();
      if (mob && typeof VZM_NAV !== 'undefined' && VZM_NAV && VZM_NAV.open) {
        if (typeof VZ_SHEET !== 'undefined' && VZ_SHEET && VZ_SHEET.mode === 'cond') {
          VZ_SHEET.mode = null;
        }
        VZM_NAV.open('cond');
      } else if (typeof openSpotPopup === 'function') {
        openSpotPopup({ lat: lat, lng: lon }, null);
      }
    } catch (e) { console.warn('[espace] recadrage', e); }
  }

  /* ------------------------------------------------------------------------
     DEPOT D'UN RETOUR DEPUIS L'ESPACE
     ------------------------------------------------------------------------
     openObsSheet lit le centre de la carte. Ouvert depuis l'espace alors que
     la carte est restee sur la vue France, il rattacherait le retour au port
     le plus proche du centre du pays. On lui IMPOSE donc le point plutot que
     de recadrer et d'esperer : vzSearchGoTo decale le centre d'un tiers
     d'ecran en mobile pour degager le panneau, et ce decalage se retrouverait
     dans la donnee deposee.

     Sans secteur connu, on ouvre la feuille sur ce que la carte montre : le
     chasseur voit alors le nom du secteur en haut de la feuille et peut
     refermer s'il n'est pas au bon endroit.
     ------------------------------------------------------------------------ */
  function depotRetour() {
    var cible = histoire().favoris[0] || null;
    if (!cible || typeof cible.lat !== 'number') {
      cible = (_secteurs || []).filter(function (x) {
        return typeof x.lat === 'number' && typeof x.lon === 'number';
      })[0] || null;
    }
    close();
    try {
      if (cible) allerAuPoint(cible.lat, cible.lon);
    } catch (e) {}
    if (typeof openObsSheet !== 'function') return;
    var pt = cible ? { lat: cible.lat, lng: cible.lon } : null;
    // Laisse le recadrage se poser avant d'ouvrir la feuille : sur mobile,
    // VZM_NAV.open('cond') deroule le panneau secteur dans le meme tick.
    setTimeout(function () { openObsSheet(pt); }, cible ? 340 : 0);
  }

  function openSecteur(id) {
    var sec = (_secteurs || []).filter(function (x) { return x.id === id; })[0];
    if (!sec || typeof sec.lat !== 'number' || typeof sec.lon !== 'number') return;
    close();
    try {
      if (typeof window.vzSearchGoTo === 'function') {
        window.vzSearchGoTo(sec.lat, sec.lon, 0);
      } else if (typeof S !== 'undefined' && S && S.map) {
        // Repli si le module de recherche n'est pas monte : on refait le meme
        // decalage a la main plutot que de centrer et fausser la lecture.
        S.map.setView([sec.lat, sec.lon], 12);
        if (typeof isMobile === 'function' && isMobile()) {
          var sz = S.map.getSize();
          S.map.setView(S.map.containerPointToLatLng([sz.x / 2, sz.y * 2 / 3]), 12,
                        { animate: false });
        }
      }

      var mob = (typeof isMobile === 'function') && isMobile();
      if (mob && typeof VZM_NAV !== 'undefined' && VZM_NAV && VZM_NAV.open) {
        // VZM_NAV.open est un toggle : si le mode vaut deja 'cond', l'appel
        // REFERMERAIT le panneau au lieu de l'ouvrir sur le nouveau secteur.
        // On remet l'etat a zero avant, sinon le comportement depend de ce que
        // le chasseur avait ouvert juste avant d'entrer dans son espace.
        if (typeof VZ_SHEET !== 'undefined' && VZ_SHEET && VZ_SHEET.mode === 'cond') {
          VZ_SHEET.mode = null;
        }
        VZM_NAV.open('cond');
      } else if (typeof openSpotPopup === 'function') {
        openSpotPopup({ lat: sec.lat, lng: sec.lon }, null);
      }
    } catch (e) { console.warn('[espace] ouverture secteur', e); }
  }

  /* ------------------------------------------------------------------------
     RENDU ET NAVIGATION
     ------------------------------------------------------------------------ */
  function render() {
    if (!_built || !_el) return;
    var meta = ROUTES[_route] || ROUTES.espace;
    _title.textContent = meta.titre;
    _back.innerHTML = meta.racine ? ICO.x : ICO.back;
    _back.setAttribute('aria-label', meta.racine ? 'Fermer' : 'Retour');

    if (_route === 'profil')      _body.innerHTML = viewProfil();
    else if (_route === 'actifs') _body.innerHTML = viewActifs();
    else if (_route === 'neuf')   _body.innerHTML = viewNeuf();
    else                          _body.innerHTML = viewEspace();

    _body.scrollTop = 0;
    bindBody();
  }

  function go(r) {
    _route = ROUTES[r] ? r : 'espace';
    if (_route === 'neuf') markSeen();
    render();
  }

  function bindBody() {
    if (!_body) return;

    _body.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
    });
    _body.querySelectorAll('[data-secteur]').forEach(function (b) {
      b.addEventListener('click', function () { openSecteur(b.getAttribute('data-secteur')); });
    });
    _body.querySelectorAll('[data-point]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = String(b.getAttribute('data-point') || '').split(',');
        allerAuPoint(parseFloat(c[0]), parseFloat(c[1]));
      });
    });
    _body.querySelectorAll('[data-act="depot"]').forEach(function (b) {
      b.addEventListener('click', depotRetour);
    });
    _body.querySelectorAll('[data-unit]').forEach(function (b) {
      b.addEventListener('click', function () { setUnit(b.getAttribute('data-unit')); });
    });

    var av = document.getElementById('vzeAvatar');
    if (av) av.addEventListener('click', pickPhoto);
    var ps = document.getElementById('vzePseudoSave');
    if (ps) ps.addEventListener('click', savePseudo);
    var ex = document.getElementById('vzeExport');
    if (ex) ex.addEventListener('click', exportData);
    var dl = document.getElementById('vzeDelete');
    if (dl) dl.addEventListener('click', deleteAccount);
    var lo = document.getElementById('vzeLogout');
    if (lo) lo.addEventListener('click', function () {
      close();
      if (typeof logout === 'function') logout();
    });
  }

  /* ------------------------------------------------------------------------
     OUVERTURE ET FERMETURE
     ------------------------------------------------------------------------ */
  function open(route) {
    // Sans compte, l'espace n'a rien a montrer : on demande la connexion, et
    // le chasseur revient exactement ou il etait. Jamais un ecran de bienvenue.
    if (!user()) { if (typeof openLogin === 'function') openLogin(); return; }
    build();
    _route = ROUTES[route] ? route : 'espace';
    _el.classList.add('open');
    document.body.classList.add('vz-espace-open');
    render();
    if (_retours === null) loadData();
  }

  function close() {
    if (!_el) return;
    _el.classList.remove('open');
    document.body.classList.remove('vz-espace-open');
    _route = 'espace';
  }

  function onBack() {
    var meta = ROUTES[_route] || ROUTES.espace;
    if (meta.racine) close();
    else go('espace');
  }

  /* ------------------------------------------------------------------------
     ECRAN DE CONNEXION
     ------------------------------------------------------------------------
     Memes identifiants DOM que l'ancienne modale : le bloc VZ_AUTH de
     vizi-app.js continue de piloter cet ecran sans une ligne de changement.
     ------------------------------------------------------------------------ */
  function buildLogin() {
    if (document.getElementById('loginOverlay')) return;
    var ov = document.createElement('div');
    ov.id = 'loginOverlay';
    var ICO_STAR_S = '<svg viewBox="0 0 24 24"><path d="M12 3.2 l2.7 5.6 6.1.9 -4.4 4.3 1 6.1 -5.4-2.9 -5.4 2.9 1-6.1 -4.4-4.3 6.1-.9 Z" fill="none"/></svg>';
    var ICO_CHART_S = '<svg viewBox="0 0 24 24"><path d="M4 20 V12"/><path d="M12 20 V5"/><path d="M20 20 V14"/></svg>';

    // Un VRAI formulaire, avec un bouton de type submit. Sans lui, Chrome,
    // Safari et les gestionnaires de mots de passe refusent de proposer
    // l'enregistrement ET le remplissage automatique, quels que soient les
    // attributs autocomplete poses sur les champs. C'etait la cause exacte de
    // l'absence d'autocompletion : les attributs etaient corrects, le
    // conteneur manquait.
    ov.innerHTML = '<div id="loginModal">'
      + '<button type="button" class="login-close" aria-label="Fermer">' + ICO.x + '</button>'
      + '<div class="login-title">Ton espace</div>'
      + '<div class="login-why">'
      +   '<div><b>' + ICO_STAR_S + '</b><span>Garde tes spots en favoris et retrouve-les \u00e0 chaque sortie</span></div>'
      +   '<div><b>' + ICO_CHART_S + '</b><span>Suis tes statistiques de sortie et la visibilit\u00e9 que tu as vue</span></div>'
      + '</div>'
      + '<div class="login-error" id="loginError"></div>'
      + '<div class="login-ok" id="loginOk"></div>'
      + '<button type="button" class="login-google-btn">' + ICO.google
      +   '<span>Continuer avec Google</span></button>'
      + '<div class="login-divider">ou avec un email</div>'
      + '<form id="loginForm" autocomplete="on" novalidate style="display:grid;gap:var(--vz-gap-5);">'
      +   '<input type="email" class="login-input" id="loginEmail" name="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="ton@email.fr">'
      +   '<div class="login-pwd-wrap">'
      +     '<input type="password" class="login-input" id="loginPwd" name="password" autocomplete="current-password" placeholder="Mot de passe">'
      +     '<button type="button" class="login-eye" id="loginEye" aria-label="Afficher le mot de passe">' + ICO.eye + '</button>'
      +   '</div>'
      +   '<button type="submit" class="login-submit" id="loginSubmit">Se connecter</button>'
      + '</form>'
      + '<div class="login-alt">'
      +   '<button type="button" class="login-alt-btn" id="loginResetBtn">Mot de passe oubli\u00e9</button>'
      +   '<span class="sep">\u00b7</span>'
      +   '<button type="button" class="login-alt-btn" id="loginMagicBtn">Lien de connexion par email</button>'
      + '</div>'
      + '<div class="login-toggle" id="loginToggle">Pas encore de compte ?&nbsp;<span>Cr\u00e9e un compte</span></div>'
      // Ni case a cocher ni promesse a tenir : browserLocalPersistence est actif
      // depuis le socle, la session dure jusqu'a deconnexion explicite. Une case
      // "rester connecte" serait decorative, donc un faux affichage.
      + '<div class="login-foot">Tu restes connect\u00e9 sur cet appareil. '
      +   'La carte, elle, fonctionne \u00e0 l\'identique avec ou sans compte.</div>'
      + '</div>';
    document.body.appendChild(ov);

    // La soumission du formulaire est le chemin normal : touche Entree, bouton
    // Aller du clavier mobile, ou clic. C'est aussi ce qui declenche la
    // proposition d'enregistrement du mot de passe par le navigateur.
    ov.querySelector('#loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      if (typeof loginEmail === 'function') loginEmail();
    });

    ov.addEventListener('click', function (e) {
      if (e.target === ov && typeof closeLogin === 'function') closeLogin();
    });
    ov.querySelector('.login-close').addEventListener('click', function () {
      if (typeof closeLogin === 'function') closeLogin();
    });
    ov.querySelector('.login-google-btn').addEventListener('click', function () {
      if (typeof loginGoogle === 'function') loginGoogle();
    });
    ov.querySelector('#loginMagicBtn').addEventListener('click', function () {
      if (typeof vzAuthSendMagicLink === 'function') vzAuthSendMagicLink();
    });
    ov.querySelector('#loginResetBtn').addEventListener('click', function () {
      if (typeof vzAuthResetPassword === 'function') vzAuthResetPassword();
    });
    ov.querySelector('#loginToggle').addEventListener('click', function () {
      if (typeof toggleLoginMode === 'function') toggleLoginMode();
    });
    ov.querySelector('#loginEye').addEventListener('click', function () {
      var inp = document.getElementById('loginPwd');
      var btn = this;
      if (!inp) return;
      var shown = inp.type === 'text';
      inp.type = shown ? 'password' : 'text';
      btn.innerHTML = shown ? ICO.eye : ICO.eyeOff;
      btn.setAttribute('aria-label', shown ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
      inp.focus();
    });
  }

  /* ------------------------------------------------------------------------
     MONTAGE
     ------------------------------------------------------------------------ */
  function build() {
    if (_built || !document.body) return;

    var st = document.createElement('style');
    st.id = 'vzEspaceStyle';
    st.textContent = TOKENS + CSS;
    (document.head || document.documentElement).appendChild(st);

    _el = document.createElement('div');
    _el.id = 'vzEspace';
    _el.setAttribute('role', 'dialog');
    _el.setAttribute('aria-label', 'Mon espace');
    _el.innerHTML = '<div class="vze-head">'
      + '<button type="button" class="vze-back" aria-label="Fermer">' + ICO.x + '</button>'
      + '<span class="vze-title">Mon espace</span>'
      + '</div><div class="vze-body"></div>';
    document.body.appendChild(_el);

    _body  = _el.querySelector('.vze-body');
    _title = _el.querySelector('.vze-title');
    _back  = _el.querySelector('.vze-back');
    _back.addEventListener('click', onBack);

    buildLogin();
    _built = true;
  }

  // La feuille de style et l'ecran de connexion doivent exister AVANT toute
  // ouverture : openLogin peut etre appele par la trombine sans que l'espace
  // ait jamais ete ouvert.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

  // Une session qui change invalide les donnees lues : le chasseur suivant ne
  // doit jamais voir les retours du precedent.
  window.vzEspaceOnAuth = function () {
    _retours = null;
    _secteurs = null;
    _obs = null;
    _follows = null;
    if (user()) followResume();
    if (_el && _el.classList.contains('open')) {
      if (!user()) close();
      else { render(); loadData(); }
    }
  };

  /* ------------------------------------------------------------------------
     VZ_FOLLOW - SUIVRE UN SECTEUR
     ------------------------------------------------------------------------
     L'accroche vit sur la carte, jamais derriere un onglet. Pas d'ecran
     d'accueil qui vend un espace personnel, pas de banniere d'invitation, pas
     de mur a l'entree : le chasseur tape l'etoile parce qu'il veut retrouver ce
     secteur demain, et c'est a cet instant seulement qu'on lui parle de compte.

     Identifiant du secteur : les coordonnees arrondies a 3 decimales, soit
     environ 111 m\u00e8tres. Deux appuis sur le meme port produisent donc le meme
     document et non deux doublons, alors que le centre de carte ne tombe jamais
     deux fois sur les memes decimales. Le nom seul serait un mauvais choix : il
     vient de findNearestPort et deux points distants de plusieurs kilom\u00e8tres
     peuvent partager le meme port le plus proche.
     ------------------------------------------------------------------------ */
  var _follows = null;     // { id: true }, null tant que non lu
  var _pending = null;     // secteur mis de cote pendant la connexion

  function followId(lat, lon) {
    return lat.toFixed(3).replace('.', 'd').replace('-', 'm')
      + '_' + lon.toFixed(3).replace('.', 'd').replace('-', 'm');
  }

  function followLoad() {
    var u = user();
    if (!u || !window.fbDb) { _follows = {}; return Promise.resolve(_follows); }
    if (_follows) return Promise.resolve(_follows);
    return window.fbGetDocs(window.fbCollection(window.fbDb, 'users', u.uid, 'secteurs'))
      .then(function (snap) {
        var m = {};
        snap.forEach(function (d) { m[d.id] = true; });
        _follows = m;
        return m;
      }).catch(function (err) {
        console.warn('[suivi] lecture', err);
        _follows = {};
        return _follows;
      });
  }

  function askAccount(ctx) {
    var old = document.getElementById('vzFollowAsk');
    if (old) old.remove();
    var box = document.createElement('div');
    box.id = 'vzFollowAsk';
    box.className = 'vz-follow-ask';
    box.innerHTML = '<span class="t">Retrouver ' + esc(ctx.name || 'ce secteur') + ' demain</span>'
      + '<span class="g">Les secteurs suivis se gardent sur ton compte. La carte, elle, '
      + 'fonctionne pareil avec ou sans compte.</span>'
      + '<span class="r">'
      +   '<button type="button" class="no">Plus tard</button>'
      +   '<button type="button" class="go">Creer mon compte</button>'
      + '</span>';
    document.body.appendChild(box);
    box.querySelector('.no').addEventListener('click', function () { box.remove(); });
    box.querySelector('.go').addEventListener('click', function () {
      box.remove();
      // Le secteur est mis de cote : apres connexion, le suivi s'applique tout
      // seul et le chasseur revient exactement ou il etait, l'etoile allumee.
      // Jamais un ecran de bienvenue.
      _pending = ctx;
      if (typeof openLogin === 'function') openLogin();
    });
  }

  function followToggle(btn, ctx) {
    var u = user();
    if (!u) { askAccount(ctx); return; }
    var id = followId(ctx.lat, ctx.lon);
    var on = !!(_follows && _follows[id]);
    btn.disabled = true;

    var ref = window.fbDoc(window.fbDb, 'users', u.uid, 'secteurs', id);
    var job = on
      ? window.fbDeleteDoc(ref)
      : window.fbSetDoc(ref, {
          nom: ctx.name || 'Secteur',
          lat: ctx.lat, lon: ctx.lon,
          addedAt: window.fbServerTimestamp()
        });

    job.then(function () {
      if (!_follows) _follows = {};
      if (on) delete _follows[id]; else _follows[id] = true;
      // _obs n'est PAS vide ici : les retours communautaires ne dependent pas
      // du suivi, et les relire ferait un appel reseau pour rien.
      btn.setAttribute('aria-pressed', String(!on));
      btn.setAttribute('aria-label', on ? 'Suivre ce secteur' : 'Ne plus suivre ce secteur');
      // La liste de l'espace est invalidee : sans ca, le secteur qu'on vient de
      // suivre n'apparaitrait qu'au prochain rechargement complet.
      _secteurs = null;
      btn.disabled = false;
    }).catch(function (err) {
      console.warn('[suivi] ecriture', err);
      btn.disabled = false;
      alert('Enregistrement impossible : ' + (err && err.message ? err.message : 'erreur'));
    });
  }

  // Monte l'etoile dans un conteneur fourni par l'appelant. C'est vizi-app.js
  // qui decide OU elle vit, ce module decide seulement ce qu'elle fait : le
  // panneau secteur reste proprietaire de son gabarit.
  function followMount(host, ctx) {
    if (!host || !ctx || !isFinite(ctx.lat) || !isFinite(ctx.lon)) return;
    var old = host.querySelector('.vz-follow');
    if (old) old.remove();

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vz-follow';
    btn.innerHTML = ICO.star;
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Suivre ce secteur');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      followToggle(btn, ctx);
    });
    host.appendChild(btn);

    // Sans compte, l'etoile reste visible et eteinte : elle est l'invitation.
    // La masquer reviendrait a cacher la seule porte d'entree vers le compte.
    if (user()) {
      followLoad().then(function (m) {
        if (!btn.isConnected) return;
        var on = !!m[followId(ctx.lat, ctx.lon)];
        btn.setAttribute('aria-pressed', String(on));
        btn.setAttribute('aria-label', on ? 'Ne plus suivre ce secteur' : 'Suivre ce secteur');
      });
    }
  }

  // Reprise du geste interrompu par la connexion.
  function followResume() {
    if (!_pending || !user()) return;
    var ctx = _pending;
    _pending = null;
    var id = followId(ctx.lat, ctx.lon);
    followLoad().then(function (m) {
      if (m[id]) return;
      return window.fbSetDoc(window.fbDoc(window.fbDb, 'users', user().uid, 'secteurs', id), {
        nom: ctx.name || 'Secteur', lat: ctx.lat, lon: ctx.lon,
        addedAt: window.fbServerTimestamp()
      }).then(function () {
        _follows[id] = true;
        _secteurs = null;
        var btn = document.querySelector('.vz-follow');
        if (btn) {
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('aria-label', 'Ne plus suivre ce secteur');
        }
      });
    }).catch(function (err) { console.warn('[suivi] reprise', err); });
  }

  window.VZ_FOLLOW = {
    mount: followMount,
    reset: function () { _follows = null; }
  };

  /* ------------------------------------------------------------------------
     VZ_RETOUR - ECRITURE D'UN RETOUR PRIVE
     ------------------------------------------------------------------------
     Le retour est PRIVE par defaut. Il vit dans users/{uid}/retours, lisible
     par son seul auteur d'apres les regles Firestore. Le partage a la
     communaute reste ce qu'il etait : un envoi separe vers le GAS, decide
     explicitement, qui ne transmet que la valeur de visibilite. Le texte libre
     ne sort jamais de l'espace personnel.

     predictedVisM est le point capital de ce lot. Le moteur produit une
     prevision a chaque consultation, mais elle n'etait archivee NULLE PART au
     moment ou un chasseur constatait la realite. Sans le couple prevu/observe
     date et localise, aucune calibration n'est possible : on ne peut pas
     corriger un modele dont on n'a jamais mesure l'erreur. Chaque retour
     depose devient donc un point de controle du moteur.

     Il est archive tel quel, meme absent. Un retour sans prevision associee est
     une information honnete ; une prevision reconstituee apres coup serait une
     donnee fausse, et fausserait la calibration qu'elle pretend servir.
     ------------------------------------------------------------------------ */
  function currentPrediction() {
    try {
      var o = (typeof S !== 'undefined' && S) ? S._lastScoreObj : null;
      if (o && typeof o.visi_m === 'number' && isFinite(o.visi_m) && o.visi_m > 0) {
        return Math.round(o.visi_m * 10) / 10;
      }
    } catch (e) {}
    return null;
  }

  function saveRetour(data) {
    var u = user();
    if (!u || !window.fbDb || !window.fbAddDoc) return Promise.resolve(null);
    var col = window.fbCollection(window.fbDb, 'users', u.uid, 'retours');
    var doc = {
      date: data.date || new Date().toISOString().slice(0, 10),
      heure: data.heure || '',
      secteur: data.secteur || '',
      lat: data.lat, lon: data.lon,
      visibilityM: data.visibilityM,
      // Etat de l'eau tel que le chasseur l'a qualifie. Jamais synthetise avec
      // la visibilite en une note unique : ce sont deux observations distinctes.
      eau: data.eau || '',
      // Vie aquatique observee, trois crans. Elle ne quitte JAMAIS
      // users/{uid}/retours : aucune espece, aucune taille, aucun comptage, et
      // rien qui puisse etre recoupe pour deduire ou le poisson se tient.
      vie: data.vie || '',
      notes: data.notes || '',
      predictedVisM: currentPrediction(),
      partage: !!data.partage,
      createdAt: window.fbServerTimestamp()
    };
    return window.fbAddDoc(col, doc).then(function (ref) {
      // La liste de l'espace est invalidee : sans ca le retour n'apparaitrait
      // qu'au prochain rechargement complet de l'application.
      _retours = null;
      return ref;
    }).catch(function (err) {
      console.warn('[retour] ecriture', err);
      return null;
    });
  }

  window.VZ_RETOUR = {
    save: saveRetour,
    prediction: currentPrediction,
    isLogged: function () { return !!user(); },
    pseudo: function () { return profil().pseudo || ''; }
  };

  window.VZ_ESPACE = {
    open: open,
    close: close,
    go: go,
    isOpen: function () { return !!(_el && _el.classList.contains('open')); },
    unread: unread,
    version: VERSION
  };
})();
