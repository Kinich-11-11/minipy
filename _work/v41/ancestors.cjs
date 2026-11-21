// node ancestors.cjs <project.json> <blockId> : print the enclosing control conditions of a block
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const render = (id, depth) => {
  if (!id || depth > 8) return '...';
  const b = B[id];
  if (!b) return 'MISSING:' + id;
  let s = b.opcode.replace(/^operator_/, '').replace(/^data_/, '');
  if (b.fields && b.fields.VALUE) s += ' ' + JSON.stringify(b.fields.VALUE[0]);
  if (b.fields && b.fields.LIST) s += ' ' + b.fields.LIST[0];
  if (b.fields && b.fields.VARIABLE) s += ' ' + b.fields.VARIABLE[0];
  const parts = [];
  for (const [k, v] of Object.entries(b.inputs || {})) {
    if (v && typeof v[1] === 'string') parts.push(k + '=' + render(v[1], depth + 1));
    else parts.push(k + '=' + JSON.stringify(v));
  }
  if (parts.length) s += '(' + parts.join(', ') + ')';
  return s;
};
let cur = process.argv[3], guard = 0, level = 0;
while (cur && guard++ < 300) {
  const b = B[cur];
  if (!b) { console.log('MISSING'); break; }
  if (b.opcode === 'control_if' || b.opcode === 'control_if_else' || b.opcode === 'control_repeat_until'
    || b.opcode === 'control_repeat' || b.opcode === 'control_forever') {
    console.log('  '.repeat(level) + '[' + (b.inputs.CONDITION ? render(b.inputs.CONDITION[1], 0) : 'n/a') + '] ' + b.opcode + ' ' + cur);
    level++;
  }
  if (b.opcode === 'procedures_definition') { console.log('inside def ' + cur); break; }
  cur = b.parent;
}
