// Headless smoke test for the everything plugin's client half.
//
// The client bundle is a browser module (`window.__ModuleLoader__.load`), so it
// cannot be imported directly. This harness evaluates it in a bare VM context
// with a minimal React stand-in, captures the two keyed slot registrations, and
// walks the rendered element tree for a set of representative Tool blocks.
// It proves the card code runs and produces the expected copy; it is not a
// visual check.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginDir = path.resolve(here, '..');

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) {
    console.log(`ok   ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL ${label}${detail === undefined ? '' : ` — ${detail}`}`);
  }
};

//#region load the browser bundle
const source = fs.readFileSync(path.join(pluginDir, 'client.js'), 'utf8');
let entry = null;
const styleTags = [];
const sandbox = {
  window: {
    __ModuleLoader__: {
      load: (value) => {
        entry = value;
      }
    }
  },
  document: {
    documentElement: { lang: 'zh-CN' },
    createElement: () => {
      const tag = { dataset: {}, textContent: '' };
      styleTags.push(tag);
      return tag;
    },
    head: { appendChild: () => {} },
    querySelector: () => null
  },
  navigator: { language: 'zh-CN' },
  console
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'client.js' });
check('bundle registers itself with the module loader', entry !== null);
check('bundle id equals the package name', entry !== null && entry.id === 'dsh-plugin-everything', entry?.id);
//#endregion

//#region fake react + cordis context
const createElement = (type, props, ...children) => {
  const flat = children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false);
  const mergedProps = { ...(props ?? {}) };
  if (flat.length > 0 && mergedProps.children === undefined) mergedProps.children = flat.length === 1 ? flat[0] : flat;
  return {
    kind: typeof type === 'function' ? type.name || 'Component' : String(type),
    render: type,
    props: mergedProps,
    children: flat
  };
};
/** Minimal class base so the card's crash boundary can be constructed. */
class FakeComponent {
  constructor(props) {
    this.props = props;
  }
}
const React = {
  createElement,
  Component: FakeComponent,
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}]
};
const requireShim = (id) => {
  if (id === 'react') return React;
  throw new Error(`unexpected require(${JSON.stringify(id)})`);
};
const moduleExports = entry.factory(requireShim);
check('factory returns { inject, apply }', typeof moduleExports?.apply === 'function' && Array.isArray(moduleExports.inject));
check(
  'bundle requires the slots and locale services',
  JSON.stringify(moduleExports.inject) === '["slots","locale"]',
  JSON.stringify(moduleExports.inject)
);

const dictionaries = [];
const localeService = {
  register: (namespace, dicts) => {
    dictionaries.push({ namespace, dicts });
    return () => {};
  }
};
const registrations = [];
const ctx = {
  get: (name) => (name === 'locale' ? localeService : undefined),
  effect: (factory) => {
    const cleanup = factory();
    return typeof cleanup === 'function' ? cleanup : () => {};
  },
  slots: {
    inject: (slot, callback) => {
      check(`inject targets tool.call.toolview (got ${slot})`, slot === 'tool.call.toolview');
      const produced = callback();
      if (produced !== null && typeof produced === 'object' && typeof produced.next === 'function') {
        for (let step = produced.next(); !step.done; step = produced.next()) {
          // registration side effects already happened
        }
      }
      return () => {};
    },
    register: (options, component) => {
      registrations.push({ options, component });
      return () => {};
    }
  }
};
moduleExports.apply(ctx);
check('registers exactly two cards', registrations.length === 2, String(registrations.length));
const byKey = new Map(registrations.map((item) => [item.options.key, item]));
check('declares everything_search card', byKey.has('everything_search'));
check('declares everything_status card', byKey.has('everything_status'));
check(
  'both cards bind the plugin locale namespace',
  registrations.every((item) => item.options.locale === 'everything-plugin')
);
check('injects one scoped stylesheet', styleTags.length === 1, String(styleTags.length));
check('registers one locale namespace', dictionaries.length === 1, String(dictionaries.length));
check('locale namespace is plugin-owned', dictionaries[0]?.namespace === 'everything-plugin', dictionaries[0]?.namespace);
check(
  'ships English and Chinese dictionaries',
  typeof dictionaries[0]?.dicts?.en === 'object' &&
    typeof dictionaries[0]?.dicts?.zh === 'object' &&
    Object.keys(dictionaries[0].dicts.en).length === Object.keys(dictionaries[0].dicts.zh).length,
  JSON.stringify(Object.keys(dictionaries[0]?.dicts ?? {}))
);
//#endregion

