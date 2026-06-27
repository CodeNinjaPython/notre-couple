import { supabase } from './supabase.js';

export async function sendMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

// Vérifie le code à 6 chiffres reçu par e-mail (login dans l'app, sans bascule Safari)
// Essaie 'email' (utilisateur existant) puis 'signup' (nouveau compte, ex. la partenaire).
export async function verifyEmailOtp(email, token) {
  const t = String(token).trim();
  const first = await supabase.auth.verifyOtp({ email, token: t, type: 'email' });
  if (!first.error) return;
  const second = await supabase.auth.verifyOtp({ email, token: t, type: 'signup' });
  if (second.error) throw first.error; // remonte l'erreur la plus parlante
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}
