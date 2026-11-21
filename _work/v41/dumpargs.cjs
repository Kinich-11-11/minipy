const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
function defIdOf(pc) {
  for (const id of Object.keys(B)) {
    const b = B[id];
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const q = B[b.inputs.custom_block[1]];
      if (q && q.mutation && q.mutation.proccode === pc) return id;
    }
  }
  throw new Error('no def ' + pc);
}
const def = defIdOf(process.argv[3] || 'tokenize %s');
const seen = new Set();
const stack = [B[def].next];
const found = [];
while (stack.length) {
  const cur = stack.pop();
  if (!cur || seen.has(cur)) continue;
  seen.add(cur);
  const b = B[cur];
  if (!b) continue;
  if (b.opcode === 'argument_reporter_string_number') found.push([cur, b]);
  for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') stack.push(v[1]);
  if (b.next) stack.push(b.next);
}
console.log('count=' + found.length);
for (const [id, b] of found.slice(0, 4)) console.log(id, JSON.stringify(b));
const ids = new Set(found.map(([id]) => id));
// how many parents reference each reporter?
const refs = {};
for (const pid of Object.keys(B)) {
  for (const [slot, v] of Object.entries(B[pid].inputs || {})) {
    if (v && typeof v[1] === 'string' && ids.has(v[1])) {
      refs[v[1]] = refs[v[1]] || [];
      refs[v[1]].push(B[pid].opcode + '.' + slot);
    }
  }
}
for (const [id, r] of Object.entries(refs)) console.log(id + ' refs=' + r.length + ' ' + r.join(','));
