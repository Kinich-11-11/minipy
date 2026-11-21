
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const BL=P.targets.find(t=>t.name==='Interpreter').blocks;
function protoOf(id){const b=BL[id];if(!b||b.opcode!=='procedures_definition')return null;const p=BL[b.inputs.custom_block[1]];return p&&p.mutation?p.mutation:null;}
function desc(id,depth){ const b=BL[id]; if(!b) return '??'+id; if(depth>3) return b.opcode+'..';
  const parts=[]; for(const [k,v] of Object.entries(b.inputs||{})) if(k!=='SUBSTACK'&&k!=='SUBSTACK2') parts.push(k+'='+((typeof v[1]==='string'&&BL[v[1]])?desc(v[1],depth+1):JSON.stringify(v[1])));
  if(b.fields&&b.fields.VALUE!==undefined) parts.push('arg='+JSON.stringify(b.fields.VALUE));
  return b.opcode+'('+parts.join(',')+')'; }
let def=null, mut=null;
for(const id of Object.keys(BL)){ const m=protoOf(id); if(m&&m.proccode==='anyall %s %s %s'){ def=id; mut=m; } }
console.log('mutation', JSON.stringify(mut));
function walk(id, ind, depth){ let guard=0; while(id&&depth<4&&guard++<50){ const b=BL[id];
  if(b.opcode==='control_if'||b.opcode==='control_if_else'){ console.log(ind+'IF '+desc(b.inputs.CONDITION[1],0)); walk(b.inputs.SUBSTACK[1], ind+'  ', depth+1); if(b.opcode==='control_if_else'){ console.log(ind+'ELSE'); walk(b.inputs.SUBSTACK2[1], ind+'  ', depth+1);} }
  else console.log(ind+b.opcode+(b.mutation?':'+b.mutation.proccode:'')+(b.inputs&&b.inputs.VALUE?' '+desc(b.inputs.VALUE[1],0):''));
  id=b.next; } }
walk(BL[def].next,' ',0);
