import { supabase } from './supabase.js';

function randomCode() {
  // Caractères sans ambiguïté (pas de 0/O, I/1)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function getMyMembership() {
  const { data, error } = await supabase
    .from('couple_members')
    .select('user_id, couple_id, display_name, tracks_cycle')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPartnerMembership(coupleId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('couple_members')
    .select('user_id, display_name, tracks_cycle')
    .eq('couple_id', coupleId)
    .neq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCouple(displayName, tracksCycle) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: couple, error: coupleErr } = await supabase
    .from('couples')
    .insert({})
    .select()
    .single();
  if (coupleErr) throw coupleErr;

  const { error: memberErr } = await supabase
    .from('couple_members')
    .insert({ couple_id: couple.id, user_id: user.id, display_name: displayName, tracks_cycle: tracksCycle });
  if (memberErr) throw memberErr;

  const code = await generatePairingCode(couple.id);
  return { couple, code };
}

export async function generatePairingCode(coupleId) {
  const { data: { user } } = await supabase.auth.getUser();
  const code = randomCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('pairing_codes')
    .insert({ code, couple_id: coupleId, created_by: user.id, expires_at: expiresAt, used: false });
  if (error) throw error;
  return code;
}

export async function joinWithCode(code, displayName, tracksCycle) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: pairingCode, error: codeErr } = await supabase
    .from('pairing_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (codeErr) throw codeErr;
  if (!pairingCode) throw new Error('Code invalide ou expiré. Demandez un nouveau code.');

  const { error: memberErr } = await supabase
    .from('couple_members')
    .insert({ couple_id: pairingCode.couple_id, user_id: user.id, display_name: displayName, tracks_cycle: tracksCycle });
  if (memberErr) throw memberErr;

  await supabase.from('pairing_codes').update({ used: true }).eq('code', pairingCode.code);

  return pairingCode.couple_id;
}

export async function renewPairingCode(coupleId) {
  // Invalide les anciens codes non utilisés avant d'en créer un nouveau
  await supabase.from('pairing_codes')
    .update({ used: true })
    .eq('couple_id', coupleId)
    .eq('used', false);
  return generatePairingCode(coupleId);
}
