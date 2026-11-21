
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p = JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e => e.name === 'project.json').data.toString('utf8'));
const ctrl = p.targets.find(t => t.name === 'Controller');
const B = ctrl.blocks;
function dump(id, indent, depth) {
  if (!id || depth > 6) return;
  const b = B[id];
  if (!b) { console.log(indent + '<?' + id + '>'); return; }
  const f = JSON.stringify(b.fields || {});
  const ins = Object.entries(b.inputs || {}).filter(([k]) => k !== 'SUBSTACK' && k !== 'SUBSTACK2')
    .map(([k, v]) => k + '=' + JSON.stringify(v)).join(' ');
  console.log(indent + b.opcode + ' ' + f + ' ' + ins);
  for (const [k, v] of Object.entries(b.inputs || {})) {
    if (Array.isArray(v) && typeof v[1] === 'string') { console.log(indent + '  [' + k + '] ->'); dump(v[1], indent + '    ', depth + 1); }
  }
}
for (const [id, b] of Object.entries(B)) {
  if (b.topLevel && b.opcode === 'event_whenkeypressed' && b.fields.KEY_OPTION[0] === 'up arrow') {
    console.log('##### UP HAT LADDER');
    let cur = b.next;
    while (cur) { dump(cur, ' ', 0); cur = B[cur].next; }
  }
}
