
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
const out=[]; const p=(...x)=>out.push(x.join(' '));
const a=byName(A).Controller, b=byName(B).Controller;
function roots(t){
  const hasParent = new Set(Object.values(t.blocks).filter(x=>x&&x.parent).map(x=>x.parent));
  const r=[];
  for(const id of Object.keys(t.blocks)){ const bl=t.blocks[id]; if(!bl||typeof bl!=='object') continue;
    if(!bl.parent) r.push([id, 'topLevel='+bl.topLevel, bl.opcode]); }
  return r;
}
p('v4 Controller roots=' + roots(a).length); roots(a).slice(0,20).forEach(x=>p('   '+JSON.stringify(x)));
p('v7 Controller roots=' + roots(b).length); roots(b).slice(0,20).forEach(x=>p('   '+JSON.stringify(x)));
// chain from an orphan upward
function chain(t,id){ const c=[]; let cur=id; let guard=0; while(cur&&guard++<50){ const bl=t.blocks[cur]; if(!bl){c.push(cur+' MISSING');break;} c.push(bl.opcode+'('+cur+')'); cur=bl.parent; } return c; }
p('chain v4: ' + JSON.stringify(chain(a,'^zBtES6CaxK!g~D9(C^}')));
// count blocks per script reachable via parent===null roots AND via topLevel roots
function stats(t){
  const seen=new Set();
  const walk=(id)=>{ if(!id||seen.has(id))return; const bl=t.blocks[id]; if(!bl||typeof bl!=='object')return; seen.add(id);
    for(const ik of Object.keys(bl.inputs||{})){const v=bl.inputs[ik][1]; if(Array.isArray(v))walk(v[1]);} if(bl.next)walk(bl.next); };
  const rs=Object.keys(t.blocks).filter(id=>{const bl=t.blocks[id]; return bl&&typeof bl==='object'&&bl.topLevel;});
  rs.forEach(walk);
  return {topLevelRoots: rs.length, visited: seen.size, total: Object.keys(t.blocks).length};
}
p('v4 Controller stats ' + JSON.stringify(stats(a)));
p('v7 Controller stats ' + JSON.stringify(stats(b)));
// missing-parent refs
function missing(t){ const m=[]; for(const id of Object.keys(t.blocks)){const bl=t.blocks[id]; if(bl&&bl.parent&&!t.blocks[bl.parent]) m.push(id+' -> '+bl.parent+' ('+bl.opcode+')');} return m; }
p('v4 Controller missing-parent refs: ' + JSON.stringify(missing(a).slice(0,10)) + ' count=' + missing(a).length);
p('v7 Controller missing-parent refs: ' + JSON.stringify(missing(b).slice(0,10)) + ' count=' + missing(b).length);
fs.writeFileSync(base+'surface7.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,7000));
