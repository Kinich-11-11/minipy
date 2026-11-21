// node exprOf.cjs <project.json> "<proccode>" "<needle>" : print the expression tree of every input that mentions the needle
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const want = process.argv[3];
const needle = process.argv[4] || '';
let def = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  if (q && q.mutation && q.mutation.proccode === want) { def = id; break; }
}
const seen = new Set();
const stack = [def];
const render = (id, depth) => {
  if (depth > 6 || !id) return '...';
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
const out = [];
while (stack.length) {
  const id = stack.pop();
  if (!id || seen.has(id)) continue;
  seen.add(id);
  const b = B[id];
  if (!b) continue;
  const j = JSON.stringify(b.inputs || {});
  const txt = render(id, 0);
  if (!needle || txt.includes(needle)) out.push(id + ' :: ' + txt);
  for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') stack.push(v[1]);
  if (b.next) stack.push(b.next);
}
console.log(out.slice(0, 60).join('\n'));
console.log('--- matched ' + out.length + ' of ' + seen.size);
