# Notre rythme

PWA privée de suivi de cycle en couple. Suivi symétrique : les deux partenaires saisissent leurs données, l'app fait émerger les corrélations entre leurs deux rythmes.

## Démarrage rapide (mode démo)

Sans aucune configuration, l'app tourne en **mode démo localStorage** avec 30 jours de données réalistes :

```bash
# Les modules ES ne fonctionnent pas en file:// — utiliser un serveur HTTP
python3 -m http.server 3456
# → http://localhost:3456
```

Taper n'importe quoi dans le champ e-mail → connexion immédiate → toute la mécanique est accessible.

## Mise en production (Supabase + Vercel)

### 1. Base de données

1. Créer un projet sur [supabase.com](https://supabase.com)
2. SQL Editor → coller `docs/schemas/schema_couple_tracker.sql` → exécuter
3. SQL Editor → coller `docs/schemas/schema_additions.sql` → exécuter (dans cet ordre)
4. Authentication → URL Configuration → ajouter votre domaine Vercel

### 2. Clés API

Éditer `js/config.js` :

```js
export const SUPABASE_URL      = 'https://VOTRE_PROJET.supabase.co';
export const SUPABASE_ANON_KEY = 'VOTRE_CLE_ANON';
```

La clé anon est publique par design — la sécurité repose sur les Row Level Security policies.

### 3. Déploiement Vercel

1. Importer le repo sur [vercel.com](https://vercel.com)
2. Framework Preset : `Other` · Build Command : vide · Output Directory : `.`
3. Déployer — le `vercel.json` gère le rewrite SPA et les headers du service worker

### 4. Icônes PWA

Ouvrir `icons/generate.html` dans un navigateur → télécharger `icon-192.png` et `icon-512.png` → les déposer dans `icons/`.

## Structure du projet

```text
docs/
  PASSATION_app_couple.md      → spec produit complète
  CHECKLIST_app_couple.md      → tracker d'avancement
  MODULE_intimite_app_couple.md → spec extension intimité (v2)
  schemas/
    schema_couple_tracker.sql  → schéma principal (exécuter en 1er)
    schema_additions.sql       → correctifs RLS (exécuter en 2e)

css/app.css     → design system (965 l)
js/             → 17 modules ES vanilla (~3 200 l)
icons/          → icônes PWA + générateur canvas
index.html      → SPA shell + 6 templates <template>
sw.js           → service worker (cache-first)
vercel.json     → rewrite SPA + headers
CLAUDE.md       → doc technique pour Claude Code
```

## Architecture du module Intimité

Le module Intime est découpé en sous-modules pour garantir la maintenabilité :

```text
js/intimacy.js           → Orchestrateur (~200 l) — init, routing, appels parallèles
js/intimacy-sessions.js  → Formulaires (complet + fast-track), try/catch systématique
js/intimacy-stats.js     → Heatmap mensuelle, courbe satisfaction, orgasme/phase (SVG natif)
js/intimacy-library.js   → 40 positions offline, SVG line-art, filtres, suggestions
js/kinks.js              → Double-révélation, wish-list, limites, check-in
js/pin-lock.js           → PIN SHA-256 (Web Crypto), masquage rapide (visibilitychange)
js/intimacy-tests.js     → Tests unitaires fenêtre de désir + kink match rate
```

**Ordre d'exécution SQL :**

```text
1. schema_couple_tracker.sql       → tables + RLS de base
2. schema_additions.sql            → correctifs RLS
3. schema_intimite.sql             → module intimité (sessions, kinks, limites…)
4. schema_intimite_additions.sql   → first_times, session_activities, colonnes additionnelles
```

### Confidentialité du module Intime

- Aucune photo ni vidéo stockée dans le cloud (voir §D du module)
- PIN haché SHA-256 côté client — jamais envoyé au serveur
- Aftercare préférences en `localStorage` uniquement
- Hard limits toujours visibles du partenaire (sécurité intentionnelle)
- `shared = false` par défaut sur les feedbacks et kink_ratings

**Tests :** `http://localhost:3456/?run-tests` pour lancer les tests en console.

## Stack

HTML · CSS custom · JavaScript vanilla · Supabase (Auth + Postgres + RLS) · Vercel · PWA
