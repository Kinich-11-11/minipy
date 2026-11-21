const fs = require('fs');
let s = fs.readFileSync('_work/v41/p378.txt', 'utf8');
const from = [
  "  insertBeforeStmt(body, [addTo('FnStack', VAR('fi'))]);",
  "  spliceAfter(body, chain([deleteLast('FnStack')]));"
].join('\n');
if (!s.includes(from)) { console.log('MISS push block'); process.exit(1); }
const to = [
  "  // 第 134 轮探针证明：**函数体是在 `call [pbegin]` 里求值的**（x/n 的查找都落在",
  "  // `>>pbegin fi=2` 与 `>>pend fi=2` 之间），而 pbegin 在第 8 条、比我上一轮选的",
  "  // 第 37 条循环**更早**，所以那时 FnStack 还是空的 ⇒ 压/弹必须包住 pbegin/pend。",
  "  const findCall = (nm) => {",
  "    let c2 = BB[cu].next;",
  "    while (c2) { const q = BB[c2]; if (q.opcode === 'procedures_call' && q.mutation && String(q.mutation.proccode) === nm) return c2; c2 = q.next; }",
  "    return null;",
  "  };",
  "  const pb = findCall('pbegin');",
  "  const pd = findCall('pend');",
  "  if (!pb || !pd) throw new Error('[P382] pbegin/pend not found');",
  "  insertBeforeStmt(pb, [addTo('FnStack', VAR('fi'))]);",
  "  spliceAfter(pd, chain([deleteLast('FnStack')]));"
].join('\n');
s = s.replace(from, to);
s = s.split('P378').join('P382');
fs.writeFileSync('_work/v41/p382.txt', s);
console.log('wrote p382.txt');
