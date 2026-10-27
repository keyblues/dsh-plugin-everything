// DeepSeek Harness Host plugin: voidtools Everything file search.
//
// The Everything index lives inside the local Everything client. This plugin
// talks to it through the official Everything SDK DLL, loaded with a vendored
// N-API FFI module (koffi) inside a worker thread. The worker serialises SDK
// calls, so a hung Everything IPC reply cannot block the Harness Host loop.
//
// Tools:
//   everything_search - instant file/folder name search over every indexed volume
//   everything_status - availability, client version, index size, diagnostics

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKER_FILE = path.join(HERE, 'sdk-worker.cjs');
const KOFFI_FILE = path.join(HERE, 'vendor', 'koffi', 'index.cjs');
const BUNDLED_DLL = path.join(HERE, 'native', 'Everything64.dll');
const DEFAULT_EVERYTHING_EXE = 'C:\\Program Files\\Everything\\Everything.exe';
const SUPPORTED = process.platform === 'win32' && process.arch === 'x64';
const PLATFORM = `${process.platform}-${process.arch}`;
const MAX_RESULTS_CEILING = 500;

/** Everything 1.4 sort constants (ascending; descending is the next value). */
const SORTS = {
  name: 1,
  path: 3,
  size: 5,
  'date-created': 11,
  'date-modified': 13,
  recent: 21
};

const NOT_RUNNING_HINT =
  'Everything is not running (Everything 客户端未运行). Start Everything.exe, or set "autoStart": true in the everything plugin config.';

export const inject = ['tools'];
export const name = 'everything';

/**
 * One worker-thread bridge to the Everything SDK DLL.
 * Requests are serialised; a timeout terminates the worker so a stuck SDK call
 * cannot poison later queries.
 */
class SdkBridge {
  constructor(options) {
    this.dllPath = options.dllPath;
    this.koffiPath = KOFFI_FILE;
    this.timeoutMs = options.queryTimeoutMs;
    this.worker = null;
    this.starting = null;
    this.pending = new Map();
    this.nextId = 0;
    this.disposed = false;
  }

  async ensureWorker() {
    if (this.disposed) throw new Error('Everything SDK bridge is disposed');
    if (this.worker !== null) return this.worker;
    if (this.starting === null) {
      this.starting = (async () => {
        const worker = new Worker(WORKER_FILE, {
          name: 'everything-sdk',
          workerData: { dllPath: this.dllPath, koffiPath: this.koffiPath }
        });
        worker.on('message', (message) => {
          this.settle(message);
        });
        worker.on('error', (error) => {
          this.failAll(error instanceof Error ? error : new Error(String(error)));
        });
        worker.on('exit', () => {
          if (this.worker === worker) this.worker = null;
          this.failAll(new Error('Everything SDK worker exited unexpectedly'));
        });
        worker.unref();
        this.worker = worker;
        return worker;
      })();
    }
    try {
      return await this.starting;
    } finally {
      this.starting = null;
    }
  }

  settle(message) {
    if (message === null || typeof message !== 'object') return;
    const entry = this.pending.get(message.id);
    if (entry === undefined) return;
    clearTimeout(entry.timer);
    this.pending.delete(message.id);
    entry.resolve(message);
  }

  failAll(error) {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.pending.clear();
  }

  /** Terminate the current worker (used on timeout) so the next request starts clean. */
  reset(error) {
    const worker = this.worker;
    this.worker = null;
    this.failAll(error);
    if (worker !== null) void worker.terminate().catch(() => {});
  }

  async request(message) {
    const worker = await this.ensureWorker();
    const id = ++this.nextId;
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        const error = new Error(`Everything SDK request timed out after ${this.timeoutMs} ms`);
        error.code = 'TIMEOUT';
        this.reset(error);
        reject(error);
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        worker.postMessage({ id, ...message });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  async dispose() {
    this.disposed = true;
    const worker = this.worker;
    this.worker = null;
    this.failAll(new Error('Everything SDK bridge disposed'));
    if (worker !== null) {
      try {
        await worker.terminate();
      } catch {
        // Worker already gone.
      }
    }
  }
}

function normalizeConfig(raw) {
  const config = raw !== null && typeof raw === 'object' ? raw : {};
  const integer = (value, fallback, min, max) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(number)));
  };
  const text = (value, fallback) => (typeof value === 'string' && value.trim() !== '' ? path.resolve(value.trim()) : fallback);
  return {
    maxResults: integer(config.maxResults, 50, 1, MAX_RESULTS_CEILING),
    queryTimeoutMs: integer(config.queryTimeoutMs, 10000, 500, 120000),
    autoStart: config.autoStart === true,
    everythingPath: text(config.everythingPath, DEFAULT_EVERYTHING_EXE),
    sdkPath: text(config.sdkPath, BUNDLED_DLL)
  };
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function failureError(reply) {
  if (reply.errorCode === 'IPC') {
    return new Error(`Everything search failed: ${NOT_RUNNING_HINT}`);
  }
  if (reply.errorCode === 'SDK_LOAD_FAILED') {
    return new Error(
      `Everything SDK DLL could not be loaded: ${reply.error ?? 'unknown error'}. Verify native/Everything64.dll exists and the Harness runs on Windows x64.`
    );
  }
  if (reply.errorCode === 'TIMEOUT') {
    return new Error(reply.error ?? 'Everything search timed out');
  }
  return new Error(`Everything SDK error${reply.lastError === undefined ? '' : ` ${reply.lastError}`}: ${reply.error ?? 'unknown error'}`);
}

