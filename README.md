<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo/logo-white.svg">
    <img src="assets/logo/logo.svg" alt="C4 Re:Configure" width="320">
  </picture>
</p>

<p align="center"><strong>Explore. Customise. Redécouvre.</strong></p>

# C4 Re:Configure

Site web indépendant consacré à la Citroën C4 première génération (2004 à 2010) : configurateur Phase I et Phase II, coupé et berline, options et packs d'époque, guides d'installation.

> Projet personnel, informatif et non officiel. Il n'est ni édité, ni approuvé, ni sponsorisé par Citroën ou Stellantis. Citroën et C4 sont des marques de leurs propriétaires respectifs, citées uniquement pour identifier le véhicule étudié.

## Structure

```
index.html            Page d'accueil (vidéo d'ouverture, accès aux sections)
pages/                Les autres pages du site
css/style.css         Styles
js/script.js          Comportements (en-tête, menu mobile, vidéo, pied de page)
assets/logo/          Logos au format SVG
images/               Photos du site (à ajouter)
videos/               Vidéo d'ouverture (à ajouter)
```

## Pages

| Page | Fichier |
|---|---|
| Accueil | `index.html` |
| Configurateur | `pages/configurateur.html` |
| Options et packs | `pages/options.html` |
| Guides d'installation | `pages/guides.html` |
| Catalogue | `pages/catalogue.html` |
| À propos | `pages/a-propos.html` |
| Mentions légales | `pages/mentions-legales.html` |
| Confidentialité | `pages/confidentialite.html` |

Le configurateur accepte la phase et la carrosserie dans l'adresse, par exemple `pages/configurateur.html?phase=2&carrosserie=berline`.

## Logos

| Fichier | Usage |
|---|---|
| `logo.svg` | Logo complet, fond clair |
| `logo-white.svg` | Logo complet, fond sombre |
| `logo-mark.svg` | Monogramme « C4: », fond clair (favicon) |
| `logo-mark-white.svg` | Monogramme « C4: », fond sombre |

## Médias à fournir

Tant qu'un fichier est absent, la page affiche un cadre avec le nom attendu.

| Fichier | Format |
|---|---|
| `videos/hero.mp4` (et `hero.webm`, optionnel) | 16:9, 1920 x 1080 |
| `images/hero.jpg` | 16:9, 1920 x 1080 |
| `images/c4-coupe-phase1.jpg`, `c4-berline-phase1.jpg`, `c4-coupe-phase2.jpg`, `c4-berline-phase2.jpg` | 5:4, 1000 x 800 minimum |
| `images/configurateur.jpg`, `guides.jpg`, `catalogue.jpg` | 16:9, 1280 x 720 minimum |

Vérifier les droits de chaque image et de chaque vidéo avant publication.

## Lancer le site en local

Ouvrir `index.html` dans un navigateur, ou démarrer un petit serveur depuis la racine du projet :

```bash
python3 -m http.server 8000
```

puis aller sur <http://localhost:8000>.

## Technologies

HTML, CSS et JavaScript, sans framework, sans dépendance, sans cookie ni service tiers.