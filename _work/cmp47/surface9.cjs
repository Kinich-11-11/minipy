
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
const out=[]; const p=(...x)=>out.push(x.join(' '));
function analyze(t){
  const roots=Object.keys(t.blocks).filter(id=>{const b=t.blocks[id]; return b&&typeof b==='object'&&b.topLevel;});
  const fwd=new Set();
  const walk=(id)=>{ if(!id||fwd.has(id))return; const b=t.blocks[id]; if(!b||typeof b!=='object')return; fwd.add(id);
    for(const ik of Object.keys(b.inputs||{})){const v=b.inputs[ik][1]; if(Array.isArray(v))walk(v[1]);} if(b.next)walk(b.next); };
  roots.forEach(walk);
  // backward: parent-chain reaches a root
  const rootSet=new Set(roots); const back=new Set();
  for(const id of Object.keys(t.blocks)){ let cur=id, guard=0, ok=false; const trail=[];
    while(cur && guard++<200){ if(rootSet.has(cur)){ok=true;break;} const b=t.blocks[cur]; if(!b){break;} trail.push(cur); cur=b.parent; }
    if(ok) trail.forEach(x=>back.add(x)); }
  const total=Object.keys(t.blocks).length;
  const neither=Object.keys(t.blocks).filter(id=>!fwd.has(id)&&!back.has(id));
  const fwdOnly=Object.keys(t.blocks).filter(id=>fwd.has(id)&&!back.has(id));
  return {total, roots:roots.length, fwd: fwd.size, back: back.size, neither: neither.length, fwdOnly: fwdOnly.length};
}
for (const n of ['Controller','Stage','TextRenderer','Interpreter']){
  p('## ' + n + ' v4 ' + JSON.stringify(analyze(byName(A)[n])));
  p('## ' + n + ' v7 ' + JSON.stringify(analyze(byName(B)[n])));
}
function histReach(t){ const roots=Object.keys(t.blocks).filter(id=>{const b=t.blocks[id];return b&&typeof b==='object'&&b.topLevel;}); const seen=new Set();
  const walk=(id)=>{ if(!id||seen.has(id))return; const b=t.blocks[id]; if(!b||typeof b!=='object')return; seen.add(id);
   for(const ik of Object.keys(b.inputs||{})){const v=b.inputs[ik][1]; if(Array.isArray(v))walk(v[1]);} if(b.next)walk(b.next);};
  roots.forEach(walk); const m=new Map(); seen.forEach(id=>{const b=t.blocks[id]; m.set(b.opcode,(m.get(b.opcode)||0)+1);}); return m; }
for (const n of ['Controller','Stage','TextRenderer']){
  const ha=histReach(byName(A)[n]), hb=histReach(byName(B)[n]);
  const keys=new Set([...ha.keys(),...hb.keys()]);
  const d=[...keys].filter(k=>(ha.get(k)||0)!==(hb.get(k)||0)).map(k=>k+': v4='+(ha.get(k)||0)+' v7='+(hb.get(k)||0));
  p('## REACHABLE-ONLY ' + n + ' diff=' + JSON.stringify(d));
}
fs.writeFileSync(base+'surface9.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,6000));
