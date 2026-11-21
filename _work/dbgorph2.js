'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
const T=P.targets.find(x=>x.name==='Interpreter');
const t=T.blocks;
const orphans=new Set();
for(const [id,b] of Object.entries(t)) if((b.parent===undefined||b.parent===null)&&!b.topLevel) orphans.add(id);
// which orphans are referenced from somewhere?
const refd=new Set();
for(const [id,b] of Object.entries(t)){
  if(b.next) refd.add(b.next);
  for(const v of Object.values(b.inputs||{})){ if(!Array.isArray(v))continue; for(let i=1;i<v.length;i++) if(typeof v[i]==='string') refd.add(v[i]); }
}
let refdOrphans=0, unreferenced=0, chainHeads=0;
for(const id of orphans){ if(refd.has(id)) refdOrphans++; else { unreferenced++; if(t[id].next) chainHeads++; } }
console.log('orphans',orphans.size,'referenced-from-somewhere',refdOrphans,'truly-unreferenced',unreferenced,'unreferenced-with-next',chainHeads);
const sample=[...orphans].slice(0,12);
for(const id of sample){ const b=t[id]; console.log(id, b.opcode, 'parent=',b.parent, 'next=',b.next, 'kids=',JSON.stringify(Object.entries(b.inputs||{}).filter(([k,v])=>Array.isArray(v)&&v[1]).map(([k,v])=>[k,Array.isArray(v[1])?JSON.stringify(v[1]):v[1]]))); }
