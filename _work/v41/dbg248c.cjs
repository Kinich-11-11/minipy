const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  const grpScan = find(al, (b) => b.opcode === 'control_repeat_until' && b.inputs.CONDITION";
const dbg = [
  "  {",
  "    let c1 = 0, c2 = 0, c3 = 0, c4 = 0, c5 = 0, c6 = 0;",
  "    for (const id of al) {",
  "      const b = BL()[id];",
  "      if (b.opcode !== 'control_repeat_until') continue;",
  "      c1++;",
  "      if (!b.inputs.CONDITION) continue;",
  "      c2++;",
  "      if (!BL()[b.inputs.CONDITION[1]] || BL()[b.inputs.CONDITION[1]].opcode !== 'operator_gt') continue;",
  "      c3++;",
  "      const nm = nameOf(BL()[b.inputs.CONDITION[1]].inputs.OPERAND1);",
  "      if (nm !== 'aui2') continue;",
  "      c4++;",
  "      if (!b.inputs.SUBSTACK) continue;",
  "      c5++;",
  "      const headId = b.inputs.SUBSTACK[1];",
  "      const hb = BL()[headId];",
  "      const hc = hb && hb.inputs.CONDITION ? BL()[hb.inputs.CONDITION[1]] : null;",
  "      console.log('[P248dbg] loop ' + id + ' head=' + (hb ? hb.opcode : '?') + ' headCond=' + (hc ? hc.opcode : '?') + ' s1=' + (hc ? JSON.stringify(litOf(hc.inputs.STRING1)) : '-'));",
  "      c6++;",
  "    }",
  "    console.log('[P248dbg] clauses loops=' + c1 + ' cond=' + c2 + ' gt=' + c3 + ' aui2=' + c4 + ' sub=' + c5 + ' final=' + c6);",
  "  }",
  "  const grpScan = find(al, (b) => b.opcode === 'control_repeat_until' && b.inputs.CONDITION"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, dbg));
console.log('ok');
