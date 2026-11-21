
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
const t = byName(A).TextRenderer;
const out=[]; const p=(...x)=>out.push(x.join(' '));
const roots=Object.keys(t.blocks).filter(id=>t.blocks[id]&&t.blocks[id].topLevel);
p('roots: ' + JSON.stringify(roots.map(id=>[id,t.blocks[id].opcode])));
// forward chain dump per root
for (const r of roots){
  const seq=[]; let cur=r, guard=0;
  while(cur && guard++<400){ const b=t.blocks[cur]; if(!b){seq.push('MISSING:'+cur);break;} seq.push(b.opcode+'#'+cur); cur=b.next; }
  p('ROOT ' + t.blocks[r].opcode + ' next-chain len=' + seq.length + ': ' + seq.slice(0,25).join(' -> '));
  // children by parent pointer
  const kids=Object.keys(t.blocks).filter(id=>t.blocks[id]&&t.blocks[id].parent===r);
  p('   children-by-parent: ' + JSON.stringify(kids.map(id=>t.blocks[id].opcode)));
}
// block id format survey
const ids=Object.keys(t.blocks);
p('id samples: ' + JSON.stringify(ids.slice(0,10)));
const dupes = ids.filter(id=>/-\d+$/.test(id));
p('ids ending with -N: ' + dupes.length + ' :: ' + JSON.stringify(dupes.slice(0,10)));
p('parent values sample: ' + JSON.stringify(ids.slice(0,6).map(id=>t.blocks[id].parent)));
fs.writeFileSync(base+'surface10.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,6000));
