const fs = require('fs');
let s = fs.readFileSync('_work/v41/p327.txt', 'utf8');
const from = "    if (readName(c.inputs.OPERAND1) !== 'mi') continue;\n    flatLoop = id; break;";
const to = [
  "    if (readName(c.inputs.OPERAND1) !== 'mi') continue;",
  "    // 只要 `mi > (eqi - 1)` 那个（扁平路径），不要 `mi > len(...)` 那种",
  "    const op2 = c.inputs.OPERAND2;",
  "    const b2 = Array.isArray(op2) && typeof op2[1] === 'string' ? BL()[op2[1]] : null;",
  "    if (!b2 || b2.opcode !== 'operator_subtract') continue;",
  "    flatLoop = id; break;"
].join('\n');
if (!s.includes(from)) { console.log('MISS - locator text not found'); process.exit(1); }
fs.writeFileSync('_work/v41/p327.txt', s.replace(from, to));
console.log('ok: flatLoop locator now requires operator_subtract');
