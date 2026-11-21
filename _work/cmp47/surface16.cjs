
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const out=[]; const p=(...x)=>out.push(x.join(' '));
function whoRefs(P, name){
  const r=[];
  for (const t of P.targets){
    let n=0;
    for (const id of Object.keys(t.blocks)){ const b=t.blocks[id]; if(!b||typeof b!=='object') continue;
      let hit=false;
      for (const [k,v] of Object.entries(b.fields||{})) if ((k==='VARIABLE'||k==='LIST')&&v[0]===name) hit=true;
      for (const [k,v] of Object.entries(b.inputs||{})) { const val=v[1]; if (Array.isArray(val)&&(val[0]===12||val[0]===13)&&val[1]===name) hit=true; }
      if(hit) n++; }
    if(n) r.push(t.name+':'+n);
  }
  return r.join(' ') || '(none)';
}
for (const n of ['ticket','stopreq','page','hscroll','Snapshot','Export','pc','steps','status','running','busy','speed']){
  p('REF ' + n + ' | v4: ' + whoRefs(A,n) + ' || v7: ' + whoRefs(B,n));
}
fs.writeFileSync(base+'surface16.txt', out.join('\n'),'utf8');
console.log(out.join('\n'));
