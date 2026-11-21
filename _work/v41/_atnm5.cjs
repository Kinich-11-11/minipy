const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL0=it.blocks;
const BL=()=>BL0;
function reach(roots){const seen=new Set();const stack=(Array.isArray(roots)?roots:[roots]).slice();while(stack.length){const id=stack.pop();if(!id||seen.has(id))continue;const b=BL()[id];if(!b)continue;seen.add(id);for(const v of Object.values(b.inputs||{})){if(v&&typeof v[1]==='string')stack.push(v[1]);}if(b.next)stack.push(b.next);}return seen;}
const defs={};for(const [id,b] of Object.entries(BL()))if(b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL()[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
const set=reach(defs['eval %s %s']);
const hasAtnm=(v)=>{if(Array.isArray(v))return (v[0]===12&&v[1]==='atnm')||v.some(x=>Array.isArray(x)&&hasAtnm(x));return false;};
const out=[];for(const id of set){const b=BL()[id];if(b.opcode==='procedures_call'&&b.mutation&&b.mutation.proccode==='fail %s'&&[...reach(id)].some(x=>Object.values(BL()[x].inputs||{}).some(hasAtnm)))out.push(id);}
console.log('fails',out.length,out);
console.log('defId',defs['eval %s %s'],'scope',set.size);
const deep=(id)=>[...reach(id)].map(x=>JSON.stringify(BL()[x])).join(' ');
for(const f of out){let p=BL()[f].parent,tr=false,g=0;while(p&&g++<40){const b=BL()[p];if((b.opcode==='control_if'||b.opcode==='control_if_else')&&b.inputs.CONDITION&&typeof b.inputs.CONDITION[1]==='string'&&deep(b.inputs.CONDITION[1]).includes('operator_subtract'))tr=true;p=b.parent;}console.log(f,'trailing=',tr);}
