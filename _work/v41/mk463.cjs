// p463 = v4.195 + 探针：给 GYield 的每个读写点加日志（标签=块 id、操作、当前长度、ev/fi/pc）
const fs = require('fs');
const src = `patch('P463 trace GYield', () => {
  const BB = T(IT).blocks;
  const LOGX = (expr) => callProc('log %s', [expr]);
  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);
  const hit = (q) => {
    if (!q.fields) return false;
    if (q.fields.LIST && q.fields.LIST[0] === 'GYield') return true;
    return false;
  };
  const targets = [];
  for (const id of Object.keys(BB)) {
    const q = BB[id];
    if (!hit(q)) continue;
    if (q.opcode === 'data_addtolist' || q.opcode === 'data_deletealloflist' || q.opcode === 'data_itemoflist' || q.opcode === 'data_lengthoflist' || q.opcode === 'data_deleteoflist') targets.push(id);
  }
  console.log('[P463] GYield touch points=' + targets.length);
  for (const id of targets) {
    const op = BB[id].opcode;
    insertBeforeStmt(id, [
      LOGX(JX(txt('GY '), txt(id), txt(' '), txt(op), txt(' n='), llen('GYield'), txt(' ev=['), VAR('ev'), txt('] fi='), VAR('fi'), txt(' pc='), VAR('pc')))
    ]);
  }
  console.log('[P463] probes installed');
});
`;
fs.writeFileSync('_work/v41/p463.txt', src);
console.log('wrote p463.txt');
