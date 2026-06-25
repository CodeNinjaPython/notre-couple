# Cahier de passation — App de suivi de cycle en couple (v1)

> Document destiné à une session **Claude Code**. Deux fichiers l'accompagnent :
> `schema_couple_tracker.sql` (base de données) et `maquette.html` (cible visuelle de l'écran principal).

---

## 1. En une phrase
Une PWA privée, pour **un seul couple hétéro** (usage perso), où **les deux partenaires suivent leurs propres données** (cycle pour elle, bien-être pour lui) et où l'app fait **émerger les corrélations** entre leurs deux rythmes.

Ce qui la distingue des apps existantes (Clue Connect, Flo for Partners, VibeCheck…) : ce n'est pas « elle est suivie, il observe ». **Suivi symétrique** : lui aussi log ses données.

## 2. Contraintes
- Usage **personnel**, **un seul couple** → pas de multi-tenant lourd, pas de monétisation, pas d'onboarding marketing.
- **Français uniquement.**
- **Gratuit.**
- **PWA installable** (priorité mobile, doit tourner « comme une app » sur l'écran d'accueil iPhone/Android).
- Un seul des deux peut aussi l'utiliser en solo (le volet « lui » n'est pas obligatoire).

## 3. Stack
- Front : **HTML + Tailwind + JavaScript** (vanilla, pas de framework lourd sauf si tu juges utile).
- Back : **Supabase** (Auth + Postgres + RLS).
- Déploiement : **Vercel**.

## 4. Décisions déjà tranchées (ne pas re-discuter)
- **Catégories de suivi (set réduit) :**
  - Communes aux deux : `Humeur` (5 niveaux), `Énergie` (1–5), `Sommeil` (1–5), `Libido` (1–5), `Stress` (1–5), `Sport` (oui/non).
  - Spécifiques à elle (cycle) : `Flux` (léger / moyen / abondant), `Crampes` (1–5).
- **Modes du cycle :** règles, conception, grossesse. (Pas de périménopause.)
- **Prédiction :** on **log d'abord**. Prédiction simple ensuite — moyenne glissante de la durée des derniers cycles pour estimer les prochaines règles ; ovulation estimée ≈ 14 j avant les règles suivantes. **N'afficher la prédiction qu'à partir de 2 cycles enregistrés.** Pas d'algo complexe ni de ML.
- **Partage :** tout est partagé directement entre les deux (pas de réglage granulaire par catégorie). Le champ `shared` existe dans le schéma mais peut rester à `true` par défaut en v1.
- **À la séparation :** prévoir un **export** des données (JSON ou CSV).
- **Conseils côté lui :** oui, afficher un conseil léger selon la phase d'elle (non moralisateur, voir §9).

## 5. Modèle de données
→ Voir **`schema_couple_tracker.sql`**, à coller dans Supabase > SQL Editor.

Tables : `couples`, `couple_members`, `pairing_codes`, `cycles`, `tracking_categories`, `log_entries`, `couple_events`.
La **Row Level Security** est déjà écrite : chacun possède ses données, l'autre ne lit que ce qui est partagé via la fonction `same_couple()`. Les catégories de départ sont déjà insérées.

## 6. Identité visuelle (tokens)
Univers cinématographique de Jérémie, réchauffé pour un sujet intime. **Elle = or, Lui = sauge** (pour lire les deux rythmes sans cliché rose/bleu).

```
--bg:#0E0A07   --surface:#16100A   --surface2:#1E160D   --line:#2C2015
--text:#EDE3D3 --muted:#9A8B76     --faint:#6A5C49
--gold:#D9B36A (elle)   --sage:#93A98F (lui)   --rose:#C98A6A (accent règles)
```
- **Typo :** `Cormorant Garamond` (display/titres de phase), `DM Sans` (corps), `DM Mono` (dates, chiffres, données).
- **Signature element :** le **double rythme** — deux courbes lissées superposées sur le cycle (or = elle, sauge = lui), bandes de phase en fond, marqueur « aujourd'hui ». C'est l'élément à soigner ; tout le reste reste sobre.
- Coins arrondis ~18px, fond sombre chaud, halo doré discret en haut. Respecter `prefers-reduced-motion` et focus visible.

La **maquette.html** est la cible exacte de l'écran « Aujourd'hui » (données fictives à remplacer par les vraies).

