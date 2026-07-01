let pendingFeedbackId = null;
let pendingFeedbackDate = null;

export function openFeedbackFlow(sessionId, st, prefilledOrgasms = 0, sessionDate = null, deps) {
  pendingFeedbackId = sessionId;
  pendingFeedbackDate = sessionDate || deps.localDateStr();
  const sheet = document.getElementById('feedback-sheet');
  if (!sheet) return;

  document.querySelectorAll('.fb-sat-btn').forEach(button => button.classList.remove('sel'));
  const orgasmEl = document.getElementById('fb-orgasm');
  const lovedEl = document.getElementById('fb-loved');
  const improveEl = document.getElementById('fb-improve');
  if (orgasmEl) orgasmEl.checked = prefilledOrgasms > 0;
  if (lovedEl) lovedEl.value = '';
  if (improveEl) improveEl.value = '';

  sheet.classList.add('open');
  sheet.removeAttribute('aria-hidden');

  document.querySelectorAll('.fb-sat-btn').forEach(button =>
    button.addEventListener('click', () => {
      document.querySelectorAll('.fb-sat-btn').forEach(x => x.classList.remove('sel'));
      button.classList.add('sel');
    })
  );

  document.getElementById('btn-feedback-save')?.addEventListener('click', () => saveFeedback(st, deps), { once: true });
  document.getElementById('btn-feedback-skip')?.addEventListener('click', closeFeedbackFlow, { once: true });
}

export function closeFeedbackFlow() {
  const sheet = document.getElementById('feedback-sheet');
  if (sheet) {
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
  }
  pendingFeedbackId = null;
  pendingFeedbackDate = null;
}

async function saveFeedback(st, deps) {
  if (!pendingFeedbackId) {
    closeFeedbackFlow();
    return;
  }

  const sat = parseInt(document.querySelector('.fb-sat-btn.sel')?.dataset.sat, 10) || null;
  const orgasms = document.getElementById('fb-orgasm')?.checked ? 1 : 0;
  const loved = document.getElementById('fb-loved')?.value.trim() || null;
  const improve = document.getElementById('fb-improve')?.value.trim() || null;
  const sessionDate = pendingFeedbackDate || deps.localDateStr();

  try {
    const { error } = await deps.supabase.from('session_feedback').upsert({
      session_id: pendingFeedbackId,
      user_id: st.me?.user_id,
      satisfaction: sat,
      orgasms,
      loved_txt: loved,
      improve_txt: improve,
      shared: false,
    }, { onConflict: 'session_id,user_id' });

    if (error) throw error;

    await deps.syncSessionToDailyLog(sessionDate, st.me?.user_id, { satisfaction: sat, orgasms });
    deps.notifySessionSaved();

    closeFeedbackFlow();
  } catch (e) {
    console.error('saveFeedback:', e.message);
    closeFeedbackFlow();
  }
}
