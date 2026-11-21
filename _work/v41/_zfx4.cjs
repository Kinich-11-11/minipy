const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const defs={};for(const [id,b] of Object.entries(BL))if(b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
const zf=defs['zfscaled %s %s'];
function reach(i,s){const st=[i];while(st.length){const x=st.pop();if(!x||s.has(x)||!BL[x])continue;s.add(x);for(const v of Object.values(BL[x].inputs||{}))if(Array.isArray(v)&&typeof v[1]==='string')st.push(v[1]);if(BL[x].next)st.push(BL[x].next);}return s;}
const scope=reach(zf,new Set());
console.log('scope',scope.size);
let ifs=[];
for(const id of scope){const b=BL[id];if(b.opcode==='control_if'&&b.inputs.CONDITION&&typeof b.inputs.CONDITION[1]==='string'){const j=[...reach(b.inputs.CONDITION[1],new Set())].map(x=>JSON.stringify(BL[x])).join(' ');if(j.includes('13579'))ifs.push(id);}}
console.log('parity ifs',ifs.length);
for(const id of ifs){const b=BL[id];let c=b.inputs.SUBSTACK[1];console.log('cond',JSON.stringify(b.inputs.CONDITION).slice(0,300));while(c){const w=[];for(const v of Object.values(BL[c].inputs||{}))if(Array.isArray(v)&&typeof v[1]==='string'){[...reach(v[1],new Set())].slice(0,4).forEach(x=>w.push(BL[x].opcode));}
 console.log(' sub',BL[c].opcode,JSON.stringify(BL[c].fields||{}).slice(0,60),w.join(','));c=BL[c].next;}}
