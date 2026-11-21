
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const lines=[];
function scriptOf(blocks, topId){
  // count reachable
  let n=0; const seen=new Set();
  const stack=[topId];
  const ops={};
  while(stack.length){ const id=stack.pop(); if(seen.has(id))continue; seen.add(id); const b=blocks[id]; if(!b)continue; n++; ops[b.opcode]=(ops[b.opcode]||0)+1;
    for(const k in b.inputs){ const inp=b.inputs[k]; if(!inp)continue; for(let i=0;i<inp.length;i++){ const v=inp[i]; if(typeof v==='string') stack.push(v); else if(Array.isArray(v)){ if(typeof v[1]==='string'&&blocks[v[1]]) stack.push(v[1]); if(v[1]===undefined){} } } }
    if(b.next) stack.push(b.next);
    for(const k in b.fields){ const f=b.fields[k]; if(f && typeof f[1]==='string'){ if(blocks[f[1]]) {} } }
  }
  return {n, ops};
}
for (const t of p.targets){
  lines.push('##### '+t.name+' top-level scripts:');
  const blocks=t.blocks;
  const tops=Object.keys(blocks).filter(id=>blocks[id].topLevel);
  const info = tops.map(id=>({id, opcode:blocks[id].opcode, x:blocks[id].x, y:blocks[id].y, ...scriptOf(blocks,id)}));
  info.sort((a,b)=>b.n-a.n);
  for(const s of info) lines.push('  '+s.opcode.padEnd(28)+' blocks='+String(s.n).padStart(6)+'  at ('+s.x+','+s.y+')  id='+s.id);
}
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v5-scripts.txt', lines.join('\n'));
console.log(lines.join('\n').slice(0,10000));
