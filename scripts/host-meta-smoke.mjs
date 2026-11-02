// Headless smoke test for the everything plugin's Host half presentation bridge.
//
// Mounts the real Host plugin against a minimal `ctx` double, then exercises the
// `output.presentationMeta` projections that the Web Client cards read. This
// runs without Harness, Everything, or the SDK DLL: only the published tool
// definitions are captured and their pure projectors called.
import assert from 'node:assert/strict';

import { apply } from '../index.js';

const captured = [];
const ctx = {
  effect: (factory) => {
    const cleanup = factory();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  },
  tools: {
    register: (definition) => {
      captured.push(definition);
      return () => {};
    }
  }
};

apply(ctx, {});
assert.equal(captured.length, 2, 'host half must register exactly two tools');

const byName = new Map(captured.map((tool) => [tool.name, tool]));
const search = byName.get('everything_search');
const status = byName.get('everything_status');
assert.ok(search, 'everything_search is registered');
assert.ok(status, 'everything_status is registered');

// Both cards are declared host-side through the same projection contract.
assert.equal(typeof search.output.presentationMeta, 'function', 'search declares presentationMeta');
assert.equal(typeof status.output.presentationMeta, 'function', 'status declares presentationMeta');
assert.equal(typeof search.output.render, 'function', 'search keeps its model-facing render');
assert.equal(typeof status.output.render, 'function', 'status keeps its model-facing render');

const lossless = (value) => assert.deepEqual(JSON.parse(JSON.stringify(value)), value, 'metadata must be lossless JSON');

//#region search projection
const rows = [];
for (let index = 0; index < 150; index += 1) {
  rows.push({
    path: `C:\\data\\file-${index}.pdf`,
    name: `file-${index}.pdf`,
    folder: false,
    size: 1024 * (index + 1),
    modified: '2026-01-02T03:04:05.000Z'
  });
}
rows.push({ path: 'C:\\data\\folder', name: 'folder', folder: true });

const searchValue = {
  query: 'report 2024',
  total: 4321,
  returned: rows.length,
  truncated: true,
  results: rows
};
const searchMeta = search.output.presentationMeta({ query: 'report 2024', sort: 'date-modified', descending: true }, searchValue);
lossless(searchMeta);
assert.equal(searchMeta.version, 1);
assert.equal(searchMeta.query, 'report 2024');
assert.equal(searchMeta.total, 4321);
assert.equal(searchMeta.returned, rows.length);
assert.equal(searchMeta.truncated, true);
assert.equal(searchMeta.sort, 'date-modified');
assert.equal(searchMeta.descending, true);
assert.ok(searchMeta.results.length <= 100, 'card rows are capped');
assert.equal(searchMeta.shown, searchMeta.results.length);
assert.equal(searchMeta.results[0].path, 'C:\\data\\file-0.pdf');
assert.equal(searchMeta.results[0].size, 1024);
assert.equal(searchMeta.results[0].folder, false);

// Folder rows omit file-only fields rather than inventing them.
const folderOnly = search.output.presentationMeta({}, { query: 'q', total: 1, returned: 1, truncated: false, results: [{ path: 'C:\\dir', name: 'dir', folder: true }] });
lossless(folderOnly);
assert.deepEqual(folderOnly.results[0], { path: 'C:\\dir', name: 'dir', folder: true });

// A missing size/date stays absent for file rows too.
const bare = search.output.presentationMeta({}, { query: 'q', total: 1, returned: 1, truncated: false, results: [{ path: 'C:\\a.txt', name: 'a.txt', folder: false }] });
lossless(bare);
assert.deepEqual(bare.results[0], { path: 'C:\\a.txt', name: 'a.txt', folder: false });

// Malformed rows never reach the card.
const messy = search.output.presentationMeta({}, { query: 'q', total: 2, returned: 2, truncated: false, results: [{ path: 42 }, { name: 'orphan' }, { path: 'C:\\ok', name: 'ok', folder: false }] });
assert.deepEqual(messy.results.map((row) => row.path), ['C:\\ok']);
assert.equal(messy.total, 2);
//#endregion

//#region status projection
const statusValue = {
  available: true,
  platform: 'win32-x64',
  sdkDll: 'C:\\plugins\\everything-plugin\\native\\Everything64.dll',
  clientVersion: '1.4.1.1032',
  databaseLoaded: true,
  indexedItems: 2784085
};
const statusMeta = status.output.presentationMeta({}, statusValue);
lossless(statusMeta);
assert.deepEqual(statusMeta, {
  version: 1,
  available: true,
  platform: 'win32-x64',
  sdkDll: 'C:\\plugins\\everything-plugin\\native\\Everything64.dll',
  clientVersion: '1.4.1.1032',
  databaseLoaded: true,
  indexedItems: 2784085
});

const downMeta = status.output.presentationMeta({}, {
  available: false,
  platform: 'win32-x64',
  sdkDll: 'C:\\plugins\\everything-plugin\\native\\Everything64.dll',
  error: 'IPC error 2',
  hint: 'Start Everything.exe, or set "autoStart": true in the everything plugin config.'
});
lossless(downMeta);
assert.equal(downMeta.available, false);
assert.equal(downMeta.error, 'IPC error 2');
assert.ok(downMeta.hint.includes('autoStart'));
assert.equal(downMeta.clientVersion, undefined);
assert.equal(downMeta.indexedItems, undefined);
//#endregion

//#region a projector must never fail a successful tool call
const partialSearchValue = { query: 'q', total: 1, returned: 1, truncated: false, results: [] };
for (const [label, args] of [
  ['undefined arguments', undefined],
  ['null arguments', null],
  ['array arguments', []],
  ['string arguments', 'query']
]) {
  const projected = search.output.presentationMeta(args, partialSearchValue);
  lossless(projected);
  assert.equal(projected.sort, 'name', `search meta with ${label} must fall back to the default sort`);
  assert.equal(projected.descending, false);
  assert.equal(projected.total, 1);
}

const partialStatus = status.output.presentationMeta({}, { available: true });
lossless(partialStatus);
assert.equal(typeof partialStatus.platform, 'string');
assert.ok(partialStatus.platform.length > 0, 'platform falls back to the runtime platform');
assert.equal(partialStatus.sdkDll, '');
//#endregion

//#region model-facing text is unchanged by the bridge
const rendered = search.output.render({ query: 'report 2024' }, {
  query: 'report 2024',
  total: 2,
  returned: 2,
  truncated: false,
  results: [
    { path: 'C:\\a\\report.pdf', name: 'report.pdf', folder: false, size: 2048, modified: '2026-01-02T03:04:05.000Z' },
    { path: 'C:\\a\\reports', name: 'reports', folder: true }
  ]
});
assert.equal(rendered.length, 1);
assert.equal(rendered[0].type, 'text');
assert.ok(rendered[0].text.startsWith('Showing 2 of 2 matches for "report 2024".'));
assert.ok(rendered[0].text.includes('[dir] C:\\a\\reports'));
//#endregion

console.log('ok   host half mounts and registers both tools');
console.log('ok   presentationMeta projects lossless, capped search metadata');
console.log('ok   presentationMeta tolerates malformed or partial rows');
console.log('ok   presentationMeta projects status diagnostics with and without errors');
console.log('ok   presentationMeta tolerates missing or non-object arguments');
console.log('ok   model-facing render output is unchanged');
console.log('\nPASS: host presentation bridge');
