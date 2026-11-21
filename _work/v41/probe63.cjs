'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const j = JSON.parse(zipRead('MiniPy_v4.31.sb3').find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
const t = j.targets.find(x => /Interp/i.test(x.name));
const B = t.blocks;
const varName = (id) => { for (const tt of j.targets) for (const [vid, v] of Object.entries(tt.variables||{})) if (vid === id) return v[0]; return id; };
const brief = (d) => {
  if (d === null || d === undefined) return String(d);
  if (typeof d === 'string') return B[d] ? '#' + B[d].opcode : '#' + d;
  if (Array.isArray(d)) {
    const b = d[1];
    if (typeof b === 'string' && B[b]) return '{' + B[b].opcode + '}';
    if (Array.isArray(b) && b[0] === 12) return '{var:' + b[1] + '}';
    return JSON.stringify(d);
  }
  return JSON.stringify(d);
};
// find the pause-status setters
for (const [id, b] of Object.entries(B)) {
  if (b.opcode !== 'data_setvariableto') continue;
  const vn = varName(b.fields.VARIABLE[1]);
  const val = b.inputs.VALUE;
  const lit = val && val[0] === 1 && val[1] && val[1][0] === 10 ? val[1][1] : null;
  if (vn === 'status' && lit && lit.indexOf('Paused') === 0) {
    console.log('=== status set ' + id + ' lit=' + JSON.stringify(lit));
    // walk up
    let cur = id, chain = [];
    while (cur && chain.length < 12) { chain.push(cur + ':' + B[cur].opcode + ' ' + (B[cur].fields.VARIABLE ? varName(B[cur].fields.VARIABLE[1]) : '')); const p = B[cur].parent; if (!p) break; chain.push('  ^parent ' + p + ':' + B[p].opcode + ' inputs=' + Object.entries(B[p].inputs||{}).map(([k,v])=>k+':'+brief(v)).join(' ')); cur = p; }
    console.log(chain.join('\n'));
    // find the enclosing control_if and its condition
    let p = B[id].parent, guard = 0;
    while (p && guard++ < 10) {
      if (B[p].opcode === 'control_if' || B[p].opcode === 'control_if_else') {
        console.log('  if=' + p + ' cond=' + brief(B[p].inputs.CONDITION) + ' condBlock=' + JSON.stringify(B[B[p].inputs.CONDITION[1]]));
        break;
      }
      p = B[p].parent;
    }
  }
}
