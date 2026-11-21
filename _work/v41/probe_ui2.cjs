'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const j = JSON.parse(zipRead('MiniPy_v4.31.sb3').find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
const t = j.targets.find(x => x.name === 'TextRenderer');
const B = t.blocks;
const brief = (d) => {
  if (d === null || d === undefined) return String(d);
  if (typeof d === 'string') return B[d] ? '#' + d + '(' + B[d].opcode + ')' : '#' + d;
  if (Array.isArray(d)) { const b = d[1]; if (typeof b === 'string' && B[b]) return '{' + B[b].opcode + '}'; return JSON.stringify(d); }
  return JSON.stringify(d);
};
for (const [id, b] of Object.entries(B)) {
  if (!b.topLevel) continue;
  console.log('=== script ' + id + ' ' + b.opcode + ' ' + JSON.stringify(b.fields||{}));
  let cur = id, depth = 0, guard = 0;
  while (cur && guard++ < 200) {
    const bb = B[cur];
    if (!bb) break;
    const inp = Object.entries(bb.inputs||{}).map(([k,v]) => k + ':' + brief(v)).join(' ');
    console.log('   '.repeat(depth+1) + bb.opcode + ' ' + JSON.stringify(bb.fields||{}) + ' ' + inp);
    for (const [k,v] of Object.entries(bb.inputs||{})) if (Array.isArray(v) && v[0] === 2 && typeof v[1] === 'string') { /* substack */ }
    cur = bb.next;
  }
}
