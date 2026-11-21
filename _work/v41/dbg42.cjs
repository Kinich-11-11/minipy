
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const BL=P.targets.find(t=>t.name==='Interpreter').blocks;
function protoOf(id){const b=BL[id];if(!b||b.opcode!=='procedures_definition')return null;const p=BL[b.inputs.custom_block[1]];return p&&p.mutation?p.mutation.proccode:null;}
function owner(id){let c=id,seen=new Set();while(c&&!seen.has(c)){seen.add(c);const b=BL[c];if(!b)return null;if(b.opcode==='procedures_definition')return protoOf(c);c=b.parent;}return null;}
const out=[];
for(const id of Object.keys(BL)){ const b=BL[id];
  if(b.opcode!=='procedures_call'||!b.mutation||b.mutation.proccode!=='eval %s %s') continue;
  const vals=Object.values(b.inputs||{}).map(v=>{
    if(Array.isArray(v[1])&&v[1][0]===10) return JSON.stringify(v[1][1]);
    if(Array.isArray(v[1])&&v[1][0]===4) return String(v[1][1]);
    if(Array.isArray(v[1])&&v[1][0]===12) return 'VAR('+v[1][1]+')';
    if(typeof v[1]==='string') return 'EXPR';
    return '?';
  });
  out.push(owner(id)+' <- eval('+vals.join(', ')+')');
}
const first = process.argv[2];
console.log(out.filter(s=>s.includes(first)).join('\n'));
console.log('total eval call sites: '+out.length);
