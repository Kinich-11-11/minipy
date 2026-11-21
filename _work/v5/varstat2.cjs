const fs=require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const proj = JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
const t = proj.targets.find(x=>x.name==='Interpreter');
const byId = t.blocks;
const per = {}; const multi = {};
function walk(id, top, seen) {
  const b = byId[id]; if (!b || seen.has(id)) return; seen.add(id);
  if (b.fields && b.fields.VARIABLE) { const n = b.fields.VARIABLE[0]; (per[top] = per[top] || new Set()).add(n); }
  for (const k in (b.inputs||{})) { const inp = b.inputs[k]; for (let i = 1; i < inp.length; i++) { const val = inp[i]; if (typeof val === 'string' && byId[val]) walk(val, top, seen); } }
  if (b.next) walk(b.next, top, seen);
}
for (const id in byId) if (byId[id].topLevel) walk(id, id, new Set());
const rows = Object.keys(per).map(k => [k, per[k].size]).sort((a,b)=>b[1]-a[1]);
const nameOf = (id) => { const b = byId[id]; const f = b && b.fields; return (b ? b.opcode : '?') + (f && f.PROCCode ? '' : '') ; };
console.log('scripts with the most variables:');
for (const [id, n] of rows.slice(0, 14)) {
  // find the procedure name via the definition block
  let nm = '?';
  for (const pid in byId) { const pb = byId[pid]; if (pb.opcode === 'procedures_definition') { const proto = pb.inputs.custom_block && pb.inputs.custom_block[1]; const pr = byId[proto]; if (pr && pr.mutation && pr.mutation.proccode) { const body = pb.next; if (String(body) === String(id) || true) { if (String(pid) === String(id) || String(pb.next) === String(id)) nm = pr.mutation.proccode; } } } }
  console.log('  ' + String(id).padEnd(22) + ' vars=' + String(n).padEnd(4) + ' ' + nm);
}
console.log('scripts total =', rows.length, ' sum vars =', rows.reduce((a,b)=>a+b[1],0));