// Post-restart live verification for the everything plugin's Client half.
//
// Usage (after quitting and relaunching DSH Desktop, because a new `dsh.client`
// declaration is only scanned at Host start):
//
//   node scripts/verify-live.mjs
//   node scripts/verify-live.mjs http://127.0.0.1:13477
//
// Checks the two Host-side proofs that need no browser session:
//   V1  /plugins/events carries a `dsh-plugin-everything` graph entry
//   V2  that entry's bundle URL serves the module-loader wrapper for this id
// It never prints the page URL's auth token and never mutates anything.
import process from 'node:process';

const baseUrl = (process.argv[2] ?? process.env.DSH_WEB_URL ?? '').replace(/\/+$/, '');
if (baseUrl === '') {
  console.error('usage: node scripts/verify-live.mjs <http://host:port>  (or set DSH_WEB_URL)');
  process.exit(2);
}

const PACKAGE = 'dsh-plugin-everything';
let failures = 0;
const ok = (label, detail) => console.log(`ok   ${label}${detail === undefined ? '' : ` — ${detail}`}`);
const fail = (label, detail) => {
  failures += 1;
  console.log(`FAIL ${label}${detail === undefined ? '' : ` — ${detail}`}`);
};

/** Read the first graph frame from the plugin graph SSE stream. */
async function readGraph(timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(`${baseUrl}/plugins/events`, {
    headers: { accept: 'text/event-stream' },
    signal: controller.signal
  });
  try {
    if (!response.ok) throw new Error(`/plugins/events returned ${response.status}`);
    const reader = response.body?.getReader();
    if (reader === undefined) throw new Error('/plugins/events has no body');
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let eventEnd = buffer.indexOf('\n\n');
      while (eventEnd !== -1) {
        const block = buffer.slice(0, eventEnd);
        buffer = buffer.slice(eventEnd + 2);
        for (const line of block.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '') continue;
          let frame;
          try {
            frame = JSON.parse(payload);
          } catch {
            continue;
          }
          if (frame?.type === 'graph' && frame.graph !== undefined) return frame.graph;
        }
        eventEnd = buffer.indexOf('\n\n');
      }
    }
    throw new Error('graph frame not found in the stream');
  } finally {
    clearTimeout(timer);
    controller.abort();
    response.body?.cancel?.().catch(() => {});
  }
}

let frame;
try {
  frame = await readGraph();
} catch (error) {
  console.error(`FAIL could not read the plugin graph from ${baseUrl}/plugins/events: ${error.message}`);
  console.error('     restart DSH Desktop first, then pass the new base URL (or set DSH_WEB_URL).');
  process.exit(1);
}
ok('V1 plugin graph stream answered', `rev ${frame.rev} · release ${frame.release?.version ?? 'unknown'}`);
const row = frame.entries.find((entry) => entry.id === PACKAGE);
if (row === undefined) {
  fail(
    'V1 graph carries the plugin bundle row',
    `no "${PACKAGE}" entry among ${frame.entries.length} — the Host has not rescanned the new dsh.client declaration; restart DSH Desktop and run this again`
  );
} else {
  ok('V1 graph carries the plugin bundle row', JSON.stringify(row));
  if (row.immediately !== true) fail('V1 row is preloaded immediately', String(row.immediately));
  else ok('V1 row is preloaded immediately');
}

if (row !== undefined) {
  const url = new URL(row.url, `${baseUrl}/`).href;
  const response = await fetch(url);
  const body = response.ok ? await response.text() : '';
  ok('V2 bundle request answered', `${response.status} ${response.headers.get('content-type') ?? ''} ${body.length} bytes`);
  if (!response.ok) fail('V2 bundle request is 200', String(response.status));
  if (!body.includes('window.__ModuleLoader__.load')) fail('V2 bundle is a module-loader registration');
  else ok('V2 bundle is a module-loader registration');
  if (!body.includes(`id: "${PACKAGE}"`) && !body.includes(`id: '${PACKAGE}'`)) fail('V2 bundle id matches the package name');
  else ok('V2 bundle id matches the package name');
  if (!body.includes('tool.call.toolview')) fail('V2 bundle registers the tool card slot');
  else ok('V2 bundle registers the tool card slot');
  if (row.rev !== undefined && !url.includes(row.rev)) fail('V2 bundle URL carries the row revision', url);
  else ok('V2 bundle URL carries the row revision');
}

console.log(
  failures === 0
    ? '\nPASS: the Client half is served by this Host. Open the Web GUI, run everything_search, and confirm both cards (collapsed row + expanded body).'
    : `\nFAIL: ${failures} check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
