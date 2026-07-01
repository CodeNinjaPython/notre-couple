export function openFastTrackFlow(st, deps) {
  deps.closeSessionSheet();
  const sheet = document.getElementById('fast-track-sheet');
  if (!sheet) return;

  document.querySelectorAll('.ft-mood-btn').forEach(button => button.classList.remove('sel'));
  const orgasmEl = document.getElementById('ft-orgasm');
  if (orgasmEl) orgasmEl.checked = false;

  sheet.classList.add('open');
  sheet.removeAttribute('aria-hidden');

  document.querySelectorAll('.ft-mood-btn').forEach(button =>
    button.addEventListener('click', () => {
      document.querySelectorAll('.ft-mood-btn').forEach(x => x.classList.remove('sel'));
      button.classList.add('sel');
    })
  );

  document.getElementById('btn-ft-save')?.addEventListener('click', () => saveFastTrack(st, deps), { once: true });
  document.getElementById('btn-ft-cancel')?.addEventListener('click', closeFastTrackFlow, { once: true });
}

export function closeFastTrackFlow() {
  const sheet = document.getElementById('fast-track-sheet');
  if (sheet) {
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
  }
}

async function saveFastTrack(st, deps) {
  const mood = document.querySelector('.ft-mood-btn.sel')?.dataset.mood || null;
  const sat = parseInt(document.querySelector('.ft-sat-btn.sel')?.dataset.sat, 10) || null;
  const orgasms = document.getElementById('ft-orgasm')?.checked ? 1 : 0;

  const btn = document.getElementById('btn-ft-save');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Tap…';
  }

  try {
    const { data: session, error } = await deps.supabase.from('intimate_sessions').insert({
      couple_id: st.coupleId,
      created_by: st.me?.user_id,
      session_date: deps.localDateStr(),
      mood,
    }).select().single();

    if (error) throw error;

    if ((sat || orgasms) && session?.id) {
      await deps.supabase.from('session_feedback').insert({
        session_id: session.id,
        user_id: st.me?.user_id,
        satisfaction: sat,
        orgasms,
        shared: false,
      });
    }

    await deps.syncSessionToDailyLog(deps.localDateStr(), st.me?.user_id, { satisfaction: sat, orgasms });

    closeFastTrackFlow();
    await deps.renderRecentSessions(st);
    deps.notifySessionSaved();
  } catch (e) {
    deps.showError('ft-error', 'Connexion perdue. Réessayez dans un moment.');
    console.error('saveFastTrack:', e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Valider';
    }
  }
}