## 7. Écrans (v1)
1. **Auth + appairage** — connexion (magic link), puis création du couple / saisie du code (§8).
2. **Aujourd'hui** — = la maquette : header de phase, double rythme, saisie du jour pour la personne connectée, carte « insight », conseil (si lui), moments partagés.
3. **Calendrier** — vue du cycle, historique des saisies, prédiction des prochaines règles + fenêtre fertile.
4. **Nous** — corrélations détaillées (§9), réglages, export, délier les comptes.

## 8. Auth & appairage (simplifié pour 2 personnes)
- **Supabase Auth en magic link** (pas de mot de passe).
- Premier utilisateur : crée une ligne `couples`, s'ajoute dans `couple_members` (avec `tracks_cycle = true/false`), génère un `pairing_codes` (code court 6 caractères, expiration ~24 h).
- Second utilisateur : se connecte, saisit le code → rejoint le même `couple_id`.
- Une fois les deux liés, le code est marqué `used = true`.

## 9. Moteur de corrélation (simple, pas de ML)
But : transformer les données brutes en 4–5 insights lisibles. Calculs basiques (moyennes par phase, corrélation de Pearson), côté client ou via une vue SQL. **Nécessite ≥ 2–3 cycles de données** ; avant ça, afficher un état « on accumule encore, reviens dans quelques semaines ».

Insights à produire :
1. **Énergie de lui selon la phase d'elle** — moyenne de son énergie par phase (menstruelle / folliculaire / ovulation / lutéale).
2. **Alignement des libidos** — corrélation entre les deux séries `libido`.
3. **Conflits par phase** — répartition des `couple_events` de type `conflict` sur les phases du cycle.
4. **Corrélation des sommeils** — leurs deux séries `sommeil` évoluent-elles ensemble ?
5. **Humeur en miroir** — son humeur à lui suit-elle celle d'elle (éventuel décalage d'un jour) ?

**Conseils par phase (côté lui)** — ton doux, factuel, jamais prescriptif. Exemple lutéale : « Énergie souvent en baisse et sensibilité en hausse ces jours-ci — une soirée tranquille tombe souvent juste. » Un message court par phase suffit.

## 10. Confidentialité
- Données de **santé reproductive = sensibles**. RGPD. Pas de partage tiers, pas d'analytics intrusif.
- Modèle fondé sur le **consentement** : c'est elle qui partage via l'appairage, jamais un accès imposé.
- **Disclaimer obligatoire** quelque part dans l'app : *ce n'est pas un moyen de contraception ; les prédictions sont indicatives.*
- Export + suppression possibles (droit à l'effacement).

## 11. Ordre de construction conseillé
1. Scaffold projet + Supabase + exécuter `schema_couple_tracker.sql`.
2. Auth magic link + appairage (§8).
3. Écran **Aujourd'hui** : saisie réelle dans `log_entries` + `cycles`.
4. Brancher le **double rythme** sur les vraies données.
5. **Prédiction** simple (moyenne glissante).
6. **Moteur de corrélation** (§9) + carte insight.
7. **Moments partagés** (`couple_events`, création + validation par les deux).
8. **PWA** : `manifest.json`, service worker (cache du shell), icônes, `theme-color`.
9. **Rappels / notifications** — ⚠️ point le plus délicat : le web push sur PWA iOS exige l'app **installée** (iOS 16.4+) et un service worker ; planifier des notifs locales est limité. Option robuste : un **cron Vercel** quotidien + Web Push. À traiter en dernier, après que le reste tourne.
10. **Export** (JSON/CSV) + délier les comptes.

## 12. Déjà fourni
- `schema_couple_tracker.sql` — schéma + RLS + catégories de départ, prêt à exécuter.
- `maquette.html` — cible visuelle de l'écran « Aujourd'hui » (mock data à remplacer).
- Ce cahier.

## 13. Première instruction à donner à Claude Code
> « Lis `PASSATION_app_couple.md`, `schema_couple_tracker.sql` et `maquette.html`. Scaffold un projet PWA (HTML/Tailwind/JS + Supabase) selon le §11, en commençant par les étapes 1 et 2 : structure du projet, connexion Supabase, auth magic link et flux d'appairage. Respecte les tokens visuels du §6 et la maquette. Montre-moi l'arborescence avant de coder en détail. »
