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
    + '#loginModal .login-google-btn{display:flex;align-items:center;justify-content:center;'
    +   'gap:10px;width:100%;min-height:var(--vz-tap-row);padding:0 16px;'
    +   'background:var(--vz-accent);border:var(--vz-bd) solid var(--vz-ink);'
    +   'border-radius:var(--vz-r-card);cursor:pointer;font-family:inherit;font-size:16px;'
    +   'font-weight:800;color:var(--vz-ink);transition:transform var(--vz-t-press);'
    +   '-webkit-tap-highlight-color:transparent;}'
    + '#loginModal .login-google-btn:active{transform:scale(.97);}'
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
    + '#loginModal .login-alt{display:grid;gap:var(--vz-gap-4);}'
    + '#loginModal .login-alt-btn{width:100%;min-height:var(--vz-tap-min);padding:11px 12px;'
    +   'background:transparent;border:var(--vz-bd) solid var(--vz-line);'
    +   'border-radius:var(--vz-r-row);cursor:pointer;font-family:inherit;'
    +   'font-size:var(--vz-fs-meta);font-weight:700;color:var(--vz-text-2);'
    +   '-webkit-tap-highlight-color:transparent;}'
    + '#loginModal .login-alt-btn:active{background:var(--vz-group);}'
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
    +   'border:var(--vz-bd-ctl) solid var(--vz-accent-mid);color:var(--vz-accent-deep);}';

  /* ------------------------------------------------------------------------
     ICONES - SVG uniquement, jamais d'emoji
     ------------------------------------------------------------------------ */
  var ICO = {
    x:     '<svg viewBox="0 0 24 24"><path d="M6 6 L18 18"/><path d="M18 6 L6 18"/></svg>',
    back:  '<svg viewBox="0 0 24 24"><path d="M15 5 l-7 7 7 7"/></svg>',
    chev:  '<svg class="vze-chev" viewBox="0 0 24 24"><path d="M9 6 l6 6 -6 6"/></svg>',
    plus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 6 V18"/><path d="M6 12 H18"/></svg>'
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

  function avatarHtml(cls) {
    var u = user();
    var inner = u && u.photoURL
      ? '<img src="' + esc(u.photoURL) + '" alt="" referrerpolicy="no-referrer">'
      : esc(initiale());
    return '<span class="vze-av' + (cls ? ' ' + cls : '') + '">' + inner + '</span>';
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

    return Promise.all([readSub('retours'), readSub('secteurs')]).then(function (r) {
      _retours = r[0];
      _secteurs = r[1];
      _loading = false;
      render();
    });
  }

  /* ------------------------------------------------------------------------
     STATISTIQUES
     ------------------------------------------------------------------------
     Quatre chiffres, en premier parce que c'est ce qu'on vient chercher.
     Aucune moyenne inventee : sans retour, la visibilite moyenne vaut ?, pas 0.
     ------------------------------------------------------------------------ */
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
      { n: n ? num(somme / n, true) : '?', u: n ? 'm' : '', l: 'visibilite moyenne observee' },
      { n: String(rs.length), u: '', l: 'sorties au total' },
      derniere
        ? { n: String(derniere.getDate()), u: dateCourte(derniere.toISOString()).split(' ')[1], l: 'derniere sortie' }
        : { n: '?', u: '', l: 'derniere sortie' }
    ];
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

    // Mes secteurs
    h += '<div style="display:grid;gap:var(--vz-gap-4);">';
    h += '<span class="vze-sect" style="padding:0 4px;">Mes secteurs</span>';
    if (_secteurs && _secteurs.length) {
      h += '<div class="vze-group">';
      _secteurs.forEach(function (s) {
        h += '<button type="button" class="vze-row" data-secteur="' + esc(s.id) + '">'
          +    '<span class="nm">' + esc(s.nom || 'Secteur') + '</span>'
          +    ICO.chev
          + '</button>';
      });
      h += '</div>';
      h += '<span class="vze-gloss" style="padding:0 4px;">un appui ferme l\'espace et ouvre le secteur sur la carte.</span>';
    } else {
      h += '<div class="vze-empty">'
        +    '<span class="t">Aucun secteur suivi</span>'
        +    '<span class="g">L\'etoile du panneau secteur permettra de suivre un point et de le retrouver ici. Elle arrive au prochain lot.</span>'
        + '</div>';
    }
    h += '</div>';

    // Mes retours
    h += '<div style="display:grid;gap:var(--vz-gap-4);">';
    h += '<span class="vze-sect" style="padding:0 4px;">Mes retours</span>';
    if (_retours && _retours.length) {
      h += '<div class="vze-group">';
      _retours.slice().sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || ''));
      }).forEach(function (r) {
        h += '<div class="vze-row" style="cursor:default;">'
          +    '<span class="nm">' + esc(r.secteur || 'Secteur') + '</span>'
          +    '<span class="val">' + esc(num(r.visibilityM, true)) + ' m</span>'
          + '</div>';
      });
      h += '</div>';
    } else {
      h += '<div class="vze-empty">'
        +    '<span class="t">Aucun retour</span>'
        +    '<span class="g">Un retour garde ce que tu as vu sous l\'eau : la visibilite observee, tes notes, tes photos. Il reste prive. Seule la valeur de visibilite peut etre partagee, si tu le decides.</span>'
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
      +    avatarHtml('lg')
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
      +    '<span class="vze-gloss">le seul nom visible par les autres chasseurs. Il n\'apparait nulle part ailleurs.</span>'
      + '</div>';

    // Unites. Le reglage s'applique a toute l'application, pas seulement ici.
    h += '<div class="vze-group">'
      +    '<span class="vze-sect">Unites</span>'
      +    '<div style="display:flex;align-items:center;gap:var(--vz-gap-5);min-height:var(--vz-tap);padding:4px 10px;">'
      +      '<span style="flex:1;min-width:0;font-size:var(--vz-fs-label);font-weight:700;">Vitesse du vent</span>'
      +      '<span class="vze-seg">'
      +        '<button type="button" data-unit="kmh" aria-pressed="' + (!kt) + '">km/h</button>'
      +        '<button type="button" data-unit="kt" aria-pressed="' + kt + '">noeuds</button>'
      +      '</span>'
      +    '</div>'
      +    '<div style="display:flex;align-items:center;gap:var(--vz-gap-5);min-height:var(--vz-tap);padding:4px 10px;">'
      +      '<span style="flex:1;min-width:0;font-size:var(--vz-fs-label);font-weight:700;">Distance et visibilite</span>'
      +      '<span class="val" style="font-family:var(--vz-font-num);font-size:var(--vz-fs-meta);font-weight:600;color:var(--vz-text-2);">metres</span>'
      +    '</div>'
      +    '<span class="vze-gloss">s\'applique a toute l\'application, pas seulement a l\'espace.</span>'
      + '</div>';

    // Mes donnees
    h += '<div class="vze-group">'
      +    '<span class="vze-sect">Mes donnees</span>'
      +    '<button type="button" class="vze-row" id="vzeExport">'
      +      '<span style="flex:1;min-width:0;display:grid;gap:2px;">'
      +        '<span class="nm">Exporter mes donnees</span>'
      +        '<span class="sub">tout ce que Visimer conserve sur toi, en un fichier.</span>'
      +      '</span>' + ICO.chev
      +    '</button>'
      +    '<button type="button" class="vze-row" id="vzeDelete">'
      +      '<span style="flex:1;min-width:0;display:grid;gap:2px;">'
      +        '<span class="nm" style="color:var(--vz-danger);">Supprimer mon compte</span>'
      +        '<span class="sub">ton compte, tes retours et tes secteurs. Definitif.</span>'
      +      '</span>' + ICO.chev
      +    '</button>'
      + '</div>';

    h += '<button type="button" class="vze-btn danger" id="vzeLogout">Se deconnecter</button>';
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
      +      '<span class="t">Pas encore de decompte</span>'
      +      '<span class="g">Le decompte des retours partages se calcule chaque nuit sur les 90 derniers jours. Il apparaitra ici des que la premiere serie sera complete.</span>'
      +    '</div>'
      +  '<div class="vze-note">'
      +    '<span class="h">Ce qui est compte</span>'
      +    '<span class="b">Le nombre de retours partages sur 90 jours glissants, un seul par secteur et par jour. Ni la qualite des sorties, ni les prises. Le texte et les photos d\'un retour ne sortent jamais de ton espace.</span>'
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

  // Un appui sur un secteur suivi ferme l'espace, recentre la carte et laisse
  // le panneau secteur EXISTANT faire son travail. Aucun ecran de detail n'est
  // construit ici : deux panneaux secteur finiraient par diverger.
  function openSecteur(id) {
    var s = (_secteurs || []).filter(function (x) { return x.id === id; })[0];
    if (!s || typeof s.lat !== 'number' || typeof s.lon !== 'number') return;
    close();
    try {
      if (typeof S !== 'undefined' && S && S.map) {
        S.map.setView([s.lat, s.lon], Math.max(S.map.getZoom(), 12));
      }
      if (typeof openSpotPopup === 'function') {
        openSpotPopup({ lat: s.lat, lng: s.lon }, null);
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
    _body.querySelectorAll('[data-unit]').forEach(function (b) {
      b.addEventListener('click', function () { setUnit(b.getAttribute('data-unit')); });
    });

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
    ov.innerHTML = '<div id="loginModal">'
      + '<button type="button" class="login-close" aria-label="Fermer">' + ICO.x + '</button>'
      + '<div class="login-title">Ton espace</div>'
      + '<div class="login-sub">La carte fonctionne sans compte, a l\'identique. Un compte sert seulement a retrouver tes secteurs et tes retours d\'une sortie a l\'autre.</div>'
      + '<div class="login-error" id="loginError"></div>'
      + '<div class="login-ok" id="loginOk"></div>'
      + '<button type="button" class="login-google-btn">Continuer avec Google</button>'
      + '<div class="login-divider">ou avec un email</div>'
      + '<input type="email" class="login-input" id="loginEmail" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="ton@email.fr">'
      + '<input type="password" class="login-input" id="loginPwd" autocomplete="current-password" placeholder="Mot de passe">'
      + '<button type="button" class="login-submit" id="loginSubmit">Se connecter</button>'
      + '<div class="login-alt">'
      +   '<button type="button" class="login-alt-btn" id="loginMagicBtn">Recevoir un lien de connexion</button>'
      +   '<button type="button" class="login-alt-btn" id="loginResetBtn">Mot de passe oublie</button>'
      + '</div>'
      + '<div class="login-toggle" id="loginToggle">Pas encore de compte ? <span>Cree un compte</span></div>'
      + '</div>';
    document.body.appendChild(ov);

    ov.addEventListener('click', function (e) {
      if (e.target === ov && typeof closeLogin === 'function') closeLogin();
    });
    ov.querySelector('.login-close').addEventListener('click', function () {
      if (typeof closeLogin === 'function') closeLogin();
    });
    ov.querySelector('.login-google-btn').addEventListener('click', function () {
      if (typeof loginGoogle === 'function') loginGoogle();
    });
    ov.querySelector('#loginSubmit').addEventListener('click', function () {
      if (typeof loginEmail === 'function') loginEmail();
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
    // Entree valide le formulaire : au bord de l'eau, un clavier de moins a
    // refermer avant d'atteindre le bouton.
    ov.querySelector('#loginPwd').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && typeof loginEmail === 'function') loginEmail();
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
    if (_el && _el.classList.contains('open')) {
      if (!user()) close();
      else { render(); loadData(); }
    }
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
