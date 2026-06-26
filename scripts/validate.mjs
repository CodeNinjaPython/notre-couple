#!/usr/bin/env node
/**
 * validate.mjs — Garde-fou exécuté avant chaque commit.
 * Couvre les 3 classes de bug qui ont déjà cassé l'app :
 *   1. Erreur de syntaxe JS  (node --check)
 *   2. Import nommé non résolu → écran gris (graphe import/export)
 *   3. Régression de logique  (intimacy-tests.js, pur Node)
 *
 * Usage : node scripts/validate.mjs
 * Sortie : exit 0 si tout passe, exit 1 sinon.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS   = join(ROOT, 'js');
const files = readdirSync(JS).filter(f => f.endsWith('.js'));

let problems = 0;
const fail = msg => { console.error('  ❌ ' + msg); problems++; };

// ── 1. Syntaxe ─────────────────────────────────────────────────────────────
console.log('1. Syntaxe (node --check)');
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', join(JS, f)], { stdio: 'pipe' });
  } catch (e) {
    fail(`${f} : ${String(e.stderr || e).split('\n').find(l => l.includes('Error')) || 'erreur de syntaxe'}`);
  }
}

// ── 2. Graphe import/export ─────────────────────────────────────────────────
console.log('2. Graphe import/export');
const exportsOf = {};
for (const f of files) {
  const code = readFileSync(join(JS, f), 'utf8');
  const names = new Set();
  for (const m of code.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
  for (const m of code.matchAll(/export\s*\{([^}]+)\}/g))
    for (const part of m[1].split(',')) {
      const seg = part.trim().split(/\s+as\s+/);
      const exported = seg.length > 1 ? seg[1].trim() : seg[0].trim();
      if (exported) names.add(exported);
    }
  if (/export\s+default/.test(code)) names.add('default');
  exportsOf[f] = names;
}
for (const f of files) {
  const code = readFileSync(join(JS, f), 'utf8');
  for (const m of code.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']\.\/([^"']+)["']/g)) {
    const imported = m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    let target = m[2];
    if (!target.endsWith('.js')) target += '.js';
    if (!exportsOf[target]) { fail(`${f} importe depuis ./${target} (fichier introuvable)`); continue; }
    for (const name of imported)
      if (!exportsOf[target].has(name)) fail(`${f} importe {${name}} de ./${target} — non exporté`);
  }
}

// ── 3. Tests unitaires (pur Node) ───────────────────────────────────────────
console.log('3. Tests unitaires');
try {
  const mod = await import(pathToFileURL(join(JS, 'intimacy-tests.js')).href);
  const orig = console.error;
  console.error = () => {}; // silence le détail, on lit le résumé
  const res = mod.runAllTests();
  console.error = orig;
  if (res.failed > 0) fail(`${res.failed}/${res.total} tests échoués`);
  else console.log(`  ✅ ${res.passed}/${res.total} tests passés`);
} catch (e) {
  fail(`tests non exécutables : ${e.message}`);
}

// ── Verdict ─────────────────────────────────────────────────────────────────
if (problems) {
  console.error(`\n❌ ${problems} problème(s) — commit bloqué.`);
  process.exit(1);
}
console.log('\n✅ Validation OK');
