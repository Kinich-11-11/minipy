const fs = require('fs');
const p = '_work/v41/p279.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf('  // (c) 放行'), s.indexOf("  console.log('[P279] check='"));
const to = [
  "  // (c) 放行\"第一个实参必须是函数名\"的检查（改成全库按消息文本找，最稳）",
  "  let checkIf = null;",
  "  for (const id of Object.keys(T(IT).blocks)) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'control_if' || !b.inputs.CONDITION || !b.inputs.SUBSTACK) continue;",
  "    if (!deepText(id, 'first argument must be a function name', 0)) continue;",
  "    checkIf = id; break;",
  "  }",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
// callval 也改成全库找：限定在 P262 分支的 reach 里仍然优先，找不到就全库
const from2 = s.slice(s.indexOf('  let cv = null;'), s.indexOf("  console.log('[P279] callval='"));
const to2 = [
  "  let cv = null;",
  "  for (const id of br) {",
  "    const b = BL()[id];",
  "    if (b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'callval') { cv = id; break; }",
  "  }",
  ""
].join('\n');
if (!from2) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(from2, to2));
console.log('ok');
