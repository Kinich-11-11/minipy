// report blocks reachable from a control block that are referenced by more than one input
// node _work/v41/multiparent.cjs <project.json> <blockId>
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const start = process.argv[3];
const refs = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  const seen = new Set();
  for (const [slot, v] of Object.entries(b.inputs || {})) {
    if (v && typeof v[1] === 'string' && !seen.has(v[1])) {
      seen.add(v[1]);
      if (!refs.has(v[1])) refs.set(v[1], []);
      refs.get(v[1]).push(id + '.' + slot);
    }
  }
  if (b.next) {
    if (!refs.has(b.next)) refs.set(b.next, []);
    refs.get(b.next).push(id + '.next');
  }
}
const reach = new Set();
const st = [start];
while (st.length) {
  const cur = st.pop();
  if (!cur || reach.has(cur)) continue;
  reach.add(cur);
  const b = B[cur];
  if (!b) continue;
  for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
  if (b.next) st.push(b.next);
}
let n = 0;
for (const id of reach) {
  const r = refs.get(id) || [];
  if (r.length > 1) { n++; console.log(id + ' (' + (B[id] ? B[id].opcode : '?') + ') <- ' + r.join(', ')); }
}
console.log('multi-parent blocks reachable from ' + start + ': ' + n + ' (of ' + reach.size + ')');
