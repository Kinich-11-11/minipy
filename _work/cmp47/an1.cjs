const fs=require('fs');
const P=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const out=[];
out.push('targets='+P.targets.length);
for(const t of P.targets){
  const blocks=t.blocks||{};
  const ids=Object.keys(blocks);
  // count reachable (non-shadow) blocks
  let tops=0;
  for(const id of ids){const b=blocks[id]; if(!b.topLevel) continue; if(b.shadow) continue; tops++;}
  const procs=ids.filter(id=>blocks[id].opcode==='procedures_definition');
  out.push('--- '+t.name+' isStage='+t.isStage+' blocks='+ids.length+' tops='+tops+' procs='+procs.length+' vars='+Object.keys(t.variables||{}).length+' lists='+Object.keys(t.lists||{}).length);
  if(process.argv[3]==='procs'){
    for(const id of procs){
      const b=blocks[id];
      const inp=b.inputs&&b.inputs.custom_block;
      const protoId=inp&&inp[1];
      const proto=blocks[protoId];
      out.push('   proc: '+(proto?proto.mutation.proccode:'?'));
    }
  }
  if(process.argv[3]==='vars'){
    for(const [k,v] of Object.entries(t.variables||{})) out.push('   var: '+v[0]+' = '+JSON.stringify(v[1]).slice(0,80));
    for(const [k,v] of Object.entries(t.lists||{})) out.push('   list: '+v[0]+' len='+(v[1]||[]).length);
  }
}
fs.writeFileSync(process.argv[4]||'_an1.txt',out.join('\n'),'utf8');
console.log('done '+out.length);
