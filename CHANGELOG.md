# Changelog

## v1.1.0 (2026-11-02)

- **新增 Web 界面工具卡片（Client 半 `client.js`）**：通过 `dsh.client` 声明接入 Web 端，
  向 keyed 槽位 `tool.call.toolview` 注册 `everything_search` / `everything_status` 两张卡片，
  不再回退到通用工具行。
  - **Everything 搜索**：收起行与官方工具行同构（`图标 标题 · 搜索词 返回/命中`，整行只有一个
    分隔点）；展开后是一个细边框代码块观感的输出区：统计行（命中/显示/排序/截断）+ 最多 8 行
    命中（文件/文件夹图标、文件名、所在目录、大小、修改时间，点击文件名可在侧边栏打开），
    超出 8 行用一行说明折起，不再出现滚动条。
  - **Everything 状态**：收起行 `状态词 索引条目数`；展开后是左对齐的
    `状态/版本/索引条目/索引状态/平台/SDK DLL` 行，不可用时附错误原文与 `autoStart` 提示。
  - 卡片数据来自 Host 侧新增的 `output.presentationMeta` 结构化投影（不是解析结果文本）：
    最多 100 行结果，含 `query/total/returned/truncated/sort` 等字段；模型可见的结果文本不变。
  - 样式只用 `--dsw-alias-*` 主题 token 与 `--dsh-content-*` 字号变量，浅色/深色自动适配；
    行高、字号跟随界面正文字号设置；中英文案通过 Client locale 字典注册。
  - 渲染包在崩溃边界内：卡片异常时退化为一行纯文本，不会留空白行。
  - 新增 `scripts/host-meta-smoke.mjs` 与 `scripts/render-smoke.mjs` 两个无头冒烟测试
    （Host 投影 + Client 渲染树），`npm test` 可跑。
- README（中/英）新增「工具卡片」章节，版本号更新到 1.1.0。

## v1.0.3 (2026-10-27)

- 精简模型可见的工具描述（`everything_search` / `everything_status` 及参数说明）：
  说明文字压缩约 37%，把参数规则并入参数本身，降低每次请求的上下文占用；工具行为与参数不变。
- README：重写安装方式，以 **npm 包名**为首选（DSH 桌面端安装框直接填
  `dsh-plugin-everything`，或 CLI `dsh plugin --profile desktop add dsh-plugin-everything`）；
  本地 `.tgz` 与源码目录作为离线/开发备选，并补充桌面端安装器输入对照表、更新方式与发版说明。

## v1.0.2 (2026-10-25)

- 配置 **npm Trusted Publishing**：npm 包 `dsh-plugin-everything` 信任
  `.github/workflows/publish.yml`（GitHub Actions OIDC，无需长期 token）。
  以后推送 `v*` tag 或在 Actions 手动 Run workflow，会自动 `npm publish` 并更新
  GitHub Release + 上传 `.tgz`。
- README 增加 npm 徽章与"已发布到 npm"的安装说明（DSH 桌面端安装器可直接填包名）。
- 功能与 v1.0.1 一致。

## v1.0.1 (2026-10-25)

- 已发布到 npm registry：`dsh-plugin-everything@1.0.1`（shasum `cda09297ca6813678fcd1d5591e0dd8ea59e684a`），
  DSH 桌面端安装器可直接填包名 `dsh-plugin-everything` 安装。
- 新增 `engines.dsh: ">=0.2.1-rc.2 <0.3.0-0"`：显式声明支持的 DSH 版本范围。
  DSH 会在安装与启动时据此检查——不兼容的 DSH（例如 0.2.0、0.3.0）会拒绝安装或在
  启动时跳过本插件，而不是静默加载后出错；确需运行时可用 `dsh plugin allow-version`
  或插件管理器按「精确插件版本@精确 DSH 版本」授予豁免。
- README（中/英）新增「DSH 版本支持」章节：实测版本、契约一致性依据、升级注意事项。
- 兼容性依据：`@deepseek-ai/dsh-app-boot`、`@deepseek-ai/dsh-tools`、
  `@deepseek-ai/dsh-plugin-manager`、`@deepseek-ai/dsh-package-manifest` 在
  0.2.1-rc.2 与 0.2.1-rc.3 的发布产物逐字节一致；插件在 0.2.1-rc.3（Desktop）上实测通过。

## v1.0.0 (2026-10-25)

首个公开版本。

- 新增 `everything_search`：通过本机 voidtools Everything 索引全盘搜索文件/文件夹，
  返回完整路径、大小、修改时间与命中总数；支持 `max` / `sort` / `descending`。
- 新增 `everything_status`：检查 Everything 可达性、客户端版本、索引条目数与 SDK DLL 路径。
- 通过官方 Everything SDK（`Everything64.dll`）+ N-API FFI（koffi）在 worker 线程中调用，
  查询超时可终止并重建 worker，避免阻塞 Harness Host。
- 自包含 bundle：内置 SDK DLL 与 koffi win32-x64 预编译二进制，安装无需联网/编译。
- 插件显示资源：中英文 locale 标题/描述、原创 SVG 图标。
- 支持配置：`maxResults`、`queryTimeoutMs`、`autoStart`、`everythingPath`、`sdkPath`。
