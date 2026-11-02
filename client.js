// DeepSeek Harness Web Client half of dsh-plugin-everything.
//
// Declares the two tool cards of the Host half: it registers one view per wire
// tool name into the keyed Slot `tool.call.toolview` (owned by
// @deepseek-ai/dsh-client-ui-tool), so `everything_search` and
// `everything_status` calls render as dedicated cards instead of the generic
// tool row. The Host tool's `output.presentationMeta` projection is the cards'
// data source; the model-facing result text is never re-parsed here.
//
// The cards deliberately blend into the transcript: the collapsed row is the
// shipped DisclosureRow shape (dim one-line text that brightens on hover, a 2px
// dot separator, a leading glyph that swaps to a chevron) and the expanded body
// is plain left-aligned text with no fill, border, pill or right-aligned column
// - the same visual weight as a first-party tool's output block.
//
// Colours come only from the shipped --dsw-* theme tokens, so light and dark
// themes need no separate artwork; the SVG glyphs use currentColor.

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
        'state.searching': 'Searching…',
        'state.checking': 'Checking…',
        'search.matches': '{total} matches',
        'search.matchOne': '1 match',
        'search.showing': 'showing {returned} of {total}',
        'search.noMatches': 'No matches',
        'search.truncatedWord': 'truncated',
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
        'search.showingRows': 'Showing the first {shown} of {returned} returned rows.',
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
        'status.field.state': 'State',
        'status.field.version': 'Version',
        'status.field.indexStatus': 'Index status',
        'status.field.indexedItems': 'Indexed items',
        'status.field.platform': 'Platform',
        'status.field.sdkDll': 'SDK DLL',
        'status.value.ready': 'Ready',
        'status.value.loading': 'Loading',
        'status.value.unknown': 'Unknown',
        'status.itemsValue': '{n} items',
        'status.itemValue': '{n} item',
        'status.inlineVersion': 'version {version}',
        'status.inlineItems': '{n} items indexed',
        'status.indexLoadingWord': 'index loading',
        'status.detailsAria': 'Everything status details',
        'status.hintGeneric': "Check the Everything client and the plugin's sdkPath, then retry.",
        'inspect': 'Inspect call',
      },
      zh: {
        'search.title': 'Everything 搜索',
        'status.title': 'Everything 状态',
        'state.preparing': '准备中…',
        'state.searching': '搜索中…',
        'state.checking': '检查中…',
        'search.matches': '{total} 项匹配',
        'search.matchOne': '1 项匹配',
        'search.showing': '显示 {returned}/{total}',
        'search.noMatches': '无匹配',
        'search.truncatedWord': '已截断',
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
        'status.field.state': '状态',
        'status.field.version': '版本',
        'status.field.indexStatus': '索引状态',
        'status.field.indexedItems': '索引条目',
        'status.field.platform': '平台',
        'status.field.sdkDll': 'SDK DLL',
        'status.value.ready': '就绪',
        'status.value.loading': '加载中',
        'status.value.unknown': '未知',
        'status.itemsValue': '{n} 项',
        'status.itemValue': '{n} 项',
        'status.inlineVersion': '版本 {version}',
        'status.inlineItems': '索引 {n} 项',
        'status.indexLoadingWord': '索引加载中',
        'status.detailsAria': 'Everything 状态详情',
        'status.hintGeneric': '检查本机 Everything 客户端与插件的 sdkPath，然后重试。',
        'inspect': '检查调用',
      },
    };
    /** Result rows this half is willing to render; the Host caps metadata at the same number. */
    const CARD_ROW_LIMIT = 100;
    /** Hit lines the expanded card draws before folding, matching the shipped 8-line card blocks. */
    const CARD_ROW_DISPLAY = 8;
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
        return new Intl.DateTimeFormat(localeTag, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(ms));
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

    /** Keep a Windows parent path readable in one line: first segment, ellipsis, last two. */
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
    // Deliberately minimal: the row copies the shipped DisclosureRow/ToolRow
    // (24px, dim text that brightens on hover, 2px dot, glyph-to-chevron swap)
    // and the body is plain left-aligned text with no fill, border, pill or
    // right-aligned column - it reads like a first-party tool's output block.
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
.dpe-summary{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:inherit}
.dpe-summary[data-tone="error"]{color:var(--dsw-alias-state-error-primary)}
.dpe-root[data-state="error"] .dpe-leading,.dpe-root[data-state="stopped"] .dpe-leading{color:var(--dsw-alias-state-error-primary)}
.dpe-suffix{flex:none;margin-left:8px;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:inherit;font-variant-numeric:tabular-nums;white-space:nowrap}
.dpe-io{box-sizing:border-box;display:flex;flex-direction:column;gap:1px;margin:4px 0 4px 4px;padding:8px 12px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-lg,10px);background:var(--dsw-alias-markdown-code-block,var(--dsw-alias-bg-layer-2));font-family:var(--dsh-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:calc(var(--dsh-content-font-size-secondary,13px) - 2px);line-height:18px;color:var(--dsw-alias-label-secondary)}
.dpe-body{display:flex;flex-direction:column;min-width:0}
.dpe-io:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:-2px}
.dpe-line{margin:0;padding:0;white-space:pre-wrap;overflow-wrap:anywhere;color:inherit;border:none;background:none;font:inherit;text-align:left}
.dpe-line[data-tone="error"]{color:var(--dsw-alias-state-error-primary)}
.dpe-hit{display:flex;align-items:baseline;gap:8px;min-width:0;padding:0;border:none;background:none;font:inherit;text-align:left;color:inherit;white-space:nowrap}
.dpe-hit-icon{flex:none;display:inline-flex;align-self:center;color:inherit}
.dpe-hit-name{flex:none;max-width:45%;overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-primary)}
button.dpe-hit-name{padding:0;border:none;background:none;font:inherit;cursor:pointer;text-align:left}
button.dpe-hit-name:hover{text-decoration:underline}
button.dpe-hit-name:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:-1px;border-radius:2px}
.dpe-hit-path{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;color:inherit}
.dpe-hit-meta{flex:none;color:inherit;font-variant-numeric:tabular-nums}
.dpe-hit-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:1px}
.dpe-inspect{align-self:flex-start;margin:2px 0 0;padding:0;border:none;background:none;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;line-height:16px;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.dpe-inspect:hover{color:var(--dsw-alias-label-secondary)}
@media (prefers-reduced-motion: reduce){.dpe-chevron,.dpe-glyph{transition:none}}
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
    const FileGlyph = () =>
      svg({ style: { display: 'block' }, width: 11, height: 11 }, [
        { d: 'M3.9 1.9h4.8l3.1 3.1v9.1H3.9z' },
        { d: 'M8.6 2v3.2h3.2' }
      ]);
    const FolderGlyph = () =>
      svg({ style: { display: 'block' }, width: 11, height: 11 }, [
        { d: 'M1.8 3.4h4.1l1.2 1.6h7.1v7.6H1.8z', fill: 'currentColor' }
      ]);
    const StatusGlyph = () => svg({ style: { display: 'block' } }, [{ d: 'M1.5 8h3.1l1.5-4 2.6 8 1.4-4h3.4' }]);
    const ChevronGlyph = () => svg({ style: { display: 'block' } }, [{ d: 'm4.2 6.4 3.8 3.8 3.8-3.8' }]);
    //#endregion

    //#region shared view
    /**
     * Disclosure shell shared by both cards: one dim text row plus plain
     * left-aligned body text. The row is a `div[role=button]` like the
     * first-party ToolRow, so its text stays selectable; Enter/Space toggles it.
     */
    function CardShell(props) {
      const { toolName, title, glyph, summary, summaryTone, suffix, state, expandable } = props;
      const { disclosure, body, inspect, t, callId, bodyLabel } = props;
      const bodyId = callId === undefined ? undefined : `dpe-body-${callId}`;
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
      // Same shape as the first-party ToolRow: `[glyph][title] · [summary] [suffix]`
      // - one 2px dot with 8px margins before the summary, and the suffix simply
      // follows it (no second separator, no right alignment).
      return h(
        'div',
        { className: 'dpe-root', 'data-tool': toolName, 'data-state': state },
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
          summary !== '' && h('span', { className: 'dpe-summary', 'data-tone': summaryTone, title: summary }, summary),
          suffix !== undefined && suffix !== null && suffix !== '' && h('span', { className: 'dpe-suffix' }, suffix)
        ),
        open &&
          h(
            'div',
            { className: 'dpe-body' },
            h(
              'div',
              {
                className: 'dpe-io',
                id: bodyId,
                role: bodyLabel === undefined ? undefined : 'group',
                'aria-label': bodyLabel
              },
              body
            ),
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

    /** One plain text line of the output block. */
    function Line(props) {
      return h('div', { className: 'dpe-line', 'data-tone': props.tone }, props.children);
    }

    /** Recorded result text for results this half cannot project (old logs, foreign writers). */
    function RecordedBody(props) {
      if (props.text === '') return null;
      return [h(Line, { key: 'label' }, props.title), h(Line, { key: 'text' }, props.text)];
    }
    //#endregion

    //#region everything_search
    /** Sort-order label key lookup with a safe default. */
    function sortLabelKey(sort) {
      const known = ['name', 'path', 'size', 'date-created', 'date-modified', 'recent'];
      return `search.sort.${known.includes(sort) ? sort : 'name'}`;
    }

    /** One hit line: glyph, name, dimmed parent path, size and date - all left aligned. */
    function SearchHit(props) {
      const { row, openFile, localeTag, t } = props;
      const metaParts = [];
      if (row.folder) metaParts.push(t('search.folderWord'));
      else if (formatBytes(row.size) !== '') metaParts.push(formatBytes(row.size));
      const date = formatModified(row.modified, localeTag);
      if (date !== '') metaParts.push(date);
      const label = row.folder ? `${row.name}/` : row.name;
      const name =
        !row.folder && typeof openFile === 'function'
          ? h(
              'button',
              {
                type: 'button',
                className: 'dpe-hit-name',
                title: row.path,
                'aria-label': t('search.openAria', { name: row.name }),
                onClick: (event) => {
                  event.stopPropagation();
                  openFile(row.path);
                }
              },
              label
            )
          : h('span', { className: 'dpe-hit-name', title: row.path }, label);
      return h(
        'li',
        { className: 'dpe-hit' },
        h('span', { className: 'dpe-hit-icon', 'aria-hidden': true }, h(row.folder ? FolderGlyph : FileGlyph)),
        name,
        h('span', { className: 'dpe-hit-path', title: parentPath(row.path) }, compactParentPath(parentPath(row.path))),
        metaParts.length > 0 && h('span', { className: 'dpe-hit-meta' }, metaParts.join(' · '))
      );
    }

    /** Expanded search body: one meta line, at most CARD_ROW_DISPLAY hit lines, plain footer. */
    function SearchBody(props) {
      const { model, localeTag, openFile, t } = props;
      const visible = model.rows.slice(0, CARD_ROW_DISPLAY);
      const totals =
        model.total === 1 ? t('search.matchOne') : t('search.matches', { total: formatCount(model.total, localeTag) });
      const parts = [totals];
      parts.push(
        t('search.showing', {
          returned: formatCount(visible.length, localeTag),
          total: formatCount(model.returned, localeTag)
        })
      );
      parts.push(
        t('search.sortedBy', {
          sort: t(sortLabelKey(model.sort)),
          order: t(model.descending ? 'search.order.descending' : 'search.order.ascending')
        })
      );
      if (model.truncated) parts.push(t('search.truncatedWord'));
      const footer = [];
      if (visible.length < model.returned) {
        footer.push(
          t('search.showingRows', {
            shown: formatCount(visible.length, localeTag),
            returned: formatCount(model.returned, localeTag)
          })
        );
      }
      if (model.truncated) footer.push(t('search.footerTruncated'));
      return [
        h(Line, { key: 'meta' }, parts.join(' · ')),
        visible.length > 0
          ? h(
              'ul',
              { key: 'list', className: 'dpe-hit-list' },
              visible.map((row, index) => h(SearchHit, { key: `${index}:${row.path}`, row, openFile, localeTag, t }))
            )
          : null,
        model.rows.length === 0
          ? h(
              'div',
              { key: 'empty' },
              h(Line, null, t('search.emptyTitle')),
              h(Line, null, t('search.emptyHint'))
            )
          : null,
        footer.length > 0 ? h(Line, { key: 'foot' }, footer.join(' ')) : null
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
      let summaryTone;
      let suffix = null;
      if (running) {
        summary = query === '' ? t(state === 'preparing' ? 'state.preparing' : 'state.searching') : query;
      } else if (state === 'error' || state === 'stopped') {
        summary = failedMessage === '' ? t('search.failedTitle') : firstLine(failedMessage);
        summaryTone = 'error';
      } else if (model !== null) {
        if (model.returned === 0) suffix = t('search.noMatches');
        else suffix = `${formatCount(model.returned, localeTag)}/${formatCount(model.total, localeTag)}`;
      }

      let body = null;
      if (phase === 'result') {
        if (state === 'error' || state === 'stopped') {
          body = [
            h(Line, { key: 'state', tone: 'error' }, kind === 'notRunning' ? t('search.notRunningTitle') : t('search.failedTitle')),
            failedMessage !== '' ? h(Line, { key: 'message', tone: 'error' }, failedMessage) : null,
            h(
              Line,
              { key: 'hint' },
              `${t('hint.title')}: ${kind === 'notRunning' ? t('hint.notRunning') : t('hint.searchGeneric')}`
            ),
            kind === 'notRunning' ? h(Line, { key: 'code' }, AUTOSTART_SNIPPET) : null
          ].filter(Boolean);
        } else if (model !== null) {
          body = h(SearchBody, { model, localeTag, openFile, t });
        } else {
          body = h(RecordedBody, { title: t('search.recordedResult'), text: recorded });
        }
      }
      const expandable = phase === 'result' && (model !== null || recorded !== '' || typeof inspect === 'function');
      const resultsLabel =
        model === null
          ? undefined
          : model.returned === 0
            ? t('search.resultsAriaEmpty')
            : model.returned === 1
              ? t('search.resultsAriaOne')
              : t('search.resultsAria', {
                  returned: formatCount(model.rows.length, localeTag),
                  total: formatCount(model.returned, localeTag)
                });

      return h(CardShell, {
        toolName: props.toolName,
        callId: props.callId,
        title: t('search.title'),
        glyph: h(SearchGlyph),
        summary,
        summaryTone,
        suffix,
        state,
        expandable,
        disclosure,
        body,
        bodyLabel: resultsLabel,
        inspect,
        t
      });
    }
    //#endregion

    //#region everything_status
    /** Expanded status body: plain label/value lines, left aligned. */
    function StatusBody(props) {
      const { model, localeTag, t } = props;
      const rows = [];
      const stateWord = model.available
        ? t('status.state.available')
        : model.error === undefined
          ? t('status.state.unavailable')
          : failureKind(model.error) === 'notRunning'
            ? t('status.state.notRunning')
            : t('status.state.unavailable');
      rows.push([t('status.field.state'), stateWord]);
      rows.push([
        t('status.field.version'),
        model.clientVersion === undefined ? t('status.value.unknown') : `v${model.clientVersion}`
      ]);
      if (model.indexedItems !== undefined) {
        rows.push([
          t('status.field.indexedItems'),
          model.indexedItems === 1
            ? t('status.itemValue', { n: formatCount(model.indexedItems, localeTag) })
            : t('status.itemsValue', { n: formatCount(model.indexedItems, localeTag) })
        ]);
      }
      if (model.databaseLoaded !== undefined) {
        rows.push([
          t('status.field.indexStatus'),
          model.databaseLoaded ? t('status.value.ready') : t('status.value.loading')
        ]);
      }
      if (model.platform !== '') rows.push([t('status.field.platform'), model.platform]);
      if (model.sdkDll !== '') rows.push([t('status.field.sdkDll'), model.sdkDll]);
      const out = rows.map(([key, value], index) => h(Line, { key: `row:${index}` }, `${key}  ${value}`));
      if (!model.available) {
        if (model.error !== undefined) out.push(h(Line, { key: 'error', tone: 'error' }, model.error));
        out.push(h(Line, { key: 'hint' }, `${t('hint.title')}: ${model.hint ?? t('status.hintGeneric')}`));
      }
      return out;
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

      let summary = t('status.state.unknown');
      let summaryTone;
      let suffix = null;
      if (running) {
        summary = t('state.checking');
      } else if (state === 'error' || state === 'stopped') {
        summary = firstLine(recorded.replace(/^Error:\s*/i, '').trim()) || t('status.state.failed');
        summaryTone = 'error';
      } else if (model === null) {
        summary = firstLine(recorded) || t('status.state.unknown');
      } else if (model.available) {
        summary = t('status.state.available');
        const details = [];
        if (model.clientVersion !== undefined) details.push(t('status.inlineVersion', { version: model.clientVersion }));
        if (model.indexedItems !== undefined) {
          details.push(t('status.inlineItems', { n: formatCount(model.indexedItems, localeTag) }));
        }
        if (model.databaseLoaded === false) details.push(t('status.indexLoadingWord'));
        suffix = details.length === 0 ? null : details.join(', ');
      } else {
        const kind = model.error === undefined ? 'unavailable' : failureKind(model.error);
        summary = kind === 'notRunning' ? t('status.state.notRunning') : t('status.state.unavailable');
        suffix = model.error === undefined ? null : firstLine(model.error);
      }

      let body = null;
      if (phase === 'result') {
        if (state === 'error' || state === 'stopped') {
          body = [
            h(Line, { key: 'state', tone: 'error' }, t('status.state.failed')),
            h(Line, { key: 'message', tone: 'error' }, recorded.replace(/^Error:\s*/i, '').trim()),
            h(Line, { key: 'hint' }, `${t('hint.title')}: ${t('status.hintGeneric')}`)
          ].filter(Boolean);
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
        summary,
        summaryTone,
        suffix,
        state,
        expandable,
        disclosure,
        body,
        bodyLabel: t('status.detailsAria'),
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
      return function GuardedCard(cardProps) {
        return h(CardBoundary, { cardProps }, h(Card, cardProps));
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
