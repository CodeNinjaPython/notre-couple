const REACTION_EMOJIS = ['❤️', '✨', '😊', '💪'];

export function createTodayEventsController({
  getState,
  supabase,
  localDateStr,
  confirmDialog,
  showToast,
  friendlyError,
  eventTypes,
}) {
  async function renderEvents() {
    const wrap = document.getElementById('events-list');
    const state = getState();
    if (!wrap || !state.coupleId) return;

    const { data } = await supabase
      .from('couple_events')
      .select('*')
      .eq('couple_id', state.coupleId)
      .order('event_date', { ascending: false })
      .limit(7);

    wrap.innerHTML = '';

    if (!data?.length) {
      wrap.innerHTML = `<div class="empty-state-inline">
        <div class="es-icon">🌸</div>
        <p>Aucun moment noté ensemble.<br>Commencez par en ajouter un !</p>
      </div>`;
    } else {
      data.forEach(ev => {
        const diff = Math.round((Date.now() - new Date(ev.event_date)) / 864e5);
        const when = diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Hier' : `Il y a ${diff} jours`;
        const reactions = ev.reactions || {};
        const myReaction = reactions[state.me?.user_id];
        const allReactions = Object.values(reactions);
        const reactionSummary = [...new Set(allReactions)].map(e => {
          const count = allReactions.filter(x => x === e).length;
          return `<span class="ev-reaction${e === myReaction ? ' mine' : ''}">${e}${count > 1 ? ` ${count}` : ''}</span>`;
        }).join('');

        const eventInfo = eventTypes[ev.event_type] || eventTypes.other;
        const div = document.createElement('div');
        div.className = 'ev';
        div.dataset.id = ev.id;
        div.innerHTML = `
          <div class="ico">${eventInfo.icon}</div>
          <div class="ev-body">
            <div class="et">${ev.note || eventInfo.label}</div>
            <div class="ed">${when}</div>
            ${reactionSummary ? `<div class="ev-reactions">${reactionSummary}</div>` : ''}
          </div>
          <div class="ev-actions">
            <button type="button" class="ev-react-btn" data-id="${ev.id}" aria-label="Réagir">${myReaction || '🫶'}</button>
            <button type="button" class="ev-delete-btn" data-id="${ev.id}" aria-label="Supprimer">×</button>
          </div>`;
        wrap.appendChild(div);
      });
    }

    wrap.querySelectorAll('.ev-react-btn').forEach(btn => {
      btn.addEventListener('click', () => openReactionPicker(btn.dataset.id, btn));
    });

    wrap.querySelectorAll('.ev-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Supprimer ce moment ?',
          message: 'Il disparaîtra de votre journal partagé.',
          confirmLabel: 'Supprimer',
          danger: true,
        });
        if (!ok) return;
        try {
          const { error } = await supabase.from('couple_events').delete().eq('id', btn.dataset.id);
          if (error) throw error;
          await renderEvents();
        } catch (e) {
          showToast(friendlyError(e), 'error');
        }
      });
    });

    document.getElementById('btn-addev')?.addEventListener('click', openEventSheet);
  }

  function openReactionPicker(eventId, anchorBtn) {
    document.querySelectorAll('.reaction-picker').forEach(p => p.remove());

    const picker = document.createElement('div');
    picker.className = 'reaction-picker';
    picker.innerHTML = REACTION_EMOJIS.map(e =>
      `<button class="reaction-opt" data-emoji="${e}">${e}</button>`
    ).join('');
    anchorBtn.insertAdjacentElement('afterend', picker);

    picker.querySelectorAll('.reaction-opt').forEach(btn => {
      btn.addEventListener('click', async () => {
        picker.remove();
        await likeEvent(eventId, btn.dataset.emoji);
      });
    });

    const close = e => {
      if (!picker.contains(e.target) && e.target !== anchorBtn) {
        picker.remove();
        document.removeEventListener('click', close, true);
      }
    };
    setTimeout(() => document.addEventListener('click', close, true), 10);
  }

  async function likeEvent(eventId, emoji) {
    const state = getState();
    const userId = state.me?.user_id;
    if (!userId) return;

    const { data: ev } = await supabase
      .from('couple_events').select('reactions').eq('id', eventId).single();
    const current = ev?.reactions || {};

    const newReactions = { ...current };
    if (current[userId] === emoji) delete newReactions[userId];
    else newReactions[userId] = emoji;

    await supabase.from('couple_events').update({ reactions: newReactions }).eq('id', eventId);
  }

  function openEventSheet() {
    const sheet = document.getElementById('event-sheet');
    if (!sheet) return;
    sheet.classList.add('open');
    document.getElementById('event-note').value = '';
    document.querySelectorAll('.ev-type-btn').forEach(b => b.classList.remove('sel'));

    document.getElementById('btn-sheet-cancel')?.addEventListener('click', closeEventSheet, { once: true });
    document.getElementById('btn-sheet-save')?.addEventListener('click', saveEvent, { once: true });
    document.querySelectorAll('.ev-type-btn').forEach(b =>
      b.addEventListener('click', () => {
        document.querySelectorAll('.ev-type-btn').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
      })
    );
  }

  function closeEventSheet() {
    document.getElementById('event-sheet')?.classList.remove('open');
  }

  async function saveEvent() {
    const state = getState();
    const typeBtn = document.querySelector('.ev-type-btn.sel');
    const type = typeBtn?.dataset.type || 'other';
    const note = document.getElementById('event-note')?.value.trim() || null;
    const today = localDateStr();
    await supabase.from('couple_events').insert({
      couple_id: state.coupleId,
      event_date: today,
      event_type: type,
      note,
      created_by: state.me?.user_id,
      reactions: {},
    });
    closeEventSheet();
    await renderEvents();
  }

  return { renderEvents, likeEvent, openEventSheet, closeEventSheet };
}
