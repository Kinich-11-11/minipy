// _mkhtml.mjs
// 汇总 _curve/results/*.json → 生成 MiniPy_套件通过曲线.html（数据硬编码，无外部依赖）
// v2 仪表盘设计：平滑曲线+十字线、套件分组切换、里程碑、失败抽屉、可搜索排序表格
import fs from 'fs';
import path from 'path';

const HERE = 'C:/Personal/个人/编程/scratch/ai/minipython/_work/v41';
const ROOT = 'C:/Personal/个人/编程/scratch/ai/minipython';
const versions = JSON.parse(fs.readFileSync(path.join(HERE, '_curve/versions_main.json'), 'utf8'));
const dates = JSON.parse(fs.readFileSync(path.join(HERE, '_curve/dates.json'), 'utf8'));
const expected = JSON.parse(fs.readFileSync(path.join(HERE, '_curve/expected.json'), 'utf8'));

// 每个套件 tag 的总例数 + 分组
const GROUP_OF = (tag) => tag.startsWith('_new') ? 'main' : (tag.startsWith('_cov') ? 'cov' : 'gap');
const TAGS = {}; // tag -> {total, group}
for (const c of expected) {
  const t = TAGS[c.tag] || (TAGS[c.tag] = { total: 0, group: GROUP_OF(c.tag) });
  t.total++;
}
const GROUPS = {};
for (const { total, group } of Object.values(TAGS)) GROUPS[group] = (GROUPS[group] || 0) + total;

const data = [];
for (const f of versions) {
  const ver = f.replace(/^MiniPy_/, '').replace(/\.sb3$/, '');
  const rf = path.join(HERE, '_curve/results', ver + '.json');
  if (!fs.existsSync(rf)) { console.error('MISSING result: ' + ver); continue; }
  const r = JSON.parse(fs.readFileSync(rf, 'utf8'));
  // 按套件 tag 汇总失败数 → 分组通过数
  const failTag = {};
  for (const s of (r.fails || [])) { const tag = s.slice(0, s.indexOf('/')); failTag[tag] = (failTag[tag] || 0) + 1; }
  const perGroup = { main: 0, cov: 0, gap: 0 };
  for (const [tag, t] of Object.entries(TAGS)) perGroup[t.group] += t.total - (failTag[tag] || 0);
  data.push({
    ver: r.ver,
    date: dates[r.ver] || null,
    supported: !!r.supported,
    total: r.total || 0,
    pass: r.pass || 0,
    perGroup,
    fails: r.fails || [],
    ms: r.ms || 0,
    err: r.err || null,
  });
}
console.log('versions with results: ' + data.length + '/' + versions.length);
console.log('groups: ' + JSON.stringify(GROUPS));

