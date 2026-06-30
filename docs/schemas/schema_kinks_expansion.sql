-- ════════════════════════════════════════════════════════════════════════════
-- schema_kinks_expansion.sql — Extension du catalogue Kinks (exploration / désir)
--
-- À exécuter dans Supabase > SQL Editor APRÈS schema_intimite.sql (table `kinks`).
-- 100 % additif et idempotent : `on conflict (id) do nothing` → rejouable sans risque,
-- ne touche pas aux 44 entrées d'origine ni aux évaluations (kink_ratings).
--
-- Nouvelles catégories (à refléter dans js/kinks.js → CATEGORIES) :
--   oral · digital · bdsm · corps · fluides · jouets · scenarios · rythme · media · aftercare
-- + complète les catégories existantes `lieux` et `communication`.
-- ════════════════════════════════════════════════════════════════════════════

insert into kinks (id, label, category) values
  -- ─── Oral & bucco-génital ─────────────────────────────────────────────────
  ('oral_fellation',        'Fellation',                          'oral'),
  ('oral_cunnilingus',      'Cunnilingus',                        'oral'),
  ('oral_deepthroat',       'Gorge profonde (deepthroat)',        'oral'),
  ('oral_facesitting',      'Face-sitting',                       'oral'),
  ('oral_balls',            'Succion des testicules',             'oral'),
  ('oral_anilingus_give',   'Anilingus donné (rimjob)',           'oral'),
  ('oral_anilingus_recv',   'Anilingus reçu',                     'oral'),
  ('oral_necking',          'Baisers intenses dans le cou',       'oral'),
  ('oral_swallow',          'Avaler (swallow)',                   'oral'),
  ('oral_spit',             'Recracher (spit)',                   'oral'),
  ('oral_snowball',         'Snowballing',                        'oral'),

  -- ─── Manuel & digital ─────────────────────────────────────────────────────
  ('dig_handjob_two',       'Branlette à deux mains',             'digital'),
  ('dig_handjob_lube',      'Masturbation avec lubrifiant',       'digital'),
  ('dig_balls',             'Caresses testiculaires',             'digital'),
  ('dig_perineum',          'Stimulation du périnée',             'digital'),
  ('dig_finger_vaginal',    'Doigtage vaginal',                   'digital'),
  ('dig_finger_anal',       'Doigtage anal',                      'digital'),
  ('dig_double_finger',     'Double pénétration digitale',        'digital'),
  ('dig_prostate',          'Massage de la prostate',             'digital'),
  ('dig_fisting_vaginal',   'Fisting vaginal',                    'digital'),
  ('dig_fisting_anal',      'Fisting anal',                       'digital'),

  -- ─── BDSM & intensité ─────────────────────────────────────────────────────
  ('bdsm_spanking_hand',    'Fessée à main nue',                  'bdsm'),
  ('bdsm_paddle',           'Martinet',                           'bdsm'),
  ('bdsm_whip',             'Fouet',                              'bdsm'),
  ('bdsm_cane',             'Caning',                             'bdsm'),
  ('bdsm_griffures',        'Griffures',                          'bdsm'),
  ('bdsm_morsures',         'Morsures',                           'bdsm'),
  ('bdsm_pinch',            'Pincements',                         'bdsm'),
  ('bdsm_nipple_clamps',    'Pinces à seins',                     'bdsm'),
  ('bdsm_wax',              'Waxplay (bougie chaude)',            'bdsm'),
  ('bdsm_ice',              'Iceplay (glaçons)',                  'bdsm'),
  ('bdsm_face_slap',        'Claques au visage (légères)',        'bdsm'),
  ('bdsm_breathplay',       'Breathplay / étranglement léger',    'bdsm'),
  ('bdsm_shibari',          'Cordes (Shibari)',                   'bdsm'),
  ('bdsm_cuffs',            'Menottes',                           'bdsm'),
  ('bdsm_attaches',         'Attaches',                           'bdsm'),
  ('bdsm_gag',              'Bâillon (gag)',                      'bdsm'),
  ('bdsm_chastity',         'Cage de chasteté',                   'bdsm'),
  ('bdsm_orgasm_denial',    'Privation d''orgasme',               'bdsm'),
  ('bdsm_dirtytalk',        'Parler cru (dirty talk)',            'bdsm'),
  ('bdsm_dom_verbal',       'Domination verbale',                 'bdsm'),
  ('bdsm_sub_verbal',       'Soumission verbale',                 'bdsm'),
  ('bdsm_praise',           'Louanges (praise kink)',             'bdsm'),
  ('bdsm_dom_sub',          'Jeu Dominant·e / Soumis·e',          'bdsm'),
  ('bdsm_switch',           'Switch (alternance des rôles)',      'bdsm'),
  ('bdsm_subspace',         'Sub-space (flottement)',             'bdsm'),
  ('bdsm_domspace',         'Dom-space (hyper-focus)',            'bdsm'),

  -- ─── Corps & fétiches ─────────────────────────────────────────────────────
  ('body_foot_lick',        'Léchage de pieds',                   'corps'),
  ('body_toe_suck',         'Succion des orteils',                'corps'),
  ('body_footjob',          'Footjob',                            'corps'),
  ('body_foot_massage',     'Massage érotique des pieds',         'corps'),
  ('body_trampling',        'Domination par les pieds (léger)',   'corps'),
  ('body_nipples',          'Stimulation tétons / poitrine',      'corps'),
  ('body_neck',             'Cou / nuque',                        'corps'),
  ('body_ears',             'Lobes d''oreilles',                  'corps'),
  ('body_navel',            'Nombril',                            'corps'),
  ('body_armpit',           'Léchage des aisselles',              'corps'),
  ('body_inner_thigh',      'Intérieur des cuisses',              'corps'),
  ('body_back_knee',        'Arrière des genoux',                 'corps'),
  ('body_tickling',         'Chatouilles érotiques (tickling)',   'corps'),
  ('body_lingerie',         'Lingerie',                           'corps'),
  ('body_leather',          'Cuir',                               'corps'),
  ('body_latex',            'Latex',                              'corps'),

  -- ─── Fluides & éjaculation ────────────────────────────────────────────────
  ('fluid_internal',        'Éjaculation interne',                'fluides'),
  ('fluid_external',        'Éjaculation externe',                'fluides'),
  ('fluid_facial',          'Faciale',                            'fluides'),
  ('fluid_body',            'Sur le corps',                       'fluides'),
  ('fluid_squirt',          'Éjaculation féminine (squirt)',      'fluides'),
  ('fluid_creampie_v',      'Creampie vaginal',                   'fluides'),
  ('fluid_creampie_a',      'Creampie anal',                      'fluides'),
  ('fluid_cumswap',         'Cum-swapping',                       'fluides'),
  ('fluid_spitting',        'Crachat érotique (spitting)',        'fluides'),

  -- ─── Jouets & tech ────────────────────────────────────────────────────────
  ('toy_dildo',             'Godemichet (dildo)',                 'jouets'),
  ('toy_vibrator',          'Vibromasseur',                       'jouets'),
  ('toy_plug',              'Plug anal',                          'jouets'),
  ('toy_clit_stim',         'Stimulateur clitoris (air pulsé)',   'jouets'),
  ('toy_sleeve',            'Masturbateur (sleeve)',              'jouets'),
  ('toy_cockring',          'Anneau pénien (cockring)',           'jouets'),
  ('toy_vibrating_plug',    'Plug vibrant',                       'jouets'),
  ('toy_geisha',            'Boules de geisha',                   'jouets'),
  ('toy_strapon',           'Strapon (harnais)',                  'jouets'),
  ('toy_connected',         'Jouets connectés (teledildonics)',   'jouets'),
  ('toy_remote',            'Contrôle à distance via app',        'jouets'),
  ('toy_vr',                'Réalité virtuelle (VR)',             'jouets'),

  -- ─── Scénarios & jeux de rôle ─────────────────────────────────────────────
  ('scene_roleplay_deep',   'Jeu de rôles poussé',                'scenarios'),
  ('scene_voyeur',          'Voyeurisme',                         'scenarios'),
  ('scene_exhib_public',    'Exhibitionnisme (public)',           'scenarios'),
  ('scene_hunter',          'Chasseur / proie',                   'scenarios'),
  ('scene_strangers',       'Inconnu·es',                         'scenarios'),
  ('scene_public_risk',     'Prise de risque en public',          'scenarios'),
  ('scene_makeup',          'Réconciliation (make-up sex)',       'scenarios'),
  ('scene_substance',       'Sous influence (alcool/CBD/poppers)','scenarios'),
  ('scene_sober',           'Totalement sobre (clean)',           'scenarios'),

  -- ─── Rythme & style ───────────────────────────────────────────────────────
  ('rythm_rough',           'Brutal (rough sex)',                 'rythme'),
  ('rythm_slow',            'Douceur infinie (slow sex)',         'rythme'),
  ('rythm_passionate',      'Passionné',                          'rythme'),
  ('rythm_bestial',         'Bestial',                            'rythme'),
  ('rythm_sensual',         'Sensuel',                            'rythme'),
  ('rythm_quickie',         'Rapide (quickie)',                   'rythme'),
  ('rythm_morning',         'Au réveil (morning sex)',            'rythme'),
  ('rythm_nap',             'Sieste',                             'rythme'),
  ('rythm_night',           'En pleine nuit',                     'rythme'),

  -- ─── Médias & partage numérique ───────────────────────────────────────────
  ('media_porn_solo',       'Porno (solo)',                       'media'),
  ('media_porn_couple',     'Porno (à deux)',                     'media'),
  ('media_erotica',         'Littérature érotique',               'media'),
  ('media_audio',           'Audio érotique',                     'media'),
  ('media_hentai',          'Hentai / doujin',                    'media'),
  ('media_nudes',           'Photos intimes (nudes)',             'media'),
  ('media_amateur_video',   'Vidéos amateurs',                    'media'),
  ('media_audio_rec',       'Enregistrement audio (gémissements)','media'),

  -- ─── Aftercare ────────────────────────────────────────────────────────────
  ('care_cuddle',           'Câlins prolongés / skin-to-skin',    'aftercare'),
  ('care_shower',           'Douche de propreté ensemble',        'aftercare'),
  ('care_snack',            'Hydratation / snack partagé',        'aftercare'),
  ('care_sleep',            'Endormissement direct',              'aftercare'),
  ('care_massage',          'Massage de récupération',            'aftercare'),

  -- ─── Lieux insolites (complète la catégorie existante) ────────────────────
  ('loc_stairs',            'Escalier',                           'lieux'),
  ('loc_kitchen',           'Cuisine',                            'lieux'),
  ('loc_floor',             'Sol / tapis',                        'lieux'),
  ('loc_balcony',           'Balcon',                             'lieux'),
  ('loc_shower',            'Douche',                             'lieux'),
  ('loc_bath',              'Baignoire',                          'lieux'),
  ('loc_jacuzzi',           'Jacuzzi',                            'lieux'),
  ('loc_beach',             'Plage',                              'lieux'),
  ('loc_sea',               'Mer',                                'lieux'),
  ('loc_pool',              'Piscine',                            'lieux'),
  ('loc_forest',            'Forêt / nature',                     'lieux'),
  ('loc_public_wc',         'Toilettes publiques',                'lieux'),
  ('loc_elevator',          'Ascenseur',                          'lieux'),
  ('loc_fitting_room',      'Cabine d''essayage',                 'lieux'),
  ('loc_office',            'Lieu de travail / bureau',           'lieux'),

  -- ─── Préludes / communication (complète la catégorie existante) ───────────
  ('comm_sexting',          'Sexting préalable',                  'communication'),
  ('comm_striptease',       'Strip-tease',                        'communication')
on conflict (id) do nothing;
