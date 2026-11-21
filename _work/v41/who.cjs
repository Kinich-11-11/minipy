
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const BL=P.targets.find(t=>t.name==='Interpreter').blocks;
function protoOf(id){const b=BL[id];if(!b||b.opcode!=='procedures_definition')return null;const p=BL[b.inputs.custom_block[1]];return p&&p.mutation?p.mutation.proccode:null;}
function owner(id){let c=id,seen=new Set();while(c&&!seen.has(c)){seen.add(c);const b=BL[c];if(!b)return null;if(b.opcode==='procedures_definition')return protoOf(c);c=b.parent;}return null;}
// which procs touch a given list (fields.LIST) and how
function whoUses(listName){
  const rows={};
  for(const id of Object.keys(BL)){ const b=BL[id];
    if(!b.fields||!b.fields.LIST||b.fields.LIST[0]!==listName) continue;
    const o=owner(id)||'(none)';
    rows[o]=rows[o]||[];
    if(!rows[o].includes(b.opcode)) rows[o].push(b.opcode);
  }
  return rows;
}
for(const L of ['LComm','LOut','VStack','NewLines','New2']){
  const r=whoUses(L);
  console.log('== '+L);
  for(const [o,ops] of Object.entries(r)) console.log('   '+o+' : '+ops.join(','));
}
// who re-tokenizes (calls tokenize)
const tk=[];
for(const id of Object.keys(BL)){ const b=BL[id];
  if(b.opcode==='procedures_call'&&b.mutation&&b.mutation.proccode==='tokenize %s') tk.push(owner(id)); }
console.log('== tokenize callers: '+tk.join(', '));
