
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const out=[]; const p=(...x)=>out.push(x.join(' '));
function longStrings(P){
  const s=new Set();
  for (const t of P.targets) for (const id of Object.keys(t.blocks)){ const b=t.blocks[id]; if(!b||typeof b!=='object') continue;
    for(const [k,v] of Object.entries(b.fields||{})) if(typeof v[0]==='string'&&v[0].length>25) s.add(t.name+': '+v[0]);
    for(const [k,v] of Object.entries(b.inputs||{})){const val=v[1]; if(Array.isArray(val)&&typeof val[1]==='string'&&val[1].length>25) s.add(t.name+': '+val[1]);} }
  return [...s];
}
for (const [tag,P] of [['v4',A],['v7',B]]){
  const ls = longStrings(P);
  p('== ' + tag + ' long strings (' + ls.length + ') ==');
  ls.slice(0,25).forEach(s=>p('   ' + JSON.stringify(s).slice(0,200)));
}
fs.writeFileSync(base+'longstr.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,4000));
