// p412 = v4.186 + 探针：pctitem 入口打印 conv / vv / vt（限前 40 次）
const fs = require('fs');
const src = `patch('P412 probe pctitem conv', () => {
  const BB = T(IT).blocks;
  const LOGX = (expr) => callProc('log %s', [expr]);
  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);
  const taken = new Set(Object.values(T(IT).variables).map((x) => x[0]));
  if (taken.has('p412n')) throw new Error('[P412] var taken');
  newVar('p412n', 0);
  const defId = defIdOf('pctitem %s %s %s %s');
  const head = BB[defId].next;
  if (!head) throw new Error('[P412] pctitem body missing');
  insertBeforeStmt(head, [
    chgV('p412n', num(1)),
    IF(LT(VAR('p412n'), num(41)), [
      LOGX(JX(txt('P conv=['), argOf('conv'), txt('] vv=['), argOf('vv'), txt('] vt='), argOf('vt')))
    ])
  ]);
  console.log('[P412] pctitem entry probe installed');
});
`;
fs.writeFileSync('_work/v41/p412.txt', src);
console.log('wrote p412.txt');
