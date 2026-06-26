/**
 * symptoms.js — Suivi de symptômes inspiré Clue.
 * 12 catégories, 80+ tags, accordéon repliable, chips sélectionnables.
 * Stockage dans `daily_symptoms` (une ligne par utilisateur par jour).
 * Utilise localDateStr() de date-utils.js — jamais d'heure UTC directe.
 */
import { supabase } from './supabase.js';
import { localDateStr } from './date-utils.js';
import { cachedQuery, invalidateCache } from './query-cache.js';

// ─── Dictionnaire complet (inspiré Clue) ──────────────────────────────────

export const SYMPTOM_CATEGORIES = [
  {
    id: 'flux',
    label: 'Flux & Protections',
    icon: '🩸',
    color: '#E53935',
    scope: 'cycle',   // elle uniquement (tracks_cycle = true)
    tags: [
      { id: 's_protegeSlip',  label: 'Protège-slip' },
      { id: 's_serviette',    label: 'Serviette' },
      { id: 's_sousVetements',label: 'Sous-vêtements menstruels' },
      { id: 's_spotting',     label: 'Spotting' },
    ],
  },
  {
    id: 'humeur',
    label: 'Humeur & État',
    icon: '😊',
    color: '#7C5CFC',
    scope: 'both',
    tags: [
      { id: 's_bien',            label: 'Bien' },
      { id: 's_calme',           label: 'Calme' },
      { id: 's_confiant',        label: 'Confiant·e' },
      { id: 's_indifference',    label: 'Indifférence' },
      { id: 's_insecurite',      label: 'Insécurité' },
      { id: 's_triste',          label: 'Triste' },
      { id: 's_enColere',        label: 'En colère' },
      { id: 's_anxiete',         label: 'Anxiété' },
      { id: 's_irritabilite',    label: 'Irritabilité' },
      { id: 's_pasControle',     label: 'Pas en contrôle' },
      { id: 's_sensible',        label: 'Sensible' },
      { id: 's_sautesHumeur',    label: "Sautes d'humeur" },
    ],
  },
  {
    id: 'energie',
    label: 'Énergie & Sommeil',
    icon: '⚡',
    color: '#F59E0B',
    scope: 'both',
    tags: [
      { id: 's_enForme',         label: 'En forme' },
      { id: 's_okEnergie',       label: 'Énergie OK' },
      { id: 's_fatigue',         label: 'Fatigué·e' },
      { id: 's_epuise',          label: 'Épuisé·e' },
      { id: 's_malSendormir',    label: "Dur de s'endormir" },
      { id: 's_fatigueReveil',   label: 'Fatigue au réveil' },
      { id: 's_sommeilAgite',    label: 'Sommeil agité' },
      { id: 's_revesIntenses',   label: 'Rêves intenses' },
      { id: 's_sueurNocturne',   label: 'Sueurs nocturnes' },
      { id: 's_bouffeesChaleur', label: 'Bouffées de chaleur' },
    ],
  },
  {
    id: 'mental',
    label: 'Mental & Productivité',
    icon: '🧠',
    color: '#4278C4',
    scope: 'both',
    tags: [
      { id: 's_concentre',       label: 'Concentré·e' },
      { id: 's_creatif',         label: 'Créatif·ve' },
      { id: 's_motive',          label: 'Motivé·e' },
      { id: 's_productif',       label: 'Productif·ve' },
      { id: 's_distrait',        label: 'Distrait·e' },
      { id: 's_brouillardMental',label: 'Brouillard mental' },
      { id: 's_inefficace',      label: 'Inefficace' },
      { id: 's_pasMotivation',   label: 'Pas de motivation' },
      { id: 's_stresse',         label: 'Stressé·e' },
    ],
  },
  {
    id: 'social',
    label: 'Vie Sociale',
    icon: '🤝',
    color: '#10B981',
    scope: 'both',
    tags: [
      { id: 's_sociable',        label: 'Sociable' },
      { id: 's_solidaire',       label: 'Solidaire' },
      { id: 's_introverti',      label: 'Introversion' },
      { id: 's_contestataire',   label: 'Contestataire' },
    ],
  },
  {
    id: 'fringales',
    label: 'Fringales',
    icon: '🍫',
    color: '#B45309',
    scope: 'both',
    tags: [
      { id: 's_fringaleSucre',   label: 'Sucré' },
      { id: 's_fringaleSale',    label: 'Salé' },
    ],
  },
  {
    id: 'douleurs',
    label: 'Douleurs & Symptômes',
    icon: '💊',
    color: '#DC2626',
    scope: 'both',
    tags: [
      { id: 's_crampes',         label: 'Crampes' },
      { id: 's_malTete',         label: 'Mal de tête' },
      { id: 's_migraine',        label: 'Migraine' },
      { id: 's_migraineAura',    label: 'Migraine avec aura' },
      { id: 's_lombaires',       label: 'Douleurs lombaires' },
      { id: 's_jambes',          label: 'Douleurs jambes' },
      { id: 's_articulaires',    label: 'Douleurs articulaires' },
      { id: 's_seinsSensibles',  label: 'Seins sensibles' },
      { id: 's_seinsGonfles',    label: 'Seins gonflés' },
      { id: 's_uriner',          label: "Envie fréquente d'uriner" },
      { id: 's_demangeaisons',   label: 'Démangeaisons vulvaires' },
    ],
  },
  {
    id: 'corps',
    label: 'Corps & Peau',
    icon: '🌿',
    color: '#059669',
    scope: 'both',
    tags: [
      { id: 's_acne',            label: 'Acné' },
      { id: 's_peauSeche',       label: 'Peau sèche' },
      { id: 's_secretionsCrm',   label: 'Sécrétions crémeuses' },
      { id: 's_secretionsBE',    label: "Sécrétions blanc d'œuf" },
      { id: 's_cheveuxPasTop',   label: 'Cheveux pas top' },
      { id: 's_cuirCheveluSec',  label: 'Cuir chevelu sec' },
      { id: 's_racinesGrasses',  label: 'Racines grasses' },
    ],
  },
  {
    id: 'digestion',
    label: 'Digestion',
    icon: '🌀',
    color: '#6B7280',
    scope: 'both',
    tags: [
      { id: 's_transitOK',       label: 'Transit OK' },
      { id: 's_ballonnements',   label: 'Ballonnements' },
      { id: 's_flatulences',     label: 'Flatulences' },
      { id: 's_aigreurs',        label: "Aigreurs d'estomac" },
      { id: 's_constipation',    label: 'Constipation' },
      { id: 's_diarrhee',        label: 'Diarrhée' },
    ],
  },
  {
    id: 'sexualite',
    label: 'Sexualité',
    icon: '❤️',
    color: '#E84375',
    scope: 'both',
    tags: [
      { id: 's_forteLibido',     label: 'Forte libido' },
      { id: 's_fantasmes',       label: 'Fantasmes' },
      { id: 's_sexeProtection',  label: 'Sexe avec protection' },
      { id: 's_masturbation',    label: 'Masturbation' },
      { id: 's_sextoys',         label: 'Sextoys' },
    ],
  },
  {
    id: 'quotidien',
    label: 'Vie Quotidienne',
    icon: '🌅',
    color: '#0891B2',
    scope: 'both',
    tags: [
      { id: 's_marche',          label: 'Marche / Balade' },
      { id: 's_rencard',         label: 'Rencard' },
      { id: 's_vacances',        label: 'Vacances' },
      { id: 's_repos',           label: 'Jour de repos' },
      { id: 's_grosseSoiree',    label: 'Grosse soirée' },
      { id: 's_alcool',          label: 'Alcool' },
    ],
  },
  {
    id: 'sante',
    label: 'Santé Générale',
    icon: '🏥',
    color: '#9333EA',
    scope: 'both',
    tags: [
      { id: 's_fievre',          label: 'Fièvre' },
      { id: 's_rhume',           label: 'Rhume / Grippe' },
      { id: 's_antiRhume',       label: 'Anti-rhume/grippe pris' },
      { id: 's_magnesium',       label: 'Magnésium' },
      { id: 's_examenGeneral',   label: 'Examen général' },
    ],
  },
];