async function startEverythingClient(executable) {
  if (!fs.existsSync(executable)) return false;
  try {
    const child = spawn(executable, [], { detached: true, stdio: 'ignore', windowsHide: false });
    child.unref();
  } catch {
    return false;
  }
  await delay(2500);
  return true;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

function renderSearch(args, value) {
  const query = JSON.stringify(value.query);
  if (value.returned === 0) {
    return [{ type: 'text', text: `No files or folders matched ${query} (0 matches).` }];
  }
  const header = `Showing ${value.returned} of ${value.total} match${value.total === 1 ? '' : 'es'} for ${query}${value.truncated ? ' (truncated)' : ''}.`;
  const lines = [header];
  for (const item of value.results) {
    if (item.folder) {
      lines.push(`- [dir] ${item.path}${item.modified === undefined ? '' : ` (${item.modified})`}`);
      continue;
    }
    const meta = [];
    const size = formatBytes(item.size);
    if (size !== undefined) meta.push(size);
    if (item.modified !== undefined) meta.push(item.modified);
    lines.push(meta.length === 0 ? `- ${item.path}` : `- ${item.path} (${meta.join(', ')})`);
  }
  return [{ type: 'text', text: lines.join('\n') }];
}

function renderStatus(args, value) {
  if (!value.available) {
    const lines = [`Everything is unavailable (${value.platform}).`];
    if (value.error !== undefined) lines.push(`Error: ${value.error}`);
    if (value.hint !== undefined) lines.push(value.hint);
    lines.push(`SDK DLL: ${value.sdkDll}`);
    return [{ type: 'text', text: lines.join('\n') }];
  }
  const lines = [
    `Everything ${value.clientVersion ?? '(unknown version)'} is available and the index is ${value.databaseLoaded === false ? 'still loading' : 'ready'}.`,
    `Indexed items: ${value.indexedItems === undefined ? 'unknown' : value.indexedItems}.`,
    `SDK DLL: ${value.sdkDll}`
  ];
  return [{ type: 'text', text: lines.join('\n') }];
}

function buildSearchTool(options) {
  const { bridge, config } = options;
  const sortNames = Object.keys(SORTS);
  return {
    name: 'everything_search',
    description:
      'Instant filename search over every volume indexed by the local voidtools Everything client. ' +
      'Locate files anywhere on disk instead of walking directories, then read/grep to inspect contents. ' +
      'Query syntax: space = AND, | = OR, ! = exclude, quotes group spaces, * ? = wildcards; ' +
      'filters: ext:, file:, folder:, path:, size:, dm:, regex:; \\ prefix matches paths.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: {
          type: 'string',
          description: 'Everything query, e.g. "report 2024 ext:pdf" or "folder:node_modules".'
        },
        max: {
          type: 'integer',
          description: `Maximum results, 1-${MAX_RESULTS_CEILING}; defaults to the plugin config (${config.maxResults}).`
        },
        sort: {
          type: 'string',
          enum: sortNames,
          description: 'Sort order; defaults to name.'
        },
        descending: {
          type: 'boolean',
          description: 'Reverse the sort order.'
        }
      },
      required: ['query']
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string' },
          total: { type: 'integer' },
          returned: { type: 'integer' },
          truncated: { type: 'boolean' },
          results: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                path: { type: 'string' },
                name: { type: 'string' },
                folder: { type: 'boolean' },
                size: { type: 'integer' },
                modified: { type: 'string' }
              },
              required: ['path', 'name', 'folder']
            }
          }
        },
        required: ['query', 'total', 'returned', 'truncated', 'results']
      },
      render: renderSearch
    },
    presentCall(args) {
      const requested = args.query;
      return {
        card: 'generic',
        title: `Search files: ${typeof requested === 'string' && requested !== '' ? requested : '(all items)'}`,
        kind: 'search',
        rawInput: { query: args.query, max: args.max, sort: args.sort, descending: args.descending }
      };
    },
    async execute(args) {
      if (!SUPPORTED) {
        throw new Error(`Everything is only supported on Windows x64; this Harness runs on ${PLATFORM}.`);
      }
      const query = typeof args.query === 'string' ? args.query : '';
      const max = Math.min(
        MAX_RESULTS_CEILING,
        Math.max(1, Number.isFinite(Number(args.max)) ? Math.trunc(Number(args.max)) : config.maxResults)
      );
      const sortName = typeof args.sort === 'string' && Object.hasOwn(SORTS, args.sort) ? args.sort : 'name';
      const sort = SORTS[sortName] + (args.descending === true ? 1 : 0);
      const message = { type: 'query', query, max, sort };
      let reply = await bridge.request(message);
      if (!reply.ok && reply.errorCode === 'IPC' && config.autoStart) {
        if (await startEverythingClient(config.everythingPath)) reply = await bridge.request(message);
      }
      if (!reply.ok) throw failureError(reply);
      const results = Array.isArray(reply.results) ? reply.results : [];
      const total = Number.isFinite(reply.total) ? reply.total : results.length;
      return {
        query,
        total,
        returned: results.length,
        truncated: total > results.length,
        results
      };
    }
  };
}

