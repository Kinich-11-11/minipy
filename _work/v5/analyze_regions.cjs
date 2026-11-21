const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const ents=zipRead(process.argv[2]);
const proj=JSON.parse(ents.find(e=>e.name==='project.json').data.toString('utf8'));
const tgt=proj.targets.find(t=>t.name==='Interpreter');
const blocks=tgt.blocks;
// region of each block: root = top-level script; SUBSTACK/SUBSTACK2 starts a new region
const region={}; const scriptOf={};
function walk(id, reg, scr){ let cur=id, guard=0;
  while(cur && guard++<20000){
    if(region[cur]===undefined){ region[cur]=reg; scriptOf[cur]=scr; }
    const b=blocks[cur]; if(!b) break;
    const kids=[];
    for(const k in (b.inputs||{})){ const v=b.inputs[k]; if(v && typeof v[1]==='string') kids.push([v[1], k]); }
    const next=b.next;
    // children that open a new region
    for(const [cid,k] of kids){ if(k==='SUBSTACK'||k==='SUBSTACK2'){ walk(cid, cid, scr); } else { region[cid]=reg; scriptOf[cid]=scr; walk(cid, reg, scr); } }
    cur=next;
  }
}
for(const id in blocks){ const b=blocks[id]; if(b.topLevel){ walk(id, id, id); } }
// collect variable -> set of (script|region)
const varRef={};
for(const id in blocks){ const b=blocks[id];
  if(b.opcode!=='data_variable' && b.opcode!=='data_setvariableto' && b.opcode!=='data_changevariableby') continue;
  const v=b.fields && b.fields.VARIABLE && b.fields.VARIABLE[0]; if(!v) continue;
  const s=scriptOf[id]||'?'; const r=region[id]||'?';
  (varRef[v]=varRef[v]||{scripts:new Set(), regs:new Set()}); varRef[v].scripts.add(s); varRef[v].regs.add(s+'#'+r); }
const vars=Object.keys(varRef);
const globals=vars.filter(v=>varRef[v].scripts.size>1);
const scripts=[...new Set(Object.values(scriptOf))];
let total=globals.length; const detail=[];
for(const s of scripts){
  const locals=vars.filter(v=>varRef[v].scripts.size===1 && varRef[v].scripts.has(s));
  if(!locals.length) continue;
  const regsOf={}; for(const v of locals) regsOf[v]=[...varRef[v].regs].filter(x=>x.startsWith(s+'#'));
  // greedy coloring: conflict when region sets intersect
  const color={}; let used=0;
  const order=locals.slice().sort((a,b)=>regsOf[b].length-regsOf[a].length);
  for(const v of order){ const taken=new Set();
    for(const u in color){ if(regsOf[u].some(r=>regsOf[v].includes(r))) taken.add(color[u]); }
    let c=0; while(taken.has(c)) c++; color[v]=c; used=Math.max(used,c+1); }
  total+=used; detail.push([s.slice(-6), locals.length, used]);
}
console.log('declared vars:', Object.keys(tgt.variables||{}).length);
console.log('referenced vars:', vars.length);
console.log('global-pinned (used by >=2 scripts):', globals.length);
console.log('per-script local pool [script, locals, pool]:');
for(const d of detail) console.log('   ', d.join('  '));
console.log('TOTAL after region coloring =', total);