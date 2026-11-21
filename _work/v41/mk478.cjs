const fs = require('fs');
const src = `patch('P478 dump GYield readers', () => {
  const BB = T(IT).blocks;
  const out = [];
  for (const id of Object.keys(BB)) {
    const q = BB[id];
    if (!q.fields || !q.fields.LIST || q.fields.LIST[0] !== 'GYield') continue;
    if (q.opcode !== 'data_itemoflist' && q.opcode !== 'data_lengthoflist') continue;
    out.push(id + ' ' + q.opcode);
  }
  console.log('[P478] readers=' + out.join(' | '));
  // 打印每个 reader 的祖先链（沿 next/parent 双向尽力）
  for (const spec of out) {
    const id = spec.split(' ')[0];
    let chain = [], cur = id, n = 0;
    while (cur && n < 8) { chain.push(cur); cur = BB[cur] ? BB[cur].parent : null; n++; }
    console.log('[P478] ' + spec + ' parents=' + chain.join('<'));
  }
});`;
fs.writeFileSync('_work/v41/p478.txt', src);
console.log('p478 written');