// 保证 p345 里同时存在：辅助函数（各一份）、C1–C6（链式 IF 之前）、A0–A3（链式分支内部）
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p345.txt', 'utf8');
const marker = "    // ---------- (2) 链式后半段 ----------";
if (!s.includes(marker)) { console.log('MISS chain marker'); process.exit(1); }

// 1) 辅助函数：去重后保证各一份
{
  const lines = s.split('\n');
  const seen = new Set();
  const out = [];
  for (const l of lines) {
    const key = l.trim().startsWith('const LOGX') ? 'LOGX' : (l.trim().startsWith('const JX') ? 'JX' : null);
    if (key) { if (seen.has(key)) continue; seen.add(key); }
    out.push(l);
  }
  s = out.join('\n');
  if (!s.includes('const LOGX')) {
    const anchor = "patch('P345 chained call second half', () => {";
    s = s.replace(anchor, [
      anchor,
      "  const LOGX = (expr) => callProc('log %s', [expr]);",
      "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"
    ].join('\n'));
  }
}

// 2) C1–C6（链式 IF 之前，无条件）
if (!s.includes("txt('C1 ok='")) {
  const tok = "item('Tok', ADD(VAR('p344close'), num(1)))";
  const c = [
    marker,
    "    LOGX(JX(txt('C1 ok='), VAR('p344ok'))),",
    "    LOGX(JX(txt('C2 close='), VAR('p344close'), txt(' hi='), argOf('hi'))),",
    "    LOGX(JX(txt('C3 tok=['), " + tok + ", txt(']'))),",
    "    LOGX(JX(txt('C4 eqparen='), EQ(" + tok + ", txt('(')))),",
    "    LOGX(JX(txt('C5 lt='), LT(VAR('p344close'), argOf('hi')))),"
  ].join('\n');
  s = s.replace(marker, c);
}

// 3) A0–A3（链式分支内部）
if (!s.includes("txt('A0 lo='")) {
  const a0 = "      callProc('callfn %s %s %s', [\n        item('Tok', argOf('lo')),";
  if (s.includes(a0)) {
    s = s.replace(a0, "      LOGX(JX(txt('A0 lo='), argOf('lo'), txt(' close='), VAR('p344close'), txt(' hi='), argOf('hi'))),\n" + a0);
  } else { console.log('WARN: A0 anchor missing'); }
}
if (!s.includes("txt('A1 ev=['")) {
  const a1 = "      setV('p345fn', item('FnName', VAR('ev'))),";
  if (s.includes(a1)) {
    s = s.replace(a1, "      LOGX(JX(txt('A1 ev=['), VAR('ev'), txt('] t='), VAR('evtype'))),\n" + a1);
  } else { console.log('WARN: A1 anchor missing'); }
}
if (!s.includes("txt('A3 ev=['")) {
  const a3 = "      stopThis()\n    ])";
  if (s.includes(a3)) {
    s = s.replace(a3, "      LOGX(JX(txt('A3 ev=['), VAR('ev'), txt('] t='), VAR('evtype'))),\n" + a3);
  } else { console.log('WARN: A3 anchor missing'); }
}
fs.writeFileSync('_work/v41/p345.txt', s);
console.log('p345 now has: helpers + C1-C5 + A0/A1/A3');
