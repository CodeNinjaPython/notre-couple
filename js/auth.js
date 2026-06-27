import { supabase } from './supabase.js';

export async function sendMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

// Vérifie le code à 6 chiffres reçu par e-mail (login dans l'app, sans bascule Safari)
export async function verifyEmailOtp(email, token) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: String(token).trim(),
    type: 'email',
  });
  if (error) throw error;
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
