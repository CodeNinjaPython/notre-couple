import { supabase } from './supabase.js';

// Channels actifs (pour cleanup)
const active = {};

export function subscribeToEvents(coupleId, onChange) {
  const key = `events-${coupleId}`;
  active[key]?.unsubscribe();
  active[key] = supabase
    .channel(key)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'couple_events',
      filter: `couple_id=eq.${coupleId}`,
    }, onChange)
    .subscribe();
  return active[key];
}

export function subscribeToPartnerLogs(coupleId, onChange) {
  const key = `logs-${coupleId}`;
  active[key]?.unsubscribe();
  active[key] = supabase
    .channel(key)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'log_entries',
    }, onChange)
    .subscribe();
  return active[key];
}

export function unsubscribeAll() {
  Object.values(active).forEach(ch => ch.unsubscribe());
  Object.keys(active).forEach(k => delete active[k]);
}
