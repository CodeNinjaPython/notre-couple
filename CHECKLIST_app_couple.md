# Checklist exhaustive — App de suivi de cycle en couple

> Tout ce que doit contenir l'app. Sert de tracker de build. Légende : **[V1]** = noyau indispensable · **[+]** = peut attendre une v2.

---

## 2. Appairage du couple
- [ ] [V1] Créer un couple (1er utilisateur)
- [ ] [V1] Générer un code d'appairage (6 caractères, expiration ~24 h)
- [ ] [V1] Copier le code en un tap
- [ ] [V1] Rejoindre via code (2e utilisateur)
- [ ] [V1] État « en attente du partenaire »
- [ ] [V1] État « lié » une fois les deux comptes connectés
- [ ] [V1] Marquer le code `used = true` après appairage
- [ ] [V1] Re-générer un code expiré
- [ ] [V1] Mode solo si le partenaire n'a pas (encore) rejoint
- [ ] [V1] Délier les comptes
- [ ] [+] Partage du code par QR code

## 3. Onboarding (première ouverture)
- [ ] [V1] Explication courte du concept (suivi symétrique)
- [ ] [V1] Choix : qui suit le cycle
- [ ] [V1] Choix du mode (règles / conception / grossesse)
- [ ] [V1] Saisie des dernières règles pour amorcer le calcul
- [ ] [V1] Acceptation du disclaimer (pas un moyen de contraception)

