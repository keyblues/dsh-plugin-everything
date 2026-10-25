# Changelog

## v1.0.1 (2026-10-25)

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
