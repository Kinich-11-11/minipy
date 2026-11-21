
const DATA = [{"ver":"v4.240","date":"2026-11-21","supported":true,"total":1466,"pass":1456,"perGroup":{"main":168,"cov":705,"mods":259,"real":226,"gap":78,"demo":20},"fails":["_real3_pipe.json/_real3_pipe.json:match_re_pattern","_real_time.json/_real_time.json:strftime_time","_probe230.json/_probe230.json:genexp late binding","_probe230.json/_probe230.json:genexp arg eval order","_probe230.json/_probe230.json:closure container identity","_probe230.json/_probe230.json:local container vs caller name","_gap131.v222.json/_gap131.v222.json:next builtin missing","_gap131.v222.json/_gap131.v222.json:pow one arg","_gap131.v222.json/_gap131.v222.json:assert with message","_gap131.v222.json/_gap131.v222.json:type e equals E"],"ms":273648,"err":null}];
const NOTES = {"v4.240":"<h3>MiniPy v4.240 更新说明：sort 反向标志泄漏修复</h3>\n<p>基线：v4.239（<code>2c6e7d28</code>）。v4.239 拉取检验发现一处 v4.238 引入的缺陷（详见 <code>MiniPy_v4.239_拉取检验报告.md</code>），本轮以 P758 修复，产物 <code>MiniPy_v4.240.sb3</code>（55,605 块，check41 errors=0），管线 <code>assemble240.cjs → build240.js</code>。</p>\n<h4>缺陷与根因</h4>\n<p><b>症状</b>：<code>sorted(..., reverse=True)</code> 之后，同一程序里（乃至合并跑批的下一用例里）的 <code>.sort(key=...)</code> 被反向——显式 <code>reverse=False</code> 也压不住；无 key 的 <code>.sort()</code> 与 <code>sorted()</code> 内建形式不受影响；方法形式 <code>.sort(reverse=True)</code> 后接 <code>.sort(key=...)</code> 也不泄漏。</p>\n<pre><code>ts=[('a',2),('b',1)]\nprint(sorted(ts,key=lambda x:x[1],reverse=True)[0][0])   # &quot;a&quot; ✓\nb=['aaaa','b','cc']\nb.sort(key=len)\nprint(b)    # CPython ['b','cc','aaaa'] ｜ v4.238/239 ['aaaa','cc','b']（被反向）</code></pre>\n<p><b>根因</b>：带 key 的排序走 srtkey，方向由两个全局共同决定——<code>lsrev</code>（内层 lsort 的拾取方向，P206 时代）与 <code>p4rev</code>（lsort 之后的稳定降序重排，P566）。sorted() 的 eval 钩子每次调用都设置两者；<b>P752 的 sort752 只设 <code>lsrev</code>，从不设 <code>p4rev</code></b>——sorted(reverse=True) 留下的 <code>p4rev=1</code> 让后续带 key 的 <code>.sort</code> 被额外整体反向。无 key 的 <code>.sort()</code> 直接走 lsort，不经过 srtkey 的重排，故不受影响；作者 runrepair.mjs 逐例独立 VM 验收时 p4rev 恒为 0，看不见该泄漏。</p>\n<h4>修复（P758）</h4>\n<p>sort752 每次调用规范化两个标志，采用与 sorted() 钩子相同的契约：</p>\n<ul><li><b>key 路径</b>：<code>lsrev=0</code>（按键升序拾取）+ <code>p4rev=z752rev</code>（按需稳定降序重排）——对陈旧状态免疫；</li><li><b>无 key 路径</b>：<code>lsrev=z752rev</code>（原样）+ <code>p4rev=0</code>；</li><li>运行起点复位 <code>lsrev/p4rev</code>，合并跑批不再跨用例携带陈旧标志。</li></ul>\n<p>附带改善：<code>.sort(key=..., reverse=True)</code> 的等键组不再被整组翻转——P566 的稳定降序重排现在同样覆盖 <code>.sort</code> 方法路径，等键保持原序与 CPython 一致（此前该路径的 lsrev=1 是整体反向，等键组被倒置；既有套件恰好没有等键 + reverse 组合所以未暴露）。</p>\n<h4>验证</h4>\n<table><thead><tr><th>套件</th><th>v4.239</th><th>v4.240</th><th>说明</th></tr></thead><tbody><tr><td>泄漏复现族（8 个触发矩阵用例）</td><td>3/8</td><td><b>8/8</b></td><td>var1–5/disc1–3 全部转绿</td></tr><tr><td>隔离排序套件（key/reverse/稳定/对象）</td><td>6/6</td><td>6/6</td><td>无回归</td></tr><tr><td>等键稳定降序 + 基本反向 5 例</td><td>4/5*</td><td><b>5/5</b></td><td>*v4.239 的 stable_desc_key 等键组被翻转（本次顺带修正）</td></tr><tr><td>清单 33 例</td><td>33/33</td><td>33/33</td><td>无回归</td></tr><tr><td><code>_v238_target.txt</code> 合并 VM 跑</td><td>26/31</td><td><b>27/31</b></td><td>sort_builtin_key 转绿；余 4 例为报错文案对比伪影（CPython 3.12 措辞差异 + 错误行进 Output，见检验报告）</td></tr><tr><td>reg232 / gap131 / real3_hof 抽测</td><td>584/593、78/82、16/16</td><td>与基线持平</td><td>零回归（私有 tmpname 串行跑）</td></tr><tr><td>check41</td><td>55,600 块 0 错误</td><td>55,605 块 0 错误</td><td>—</td></tr></tbody></table>\n<p>MP-17（Tloop10000、Tdict500 的 10 秒目标）与 MP-18 的进一步优化仍按 v4.238/239 的自述维持未完成状态；P758 不触碰性能路径。</p>\n<h4>构建与复现</h4>\n<pre><code>node _work/v41/assemble240.cjs\nnode _work/v41/build240.js\nnode _work/v41/check41.cjs MiniPy_v4.240.sb3\nnode _work/v41/runall.mjs MiniPy_v4.240.sb3 _work/v41/out240bl _work/v41/_v237_bl.txt\nnode _work/v41/runall.mjs MiniPy_v4.240.sb3 _work/v41/out240v238t _work/v41/_v238_target.txt\nnode _work/v41/run_iso.mjs MiniPy_v4.240.sb3 _work/v41/_sort239.json _work/v41/_sort240_out.json clean240</code></pre>\n<p><code>assemble240.cjs --delta</code> 可在 v4.239 SB3 上生成增量构建器 <code>build240delta.js</code>（<code>V41_SRC</code> 指定基座）。</p>\n<table><thead><tr><th>文件</th><th>说明</th></tr></thead><tbody><tr><td><code>MiniPy_v4.240.sb3</code></td><td>本轮产物</td></tr><tr><td><code>_work/v41/p758.txt</code></td><td>修复补丁</td></tr><tr><td><code>_work/v41/_sortvar<i>.txt</code> / <code>_sortdisc</i>.txt</code></td><td>泄漏触发矩阵复现族</td></tr><tr><td><code>_work/v41/_sortstable.json</code></td><td>等键稳定降序验收</td></tr></tbody></table>"};               // ver -> 更新说明 html（嵌入内容）
const TAGS = {"_new1_alias":{"total":19,"group":"main"},"_new1add":{"total":1,"group":"main"},"_new2_algo":{"total":17,"group":"main"},"_new3_str":{"total":17,"group":"main"},"_new4_oop":{"total":13,"group":"main"},"_new5_func":{"total":15,"group":"main"},"_new6_edge":{"total":21,"group":"main"},"_new7_probe":{"total":26,"group":"main"},"_new7add":{"total":3,"group":"main"},"_new8_probe2":{"total":25,"group":"main"},"_new9_probe3":{"total":5,"group":"main"},"_new10_probe4":{"total":6,"group":"main"},"_cov1":{"total":44,"group":"cov"},"_cov10":{"total":37,"group":"cov"},"_cov2":{"total":30,"group":"cov"},"_cov205a":{"total":18,"group":"cov"},"_cov205b":{"total":14,"group":"cov"},"_cov205c":{"total":15,"group":"cov"},"_cov205d":{"total":15,"group":"cov"},"_cov205e":{"total":15,"group":"cov"},"_cov3":{"total":42,"group":"cov"},"_cov4":{"total":40,"group":"cov"},"_cov5":{"total":47,"group":"cov"},"_cov6":{"total":44,"group":"cov"},"_cov7":{"total":33,"group":"cov"},"_cov8":{"total":33,"group":"cov"},"_cov8_trunc":{"total":24,"group":"cov"},"_cov9":{"total":38,"group":"cov"},"_covC":{"total":39,"group":"cov"},"_covD":{"total":12,"group":"cov"},"_covheap":{"total":16,"group":"cov"},"_covX":{"total":63,"group":"cov"},"_covY":{"total":48,"group":"cov"},"_covZ":{"total":38,"group":"cov"},"_mods20_cmath.json":{"total":20,"group":"mods"},"_mods20_datetime.json":{"total":20,"group":"mods"},"_mods20_math.json":{"total":20,"group":"mods"},"_mods20_random.json":{"total":20,"group":"mods"},"_mods20_re.json":{"total":20,"group":"mods"},"_mods20_statistics.json":{"total":20,"group":"mods"},"_mods20_time.json":{"total":20,"group":"mods"},"_mods_cp.json":{"total":9,"group":"mods"},"_mods_cplx.json":{"total":12,"group":"mods"},"_mods_dt.json":{"total":13,"group":"mods"},"_mods_misc.json":{"total":10,"group":"mods"},"_mods_re.json":{"total":16,"group":"mods"},"_mods_rnd.json":{"total":14,"group":"mods"},"_mods_stat.json":{"total":9,"group":"mods"},"_mods_time.json":{"total":11,"group":"mods"},"_real2_container.json":{"total":16,"group":"real"},"_real2_cross.json":{"total":16,"group":"real"},"_real2_func.json":{"total":16,"group":"real"},"_real3_cpx.json":{"total":12,"group":"real"},"_real3_exc.json":{"total":16,"group":"real"},"_real3_hof.json":{"total":16,"group":"real"},"_real3_pipe.json":{"total":16,"group":"real"},"_real_cmath.json":{"total":20,"group":"real"},"_real_datetime.json":{"total":20,"group":"real"},"_real_math.json":{"total":20,"group":"real"},"_real_random.json":{"total":20,"group":"real"},"_real_re.json":{"total":20,"group":"real"},"_real_time.json":{"total":20,"group":"real"},"_probe_raw.json":{"total":12,"group":"mods"},"_probe230.json":{"total":12,"group":"mods"},"_probe230b.json":{"total":5,"group":"mods"},"_gap131.v222.json":{"total":82,"group":"gap"},"demos.json":{"total":19,"group":"demo"},"demos_input.json":{"total":1,"group":"demo"}};                 // tag -> {total, group}
const GROUPS = {"main":168,"cov":705,"mods":263,"real":228,"gap":82,"demo":20};             // group -> total 例数
const GROUP_NAME = { main: '主套件+探针', cov: '_cov* 回归', real: '真实场景', mods: '模块+专项', gap: 'gap131', demo: 'demo', other: '其他' };
const GROUP_COLOR = { main: '#38bdf8', cov: '#8b5cf6', real: '#34d399', mods: '#fbbf24', gap: '#f472b6', demo: '#a78bfa', other: '#94a3b8' };
const GROUP_ORDER = Object.keys(GROUPS).sort((a, b) => (GROUPS[b] - GROUPS[a]));
const NT = 1466;

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
    const gr = GROUP_ORDER.map(g =>
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
  const gbars = GROUP_ORDER.map(g => {
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
  $('gbars').innerHTML = GROUP_ORDER.map(g => {
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
// 分组按钮（动态）
{
  const seg = $('segGroup');
  const defs = [{ g: 'all', label: '全套件 ' + NT }].concat(GROUP_ORDER.map(g => ({ g, label: GROUP_NAME[g] + ' ' + GROUPS[g] })));
  for (const d of defs) {
    const b = document.createElement('button');
    b.dataset.g = d.g; b.textContent = d.label;
    if (d.g === 'all') b.className = 'on';
    b.onclick = () => {
      group = d.g;
      seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      draw();
    };
    seg.appendChild(b);
  }
}
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