function buildStatusTool(options) {
  const { bridge, config } = options;
  return {
    name: 'everything_status',
    description:
      'Check the local voidtools Everything client: availability, version, indexed item count, SDK DLL path. ' +
      'Use when a search fails or the user asks whether Everything is ready.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          available: { type: 'boolean' },
          platform: { type: 'string' },
          sdkDll: { type: 'string' },
          clientVersion: { type: 'string' },
          databaseLoaded: { type: 'boolean' },
          indexedItems: { type: 'integer' },
          error: { type: 'string' },
          hint: { type: 'string' }
        },
        required: ['available', 'platform', 'sdkDll']
      },
      render: renderStatus
    },
    presentCall() {
      return { card: 'generic', title: 'Check Everything status', kind: 'other' };
    },
    async execute() {
      const base = { platform: PLATFORM, sdkDll: config.sdkPath };
      if (!SUPPORTED) {
        return {
          available: false,
          ...base,
          error: 'Everything is only supported on Windows x64.',
          hint: 'Install Everything for Windows x64 and run the Harness on Windows x64.'
        };
      }
      let reply;
      try {
        reply = await bridge.request({ type: 'status' });
      } catch (error) {
        return {
          available: false,
          ...base,
          error: error instanceof Error ? error.message : String(error),
          hint: NOT_RUNNING_HINT
        };
      }
      if (!reply.ok && reply.errorCode === 'IPC' && config.autoStart) {
        if (await startEverythingClient(config.everythingPath)) {
          try {
            reply = await bridge.request({ type: 'status' });
          } catch {
            // Keep the original reply below.
          }
        }
      }
      if (!reply.ok) {
        const value = { available: false, ...base, error: reply.error ?? `SDK error ${reply.lastError ?? 'unknown'}` };
        if (reply.errorCode === 'IPC') value.hint = NOT_RUNNING_HINT;
        return value;
      }
      const value = {
        available: true,
        ...base,
        databaseLoaded: reply.databaseLoaded === true
      };
      if (typeof reply.clientVersion === 'string') value.clientVersion = reply.clientVersion;
      if (Number.isFinite(reply.indexedItems)) value.indexedItems = reply.indexedItems;
      const dllPath = typeof reply.dllPath === 'string' ? reply.dllPath : undefined;
      if (dllPath !== undefined) value.sdkDll = dllPath;
      return value;
    }
  };
}

export function apply(ctx, rawConfig) {
  const config = normalizeConfig(rawConfig);
  const bridge = new SdkBridge({ dllPath: config.sdkPath, queryTimeoutMs: config.queryTimeoutMs });
  ctx.effect(() => () => bridge.dispose(), 'everything sdk bridge');
  const searchTool = buildSearchTool({ bridge, config });
  const statusTool = buildStatusTool({ bridge, config });
  ctx.effect(() => ctx.tools.register(searchTool), 'everything search tool');
  ctx.effect(() => ctx.tools.register(statusTool), 'everything status tool');
}
