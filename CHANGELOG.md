# Changelog

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
