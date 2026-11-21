// 临时调试：打印 assignlist 里 RHS eval 之后的 error 原文
const fs = require('fs');
const p = '_work/v41/p228.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "  const flatNx = BL()[flatWalk].next;";
const ins = [
  "  const litOf2 = (d) => {",
  "    if (!Array.isArray(d)) return null;",
  "    if ((d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return String(d[1]);",
  "    if ((d[0] === 1 || d[0] === 2 || d[0] === 3) && Array.isArray(d[1])) return litOf2(d[1]);",
  "    return null;",
  "  };",
  "  const rhsEval = one(find(al, (b) => b.opcode === 'procedures_call' && b.mutation.proccode === 'eval %s %s'",
  "    && Object.values(b.inputs).some((v) => {",
  "      const t = Array.isArray(v) && typeof v[1] === 'string' ? BL()[v[1]] : null;",
  "      return !!t && t.opcode === 'operator_add' && nameOf(t.inputs.NUM1) === 'eqi' && litOf2(t.inputs.NUM2) === '1';",
  "    })), 'assignlist rhs eval');",
  "  spliceAfter(rhsEval, chain([",
  "    callProc('fail %s', [JOIN(txt('ERR<'), JOIN(VAR('error'), txt('>')))]),",
  "  ]));",
  ""
].join('\n');
if (!s.includes(anchor)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(anchor, ins + anchor));
console.log('instrumented');
