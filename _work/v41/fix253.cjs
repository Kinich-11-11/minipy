const fs = require('fs');
const p = '_work/v41/p253.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf('  const hosts = new Set();'), s.indexOf("  console.log('[P253] pwrap scan hosts guarded"));
const to = [
  "  const containsIds = new Set(contains);",
  "  // 用"条件子树里是否含这些 contains"来找宿主（嵌套输入的 parent 链不可靠）",
  "  const hostList = find(ev, (b) => (b.opcode === 'control_if' || b.opcode === 'control_if_else') && b.inputs.CONDITION",
  "    && [...containsIds].some((cid) => deepHas(b.inputs.CONDITION[1], (x) => x === BL()[cid], 0)));",
  "  for (const h of hostList) {",
  "    const cond = BL()[h].inputs.CONDITION;",
  "    BL()[h].inputs.CONDITION = B.BOOL(AND(cond[1], NOT(EQ(item('Kind', VAR('pk')), txt('S')))));",
  "  }",
  "  const hosts = new Set(hostList);",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
