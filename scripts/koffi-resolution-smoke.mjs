// Regression test: the koffi native vendored in this package must win over a
// host copy that Node can resolve from this package's directory.
//
// DSH creates every profile with `nodeLinker: hoisted`
// (@deepseek-ai/dsh-app-boot, src/profile.ts), so the host's own
// `@koromix/koffi-win32-x64` — pulled in by @deepseek-ai/dsh-fs-local,
// dsh-win32-process, dsh-subprocess-local and friends — sits at the profile
// root and is reachable from vendor/koffi/src/koffi/src/static.cjs. Before the
// fix, loadStatic() picked that copy up and wrapNative() threw
// "Mismatched native Koffi modules".
//
// The decoy is injected through NODE_PATH so the checkout stays clean, and the
// probe runs in a child process so this file never loads the native module
// itself.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32' || process.arch !== 'x64') {
  console.log(`skip koffi resolution smoke — win32-x64 only (this is ${process.platform}-${process.arch})`);
  process.exit(0);
}

const here = dirname(fileURLToPath(import.meta.url));
const koffiEntry = join(here, '..', 'vendor', 'koffi', 'index.cjs');

const decoyRoot = mkdtempSync(join(tmpdir(), 'koffi-decoy-'));
const decoyDir = join(decoyRoot, '@koromix', 'koffi-win32-x64');
mkdirSync(decoyDir, { recursive: true });
writeFileSync(
  join(decoyDir, 'package.json'),
  JSON.stringify({ name: '@koromix/koffi-win32-x64', version: '0.0.0-decoy', main: 'index.js' })
);
writeFileSync(join(decoyDir, 'index.js'), 'module.exports = { version: "0.0.0-decoy" };\n');

const probe = `const koffi = require(${JSON.stringify(koffiEntry)}); process.stdout.write(String(koffi.version));`;
const result = spawnSync(process.execPath, ['-e', probe], {
  env: { ...process.env, NODE_PATH: decoyRoot },
  encoding: 'utf8'
});
rmSync(decoyRoot, { recursive: true, force: true });

assert.equal(result.status, 0, `loading the vendored koffi failed: ${(result.stderr ?? '').trim()}`);
assert.equal(
  result.stdout.trim(),
  '3.3.4',
  `expected the vendored koffi 3.3.4, got ${result.stdout.trim()} — a host copy resolved first`
);
console.log('ok   vendored koffi native wins over a resolvable host copy');
