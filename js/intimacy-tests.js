/**
 * intimacy-tests.js — Tests unitaires vanilla JS.
 * Exécuter dans la console : import('/js/intimacy-tests.js').then(m => m.runAllTests())
 * Aucune dépendance externe.
 */

// ─── Micro-framework de test ───────────────────────────────────────────────

let _passed = 0, _failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    _passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    _failed++;
  }
}

function describe(suite, fn) {
  console.group(`🧪 ${suite}`);
  fn();
  console.groupEnd();
}

// ─── Algorithme fenêtre de désir ──────────────────────────────────────────

function computeDesireWindow(entries, myUserId, partnerUserId, threshold = 4) {
  const byDate = {};
  entries.forEach(e => {
    if (!byDate[e.log_date]) byDate[e.log_date] = {};
    byDate[e.log_date][e.user_id] = Number(e.value?.v ?? e.value);
  });
  const today   = new Date().toISOString().split('T')[0];
  const hotDays = Object.entries(byDate)
    .filter(([date, d]) => date <= today && d[myUserId] >= threshold && d[partnerUserId] >= threshold)
    .map(([date]) => date);
  return { hotDays, todayIsHot: hotDays.includes(today) };
}

function testDesireWindow() {
  describe('Fenêtre de désir', () => {
    const today   = new Date().toISOString().split('T')[0];
    const yest    = new Date(Date.now() - 864e5).toISOString().split('T')[0];
    const ME      = 'user-elle';
    const PARTNER = 'user-lui';

    // Cas 1 : les deux ont libido ≥ 4 aujourd'hui → window active
    const entries1 = [
      { user_id: ME,      log_date: today, value: { v: '4' } },
      { user_id: PARTNER, log_date: today, value: { v: '5' } },
    ];
    const { todayIsHot: hot1 } = computeDesireWindow(entries1, ME, PARTNER);
    assert('Les deux ≥ 4 aujourd\'hui → fenêtre active', hot1 === true);

    // Cas 2 : elle a 3, lui a 5 → pas de fenêtre
    const entries2 = [
      { user_id: ME,      log_date: today, value: { v: '3' } },
      { user_id: PARTNER, log_date: today, value: { v: '5' } },
    ];
    const { todayIsHot: hot2 } = computeDesireWindow(entries2, ME, PARTNER);
    assert('Elle < 4 → pas de fenêtre', hot2 === false);

    // Cas 3 : données uniquement hier → pas de fenêtre aujourd'hui
    const entries3 = [
      { user_id: ME,      log_date: yest, value: { v: '5' } },
      { user_id: PARTNER, log_date: yest, value: { v: '5' } },
    ];
    const { todayIsHot: hot3, hotDays: days3 } = computeDesireWindow(entries3, ME, PARTNER);
    assert('Données uniquement hier → today pas hot', hot3 === false);
    assert('Mais hier est dans hotDays', days3.includes(yest));

    // Cas 4 : entrées vides → rien
    const { hotDays: days4 } = computeDesireWindow([], ME, PARTNER);
    assert('Pas d\'entrées → hotDays vide', days4.length === 0);

    // Cas 5 : seuil personnalisé 5
    const entries5 = [
      { user_id: ME,      log_date: today, value: { v: '4' } },
      { user_id: PARTNER, log_date: today, value: { v: '4' } },
    ];
    const { todayIsHot: hot5 } = computeDesireWindow(entries5, ME, PARTNER, 5);
    assert('Seuil 5, valeurs 4 → pas de fenêtre', hot5 === false);

    // Cas 6 : un seul partenaire a saisi
    const entries6 = [
      { user_id: ME, log_date: today, value: { v: '5' } },
    ];
    const { todayIsHot: hot6 } = computeDesireWindow(entries6, ME, PARTNER);
    assert('Partenaire n\'a pas saisi → pas de fenêtre', hot6 === false);
  });
}

// ─── Algorithme matching kinks ─────────────────────────────────────────────

function computeKinkMatchRate(myRatings, partnerRatings) {
  const myShared      = new Set(myRatings.filter(r => r.shared && r.desire > 0).map(r => r.kink_id));
  const partnerShared = new Set(partnerRatings.filter(r => r.shared && r.desire > 0).map(r => r.kink_id));
  const total         = new Set([...myShared, ...partnerShared]).size;
  const matches       = [...myShared].filter(id => partnerShared.has(id));
  return {
    matchCount: matches.length,
    total,
    rate: total > 0 ? Math.round(matches.length / total * 100) : 0,
    matchIds: matches,
  };
}

function testKinkMatchRate() {
  describe('Kink Match Rate', () => {
    // Cas 1 : 2 matchs sur 3 kinks distincts partagés
    // (k3 est non partagé + desire 0 → exclu ; distincts = k1, k2, k4)
    const mine     = [
      { kink_id: 'k1', desire: 4, shared: true },
      { kink_id: 'k2', desire: 3, shared: true },
      { kink_id: 'k3', desire: 0, shared: false }, // not shared, not counted
    ];
    const theirs   = [
      { kink_id: 'k1', desire: 5, shared: true },
      { kink_id: 'k2', desire: 2, shared: true },
      { kink_id: 'k4', desire: 4, shared: true },
    ];
    const r1 = computeKinkMatchRate(mine, theirs);
    assert('2 matchs détectés (k1, k2)', r1.matchCount === 2, `got ${r1.matchCount}`);
    assert('Total 3 kinks distincts partagés', r1.total === 3, `got ${r1.total}`);
    assert('Taux = 67%', r1.rate === 67, `got ${r1.rate}`);
    assert('k3 absent des matchs (non partagé)', !r1.matchIds.includes('k3'));

    // Cas 2 : aucun kink en commun
    const mine2    = [{ kink_id: 'a', desire: 5, shared: true }];
    const theirs2  = [{ kink_id: 'b', desire: 5, shared: true }];
    const r2 = computeKinkMatchRate(mine2, theirs2);
    assert('Aucun match → matchCount 0', r2.matchCount === 0);
    assert('Aucun match → rate 0%', r2.rate === 0);

    // Cas 3 : kink avec desire = 0 → non compté
    const mine3    = [{ kink_id: 'x', desire: 0, shared: true }];
    const theirs3  = [{ kink_id: 'x', desire: 4, shared: true }];
    const r3 = computeKinkMatchRate(mine3, theirs3);
    assert('Desire = 0 → non compté dans les matchs', r3.matchCount === 0);

    // Cas 4 : données vides
    const r4 = computeKinkMatchRate([], []);
    assert('Données vides → rate 0', r4.rate === 0);
    assert('Données vides → total 0', r4.total === 0);

    // Cas 5 : shared = false n'apparaît pas dans les matchs
    const mine5   = [{ kink_id: 'z', desire: 5, shared: false }];
    const theirs5 = [{ kink_id: 'z', desire: 5, shared: true  }];
    const r5 = computeKinkMatchRate(mine5, theirs5);
    assert('Kink non partagé → pas de match révélé', r5.matchCount === 0);
  });
}

// ─── Entrée principale ─────────────────────────────────────────────────────

export function runAllTests() {
  _passed = 0; _failed = 0;
  console.group('🔬 Tests — Module Intimité');
  testDesireWindow();
  testKinkMatchRate();
  console.groupEnd();
  const total = _passed + _failed;
  console.log(`\n${_passed === total ? '✅' : '⚠️'} ${_passed}/${total} tests passés`);
  return { passed: _passed, failed: _failed, total };
}
