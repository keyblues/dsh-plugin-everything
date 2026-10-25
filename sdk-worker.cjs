// Everything SDK bridge worker.
//
// Runs the official voidtools Everything SDK DLL (Everything64.dll) through the
// vendored N-API FFI module (koffi) inside a worker thread, so a slow or hung
// Everything IPC query can never block the Harness Host event loop.
//
// Protocol: the parent posts { id, type: 'query' | 'status', ... } and the
// worker always answers with { id, ok, ... }. All SDK state lives in this
// worker; the parent serialises requests through one pending map.
'use strict';

const { parentPort, workerData } = require('node:worker_threads');

const REQUEST_FLAGS =
  0x00000001 | // EVERYTHING_REQUEST_FILE_NAME
  0x00000002 | // EVERYTHING_REQUEST_PATH
  0x00000004 | // EVERYTHING_REQUEST_FULL_PATH_AND_FILE_NAME
  0x00000010 | // EVERYTHING_REQUEST_SIZE
  0x00000040; // EVERYTHING_REQUEST_DATE_MODIFIED

const FILETIME_UNIX_EPOCH_DIFF = 116444736000000000n; // 100 ns ticks between 1601-01-01 and 1970-01-01
const TICKS_PER_MS = 10000n;

const ERROR_TEXT = {
  1: 'out of memory',
  2: 'Everything is not running or its IPC endpoint is unavailable',
  3: 'unable to register the SDK window class',
  4: 'unable to create the SDK listener window',
  5: 'unable to create the SDK listener thread',
  6: 'invalid result index',
  7: 'invalid call',
  8: 'invalid request data',
  9: 'invalid parameter'
};

let sdk = null;
let initError = null;

function loadSdk() {
  if (sdk !== null) return sdk;
  if (initError !== null) throw initError;
  try {
    const koffi = require(workerData.koffiPath);
    const lib = koffi.load(workerData.dllPath);
    const fn = (signature) => lib.func(signature);
    sdk = {
      koffi,
      SetSearch: fn('void __stdcall Everything_SetSearchW(const char16_t *text)'),
      SetMatchPath: fn('void __stdcall Everything_SetMatchPath(int enable)'),
      SetMatchCase: fn('void __stdcall Everything_SetMatchCase(int enable)'),
      SetMax: fn('void __stdcall Everything_SetMax(uint32_t max_results)'),
      SetOffset: fn('void __stdcall Everything_SetOffset(uint32_t offset)'),
      SetSort: fn('void __stdcall Everything_SetSort(uint32_t sort)'),
      SetRequestFlags: fn('void __stdcall Everything_SetRequestFlags(uint32_t flags)'),
      Query: fn('int __stdcall Everything_QueryW(int wait)'),
      GetLastError: fn('uint32_t __stdcall Everything_GetLastError()'),
      GetNumResults: fn('uint32_t __stdcall Everything_GetNumResults()'),
      GetTotResults: fn('uint32_t __stdcall Everything_GetTotResults()'),
      IsDBLoaded: fn('int __stdcall Everything_IsDBLoaded()'),
      GetMajorVersion: fn('uint32_t __stdcall Everything_GetMajorVersion()'),
      GetMinorVersion: fn('uint32_t __stdcall Everything_GetMinorVersion()'),
      GetRevision: fn('uint32_t __stdcall Everything_GetRevision()'),
      GetBuildNumber: fn('uint32_t __stdcall Everything_GetBuildNumber()'),
      GetResultFullPathName: fn(
        'uint32_t __stdcall Everything_GetResultFullPathNameW(uint32_t index, _Out_ uint16_t *buffer, uint32_t buffer_size)'
      ),
      IsFolderResult: fn('int __stdcall Everything_IsFolderResult(uint32_t index)'),
      GetResultSize: fn('int __stdcall Everything_GetResultSize(uint32_t index, _Out_ int64_t *size)'),
      GetResultDateModified: fn('int __stdcall Everything_GetResultDateModified(uint32_t index, _Out_ int64_t *time)')
    };
    return sdk;
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    throw initError;
  }
}

function decodeUtf16(buffer) {
  let end = 0;
  while (end < buffer.length && buffer[end] !== 0) end += 1;
  return Buffer.from(buffer.buffer, buffer.byteOffset, end * 2).toString('utf16le');
}

function baseName(fullPath) {
  const slash = Math.max(fullPath.lastIndexOf('\\'), fullPath.lastIndexOf('/'));
  return slash >= 0 ? fullPath.slice(slash + 1) : fullPath;
}

