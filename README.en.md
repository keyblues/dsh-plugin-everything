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
  <a href="https://www.npmjs.com/package/dsh-plugin-everything"><img alt="npm" src="https://img.shields.io/npm/v/dsh-plugin-everything?style=flat-square"></a>
</p>

<p align="center">
  A <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> (DSH) plugin that gives the agent
  instant whole-disk file search through the local <a href="https://www.voidtools.com/">voidtools Everything</a> NTFS index.
  <br />
  中文文档：<a href="README.md">README.md</a>
</p>

> **DSH plugin identifier**: this repository is a DeepSeek Harness plugin bundle. Its GitHub
> topic is [`dsh-plugin`](https://github.com/topics/dsh-plugin), `package.json` declares
> `dsh.bundle.patch`, the `dsh-plugin` keyword and an `engines.dsh` range for the supported
> DSH versions, so DSH community catalogs can discover it by topic.

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

**TL;DR: in DSH Desktop open Plugins → install task and enter `dsh-plugin-everything`.**
The installer pulls the latest version from the npm registry (currently `1.1.0`); the
`everything_search` / `everything_status` tools appear immediately, no Harness restart needed.

### Option 1: npm package (recommended)

DSH Desktop: Plugins → install task → enter `dsh-plugin-everything`
(use `dsh-plugin-everything@1.1.0` to pin a version).

DSH CLI (desktop profile must be initialized and Desktop fully quit first):

```powershell
dsh plugin --profile desktop add dsh-plugin-everything
```

Update to the latest version by running the same `add` again.

> - npm page: <https://www.npmjs.com/package/dsh-plugin-everything>
> - latest version: `npm view dsh-plugin-everything version`

### Option 2: GitHub release tarball / local `.tgz` (offline, pinned version)

1. Download `dsh-plugin-everything-1.1.0.tgz` from
   [Releases](https://github.com/keyblues/dsh-plugin-everything/releases).
2. Enter that tarball's absolute path in the Desktop installer
   (e.g. `C:\Downloads\dsh-plugin-everything-1.1.0.tgz`), or ask the agent to run
   `plugin_manager install_bundle target=<tgz path>`.

Useful when npm is unavailable or a fixed version must be installed offline.

### Option 3: local source directory (development / debugging)

```powershell
git clone https://github.com/keyblues/dsh-plugin-everything.git
```

Enter the directory's absolute path in the Desktop installer, or ask the agent to run
`plugin_manager install_bundle target=<directory>`. Reinstall after editing the source.

### Inputs accepted by the Desktop installer

| Input | Notes |
| --- | --- |
| `dsh-plugin-everything` | **npm package name (recommended)**: installs the latest version from the npm registry |
| `dsh-plugin-everything@1.1.0` | npm package name with a pinned version |
| `C:\Downloads\dsh-plugin-everything-1.1.0.tgz` | local release tarball / `.tgz` path |
| `C:\path\to\everything-plugin` | local directory (a clone of this repository) |
| `https://github.com/keyblues/dsh-plugin-everything` | GitHub repository address; pnpm still has to reach github.com, so a restricted network fails with `ECONNRESET` — use the “use mainland China mirror” action or one of the inputs above |

The install target is `~/.dsh/profiles/desktop`; the tools appear immediately after installation.

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

## Tool cards (Web UI)

The package ships a Client half, `client.js`, which registers two cards into the Web client's
`tool.call.toolview` slot. `everything_search` and `everything_status` therefore render as dedicated
cards instead of the generic tool row:

| Card | Collapsed row | Expanded body |
| --- | --- | --- |
| **Everything search** | search glyph, title, query, `returned/matched` counter | a totals line (matches / shown / sort / truncation) plus at most 8 hit lines (file/folder glyph, name, containing directory, size and modified time; clicking the name opens the file); extra rows fold into one explanatory line and stay in the model-facing result text |
| **Everything status** | state word, client version / indexed items | left-aligned `state / version / indexed items / index status / platform / SDK DLL` lines; when unavailable, the recorded error plus the `autoStart` hint |

- **Data source:** the Host tool's `output.presentationMeta` projection, persisted with the result.
  The card never re-parses the model-facing result text, so paths containing `(` or `,` cannot be
  misread. The projection carries at most 100 rows to keep the session log small; the full result
  text the model sees is unchanged.
- **Theme:** only `--dsw-alias-*` theme tokens, so light and dark need no separate artwork; row height
  and type scale follow the interface content-font setting.
- **Copy:** Chinese and English through the Client locale dictionary, switching with the UI language.
- **Fallback:** each card renders inside a crash boundary, so a rendering error degrades to one plain
  text row instead of a blank entry.
- **Taking effect:** Host tool changes apply on the next Host load; a new or updated Client half needs
  one Harness restart (or a Web page reload) before the browser loads the new bundle.

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

## DSH version support

| Item | Value |
| --- | --- |
| Declared range (`engines.dsh`) | `>=0.2.1-rc.2 <0.3.0-0` |
| Tested runtime | DeepSeek Harness **0.2.1-rc.3** (Desktop: Electron 44.7 / Node 24.21 / Node-API 10) |
| Contract parity evidence | `@deepseek-ai/dsh-app-boot`, `dsh-tools`, `dsh-plugin-manager` and `dsh-package-manifest` publish byte-identical artifacts at 0.2.1-rc.2 and rc.3; every extension point this plugin uses (bundle patch, the `ctx.tools.register` ToolDefinition, plugin display metadata, install and version checks) is unchanged between them |
| Not covered | **0.2.0 and earlier** (different core package APIs, untested); **0.3.0 and later** (DSH is a developer preview, the range must be re-validated before widening) |

The npm `latest` tag for DSH is currently `0.2.1-rc.2` and the Desktop runtime is `0.2.1-rc.3` —
both inside the declared range.

DSH enforces the declaration in two places (built into app-boot / plugin-manager in 0.2.1):

- **Install**: local-path and registry specs are checked before pnpm runs and refused with
  `incompatible-version`; tarball and git specs are judged after installation and rolled back.
- **Startup**: incompatible bundles are skipped (`skippedBundles`) and incompatible plugin rows
  are disabled — their modules are never imported.

To run anyway, grant an exact-version exemption (this does not widen the declared range):

```powershell
dsh plugin --profile desktop allow-version dsh-plugin-everything@1.1.0 --dsh-version <runtime version> --accept-risk
```

or use `set_version_exemption` in the plugin manager after the user accepts the risk. After a DSH
upgrade, check for a compatible plugin release before restarting or reinstalling.

## Compatibility and limits

- **Windows x64 only**; other platforms get an explicit error from the tools.
- Requires a running Everything client; tested with 1.4.1, Everything 1.5 alpha untested.
- Results are an Everything index snapshot; very recent file changes may take a second or two.
- Results include `$Recycle.Bin`, `WinSxS` and other system directories; exclude them with
  `!$Recycle.Bin` when needed.

## Verification

### v1.1.0 (tool cards)

- **Static checks:** `node --check client.js` passes, `package.json` parses, and the `dsh.client`
  declaration (`platform: "web"`, `immediately`, `inject: ["@deepseek-ai/dsh-client-ui-tool"]`) plus
  `exports["./client"]` match what `dsh-client-modules` parses at Host boot.
- **Smoke tests** (`npm test`): the Host side exercises the `presentationMeta` projection (fields,
  100-row cap, malformed-row filtering, available/unavailable/failed status, model-facing output
  unchanged); the Client side executes the bundle headlessly, checks both registered keys, the
  stylesheet and zh/en dictionary parity, then renders collapsed/expanded, query, counters,
  truncation, empty, failed, not-running, fallback and crash-boundary states.
- **Runtime:** the Host caches each package's `dsh.client` verdict (`pkgMeta`) until restart, so a
  new Client half needs one DSH Desktop restart. Afterwards run `node scripts/verify-live.mjs`
  (reads `$env:DSH_WEB_URL`) to prove V1 a `dsh-plugin-everything` row in the plugin graph and
  V2 that its bundle URL serves the `window.__ModuleLoader__` registration.
- **Visual check:** no browser control is available here, so the cards' look still needs a human
  pass in the GUI; row height (`24px + content-font delta`), type scale
  (`--dsh-content-font-size-secondary`), the 2px separator dot and all colours follow the
  first-party ToolRow and `--dsw-alias-*` tokens, so light/dark switch automatically.

### v1.0.3

- `install_bundle` reported `application: applied`, `enabled: true`, no warnings.
- Live queries: `notepad.exe` (18 matches), Unicode file names, `path:`/`file:`/`folder:`/`ext:`
  syntax, size-descending order, truncation counts, empty results and `max` clamping all passed.
- Failure path: a missing SDK DLL produces a readable `SDK_LOAD_FAILED` error without crashing
  the Host.
- Version declaration: `engines.dsh` passed the install check on 0.2.1-rc.3, and a probe package
  declaring `engines.dsh: ">=99.0.0"` was refused by DSH with `incompatible-version`, proving the
  declaration is enforced.
- Packaging: the `npm pack` artifact was unpacked and its worker + DLL + koffi loaded and queried
  independently.
- Display assets: zh/en locale titles/descriptions and `icon.svg` are exported and shipped; icon
  rendering in the GUI still needs a human look (no browser control here).

## Automated publishing

[`.github/workflows/publish.yml`](.github/workflows/publish.yml) publishes the package to the npm
registry and attaches the packed `.tgz` to the GitHub release. **npm Trusted Publishing** is already
configured (GitHub Actions OIDC, no long-lived token):

```
package:     dsh-plugin-everything
workflow:    publish.yml
repository:  keyblues/dsh-plugin-everything
permissions: publish, stage publish
trust id:    3aa47032-1bb5-4253-a6d6-7f92ca5b19ce
```

Release flow:

```powershell
# 1. bump version in package.json + CHANGELOG
git commit -am "chore(release): vX.Y.Z"
git tag vX.Y.Z
# 2. push the tag to publish
git push origin main --tags
```

The workflow packs the bundle, runs `npm publish` (with provenance), then creates/updates the
GitHub release and uploads the tarball. It can also be started manually from the Actions tab to
publish the version currently in `package.json`.

Fallback without OIDC: `npm login` followed by `npm publish --access public` (2FA required).

## License

- Plugin code: [MIT](LICENSE)
- Everything SDK (`native/Everything64.dll`): MIT, Copyright (C) 2016 David Carpenter / voidtools
- koffi / @koromix/koffi-win32-x64: MIT, Copyright (C) Niels Martignène
- Full notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
