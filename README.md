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
> `dsh.bundle.patch` 与 `dsh-plugin` 关键词，可被 DSH 社区插件目录按 topic 检索收录。

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
   `dsh-plugin-everything-1.0.0.tgz`；
2. 在 DSH 里让 Agent 执行（把路径换成本机实际路径）：

   > 用 plugin_manager 的 install_bundle 安装 `C:\Downloads\dsh-plugin-everything-1.0.0.tgz`

   或者把该文件拖给 DSH 插件管理器（Settings → Plugins）安装。

### 方式二：源码目录安装

```powershell
git clone https://github.com/keyblues/dsh-plugin-everything.git
```

然后让 Agent 执行：

> 用 plugin_manager 的 install_bundle 安装 `C:\path\to\dsh-plugin-everything`

安装完成后，`everything_search` 与 `everything_status` 两个工具立即出现在会话里，
无需重启 Harness。

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

## 兼容性与限制

- 仅 **Windows x64**；非 Windows 或 32 位环境下工具会返回明确错误。
- 依赖本机 Everything 客户端运行；Everything 1.4.1 实测通过，1.5 alpha 未实测。
- 搜索结果是 Everything 的索引快照，刚创建/移动的文件可能有秒级延迟。
- 结果包括 `$Recycle.Bin`、`WinSxS` 等系统目录；需要时用 `!$Recycle.Bin` 等语法排除。

## 验证记录（v1.0.0）

- `install_bundle` 安装返回 `application: applied`、`enabled: true`、无 warning。
- 真实查询：`notepad.exe`（18 命中）、中文文件名、`path:`/`file:`/`folder:`/`ext:`
  语法、`size` 倒序、截断计数、空结果、`max` 越界钳制均通过。
- 异常路径：SDK DLL 缺失时返回可读的 `SDK_LOAD_FAILED` 错误，Host 不崩溃。
- 打包校验：`npm pack` 产物解包后，worker + DLL + koffi 可独立加载查询。
- 显示资源：中英文 locale 标题/描述与 `icon.svg` 已导出并随包分发；GUI 内的图标渲染
  需要人工确认（自动化环境无浏览器控制）。

## 发布流程（维护者）

```powershell
npm pack               # 生成 dsh-plugin-everything-1.0.0.tgz
git tag v1.0.0
git push --tags
gh release create v1.0.0 dsh-plugin-everything-1.0.0.tgz --title v1.0.0 --notes-file CHANGELOG.md
```

## 许可

- 本插件代码：[MIT](LICENSE)
- Everything SDK（`native/Everything64.dll`）：MIT，Copyright (C) 2016 David Carpenter / voidtools
- koffi / @koromix/koffi-win32-x64：MIT，Copyright (C) Niels Martignène
- 完整声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
