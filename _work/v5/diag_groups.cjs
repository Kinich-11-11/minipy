const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p=JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
const tgt=p.targets.find(t=>t.name==='Interpreter');
const blocks=tgt.blocks, varsDict=tgt.variables;
// replicate the grouping, then report
const regionOf=Object.create(null), regParent=Object.create(null); const scriptOf=Object.create(null);
const scriptRoots=[]; const groupRoots=Object.create(null);
function walkTree(startId,reg,scr){ let cur=startId,g=0; while(cur&&g++<400000){ if(regionOf[cur]!==undefined) break; regionOf[cur]=reg; scriptOf[cur]=scr;
  const b=blocks[cur]; if(!b) break; const ins=b.inputs||{};
  for(const k in ins){ const v=ins[k]; if(!v||typeof v[1]!=='string') continue; const isBody=(k==='SUBSTACK'||k==='SUBSTACK2'); const cr=isBody?v[1]:reg;
    if(isBody&&regParent[cr]===undefined){ regParent[cr]=reg; (groupRoots[scr]||(groupRoots[scr]=[])).push(cr); } walkTree(v[1],cr,scr); } cur=b.next; } }
for(const id in blocks) if(blocks[id].topLevel){ scriptRoots.push(id); walkTree(id,id,id); }
for(const s of scriptRoots) (groupRoots[s]||(groupRoots[s]=[])).unshift(s);
function topGroup(r,scr){ if(r===scr) return scr; while(regParent[r]!==undefined && regParent[r]!==scr) r=regParent[r]; return r; }
const refBlocks=Object.create(null), varScripts=Object.create(null);
for(const id in blocks){ const f=blocks[id].fields; if(!f||!f.VARIABLE||!varsDict[f.VARIABLE[1]]) continue; const v=f.VARIABLE[1]; (refBlocks[v]||(refBlocks[v]=[])).push(id); (varScripts[v]||(varScripts[v]=new Set())).add(scriptOf[id]); }
let multi=0, shown=0;
for(const v of Object.keys(refBlocks)){ if(varScripts[v].size!==1) continue; const scr=[...varScripts[v]][0]; const byG=Object.create(null);
  for(const id of refBlocks[v]){ const g=topGroup(regionOf[id],scr); (byG[g]||(byG[g]=[])).push(id); }
  const gs=Object.keys(byG); if(gs.length<2) continue; multi++;
  if(shown<8){ shown++; console.log('VAR', varsDict[v][0], 'groups='+gs.length, 'refs='+refBlocks[v].length, 'spineRefs='+(byG[scr]?byG[scr].length:0)); }
}
console.log('vars with >=2 groups:', multi);