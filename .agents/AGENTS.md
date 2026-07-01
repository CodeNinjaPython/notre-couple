# Règles de fin de tâche pour Antigravity

- À la fin de chaque tâche impliquant des modifications de code, l'agent doit systématiquement :
  1. Générer un fichier diff Git contenant les modifications exactes et le sauvegarder dans le répertoire des artéfacts de la conversation sous le nom `git_diff.patch`.
  2. Ajouter un lien cliquable vers ce fichier patch dans l'artéfact `walkthrough.md`.
  3. Fournir à la fin de son message un texte prêt à être copié-collé destiné à Claude (contenant les chemins absolus vers le patch et le walkthrough) afin de minimiser sa consommation de tokens et lui simplifier la re-vérification du code.
