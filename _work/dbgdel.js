'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');
function lit(inp){ return Array.isArray(inp)&&Array.isArray(inp[1])&&typeof inp[1][1]==='string'?inp[1][1]:null; }
function rep(v,d){ if(v===undefined||v===null) return '_'; if(Array.isArray(v)) return JSON.stringify(v[1]); const b=t.blocks[v]; if(!b) return '#'+v; if(d>6) return '...';
  const I=k=>rep(b.inputs[k]&&b.inputs[k][1],d+1);
  switch(b.opcode){ case 'data_variable': return b.fields.VARIABLE[0];
    case 'data_itemoflist': return b.fields.LIST[0]+'['+I('INDEX')+']';
    case 'operator_equals': return I('OPERAND1')+'=='+I('OPERAND2');
    case 'operator_or': return I('OPERAND1')+' OR '+I('OPERAND2');
    case 'operator_and': return I('OPERAND1')+' AND '+I('OPERAND2');
    case 'operator_not': return 'NOT '+I('OPERAND');
    case 'procedures_call': return '<'+b.mutation.proccode+'>';
    default: return b.opcode; } }
function findDef(pc){for(const [id,b] of Object.entries(t.blocks)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=t.blocks[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
const ex=findDef('execute');
let id=t.blocks[ex].next;
while(id){ const b=t.blocks[id];
  if(b.opcode==='control_if'||b.opcode==='control_if_else') console.log(id, b.opcode, 'IF', rep(b.inputs.CONDITION[1],0), '| parent', b.parent, 'next', b.next);
  id=b.next; }
console.log('--- blocks mentioning del name ---');
for(const [bid,b] of Object.entries(t.blocks)) if(b.opcode==='procedures_call'&&b.mutation.proccode==='fail %s'&&(lit(Object.values(b.inputs)[0])||'').includes('del name')) console.log(bid, lit(Object.values(b.inputs)[0]), 'parent', b.parent, t.blocks[b.parent].opcode);
