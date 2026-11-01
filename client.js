// DeepSeek Harness Web Client half of dsh-plugin-everything.
//
// Declares the two tool cards of the Host half: it registers one view per wire
// tool name into the keyed Slot `tool.call.toolview` (owned by
// @deepseek-ai/dsh-client-ui-tool), so `everything_search` and
// `everything_status` calls render as dedicated cards instead of the generic
// tool row. The Host tool's `output.presentationMeta` projection is the cards'
// data source; the model-facing result text is never re-parsed here.
//
// Cards:
//   everything_search - collapsed row (title · query · returned/matched · state
//     chip) that opens into a query chip, a totals line, a scrollable hit list
//     with file/folder rows, and an honest truncation footer.
//   everything_status - collapsed row (availability dot · state word · version
//     and index size) that opens into a status head, a definition grid and the
//     diagnostics/hint panel when Everything is not usable.
//
// Row chrome follows the shipped DisclosureRow/ToolRow (24px row plus the user
// content-font delta, 16px leading box, 2px dot separator, dim text that
// brightens on hover). Colours come only from the shipped --dsw-* theme tokens,
// so light and dark themes need no separate artwork; the SVG glyphs use
// currentColor.

window.__ModuleLoader__.load({
  id: 'dsh-plugin-everything',
  factory: (require) => {
    const React = require('react');
    const h = React.createElement;

    //#region copy
    /** Locale namespace this half owns; also the `locale` of every registration. */
    const NS = 'everything-plugin';
    /** Every user-visible string, in both shipped locales. */
    const DICT = {
      en: {
        'search.title': 'Everything search',
        'status.title': 'Everything status',
        'state.preparing': 'Preparing…',
        'state.searching': 'Searching the Everything index…',
        'state.checking': 'Checking Everything…',
        'search.chipTruncated': 'truncated',
        'search.chipFailed': 'failed',
        'search.chipNotRunning': 'not running',
        'search.matches': '{total} matches',
        'search.matchOne': '1 match',
        'search.showing': 'Showing {returned} of {total}',
        'search.noMatches': 'No matches',
        'search.sortedBy': 'sorted by {sort} {order}',
        'search.order.ascending': 'ascending',
        'search.order.descending': 'descending',
        'search.sort.name': 'name',
        'search.sort.path': 'path',
        'search.sort.size': 'size',
        'search.sort.date-created': 'created date',
        'search.sort.date-modified': 'modified date',
        'search.sort.recent': 'recent use',
        'search.emptyTitle': 'No matching files or folders',
        'search.emptyHint': 'Try a broader term, a * wildcard, or drop filters such as ext:.',
        'search.folderWord': 'folder',
        'search.showingRows': 'Showing the first {shown} of {returned} rows.',
        'search.footerCapped': 'The card lists at most {cap} rows; the full result text above lists every match.',
        'search.footerTruncated': 'Results were truncated. Raise max (up to 500) or narrow the query to see more.',
        'search.notRunningTitle': "Everything isn't running",
        'search.failedTitle': 'Search failed',
        'search.recordedResult': 'Recorded result',
        'search.resultsAria': 'Search results: {returned} of {total} matches',
        'search.resultsAriaOne': 'Search results: 1 match',
        'search.resultsAriaEmpty': 'No search results',
        'search.openAria': 'Open {name}',
        'hint.title': 'How to fix',
        'hint.notRunning': 'Start Everything.exe, or enable auto-start in the everything plugin config:',
        'hint.searchGeneric': 'Run everything_status to check the local Everything client, then retry.',
        'status.state.available': 'Available',
        'status.state.notRunning': 'Not running',
        'status.state.unavailable': 'Unavailable',
        'status.state.unknown': 'Unknown',
        'status.state.failed': 'Status check failed',
        'status.field.indexStatus': 'Index status',
        'status.field.indexedItems': 'Indexed items',
        'status.field.platform': 'Platform',
        'status.field.sdkDll': 'SDK DLL',
        'status.value.ready': 'Ready',
        'status.value.loading': 'Loading',
        'status.value.unknown': 'Unknown',
        'status.itemsValue': '{n} items',
        'status.itemValue': '{n} item',
        'status.detailsAria': 'Everything status details',
        'status.chipIndexLoading': 'index loading',
        'status.diagnostics': 'Diagnostics',
        'status.hintGeneric': "Check the Everything client and the plugin's sdkPath, then retry.",
        'inspect': 'Inspect call',
      },
      zh: {
        'search.title': 'Everything 搜索',
        'status.title': 'Everything 状态',
        'state.preparing': '准备中…',
        'state.searching': '正在搜索 Everything 索引…',
        'state.checking': '正在检查 Everything…',
        'search.chipTruncated': '已截断',
        'search.chipFailed': '失败',
        'search.chipNotRunning': '未运行',
        'search.matches': '{total} 项匹配',
        'search.matchOne': '1 项匹配',
        'search.showing': '显示 {returned}/{total} 项',
        'search.noMatches': '无匹配',
        'search.sortedBy': '按{sort}{order}',
        'search.order.ascending': '升序',
        'search.order.descending': '降序',
        'search.sort.name': '名称',
        'search.sort.path': '路径',
        'search.sort.size': '大小',
        'search.sort.date-created': '创建时间',
        'search.sort.date-modified': '修改时间',
        'search.sort.recent': '最近使用',
        'search.emptyTitle': '没有匹配的文件或文件夹',
        'search.emptyHint': '试试更宽泛的关键词、* 通配符，或去掉 ext: 之类的筛选条件。',
        'search.folderWord': '文件夹',
        'search.showingRows': '仅显示前 {shown} 项（共返回 {returned} 项）。',
        'search.footerCapped': '卡片最多列出 {cap} 行结果，完整结果请见上方结果文本。',
        'search.footerTruncated': '命中结果已被截断，提高 max（最多 500）或缩小查询范围可看到更多。',
        'search.notRunningTitle': 'Everything 未运行',
        'search.failedTitle': '搜索失败',
        'search.recordedResult': '结果原文',
        'search.resultsAria': '搜索结果：第 {returned} 项，共 {total} 项',
        'search.resultsAriaOne': '搜索结果：1 项',
        'search.resultsAriaEmpty': '无搜索结果',
        'search.openAria': '打开 {name}',
        'hint.title': '如何修复',
        'hint.notRunning': '启动 Everything.exe，或在本插件配置中开启 autoStart：',
        'hint.searchGeneric': '运行 everything_status 检查本机 Everything 客户端，然后重试。',
        'status.state.available': '可用',
        'status.state.notRunning': '未运行',
        'status.state.unavailable': '不可用',
        'status.state.unknown': '未知',
        'status.state.failed': '状态检查失败',
        'status.field.indexStatus': '索引状态',
        'status.field.indexedItems': '索引条目',
        'status.field.platform': '平台',
        'status.field.sdkDll': 'SDK DLL',
        'status.value.ready': '就绪',
        'status.value.loading': '加载中',
        'status.value.unknown': '未知',
        'status.itemsValue': '{n} 项',
        'status.itemValue': '{n} 项',
        'status.detailsAria': 'Everything 状态详情',
        'status.chipIndexLoading': '索引加载中',
        'status.diagnostics': '诊断',
        'status.hintGeneric': '检查本机 Everything 客户端与插件的 sdkPath，然后重试。',
        'inspect': '检查调用',
      },
    };
    /** Result rows this half is willing to render; the Host caps metadata at the same number. */
    const CARD_ROW_LIMIT = 100;
    /** Recorded failure text that means "the Everything client is not running", not a plugin bug. */
    const NOT_RUNNING_PATTERN = /not running|未运行|\bIPC\b/i;
    /** The one line that actually turns auto-start on. */
    const AUTOSTART_SNIPPET = '"autoStart": true';

    /** Best-effort locale tag for Intl formatting when no `t` seat is bound. */
    function detectLocaleTag() {
      try {
        const tag = (document.documentElement.lang || navigator.language || 'en').toLowerCase();
        return tag.startsWith('zh') ? 'zh-CN' : 'en';
      } catch {
        return 'en';
      }
    }

    /** Translate through the bundle's own dictionaries. */
    function fallbackTranslate(key, params) {
      const tag = detectLocaleTag().startsWith('zh') ? 'zh' : 'en';
      const dict = DICT[tag] ?? DICT.en;
      const template = dict[key] ?? DICT.en[key] ?? key;
      if (params === undefined) return template;
      return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
      );
    }

    /** Prefer the slot-bound translator; fall back to this bundle's dictionaries on any gap. */
    function makeTranslator(bound) {
      if (typeof bound !== 'function') return fallbackTranslate;
      return (key, params) => {
        let value;
        try {
          value = bound(key, params);
        } catch {
          return fallbackTranslate(key, params);
        }
        return value === undefined || value === key ? fallbackTranslate(key, params) : value;
      };
    }
    //#endregion

    //#region model
    /** Narrow unknown JSON to a plain object. */
    function asRecord(value) {
      return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
    }

    /** First line of arbitrary text, trimmed. */
    function firstLine(text) {
      const trimmed = typeof text === 'string' ? text.trim() : '';
      const newline = trimmed.indexOf('\n');
      return newline === -1 ? trimmed : trimmed.slice(0, newline).trim();
    }

    /** Flatten a settled Tool result's content blocks to display text. */
    function resultText(block) {
      const parts = [];
      const content = Array.isArray(block?.content) ? block.content : [];
      for (const part of content) {
        const record = asRecord(part);
        if (record === null) continue;
        if (record.type === 'text' && typeof record.text === 'string') parts.push(record.text);
        else parts.push(JSON.stringify(record, null, 2));
      }
      return parts.join('\n').trim();
    }

    /** Read one string argument from the call's lazy argument view, then from raw JSON. */
    function argText(block, key) {
      const view = block?.args;
      if (view !== null && typeof view === 'object' && typeof view.text === 'function') {
        try {
          const value = view.text(key);
          if (typeof value === 'string') return value;
        } catch {
          // A partially prepared argument view can refuse reads; fall through.
        }
      }
      const call = asRecord(block?.call);
      if (call === null || typeof call.argsRaw !== 'string') return '';
      try {
        const args = JSON.parse(call.argsRaw);
        const value = asRecord(args)?.[key];
        return typeof value === 'string' ? value : '';
      } catch {
        return '';
      }
    }

    /** Localized integer formatting; falls back to the raw digits when Intl fails. */
    function formatCount(value, localeTag) {
      if (!Number.isFinite(value)) return '';
      try {
        return new Intl.NumberFormat(localeTag).format(value);
      } catch {
        return String(value);
      }
    }

    /** Compact byte size, mirroring the Host renderer's units. */
    function formatBytes(bytes) {
      if (!Number.isFinite(bytes) || bytes < 0) return '';
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

    /** Short localized date for a Host ISO modification timestamp; empty when unparsable. */
    function formatModified(raw, localeTag) {
      if (typeof raw !== 'string' || raw === '') return '';
      const ms = Date.parse(raw);
      if (!Number.isFinite(ms)) return '';
      try {
        return new Intl.DateTimeFormat(localeTag, { year: 'numeric', month: 'short', day: 'numeric' }).format(
          new Date(ms)
        );
      } catch {
        return '';
      }
    }

    /** Parent directory of a full path, without the file name. */
    function parentPath(fullPath) {
      if (typeof fullPath !== 'string') return '';
      const slash = Math.max(fullPath.lastIndexOf('\\'), fullPath.lastIndexOf('/'));
      return slash > 0 ? fullPath.slice(0, slash) : '';
    }

    /** Keep a Windows parent path readable in one cell: first segment, ellipsis, last two. */
    function compactParentPath(parent) {
      if (parent === '') return '';
      const unc = parent.startsWith('\\\\');
      const segments = parent.split(/[\\/]+/).filter((segment) => segment !== '');
      if (unc) segments[0] = `\\\\${segments[0] ?? ''}`;
      if (segments.length <= 4) return parent;
      const head = segments[0];
      const tail = segments.slice(-2).join('\\');
      return `${head}\\…\\${tail}`;
    }

    /** Validate and normalize the Host's search presentation projection. */
    function normalizeSearchMeta(meta) {
      const rows = [];
      if (Array.isArray(meta.results)) {
        for (const candidate of meta.results) {
          if (rows.length >= CARD_ROW_LIMIT) break;
          const row = asRecord(candidate);
          if (row === null || typeof row.path !== 'string' || row.path === '') continue;
          const normalized = {
            path: row.path,
            name: typeof row.name === 'string' && row.name !== '' ? row.name : row.path,
            folder: row.folder === true
          };
          if (Number.isFinite(row.size)) normalized.size = row.size;
          if (typeof row.modified === 'string') normalized.modified = row.modified;
          rows.push(normalized);
        }
      }
      return {
        query: typeof meta.query === 'string' ? meta.query : '',
        total: Number.isFinite(meta.total) ? meta.total : rows.length,
        returned: Number.isFinite(meta.returned) ? meta.returned : rows.length,
        truncated: meta.truncated === true,
        sort: typeof meta.sort === 'string' ? meta.sort : 'name',
        descending: meta.descending === true,
        rows
      };
    }

    /** Validate and normalize the Host's status presentation projection. */
    function normalizeStatusMeta(meta) {
      const normalized = {
        available: meta.available === true,
        platform: typeof meta.platform === 'string' ? meta.platform : '',
        sdkDll: typeof meta.sdkDll === 'string' ? meta.sdkDll : ''
      };
      if (typeof meta.clientVersion === 'string') normalized.clientVersion = meta.clientVersion;
      if (typeof meta.databaseLoaded === 'boolean') normalized.databaseLoaded = meta.databaseLoaded;
      if (Number.isFinite(meta.indexedItems)) normalized.indexedItems = meta.indexedItems;
      if (typeof meta.error === 'string') normalized.error = meta.error;
      if (typeof meta.hint === 'string') normalized.hint = meta.hint;
      return normalized;
    }

    /** Read the plugin-owned presentation projection of one settled Tool block. */
    function cardMeta(block) {
      const meta = asRecord(block?.meta);
      return meta !== null && meta.version === 1 ? meta : null;
    }

    /** Row state derived only from the frozen call slice. */
    function rowState(props) {
      if (props.phase !== 'result') return props.phase === 'preparing' ? 'preparing' : 'running';
      const block = props.block ?? {};
      if (block.error?.code === 'interrupted') return 'stopped';
      return block.isError === true ? 'error' : 'ok';
    }

    /** Classify a recorded failure: a missing Everything client is not a plugin bug. */
    function failureKind(message) {
      return NOT_RUNNING_PATTERN.test(message) ? 'notRunning' : 'failed';
    }
    //#endregion

    //#region styles
    // Row chrome mirrors the shipped DisclosureRow/ToolRow so a card sits in the
    // transcript like a first-party row: 24px row (plus the user content-font
    // delta), 16px leading box, 2px dot separator, dim tertiary text that
    // brightens on hover. Only --dsw-* / --dsh-content-* tokens are referenced.
    const CSS = `
.dpe-root{display:flex;flex-direction:column;min-width:0}
.dpe-row{box-sizing:border-box;display:flex;align-items:center;width:100%;min-width:0;height:calc(24px + var(--dsh-content-font-delta,0px));padding:0;border:none;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;text-align:left;transition:color .1s ease}
.dpe-row[data-expandable]{cursor:pointer}
.dpe-row[data-expandable]:hover{color:var(--dsw-alias-label-secondary)}
.dpe-row:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:-2px}
.dpe-leading{position:relative;flex:none;display:inline-flex;align-items:center;justify-content:center;width:calc(16px + var(--dsh-content-font-delta,0px));height:calc(16px + var(--dsh-content-font-delta,0px));margin-right:6px;color:inherit}
.dpe-leading svg{width:calc(14px + var(--dsh-content-font-delta,0px));height:calc(14px + var(--dsh-content-font-delta,0px))}
.dpe-glyph{display:inline-flex;opacity:1;transition:opacity .1s ease}
.dpe-chevron{position:absolute;inset:0;display:inline-flex;align-items:center;justify-content:center;opacity:0;transition:opacity .1s ease,transform .12s ease}
.dpe-row[data-expandable]:hover .dpe-glyph,.dpe-row[data-open] .dpe-glyph{opacity:0}
.dpe-row[data-expandable]:hover .dpe-chevron,.dpe-row[data-open] .dpe-chevron{opacity:1}
.dpe-row[data-open] .dpe-chevron{transform:rotate(90deg)}
.dpe-title{flex:none;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:inherit;white-space:nowrap}
.dpe-sep{flex:none;width:2px;height:2px;margin:0 8px;border-radius:1px;background:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary))}
.dpe-summary{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:inherit}
.dpe-summary[data-query]{font-family:var(--dsh-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px)}
.dpe-summary[data-tone="error"]{color:var(--dsw-alias-state-error-primary)}
.dpe-root[data-state="error"] .dpe-leading,.dpe-root[data-state="stopped"] .dpe-leading{color:var(--dsw-alias-state-error-primary)}
.dpe-summary[data-tone="warn"]{color:var(--dsw-alias-state-warn-label,var(--dsw-alias-state-warn-primary))}
.dpe-spacer{flex:1 1 auto;min-width:8px}
.dpe-suffix{flex:none;margin-left:8px;font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap}
.dpe-chip{flex:none;display:inline-flex;align-items:center;gap:4px;margin-left:8px;box-sizing:border-box;height:18px;padding:0 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dpe-chip-dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}
.dpe-chip[data-tone="warn"]{border-color:var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-state-warn-label,var(--dsw-alias-state-warn-primary))}
.dpe-chip[data-tone="warn"] .dpe-chip-dot{background:var(--dsw-alias-state-warn-primary)}
.dpe-chip[data-tone="error"]{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}
.dpe-chip[data-tone="error"] .dpe-chip-dot{background:var(--dsw-alias-state-error-primary)}
.dpe-chip[data-tone="idle"] .dpe-chip-dot{background:var(--dsw-alias-state-idle-primary)}
.dpe-body{margin:4px 0 4px 22px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-lg,10px);background:var(--dsw-alias-bg-layer-1);font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);line-height:18px;color:var(--dsw-alias-label-primary)}
.dpe-head{display:flex;align-items:center;gap:6px;min-width:0;padding:9px 12px 6px}
.dpe-query{display:inline-flex;align-items:center;max-width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:1px 7px;background:var(--dsw-alias-bg-layer-2);font-family:var(--dsh-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dpe-head-right{flex:none;margin-left:auto;font-family:var(--dsh-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dpe-meta-line{display:flex;align-items:center;gap:8px;padding:0 12px 8px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;min-width:0}
.dpe-meta-dot{flex:none;width:2px;height:2px;border-radius:1px;background:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary))}
.dpe-list-region{border-top:1px solid var(--dsw-alias-border-l1);max-height:280px;overflow-y:auto;overscroll-behavior:contain}
.dpe-list-region:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:-2px}
.dpe-list{margin:0;padding:0;list-style:none}
.dpe-hit{display:grid;grid-template-columns:12px minmax(0,38%) minmax(0,1fr) max-content max-content;column-gap:8px;align-items:center;box-sizing:border-box;width:100%;min-height:26px;padding:0 12px;color:inherit;font:inherit;text-align:left;background:transparent;border:none;border-radius:0}
.dpe-hit:hover{background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-2))}
.dpe-hit-icon{display:inline-flex;align-items:center;justify-content:center;width:12px;height:12px;color:var(--dsw-alias-label-secondary)}
.dpe-hit[data-folder="true"] .dpe-hit-icon{color:var(--dsw-alias-label-primary)}
.dpe-hit-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;font-weight:600}
.dpe-hit[data-folder="true"] .dpe-hit-name{font-weight:500}
.dpe-hit-name-button{padding:0;border:none;background:none;font:inherit;color:inherit;font-weight:600;text-decoration:underline dotted var(--dsw-alias-border-l2);text-underline-offset:2px;cursor:pointer;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
.dpe-hit-name-button:hover{text-decoration-style:solid;color:var(--dsw-alias-label-secondary)}
.dpe-hit-name-button:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:-1px;border-radius:2px}
.dpe-hit-path{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsh-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dpe-hit-size{min-width:52px;text-align:right;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.dpe-hit-date{min-width:84px;text-align:right;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.dpe-foot{display:flex;align-items:flex-start;gap:6px;border-top:1px solid var(--dsw-alias-border-l1);padding:7px 12px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);background:var(--dsw-specific-sidebar-fill,transparent)}
.dpe-foot-dot{flex:none;width:4px;height:4px;margin-top:6px;border-radius:50%;background:var(--dsw-alias-state-warn-primary)}
.dpe-empty{display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--dsw-alias-border-l1);padding:12px}
.dpe-empty-icon{display:inline-flex;color:var(--dsw-alias-state-idle-primary);margin-bottom:2px}
.dpe-empty-title{font-size:13px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary)}
.dpe-empty-hint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dpe-panel{border-top:1px solid var(--dsw-alias-border-l1);padding:10px 12px 12px;display:flex;flex-direction:column;gap:4px}
.dpe-panel-state{display:flex;align-items:center;gap:6px;font-size:13px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary)}
.dpe-panel-state[data-tone="error"]{color:var(--dsw-alias-state-error-primary)}
.dpe-dot{display:inline-block;width:6px;height:6px;border-radius:50%;flex:none}
.dpe-dot[data-tone="ok"]{background:var(--dsw-alias-state-success-primary)}
.dpe-dot[data-tone="warn"]{background:var(--dsw-alias-state-warn-primary)}
.dpe-dot[data-tone="error"]{background:var(--dsw-alias-state-error-primary)}
.dpe-dot[data-tone="idle"]{background:var(--dsw-alias-state-idle-primary)}
.dpe-panel-message{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dpe-hint{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-2));padding:8px 10px;display:flex;flex-direction:column;gap:4px;margin-top:4px}
.dpe-hint-title{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dpe-hint-text{font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary)}
.dpe-hint-code{font-family:var(--dsh-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dpe-recorded{border-top:1px solid var(--dsw-alias-border-l1);padding:8px 12px 10px;display:flex;flex-direction:column;gap:4px}
.dpe-recorded-title{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dpe-recorded-body{margin:0;max-height:240px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-family:var(--dsh-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dpe-grid{display:grid;grid-template-columns:96px minmax(0,1fr);gap:4px 12px;align-items:baseline;padding:8px 12px 12px}
.dpe-grid-key{font-size:11px;line-height:18px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dpe-grid-value{font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);min-width:0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.dpe-grid-value[data-mono]{font-family:var(--dsh-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dpe-inspect{align-self:flex-start;margin:0 12px 10px;padding:2px 8px;border:none;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:16px;cursor:pointer}
.dpe-inspect:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
@keyframes dpe-pulse{0%,100%{opacity:.45}50%{opacity:1}}
.dpe-running .dpe-text-running{animation:dpe-pulse 1.6s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.dpe-running .dpe-text-running{animation:none}.dpe-chevron,.dpe-glyph{transition:none}}
@media (max-width: 640px){.dpe-hit{grid-template-columns:12px minmax(0,1fr) max-content max-content}.dpe-hit-path{display:none}}
`;
    //#endregion

    //#region glyphs
    const svg = (attrs, paths) =>
      h(
        'svg',
        { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true, focusable: false, ...attrs },
        paths.map((path, index) =>
          h('path', {
            key: index,
            d: path.d,
            fill: path.fill ?? 'none',
            stroke: path.fill === undefined ? 'currentColor' : 'none',
            strokeWidth: 1.3,
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          })
        )
      );

    const SearchGlyph = () =>
      svg({ style: { display: 'block' } }, [
        { d: 'M6.9 2.5a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Z' },
        { d: 'm10.2 10.2 3.3 3.3' }
      ]);
    const IdleSearchGlyph = () =>
      svg({ style: { display: 'block' }, width: 18, height: 18 }, [
        { d: 'M7.8 2.6a5.2 5.2 0 1 0 0 10.4 5.2 5.2 0 0 0 0-10.4Z' },
        { d: 'm11.7 11.7 3.6 3.6' }
      ]);
    const FileGlyph = () =>
      svg({ style: { display: 'block' }, width: 12, height: 12 }, [
        { d: 'M3.9 1.9h4.8l3.1 3.1v9.1H3.9z' },
        { d: 'M8.6 2v3.2h3.2' }
      ]);
    const FolderGlyph = () =>
      svg({ style: { display: 'block' }, width: 12, height: 12 }, [{ d: 'M1.8 3.4h4.1l1.2 1.6h7.1v7.6H1.8z', fill: 'currentColor' }]);
    const StatusGlyph = () => svg({ style: { display: 'block' } }, [{ d: 'M1.5 8h3.1l1.5-4 2.6 8 1.4-4h3.4' }]);
    const ChevronGlyph = () =>
      svg({ style: { display: 'block' } }, [{ d: 'm4.2 6.4 3.8 3.8 3.8-3.8' }]);
    //#endregion

    //#region shared view
    /** One row-level state chip (truncated results, failed call, missing client, loading index). */
    function StateChip(props) {
      return h(
        'span',
        { className: 'dpe-chip', 'data-tone': props.tone },
        h('span', { className: 'dpe-chip-dot', 'aria-hidden': true }),
        props.label
      );
    }

    /**
     * Disclosure shell shared by both cards: the always-visible compact row plus
     * the expanded body. The row is a `div[role=button]` like the first-party
     * ToolRow, which keeps its text selectable; Enter/Space toggle it.
     */
    function CardShell(props) {
      const { toolName, title, glyph, summary, summaryTone, summaryMono, suffix, chip, dotTone, state, expandable } = props;
      const { disclosure, body, inspect, t, callId, bodyLabel } = props;
      const bodyId = callId === undefined ? undefined : `dpe-body-${callId}`;
      const running = state === 'preparing' || state === 'running';
      const open = expandable && disclosure.expanded;
      const onKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        disclosure.toggle();
      };
      const rowProps = { className: 'dpe-row', role: expandable ? 'button' : undefined };
      if (expandable) {
        rowProps.tabIndex = 0;
        rowProps['aria-expanded'] = open ? 'true' : 'false';
        if (bodyId !== undefined) rowProps['aria-controls'] = bodyId;
        rowProps['data-expandable'] = 'true';
        rowProps.onClick = disclosure.toggle;
        rowProps.onKeyDown = onKeyDown;
      }
      if (open) rowProps['data-open'] = 'true';
      return h(
        'div',
        { className: `dpe-root${running ? ' dpe-running' : ''}`, 'data-tool': toolName, 'data-state': state },
        h(
          'div',
          rowProps,
          h(
            'span',
            { className: 'dpe-leading', 'aria-hidden': true },
            h('span', { className: 'dpe-glyph' }, glyph),
            expandable && h('span', { className: 'dpe-chevron' }, h(ChevronGlyph))
          ),
          h('span', { className: 'dpe-title' }, title),
          summary !== '' && h('span', { className: 'dpe-sep', 'aria-hidden': true }),
          dotTone !== undefined && h('span', { className: 'dpe-dot', 'data-tone': dotTone, 'aria-hidden': true }),
          summary !== '' &&
            h(
              'span',
              {
                className: 'dpe-summary',
                'data-query': summaryMono ? 'true' : undefined,
                'data-tone': summaryTone,
                title: summaryMono ? summary : undefined
              },
              summary
            ),
          suffix !== undefined && suffix !== null && suffix !== '' && h('span', { className: 'dpe-suffix' }, suffix),
          chip !== undefined && chip !== null && h(StateChip, chip)
        ),
        open &&
          h(
            'div',
            {
              className: 'dpe-body',
              id: bodyId,
              role: bodyLabel === undefined ? undefined : 'group',
              'aria-label': bodyLabel
            },
            body,
            typeof inspect === 'function' && h('button', { type: 'button', className: 'dpe-inspect', onClick: inspect }, t('inspect'))
          )
      );
    }

    /** Use the owner-supplied disclosure Hook; fall back to local state if it is absent. */
    function useCardDisclosure(useDisclosure) {
      const [local, setLocal] = React.useState(false);
      const owner = typeof useDisclosure === 'function' ? useDisclosure() : null;
      const expanded = owner !== null && typeof owner.expanded === 'boolean' ? owner.expanded : local;
      const toggle = owner !== null && typeof owner.toggle === 'function' ? owner.toggle : () => setLocal((value) => !value);
      return { expanded, toggle };
    }

    /** Recorded result text for results this half cannot project (old logs, foreign writers). */
    function RecordedBody(props) {
      const text = props.text;
      if (text === '') return null;
      return h(
        'div',
        { className: 'dpe-recorded' },
        h('span', { className: 'dpe-recorded-title' }, props.title),
        h('pre', { className: 'dpe-recorded-body', tabIndex: 0 }, text)
      );
    }

    /** "How to fix" inset used by both cards' failure states. */
    function HintBlock(props) {
      const { t, text, code } = props;
      return h(
        'div',
        { className: 'dpe-hint' },
        h('span', { className: 'dpe-hint-title' }, t('hint.title')),
        h('span', { className: 'dpe-hint-text' }, text),
        code !== undefined && h('span', { className: 'dpe-hint-code' }, code)
      );
    }
    //#endregion

    //#region everything_search
    /** Sort-order label key lookup with a safe default. */
    function sortLabelKey(sort) {
      const known = ['name', 'path', 'size', 'date-created', 'date-modified', 'recent'];
      return `search.sort.${known.includes(sort) ? sort : 'name'}`;
    }

    /** One hit row: glyph, name, dimmed parent path, size, modified date. */
    function SearchHit(props) {
      const { row, openFile, localeTag, t } = props;
      const sizeCell = row.folder ? t('search.folderWord') : formatBytes(row.size);
      const dateCell = formatModified(row.modified, localeTag);
      const nameContent = row.folder ? `${row.name}/` : row.name;
      const nameCell =
        !row.folder && typeof openFile === 'function'
          ? h(
              'button',
              {
                type: 'button',
                className: 'dpe-hit-name-button',
                title: row.name,
                'aria-label': t('search.openAria', { name: row.name }),
                onClick: (event) => {
                  event.stopPropagation();
                  openFile(row.path);
                }
              },
              nameContent
            )
          : h('span', { className: 'dpe-hit-name', title: row.name }, nameContent);
      return h(
        'li',
        { className: 'dpe-hit', 'data-folder': row.folder ? 'true' : 'false', title: row.path },
        h('span', { className: 'dpe-hit-icon', 'aria-hidden': true }, h(row.folder ? FolderGlyph : FileGlyph)),
        nameCell,
        h('span', { className: 'dpe-hit-path', title: parentPath(row.path) }, compactParentPath(parentPath(row.path))),
        h('span', { className: 'dpe-hit-size' }, sizeCell),
        h('span', { className: 'dpe-hit-date' }, dateCell)
      );
    }

    /** Expanded search body: query chip, totals line, hit list, honest truncation footer. */
    function SearchBody(props) {
      const { model, localeTag, openFile, t } = props;
      const totals = model.total === 1 ? t('search.matchOne') : t('search.matches', { total: formatCount(model.total, localeTag) });
      const sortLabel = t(sortLabelKey(model.sort));
      const order = t(model.descending ? 'search.order.descending' : 'search.order.ascending');
      const footer = [];
      if (model.rows.length < model.returned) {
        footer.push(
          t('search.showingRows', {
            shown: formatCount(model.rows.length, localeTag),
            returned: formatCount(model.returned, localeTag)
          })
        );
      }
      if (model.returned > CARD_ROW_LIMIT) footer.push(t('search.footerCapped', { cap: CARD_ROW_LIMIT }));
      if (model.truncated) footer.push(t('search.footerTruncated'));
      return [
        h(
          'div',
          { key: 'head', className: 'dpe-head' },
          h('span', { className: 'dpe-query', title: model.query }, model.query === '' ? '—' : model.query)
        ),
        h(
          'div',
          { key: 'meta', className: 'dpe-meta-line' },
          h('span', null, model.returned === 0 ? t('search.noMatches') : totals),
          h('span', { className: 'dpe-meta-dot', 'aria-hidden': true }),
          h('span', null, t('search.showing', { returned: formatCount(model.rows.length, localeTag), total: formatCount(model.returned, localeTag) })),
          h('span', { className: 'dpe-meta-dot', 'aria-hidden': true }),
          h('span', null, t('search.sortedBy', { sort: sortLabel, order }))
        ),
        model.rows.length > 0
          ? h(
              'div',
              {
                key: 'list',
                className: 'dpe-list-region',
                role: 'region',
                tabIndex: 0,
                'aria-label':
                  model.returned === 0
                    ? t('search.resultsAriaEmpty')
                    : model.returned === 1
                      ? t('search.resultsAriaOne')
                      : t('search.resultsAria', {
                          returned: formatCount(model.rows.length, localeTag),
                          total: formatCount(model.returned, localeTag)
                        })
              },
              h(
                'ul',
                { className: 'dpe-list' },
                model.rows.map((row, index) => h(SearchHit, { key: `${index}:${row.path}`, row, openFile, localeTag, t }))
              )
            )
          : h(
              'div',
              { key: 'empty', className: 'dpe-empty' },
              h('span', { className: 'dpe-empty-icon', 'aria-hidden': true }, h(IdleSearchGlyph)),
              h('span', { className: 'dpe-empty-title' }, t('search.emptyTitle')),
              h('span', { className: 'dpe-empty-hint' }, t('search.emptyHint'))
            ),
        footer.length > 0 &&
          h(
            'div',
            { key: 'foot', className: 'dpe-foot' },
            h('span', { className: 'dpe-foot-dot', 'aria-hidden': true }),
            h('span', null, footer.join(' '))
          )
      ].filter(Boolean);
    }

    /** Search card. */
    function EverythingSearchCard(props) {
      const { block, phase, openFile, inspect, useDisclosure, t: bound } = props;
      const disclosure = useCardDisclosure(useDisclosure);
      const t = makeTranslator(bound);
      const localeTag = detectLocaleTag();
      const state = rowState(props);
      const running = phase !== 'result';
      const meta = state === 'ok' ? cardMeta(block) : null;
      const model = meta === null ? null : normalizeSearchMeta(meta);
      const query = model !== null && model.query !== '' ? model.query : argText(block, 'query');
      const recorded = phase === 'result' ? resultText(block) : '';
      const failedMessage = state === 'error' || state === 'stopped' ? recorded.replace(/^Error:\s*/i, '').trim() : '';
      const kind = state === 'ok' ? null : failureKind(failedMessage);

      let summary = query;
      let summaryMono = true;
      let summaryTone;
      if (running) {
        summary = query === '' ? t(state === 'preparing' ? 'state.preparing' : 'state.searching') : query;
        summaryMono = query !== '';
      } else if (state === 'error' || state === 'stopped') {
        summary = failedMessage === '' ? t('search.failedTitle') : firstLine(failedMessage);
        summaryMono = false;
        summaryTone = 'error';
      } else if (model !== null && model.total === 0) {
        summary = query === '' ? t('search.noMatches') : query;
      }

      let suffix = null;
      let chip = null;
      if (model !== null && state === 'ok') {
        if (model.returned === 0) suffix = t('search.noMatches');
        else suffix = `${formatCount(model.returned, localeTag)} / ${formatCount(model.total, localeTag)}`;
        if (model.truncated) chip = { label: t('search.chipTruncated'), tone: 'warn' };
      } else if (state === 'error' || state === 'stopped') {
        chip = kind === 'notRunning'
          ? { label: t('search.chipNotRunning'), tone: 'idle' }
          : { label: t('search.chipFailed'), tone: 'error' };
      }

      let body = null;
      if (phase === 'result') {
        if (state === 'error' || state === 'stopped') {
          body = h(FailurePanel, {
            tone: kind === 'notRunning' ? 'idle' : 'error',
            title: kind === 'notRunning' ? t('search.notRunningTitle') : t('search.failedTitle'),
            message: failedMessage,
            hint: kind === 'notRunning' ? t('hint.notRunning') : t('hint.searchGeneric'),
            code: kind === 'notRunning' ? AUTOSTART_SNIPPET : undefined,
            t
          });
        } else if (model !== null) {
          body = h(SearchBody, { model, localeTag, openFile, t });
        } else {
          body = h(RecordedBody, { title: t('search.recordedResult'), text: recorded });
        }
      }
      const expandable = phase === 'result' && (model !== null || recorded !== '' || typeof inspect === 'function');

      return h(CardShell, {
        toolName: props.toolName,
        callId: props.callId,
        title: t('search.title'),
        glyph: h(SearchGlyph),
        summary,
        summaryMono,
        summaryTone,
        suffix,
        chip,
        state,
        expandable,
        disclosure,
        body,
        inspect,
        t
      });
    }

    /** Failure panel: state dot, localized state phrase, the recorded message, and the fix hint. */
    function FailurePanel(props) {
      const { tone, title, message, hint, code, t } = props;
      return h(
        'div',
        { className: 'dpe-panel' },
        h(
          'div',
          { className: 'dpe-panel-state', 'data-tone': tone === 'error' ? 'error' : undefined },
          h('span', { className: 'dpe-dot', 'data-tone': tone, 'aria-hidden': true }),
          title
        ),
        message !== '' && h('pre', { className: 'dpe-panel-message' }, message),
        h(HintBlock, { t, text: hint, code })
      );
    }
    //#endregion

    //#region everything_status
    /** Expanded status body: status head, definition grid, and the diagnostics panel when unusable. */
    function StatusBody(props) {
      const { model, localeTag, t } = props;
      const ready = model.databaseLoaded !== false;
      const rows = [
        [
          t('status.field.indexStatus'),
          model.databaseLoaded === undefined
            ? t('status.value.unknown')
            : model.databaseLoaded
              ? t('status.value.ready')
              : t('status.value.loading'),
          false
        ]
      ];
      if (model.indexedItems !== undefined) {
        rows.push([t('status.field.indexedItems'), formatCount(model.indexedItems, localeTag), false]);
      }
      if (model.platform !== '') rows.push([t('status.field.platform'), model.platform, true]);
      if (model.sdkDll !== '') rows.push([t('status.field.sdkDll'), model.sdkDll, true]);
      const grid = [];
      for (const [key, value, mono] of rows) {
        grid.push(h('span', { key: `k:${key}`, className: 'dpe-grid-key' }, key));
        grid.push(
          h('span', { key: `v:${key}`, className: 'dpe-grid-value', 'data-mono': mono ? 'true' : undefined }, value)
        );
      }
      return [
        model.available
          ? h(
              'div',
              { key: 'head', className: 'dpe-head' },
              h(
                'span',
                { className: 'dpe-panel-state' },
                h('span', { className: 'dpe-dot', 'data-tone': ready ? 'ok' : 'warn', 'aria-hidden': true }),
                t('status.state.available')
              ),
              !ready && h(StateChip, { label: t('status.chipIndexLoading'), tone: 'warn' }),
              model.clientVersion !== undefined &&
                h('span', { className: 'dpe-head-right' }, `v${model.clientVersion}`)
            )
          : h(
              'div',
              { key: 'head', className: 'dpe-head' },
              h(
                'span',
                { className: 'dpe-panel-state' },
                h('span', { className: 'dpe-dot', 'data-tone': model.error === undefined ? 'idle' : failureKind(model.error) === 'notRunning' ? 'idle' : 'error', 'aria-hidden': true }),
                model.error === undefined
                  ? t('status.state.unavailable')
                  : failureKind(model.error) === 'notRunning'
                    ? t('status.state.notRunning')
                    : t('status.state.unavailable')
              ),
              model.clientVersion !== undefined &&
                h('span', { className: 'dpe-head-right' }, `v${model.clientVersion}`)
            ),
        h('div', { key: 'grid', className: 'dpe-grid' }, grid),
        !model.available &&
          h(
            'div',
            { key: 'diag', className: 'dpe-panel' },
            h(
              'div',
              { className: 'dpe-panel-state' },
              h('span', { className: 'dpe-dot', 'data-tone': 'error', 'aria-hidden': true }),
              t('status.diagnostics')
            ),
            model.error !== undefined && h('pre', { className: 'dpe-panel-message' }, model.error),
            h(HintBlock, { t, text: model.hint ?? t('status.hintGeneric') })
          )
      ].filter(Boolean);
    }

    /** Everything availability card. */
    function EverythingStatusCard(props) {
      const { block, phase, inspect, useDisclosure, t: bound } = props;
      const disclosure = useCardDisclosure(useDisclosure);
      const t = makeTranslator(bound);
      const localeTag = detectLocaleTag();
      const state = rowState(props);
      const running = phase !== 'result';
      const meta = state === 'ok' ? cardMeta(block) : null;
      const model = meta === null ? null : normalizeStatusMeta(meta);
      const recorded = phase === 'result' ? resultText(block) : '';

      let summary = '';
      let stateWord = t('status.state.unknown');
      let dotTone = 'idle';
      let chip = null;
      if (running) {
        stateWord = t('state.checking');
        summary = '';
      } else if (state === 'error' || state === 'stopped') {
        stateWord = t('status.state.failed');
        dotTone = 'error';
        summary = firstLine(recorded.replace(/^Error:\s*/i, '').trim());
      } else if (model === null) {
        stateWord = t('status.state.unknown');
        summary = firstLine(recorded);
      } else if (model.available) {
        stateWord = t('status.state.available');
        dotTone = model.databaseLoaded === false ? 'warn' : 'ok';
        const parts = [];
        if (model.clientVersion !== undefined) parts.push(`v${model.clientVersion}`);
        if (model.indexedItems !== undefined) {
          parts.push(
            t(model.indexedItems === 1 ? 'status.itemValue' : 'status.itemsValue', {
              n: formatCount(model.indexedItems, localeTag)
            })
          );
        }
        summary = parts.join(' · ');
        if (model.databaseLoaded === false) chip = { label: t('status.chipIndexLoading'), tone: 'warn' };
      } else {
        const kind = model.error === undefined ? 'unavailable' : failureKind(model.error);
        stateWord = kind === 'notRunning' ? t('status.state.notRunning') : t('status.state.unavailable');
        dotTone = kind === 'notRunning' ? 'idle' : 'error';
        summary = model.error !== undefined ? firstLine(model.error) : '';
      }

      let body = null;
      if (phase === 'result') {
        if (state === 'error' || state === 'stopped') {
          body = h(FailurePanel, {
            tone: 'error',
            title: t('status.state.failed'),
            message: recorded.replace(/^Error:\s*/i, '').trim(),
            hint: t('status.hintGeneric'),
            t
          });
        } else if (model !== null) {
          body = h(StatusBody, { model, localeTag, t });
        } else {
          body = h(RecordedBody, { title: t('search.recordedResult'), text: recorded });
        }
      }
      const expandable = phase === 'result' && (model !== null || recorded !== '' || typeof inspect === 'function');

      return h(CardShell, {
        toolName: props.toolName,
        callId: props.callId,
        title: t('status.title'),
        glyph: h(StatusGlyph),
        bodyLabel: t('status.detailsAria'),
        summary: stateWord,
        summaryMono: false,
        suffix: summary,
        chip,
        dotTone,
        state,
        expandable,
        disclosure,
        body,
        inspect,
        t
      });
    }
    //#endregion

    //#region plugin
    /**
     * A throwing view blanks its slot entry with no generic fallback, so every
     * card renders inside this boundary: a crash degrades to one plain row that
     * still names the tool and shows the recorded result's first line.
     */
    class CardBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { failed: false };
      }

      static getDerivedStateFromError() {
        return { failed: true };
      }

      render() {
        if (this.state.failed !== true) return this.props.children;
        const props = this.props.cardProps ?? {};
        const block = props.block ?? {};
        let detail = '';
        try {
          detail = firstLine(resultText(block).replace(/^Error:\s*/i, ''));
        } catch {
          detail = '';
        }
        const title = fallbackTranslate(props.toolName === 'everything_status' ? 'status.title' : 'search.title');
        return h(
          'div',
          { className: 'dpe-root', 'data-tool': props.toolName, 'data-state': 'error', 'data-card-fallback': 'true' },
          h(
            'div',
            { className: 'dpe-row' },
            h('span', { className: 'dpe-title' }, title),
            detail !== '' && h('span', { className: 'dpe-sep', 'aria-hidden': true }),
            detail !== '' && h('span', { className: 'dpe-summary' }, detail)
          )
        );
      }
    }

    /** Render one card inside the crash boundary without owning any hook itself. */
    function guarded(Card) {
      return function GuardedCard(props) {
        return h(CardBoundary, { cardProps: props }, h(Card, props));
      };
    }

    /** Register the card half: copy, stylesheet, and the two keyed Tool views. */
    function apply(ctx) {
      ctx.effect(() => {
        const disposers = [];
        const locale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined;
        if (locale !== undefined && locale !== null && typeof locale.register === 'function') {
          try {
            disposers.push(locale.register(NS, DICT));
          } catch {
            // Localization is a refinement; the built-in dictionaries still render.
          }
        }
        return () => {
          for (const dispose of disposers.reverse()) {
            try {
              dispose();
            } catch {
              // Disposal must not break teardown.
            }
          }
        };
      }, 'everything: tool card dictionaries');

      ctx.effect(() => {
        const tag = document.createElement('style');
        tag.dataset.plugin = 'dsh-plugin-everything';
        tag.dataset.pluginCss = 'dsh-plugin-everything.cards.css';
        tag.textContent = CSS;
        document.head.appendChild(tag);
        return () => {
          tag.remove();
        };
      }, 'everything: tool card styles');

      ctx.slots.inject('tool.call.toolview', function* () {
        yield ctx.slots.register({ name: 'tool.call.toolview', key: 'everything_search', locale: NS }, guarded(EverythingSearchCard));
        yield ctx.slots.register({ name: 'tool.call.toolview', key: 'everything_status', locale: NS }, guarded(EverythingStatusCard));
      });
    }

    return { inject: ['slots', 'locale'], apply };
    //#endregion
  }
});
