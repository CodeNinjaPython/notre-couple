import { supabase } from './supabase.js';

/**
 * Connexion par mot de passe. Essaie de se connecter ; si le compte n'existe
 * pas encore, le crée automatiquement (premier accès).
 * @returns {'in'|'up'|'confirm'} — connecté / créé+connecté / créé mais e-mail à confirmer
 */
export async function signInOrSignUp(email, password) {
  const inRes = await supabase.auth.signInWithPassword({ email, password });
  if (!inRes.error) return 'in';

  const msg = (inRes.error.message || '').toLowerCase();
  // E-mail non confirmé : le compte existe mais Supabase exige une confirmation.
  // Symptôme typique « je n'arrive à me connecter qu'une fois » : la session du
  // signup marche une fois, puis la reconnexion échoue tant que ce n'est pas levé.
  if (msg.includes('not confirmed') || msg.includes('email not confirmed') || msg.includes('confirm')) {
    throw new Error('Ton e-mail n\'est pas confirmé. Désactive « Confirm email » dans Supabase (Authentication → Sign In → Email), ou clique le lien de confirmation reçu, puis reconnecte-toi.');
  }
  // Identifiants invalides → soit le compte n'existe pas, soit mauvais mot de passe
  if (msg.includes('invalid login credentials') || msg.includes('invalid')) {
    const upRes = await supabase.auth.signUp({ email, password });
    if (!upRes.error) {
      return upRes.data?.session ? 'up' : 'confirm';
    }
    const upMsg = (upRes.error.message || '').toLowerCase();
    if (upMsg.includes('already registered') || upMsg.includes('already been registered')) {
      throw new Error('Ce compte existe déjà — mot de passe incorrect. (Compte sans mot de passe ? Vois "Mot de passe" dans Réglages depuis le web.)');
    }
    throw upRes.error;
  }
  throw inRes.error;
}

/** Définit (ou change) le mot de passe de l'utilisateur connecté. */
export async function setPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
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
