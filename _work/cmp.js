
const fs=require('fs');
function stats(pj){
  const p=JSON.parse(fs.readFileSync(pj,'utf8'));
  const o={ext:p.extensions, targets:[], json:(fs.statSync(pj).size/1048576).toFixed(2)};
  for(const t of p.targets){ const ids=Object.keys(t.blocks||{}).filter(id=>t.blocks[id]&&t.blocks[id].opcode);
    o.targets.push({name:t.name, blocks:ids.length, vars:Object.keys(t.variables||{}).length, lists:Object.keys(t.lists||{}).length, costumes:(t.costumes||[]).length}); }
  o.total=o.targets.reduce((a,b)=>a+b.blocks,0);
  return o;
}
const base='D:/编程/scratch/ai/minipython/';
const sets=[['v3','_work/v3/project.json',base+'MiniPy_v3.sb3'],['v4','_work/v4/project.json',base+'MiniPy_v4.sb3'],['v4.1','_work/v41/project.json',base+'MiniPy_v4.1.sb3'],['v5.1','_work/v51/project.json',base+'MiniPy_v5.1.sb3'],['v5','_work/v5/project.json',base+'MiniPy_v5.sb3']];
for(const [name,pj,sb3] of sets){
  const s=stats(pj);
  console.log('== '+name+' json='+s.json+'MB sb3='+(fs.statSync(sb3).size/1048576).toFixed(2)+'MB ext='+JSON.stringify(s.ext)+' totalBlocks='+s.total);
  for(const t of s.targets) console.log('   '+t.name.padEnd(14)+' blocks='+String(t.blocks).padStart(7)+' vars='+String(t.vars).padStart(5)+' lists='+String(t.lists).padStart(4)+' costumes='+t.costumes);
}
