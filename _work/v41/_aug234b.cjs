const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
function op(id){return BL[id]?BL[id].opcode:'?';}
function walk(id, out){const b=BL[id];if(!b)return;const f=b.fields&&Object.values(b.fields).map(x=>JSON.stringify(Array.isArray(x)?x[0]:x)).join(',');if(f)out.push(op(id)+'['+f+']');else out.push(op(id));for(const v of Object.values(b.inputs||{}))if(Array.isArray(v)&&typeof v[1]==='string')walk(v[1],out);}
const target='bdatare_7ufn70yzy';
let par=BL[target].parent, hops=0;
while(par && hops<8){const b=BL[par];console.log(hops, par, b.opcode, b.opcode==='control_if'&&b.inputs.CONDITION? (()=>{const o=[];walk(b.inputs.CONDITION[1],o);return o.join(' ');})():'');if(b.opcode==='control_if')break;par=b.parent;hops++;}
