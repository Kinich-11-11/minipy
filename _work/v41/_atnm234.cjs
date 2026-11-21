const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const defs={};
for (const [id,b] of Object.entries(BL)) if (b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
function scope(root){const s=new Set();const st=[root];while(st.length){const id=st.pop();if(!id||s.has(id)||!BL[id])continue;s.add(id);for(const v of Object.values(BL[id].inputs||{}))if(Array.isArray(v)&&typeof v[1]==='string')st.push(v[1]);if(BL[id].next)st.push(BL[id].next);}return s;}
const ev=scope(defs['eval %s %s']);
let vars=[], calls=[];
for(const id of ev){const b=BL[id];if(b.opcode==='data_variable'&&b.fields&&b.fields.VARIABLE&&b.fields.VARIABLE[0]==='atnm'){vars.push(id);console.log('var',id,'parent',b.parent,'pop',BL[b.parent]&&BL[b.parent].opcode);}
 if(b.opcode==='procedures_call'&&b.mutation&&b.mutation.proccode==='fail %s')calls.push(id);}
console.log('vars',vars.length,'failcalls',calls.length);
for(const c of calls){const s=scope(c); if([...s].some(x=>vars.includes(x))) console.log('fail-with-atnm',c);}
