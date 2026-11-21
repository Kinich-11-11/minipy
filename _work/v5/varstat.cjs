const fs=require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const proj = JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
const t = proj.targets.find(x=>x.name==='Interpreter');
const byId = t.blocks;
const refs = {};
function walk(id, top) {
  const b = byId[id]; if (!b) return;
  if (b.fields && b.fields.VARIABLE) { const n = b.fields.VARIABLE[0]; (refs[n] = refs[n] || new Set()).add(top); }
  for (const k in (b.inputs||{})) { const inp = b.inputs[k]; for (let i = 1; i < inp.length; i++) { const val = inp[i]; if (typeof val === 'string' && byId[val]) walk(val, top); } }
  if (b.next) walk(b.next, top);
}
for (const id in byId) if (byId[id].topLevel) walk(id, id);
const hist = {};
for (const n in refs) { const c = refs[n].size; hist[c] = (hist[c]||0)+1; }
console.log('vars by number of procedures referencing them:');
for (const k of Object.keys(hist).sort((a,b)=>a-b)) console.log('  ' + k + ' proc: ' + hist[k]);
console.log('referenced total =', Object.keys(refs).length);
console.log('declared total   =', Object.keys(t.variables||{}).length);