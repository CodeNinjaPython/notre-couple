# Schémas Supabase

Exécuter dans cet ordre dans **Supabase > SQL Editor > New query** :

## 1. `schema_couple_tracker.sql`

Crée toutes les tables, active RLS, insère les catégories de départ :

- `couples` · `couple_members` · `pairing_codes`
- `cycles` · `tracking_categories` · `log_entries` · `couple_events`
- Fonction utilitaire `same_couple(a, b)`
- Politiques RLS de base

## 2. `schema_additions.sql`

À exécuter **après** le schéma principal. Ajoute :

- Politique INSERT manquante sur `couple_members` (nécessaire pour l'appairage)
- RLS sur `couples` et `pairing_codes` (non couverts dans le schéma principal)
- Politique UPDATE sur `couple_members` (modification du profil depuis Nous)
- Politique DELETE sur `couple_members` (délier le compte)
- Colonnes `reactions JSONB` et `created_by UUID` sur `couple_events`
- Politique UPDATE sur `couple_events` (réactions)

## Note sur `tracking_categories`

La table est seedée par `schema_couple_tracker.sql` avec les 8 catégories (flow, cramps, mood, energy, sleep, stress, libido, exercise). Le code client v1 ne la requête pas — les catégories sont hardcodées dans `js/today.js` (objet `METRICS`) pour des raisons de performance et de simplicité. Cette table est réservée pour une future interface d'administration (v2).
