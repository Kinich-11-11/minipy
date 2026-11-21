const fs = require('fs');
const p = '_work/v41/p246.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "  const joinSet = at((b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'xgc'",
  "    && b.inputs.VALUE && BL()[b.inputs.VALUE[1]] && BL()[b.inputs.VALUE[1]].opcode === 'operator_join'",
  "    && String(JSON.stringify(b.inputs.VALUE)).includes('xgi'));"
].join('\n');
const to = [
  "  const joinSet = at((b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'xgc'",
  "    && b.inputs.VALUE && BL()[b.inputs.VALUE[1]] && BL()[b.inputs.VALUE[1]].opcode === 'operator_join'",
  "    && nameOf(BL()[b.inputs.VALUE[1]].inputs.STRING1) === 'xgc');"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
