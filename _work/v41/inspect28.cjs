
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const IT=P.targets.find(t=>t.name==='Interpreter');
const BL=IT.blocks;
function protoOf(id){const b=BL[id];if(!b||b.opcode!=='procedures_definition')return null;const p=BL[b.inputs.custom_block[1]];return p&&p.mutation?p.mutation.proccode:null;}
function owner(id){let c=id;const seen=new Set();while(c&&!seen.has(c)){seen.add(c);const b=BL[c];if(!b)return null;if(b.opcode==='procedures_definition')return protoOf(c);c=b.parent;}return null;}
// 1. every operator_equals with literal '(' anywhere
for(const id of Object.keys(BL)){
  const b=BL[id];
  if(b.opcode!=='operator_equals') continue;
  const o2=b.inputs.OPERAND2;
  if(o2&&typeof o2[1]==='string'&&o2[1]==='(') console.log('EQ-LIT ( at', id, 'owner', owner(id));
}
console.log('---- procs containing procedures_call eval with args lo+1/hi-1');
function callsTo(proc){const out=[];for(const id of Object.keys(BL)){const b=BL[id];if(b.opcode==='procedures_call'&&b.mutation&&b.mutation.proccode===proc)out.push(id);}return out;}
for(const id of callsTo('eval %s %s')){
  const b=BL[id];
  const sig=JSON.stringify(b.inputs).slice(0,400);
  if(sig.includes('lo')&&sig.includes('hi')) console.log('CALL', id, 'owner', owner(id), sig);
}
