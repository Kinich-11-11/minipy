
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const BL=P.targets.find(t=>t.name==='Interpreter').blocks;
function protoOf(id){const b=BL[id];if(!b||b.opcode!=='procedures_definition')return null;const p=BL[b.inputs.custom_block[1]];return p&&p.mutation?p.mutation.proccode:null;}
function owner(id){let c=id,seen=new Set();while(c&&!seen.has(c)){seen.add(c);const b=BL[c];if(!b)return null;if(b.opcode==='procedures_definition')return protoOf(c);c=b.parent;}return null;}
const calls={};
for(const id of Object.keys(BL)){ const b=BL[id];
  if(b.opcode!=='procedures_call'||!b.mutation) continue;
  const pc=b.mutation.proccode;
  calls[pc]=calls[pc]||new Set();
  calls[pc].add(owner(id)||'(none)');
}
for(const target of ['fpush','fpop','eval %s %s','listlit %s %s','listfmt %s']){
  const s=calls[target];
  console.log('CALLERS of '+target+': '+(s?[...s].join(', '):'(none)'));
}
