'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const j = JSON.parse(zipRead('MiniPy_v4.31.sb3').find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
const it = j.targets.find(t => /Interp/i.test(t.name));
const st = j.targets.find(t => t.isStage);
const names = (t) => [...Object.values(t.variables||{}).map(v=>v[0]), ...Object.values(t.lists||{}).map(v=>v[0])];
const inn = names(it), stn = names(st);
for (const w of ['mv','tv','sv','sodep','mode','ticket','steps']) {
  console.log(w.padEnd(7) + ' interp=' + inn.includes(w) + ' stage=' + stn.includes(w));
}
// where is the fpop call and what surrounds it
const cu = (() => { for (const [id,b] of Object.entries(it.blocks)) { if (b.opcode==='procedures_definition' && b.inputs.custom_block) { const pr = it.blocks[b.inputs.custom_block[1]]; if (pr && pr.mutation.proccode === 'calluser %s %s %s') return id; } } })();
const seen = new Set(); const stack = [cu];
while (stack.length) { const id = stack.pop(); if (!id || seen.has(id)) continue; const b = it.blocks[id]; if (!b) continue; seen.add(id);
  if (b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fpop') {
    console.log('fpop call:', id);
    const p = it.blocks[b.parent];
    console.log('  parent:', b.parent, p && p.opcode);
    console.log('  prev:', (()=>{ for (const [pid,pb] of Object.entries(it.blocks)) if (pb.next === id) return pid + ' ' + pb.opcode + ' ' + JSON.stringify(pb.fields||{}); return null; })());
    console.log('  next:', b.next, it.blocks[b.next] && it.blocks[b.next].opcode, JSON.stringify(it.blocks[b.next] && it.blocks[b.next].fields || {}));
  }
  for (const v of Object.values(b.inputs||{})) if (v && typeof v[1] === 'string') stack.push(v[1]);
  if (b.next) stack.push(b.next);
}
