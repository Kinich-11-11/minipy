
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const lines=[];
for (const t of p.targets){
  const blocks=t.blocks;
  const tops=Object.keys(blocks).filter(id=>blocks[id].topLevel && blocks[id].opcode==='procedures_definition');
  lines.push('### '+t.name+': '+tops.length+' definitions');
  for(const id of tops){
    const b=blocks[id];
    const protoId = b.inputs.custom_block && b.inputs.custom_block[1];
    const proto = protoId? blocks[protoId]:null;
    const code = proto? proto.mutation.proccode : '?';
    const args = proto? proto.mutation.argumentnames : '[]';
    const warp = proto? proto.mutation.warp : '?';
    lines.push('  '+id+' -> '+code+'  args='+args+' warp='+warp);
  }
}
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v5-defs.txt', lines.join('\n'));
console.log(lines.join('\n'));
