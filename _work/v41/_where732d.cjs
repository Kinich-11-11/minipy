const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const defs={};for(const [id,b] of Object.entries(BL))if(b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
const exDef=defs['execute'];
const z7set=Object.entries(BL).find(([i,b])=>b.opcode==='data_setvariableto'&&b.fields&&b.fields.VARIABLE&&b.fields.VARIABLE[0]==='z7augk')[0];
let c=BL[exDef].next,g=0;
const rows=[];
while(c&&g++<600){const b=BL[c];
 const sub=b.inputs&&b.inputs.SUBSTACK&&typeof b.inputs.SUBSTACK[1]==='string'?b.inputs.SUBSTACK[1]:null;
 const hasZ7 = sub? (()=>{let x=sub,k=0;while(x&&k++<20){if(x===z7set||BL[x].next===z7set)return true;x=BL[x].next;}return false;})():false;
 rows.push(g+':'+b.opcode+(b.fields&&b.fields.VARIABLE?'['+b.fields.VARIABLE[0]+']':'')+(hasZ7?'  <== CONTAINS Z7':''));
 c=b.next;}
console.log(rows.slice(0,120).join('\n'));