//#region render helpers
const collect = (node, out = []) => {
  if (node === null || node === undefined || node === false) return out;
  if (Array.isArray(node)) {
    for (const child of node) collect(child, out);
    return out;
  }
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node));
    return out;
  }
  if (typeof node === 'object') {
    const { render, props = {}, children = [] } = node;
    if (typeof render === 'function') {
      if (typeof render.prototype?.render === 'function' && render.prototype instanceof FakeComponent) {
        // Class component (the card's crash boundary): instantiate, then render.
        const instance = new render(props);
        return collect(instance.render(), out);
      }
      // Function component: evaluate it like the reconciler would.
      return collect(render(props), out);
    }
    // Host element: `children` is authoritative (props.children mirrors it).
    for (const child of children) collect(child, out);
    return out;
  }
  return out;
};
const textOf = (node) => collect(node).join(' ');

const disclosure = (open) => () => ({ expanded: open, toggle: () => {} });
const argsView = (values) => ({
  text: (key) => (typeof values[key] === 'string' ? values[key] : undefined),
  complete: (key) => typeof values[key] === 'string'
});

const searchBlock = {
  callId: 'call_search',
  kind: 'result',
  content: [{ type: 'text', text: 'Showing 2 of 1234 matches for "report 2024".' }],
  isError: false,
  meta: {
    version: 1,
    query: 'report 2024',
    total: 1234,
    returned: 2,
    truncated: true,
    sort: 'date-modified',
    descending: true,
    shown: 2,
    results: [
      {
        path: 'C:\\Users\\keyblue\\Documents\\reports\\annual report 2024.pdf',
        name: 'annual report 2024.pdf',
        folder: false,
        size: 2516582,
        modified: '2026-01-02T03:04:05.000Z'
      },
      { path: 'C:\\work\\app\\src', name: 'src', folder: true }
    ]
  },
  args: argsView({ query: 'report 2024' }),
  subCalls: []
};

const statusBlock = {
  callId: 'call_status',
  kind: 'result',
  content: [{ type: 'text', text: 'Everything 1.4.1.1032 is available.' }],
  isError: false,
  meta: {
    version: 1,
    available: true,
    platform: 'win32-x64',
    sdkDll: 'C:\\plugins\\everything-plugin\\native\\Everything64.dll',
    clientVersion: '1.4.1.1032',
    databaseLoaded: true,
    indexedItems: 2784085
  },
  args: argsView({}),
  subCalls: []
};

const unavailableStatusBlock = {
  callId: 'call_status_down',
  kind: 'result',
  content: [{ type: 'text', text: 'Everything is unavailable (win32-x64).' }],
  isError: false,
  meta: {
    version: 1,
    available: false,
    platform: 'win32-x64',
    sdkDll: 'C:\\plugins\\everything-plugin\\native\\Everything64.dll',
    error: 'IPC error 2',
    hint: 'Start Everything.exe, or set "autoStart": true in the everything plugin config.'
  },
  args: argsView({}),
  subCalls: []
};

const errorBlock = {
  callId: 'call_err',
  kind: 'result',
  content: [{ type: 'text', text: 'Error: Everything search failed: Everything is not running (Everything 客户端未运行).' }],
  isError: true,
  args: argsView({ query: 'needle' }),
  subCalls: []
};

const preparingBlock = {
  callId: 'call_pending',
  phase: 'preparing',
  name: 'everything_search',
  args: argsView({ query: 'rep' }),
  subCalls: []
};

const propsFor = (key, block, phase, open) => ({
  callId: block.callId,
  toolName: key,
  phase,
  block,
  cwd: 'C:\\work',
  home: 'C:\\Users\\keyblue',
  openFile: () => {},
  inspect: () => {},
  loadImage: () => {},
  useDisclosure: disclosure(open)
});
//#endregion

const search = byKey.get('everything_search').component;
const status = byKey.get('everything_status').component;

const collapsedSearch = search(propsFor('everything_search', searchBlock, 'result', false));
const collapsedText = textOf(collapsedSearch);
check('search collapsed row names the tool', collapsedText.includes('Everything 搜索'), collapsedText.slice(0, 160));
check('search collapsed row shows the query', collapsedText.includes('report 2024'));
check('search collapsed row shows the returned/total counter', collapsedText.includes('2/1,234'), collapsedText.slice(0, 200));
check('search collapsed row hides the result list', !collapsedText.includes('annual report 2024.pdf'));