## 4. Écran « Aujourd'hui » (= la maquette)
- [ ] [V1] Header : jour du cycle + nom de phase + date du jour
- [ ] [V1] **Signature : double rythme** (courbe elle en or, lui en sauge, bandes de phase, marqueur « aujourd'hui »)
- [ ] [V1] Légende elle / lui
- [ ] [V1] Saisie du jour pour la personne connectée (chips par catégorie)
- [ ] [V1] Carte « insight de la semaine »
- [ ] [V1] Conseil de phase (uniquement côté lui)
- [ ] [V1] Moments partagés récents + bouton d'ajout rapide
- [ ] [V1] État vide (« rien noté aujourd'hui »)
- [ ] [V1] Feedback visuel à la sauvegarde d'une saisie

## 5. Saisie / journal
- [ ] [V1] Catégories communes : Humeur, Énergie, Sommeil, Libido, Stress, Sport
- [ ] [V1] Catégories cycle (elle) : Flux, Crampes
- [ ] [V1] Marquer début des règles
- [ ] [V1] Marquer fin des règles
- [ ] [V1] Sauvegarde dans `log_entries` (1 entrée / jour / catégorie)
- [ ] [V1] Indicateur « déjà saisi » vs « à saisir »
- [ ] [V1] Éditer une saisie du jour
- [ ] [V1] Saisie pour un jour antérieur (rattrapage)
- [ ] [+] Note libre quotidienne
- [ ] [+] Saisie rapide « comme hier »

## 6. Calendrier
- [ ] [V1] Vue mensuelle
- [ ] [V1] Jours de règles marqués
- [ ] [V1] Phase par couleur (menstruelle / folliculaire / ovulation / lutéale)
- [ ] [V1] Fenêtre fertile + ovulation prédites
- [ ] [V1] Tap sur un jour → détail des saisies des deux partenaires
- [ ] [V1] Navigation mois précédent / suivant
- [ ] [V1] Historique des cycles passés (dates + durées)
- [ ] [+] Vue « année » compacte

## 7. Prédiction
- [ ] [V1] Calcul de la durée moyenne du cycle (moyenne glissante)
- [ ] [V1] Prédiction des prochaines règles
- [ ] [V1] Prédiction ovulation / fenêtre fertile (≈ 14 j avant les règles suivantes)
- [ ] [V1] N'afficher qu'à partir de 2 cycles enregistrés
- [ ] [V1] Compte à rebours « règles dans X jours »
- [ ] [V1] Mention d'incertitude / caractère indicatif
- [ ] [+] Ajustement de la prédiction selon la régularité observée

## 8. Insights / moteur de corrélation
- [ ] [V1] Énergie de lui selon la phase d'elle (moyenne par phase)
- [ ] [V1] Alignement des libidos (corrélation des deux séries)
- [ ] [V1] Répartition des conflits par phase
- [ ] [V1] Corrélation des sommeils entre les deux
- [ ] [V1] Humeur de lui en miroir de celle d'elle (décalage possible d'un jour)
- [ ] [V1] État « pas assez de données » (avant 2–3 cycles)
- [ ] [V1] Affichage lisible : phrase + petit visuel
- [ ] [V1] Recalcul à chaque nouvelle saisie
- [ ] [V1] Section détaillée dans « Nous »

## 9. Conseils par phase (côté lui)
- [ ] [V1] Message phase menstruelle
- [ ] [V1] Message phase folliculaire
- [ ] [V1] Message phase ovulation
- [ ] [V1] Message phase lutéale
- [ ] [V1] Ton doux, factuel, non prescriptif

## 10. Moments partagés (`couple_events`)
- [ ] [V1] Types : intimité, conflit, soirée, autre
- [ ] [V1] Création par l'un des deux
- [ ] [V1] Visibles par les deux
- [ ] [V1] Note optionnelle
- [ ] [V1] Historique
- [ ] [V1] Édition / suppression
- [ ] [+] Validation à deux (l'autre confirme)

## 11. Écran « Nous »
- [ ] [V1] Corrélations détaillées
- [ ] [V1] Statistiques du couple (durée moyenne, régularité, fréquence des moments…)
- [ ] [V1] Réglage du partage
- [ ] [V1] Export des données
- [ ] [V1] Délier les comptes
- [ ] [V1] Mentions / disclaimer

## 12. Modes du cycle
- [ ] [V1] Mode règles (par défaut)
- [ ] [V1] Mode conception (fenêtre fertile mise en avant)
- [ ] [V1] Mode grossesse (suivi semaine par semaine, désactive la prédiction des règles)
- [ ] [V1] Bascule de mode dans les réglages

## 13. Notifications / rappels  ⚠️ partie la plus délicate, à faire en dernier
- [ ] [V1] Demande de permission
- [ ] [V1] Rappel quotidien de saisie (heure réglable)
- [ ] [V1] Alerte « règles imminentes »
- [ ] [+] Alerte fenêtre fertile (mode conception)
- [ ] [V1] Réglages : activer/désactiver chaque rappel
- [ ] [V1] Implémentation : service worker + Web Push, ou cron Vercel quotidien (iOS ≥ 16.4, PWA installée requise)

## 14. PWA
- [ ] [V1] `manifest.json` (nom, `display: standalone`, `theme-color`, orientation)
- [ ] [V1] Jeu d'icônes complet (tailles iOS + Android)
- [ ] [V1] Service worker (cache du shell)
- [ ] [V1] Installable + invite d'installation
- [ ] [V1] Lecture hors-ligne basique (dernières données en cache)
- [ ] [+] Splash screen personnalisé

## 15. Confidentialité, données & légal
- [ ] [V1] RLS active sur toutes les tables (déjà dans le schéma)
- [ ] [V1] Disclaimer contraception visible
- [ ] [V1] Export JSON / CSV
- [ ] [V1] Suppression de compte + effacement des données (droit à l'oubli)
- [ ] [V1] Mentions RGPD
- [ ] [V1] Aucun analytics tiers intrusif
- [ ] [+] Verrou d'app (code / biométrie) pour un sujet intime

## 16. États & UX transverses
- [ ] [V1] Navigation principale : Aujourd'hui / Calendrier / Nous
- [ ] [V1] États de chargement (skeletons)
- [ ] [V1] États vides sur chaque écran (avec invitation à agir)
- [ ] [V1] États d'erreur (réseau, Supabase indisponible)
- [ ] [V1] Comportement hors-ligne
- [ ] [V1] Confirmation des actions destructives (délier, supprimer, effacer)
- [ ] [V1] Responsive + safe-area iOS (encoche, barre du bas)
- [ ] [V1] Accessibilité : focus visible, `prefers-reduced-motion`, contraste suffisant
- [ ] [V1] Cohérence des tokens visuels (§6 du cahier de passation)

## 17. Technique / infra
- [ ] [V1] Client Supabase + variables d'environnement
- [ ] [V1] Helpers d'auth et requêtes RLS-aware
- [ ] [V1] Gestion d'état front
- [ ] [V1] **Gestion des dates / fuseau horaire** (critique pour le calcul du cycle — fixer le fuseau, éviter les décalages UTC)
- [ ] [V1] Seed des catégories de suivi
- [ ] [V1] Déploiement Vercel + variables d'env de prod
- [ ] [+] Sauvegarde / export programmé de la base

## 18. Contenu (copywriting FR)
- [ ] [V1] Textes de chaque écran
- [ ] [V1] Messages d'état vide
- [ ] [V1] Messages d'erreur (dans la voix de l'app, sans s'excuser, en disant quoi faire)
- [ ] [V1] Les 4 conseils par phase
- [ ] [V1] Le disclaimer
- [ ] [V1] Le nom de l'app (à arrêter — placeholder actuel : « Notre rythme »)

---

### Hors périmètre v1 (noté pour mémoire)
- Multi-couples / comptes multiples
- Monétisation / abonnement
- Intégration wearables (Oura, Fitbit…)
- Mode périménopause
- Bilingue FR/EN
- Partage granulaire catégorie par catégorie
