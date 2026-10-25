<p align="center">
  <img src="icon.svg" width="96" height="96" alt="dsh-plugin-everything icon" />
</p>

<h1 align="center">dsh-plugin-everything</h1>

<p align="center">
  <a href="https://github.com/topics/dsh-plugin"><img alt="DSH Plugin" src="https://img.shields.io/badge/DSH%20Plugin-dsh--plugin-4D6BFE?style=flat-square"></a>
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img alt="DeepSeek Harness" src="https://img.shields.io/badge/DeepSeek%20Harness-compatible-4D6BFE?style=flat-square"></a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%20x64-0078D4?style=flat-square">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green?style=flat-square"></a>
  <a href="https://github.com/keyblues/dsh-plugin-everything/releases"><img alt="Release" src="https://img.shields.io/github/v/release/keyblues/dsh-plugin-everything?style=flat-square"></a>
</p>

<p align="center">
  A <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> (DSH) plugin that gives the agent
  instant whole-disk file search through the local <a href="https://www.voidtools.com/">voidtools Everything</a> NTFS index.
  <br />
  中文文档：<a href="README.md">README.md</a>
</p>

> **DSH plugin identifier**: this repository is a DeepSeek Harness plugin bundle. Its GitHub
> topic is [`dsh-plugin`](https://github.com/topics/dsh-plugin), `package.json` declares
> `dsh.bundle.patch` and the `dsh-plugin` keyword, so DSH community catalogs can discover it by topic.

## Why

By default an agent can only walk directories inside its workspace, which is slow for cross-drive
lookups, installed tools, or old downloads. This plugin exposes the Everything index as model tools:
one call returns full paths plus size and modified time for matches across every indexed volume,
usually in a few milliseconds.

## Requirements

- DeepSeek Harness on **Windows x64**.
- [voidtools Everything](https://www.voidtools.com/) installed **and running** (1.4+, tested with
  1.4.1.1032). The index lives inside the Everything process; the plugin reads it over the
  Everything SDK IPC. Without the client there is nothing to query.
- No Everything Service and no HTTP/ETP server are required.
- If Everything is not running the tools return a clear hint; enable `autoStart` in the config to
  let the plugin launch it.

## Install

### Option 1: release tarball (recommended)

1. Download `dsh-plugin-everything-1.0.0.tgz` from
   [Releases](https://github.com/keyblues/dsh-plugin-everything/releases).
2. Ask the DSH agent to run (use your local path):

   > install the bundle with plugin_manager `install_bundle` target `C:\Downloads\dsh-plugin-everything-1.0.0.tgz`

   Or add it through Settings → Plugins.

### Option 2: from source

```powershell
git clone https://github.com/keyblues/dsh-plugin-everything.git
```

Then ask the agent:

> install the bundle with plugin_manager `install_bundle` target `C:\path\to\dsh-plugin-everything`

The `everything_search` and `everything_status` tools become available immediately; no Harness
restart is needed.

### Uninstall

`plugin_manager remove_bundle target=dsh-plugin-everything`, or disable/remove it in
Settings → Plugins.

## Tools

| Tool | Purpose |
| --- | --- |
| `everything_search` | Search files/folders across all indexed volumes with Everything syntax; returns path, size, modified time and total match count |
| `everything_status` | Check whether Everything is reachable, its version, the number of indexed items, and the SDK DLL path |

`everything_search` parameters:

| Parameter | Type | Description |
| --- | --- | --- |
| `query` | string (required) | Everything search expression |
| `max` | integer | Result limit 1–500, defaults to the plugin config `maxResults` (50) |
| `sort` | enum | `name` (default) / `path` / `size` / `date-created` / `date-modified` / `recent` |
| `descending` | boolean | Reverse the sort order, default `false` |

Everything syntax examples:

```
notepad.exe                          # name contains notepad.exe
report 2024 ext:pdf                  # 2024 + PDF
file:*.md path:"C:\work"             # markdown under a directory
folder:node_modules                  # folders named node_modules
C:\Windows\ notepad                  # trailing backslash = scope to that folder
size:>10mb dm:today                  # larger than 10 MB, modified today
中文文件                              # Unicode file names
```

See [Everything search syntax](https://www.voidtools.com/support/everything/searching/).

## Configuration

Override the plugin row in the profile `cordis.patch.yml` (user patch layer):

```yaml
- id: everything
  config:
    maxResults: 50          # default result limit (1-500)
    queryTimeoutMs: 10000   # per-query timeout; terminates the SDK worker, rebuilt on next query
    autoStart: false        # launch Everything when it is not running
    everythingPath: 'C:\Program Files\Everything\Everything.exe'
    sdkPath: ''             # empty = bundled native/Everything64.dll
```

## Architecture

```
Agent tool call
   │
   ▼
index.js  ── worker_threads ──▶  sdk-worker.cjs
(tool registration/config)       │  koffi (N-API FFI)
                                 ▼
                          native/Everything64.dll  (official Everything SDK)
                                 │  WM_COPYDATA IPC
                                 ▼
                          Everything.exe NTFS index
```

- **SDK**: the official `Everything64.dll` (unmodified, from
  [Everything-SDK.zip](https://www.voidtools.com/Everything-SDK.zip)) is called through
  `Everything_SetSearchW` / `Everything_QueryW` / `Everything_GetResult*` — structured paths,
  sizes and FILETIME, no text parsing.
- **FFI**: the Harness Host is an Electron 44 / Node 24 runtime (Node-API 10), so a regular Node
  native addon ABI would not match; the plugin uses the N-API FFI module koffi 3.3.4 with its
  win32-x64 prebuilt binary.
- **Worker isolation**: `Everything_QueryW(true)` waits on the Everything IPC reply without a
  native timeout, so queries run in a worker thread with our own timeout. A timed-out worker is
  terminated and rebuilt on the next query, keeping the Host event loop responsive.
- The bundle is self-contained: koffi and the SDK DLL ship inside it — no network access or
  compilation at install time.

## Compatibility and limits

- **Windows x64 only**; other platforms get an explicit error from the tools.
- Requires a running Everything client; tested with 1.4.1, Everything 1.5 alpha untested.
- Results are an Everything index snapshot; very recent file changes may take a second or two.
- Results include `$Recycle.Bin`, `WinSxS` and other system directories; exclude them with
  `!$Recycle.Bin` when needed.

## Verification (v1.0.0)

- `install_bundle` reported `application: applied`, `enabled: true`, no warnings.
- Live queries: `notepad.exe` (18 matches), Unicode file names, `path:`/`file:`/`folder:`/`ext:`
  syntax, size-descending order, truncation counts, empty results and `max` clamping all passed.
- Failure path: a missing SDK DLL produces a readable `SDK_LOAD_FAILED` error without crashing
  the Host.
- Packaging: the `npm pack` artifact was unpacked and its worker + DLL + koffi loaded and queried
  independently.
- Display assets: zh/en locale titles/descriptions and `icon.svg` are exported and shipped; icon
  rendering in the GUI still needs a human look (no browser control here).

## License

- Plugin code: [MIT](LICENSE)
- Everything SDK (`native/Everything64.dll`): MIT, Copyright (C) 2016 David Carpenter / voidtools
- koffi / @koromix/koffi-win32-x64: MIT, Copyright (C) Niels Martignène
- Full notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
