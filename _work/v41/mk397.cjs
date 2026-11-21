// p397 = v4.186 + 探针：minmax 入口打印 lo/hi/Tok 片段（限前 8 次）
const fs = require('fs');
const src = `patch('P397 probe minmax entry', () => {
  const BB = T(IT).blocks;
  const LOGX = (expr) => callProc('log %s', [expr]);
  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);
  const taken = new Set(Object.values(T(IT).variables).map((x) => x[0]));
  if (taken.has('p397n')) throw new Error('[P397] var taken');
  newVar('p397n', 0);
  const defId = defIdOf('minmax %s %s %s');
  const head = BB[defId].next;
  if (!head) throw new Error('[P397] minmax body not found');
  const T = (i) => item('Tok', i);
  insertBeforeStmt(head, [
    chgV('p397n', num(1)),
    IF(LT(VAR('p397n'), num(9)), [
      LOGX(JX(txt('MM lo='), argOf('lo'), txt(' hi='), argOf('hi'),
        txt(' nC='), llen('MComma'),
        txt(' T='), T(argOf('lo')), T(ADD(argOf('lo'), num(1))), T(ADD(argOf('lo'), num(2))),
        T(ADD(argOf('lo'), num(3))), T(ADD(argOf('lo'), num(4))),
        T(ADD(argOf('lo'), num(5))), T(ADD(argOf('lo'), num(6)))))
    ])
  ]);
  console.log('[P397] minmax entry probe installed');
});
`;
fs.writeFileSync('_work/v41/p397.txt', src);
console.log('wrote p397.txt');
