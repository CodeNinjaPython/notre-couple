# Checklist exhaustive — App de suivi de cycle en couple

> Tracker de build. **[V1]** = noyau · **[+]** = v2 · ✅ = implémenté · ⚠️ = partiel · ❌ = absent

---

## 2. Appairage du couple

- [x] [V1] Créer un couple (1er utilisateur)
- [x] [V1] Générer un code d'appairage (6 caractères, expiration ~24 h)
- [x] [V1] Copier le code en un tap
- [x] [V1] Rejoindre via code (2e utilisateur)
- [x] [V1] État « en attente du partenaire »
- [x] [V1] État « lié » une fois les deux comptes connectés — *toast « 💜 X a rejoint votre espace » à la première détection (today.js, flag `nc-partner-seen`)*
- [x] [V1] Marquer le code `used = true` après appairage
- [x] [V1] Re-générer un code expiré
- [x] [V1] Mode solo si le partenaire n'a pas (encore) rejoint — *bandeau « Vous suivez en solo » + bouton « Inviter mon partenaire » (régénère un code + partage) sur Today*
- [x] [V1] Délier les comptes
- [ ] [+] Partage du code par QR code

## 3. Onboarding (première ouverture)

- [x] [V1] Explication courte du concept (suivi symétrique)
- [x] [V1] Choix : qui suit le cycle
- [x] [V1] Choix du mode (règles / conception / grossesse)
- [x] [V1] Saisie des dernières règles pour amorcer le calcul
- [x] [V1] Acceptation du disclaimer (pas un moyen de contraception)

## 4. Écran « Aujourd'hui »

