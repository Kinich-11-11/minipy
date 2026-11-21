// p411 = v4.186 + 探针：veq 入口打印 (va,ta,vb,tb)（限前 24 次）
const fs = require('fs');
const src = `patch('P411 probe veq entry', () => {
  const BB = T(IT).blocks;
  const LOGX = (expr) => callProc('log %s', [expr]);
  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);
  const taken = new Set(Object.values(T(IT).variables).map((x) => x[0]));
  if (taken.has('p411n')) throw new Error('[P411] var taken');
  newVar('p411n', 0);
  const defId = defIdOf('veq %s %s %s %s');
  const head = BB[defId].next;
  if (!head) throw new Error('[P411] veq body missing');
  insertBeforeStmt(head, [
    chgV('p411n', num(1)),
    IF(LT(VAR('p411n'), num(25)), [
      LOGX(JX(txt('V a=['), argOf('va'), txt('] ta='), argOf('ta'), txt(' b=['), argOf('vb'), txt('] tb='), argOf('tb')))
    ])
  ]);
  console.log('[P411] veq entry probe installed');
});
`;
fs.writeFileSync('_work/v41/p411.txt', src);
console.log('wrote p411.txt');