const expandedSearch = search(propsFor('everything_search', searchBlock, 'result', true));
const expandedText = textOf(expandedSearch);
check('search card lists a file name when open', expandedText.includes('annual report 2024.pdf'));
check('search card repeats the query chip when open', expandedText.includes('report 2024'));
check('search card compacts the parent path', expandedText.includes('C:\\…\\Documents\\reports'), expandedText.slice(0, 500));
check('search card states the sort order', expandedText.includes('修改时间') && expandedText.includes('降序'), expandedText.slice(-400));
check('search card formats the byte size', expandedText.includes('2.4 MB'), expandedText.slice(0, 500));
check('search card marks the folder row with a slash', expandedText.includes('src/'));
check('search card labels folder rows', expandedText.includes('文件夹'));
check('search card discloses truncation in the footer', expandedText.includes('提高 max'), expandedText.slice(-300));
check('search card shows the match totals', expandedText.includes('1,234 项匹配'), expandedText.slice(0, 500));

const statusCollapsed = textOf(status(propsFor('everything_status', statusBlock, 'result', false)));
check('status row names the tool', statusCollapsed.includes('Everything 状态'), statusCollapsed.slice(0, 160));
check('status row names the availability state', statusCollapsed.includes('可用'), statusCollapsed.slice(0, 200));
check('status row carries one index counter', statusCollapsed.includes('2,784,085 项'), statusCollapsed.slice(0, 200));
check('status row leaves the version to the body', !statusCollapsed.includes('1.4.1.1032'), statusCollapsed.slice(0, 200));

const statusExpanded = textOf(status(propsFor('everything_status', statusBlock, 'result', true)));
check('status card lists the index state', statusExpanded.includes('索引状态') && statusExpanded.includes('就绪'));
check('status card lists indexed items with separators', statusExpanded.includes('2,784,085'), statusExpanded.slice(0, 400));
check('status card lists the SDK DLL path', statusExpanded.includes('Everything64.dll'));
check('status card lists the platform', statusExpanded.includes('win32-x64'));

const statusDown = textOf(status(propsFor('everything_status', unavailableStatusBlock, 'result', true)));
check('not-running status card names the state', statusDown.includes('未运行'), statusDown.slice(0, 300));
check('not-running status card shows the recorded error', statusDown.includes('IPC error 2'), statusDown.slice(0, 400));
check('not-running status card shows the fix hint', statusDown.includes('autoStart'), statusDown.slice(-400));
check('not-running status card is not "available"', !statusDown.includes('可用'), statusDown.slice(0, 200));

const quietSearch = textOf(search(propsFor('everything_search', { ...searchBlock, meta: undefined }, 'result', true)));
check('search card falls back to the recorded result', quietSearch.includes('Showing 2 of 1234 matches'));

const failed = textOf(search(propsFor('everything_search', errorBlock, 'result', true)));
check('failed search row shows the recorded failure line', failed.includes('Everything is not running'), failed.slice(0, 240));
check('failed search row flags the missing client', failed.includes('未运行'), failed.slice(0, 240));
check('failed search card offers the autoStart fix', failed.includes('"autoStart": true'), failed.slice(-400));

const running = textOf(search(propsFor('everything_search', preparingBlock, 'preparing', false)));
check('preparing search row shows the partial query', running.includes('rep'), running.slice(0, 160));
check('preparing search row is not expandable', !running.includes('annual report'));

const emptySearchBlock = {
  callId: 'call_empty',
  kind: 'result',
  content: [{ type: 'text', text: 'No files or folders matched "zzz" (0 matches).' }],
  isError: false,
  meta: { version: 1, query: 'zzz', total: 0, returned: 0, truncated: false, sort: 'name', descending: false, shown: 0, results: [] },
  args: argsView({ query: 'zzz' }),
  subCalls: []
};
const emptyRow = textOf(search(propsFor('everything_search', emptySearchBlock, 'result', false)));
check('empty search row says there are no matches', emptyRow.includes('无匹配'), emptyRow.slice(0, 200));
const emptyBody = textOf(search(propsFor('everything_search', emptySearchBlock, 'result', true)));
check('empty search card explains how to widen the query', emptyBody.includes('没有匹配的文件或文件夹') && emptyBody.includes('通配符'), emptyBody.slice(-400));