// ── 更新说明：构建期把 md 转成 HTML 直接嵌入（不是引用） ──
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inlineMd(s) {
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/\*([^*\n]+)\*/g, '<i>$1</i>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1'); // 链接只留文本（离线单文件）
  return s;
}
function md2html(src) {
  const lines = src.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0, para = [];
  const flushPara = () => { if (para.length) { out.push('<p>' + para.map(inlineMd).join('<br>') + '</p>'); para = []; } };
  while (i < lines.length) {
    const ln = lines[i];
    if (/^```/.test(ln)) { // 围栏代码
      flushPara();
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>');
      continue;
    }
    const h = ln.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flushPara(); const lv = Math.min(h[1].length + 2, 6); out.push('<h' + lv + '>' + inlineMd(h[2]) + '</h' + lv + '>'); i++; continue; }
    // 管道表格：当前行含 | 且下一行是分隔行
    if (ln.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}[\s:|[-]*$/.test(lines[i + 1])) {
      flushPara();
      const cells = (row) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
      const head = cells(ln);
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') { body.push(cells(lines[i])); i++; }
      out.push('<table><thead><tr>' + head.map(c => '<th>' + inlineMd(c) + '</th>').join('') + '</tr></thead><tbody>' +
        body.map(r => '<tr>' + head.map((_, k) => '<td>' + inlineMd(r[k] || '') + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if (/^\s*[-*]\s+/.test(ln)) { // 无序列表
      flushPara();
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++; }
      out.push('<ul>' + items.map(it => '<li>' + inlineMd(it) + '</li>').join('') + '</ul>');
      continue;
    }
    if (/^\s*\d+\.\s+/.test(ln)) { // 有序列表
      flushPara();
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
      out.push('<ol>' + items.map(it => '<li>' + inlineMd(it) + '</li>').join('') + '</ol>');
      continue;
    }
    if (/^>\s?/.test(ln)) { // 引用
      flushPara();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push('<blockquote>' + buf.map(inlineMd).join('<br>') + '</blockquote>');
      continue;
    }
    if (/^\s*---+\s*$/.test(ln) || /^\s*===+\s*$/.test(ln)) { flushPara(); out.push('<hr>'); i++; continue; }
    if (ln.trim() === '') { flushPara(); i++; continue; }
    para.push(ln); i++;
  }
  flushPara();
  return out.join('\n');
}
const NOTES = {}; // ver -> html（无更新说明的版本不出现）
for (const d of data) {
  const mf = path.join(ROOT, 'MiniPy_' + d.ver + '_更新说明.md');
  if (fs.existsSync(mf)) {
    NOTES[d.ver] = md2html(fs.readFileSync(mf, 'utf8'));
  }
}
console.log('notes embedded: ' + Object.keys(NOTES).length + '/' + data.length);

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MiniPy 测试仪表盘 · 全套件通过曲线</title>
<style>
  :root {
    --bg: #0a0e14; --card: #111722; --card2: #0d131c; --line: rgba(148,163,184,.10);
    --fg: #e2e8f0; --dim: #7c8aa0; --faint: #475569;
    --accent: #38bdf8; --accent2: #8b5cf6; --ok: #34d399; --warn: #fbbf24; --bad: #f87171;
    --mono: "Cascadia Code", Consolas, "JetBrains Mono", monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scrollbar-color: #2a3546 var(--bg); }
  body {
    background:
      radial-gradient(1000px 500px at 80% -10%, rgba(139,92,246,.10), transparent 60%),
      radial-gradient(900px 450px at 10% -10%, rgba(56,189,248,.09), transparent 60%),
      var(--bg);
    color: var(--fg);
    font-family: "Segoe UI", "Microsoft YaHei", system-ui, sans-serif;
    padding: 0 clamp(16px, 4vw, 44px) 48px;
    max-width: 1480px; margin: 0 auto;
  }
  /* ── 顶栏 ─────────────────────────── */
  header { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; padding: 30px 0 6px; }
  .brand { font-size: 24px; font-weight: 700; letter-spacing: .5px;
    background: linear-gradient(90deg, #7dd3fc, #a78bfa 70%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .brand-sub { color: var(--dim); font-size: 14px; }
  .meta { margin-left: auto; color: var(--faint); font-size: 12px; font-family: var(--mono); }
  .note { color: var(--faint); font-size: 12.5px; line-height: 1.8; padding: 6px 0 20px; max-width: 1100px; }
  .note b { color: var(--dim); font-weight: 600; }
  /* ── KPI ─────────────────────────── */
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 18px; }
  .kpi {
    background: linear-gradient(180deg, var(--card), var(--card2));
    border: 1px solid var(--line); border-radius: 16px; padding: 16px 20px; position: relative; overflow: hidden;
  }
  .kpi::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 2px;
    background: linear-gradient(90deg, var(--accent), var(--accent2)); opacity: .7; }
  .kpi .k { font-size: 12px; color: var(--dim); }
  .kpi .v { font-size: 28px; font-weight: 700; margin-top: 6px; font-family: var(--mono); letter-spacing: -.5px; }
  .kpi .s { font-size: 12px; color: var(--faint); margin-top: 2px; }
  .kpi .v.ok { color: var(--ok); } .kpi .v.bad { color: var(--bad); }
  /* ── 卡片通用 ─────────────────────── */
  .card {
    background: linear-gradient(180deg, var(--card), var(--card2));
    border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; margin-bottom: 18px;
  }
  .card-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
  .card-head h2 { font-size: 15px; font-weight: 600; color: var(--fg); }
  .card-head .hint { color: var(--faint); font-size: 12px; }
  .seg { display: inline-flex; background: var(--card2); border: 1px solid var(--line); border-radius: 10px; padding: 3px; gap: 3px; }
  .seg button {
    background: transparent; border: 0; color: var(--dim); font-size: 12.5px; padding: 5px 13px;
    border-radius: 8px; cursor: pointer; font-family: inherit; transition: all .15s;
  }
  .seg button.on { background: linear-gradient(90deg, rgba(56,189,248,.18), rgba(139,92,246,.18)); color: var(--accent); }
  .seg button:hover:not(.on) { color: var(--fg); }
  /* ── 图表 ─────────────────────────── */
  .chart-area { position: relative; }
  canvas { width: 100%; height: 460px; display: block; cursor: crosshair; }
  #tip {
    position: absolute; pointer-events: none; display: none; z-index: 5; min-width: 210px;
    background: rgba(10,14,20,.94); border: 1px solid rgba(56,189,248,.4); border-radius: 12px;
    padding: 10px 14px; font-size: 12px; line-height: 1.75; box-shadow: 0 8px 30px rgba(0,0,0,.5);
    backdrop-filter: blur(6px);
  }
  #tip .tv { font-weight: 700; font-size: 14px; color: var(--accent); font-family: var(--mono); }
  #tip .td { color: var(--faint); font-size: 11px; margin-left: 6px; }
  #tip .tp { font-size: 16px; font-weight: 700; font-family: var(--mono); }
  #tip .gr { display: flex; align-items: center; gap: 6px; color: var(--dim); font-size: 11.5px; }
  #tip .gr i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
  #tip .gr b { margin-left: auto; font-family: var(--mono); font-weight: 600; color: var(--fg); }
  .legend { display: flex; gap: 18px; flex-wrap: wrap; font-size: 12px; color: var(--dim); margin-top: 10px; }
  .legend .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: -1px; }
  /* ── 失败抽屉 ─────────────────────── */
  #detail { margin-top: 14px; border-top: 1px dashed var(--line); padding-top: 14px; display: none; }
  #detail .dh { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  #detail .dh h3 { font-size: 14px; color: var(--accent); font-family: var(--mono); }
  #detail .dh .close { margin-left: auto; background: none; border: 1px solid var(--line); color: var(--dim);
    border-radius: 8px; padding: 4px 12px; cursor: pointer; font-size: 12px; }
  #detail .dh .close:hover { color: var(--fg); }
  .gbars { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin-bottom: 12px; }
  .gbar { background: var(--card2); border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; }
  .gbar .gl { display: flex; font-size: 12px; color: var(--dim); margin-bottom: 6px; }
  .gbar .gl b { margin-left: auto; font-family: var(--mono); color: var(--fg); }
  .gbar .track { height: 8px; background: #1a2332; border-radius: 4px; overflow: hidden; }
  .gbar .fill { height: 100%; border-radius: 4px; }
  .failwrap { max-height: 260px; overflow: auto; font-size: 12.5px; }
  .failwrap details { margin-bottom: 6px; }
  .failwrap summary { cursor: pointer; color: var(--dim); font-family: var(--mono); font-size: 12px; padding: 3px 0; }
  .failwrap summary:hover { color: var(--fg); }
  .failwrap summary .n { color: var(--bad); font-weight: 600; }
  .failwrap .fn { display: inline-block; background: rgba(248,113,113,.09); color: #fca5a5; border-radius: 5px;
    padding: 1.5px 8px; margin: 2px 4px 2px 0; font-size: 12px; font-family: var(--mono); }
  .allok { color: var(--ok); font-size: 13px; padding: 8px 0; }
  /* ── 抽屉标签页 ── */
  .dtabs { display: flex; gap: 6px; }
  .dtabs button { background: var(--card2); border: 1px solid var(--line); color: var(--dim);
    border-radius: 8px; padding: 4px 14px; cursor: pointer; font-size: 12px; font-family: inherit; }
  .dtabs button.on { color: var(--accent); border-color: rgba(56,189,248,.45); background: rgba(56,189,248,.08); }
  /* ── 更新说明 md 渲染 ── */
  .mdnotes { max-height: 460px; overflow: auto; font-size: 13px; line-height: 1.85; color: #c7d2e0; }
  .mdnotes h2, .mdnotes h3, .mdnotes h4 { color: var(--accent); margin: 14px 0 6px; font-size: 14.5px; }
  .mdnotes h3 { font-size: 13.5px; color: #93c5fd; }
  .mdnotes h4, .mdnotes h5, .mdnotes h6 { font-size: 13px; color: var(--dim); }
  .mdnotes p { margin: 6px 0; }
  .mdnotes ul, .mdnotes ol { margin: 6px 0; padding-left: 22px; }
  .mdnotes li { margin: 3px 0; }
  .mdnotes code { background: rgba(56,189,248,.10); color: #7dd3fc; border-radius: 4px; padding: 1px 6px; font-family: var(--mono); font-size: 12px; }
  .mdnotes pre { background: #0a0f16; border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; overflow: auto; margin: 8px 0; }
  .mdnotes pre code { background: none; color: #a5c8e1; padding: 0; }
  .mdnotes table { border-collapse: collapse; margin: 8px 0; font-size: 12.5px; width: 100%; }
  .mdnotes th, .mdnotes td { border: 1px solid var(--line); padding: 5px 10px; text-align: left; }
  .mdnotes th { color: var(--accent); background: rgba(56,189,248,.05); }
  .mdnotes blockquote { border-left: 3px solid var(--accent2); background: rgba(139,92,246,.06); padding: 8px 14px; border-radius: 0 8px 8px 0; margin: 8px 0; color: var(--dim); }
  .mdnotes hr { border: 0; border-top: 1px dashed var(--line); margin: 12px 0; }
  .mdnotes b { color: #e2e8f0; }
  .nonotes { color: var(--faint); font-size: 13px; padding: 12px 0; }
  /* ── 里程碑 ─────────────────────── */
  .ms-list { display: flex; flex-direction: column; gap: 8px; }
  .ms { display: flex; align-items: center; gap: 12px; background: var(--card2); border: 1px solid var(--line);
    border-radius: 12px; padding: 10px 14px; cursor: pointer; transition: border-color .15s; }
  .ms:hover { border-color: rgba(56,189,248,.45); }
  .ms .ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex: none; }
  .ms .tt { font-size: 13px; font-weight: 600; }
  .ms .ss { font-size: 12px; color: var(--dim); margin-top: 1px; }
  .ms .goto { margin-left: auto; color: var(--faint); font-size: 14px; }
  /* ── 表格 ─────────────────────────── */
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--line); white-space: nowrap; }
  th { color: var(--dim); font-weight: 500; font-size: 12px; cursor: pointer; user-select: none; position: sticky; top: 0;
       background: var(--card); z-index: 2; }
  th:hover { color: var(--fg); }
  th .arr { font-size: 10px; color: var(--accent); }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--mono); font-size: 12.5px; }
  tbody tr { cursor: pointer; transition: background .1s; }
  tbody tr:hover { background: rgba(56,189,248,.05); }
  tbody tr.sel { background: rgba(139,92,246,.10); }
  .ratecell { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
  .ratecell .track { width: 72px; height: 6px; background: #1a2332; border-radius: 3px; overflow: hidden; flex: none; }
  .ratecell .fill { height: 100%; }
  .ok { color: var(--ok); } .bad { color: var(--bad); } .dim2 { color: var(--dim); }
  .searchbox {
    margin-left: auto; background: var(--card2); border: 1px solid var(--line); border-radius: 10px;
    color: var(--fg); font-size: 13px; padding: 7px 14px; width: 220px; outline: none; font-family: inherit;
  }
  .searchbox:focus { border-color: rgba(56,189,248,.5); }
  .twrap { max-height: 560px; overflow: auto; border-radius: 10px; }
  @media (max-width: 900px) { .grid2 { grid-template-columns: 1fr !important; } }
</style>
</head>
<body>
<header>
  <div class="brand">MiniPy 测试仪表盘</div>
  <div class="brand-sub">全套件通过曲线 · v4 → v4.219</div>
  <div class="meta">__NV__ 版 · __NT__ 例 · 生成于 __GENTIME__</div>
</header>
<div class="note">
  <b>套件构成</b>：主套件+探针 <b>__GMAIN__</b> 例 + _cov* 回归 <b>__GCOV__</b> 例 + _gap131 补充 <b>__GGAP__</b> 例 = 全套件 <b>__NT__</b> 例。
  <b>方法</b>：对每个版本 sb3，在 scratch-vm 中逐例注入 Code 行并广播 RUN，收集 Output/error 与 CPython 3.14 期望输出（PYTHONHASHSEED=0，0x 地址归一化）逐字节对比，与
  <code>runall.mjs</code>/<code>run_iso.mjs</code> 同协议同判据。<b>时间</b>取 sb3 文件修改日期（与更新说明偶有 ±1–4 天出入，系夜间构建/事后补丁）。
</div>

<div class="kpis">
  <div class="kpi"><div class="k">测试版本数</div><div class="v">__NV__</div><div class="s">v4 → __LASTVER__</div></div>
  <div class="kpi"><div class="k">全绿版本（__NT__/__NT__）</div><div class="v ok" id="kGreen">—</div><div class="s" id="kGreenS"></div></div>
  <div class="kpi"><div class="k">最新版本通过</div><div class="v" id="kLast">—</div><div class="s" id="kLastS"></div></div>
  <div class="kpi"><div class="k">单版最大提升</div><div class="v" id="kJump">—</div><div class="s" id="kJumpS"></div></div>
  <div class="kpi"><div class="k">时间跨度</div><div class="v" id="kSpan">—</div><div class="s" id="kSpanS"></div></div>
</div>

<div class="card">
  <div class="card-head">
    <h2>通过曲线</h2>
    <span class="hint">悬停查看 · 点击版本打开详情</span>
    <div class="seg" id="segMetric" style="margin-left:auto">
      <button data-m="abs" class="on">通过数</button>
      <button data-m="pct">通过率 %</button>
    </div>
    <div class="seg" id="segGroup">
      <button data-g="all" class="on">全套件</button>
      <button data-g="main">主套件 __GMAIN__</button>
      <button data-g="cov">_cov* __GCOV__</button>
      <button data-g="gap">gap131 __GGAP__</button>
    </div>
  </div>
  <div class="chart-area">
    <canvas id="cv"></canvas>
    <div id="tip"></div>
  </div>
  <div class="legend">
    <span><span class="dot" style="background:var(--accent)"></span>通过数</span>
    <span><span class="dot" style="background:var(--ok)"></span>全绿点</span>
    <span><span class="dot" style="background:var(--warn)"></span>≥90%</span>
    <span><span class="dot" style="background:var(--bad)"></span>&lt;90%</span>
    <span><span class="dot" style="background:none;border:1.5px solid var(--accent2)"></span>里程碑</span>
  </div>
  <div id="detail"></div>
</div>

<div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
  <div class="card" style="margin-bottom:0">
    <div class="card-head"><h2>套件构成 <span class="hint" id="gSel">（点击曲线选择版本）</span></h2></div>
    <div class="gbars" id="gbars"></div>
    <div class="hint" style="color:var(--faint);font-size:12px">三个套件组的通过率；选择版本后更新。</div>
  </div>
  <div class="card" style="margin-bottom:0">
    <div class="card-head"><h2>里程碑</h2></div>
    <div class="ms-list" id="msList"></div>
  </div>
</div>

<div class="card" style="margin-top:18px">
  <div class="card-head">
    <h2>版本明细</h2>
    <input class="searchbox" id="q" placeholder="搜索版本号…">
  </div>
  <div class="twrap">
    <table id="tbl">
      <thead><tr>
        <th data-k="i" class="num">#</th><th data-k="ver">版本</th><th data-k="date">日期</th>
        <th data-k="pass" class="num">通过</th><th data-k="fail" class="num">失败</th>
        <th data-k="rate" class="num">通过率</th><th data-k="ms" class="num">耗时</th><th>备注</th>
      </tr></thead>
      <tbody></tbody>
    </table>
  </div>
</div>

<script>
const DATA = __DATA__;
const NOTES = __NOTES__;               // ver -> 更新说明 html（嵌入内容）
const TAGS = __TAGS__;                 // tag -> {total, group}
const GROUPS = __GROUPS__;             // group -> total 例数
const GROUP_NAME = { main: '主套件+探针', cov: '_cov* 回归', gap: '_gap131 补充' };
const GROUP_COLOR = { main: '#38bdf8', cov: '#8b5cf6', gap: '#fbbf24' };
const NT = __NT__;

/* ── 状态 ── */
let metric = 'abs', group = 'all', hoverI = -1, selI = -1;
let sortK = 'i', sortDir = 1, query = '';

/* ── KPI ── */
const $ = (id) => document.getElementById(id);
const last = DATA[DATA.length - 1];
const green = DATA.filter(d => d.supported && d.pass === NT);
$('kGreen').textContent = green.length;
$('kGreenS').textContent = green.length ? green.map(d => d.ver).join(', ') : '暂无';
$('kLast').textContent = last.supported ? last.pass + ' / ' + NT : '不支持';
$('kLast').className = 'v ' + (last.pass === NT ? 'ok' : 'bad');
$('kLastS').textContent = last.ver + (last.date ? ' · ' + last.date : '');
let ji = -1, jd = 0;
for (let i = 1; i < DATA.length; i++) {
  if (!DATA[i].supported || !DATA[i - 1].supported) continue;
  const d = DATA[i].pass - DATA[i - 1].pass;
  if (d > jd) { jd = d; ji = i; }
}
$('kJump').textContent = ji >= 0 ? '+' + jd : '—';
$('kJumpS').textContent = ji >= 0 ? DATA[ji].ver + '（' + DATA[ji - 1].ver + ' → ' + DATA[ji].ver + '）' : '';
const dts = DATA.filter(d => d.date).map(d => d.date).sort();
$('kSpan').textContent = dts.length ? Math.round((new Date(dts[dts.length - 1]) - new Date(dts[0])) / 86400000) + ' 天' : '—';
$('kSpanS').textContent = dts.length ? dts[0] + ' → ' + dts[dts.length - 1] : '';

/* ── 里程碑 ── */
let dipI = 0;
for (let i = 1; i < Math.min(6, DATA.length); i++) if (DATA[i].pass < DATA[dipI].pass) dipI = i;
const milestones = [
  { i: dipI, ico: '🕳', bg: 'rgba(248,113,113,.12)', tt: '重构低谷', ss: DATA[dipI].ver + ' 仅 ' + DATA[dipI].pass + '/' + NT + '（底层重构阵痛）' },
  { i: ji, ico: '🚀', bg: 'rgba(56,189,248,.12)', tt: '单版最大提升', ss: DATA[ji].ver + ' 一轮 +' + jd + ' 例（' + DATA[ji - 1].pass + ' → ' + DATA[ji].pass + '）' },
];
if (green.length) milestones.push({ i: DATA.indexOf(green[0]), ico: '✅', bg: 'rgba(52,211,153,.12)', tt: '首次全绿', ss: green[0].ver + ' 率先 ' + NT + '/' + NT });
milestones.push({ i: DATA.length - 1, ico: '🏁', bg: 'rgba(139,92,246,.12)', tt: '收官', ss: last.ver + ' · ' + last.pass + '/' + NT + (last.date ? ' · ' + last.date : '') });
for (const m of milestones) {
  if (m.i == null || m.i < 0) continue;
  const el = document.createElement('div');
  el.className = 'ms';
  el.innerHTML = '<div class="ico" style="background:' + m.bg + '">' + m.ico + '</div>' +
    '<div><div class="tt">' + m.tt + ' · ' + DATA[m.i].ver + '</div><div class="ss">' + m.ss + '</div></div>' +
    '<div class="goto">›</div>';
  el.onclick = () => { select(m.i, true); };
  $('msList').appendChild(el);
}

/* ── 曲线 ── */
const cv = $('cv'), ctx = cv.getContext('2d'), tip = $('tip');
const val = (d) => d.supported ? (metric === 'abs' ? (group === 'all' ? d.pass : d.perGroup[group]) : (group === 'all' ? d.pass * 100 / d.total : d.perGroup[group] * 100 / GROUPS[group])) : null;
const yMax = () => metric === 'pct' ? 100 : (group === 'all' ? NT : GROUPS[group]);

function monotone(pts) { // Fritsch–Carlson 三次插值，返回每段控制点
  const n = pts.length, dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1][0] - pts[i][0]); dy.push(pts[i + 1][1] - pts[i][1]); m.push(dy[i] / dx[i]); }
  const c1 = [m[0]];
  for (let i = 1; i < n - 1; i++) c1.push((m[i - 1] * m[i] <= 0) ? 0 : 3 / (1 / m[i - 1] + 1 / m[i]));
  c1.push(m[n - 2]);
  const segs = [];
  for (let i = 0; i < n - 1; i++) {
    const x = pts[i][0], y = pts[i][1];
    segs.push([x, y, x + dx[i] / 3, y + c1[i] * dx[i] / 3, x + dx[i] * 2 / 3, y + (m[i] - c1[i] / 3 - c1[i + 1] / 6) * dx[i] / 3 + 0, pts[i + 1][0], pts[i + 1][1]]);
  }
  return segs;
}

function draw() {
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const pad = { l: 52, r: 18, t: 26, b: 52 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const n = DATA.length;
  const x = i => pad.l + (n === 1 ? iw / 2 : i * iw / (n - 1));
  const y = v => pad.t + ih - v * ih / yMax();
  // 网格与 y 刻度
  ctx.font = '11px ' + 'Consolas, monospace';
  const ym = yMax();
  const yTicks = [];
  const tickN = 8;
  for (let k = 0; k <= tickN; k++) yTicks.push(Math.round(ym * k / tickN));
  for (const t of yTicks) {
    ctx.strokeStyle = 'rgba(148,163,184,.08)'; ctx.beginPath();
    ctx.moveTo(pad.l, y(t)); ctx.lineTo(W - pad.r, y(t)); ctx.stroke();
    ctx.fillStyle = '#7c8aa0'; ctx.textAlign = 'right'; ctx.fillText(t, pad.l - 8, y(t) + 4);
  }
  // 顶格参考线
  ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(52,211,153,.45)';
  ctx.beginPath(); ctx.moveTo(pad.l, y(ym)); ctx.lineTo(W - pad.r, y(ym)); ctx.stroke();
  ctx.setLineDash([]);
  // x 标签
  ctx.textAlign = 'center';
  const step = Math.ceil(n / Math.floor(iw / 56));
  let lastLX = -1e9;
  for (let i = 0; i < n; i++) {
    if ((i % step === 0 || i === n - 1) && x(i) - lastLX > 44) {
      lastLX = x(i);
      ctx.save(); ctx.translate(x(i), pad.t + ih + 8); ctx.rotate(-Math.PI / 6);
      ctx.textAlign = 'right'; ctx.fillStyle = '#7c8aa0'; ctx.fillText(DATA[i].ver, 0, 8); ctx.restore();
    }
  }
  // 曲线点集（跳过不支持的）
  const pts = [];
  for (let i = 0; i < n; i++) { const v = val(DATA[i]); if (v !== null) pts.push([x(i), y(v), i]); }
  // 面积
  if (pts.length > 1) {
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ih);
    grad.addColorStop(0, 'rgba(56,189,248,.22)'); grad.addColorStop(1, 'rgba(56,189,248,.02)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pad.t + ih);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(pts[pts.length - 1][0], pad.t + ih); ctx.closePath(); ctx.fill();
    // 平滑曲线
    const segs = monotone(pts);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(segs[0][0], segs[0][1]);
    for (const s of segs) ctx.bezierCurveTo(s[2], s[3], s[4], s[5], s[6], s[7]);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  // 里程碑竖标
  ctx.font = '11px "Segoe UI", "Microsoft YaHei", sans-serif';
  for (const m of milestones) {
    if (m.i == null || m.i < 0 || !DATA[m.i].supported) continue;
    const v = val(DATA[m.i]); if (v === null) continue;
    const mx = x(m.i), my = y(v);
    ctx.strokeStyle = 'rgba(139,92,246,.5)'; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(mx, pad.t); ctx.lineTo(mx, pad.t + ih); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath(); ctx.arc(mx, my, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a0e14'; ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // 数据点
  for (const [px, py, i] of pts) {
    const d = DATA[i];
    const rate = d.pass / d.total;
    ctx.fillStyle = rate === 1 ? '#34d399' : rate >= .9 ? '#fbbf24' : '#f87171';
    ctx.beginPath(); ctx.arc(px, py, i === hoverI || i === selI ? 5.5 : 2.6, 0, Math.PI * 2); ctx.fill();
    if (i === hoverI || i === selI) {
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
  // 悬停十字线
  if (hoverI >= 0 && DATA[hoverI].supported) {
    ctx.strokeStyle = 'rgba(226,232,240,.22)';
    ctx.beginPath(); ctx.moveTo(x(hoverI), pad.t); ctx.lineTo(x(hoverI), pad.t + ih); ctx.stroke();
  }
  geom = { pad, iw, ih, x, y };
}

let geom = null;
cv.addEventListener('mousemove', (e) => {
  if (!geom) return;
  const r = cv.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const n = DATA.length;
  let best = -1, bd = 1e9;
  for (let i = 0; i < n; i++) {
    const cx = geom.pad.l + (n === 1 ? geom.iw / 2 : i * geom.iw / (n - 1));
    if (Math.abs(mx - cx) < bd) { bd = Math.abs(mx - cx); best = i; }
  }
  hoverI = (bd < 14 && DATA[best].supported) ? best : -1;
  if (hoverI >= 0) {
    const d = DATA[hoverI];
    tip.style.display = 'block';
    const px = geom.x(hoverI);
    tip.style.left = Math.min(px + 16, cv.clientWidth - 250) + 'px';
    tip.style.top = '14px';
    const gr = ['main', 'cov', 'gap'].map(g =>
      '<div class="gr"><i style="background:' + GROUP_COLOR[g] + '"></i>' + GROUP_NAME[g] +
      '<b>' + d.perGroup[g] + '/' + GROUPS[g] + '</b></div>').join('');
    tip.innerHTML = '<span class="tv">' + d.ver + '</span><span class="td">' + (d.date || '') + ' · ' + (d.ms / 1000).toFixed(1) + 's</span>' +
      '<div class="tp ' + (d.pass === NT ? 'ok' : '') + '" style="color:' + (d.pass === NT ? '#34d399' : '#f87171') + '">' +
      (group === 'all' ? d.pass + ' / ' + NT : d.perGroup[group] + ' / ' + GROUPS[group]) +
      '<span style="font-size:12px;font-weight:400;color:#7c8aa0">（' + (d.pass * 100 / d.total).toFixed(1) + '%）</span></div>' + gr +
      '<div style="color:#475569;font-size:10.5px;margin-top:4px">点击查看失败清单</div>';
    cv.style.cursor = 'pointer';
  } else { tip.style.display = 'none'; cv.style.cursor = 'crosshair'; }
  draw();
});
cv.addEventListener('mouseleave', () => { hoverI = -1; tip.style.display = 'none'; draw(); });
cv.addEventListener('click', () => { if (hoverI >= 0) select(hoverI, false); });

let curD = null, dTab = 'fails';
function select(i, scroll, tab) {
  selI = i;
  draw();
  renderGBars();
  const d = DATA[i];
  curD = d;
  dTab = (tab === 'notes' && NOTES[d.ver]) ? 'notes' : 'fails';
  const el = $('detail');
  el.style.display = 'block';
  const hasNotes = !!NOTES[d.ver];
  el.innerHTML = '<div class="dh"><h3>' + d.ver + '</h3><span style="color:var(--faint);font-size:12px">' + (d.date || '') +
    ' · ' + (d.ms / 1000).toFixed(1) + 's · 失败 ' + d.fails.length + '/' + d.total + '</span>' +
    '<div class="dtabs" style="margin-left:auto">' +
    '<button data-t="fails"' + (dTab === 'fails' ? ' class="on"' : '') + '>失败清单 ' + d.fails.length + '</button>' +
    '<button data-t="notes"' + (dTab === 'notes' ? ' class="on"' : '') + (hasNotes ? '' : ' disabled style="opacity:.4;cursor:default"') + '>更新说明</button></div>' +
    '<button class="close">关闭</button></div><div id="dBody"></div>';
  el.querySelectorAll('.dtabs button[data-t]').forEach(b => {
    b.onclick = () => {
      if (b.disabled) return;
      dTab = b.dataset.t;
      el.querySelectorAll('.dtabs button[data-t]').forEach(x => x.classList.toggle('on', x === b));
      renderDTab();
    };
  });
  el.querySelector('.close').onclick = () => { el.style.display = 'none'; selI = -1; draw(); renderGBars(); renderTable(); };
  renderDTab();
  $('gSel').textContent = '（当前：' + d.ver + '）';
  if (scroll) cv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderDTab() {
  const d = curD;
  const body = $('dBody');
  if (dTab === 'notes') {
    body.innerHTML = NOTES[d.ver]
      ? '<div class="mdnotes">' + NOTES[d.ver] + '</div>'
      : '<div class="nonotes">该版本没有存档更新说明文档。</div>';
    return;
  }
  const fgroup = {};
  for (const s of d.fails) { const t = s.slice(0, s.indexOf('/')), nm = s.slice(s.indexOf('/') + 1); (fgroup[t] = fgroup[t] || []).push(nm); }
  const gbars = ['main', 'cov', 'gap'].map(g => {
    const tot = GROUPS[g], p = d.perGroup[g], rate = p * 100 / tot;
    const col = rate === 100 ? '#34d399' : rate >= 90 ? '#fbbf24' : '#f87171';
    return '<div class="gbar"><div class="gl"><i style="width:8px;height:8px;border-radius:2px;background:' + GROUP_COLOR[g] + ';display:inline-block;margin-right:6px"></i>' +
      GROUP_NAME[g] + '<b>' + p + '/' + tot + ' · ' + rate.toFixed(1) + '%</b></div>' +
      '<div class="track"><div class="fill" style="width:' + rate + '%;background:' + col + '"></div></div></div>';
  }).join('');
  const keys = Object.keys(fgroup).sort();
  const flist = keys.map(t => {
    const names = fgroup[t].map(n => '<span class="fn">' + n + '</span>').join('');
    return '<details><summary>' + t + ' <span class="n">' + fgroup[t].length + ' 败</span></summary><div style="padding:4px 0 6px">' + names + '</div></details>';
  }).join('') || '';
  body.innerHTML = '<div class="gbars">' + gbars + '</div>' +
    (d.fails.length === 0 ? '<div class="allok">全部通过 ✓</div>' : '<div class="failwrap">' + flist + '</div>');
}

/* ── 套件构成条 ── */
function renderGBars() {
  const d = selI >= 0 ? DATA[selI] : last;
  $('gSel').textContent = selI >= 0 ? '（当前：' + d.ver + '）' : '（默认最新版，点击曲线选择）';
  $('gbars').innerHTML = ['main', 'cov', 'gap'].map(g => {
    const tot = GROUPS[g], p = d.perGroup[g], rate = p * 100 / tot;
    const col = rate === 100 ? '#34d399' : rate >= 90 ? '#fbbf24' : '#f87171';
    return '<div class="gbar"><div class="gl"><i style="width:8px;height:8px;border-radius:2px;background:' + GROUP_COLOR[g] + ';display:inline-block;margin-right:6px"></i>' +
      GROUP_NAME[g] + '<b>' + d.ver + '：' + p + '/' + tot + ' · ' + rate.toFixed(1) + '%</b></div>' +
      '<div class="track"><div class="fill" style="width:' + rate + '%;background:' + col + '"></div></div></div>';
  }).join('');
}
renderGBars();

/* ── 表格 ── */
const tb = document.querySelector('#tbl tbody');
function renderTable() {
  tb.innerHTML = '';
  const rows = DATA.map((d, i) => ({ d, i }))
    .filter(({ d }) => !query || d.ver.toLowerCase().includes(query));
  rows.sort((a, b) => {
    const va = a.d, vb = b.d;
    let x, y2;
    if (sortK === 'i') { x = a.i; y2 = b.i; }
    else if (sortK === 'ver') { x = va.ver; y2 = vb.ver; }
    else if (sortK === 'date') { x = va.date || ''; y2 = vb.date || ''; }
    else if (sortK === 'fail') { x = va.total - va.pass; y2 = vb.total - vb.pass; }
    else if (sortK === 'rate') { x = va.pass / va.total; y2 = vb.pass / vb.total; }
    else if (sortK === 'ms') { x = va.ms; y2 = vb.ms; }
    else { x = va.pass; y2 = vb.pass; }
    return (x < y2 ? -1 : x > y2 ? 1 : 0) * sortDir;
  });
  for (const { d, i } of rows) {
    const rate = d.pass * 100 / d.total;
    const col = rate === 100 ? '#34d399' : rate >= 90 ? '#fbbf24' : '#f87171';
    const tr = document.createElement('tr');
    if (i === selI) tr.className = 'sel';
    tr.innerHTML = '<td class="num dim2">' + (i + 1) + '</td><td style="font-family:var(--mono);font-weight:600">' + d.ver + '</td>' +
      '<td class="dim2">' + (d.date || '') + '</td>' +
      '<td class="num ' + (d.pass === d.total ? 'ok' : '') + '">' + d.pass + '</td>' +
      '<td class="num bad">' + (d.total - d.pass) + '</td>' +
      '<td class="num"><div class="ratecell"><span style="color:' + col + '">' + rate.toFixed(1) + '%</span>' +
      '<div class="track"><div class="fill" style="width:' + rate + '%;background:' + col + '"></div></div></div></td>' +
      '<td class="num dim2">' + (d.ms / 1000).toFixed(1) + 's</td>' +
      '<td>' + (d.pass === d.total ? '<span class="ok">全绿 ✓</span>' : '<span class="bad">' + (d.total - d.pass) + ' 败</span>') + '</td>';
    tr.onclick = () => { select(i, false); renderTable(); };
    tb.appendChild(tr);
  }
  document.querySelectorAll('#tbl th').forEach(th => {
    const base = th.textContent.replace(/[▲▼]/g, '');
    th.innerHTML = base + (th.dataset.k === sortK ? ' <span class="arr">' + (sortDir > 0 ? '▲' : '▼') + '</span>' : '');
  });
}
document.querySelectorAll('#tbl th').forEach(th => {
  if (!th.dataset.k) return;
  th.onclick = () => {
    if (sortK === th.dataset.k) sortDir = -sortDir;
    else { sortK = th.dataset.k; sortDir = (sortK === 'i' || sortK === 'ver') ? 1 : -1; }
    renderTable();
  };
});
$('q').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); renderTable(); });
renderTable();

/* ── 分段按钮 ── */
$('segMetric').querySelectorAll('button').forEach(b => b.onclick = () => {
  metric = b.dataset.m;
  $('segMetric').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  draw();
});
$('segGroup').querySelectorAll('button').forEach(b => b.onclick = () => {
  group = b.dataset.g;
  $('segGroup').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  draw();
});
window.addEventListener('resize', draw);
draw();
// 深链接：#v4.219 选中版本；#v4.219/notes 直开更新说明
{
  const h = decodeURIComponent(location.hash.slice(1));
  if (h) {
    const [hv, ht] = h.split('/');
    const idx = DATA.findIndex(d => d.ver === hv);
    if (idx >= 0) select(idx, false, ht);
  }
}
</script>
</body>
</html>`;

const out = path.join(ROOT, 'MiniPy_套件通过曲线.html');
// 注意：replacement 必须用函数形式——说明文档里可能含 $`/$& 等，
// 字符串形式会被 replace 当作插入模式（曾导致脚本被复制、JSON 截断）
fs.writeFileSync(out, html
  .replace('__DATA__', () => JSON.stringify(data))
  .replace('__NOTES__', () => JSON.stringify(NOTES))
  .replace('__TAGS__', () => JSON.stringify(TAGS))
  .replace('__GROUPS__', () => JSON.stringify(GROUPS))
  .replace(/__NT__/g, () => String(expected.length))
  .replace(/__GMAIN__/g, () => String(GROUPS.main))
  .replace(/__GCOV__/g, () => String(GROUPS.cov))
  .replace(/__GGAP__/g, () => String(GROUPS.gap))
  .replace(/__NV__/g, () => String(data.length))
  .replace('__LASTVER__', () => data[data.length - 1].ver)
  .replace('__GENTIME__', () => new Date().toISOString().replace('T', ' ').slice(0, 19)));
console.log('written: ' + out);
