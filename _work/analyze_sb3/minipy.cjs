
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
console.log('extensions',JSON.stringify(p.extensions));
for(const t of p.targets){
  const procs=[]; for(const id in t.blocks){const b=t.blocks[id]; if(b.opcode==='procedures_prototype') procs.push(b.mutation.proccode);}
  const l=Object.values(t.lists||{}).map(x=>x[0]);
  const v=Object.values(t.variables||{}).map(x=>x[0]);
  console.log(t.name,'blocks=',Object.keys(t.blocks||{}).length,'procs=',procs.length,'lists=',JSON.stringify(l),'vars',v.length);
  if(procs.length) console.log('  PROCS:',procs.slice(0,80).join(' | '));
  if(v.length) console.log('  VARS:',v.slice(0,60).join(' | '));
}
