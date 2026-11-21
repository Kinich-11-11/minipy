
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
// who references the memory list / C_exe / stopPoint
const names=['memory','C_exe','stopPoint','code','console','file','fileData','KEY_map','undo'];
for (const n of names){
  const who=[];
  for (const t of p.targets){
    let c=0;
    for (const id in t.blocks){ const b=t.blocks[id]; const s=JSON.stringify(b); if (s.includes('"'+n+'"')) c++; }
    if (c) who.push(t.name+'('+c+')');
  }
  console.log(n+' -> '+who.join(', '));
}
// raw if block in FileManager
const t=p.targets.find(x=>x.name==='FileManager');
for (const id in t.blocks){ const b=t.blocks[id]; if(b.opcode==='control_if_else'){ console.log('RAWIF', JSON.stringify(b).slice(0,800)); break; } }
