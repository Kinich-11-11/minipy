const fs=require('fs');
const {zipRead}=require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const realLog=console.log.bind(console);
for (const f of ['MiniPy_v6.sb3','MiniPy_v5.sb3']) {
  const entries=zipRead('D:/编程/scratch/ai/minipython/'+f);
  const pjE=entries.find(x=>x.name==='project.json');
  const pj=JSON.parse(pjE.data.toString('utf8'));
  const it=pj.targets.find(t=>t.name==='Interpreter');
  // largest script (top-level chain)
  const blocks=it.blocks;
  const counted=new Set();
  const size=(id)=>{ let n=0,cur=id,guard=0; while(cur&&guard++<200000){ if(counted.has(cur))break; counted.add(cur); n++; const b=blocks[cur]; for(const v of Object.values(b.inputs||{})){ if(Array.isArray(v)&&typeof v[1]==='string'&&v[1]!==''){ const s=size(v[1]); n+=s; } } cur=b.next; } return n; };
  let tot=0; for(const [id,b] of Object.entries(blocks)) if(b.topLevel) tot+=size(id);
  realLog(f+':  project.json='+(pjE.data.length/1048576).toFixed(2)+' MB   targets='+pj.targets.length+
    '   Interpreter blocks(recursive)='+tot+'   sb3='+(fs.statSync('D:/编程/scratch/ai/minipython/'+f).size/1048576).toFixed(2)+' MB');
  realLog('   extensions='+JSON.stringify(pj.extensions)+'  meta.semver='+pj.meta.semver+'  meta.vm='+pj.meta.vm);
  realLog('   lists='+Object.keys(it.lists||{}).length+'  variables='+Object.keys(it.variables||{}).length+
    '  costumes='+it.costumes.length+'  sounds='+it.sounds.length);
}