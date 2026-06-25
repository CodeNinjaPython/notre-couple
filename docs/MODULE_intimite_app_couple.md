# Module « Intimité » — extension de l'app de couple

> Extension du projet existant (voir `PASSATION_app_couple.md`, `CHECKLIST_app_couple.md`, `schema_couple_tracker.sql`).
> Contexte : usage **perso, un seul couple, deux adultes consentants**, FR, gratuit.

---

## A. Ta spec, organisée (à garder)

### 1. Journal des rapports

- Début / fin (durée auto), préliminaires (durée + intensité 1–10)
- Type d'activité (multi-sélection)
- Positions (liste + tags personnalisables)
- Lieu, ambiance
- Note de satisfaction **par partenaire** (1–10 + smiley)
- Orgasme(s) : oui/non/nombre, par partenaire
- Champs libres : « le plus aimé » / « à améliorer »

### 2. Préférences & communication

- **Check-list kinks** : curseur de désir 0–5 par pratique, commentaire privé ou partagé
- **Wish-list / fantasmes** : ajout par chacun, statut *proposé → validé → testé → à refaire*
- **Feedback post-séance** rapide (4 questions, ~30 s) + historique
- **Libido du jour** + facteurs (stress, règles, sport, alcool…)

### 3. Idées & inspiration

- Bibliothèque positions & scénarios (filtres : niveau, durée, focus, posture)
- Défis du mois + barre de progression
- Suggestions selon humeur/libido **et selon la phase du cycle**
- Ambiance : playlist liée (Spotify/Deezer) ou sons intégrés

### 4. Santé & bien-être sexuel

- Contraception / protection : rappels (pilule, préservatif, stérilet, anneau)
- Historique tests IST + vaccinations
- Santé intime : douleurs, sécheresse, lubrification, érection, saignements anormaux
- Alertes douces, **non diagnostiques** (« si ça persiste, consulte »)
- Bien-être global : sommeil, hydratation, sport (impact libido)

### 5. Fun & intime

- Espace souvenirs privés (galerie — voir §D, point critique)
- Mode Date Night (resto + thème de soirée)
- Sexting / teasing : messages programmés ou aléatoires
- Quiz compatibilité mensuel
- Mode « Surprise » (l'un propose, l'autre découvre le jour J)

---

## B. Mes ajouts (en plus de ta liste)

### Couche consentement & limites — *la plus importante*

- [ ] **Registre des limites** par pratique : *ok / soft limit / hard limit*. Les hard limits sont **visibles du partenaire** (c'est le but : sécurité, pas surprise).
- [ ] **Safeword(s)** enregistrés et accessibles en un tap.
- [ ] **Aftercare** : préférences et notes d'après-séance (utile dès qu'il y a du BDSM).
- [ ] **Check-in** avant d'essayer une pratique nouvellement validée (rappel « on est ok tous les deux ? »).

### Révélation à double clé (anti-gêne)

- [ ] Un kink/fantasme n'apparaît comme **« match commun »** que si **les deux** l'ont coché. Sinon il reste privé. Personne ne se découvre en avançant seul — ça supprime la pression. (Modèle éprouvé : Kindu, Pure.)
- [ ] Compteur « Nos kinks en commun : X / Y » qui ne révèle que les matchs.

### Croisement avec le cycle — *ton vrai différenciateur*

- [ ] Satisfaction / libido / taux d'orgasme **selon la phase** du cycle.
- [ ] « Quelles pratiques notées le mieux à quelle phase ».
- [ ] **Fenêtre de désir** : repérer les jours où vos deux libidos sont hautes en même temps.
- [ ] Alignement désir ↔ phase (sur le double rythme déjà existant).

### Insights relationnels

- [ ] **Équilibre d'initiation** : qui propose le plus, tendance dans le temps.
- [ ] **Équité du plaisir** : taux d'orgasme par partenaire — pour repérer un déséquilibre, avec bienveillance, pas comme un score.
- [ ] Lien intimité ↔ `couple_events` (déjà en base) : intimité après réconciliation, après une soirée, etc.
- [ ] Délai depuis le dernier moment + tendance (sans culpabiliser, voir §D).

