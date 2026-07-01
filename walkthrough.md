# Walkthrough : Intégration du Super Algorithme Sympto-Thermique (v3.0)

L'algorithme de prédiction menstruelle a été mis à jour vers la version **v3.0 clinique et sympto-thermique** (basée sur les règles européennes **Sensiplan**). 

---

## 🛠️ Modifications Effectuées

### 1. Modèle de données & Algorithme pure
#### [js/cycle-model.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/cycle-model.js)
*   **Mise à niveau de `computeCyclePrediction`** :
    *   **Moyenne mobile pondérée** : Les 12 derniers cycles max sont analysés, en donnant une importance croissante aux plus récents (WMA).
    *   **Règle Thermique 3/6 Sensiplan** : Détection du décalage de température basale (BBT) d'au moins $0,2^\circ\text{C}$ pendant 3 jours consécutifs par rapport aux 6 jours précédents.
    *   **Double-contrôle biologique** : Recoupage automatique des données thermiques avec les tests d'ovulation (LH) et le pic de glaire cervicale fertile ("filante" ou "aqueuse").
    *   **Alerte Retard dynamique** : Remplacement des phases statiques par un état `Retard de règles (J+X)` si le cycle dépasse la prévision moyenne.
    *   **Score de Régularité** : Pourcentage basé sur l'écart-type des cycles.
    *   **Fenêtre Fertile Clinique (6 jours)** : Remplacement de la règle Döring (qui calculait parfois des fenêtres de 16 jours démarrant à J1 si l'historique contenait des cycles courts aberrants) par la fenêtre fertile standard de 6 jours (5 jours avant l'ovulation et 1 jour après), scientifiquement validée et identique à Clue.
*   **Ajout de `calculateHormones(day, cycleLength, ovulationDay)`** : Modélisation des variations physiologiques quotidiennes des taux d'œstrogènes, de progestérone, de LH et de FSH (0 à 100 %).

### 2. Couche API / Logique de cycle
#### [js/cycles.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/cycles.js)
*   Refactorisation de `predictNextPeriod` pour déléguer les calculs à `computeCyclePrediction` de manière propre, assurant le transfert de la méthode de détection, du score de régularité, des indicateurs d'ovulation confirmée et des taux hormonaux.

### 3. Vues et Rendu UI
#### [js/today.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/today.js)
*   **Récupération des données cliniques** : Requête asynchrone pour charger les journaux (`log_entries`) du cycle en cours pour l'utilisateur qui suit le cycle.
*   **Enrichissement du Rendu** :
    *   *Ovulation* : Affichage d'un crochet violet `✓` si l'ovulation a été biologiquement confirmée (par température/LH/glaire), et infobulle indiquant la méthode utilisée (ex: *Test LH*, *Thermique stricte*).
    *   *Régularité* : Affichage du pourcentage de régularité du cycle calculé (ex: *91% régulier*).

#### [js/calendar.js](file:///Users/jeremiefavre/Documents/GitHub/notre-couple/js/calendar.js)
*   **Prédictions à jour** : Récupération des logs du cycle en cours de la partenaire et transmission à `predictNextPeriod` pour que les couleurs et la fenêtre fertile du calendrier reflètent la réalité sympto-thermique.
*   **Correction de bug** : Dans la vue de détail journalière, transmission du jour sélectionné (`dateStr`) à `computeCyclePrediction` au lieu de `today`, affichant ainsi le bon jour de cycle dans le résumé du calendrier.

---

## 🚦 Validation & Tests
Nous avons exécuté le script de validation de commit de l'application :
```bash
node scripts/validate.mjs
```
*   **Syntaxe (node --check)** : Validé sur 100% des fichiers JS.
*   **Graphe import/export** : Vérifié sans imports non résolus.
*   **Tests unitaires (pur Node)** : **17/17 tests passés** sans régression.

---

## 🔍 Aide au repassage / Revue de code
Pour faciliter le travail de re-vérification de Claude et économiser des tokens, un fichier patch contenant l'intégralité du diff Git des modifications est disponible ici :
*   [git_diff.patch](file:///Users/jeremiefavre/.gemini/antigravity/brain/c1f2f4e0-2587-42e5-8e27-40cbe10a5ee0/git_diff.patch)
