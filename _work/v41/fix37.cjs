const fs = require('fs');
const p = '_work/v41/pz37.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "  let i = 0;\n  for (const g of gates) {\n    i++;\n    const label = 'G' + i;";
const repl = [
  "  const desc = (id, d) => {",
  "    if (!id || d > 8 || typeof id !== 'string') return '?';",
  "    const b = BL()[id];",
  "    if (!b) return JSON.stringify(id);",
  "    if (b.opcode === 'data_itemoflist') return b.fields.LIST[0] + '[' + desc(b.inputs.INDEX[1], d + 1) + ']';",
  "    if (b.opcode === 'data_variable') return '$' + b.fields.VARIABLE[0];",
  "    if (b.opcode === 'argument_reporter_string_number') return '@' + b.fields.VALUE[0];",
  "    if (b.opcode === 'operator_equals') return '(' + desc(b.inputs.OPERAND1[1], d + 1) + '==' + desc(b.inputs.OPERAND2[1], d + 1) + ')';",
  "    if (b.opcode === 'operator_and') return '(' + desc(b.inputs.OPERAND1[1], d + 1) + ' and ' + desc(b.inputs.OPERAND2[1], d + 1) + ')';",
  "    if (b.opcode === 'operator_or') return '(' + desc(b.inputs.OPERAND1[1], d + 1) + ' or ' + desc(b.inputs.OPERAND2[1], d + 1) + ')';",
  "    if (b.opcode === 'operator_not') return 'not ' + desc(b.inputs.OPERAND[1], d + 1);",
  "    if (b.opcode === 'operator_add') return '(' + desc(b.inputs.NUM1[1], d + 1) + '+' + desc(b.inputs.NUM2[1], d + 1) + ')';",
  "    if (b.opcode === 'operator_subtract') return '(' + desc(b.inputs.NUM1[1], d + 1) + '-' + desc(b.inputs.NUM2[1], d + 1) + ')';",
  "    if (b.opcode === 'operator_gt') return '(' + desc(b.inputs.OPERAND1[1], d + 1) + '>' + desc(b.inputs.OPERAND2[1], d + 1) + ')';",
  "    if (b.opcode === 'operator_lt') return '(' + desc(b.inputs.OPERAND1[1], d + 1) + '<' + desc(b.inputs.OPERAND2[1], d + 1) + ')';",
  "    if ((b.opcode === 'math_number' || b.opcode === 'text') && b.fields) return JSON.stringify(b.fields.NUM ? b.fields.NUM[0] : b.fields.TEXT[0]);",
  "    return b.opcode.replace(/^operator_|^data_/, '') + '(' + Object.values(b.inputs || {}).map((v) => desc(v[1], d + 1)).join(',') + ')';",
  "  };",
  "  let i = 0;",
  "  for (const g of gates) {",
  "    i++;",
  "    const label = 'G' + i;",
  "    console.log('[PZ37] ' + label + ' cond=' + desc(BL()[g].inputs.CONDITION[1], 0).slice(0, 150));"
].join('\n');
if (!s.includes(anchor)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(anchor, repl));
console.log('ok');
