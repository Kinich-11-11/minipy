
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const t=p.targets.find(x=>x.name==='FileManager');
for (const id in t.blocks){ const b=t.blocks[id]; if(b.opcode==='data_itemoflist'||b.opcode==='data_lengthoflist'){ console.log(id, JSON.stringify(b)); break; } }
for (const id in t.blocks){ const b=t.blocks[id]; if(b.opcode==='control_if'){ console.log('IF', id, JSON.stringify(b)); break; } }
