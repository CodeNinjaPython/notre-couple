# Plan d'implémentation - Refontes Espace Intime & Cycle

Ce plan décrit les modifications techniques pour répondre à l'ensemble des retours et demandes d'améliorations de l'application.

---

## 1. Modifications & Améliorations de l'Espace Intime

### Remplacement de "+ Noter un moment ce jour"
- **Fichiers** : [index.html](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/index.html) & [intimacy-calendar.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/intimacy-calendar.js)
- **Modifications** : Remplacer le bouton unique par deux boutons côte à côte :
  - `💞 Moments à deux` (ouvre la saisie couple)
  - `🙋 Moments solo` (ouvre la saisie solo)

### Verrouillage & Filtrage du mode Solo dans le Wizard
- **Fichiers** : [intimacy.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/intimacy.js) & [intimacy-sessions.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/intimacy-sessions.js)
- **Modifications** :
  - Cacher complètement la case "Moment solo" (`#session-solo`) et "Films olé olé" de l'Étape 1 lorsque le mode de départ est déterminé par le bouton cliqué (couple ou solo).
  - Adapter les choix de l'étape 2 (Pratiques réalisées) selon le mode (couple ou solo) et le genre de l'utilisateur (ex: *Humping* pour elle en solo, *Films olé olé* pour lui en solo).

### Formatage propre des activités et pratiques (Bug concaténation)
- **Fichiers** : [daily-log-ui.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/daily-log-ui.js), [intimacy-calendar.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/intimacy-calendar.js) & [intimacy-sessions.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/intimacy-sessions.js)
- **Modifications** : Ajouter un dictionnaire et une fonction de formatage `formatTag(t)` pour afficher des labels propres avec emojis (ex: `fellation` -> `💋 Fellation`, `cunnilingus` -> `👅 Cunnilingus`) au lieu des chaînes brutes collées sans espace.

### Tri des lieux par taille
- **Fichier** : [index.html](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/index.html)
- **Modifications** : Réordonner la grille des lieux (`.loc-grid`) :
  1. Contextes larges : `🏠 Maison`, `🏨 Hôtel`, `🚗 Voiture`, `✈️ Voyage`, `📍 Autre`
  2. Pièces/Endroits précis : `🛏️ Chambre`, `🛌 Lit`, `🛋️ Canapé`, `🚿 Salle de bain`, `💧 Douche`

### Illustrations dessinées des positions
- **Fichier** : [intimacy-library.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/intimacy-library.js)
- **Modifications** : Remplacer le rendu géométrique abstrait (ellipses et ronds disjoints) par des tracés SVG (`<path>`) de style sketch filaire minimaliste continu représentant de véritables postures de couples enlacés.

### Critères de notation adaptés par pratique
- **Fichier** : [intimacy-sessions.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/intimacy-sessions.js)
- **Modifications** :
  - Pour les positions standard de pénétration : conserver les boutons "Douleur" et "Trop profond".
  - Pour les massages : remplacer par des boutons "Trop fort" et "Détente".
  - Pour le sexe oral : remplacer par "Trop rapide" et "Doux".
  - Sauvegarder de manière rétrocompatible dans les colonnes existantes de Supabase (`pain` et `too_deep`).

### Notation des orgasmes de 0 à 10
- **Fichiers** : [index.html](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/index.html) & [intimacy-sessions.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/intimacy-sessions.js)
- **Modifications** : Remplacer les boutons "—, 1, 2+" par des sliders de range `0` à `10` pour Moi et Partenaire, avec affichage textuel de la note.

### Protections adaptées au genre (Elle ♀ vs Lui ♂)
- **Fichiers** : [index.html](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/index.html) & [intimacy-sessions.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/intimacy-sessions.js)
- **Modifications** : Générer dynamiquement les options de protection selon le genre (ex: préservatif externe, pilule, stérilet pour Elle ♀; préservatif, PrEP, vasectomie, retrait pour Lui ♂).

---

## 2. Séparation des Calendriers & Édition du Cycle

### Séparation Cycle / Intime
- **Fichiers** : [intimacy-calendar.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/intimacy-calendar.js) & [calendar.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/calendar.js)
- **Modifications** :
  - Retirer les règles (jours rouges) de la vue annuelle de l'Espace Intime (qui ne doit afficher que les rapports en doré).
  - Ajouter un bouton toggle Mois/Année sur le calendrier Cycle et un overlay annuel défilant vertical dédié (`#cycle-year-overlay`) affichant uniquement les règles en rouge.

### Modification & Suppression des événements de cycle
- **Fichiers** : [index.html](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/index.html) & [calendar.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/calendar.js)
- **Modifications** :
  - Ajouter des boutons `Modifier` (qui défile vers le formulaire) et `Supprimer` (qui efface l'entrée du jour sélectionné de la table `log_entries` Supabase) dans la feuille `#day-detail`.

---

## 3. Fusion des Saisies & Embellissement

### Saisie unifiée (Daily Log + Symptômes)
- **Fichiers** : [index.html](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/index.html) & [calendar.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/calendar.js)
- **Modifications** :
  - Fusionner "Saisie du jour" et "Symptômes détaillés" dans une seule carte unifiée nommée "Saisir aujourd'hui" (ouverte par défaut).
  - Faire en sorte que le tracker de symptômes charge la date sélectionnée sur le calendrier lors d'un clic de jour, au lieu de toujours afficher aujourd'hui.

### Rendu esthétique des événements (Détail jour)
- **Fichier** : [daily-log-ui.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/daily-log-ui.js) & [app.css](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/css/app.css)
- **Modifications** : Remplacer l'affichage textuel sec par des étiquettes (pills) joliment stylisées avec arrière-plan thématique et traduction propre de toutes les valeurs en français avec emojis.

---

## 4. Polissage UI/UX de l'onglet Aujourd'hui

### Boutons Humeur & Énergie
- **Fichiers** : [js/today.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/today.js) & [css/app.css](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/css/app.css)
- **Modifications** :
  - Rendre les boutons de sélection d'humeur et d'énergie circulaires avec des emojis clairs.
  - Afficher des labels textuels chaleureux sur le dessus (ex: `Moyen 🔋`, `Plein 🔥`, `Amoureux 🥰`) au lieu de simples chiffres.

### Correction du Double Rythme & Timezones
- **Fichier** : [js/today.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/today.js)
- **Modifications** : Corriger le calcul du jour du cycle (`state.cycleDay`) pour utiliser `diffDays(state.logDate, cycle.period_start)` pour éviter tout décalage d'un jour lié aux timezones locales.

### Ajustements Spacing "Cette semaine" & "Prochainement"
- **Fichier** : [css/app.css](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/css/app.css)
- **Modifications** : Retirer la structure double-card pour l'insight "Cette semaine" et donner un padding interne harmonieux de 16px à l'encart rose `.insight` et bleu `.tip` afin que les textes ne touchent pas les bords du rectangle coloré. Ajuster les marges et alignements de "Prochainement".

---

## Plan de vérification

### Tests manuels
1. Ouvrir le calendrier Intime, basculer sur "Année" et vérifier que seuls les rapports s'affichent.
2. Ouvrir le calendrier Cycle, basculer sur "Année" et vérifier que seules les règles s'affichent.
3. Cliquer sur un jour du cycle calendrier, modifier les symptômes, supprimer les données, et valider la réactivité de la grille.
4. Ouvrir le wizard Intimité Couple et valider que l'option Solo est invisible, que les orgasmes se règlent sur 10, et que les protections proposées correspondent au genre.
5. Valider le rendu esthétique des chips d'humeur et d'énergie sur l'onglet Aujourd'hui.