// ─── Chargement ────────────────────────────────────────────────────────────

export async function loadSymptoms(userId, dateStr) {
  const { data, error } = await cachedQuery(
    `symptoms-${userId}-${dateStr}`,
    () => supabase.from('daily_symptoms')
      .select('tags').eq('user_id', userId).eq('log_date', dateStr).maybeSingle(),
    30_000  // 30s (données du jour, moins critiques à cacher longtemps)
  );
  if (error) { console.error('loadSymptoms:', error.message); return []; }
  return data?.tags || [];
}

export async function saveSymptoms(userId, dateStr, tags) {
  const { error } = await supabase.from('daily_symptoms').upsert(
    { user_id: userId, log_date: dateStr, tags },
    { onConflict: 'user_id,log_date' }
  );
  if (error) console.error('saveSymptoms:', error.message);
  else invalidateCache(`symptoms-${userId}-${dateStr}`);
}

// ─── Rendu du tracker ──────────────────────────────────────────────────────

export async function renderSymptomTracker(container, state, logDate) {
  if (!container || !state.me) return;
  const date       = logDate || localDateStr();
  const userId     = state.me.user_id;
  const tracksCycle = state.me.tracks_cycle;
  const selected   = new Set(await loadSymptoms(userId, date));

  container.innerHTML = SYMPTOM_CATEGORIES
    .filter(cat => cat.scope === 'both' || (cat.scope === 'cycle' && tracksCycle))
    .map(cat => `
      <div class="sympt-category" data-cat="${cat.id}">
        <button type="button" class="sympt-cat-toggle" aria-expanded="false"
          aria-controls="sympt-tags-${cat.id}"
          style="--cat-color:${cat.color}">
          <span class="sympt-cat-icon" aria-hidden="true">${cat.icon}</span>
          <span class="sympt-cat-label">${cat.label}</span>
          <span class="sympt-cat-count" id="sympt-count-${cat.id}">
            ${cat.tags.filter(t => selected.has(t.id)).length || ''}
          </span>
          <svg class="sympt-chevron" viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <div class="sympt-tags-wrap" id="sympt-tags-${cat.id}" role="group"
          aria-label="${cat.label}">
          <div class="sympt-tags">
            ${cat.tags.map(tag => `
              <button type="button"
                class="sympt-tag${selected.has(tag.id) ? ' active' : ''}"
                data-tag="${tag.id}"
                style="--cat-color:${cat.color}"
                aria-pressed="${selected.has(tag.id)}"
                aria-label="${tag.label}">
                ${tag.label}
              </button>`).join('')}
          </div>
        </div>
      </div>`).join('');

  // Toggle accordéons
  container.querySelectorAll('.sympt-cat-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId  = btn.closest('.sympt-category').dataset.cat;
      const wrap   = document.getElementById(`sympt-tags-${catId}`);
      const isOpen = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen);
      btn.querySelector('.sympt-chevron')?.classList.toggle('rotated', isOpen);
    });
    // Ouvrir automatiquement les catégories qui ont des tags sélectionnés
    const catId = btn.closest('.sympt-category').dataset.cat;
    const cat   = SYMPTOM_CATEGORIES.find(c => c.id === catId);
    if (cat?.tags.some(t => selected.has(t.id))) {
      const wrap = document.getElementById(`sympt-tags-${catId}`);
      if (wrap) { wrap.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    }
  });

  // Sélection des tags
  let _saveTimer;
  container.querySelectorAll('.sympt-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      const tagId  = btn.dataset.tag;
      const active = btn.classList.toggle('active');
      btn.setAttribute('aria-pressed', active);
      if (active) selected.add(tagId); else selected.delete(tagId);

      // Mettre à jour le compteur de la catégorie
      const cat   = SYMPTOM_CATEGORIES.find(c => c.tags.some(t => t.id === tagId));
      const count = cat?.tags.filter(t => selected.has(t.id)).length || 0;
      const countEl = document.getElementById(`sympt-count-${cat?.id}`);
      if (countEl) countEl.textContent = count || '';

      // Debounce save (500ms)
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(() => saveSymptoms(userId, date, [...selected]), 500);
    });
  });
}
