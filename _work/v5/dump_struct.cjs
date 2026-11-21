const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
for(const t of p.targets){
  const B=t.blocks||{};
  const nb=Object.keys(B).length;
  const vars=Object.entries(t.variables||{}).map(([id,v])=>v[0]);
  const lists=Object.entries(t.lists||{}).map(([id,v])=>v[0]+'['+(Array.isArray(v[1])?v[1].length:0)+']');
  const procs=Object.entries(B).filter(([i,b])=>b.opcode==='procedures_prototype').map(([i,b])=>b.mutation.proccode);
  const events=Object.entries(B).filter(([i,b])=>b.opcode.startsWith('event_when')).map(([i,b])=>b.opcode+':'+JSON.stringify(b.fields));
  console.log('======== '+t.name+(t.isStage?' (STAGE)':'')+'  blocks='+nb+' vars='+vars.length+' lists='+lists.length);
  console.log('  VARS: '+vars.join(', '));
  console.log('  LISTS: '+lists.join(', '));
  console.log('  HATS: '+events.join(' | '));
  console.log('  PROCS('+procs.length+'):');
  for(const s of procs) console.log('     '+s);
}
