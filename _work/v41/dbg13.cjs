const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');const B=t.blocks;
function defIdOf(pc){for(const id in B){const b=B[id];if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const p=B[b.inputs.custom_block[1]];if(p&&p.mutation&&p.mutation.proccode===pc)return id;}}throw 0;}
function reach(roots){const s=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||s.has(id))continue;const b=B[id];if(!b)continue;s.add(id);for(const v of Object.values(b.inputs||{}))if(v&&typeof v[1]==='string')st.push(v[1]);if(b.next)st.push(b.next);}return s;}
const ev=defIdOf('eval %s %s');
const out=[];
for(const id of reach(ev)){const b=B[id];
  if(b.opcode!=='operator_equals') continue;
  const lit=b.inputs.OPERAND2&&b.inputs.OPERAND2[1]&&b.inputs.OPERAND2[1][1];
  if(!['-','+','not'].includes(lit)) continue;
  const l=b.inputs.OPERAND1&&b.inputs.OPERAND1[1];
  const x=(typeof l==='string')?B[l]:null;
  out.push('lit='+JSON.stringify(lit)+' op1='+(x?x.opcode:'(inline)')+(x&&x.opcode==='data_itemoflist'?(' list='+x.fields.LIST[0]+' idx='+(B[x.inputs.INDEX[1]]?B[x.inputs.INDEX[1]].opcode+'/'+(B[x.inputs.INDEX[1]].fields.VALUE?B[x.inputs.INDEX[1]].fields.VALUE[0]:''):JSON.stringify(x.inputs.INDEX[1]))):''));
}
console.log(out.join('\n'));
console.log('matches='+out.length);
