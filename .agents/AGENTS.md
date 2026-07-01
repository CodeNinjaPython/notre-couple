# Règles de fin de tâche pour Antigravity

- À la fin de chaque tâche impliquant des modifications de code, l'agent doit systématiquement :
  1. Générer un fichier diff Git contenant les modifications exactes et le sauvegarder dans le répertoire des artéfacts de la conversation sous le nom `git_diff.patch`.
  2. Ajouter un lien cliquable vers ce fichier patch dans l'artéfact `walkthrough.md`.
  3. Fournir à la fin de son message un texte prêt à être copié-collé destiné à Claude (contenant les chemins absolus vers le patch et le walkthrough) afin de minimiser sa consommation de tokens et lui simplifier la re-vérification du code.

# Mémoires du projet

- **Calcul de fertilité clinique** : La fenêtre fertile est fixée de manière standard à 6 jours (5 jours avant l'ovulation et le jour de l'ovulation) + 1 jour de sécurité (soit `fertileStartDay = ovulationDay - 5` et `fertileEndDay = ovulationDay + 1`), pour éviter d'utiliser la règle Döring de Sensiplan (`shortest_cycle - 20`) qui pouvait élargir indûment la fenêtre fertile à 16 jours démarrant dès le J1 du cycle si l'historique comportait des cycles courts aberrants.
- **Importation Clue (nettoyage)** : Pour éviter le chevauchement ou l'intercalage de cycles (ce qui crée des cycles artificiels courts et fausse les prédictions), l'importation Clue (`clue-import.js`) supprime d'abord tous les cycles et les log_entries de l'utilisatrice avant d'insérer les nouvelles données.

