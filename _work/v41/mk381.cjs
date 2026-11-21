// p381 = p378 + 探针：lookup 入口（限量）、calluser 里 pbegin/pend 前后
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p378.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
// 计数器
s = s.replace("  newVar('cloFi', 0); newVar('cloI', 0); newVar('cloJ', 0);",
  "  newVar('cloFi', 0); newVar('cloI', 0); newVar('cloJ', 0);\n  if (taken.has('lkN')) throw new Error('[P381] var taken');\n  newVar('lkN', 0);");
// (A) lookup 入口日志（限量 60）
const lk = s.indexOf("  const lk = defIdOf('lookup %s');");
if (lk < 0) { console.log('MISS lk'); process.exit(1); }
s = s.replace("  let lastLk = BB[lk].next;", [
  "  let lastLk = BB[lk].next;",
  "  {",
  "    const h = BB[lk].next;",
  "    insertBeforeStmt(h, [",
  "      chgV('lkN', num(1)),",
  "      IF(LT(VAR('lkN'), num(61)), [",
  "        LOGX(JX(txt('LK #'), VAR('lkN'), txt(' vn='), argOf('vn'), txt(' fs='), llen('FnStack')))",
  "      ])",
  "    ]);",
  "  }"
].join('\n'));
// (B) calluser: pbegin / pend 前后日志
const cuMark = "  insertBeforeStmt(body, [addTo('FnStack', VAR('fi'))]);";
if (!s.includes(cuMark)) { console.log('MISS cu'); process.exit(1); }
s = s.replace(cuMark, [
  "  for (const nm of ['pbegin', 'pend']) {",
  "    let target = null;",
  "    let c2 = BB[cu].next;",
  "    while (c2) { const q = BB[c2]; if (q.opcode === 'procedures_call' && q.mutation && String(q.mutation.proccode) === nm) { target = c2; break; } c2 = q.next; }",
  "    if (!target) { console.log('[P381] MISS call ' + nm); continue; }",
  "    insertBeforeStmt(target, [LOGX(JX(txt('>>'), txt(nm), txt(' fi='), VAR('fi')))]);",
  "    spliceAfter(target, chain([LOGX(JX(txt('<<'), txt(nm)))]));",
  "  }",
  cuMark
].join('\n'));
s = s.split('P378').join('P381');
fs.writeFileSync('_work/v41/p381.txt', s);
console.log('wrote p381.txt');
