const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');const B=t.blocks;
const MSG='SyntaxError: return outside function';
function defOf(id){let cur=id,g=0;while(cur&&g++<400){const b=B[cur];if(b.opcode==='procedures_definition'){const pr=B[b.inputs.custom_block[1]];return pr?pr.mutation.proccode:'?';}cur=b.parent;}return '(top)';}
for(const id in B){const b=B[id];
  for(const [k,v] of Object.entries(b.inputs||{})){ if(Array.isArray(v[1])&&v[1][1]===MSG) console.log('LITERAL in',b.opcode,'slot',k,'proc=',defOf(id)); }
}
// who calls calluser / regdef
for(const id in B){const b=B[id]; if(b.opcode==='procedures_call'&&b.mutation&&/calluser|regdef/.test(b.mutation.proccode)) console.log('CALL',b.mutation.proccode,'in',defOf(id),'parentIf?',B[b.parent]?B[b.parent].opcode:'-');}
