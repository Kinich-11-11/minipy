
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const it=p.targets.find(x=>x.name==='Interpreter'); const B=it.blocks;
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
const lits=new Map();
for(const id in B){ const b=B[id]; if(!b||!b.opcode)continue;
  const walk=(v)=>{ if(Array.isArray(v)){ if(PRIM.has(v[0])&&typeof v[1]==='string') lits.set(v[1],(lits.get(v[1])||0)+1); else for(const x of v) walk(x);} };
  for(const k in (b.inputs||{})) walk(b.inputs[k]);
}
const singles=[...lits.keys()].filter(s=>s.length===1).sort();
console.log('1-char literals:', JSON.stringify(singles));
const two=[...lits.keys()].filter(s=>s.length===2&&/^[A-Z][A-Za-z0-9]$/.test(s)).sort();
console.log('2-char literals:', JSON.stringify(two));
// tag usage: look for join with a tag letter
let tagJoins={};
for(const id in B){ const b=B[id]; if(!b||b.opcode!=='operator_join')continue;
  for(const k of ['STRING1','STRING2']){ const inp=b.inputs[k]; if(!inp)continue; const v=inp[1];
    if(Array.isArray(v)&&PRIM.has(v[0])&&typeof v[1]==='string'&&v[1].length<=2) tagJoins[v[1]]=(tagJoins[v[1]]||0)+1; } }
console.log('join-tag frequency:', JSON.stringify(Object.entries(tagJoins).sort((a,b)=>b[1]-a[1]).slice(0,20)));
