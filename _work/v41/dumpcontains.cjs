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
const want = process.argv[4];
// report every operator_contains whose STRING1 literal contains the wanted text, plus its parent chain
const seen = new Set();
const stack = [B[def].next];
while (stack.length) {
  const cur = stack.pop();
  if (!cur || seen.has(cur)) continue;
  seen.add(cur);
  const b = B[cur];
  if (!b) continue;
  if (b.opcode === 'operator_contains') {
    const s1 = b.inputs.STRING1, s2 = b.inputs.STRING2;
    const t1 = (s1 && Array.isArray(s1[1]) && (s1[1][0] === 10 || s1[1][0] === 4)) ? s1[1][1] : ('blk:' + s1[1]);
    const t2 = (s2 && Array.isArray(s2[1]) && (s2[1][0] === 10 || s2[1][0] === 4)) ? s2[1][1] : ('blk:' + s2[1]);
    if (want && !String(t1).includes(want)) { /* still walk */ } else {
      console.log(cur, 'S1=' + JSON.stringify(t1), 'S2=' + JSON.stringify(t2), 'parent=' + b.parent + ' op=' + (B[b.parent] ? B[b.parent].opcode : '?'));
    }
  }
  for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') stack.push(v[1]);
  if (b.next) stack.push(b.next);
}
