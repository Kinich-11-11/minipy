// p387 = v4.183 + 探针：在 listlit 的"尾段 eval"之前打印边界信息
const fs = require('fs');
const src = `patch('P387 probe listlit tail', () => {
  const BB = T(IT).blocks;
  const LOGX = (expr) => callProc('log %s', [expr]);
  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);
  const defId = defIdOf('listlit %s %s');
  const seqEval = [];
  const walk = (x) => {
    let c = x;
    while (c) {
      const q = BB[c];
      if (q.opcode === 'procedures_call' && q.mutation && String(q.mutation.proccode) === 'eval %s %s') seqEval.push(c);
      for (const [k, v] of Object.entries(q.inputs || {})) {
        if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1]);
      }
      c = q.next;
    }
  };
  walk(BB[defId].next);
  console.log('[P387] eval sites=' + seqEval.length);
  const tailEval = seqEval[seqEval.length - 1];
  const tokAt = (i) => item('Tok', i);
  insertBeforeStmt(tailEval, [
    LOGX(JX(
      txt('TL lo='), argOf('lo'), txt(' hi='), argOf('hi'),
      txt(' lplo='), VAR('lplo'), txt(' l6n='), VAR('l6n'),
      txt(' nC='), llen('LComm'),
      txt(' C1='), item('LComm', num(1)), txt(' C2='), item('LComm', num(2)), txt(' C3='), item('LComm', num(3)),
      txt(' T='), tokAt(argOf('lo')), tokAt(ADD(argOf('lo'), num(1))), tokAt(ADD(argOf('lo'), num(2))),
      tokAt(ADD(argOf('lo'), num(3))), tokAt(ADD(argOf('lo'), num(4))),
      tokAt(ADD(argOf('lo'), num(5))), tokAt(ADD(argOf('lo'), num(6)))
    ))
  ]);
  console.log('[P387] probe installed before tail eval');
});
`;
fs.writeFileSync('_work/v41/p387.txt', src);
console.log('wrote p387.txt');
