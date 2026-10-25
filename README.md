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
  给 <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> 智能体加上「全盘秒级找文件」的能力：直接查询本机
  <a href="https://www.voidtools.com/">voidtools Everything</a> 的 NTFS 索引。
  <br />
  English: <a href="README.en.md">README.en.md</a>
</p>

> **DSH 插件标识**：本仓库是一个 DeepSeek Harness 插件（bundle），仓库 topic 为
> [`dsh-plugin`](https://github.com/topics/dsh-plugin)，`package.json` 中声明了
> `dsh.bundle.patch` 与 `dsh-plugin` 关键词，并通过 `engines.dsh` 显式声明支持的
> DSH 版本范围，可被 DSH 社区插件目录按 topic 检索收录。

## 它解决什么问题

Harness 里的 Agent 默认只能在工作区里逐个目录找文件，跨盘、找某个安装目录、找历史
下载时很慢。本插件把 Everything 的索引能力暴露成模型工具：一次查询就能拿到全盘
匹配的完整路径、大小和修改时间，查询耗时通常只有几毫秒。

## 前置条件

- **Windows x64** 上运行 DeepSeek Harness。
- 本机已安装 [voidtools Everything](https://www.voidtools.com/) **并保持运行**（1.4 或更新；
  实测 1.4.1.1032）。索引保存在 Everything 进程内，插件通过 Everything SDK 的 IPC
  读取结果，因此没有安装或没有运行 Everything 时无法工作。
- **不需要**安装 Everything Service，也**不需要**开启 HTTP/ETP 服务器。
- Everything 未运行时，工具会返回明确提示；可在配置里打开 `autoStart` 让插件自动拉起它。

## 安装

### 方式一：Release 安装包（推荐）

1. 从 [Releases](https://github.com/keyblues/dsh-plugin-everything/releases) 下载
   `dsh-plugin-everything-1.0.1.tgz`；
2. 在 DSH 里让 Agent 执行（把路径换成本机实际路径）：

   > 用 plugin_manager 的 install_bundle 安装 `C:\Downloads\dsh-plugin-everything-1.0.1.tgz`

   或者把该文件拖给 DSH 插件管理器（Settings → Plugins）安装。

### 方式二：源码目录安装

```powershell
git clone https://github.com/keyblues/dsh-plugin-everything.git
```

然后让 Agent 执行：

> 用 plugin_manager 的 install_bundle 安装 `C:\path\to\dsh-plugin-everything`

安装完成后，`everything_search` 与 `everything_status` 两个工具立即出现在会话里，
无需重启 Harness。

### 方式三：DSH 桌面端自带安装器

DSH Desktop 的「插件 → 查看安装任务」安装框（字段提示「包名或地址」）支持以下输入：

| 输入 | 说明 |
| --- | --- |
| `C:\path\to\everything-plugin` | **本地目录**（clone 下来的仓库目录）；**现在就能用，不依赖网络** |
| `C:\path\to\dsh-plugin-everything-1.0.1.tgz` | **本地 release 包 / .tgz 路径**；**现在就能用** |
| `dsh-plugin-everything` | npm 包名；需要先发布到 npm registry（发布后最省事） |
| `https://github.com/keyblues/dsh-plugin-everything` | GitHub 仓库地址；安装时 pnpm 仍需直连 github.com，网络受限时会 `ECONNRESET`，可用界面上的「改用国内镜像」或改用包名/本地路径 |

安装位置会显示为 `~/.dsh/profiles/desktop`，装完立即生效（工具直接出现）。

> 本机当前的 `github.com` 直连不稳定（`api.github.com`、npm registry 正常），
> 因此「GitHub 仓库地址」形式容易卡住；请优先用**本地目录 / 本地 tgz**，或等发布后用 **npm 包名**。

### 卸载

让 Agent 执行 `plugin_manager remove_bundle target=dsh-plugin-everything`，
或在 Settings → Plugins 中停用/移除。

## 提供的工具

| 工具 | 作用 |
| --- | --- |
| `everything_search` | 用 Everything 语法搜索全盘文件/文件夹，返回路径、大小、修改时间、命中总数 |
| `everything_status` | 检查 Everything 是否可达、客户端版本、索引条目数、SDK DLL 路径 |

`everything_search` 参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `query` | string（必填） | Everything 搜索表达式 |
| `max` | integer | 返回条数 1–500，默认取插件配置 `maxResults`（50） |
| `sort` | enum | `name`（默认）/ `path` / `size` / `date-created` / `date-modified` / `recent` |
| `descending` | boolean | 是否倒序，默认 `false` |

Everything 语法示例：

```
notepad.exe                          # 文件名包含 notepad.exe
report 2024 ext:pdf                  # 2024 + PDF
file:*.md path:"C:\work"             # 指定目录下的 markdown
folder:node_modules                  # 文件夹名
C:\Windows\ notepad                  # 以反斜杠结尾 = 限定在此目录内
size:>10mb dm:today                  # 大于 10MB 且今天修改
中文文件                              # 中文/Unicode 文件名
```

> 完整语法见 [Everything 搜索语法](https://www.voidtools.com/support/everything/searching/)。

## 配置

安装后可在 profile 的 `cordis.patch.yml`（用户 patch 层）覆盖本插件行：

```yaml
- id: everything
  config:
    maxResults: 50          # 默认返回条数（1-500）
    queryTimeoutMs: 10000   # 单次查询超时；超时会终止 SDK worker，下次查询自动重建
    autoStart: false        # Everything 未运行时是否自动启动
    everythingPath: 'C:\Program Files\Everything\Everything.exe'
    sdkPath: ''             # 留空使用插件自带的 native/Everything64.dll
```

`autoStart: true` 时，搜索遇到 IPC 不可用（Everything 未运行）会启动
`everythingPath`，等待约 2.5 秒后重试一次（仅当该 exe 存在）。

## 实现架构

```
Agent tool call
   │
   ▼
index.js  ── worker_threads ──▶  sdk-worker.cjs
（工具注册/配置/超时）            │  koffi (N-API FFI)
                                 ▼
                          native/Everything64.dll  (官方 Everything SDK)
                                 │  WM_COPYDATA IPC
                                 ▼
                          Everything.exe 的 NTFS 索引
```

- **SDK**：使用官方 Everything SDK 的 `Everything64.dll`（原样取自
  [Everything-SDK.zip](https://www.voidtools.com/Everything-SDK.zip)），调用
  `Everything_SetSearchW` / `Everything_QueryW` / `Everything_GetResult*` 等导出函数，
  结构化拿到路径、大小与 FILETIME，不做文本解析。
- **FFI**：Harness Host 是 Electron 44 / Node 24 运行时（Node-API 10），普通 Node 原生扩展
  ABI 不匹配，因此使用 N-API FFI 模块 koffi 3.3.4（以及 win32-x64 预编译二进制）。
- **Worker 隔离**：SDK 的 `Everything_QueryW(true)` 内部会无限等待 Everything 的 IPC
  回复；查询放在 worker 线程并设超时，避免卡死 Harness 的 Host 事件循环。超时后终止
  worker，下一次查询自动重建。
- 插件为自包含 bundle：koffi 与 SDK DLL 都随包分发，**安装时不需要联网、不需要编译**。

## DSH 版本支持

| 项目 | 说明 |
| --- | --- |
| 声明范围（`engines.dsh`） | `>=0.2.1-rc.2 <0.3.0-0` |
| 实测版本 | DeepSeek Harness **0.2.1-rc.3**（Desktop：Electron 44.7 / Node 24.21 / Node-API 10） |
| 契约一致性依据 | `@deepseek-ai/dsh-app-boot`、`dsh-tools`、`dsh-plugin-manager`、`dsh-package-manifest` 在 0.2.1-rc.2 与 rc.3 的发布产物逐字节一致；插件用到的扩展点（bundle patch、`ctx.tools.register` 的 ToolDefinition、插件显示元数据、安装与版本校验）在这两个版本间没有差异 |
| 不在范围内 | **0.2.0 及更早**（核心包 API 不同，未验证）；**0.3.0 及以后**（DSH 仍为 developer preview，需重新验证后再放宽） |

npm 上 DSH 的 `latest` 标签当前是 `0.2.1-rc.2`，Desktop 运行时是 `0.2.1-rc.3`，都在声明范围内。

DSH 会在两处强制执行该声明（0.2.1 的 app-boot / plugin-manager 已内置）：

- **安装时**：本地路径 / registry 包在 pnpm 运行前检查，不满足直接以 `incompatible-version`
  拒绝；tarball / git spec 在安装后判定并回滚。
- **启动时**：不兼容的 bundle 会被跳过（`skippedBundles`）、不兼容的插件行会被禁用，
  插件模块不会被 import。

确实需要冒险运行时，用**精确版本豁免**（不会放宽声明的范围）：

```powershell
dsh plugin --profile desktop allow-version dsh-plugin-everything@1.0.1 --dsh-version <运行时版本> --accept-risk
```

或在插件管理器里调用 `set_version_exemption`（需用户明确接受风险）。DSH 升级后，请先确认
本插件是否已发布兼容版本，再重启或重新安装。

## 兼容性与限制

- 仅 **Windows x64**；非 Windows 或 32 位环境下工具会返回明确错误。
- 依赖本机 Everything 客户端运行；Everything 1.4.1 实测通过，1.5 alpha 未实测。
- 搜索结果是 Everything 的索引快照，刚创建/移动的文件可能有秒级延迟。
- 结果包括 `$Recycle.Bin`、`WinSxS` 等系统目录；需要时用 `!$Recycle.Bin` 等语法排除。

## 验证记录

- `install_bundle` 安装返回 `application: applied`、`enabled: true`、无 warning。
- 真实查询：`notepad.exe`（18 命中）、中文文件名、`path:`/`file:`/`folder:`/`ext:`
  语法、`size` 倒序、截断计数、空结果、`max` 越界钳制均通过。
- 异常路径：SDK DLL 缺失时返回可读的 `SDK_LOAD_FAILED` 错误，Host 不崩溃。
- 版本声明：`engines.dsh` 在 0.2.1-rc.3 上安装校验通过；构造的 `engines.dsh: ">=99.0.0"`
  探针包被 DSH 以 `incompatible-version` 拒绝，证明声明确实生效。
- 打包校验：`npm pack` 产物解包后，worker + DLL + koffi 可独立加载查询。
- 显示资源：中英文 locale 标题/描述与 `icon.svg` 已导出并随包分发；GUI 内的图标渲染
  需要人工确认（自动化环境无浏览器控制）。

## 发布流程（维护者）

npm 发布由 [`.github/workflows/publish.yml`](.github/workflows/publish.yml) 自动完成：

- 推送 `v*` tag → `npm publish`，并自动创建/更新 GitHub Release、附加打包好的 `.tgz`；
- 也可在仓库 Actions 页面手动 **Run workflow** 发布 `package.json` 里的当前版本。

首次需要配置一种认证（二选一）：

1. **Trusted Publishing（推荐，无长期 token）**：在 npmjs.com 的包 Settings → Trusted Publisher →
   GitHub Actions，填 owner=`keyblues`、repository=`dsh-plugin-everything`、workflow filename=`publish.yml`。
   workflow 使用 Node 24（npm CLI 已满足 ≥ 11.5.1 的要求），npm 会自动用 OIDC 认证。
2. **NPM_TOKEN**：在 npm 生成 granular access token（含 publish 权限），保存为仓库
   Settings → Secrets and variables → Actions 的 `NPM_TOKEN`。

本地手动发布（备用）：

```powershell
npm login
npm publish --access public
```

## 许可

- 本插件代码：[MIT](LICENSE)
- Everything SDK（`native/Everything64.dll`）：MIT，Copyright (C) 2016 David Carpenter / voidtools
- koffi / @koromix/koffi-win32-x64：MIT，Copyright (C) Niels Martignène
- 完整声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
