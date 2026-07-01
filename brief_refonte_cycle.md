# Brief de Refonte : Passage au Grand Format (Style Clue)

Ce document sert de spécification technique et visuelle à transmettre à l'assistant de code (Claude) afin de transformer le composant de suivi de cycle actuel en une version grand format plus immersive et ergonomique.

---

## 📸 Analyse des Captures & Comparatif

### 1. L'État Actuel (Notre Application - Petit Format)
* **Structure :** Un anneau circulaire très fin, minimaliste et discret au centre de l'écran.
* **Impact visuel :** Faible présence graphique, laissant beaucoup de vide autour du cadran.
* **Indicateurs :** Les phases (Lutéale, Fertile, etc.) sont affichées sous forme de segments fins ou de points de couleur un peu timides.

### 2. L'Objectif Cible (Inspiration Clue - Grand Format)
* **Structure :** Un **large anneau épais** (`stroke-width` généreux) qui occupe la majeure partie de la largeur de l'écran (environ 80-85% en vue mobile).
* **Contenu Central :** Les textes de statut sont parfaitement centrés à l'intérieur de l'anneau avec une hiérarchie claire :
  * Date du jour en petit et neutre (*"Aujourd'hui, 1 Juil."*)
  * Information principale en grand et gras (*"Prochaines règles dans 2 semaines"*)
  * Lien/Indicateur contextuel cliquable (*"Jour d'ovulation probable ∨"*)
* **Badge Contextuel ("Jour 17") :** Le jour actuel est encapsulé dans un macaron/badge circulaire qui vient se superposer directement sur le bas de l'anneau (effet d'ancrage sur la ligne de progression), plutôt que d'être simplement posé au milieu d'un trait fin.
* **Style des Segments :** Les zones colorées (ex: les règles en rouge) ont des extrémités arrondies (`stroke-linecap: round`) et une couleur pleine et dense, facilitant la lecture d'un simple coup d'œil.

---

## 🛠️ Instructions de Code pour Claude

Demande à Claude d'appliquer les modifications suivantes sur le composant de visualisation du cycle :

### 1. Redimensionnement de l'Anneau (SVG ou CSS Canvas)
* **Échelle :** Augmenter le rayon (`r`) et les dimensions globales du conteneur SVG pour occuper l'espace central de manière plus affirmée.
* **Épaisseur :** Augmenter significativement le `stroke-width` de la trajectoire de fond (le cercle gris clair) ainsi que des segments actifs (les périodes de règles ou fertiles).
* **Style :** Appliquer un `stroke-linecap="round"` sur les segments pour obtenir ce rendu "capsule" moderne et doux présent sur l'interface de Clue.

### 2. Refonte du Conteneur de Texte Central
* Structurer l'intérieur du cercle avec un positionnement absolu centré (`top: 50%; left: 50%; transform: translate(-50%, -50%);`) ou un agencement Flexbox vertical parfaitement centré au cœur du composant.
* Ajuster les tailles de police :
  * Titre de statut principal : `font-semibold` ou `font-bold`, taille augmentée (ex: `text-xl` ou `text-2xl` selon le framework CSS).

### 3. Positionnement et Style du Badge de Jour actuel
* Le badge contenant le texte exemple `"Jour 17"` doit avoire un aspect de bouton ou de bulle physique : fond blanc ou contrasté, bordure nette teintée selon la phase actuelle, et une ombre portée subtile (`shadow-sm` ou `shadow-md`) pour créer un effet de profondeur au-dessus de l'anneau.

### 4. Gestion des Points Indicateurs Périphériques
* Ajouter des nœuds ou des petits points de couleur (`<circle>` en SVG) positionnés de manière circulaire le long de la courbe interne ou externe de l'anneau pour marquer graphiquement les jours clés du cycle (vert pour sexualité, orange pour humeur et rouge pour flux).
