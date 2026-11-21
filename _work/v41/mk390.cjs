// p390 = v4.184 + 探针：tokenize 结束后打印 Tok/Kind 前若干项（限量 4 次）
const fs = require('fs');
const src = `patch('P390 probe tokenize output', () => {
  const BB = T(IT).blocks;
  const LOGX = (expr) => callProc('log %s', [expr]);
  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);
  const taken = new Set(Object.values(T(IT).variables).map((x) => x[0]));
  if (taken.has('tkN')) throw new Error('[P390] var taken');
  newVar('tkN', 0);
  const defId = defIdOf('tokenize %s');
  let last = BB[defId].next;
  while (BB[last].next) last = BB[last].next;
  const T4 = (i) => item('Tok', num(i));
  const K4 = (i) => item('Kind', num(i));
  spliceAfter(last, chain([
    chgV('tkN', num(1)),
    IF(LT(VAR('tkN'), num(5)), [
      LOGX(JX(txt('TK n='), llen('Tok'),
        txt(' 1='), T4(1), txt('/'), K4(1),
        txt(' 2='), T4(2), txt('/'), K4(2),
        txt(' 3='), T4(3), txt('/'), K4(3),
        txt(' 4='), T4(4), txt('/'), K4(4),
        txt(' 5='), T4(5), txt('/'), K4(5),
        txt(' 6='), T4(6), txt('/'), K4(6)))
    ])
  ]));
  console.log('[P390] tokenize probe installed');
});
`;
fs.writeFileSync('_work/v41/p390.txt', src);
console.log('wrote p390.txt');
