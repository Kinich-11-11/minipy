const fs = require('fs');
const src = `patch('P479 dump reader context', () => {
  const BB = T(IT).blocks;
  const ids = [];
  for (const id of Object.keys(BB)) {
    const q = BB[id];
    if (!q.fields || !q.fields.LIST || q.fields.LIST[0] !== 'GYield') continue;
    if (q.opcode !== 'data_itemoflist' && q.opcode !== 'data_lengthoflist') continue;
    ids.push(id);
  }
  for (const id of ids) {
    const q = BB[id];
    console.log('[P479] === ' + id + ' ' + q.opcode + ' inputs=' + JSON.stringify(q.inputs).slice(0, 220));
    let cur = q.next, n = 0;
    const chain = [];
    while (cur && n < 10) { const w = BB[cur]; chain.push(w.opcode + '(' + cur + ')'); cur = w.next; n++; }
    console.log('[P479]     next-chain=' + chain.join(' -> '));
    // 谁在它的输入里引用它（反向找）
    const users = [];
    for (const jd of Object.keys(BB)) {
      const w = BB[jd];
      if (JSON.stringify(w.inputs || {}).indexOf(id) >= 0) users.push(w.opcode + '(' + jd + ')');
      if (w.opcode === 'control_if' || w.opcode === 'control_if_else' || w.opcode === 'control_repeat_until') { /* keep */ }
    }
    console.log('[P479]     users=' + users.slice(0, 6).join(' , '));
  }
});`;
fs.writeFileSync('_work/v41/p479.txt', src);
console.log('p479 written');