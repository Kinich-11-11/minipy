
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const BL=P.targets.find(t=>t.name==='Interpreter').blocks;
function protoOf(id){const b=BL[id];if(!b||b.opcode!=='procedures_definition')return null;const p=BL[b.inputs.custom_block[1]];return p&&p.mutation?p.mutation.proccode:null;}
function reach(roots){const seen=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||seen.has(id))continue;const b=BL[id];if(!b)continue;seen.add(id);for(const v of Object.values(b.inputs||{})){if(v&&typeof v[1]==='string')st.push(v[1]);}if(b.next)st.push(b.next);}return seen;}
let ex=null; for(const id of Object.keys(BL)) if(protoOf(id)==='execute') ex=id;
const lit=(d)=>(d&&Array.isArray(d[1])&&[4,10].includes(d[1][0]))?String(d[1][1]):null;
const varOf=(d)=>(d&&Array.isArray(d[1])&&d[1][0]===12)?d[1][1]:null;
let found=[];
for(const id of [...reach(ex)]){
  const b=BL[id];
  if(b.opcode!=='control_if'&&b.opcode!=='control_if_else') continue;
  const cid=b.inputs.CONDITION&&b.inputs.CONDITION[1];
  if(typeof cid!=='string') continue;
  const condIds=[...reach(cid)];
  const hasEq=condIds.some(x=>BL[x].opcode==='operator_equals'&&lit(BL[x].inputs.OPERAND2)==='=');
  if(!hasEq) continue;
  // list the substack statements
  const chain=[]; let cur=b.inputs.SUBSTACK&&b.inputs.SUBSTACK[1]; let g=0;
  while(cur&&g++<40){ const s=BL[cur]; const f=s.fields&&s.fields.VARIABLE?s.fields.VARIABLE[0]:''; chain.push(s.opcode+(s.mutation?':'+s.mutation.proccode:'')+(f?'('+f+')':'')); cur=s.next; }
  found.push('COND['+condIds.map(x=>BL[x].opcode+(lit(BL[x].inputs.OPERAND2)?'='+lit(BL[x].inputs.OPERAND2):'')).join(',')+'] => '+chain.join(' | '));
}
console.log(found.slice(0,6).join('\n'));
