const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const nameOf={};
for(const t of p.targets){
  for(const [id,v] of Object.entries(t.variables||{})) nameOf[id]=v[0];
  for(const [id,v] of Object.entries(t.lists||{})) nameOf[id]=v[0];
}
const used={};
for(const t of p.targets){
  const vs=new Set(), ls=new Set();
  for(const id in t.blocks){
    const b=t.blocks[id];
    const f=b.fields||{};
    if(f.VARIABLE) vs.add(f.VARIABLE[0]);
    if(f.LIST) ls.add(f.LIST[0]);
  }
  used[t.name]={vars:[...vs].sort(), lists:[...ls].sort()};
}
for(const n of ['Stage','Controller','TextRenderer']){
  console.log('### '+n+' uses vars: '+used[n].vars.join(', '));
  console.log('### '+n+' uses lists: '+used[n].lists.join(', '));
}
// Stage hat bodies
const st=p.targets.find(t=>t.name==='Stage');
for(const id in st.blocks){ if(st.blocks[id].topLevel) console.log('STAGE HAT', id, st.blocks[id].opcode, JSON.stringify(st.blocks[id].fields)); }