### Rituels & temps

- [ ] **Premières fois** : journal des « premières » (une pratique, un lieu…).
- [ ] **Souvenir du jour** : remontée aléatoire d'un ancien moment.
- [ ] **Débrief post-dispute** : après un `conflict`, suggestion douce de reconnexion.

---

## C. Modèle de données (nouvelles tables Supabase)

À ajouter au schéma existant, même logique RLS (`same_couple()`), `shared` par défaut selon le cas :

- `intimate_sessions` — couple_id, début, fin, durée, lieu, ambiance, préliminaires_min, intensité, created_by
- `session_activities` — session_id, type, positions[], tags[]
- `session_feedback` — session_id, **user_id**, note, orgasmes (nb), aimé_txt, à_améliorer_txt
- `kinks` — id, label, catégorie (table de référence, seedée)
- `kink_ratings` — user_id, kink_id, désir 0–5, commentaire, `shared` *(défaut false)*
- `fantasies` — created_by, couple_id, texte, media_ref?, statut, `shared`
- `consent_limits` — user_id, pratique, niveau (ok/soft/hard), note · **lecture partenaire = vrai**
- `safewords` — couple_id, mot, signification
- `sexual_health` — user_id, date, type (contraception/test/symptôme), valeur, note · **privé par défaut**
- `challenges` + `challenge_progress` — défis et avancement
- `intimate_media` — **métadonnées seulement** (voir §D) : couple_id, ref chiffrée, date, légende
- `first_times` — couple_id, description, date, note, created_by
- Badges / streaks : **dérivés** (calculés), pas une table de vérité

---

## D. Points de vigilance (à lire avant de coder)

**1. Médias intimes = le risque n°1.** Une galerie de photos/vidéos intimes est la feature la plus dangereuse de toute l'app.

- Par défaut, garde-les **en local sur l'appareil**, pas dans le cloud.
- Si tu veux la synchro cloud quand même : **chiffrement côté client AVANT l'upload** — Supabase ne doit jamais voir le clair. Clé dérivée d'une passphrase connue de vous deux seulement, **jamais stockée sur le serveur** (sinon ce n'est pas du vrai chiffrement de bout en bout).
- Si tu ne peux pas garantir ça proprement : ne fais pas la feature. Ça ne vaut pas le risque d'une fuite.

**2. « Chiffrement de bout en bout » : sois honnête.** Supabase Storage n'est pas E2E nativement. N'affiche pas une promesse de sécurité que l'implémentation ne tient pas — pour vous deux ça crée une fausse confiance.

**3. Verrou biométrique : limité en PWA.** Une PWA iOS ne peut pas vraiment verrouiller par Face ID comme une app native. Tu peux faire un **code PIN applicatif** + « tout masquer » rapide, mais ne survends pas la sécurité.

**4. Gamification : attention aux streaks.** Mettre un compteur « X jours de suite » sur la fréquence sexuelle peut transformer l'intimité en **quota / obligation** — c'est contre-productif pour un couple. Garde ça optionnel, et centre les stats sur la **satisfaction et le consentement**, pas la performance. C'est un meilleur design relationnel.

**5. Le délai « X jours sans moment ».** Même idée : utile en info, toxique en reproche. Ton optionnel et neutre, jamais culpabilisant.

**6. Santé : pas de diagnostic.** Les alertes type « consulte si douleur persiste » sont bien, mais l'app oriente vers un pro, elle ne conclut pas.

---

## E. Libellés FR (les tiens + quelques-uns)

- « On a partagé un moment aujourd'hui ? »
- « Note ta séance 🔥 »
- « Ajoute une idée à votre wish-list »
- « Nos kinks en commun : 12 / 45 »
- « Vos libidos sont alignées aujourd'hui »
- « Limite posée — visible par {prénom} » *(pour les hard limits)*
- « Match ! Vous avez coché la même envie »

---

## F. Ce que je ne fournis pas

Les **illustrations de positions** : je ne les génère pas. Pour rester dans ton esthétique, pars sur des **silhouettes stylisées** (line-art monochrome or/sauge) que tu crées ou sources toi-même — ça collera mieux à l'identité que des photos floutées.
