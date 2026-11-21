const fs=require('fs');
const P=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const t=P.targets.find(t=>/Interp/i.test(t.name));
const B=t.blocks;
const walk=(id,ind,seen)=>{
  if(!id||seen.has(id)||ind>10)return;
  seen.add(id);
  const x=B[id];
  if(!x){console.log(' '.repeat(ind),'MISSING',id);return;}
  console.log(' '.repeat(ind), id.slice(0,18), x.opcode, JSON.stringify(x.fields).slice(0,80), JSON.stringify(x.inputs).slice(0,220));
  for(const v of Object.values(x.inputs||{})){
    if(typeof v[1]==='string') walk(v[1],ind+2,seen);
    else if(Array.isArray(v[1])&&typeof v[1][1]==='string') walk(v[1][1],ind+2,seen);
  }
  if(x.next) walk(x.next,ind,seen);
};
// find fail proc
for(const [id,b] of Object.entries(B)){
  if(b.opcode==='procedures_definition'&&b.inputs.custom_block){
    const pr=B[b.inputs.custom_block[1]];
    if(pr.mutation&&pr.mutation.proccode==='fail %s'){ walk(b.next,0,new Set()); }
  }
}
