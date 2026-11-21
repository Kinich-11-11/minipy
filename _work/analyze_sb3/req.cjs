
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
for (const t of p.targets){
  for (const id in t.blocks){
    const b=t.blocks[id];
    const s=JSON.stringify(b);
    if (s.includes('request_single')||s.includes('input_data')||b.opcode==='sensing_askandwait'){
      console.log(t.name+' | '+b.opcode+' | '+s.slice(0,260));
    }
  }
}
