const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const defs={};
for (const [id,b] of Object.entries(BL)) if (b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
function scope(root){const s=new Set();const st=[root];while(st.length){const id=st.pop();if(!id||s.has(id)||!BL[id])continue;s.add(id);for(const v of Object.values(BL[id].inputs||{}))if(Array.isArray(v)&&typeof v[1]==='string')st.push(v[1]);if(BL[id].next)st.push(BL[id].next);}return s;}
const ev=scope(defs['eval %s %s']);
function scan(v, path, out){ if(!Array.isArray(v))return; if(v[0]===12 && String(v[1]).includes('atnm')) out.push(path+':'+JSON.stringify(v)); for(const x of v) if(Array.isArray(x)) scan(x,path,out); }
let hits=[];
for(const id of ev){const b=BL[id];for(const [slot,v] of Object.entries(b.inputs||{})){const o=[];scan(v, slot, o);for(const h of o)hits.push(b.opcode+' '+id+' '+h);}}
console.log('inline atnm descriptors:', hits.length); console.log(hits.slice(0,10).join('\n'));