- [x] [V1] Header : jour du cycle + nom de phase + date du jour
- [x] [V1] **Signature : double rythme** (courbes superposées, bandes de phase, marqueur aujourd'hui)
- [x] [V1] Légende elle / lui
- [x] [V1] Saisie du jour pour la personne connectée (chips par catégorie)
- [x] [V1] Carte « insight de la semaine »
- [x] [V1] Conseil de phase (uniquement côté lui)
- [x] [V1] Moments partagés récents + bouton d'ajout rapide
- [x] [V1] État vide (« rien noté aujourd'hui »)
- [x] [V1] Feedback visuel à la sauvegarde d'une saisie (toast)

## 5. Saisie / journal

- [x] [V1] Catégories communes : Humeur, Énergie, Sommeil, Libido, Stress, Sport
- [x] [V1] Catégories cycle (elle) : Flux, Crampes
- [x] [V1] Marquer début des règles
- [x] [V1] Marquer fin des règles
- [x] [V1] Sauvegarde dans `log_entries` (1 entrée / jour / catégorie)
- [x] [V1] Indicateur « déjà saisi » vs « à saisir » (chip colorée)
- [x] [V1] Éditer une saisie du jour
- [x] [V1] Saisie pour un jour antérieur (rattrapage ← →)
- [x] [+] Note libre quotidienne *(ajouté)*
- [x] [+] Saisie rapide « comme hier » *(ajouté)*

## 6. Calendrier

- [x] [V1] Vue mensuelle
- [x] [V1] Jours de règles marqués
- [x] [V1] Phase par couleur (menstruelle / folliculaire / ovulation / lutéale)
- [x] [V1] Fenêtre fertile + ovulation prédites
- [x] [V1] Tap sur un jour → détail des saisies des deux partenaires
- [x] [V1] Navigation mois précédent / suivant
- [x] [V1] Historique des cycles passés (dates + durées)
- [ ] [+] Vue « année » compacte

## 7. Prédiction

- [x] [V1] Calcul de la durée moyenne du cycle (moyenne glissante)
- [x] [V1] Prédiction des prochaines règles
- [x] [V1] Prédiction ovulation / fenêtre fertile (≈ 14 j avant les règles suivantes)
- [x] [V1] N'afficher qu'à partir de 2 cycles enregistrés
- [x] [V1] Compte à rebours « règles dans X jours »
- [x] [V1] Mention d'incertitude / caractère indicatif
- [ ] [+] Ajustement de la prédiction selon la régularité observée (écart-type)

## 8. Insights / moteur de corrélation

- [x] [V1] Énergie de lui selon la phase d'elle (tendances 7 j + 12 semaines)
- [x] [V1] Alignement des libidos (corrélation de Pearson)
- [x] [V1] Répartition des conflits par phase (heatmap dans Nous)
- [x] [V1] Corrélation des sommeils entre les deux
- [x] [V1] Humeur de lui en miroir de celle d'elle
- [x] [V1] État « pas assez de données » (avant 2–3 cycles)
- [x] [V1] Affichage lisible : barre Pearson + label de force
- [ ] [V1] Recalcul à chaque nouvelle saisie ⚠️ *seulement au chargement de Nous*
- [x] [V1] Section détaillée dans « Nous »

## 9. Conseils par phase (côté lui)

- [x] [V1] Message phase menstruelle
- [x] [V1] Message phase folliculaire
- [x] [V1] Message phase ovulation
- [x] [V1] Message phase lutéale
- [x] [V1] Ton doux, factuel, non prescriptif

## 10. Moments partagés (`couple_events`)

- [x] [V1] Types : intimité, conflit, soirée, autre
- [x] [V1] Création par l'un des deux
- [x] [V1] Visibles par les deux
- [x] [V1] Note optionnelle
- [x] [V1] Historique
- [x] [V1] Édition / suppression
- [ ] [+] Validation à deux (l'autre confirme)

## 11. Écran « Nous »

- [x] [V1] Corrélations détaillées (Pearson + barres + labels)
- [x] [V1] Statistiques du couple (score synchronie, tendances, heatmap, semaine)
- [x] [V1] Réglage du partage (tracks_cycle)
- [x] [V1] Export des données (JSON + CSV + PDF)
- [x] [V1] Délier les comptes
- [x] [V1] Mentions / disclaimer (bloc RGPD)

## 12. Modes du cycle

- [x] [V1] Mode règles (par défaut)
- [x] [V1] Mode conception — *fenêtre fertile au calendrier + statut fertilité dans le header + alerte fenêtre fertile branchée*
- [x] [V1] Mode grossesse — *compteur semaines + anneau de progression + repère semaine par semaine (`pregnancy-milestones.js`) : taille comparée, note, prochain rendez-vous clé*
- [x] [V1] Bascule de mode dans les réglages

## 13. Notifications / rappels

- [x] [V1] Demande de permission
- [x] [V1] Rappel quotidien de saisie (heure réglable dans Nous)
- [x] [V1] Alerte « règles imminentes » (≤ 2 jours)
- [x] [+] Alerte fenêtre fertile (mode conception) — *`checkFertileWindow` appelé depuis today.js en mode conception (toggle dans Nous)*
- [x] [V1] Réglages : activer/désactiver chaque rappel (UI dans Nous)
- [ ] [V1] Implémentation Web Push VAPID ❌ *local SW uniquement (iOS 16.4+ requis pour vrai push)*

## 14. PWA

- [x] [V1] `manifest.json` (nom, `display: standalone`, `theme-color`, orientation)
- [x] [V1] Jeu d'icônes complet — *icon-192, icon-512 (maskable), apple-touch-icon 180 générés et liés (head + manifest)*
- [x] [V1] Service worker (cache du shell, v6)
- [x] [V1] Installable + invite d'installation (beforeinstallprompt)
- [x] [V1] Lecture hors-ligne basique (mode démo localStorage + cache SW)
- [ ] [+] Splash screen personnalisé

## 15. Confidentialité, données & légal

- [x] [V1] RLS active sur toutes les tables (`docs/schemas/`)
- [x] [V1] Disclaimer contraception visible (footer + onboarding)
- [x] [V1] Export JSON / CSV / PDF
- [x] [V1] Suppression de compte + effacement des données (droit à l'oubli)
- [x] [V1] Mentions RGPD (bloc dans Nous)
- [x] [V1] Aucun analytics tiers intrusif
- [ ] [+] Verrou d'app (code / biométrie)

## 16. États & UX transverses

- [x] [V1] Navigation principale : Aujourd'hui / Calendrier / Nous
- [ ] [V1] États de chargement (skeletons) ⚠️ *CSS présent, non branché sur les fetches*
- [x] [V1] États vides sur chaque écran (avec invitation à agir)
- [x] [V1] États d'erreur (réseau, Supabase indisponible) — *filet routeur (`router.js`) + `friendlyError()` → toast erreur*
- [x] [V1] Comportement hors-ligne (mode démo + cache SW)
- [x] [V1] Confirmation des actions destructives (délier, supprimer, effacer)
- [x] [V1] Responsive + safe-area iOS (encoche, barre du bas)
- [x] [V1] Accessibilité : focus visible, `prefers-reduced-motion`
- [x] [V1] Cohérence des tokens visuels

## 17. Technique / infra

- [x] [V1] Client Supabase + variables d'environnement (`js/config.js`)
- [x] [V1] Helpers d'auth et requêtes RLS-aware
- [x] [V1] Gestion d'état front (modules ES, state par vue)
- [x] [V1] **Gestion des dates / fuseau horaire** (`js/date-utils.js`, `localDateStr()` partout)
- [x] [V1] Seed des catégories de suivi (`js/local-db.js` + `schema_couple_tracker.sql`)
- [x] [V1] Déploiement Vercel (`vercel.json`)
- [ ] [+] Sauvegarde / export programmé de la base

## 18. Contenu (copywriting FR)

- [x] [V1] Textes de chaque écran
- [x] [V1] Messages d'état vide
- [x] [V1] Messages d'erreur dans la voix de l'app — *`js/ui-feedback.js` : `toast()` + `confirmDialog()` remplacent `alert()`/`confirm()` du noyau (intimité à suivre)*
- [x] [V1] Les 4 conseils par phase (`PHASES_DATA` dans `today.js`)
- [x] [V1] Le disclaimer (onboarding + footer + RGPD)
- [x] [V1] Le nom de l'app — *« Notre cycle » (tranché ; appliqué manifest, title, notifications, PDF, partage)*

---

### Restant V1 prioritaire

1. Icônes PNG PWA (`icons/generate.html` → générer + commiter)
2. États d'erreur réseau (composant `.error-card` à brancher sur les fetches)
3. Skeletons de chargement (CSS présent, à brancher)
4. Recalcul corrélations temps réel (après chaque saisie dans `today.js`)
5. Modes conception/grossesse : comportement réel au-delà de l'UI
6. Nom définitif de l'app
7. Web Push VAPID (nécessite Supabase Edge Function ou cron Vercel)

---

## Module Intimité (extension v2 — `docs/MODULE_intimite_app_couple.md`)

### Architecture

- [x] `js/intimacy.js` — orchestrateur léger (~200 l)
- [x] `js/intimacy-sessions.js` — formulaires, fast-track, try/catch
- [x] `js/intimacy-stats.js` — stats, heatmap, courbe, débrief
- [x] `js/intimacy-library.js` — 40 positions offline, SVG, filtres, suggestions
- [x] `js/kinks.js` — double-révélation, wish-list, limites, check-in
- [x] `js/pin-lock.js` — PIN SHA-256, masquage rapide, visibilitychange
- [x] `js/intimacy-tests.js` — tests unitaires fenêtre désir + kink match rate

### Journal & Formulaire

- [x] Session complète (mood, lieu, durée, tags d'activité multi-sélect, note partagée)
- [x] Sélecteur de positions dans le formulaire
- [x] Fast-track (4 taps : ambiance + satisfaction + orgasme → save)
- [x] Feedback post-séance automatique (4 questions ~30s, privé)
- [ ] Positions libres / tags personnalisables par l'utilisateur
- [ ] Durée préliminaires séparée + intensité slider

### Bibliothèque de positions

- [x] 40 positions offline embarquées en JS
- [x] SVG silhouettes line-art minimalistes (rose = elle, bleu = lui)
- [x] Filtres : intensité, confort, catégorie
- [x] Suggestions contextuelles croisées phase × humeur partenaire
- [x] Idées Date Night par phase
- [ ] Tags personnalisables
- [ ] Favoris / positions sauvegardées

### Statistiques avancées

- [x] Heatmap mensuelle (grille 7×N colorée par intensité, style GitHub)
- [x] Courbe d'évolution satisfaction 3 mois (SVG natif, bezier lissé)
- [x] Taux de plaisir partagé par phase du cycle (barres SVG)
- [x] Souvenir du jour (session passée aléatoire)
- [x] Débrief post-dispute (détection conflit récent → suggestions douces)
- [x] Équité du plaisir (satisfaction + orgasmes, ton neutre/bienveillant)
- [ ] Export statistiques (PDF mensuel étendu)

### Désirs & Communication

- [x] Kinks matrix — slider 0-5 privé + double-révélation (match = les deux intéressés)
- [x] Compteur "Nos désirs en commun : X / Y"
- [x] Wish-list avec workflow statut (proposé → validé → testé → à refaire)
- [x] Check-in automatique quand un souhait passe en "validé"
- [x] Alignement libido par phase du cycle
- [ ] Notes privées sur chaque kink

### Consentement & Sécurité

- [x] Limites (ok / soft / hard) — hard limits toujours visibles du partenaire
- [x] Safewords enregistrés et accessibles
- [x] Aftercare préférences (localStorage uniquement, non partagé)
- [x] Verrou PIN 4 chiffres (SHA-256, jamais stocké en clair)
- [x] Masquage rapide (bouton ⚡ ou switch d'app → auto-lock)
- [x] Aucune galerie photo cloud (§D respecté)
- [ ] Biométrie WebAuthn (limité en PWA iOS)

### Santé Sexuelle

- [x] Journal santé (contraception, test IST, vaccination, symptôme)
- [x] Privé par défaut, partageable manuellement
- [ ] Rappels contraception (notification douce)
- [ ] Alertes symptômes récurrents (non diagnostiques)

### Rituels & Temps

- [x] Premières fois (journal horodaté)
- [x] Souvenir du jour (remontée aléatoire)
- [x] Défis du mois avec case à cocher
- [x] Suggestions Date Night par phase
- [ ] Mode Surprise (l'un propose, l'autre découvre)

### Hors périmètre v1 (noté pour mémoire)

- Multi-couples / comptes multiples
- Monétisation / abonnement
- Intégration wearables (Oura, Fitbit…)
- Mode périménopause
- Bilingue FR/EN
- Partage granulaire catégorie par catégorie
