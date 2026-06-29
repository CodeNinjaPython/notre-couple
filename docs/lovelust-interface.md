# Référence : interface LoveLust (vocabulaire d'import / session)

Source condensée des options de l'app LoveLust, pour le mapping import + le formulaire
« Noter un moment ». Évite de relire le PDF. Tout le vocabulaire textuel est conservé.

## 1. Métadonnées de l'activité
- Champs de base : Date, Heure, Durée (min.)
- Initiateur : optionnel (Inconnu / liste : moi, partenaire, nous deux)
- Notes : texte libre (optionnel)
- Option annexe : « J'ai regardé du porno » (case à cocher)

## 2. Positions & pratiques
- **Positions :** 69, Cowgirl, Cuillère, Debout, Face-sitting, Levrette, Missionnaire.
- **Pratiques** (valable pour « Exécutées » et « Reçues ») : Anal, BDSM, Creampie,
  Cunnilingus, Doigtage, Fellation, Jouet, Masturbation, Masturbation manuelle, Oral, Vaginal.

## 3. Emplacement / lieux
- Catégories : Autre, Canapé, Chambre à coucher, Douche, Lit, Salle de bain, Voiture.
- Module carte : géolocalisation GPS (type Apple Plans) — non implémenté dans l'app.

## 4. Évaluation & sentiments
- Orgasmes : compteur (les miens / ceux du partenaire).
- Sentiments : Affectueux·se, Anxieux·se, Aventureux, Coupable, Déconnecté·e, Excité·e,
  Frustré, Heureux·se, Irritable, Plein·e de regret, Satisfait·e, Surpris, Triste, Utilisé·e.

## 5. Partenaires & protections
- Partenaire : identification nominale (ex. Jeannette).
- **Protections** (valable pour « Soi-même » ET « Partenaire », même liste) :
  Anneau vaginal, Dispositif intra-utérin (DIU), Doxycycline post-exposition (DoxyPEP),
  Hystérectomie, Implant contraceptif, Ligature des trompes, Ménopause, Pilule,
  Préservatif, Préservatif interne, Prophylaxie pré-exposition (PrEP), Retrait,
  Sans pénétration, Traitement comme prévention (TasP), Vasectomie.

## 6. Détails de l'éjaculation (localisation)
- Inconnu / Pas d'éjaculation / Refusé / Autre
- Dans le vagin / Dans l'anus / Dans la bouche
- Sur le dos / Sur la poitrine / Sur le visage / Sur les fesses / Sur le ventre /
  Sur les mains / Sur les pieds

## Notes d'implémentation (app notre-couple)
- Import : `js/lovelust-import.js` (objet `{ activity }`) → journal + intimate_sessions.
- Formulaire « Noter un moment » : wizard 4 étapes (`index.html` #session-sheet).
- Champs détaillés stockés en JSONB `intimate_sessions.details`
  (practices_performed, practices_received, feelings, protection_me, protection_partner,
  ejaculation, watched_porn).
- Marqueur solo : tag `solo` dans `session_activities.tags` (distingue solo elle/lui).
