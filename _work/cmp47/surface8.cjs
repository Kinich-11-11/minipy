
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
const out=[]; const p=(...x)=>out.push(x.join(' '));
for (const n of ['Controller','Stage','TextRenderer','Interpreter']){
  const a=byName(A)[n], b=byName(B)[n];
  const hist = t => { const m=new Map(); for(const id of Object.keys(t.blocks)){const bl=t.blocks[id]; if(bl&&typeof bl==='object') m.set(bl.opcode,(m.get(bl.opcode)||0)+1);} return m; };
  const ha=hist(a), hb=hist(b);
  const keys=new Set([...ha.keys(),...hb.keys()]);
  const diffs=[...keys].filter(k=>(ha.get(k)||0)!==(hb.get(k)||0)).map(k=>k+': v4='+(ha.get(k)||0)+' v7='+(hb.get(k)||0));
  p('## ' + n + ' opcode-diff (' + diffs.length + '): ' + JSON.stringify(diffs));
}
// deep debug of walk on Controller v4
const a=byName(A).Controller;
const seen=new Set();
const walk=(id,depth)=>{ if(!id||seen.has(id))return; const bl=a.blocks[id]; if(!bl||typeof bl!=='object')return; seen.add(id);
  for(const ik of Object.keys(bl.inputs||{})){const v=bl.inputs[ik][1]; if(Array.isArray(v))walk(v[1],depth+1);} if(bl.next)walk(bl.next,depth+1); };
const rs=Object.keys(a.blocks).filter(id=>{const bl=a.blocks[id]; return bl&&typeof bl==='object'&&bl.topLevel;});
rs.forEach(id=>walk(id,0));
p('hat next: ' + JSON.stringify(a.blocks['?cvyMIjIO5ay3\`eNl]DS']).slice(0,400));
p('seen has hat? ' + seen.has('?cvyMIjIO5ay3\`eNl]DS') + ' seen has if? ' + seen.has('}XYv^_(r/1W:([RE!eFk') + ' visited=' + seen.size);
// which roots have zero children visited
for (const id of rs){ const kids=new Set(); const w=(x)=>{if(!x||kids.has(x))return; const bl=a.blocks[x]; if(!bl||typeof bl!=='object')return; kids.add(x); for(const ik of Object.keys(bl.inputs||{})){const v=bl.inputs[ik][1]; if(Array.isArray(v))w(v[1]);} if(bl.next)w(bl.next); };
  let n=0; for(const ik of Object.keys(a.blocks[id].inputs||{})){const v=a.blocks[id].inputs[ik][1]; if(Array.isArray(v))n++;}
  if (n===0 && !a.blocks[id].next) p('  childless root: ' + id + ' ' + a.blocks[id].opcode + ' :: ' + JSON.stringify(a.blocks[id]).slice(0,220));
}
fs.writeFileSync(base+'surface8.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,8000));
