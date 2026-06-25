# CLAUDE.md — App de suivi de cycle en couple

Fichier de contexte lu automatiquement par Claude Code. Garde-le court : le détail est dans les autres fichiers.

## Le projet en une phrase

PWA privée pour **un seul couple** : les deux partenaires suivent leurs propres données (cycle pour elle, bien-être pour lui), et l'app fait émerger les **corrélations** entre leurs deux rythmes. Suivi symétrique, pas « elle est suivie, il observe ».

## Où est quoi

- **`docs/PASSATION_app_couple.md`** — le cahier complet : scope, décisions tranchées, tokens visuels d'origine (§6), écrans, moteur de corrélation, ordre de construction (§11). **Référence produit principale.**
- **`docs/CHECKLIST_app_couple.md`** — inventaire exhaustif en cases à cocher. Tracker d'avancement.
- **`docs/MODULE_intimite_app_couple.md`** — extension « intimité » (à traiter après le noyau v1). Lire §D avant de coder.
- **`docs/schemas/schema_couple_tracker.sql`** — schéma Postgres + RLS + seed catégories, à exécuter en premier dans Supabase > SQL Editor.
- **`docs/schemas/schema_additions.sql`** — politiques RLS complémentaires + colonnes `reactions`/`created_by` sur `couple_events`. À exécuter **après** le schéma principal. Voir `docs/schemas/README.md` pour l'ordre complet.

## Stack

HTML + CSS custom + JavaScript vanilla · Supabase (Auth + Postgres + RLS) · déploiement Vercel · mode démo localStorage (actif tant que `config.js` n'est pas rempli).

## Identité visuelle (état actuel — décision validée)

Palette claire, redessinée lors du sprint UI :

- Fond : `#F6F5FF` (blanc lavande) · Surface : `#FFFFFF`
- **Elle = rose `#E84375`** · **Lui = bleu `#4278C4`**
- Règles = rouge `#E53935` · Ovulation = violet `#7C5CFC`
- Texte : `#1A1830` · Muet : `#6B6A94`
- Typo : **DM Sans** (tout) + **DM Mono** (dates, chiffres, données)

> La spec d'origine §6 décrivait un fond noir chaud + or/sauge — ce choix a été modifié à la demande.

## Contraintes à ne pas oublier

- Usage **perso, un seul couple**, **français uniquement**, **gratuit**, **PWA installable**.
- **Confidentialité** : données de santé reproductive + intimité = sensibles. RLS sur tout, consentement par appairage, disclaimer « pas un moyen de contraception ».
- **Fuseau horaire** : La Réunion = UTC+4. Toujours utiliser `localDateStr()` de `js/date-utils.js` — jamais `.toISOString().split('T')[0]` (retourne la date UTC, pas locale).
- **Mode démo** : quand `config.js` contient `YOUR_PROJECT`, `supabase.js` bascule sur `local-db.js` (localStorage). Le seed génère 30 jours de données réalistes.

## Architecture JS (16 modules)

```text
config.js        → clés Supabase (vides = mode démo)
supabase.js      → client Supabase ou local-db selon config
local-db.js      → client localStorage (mode démo, mime l'API Supabase)
date-utils.js    → helpers timezone locale (localDateStr, daysAgo, diffDays…)
auth.js          → magic link
pairing.js       → créer couple, rejoindre, délier
router.js        → SPA (navigate, registerView)
onboarding.js    → flow 4 étapes + getCycleMode/setCycleMode
cycles.js        → getCurrentCycle, startPeriod, endPeriod, predictNextPeriod
analytics.js     → Pearson, score synchronie, tendances, heatmap, streak
realtime.js      → Supabase Realtime (couple_events, log_entries)
notifications.js → permission, rappels, alertes
today.js         → écran Aujourd'hui (le plus lourd, ~750 l)
calendar.js      → vue mensuelle + prédiction + détail jour
nous.js          → corrélations, analytics, réglages, export
pdf.js           → export bilan mensuel (window.print)
app.js           → bootstrap, routing, vues auth/pairing/onboarding
```

## Règles de code à respecter

- `date-utils.js` est la source de vérité pour toutes les dates — ne pas utiliser `new Date().toISOString()` directement.
- `analytics.js` exporte `pearson`, `buildMap`, `align` — ne pas les redéfinir ailleurs.
- Tenir la checklist à jour à chaque étape terminée.
- Module intimité : traiter après que le noyau est stable en prod.
