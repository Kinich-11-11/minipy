const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const ents=zipRead(process.argv[2]);
const proj=JSON.parse(ents.find(e=>e.name==='project.json').data.toString('utf8'));
const tgt=proj.targets.find(t=>t.name==='Interpreter');
const blocks=tgt.blocks;
const topOf={};
function top(id){ let c=id, guard=0; while(blocks[c] && !blocks[c].topLevel && guard++<5000) c=blocks[c].parent; return c; }
const perScript={}; const varScripts={};
for(const id in blocks){ const b=blocks[id]; if(b.opcode!=='data_variable' && b.opcode!=='data_setvariableto' && b.opcode!=='data_changevariableby') continue;
  const v=b.fields && b.fields.VARIABLE && b.fields.VARIABLE[0]; if(!v) continue;
  const t=top(id); (perScript[t]=perScript[t]||new Set()).add(v);
  (varScripts[v]=varScripts[v]||new Set()).add(t); }
const vars=Object.keys(varScripts);
const shared=vars.filter(v=>varScripts[v].size>1);
const scripts=Object.keys(perScript);
let maxPriv=0, worst='';
for(const s of scripts){ const priv=[...perScript[s]].filter(v=>varScripts[v].size===1); if(priv.length>maxPriv){ maxPriv=priv.length; worst=s; } }
console.log('declared vars:', Object.keys(tgt.variables||{}).length);
console.log('vars referenced:', vars.length);
console.log('scripts:', scripts.length);
console.log('shared (used by >=2 scripts):', shared.length);
console.log('max private per script:', maxPriv);
console.log('theoretical pool =', shared.length + maxPriv);