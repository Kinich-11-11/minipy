
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const BL=P.targets.find(t=>t.name==='Interpreter').blocks;
function protoOf(id){const b=BL[id];if(!b||b.opcode!=='procedures_definition')return null;const p=BL[b.inputs.custom_block[1]];return p&&p.mutation?p.mutation.proccode:null;}
function desc(id,depth){ const b=BL[id]; if(!b) return '??'+id; if(depth>2) return b.opcode+'..';
  const parts=[]; for(const [k,v] of Object.entries(b.inputs||{})) if(k!=='SUBSTACK'&&k!=='SUBSTACK2') parts.push(k+'='+((typeof v[1]==='string'&&BL[v[1]])?desc(v[1],depth+1):JSON.stringify(v[1])));
  if(b.fields&&b.fields.VARIABLE) parts.push('var='+b.fields.VARIABLE[0]);
  return b.opcode+'('+parts.join(',')+')'; }
let def=null; for(const id of Object.keys(BL)) if(protoOf(id)==='tuplelit %s %s') def=id;
function walk(id, ind, out, depth){ while(id&&depth<6){ const b=BL[id];
  if(b.opcode==='control_if'||b.opcode==='control_if_else'){ out.push(ind+'IF '+desc(b.inputs.CONDITION[1],0)); walk(b.inputs.SUBSTACK[1], ind+'  ', out, depth+1); if(b.opcode==='control_if_else'){ out.push(ind+'ELSE'); walk(b.inputs.SUBSTACK2[1], ind+'  ', out, depth+1);} }
  else if(b.opcode==='control_repeat_until'){ out.push(ind+'REPEATUNTIL '+desc(b.inputs.CONDITION[1],0)); walk(b.inputs.SUBSTACK[1], ind+'  ', out, depth+1); }
  else if(b.opcode==='procedures_call'){ out.push(ind+'CALL '+b.mutation.proccode); }
  else if(b.opcode==='data_setvariableto'){ out.push(ind+b.fields.VARIABLE[0]+' = '+desc(b.inputs.VALUE[1],0)); }
  else out.push(ind+b.opcode);
  id=b.next; } }
const out=[]; walk(BL[def].next,' ',out,0);
console.log(out.join('\n'));