const manyRows = [];
for (let index = 0; index < 20; index += 1) {
  manyRows.push({
    path: `C:\\data\\f${index}.md`,
    name: `f${index}.md`,
    folder: false,
    size: 100 + index,
    modified: '2026-01-02T03:04:05.000Z'
  });
}
const manyBlock = {
  callId: 'call_many',
  kind: 'result',
  content: [{ type: 'text', text: 'Showing 20 of 20 matches.' }],
  isError: false,
  meta: {
    version: 1,
    query: 'f',
    total: 20,
    returned: 20,
    truncated: false,
    sort: 'name',
    descending: false,
    shown: 20,
    results: manyRows
  },
  args: argsView({ query: 'f' }),
  subCalls: []
};
const manyBody = textOf(search(propsFor('everything_search', manyBlock, 'result', true)));
check('search card folds the list at 8 lines', manyBody.includes('f7.md') && !manyBody.includes('f8.md'), manyBody.slice(0, 300));
check('search card says how many rows it folded', manyBody.includes('仅显示前 8 项（共返回 20 项）'), manyBody.slice(-300));
check('search card reports the visible/total counter', manyBody.includes('显示 8/20'), manyBody.slice(0, 300));

const interruptedBlock = {
  callId: 'call_stop',
  kind: 'result',
  content: [{ type: 'text', text: 'The command was interrupted.' }],
  isError: true,
  error: { code: 'interrupted', message: 'interrupted' },
  args: argsView({ query: 'needle' }),
  subCalls: []
};
const stopped = textOf(search(propsFor('everything_search', interruptedBlock, 'result', true)));
check('interrupted search row is treated as a failure', stopped.includes('失败'), stopped.slice(0, 240));
check('interrupted search card still offers a fix', stopped.includes('如何修复'), stopped.slice(-300));

const statusErrorBlock = {
  callId: 'call_status_err',
  kind: 'result',
  content: [{ type: 'text', text: 'Error: Everything SDK worker exited unexpectedly' }],
  isError: true,
  args: argsView({}),
  subCalls: []
};
const statusError = textOf(status(propsFor('everything_status', statusErrorBlock, 'result', true)));
check('failed status row names the failure', statusError.includes('状态检查失败'), statusError.slice(0, 240));
check('failed status card repeats the recorded message', statusError.includes('Everything SDK worker exited unexpectedly'));
check('failed status card offers a fix', statusError.includes('如何修复'), statusError.slice(-300));

const statusFallbackBlock = {
  callId: 'call_status_plain',
  kind: 'result',
  content: [{ type: 'text', text: 'Everything 1.4.1.1032 is available and the index is ready.' }],
  isError: false,
  args: argsView({}),
  subCalls: []
};
const statusFallback = textOf(status(propsFor('everything_status', statusFallbackBlock, 'result', true)));
check('status card falls back to the recorded text', statusFallback.includes('Everything 1.4.1.1032 is available'), statusFallback.slice(0, 300));
check('status fallback puts the recorded line in the row', !statusFallback.includes('状态检查失败'), statusFallback.slice(0, 200));

const boundaryElement = search(propsFor('everything_search', searchBlock, 'result', false));
check('each card render is wrapped in a crash boundary', boundaryElement.render?.name === 'CardBoundary', boundaryElement.render?.name);
const Boundary = boundaryElement.render;
const crashed = new Boundary({ cardProps: propsFor('everything_search', searchBlock, 'result', false) });
crashed.state = { failed: true };
const crashedText = textOf(crashed.render());
check('crash boundary degrades to a plain row', crashedText.includes('Everything 搜索'), crashedText.slice(0, 160));
check('crash boundary keeps the recorded result line', crashedText.includes('Showing 2 of 1234'), crashedText.slice(0, 200));

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'}: ${failures} failure(s)`);
if (failures === 0) {
  console.log('\ncollapsed row previews (separator layout):');
  console.log('  search ok     :', textOf(search(propsFor('everything_search', searchBlock, 'result', false))));
  console.log('  search empty  :', textOf(search(propsFor('everything_search', emptySearchBlock, 'result', false))));
  console.log('  search failed :', textOf(search(propsFor('everything_search', errorBlock, 'result', false))));
  console.log('  status ok     :', textOf(status(propsFor('everything_status', statusBlock, 'result', false))));
  console.log('  status down   :', textOf(status(propsFor('everything_status', unavailableStatusBlock, 'result', false))));
}
process.exit(failures === 0 ? 0 : 1);
