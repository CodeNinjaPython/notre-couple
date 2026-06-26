/**
 * quick-log-bar.js — Barre de saisie rapide persistante au-dessus du nav principal.
 * Items : libido scale 1-5 · session · orgasme · crampes · énergie · flux.
 *
 * Sauvegarde dans log_entries (category_id='journal') à chaque interaction.
 */
import { supabase } from './supabase.js';
import { getMyMembership } from './pairing.js';
import { localDateStr } from './date-utils.js';
import { DailyLog } from './cycle-model.js';
import { invalidateCache } from './query-cache.js';

let _log = null;
let _me  = null;

export async function initQuickLogBar() {
  const bar = document.getElementById('quick-log-bar');
  if (!bar) return;

  _me = await getMyMembership();
  if (!_me) { bar.hidden = true; return; }

  const today = localDateStr();
  const { data } = await supabase.from('log_entries')
    .select('*').eq('log_date', today).eq('category_id', 'journal').maybeSingle();
  _log = data ? DailyLog.fromDB(data) : new DailyLog({ date: today, userId: _me.user_id });

  bar.hidden = false;
  _render(bar);
}

function _render(bar) {
  if (!bar || !_log) return;

  const libido = _log.libidoScale;
  const energie = _log.niveauEnergie;
  const hasSession = _log.rapports && _log.rapports !== 'pas_sexe';
  const hasCrampes = _log.douleursPelviennes.includes('crampes');
  const hasFlux    = _log.fluxMenstruel && _log.fluxMenstruel !== 'aucun';

  const libidoBtns = [1,2,3,4,5].map(n =>
    `<button type="button" class="qlb-dot${libido === n ? ' on' : ''}"
      data-action="libido" data-val="${n}" title="Libido ${n}/5"
      aria-label="Libido ${n} sur 5" aria-pressed="${libido === n}"></button>`
  ).join('');

  bar.innerHTML = `
    <div class="qlb-inner">

      <div class="qlb-item">
        <div class="qlb-item-label">Libido</div>
        <div class="qlb-dots" role="group" aria-label="Libido 1 à 5">${libidoBtns}</div>
      </div>

      <button type="button" class="qlb-chip${hasSession ? ' on' : ''}"
        data-action="session" aria-pressed="${hasSession}" title="Session intime">
        <span aria-hidden="true">❤️</span>
        <span class="qlb-chip-label">Session</span>
      </button>

      <button type="button" class="qlb-chip${_log.orgasme ? ' on' : ''}"
        data-action="orgasme" aria-pressed="${!!_log.orgasme}" title="Orgasme">
        <span aria-hidden="true">⭐</span>
        <span class="qlb-chip-label">Orgasme</span>
      </button>

      <button type="button" class="qlb-chip${hasCrampes ? ' on' : ''}"
        data-action="crampes" aria-pressed="${hasCrampes}" title="Crampes">
        <span aria-hidden="true">🔥</span>
        <span class="qlb-chip-label">Crampes</span>
      </button>

      <div class="qlb-item">
        <div class="qlb-item-label">Énergie</div>
        <div class="qlb-row" role="group" aria-label="Niveau d'énergie">
          ${[['epuisee','🪫'],['fatiguee','😴'],['ok','🔋'],['en_forme','⚡']].map(([k,e]) =>
            `<button type="button" class="qlb-chip qlb-sm${energie === k ? ' on' : ''}"
              data-action="energie" data-val="${k}" aria-pressed="${energie === k}"
              title="${k}" aria-label="${k}">${e}</button>`
          ).join('')}
        </div>
      </div>

      <button type="button" class="qlb-chip${hasFlux ? ' on' : ''}"
        data-action="flux" aria-pressed="${hasFlux}" title="Règles">
        <span aria-hidden="true">🩸</span>
        <span class="qlb-chip-label">Flux</span>
      </button>

    </div>`;

  bar.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => _handleAction(btn.dataset, bar));
  });
}

async function _handleAction({ action, val }, bar) {
  if (!_log) return;

  switch (action) {
    case 'libido': {
      const n = parseInt(val, 10);
      _log.libidoScale = _log.libidoScale === n ? null : n;
      break;
    }
    case 'session': {
      const was = _log.rapports && _log.rapports !== 'pas_sexe';
      _log.rapports = was ? 'pas_sexe' : 'sans_protection';
      break;
    }
    case 'orgasme':
      _log.orgasme = !_log.orgasme;
      break;
    case 'crampes': {
      const arr = _log.douleursPelviennes;
      const i = arr.indexOf('crampes');
      if (i >= 0) arr.splice(i, 1); else arr.push('crampes');
      break;
    }
    case 'energie':
      _log.niveauEnergie = _log.niveauEnergie === val ? null : val;
      break;
    case 'flux': {
      const wasFlux = _log.fluxMenstruel && _log.fluxMenstruel !== 'aucun';
      _log.fluxMenstruel = wasFlux ? 'aucun' : 'modere';
      break;
    }
  }

  await _save();
  _render(bar);
}

async function _save() {
  if (!_me || !_log) return;
  await supabase.from('log_entries').upsert(
    { ..._log.toDBEntry(), user_id: _me.user_id },
    { onConflict: 'user_id,log_date,category_id' }
  );
  invalidateCache('log_entries');
}