function toNumber(value) {
  if (typeof value === 'bigint') return Number(value);
  return Number(value);
}

function fileTimeToIso(value) {
  try {
    const ticks = typeof value === 'bigint' ? value : BigInt(Math.trunc(Number(value)));
    if (ticks === 0n) return undefined;
    const milliseconds = Number((ticks - FILETIME_UNIX_EPOCH_DIFF) / TICKS_PER_MS);
    if (!Number.isFinite(milliseconds)) return undefined;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  } catch {
    return undefined;
  }
}

function readClientInfo(api) {
  const major = api.GetMajorVersion() >>> 0;
  const minor = api.GetMinorVersion() >>> 0;
  const revision = api.GetRevision() >>> 0;
  const build = api.GetBuildNumber() >>> 0;
  const hasVersion = major + minor + revision + build > 0;
  return {
    clientVersion: hasVersion ? `${major}.${minor}.${revision}.${build}` : undefined,
    databaseLoaded: api.IsDBLoaded() !== 0
  };
}

function failure(lastError, extra) {
  const code = lastError >>> 0;
  return {
    ok: false,
    errorCode: code === 2 ? 'IPC' : 'SDK',
    lastError: code,
    error: ERROR_TEXT[code] ?? `Everything SDK error ${code}`,
    ...extra
  };
}

function runQuery(message) {
  const api = loadSdk();
  api.SetSearch(typeof message.query === 'string' ? message.query : '');
  api.SetMatchPath(message.matchPath ? 1 : 0);
  api.SetMatchCase(message.matchCase ? 1 : 0);
  api.SetRequestFlags(REQUEST_FLAGS);
  api.SetSort(Number.isInteger(message.sort) ? message.sort : 0);
  api.SetOffset(0);
  api.SetMax(Number.isInteger(message.max) && message.max > 0 ? message.max : 50);

  const queried = api.Query(1) !== 0;
  const lastError = api.GetLastError() >>> 0;
  if (!queried) return failure(lastError);

  const info = readClientInfo(api);
  const returned = api.GetNumResults() >>> 0;
  const total = api.GetTotResults() >>> 0;
  const pathBuffer = new Uint16Array(32768);
  const results = [];

  for (let index = 0; index < returned; index += 1) {
    api.GetResultFullPathName(index, pathBuffer, pathBuffer.length);
    const fullPath = decodeUtf16(pathBuffer);
    if (fullPath === '') continue;
    const folder = api.IsFolderResult(index) !== 0;
    const entry = { path: fullPath, name: baseName(fullPath), folder };
    const dateOut = [0];
    if (api.GetResultDateModified(index, dateOut)) {
      const modified = fileTimeToIso(dateOut[0]);
      if (modified !== undefined) entry.modified = modified;
    }
    if (!folder) {
      const sizeOut = [0];
      if (api.GetResultSize(index, sizeOut)) entry.size = toNumber(sizeOut[0]);
    }
    results.push(entry);
  }

  return {
    ok: true,
    lastError: 0,
    clientVersion: info.clientVersion,
    databaseLoaded: info.databaseLoaded,
    total,
    returned,
    results
  };
}

function runStatus() {
  const started = Date.now();
  const api = loadSdk();
  let reply;
  try {
    reply = runQuery({ query: '', max: 1, sort: 0 });
  } catch (error) {
    return {
      ok: false,
      errorCode: 'SDK_CALL_FAILED',
      error: error instanceof Error ? error.message : String(error)
    };
  }
  return {
    ...reply,
    indexedItems: reply.ok ? reply.total : undefined,
    elapsedMs: Date.now() - started,
    dllPath: workerData.dllPath,
    koffiVersion: sdk.koffi.version,
    runtime: { node: process.versions.node, electron: process.versions.electron ?? null, arch: process.arch }
  };
}

parentPort.on('message', (message) => {
  if (message === null || typeof message !== 'object' || typeof message.id !== 'number') return;
  let payload;
  try {
    if (message.type === 'query') {
      payload = runQuery(message);
    } else if (message.type === 'status') {
      payload = runStatus();
    } else {
      payload = { ok: false, errorCode: 'BAD_REQUEST', error: `unknown request type ${String(message.type)}` };
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    payload = {
      ok: false,
      errorCode: initError !== null ? 'SDK_LOAD_FAILED' : 'SDK_CALL_FAILED',
      error: initError !== null ? `Everything SDK DLL failed to load: ${messageText}` : messageText
    };
  }
  parentPort.postMessage({ id: message.id, ...payload });
});
