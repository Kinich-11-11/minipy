'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project_v423.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter'); const B=t.blocks;
function findDef(pc){for(const [id,b] of Object.entries(B)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=B[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
function reach(roots){const seen=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||seen.has(id))continue;const b=B[id];if(!b)continue;seen.add(id);for(const v of Object.values(b.inputs||{})){if(v&&typeof v[1]==='string')st.push(v[1]);}if(b.next)st.push(b.next);}return seen;}
const ll=reach(findDef('listlit %s %s'));
const evals=[...ll].filter(id=>B[id].opcode==='procedures_call'&&B[id].mutation&&B[id].mutation.proccode==='eval %s %s');
console.log('eval calls in listlit:',evals.length);
const show=(x,d)=>{ if(x===null||x===undefined) return String(x); if(Array.isArray(x)) return '['+x.map(e=>show(e,d+1)).join(',')+']'; return String(x).slice(0,24); };
for(const id of evals){
  console.log('--- eval call '+id);
  let cur=B[id].next,g=0;
  while(cur&&g++<10){
    const b=B[cur];
    console.log('   '+cur+' '+b.opcode+'  inputs='+JSON.stringify(b.inputs).slice(0,260));
    cur=b.next;
  }
}