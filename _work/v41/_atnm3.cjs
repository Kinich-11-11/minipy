const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const defs={};
for (const [id,b] of Object.entries(BL)) if (b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
function scope(root){const s=new Set();const st=[root];while(st.length){const id=st.pop();if(!id||s.has(id)||!BL[id])continue;s.add(id);for(const v of Object.values(BL[id].inputs||{}))if(Array.isArray(v)&&typeof v[1]==='string')st.push(v[1]);if(BL[id].next)st.push(BL[id].next);}return s;}
const ev=scope(defs['eval %s %s']);
const has=(v)=>Array.isArray(v)&&((v[0]===12&&v[1]==='atnm')||v.some(x=>Array.isArray(x)&&has(x)));
let n=0;
for(const id of ev){const b=BL[id];
 if(b.opcode==='procedures_call'&&b.mutation&&b.mutation.proccode==='fail %s'){
   const r=scope(id);
   let hit=false; const where=[];
   for(const x of r){const bb=BL[x];for(const [slot,v] of Object.entries(bb.inputs||{}))if(has(v)){hit=true;where.push(bb.opcode+'/'+slot);}}
   if(hit){n++;console.log('FAIL',id,where.slice(0,3).join(','));}
 }}
console.log('fails with atnm:',n);
