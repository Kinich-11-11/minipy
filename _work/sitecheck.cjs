const p = require('D:/编程/scratch/ai/minipython/_work/v41/project.json');
const t = p.targets.find((x) => x.name === 'Interpreter');
const B = t.blocks;
function desc(d) {
  if (!d) return '?';
  if (Array.isArray(d) && d[0] === 12) return 'var:' + d[1];
  if (typeof d === 'string') return 'blk:' + d;
  if (typeof d[1] === 'string' && B[d[1]]) return B[d[1]].opcode + (B[d[1]].mutation ? '(' + B[d[1]].mutation.proccode + ')' : '');
  const l = (Array.isArray(d) && (d[0] === 10 || d[0] === 4)) ? JSON.stringify(d[1]) : null;
  if (l !== null) return 'lit' + l;
  if (Array.isArray(d[1]) && d[1][0] === 12) return 'var:' + d[1][1];
  return JSON.stringify(d).slice(0, 24);
}
function pred(id) { for (const [pid, b] of Object.entries(B)) if (b.next === id) return pid; return null; }
function owner(id) {
  let cur = id;
  while (cur && B[cur].opcode !== 'procedures_definition') cur = B[cur].parent;
  if (!cur) return '?';
  const proto = B[B[cur].inputs.custom_block[1]];
  return proto && proto.mutation ? proto.mutation.proccode : '?';
}
for (const [id, b] of Object.entries(B)) {
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'fail %s') continue;
  const v = Object.values(b.inputs || {})[0];
  if (!v || typeof v[1] !== 'string') continue;
  const j = B[v[1]];
  if (!j || j.opcode !== 'operator_join') continue;
  const s2 = j.inputs.STRING2;
  if (!(Array.isArray(s2) && Array.isArray(s2[1]) && s2[1][0] === 12 && s2[1][1] === 'p6msg')) continue;
  if (owner(id) !== 'rightside %s %s %s %s %s') continue;
  console.log('=== FAIL', id, 'msg=', desc(v));
  let cur = id;
  for (let g = 0; g < 6 && cur; g++) {
    const pr = pred(cur);
    if (!pr) { console.log('   (head of the chain)'); break; }
    const q = B[pr];
    console.log('   ', (q.opcode === 'procedures_call' && q.mutation ? 'CALL ' + q.mutation.proccode : q.opcode),
      Object.entries(q.fields || {}).map(([k, v2]) => k + '=' + v2[0]).join(','),
      Object.entries(q.inputs || {}).map(([k, v2]) => k + '=' + desc(v2)).join(' ').slice(0, 70));
    cur = pr;
  }
}
