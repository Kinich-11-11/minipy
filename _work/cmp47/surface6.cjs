
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
const out=[]; const p=(...x)=>out.push(x.join(' '));
function reachable(t){
  const seen=new Set();
  const walk=(id)=>{ if(!id||seen.has(id)) return; const b=t.blocks[id]; if(!b||typeof b!=='object') return; seen.add(id);
    for(const ik of Object.keys(b.inputs||{})){const v=b.inputs[ik][1]; if(Array.isArray(v)) walk(v[1]);}
    if(b.next) walk(b.next); };
  for(const id of Object.keys(t.blocks)){const b=t.blocks[id]; if(b&&typeof b==='object'&&(b.topLevel||b.parent===undefined)) walk(id);}
  return seen;
}
for (const n of ['Controller','Stage','TextRenderer','Interpreter']){
  const a=byName(A)[n], b=byName(B)[n];
  const ra=reachable(a), rb=reachable(b);
  const totalA=Object.keys(a.blocks).length, totalB=Object.keys(b.blocks).length;
  const orphA=Object.keys(a.blocks).filter(id=>!ra.has(id)), orphB=Object.keys(b.blocks).filter(id=>!rb.has(id));
  p('## ' + n + ' v4: total=' + totalA + ' reachable=' + ra.size + ' orphan=' + orphA.length + ' | v7: total=' + totalB + ' reachable=' + rb.size + ' orphan=' + orphB.length);
  if (n!=='Interpreter'){
    for (const id of orphA) p('   v4 orphan ' + id + ' :: ' + JSON.stringify(a.blocks[id]).slice(0,300));
    for (const id of orphB) p('   v7 orphan ' + id + ' :: ' + JSON.stringify(b.blocks[id]).slice(0,300));
  }
}
fs.writeFileSync(base+'surface6.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,9000));
