const fs=require('fs');
const P=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
console.log('extensions=',JSON.stringify(P.extensions));
console.log('meta=',JSON.stringify(P.meta));
for(const t of P.targets){
  const b=t.blocks||{};
  const ids=Object.keys(b);
  const ops={};
  for(const id of ids){const o=b[id].opcode; ops[o]=(ops[o]||0)+1;}
  const top=Object.entries(ops).sort((a,b)=>b[1]-a[1]).slice(0,25);
  console.log('--- '+t.name+' isStage='+t.isStage+' blocks='+ids.length);
  console.log('   top opcodes: '+top.map(x=>x[0]+':'+x[1]).join(', '));
}
