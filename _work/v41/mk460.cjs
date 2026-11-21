// p460 = v4.193 + 探针：给所有写 ItPos 的块加日志（打印块 id、当前 ev、ItPos 长度）
const fs = require('fs');
const src = `patch('P460 probe ItPos writers', () => {
  const BB = T(IT).blocks;
  const LOGX = (expr) => callProc('log %s', [expr]);
  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);
  const targets = [];
  for (const id of Object.keys(BB)) {
    const q = BB[id];
    if (!q.fields || !q.fields.LIST || q.fields.LIST[0] !== 'ItPos') continue;
    if (q.opcode !== 'data_addtolist' && q.opcode !== 'data_replaceitemoflist') continue;
    targets.push(id);
  }
  console.log('[P460] ItPos writers=' + targets.length);
  for (const id of targets) {
    insertBeforeStmt(id, [
      LOGX(JX(txt('IP '), txt(id), txt(' op='), txt(BB[id].opcode), txt(' ev=['), VAR('ev'), txt('] n='), llen('ItPos')))
    ]);
  }
  console.log('[P460] probes installed');
});
`;
fs.writeFileSync('_work/v41/p460.txt', src);
console.log('wrote p460.txt');
