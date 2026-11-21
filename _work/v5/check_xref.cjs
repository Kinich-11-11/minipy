const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const ents=zipRead(process.argv[2]);
const proj=JSON.parse(ents.find(e=>e.name==='project.json').data.toString('utf8'));
const inter=proj.targets.find(t=>t.name==='Interpreter');
const ids=new Set(Object.keys(inter.variables||{}));
const names=new Set(Object.values(inter.variables||{}).map(v=>v[0]));
for(const t of proj.targets){ if(t===inter) continue;
  for(const id in t.blocks){ const b=t.blocks[id];
    const v=b.fields && b.fields.VARIABLE;
    if(v && ids.has(v[1])) console.log('CROSS-TARGET var ref', t.name, b.opcode, v[0]);
    const L=b.fields && b.fields.LIST;
    if(L && (inter.lists&&inter.lists[L[1]])) console.log('CROSS-TARGET list ref', t.name, b.opcode, L[0]);
  } }
const mons=(proj.monitors||[]).filter(m=>m.params&&m.params.VARIABLE&&ids.has(m.params.VARIABLE[1]));
console.log('monitors on Interpreter vars:', mons.length);
for(const m of mons) console.log('   mon', m.opcode, JSON.stringify(m.params.VARIABLE));
const ops={};
for(const id in inter.blocks){ const b=inter.blocks[id]; if(/variable/.test(b.opcode)) ops[b.opcode]=(ops[b.opcode]||0)+1; }
console.log('interpreter var opcodes:', JSON.stringify(ops));
console.log('interpreter lists:', Object.keys(inter.lists||{}).length);