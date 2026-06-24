import { signOut } from './auth.js';
import { navigate } from './router.js';

export function initNous() {
  document.getElementById('btn-nous-signout')?.addEventListener('click', async () => {
    await signOut();
    navigate('auth');
  });
}
