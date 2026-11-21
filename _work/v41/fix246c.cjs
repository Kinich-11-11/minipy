const fs = require('fs');
const p = '_work/v41/p246.txt';
let s = fs.readFileSync(p, 'utf8');
const fromLine = "  const zeroSet = at((b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'xgb' && litOfV(b.inputs.VALUE) === '0');";
const toBlock = [
  "  const endedGuard = at((b) => b.opcode === 'control_if' && b.inputs.CONDITION && BL()[b.inputs.CONDITION[1]]",
  "    && BL()[b.inputs.CONDITION[1]].opcode === 'operator_not'",
  "    && BL()[BL()[b.inputs.CONDITION[1]].inputs.OPERAND[1]]",
  "    && BL()[BL()[b.inputs.CONDITION[1]].inputs.OPERAND[1]].opcode === 'operator_equals'",
  "    && nameOf(BL()[BL()[b.inputs.CONDITION[1]].inputs.OPERAND[1]].inputs.OPERAND1) === 'xgs'",
  "    && litOfV(BL()[BL()[b.inputs.CONDITION[1]].inputs.OPERAND[1]].inputs.OPERAND2) === '');",
  "  if (endedGuard.length !== 1) throw new Error('[P246] ended-in-string guard = ' + endedGuard.length);",
  "  const zeroSet = at((b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'xgb' && litOfV(b.inputs.VALUE) === '0'",
  "    && b.parent === endedGuard[0]);"
].join('\n');
if (!s.includes(fromLine)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(fromLine, toBlock));
console.log('ok');
