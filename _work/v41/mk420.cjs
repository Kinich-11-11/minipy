// p420 = v4.187 + 探针：strval 入口打印 (vt, vv)，并给 printargs 的 4 处 strval 各打标记
const fs = require('fs');
const src = `patch('P420 probe strval calls', () => {
  const BB = T(IT).blocks;
  const LOGX = (expr) => callProc('log %s', [expr]);
  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);
  const taken = new Set(Object.values(T(IT).variables).map((x) => x[0]));
  for (const n of ['p420n', 'p420p']) if (taken.has(n)) throw new Error('[P420] var taken: ' + n);
  newVar('p420n', 0); newVar('p420p', 0);
  // strval 入口
  {
    const defId = defIdOf('strval %s %s');
    const head = BB[defId].next;
    insertBeforeStmt(head, [
      chgV('p420n', num(1)),
      IF(LT(VAR('p420n'), num(31)), [
        LOGX(JX(txt('S vt='), argOf('vt'), txt(' vv=['), argOf('vv'), txt(']')))
      ])
    ]);
  }
  // printargs 里每处 strval 之前打标记（按顺序编号）
  {
    const pa = defIdOf('printargs');
    let k = 0;
    const marks = [];
    const walk = (id) => {
      let c = id;
      while (c) {
        const q = BB[c];
        if (!q) break;
        if (q.opcode === 'procedures_call' && q.mutation && String(q.mutation.proccode) === 'strval %s %s') marks.push(c);
        for (const [kk, v] of Object.entries(q.inputs || {})) {
          if ((kk === 'SUBSTACK' || kk === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1]);
        }
        c = q.next;
      }
    };
    walk(BB[pa].next);
    for (const m of marks) {
      k++;
      const tag = 'P' + k;
      const before = [];
      const walkUp = (id) => { let c = id; while (c) { const q = BB[c]; if (!q) break; for (const [kk, v] of Object.entries(q.inputs || {})) { if ((kk === 'SUBSTACK' || kk === 'SUBSTACK2') && typeof v[1] === 'string') walkUp(v[1]); } c = q.next; } };
      insertBeforeStmt(m, [LOGX(JX(txt('PS'), txt(tag), txt(' vt='), argOf('evtype'), txt(' ev=['), VAR('ev'), txt(']')))]);
    }
    console.log('[P420] printargs strval sites=' + marks.length);
  }
  console.log('[P420] strval probe installed');
});
`;
fs.writeFileSync('_work/v41/p420.txt', src);
console.log('wrote p420.txt');
