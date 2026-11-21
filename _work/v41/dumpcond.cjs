
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const BL=P.targets.find(t=>t.name==='Interpreter').blocks;
function protoOf(id){const b=BL[id];if(!b||b.opcode!=='procedures_definition')return null;const p=BL[b.inputs.custom_block[1]];return p&&p.mutation?p.mutation.proccode:null;}
function defIdOf(proc){for(const id of Object.keys(BL)) if(protoOf(id)===proc) return id; return null;}
function reach(roots){const seen=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||seen.has(id))continue;const b=BL[id];if(!b)continue;seen.add(id);for(const v of Object.values(b.inputs||{})){if(v&&typeof v[1]==='string')st.push(v[1]);}if(b.next)st.push(b.next);}return seen;}
function desc(c){ if(typeof c!=='string') return JSON.stringify(c);
  const b=BL[c]; if(!b) return '?';
  const lit=(x)=> (x&&typeof x[1]==='string'&&BL[x[1]]?desc(x[1]):JSON.stringify(x&&x[1]));
  switch(b.opcode){
    case 'operator_and': return 'and('+desc(b.inputs.OPERAND1[1])+', '+desc(b.inputs.OPERAND2[1])+')';
    case 'operator_or': return 'or('+desc(b.inputs.OPERAND1[1])+', '+desc(b.inputs.OPERAND2[1])+')';
    case 'operator_not': return 'not('+desc(b.inputs.OPERAND[1])+')';
    case 'operator_equals': return 'eq('+lit(b.inputs.OPERAND1)+', '+lit(b.inputs.OPERAND2)+')';
    case 'operator_gt': return 'gt('+lit(b.inputs.OPERAND1)+', '+lit(b.inputs.OPERAND2)+')';
    case 'operator_lt': return 'lt('+lit(b.inputs.OPERAND1)+', '+lit(b.inputs.OPERAND2)+')';
    case 'operator_contains': return 'contains('+lit(b.inputs.STRING1)+', '+lit(b.inputs.STRING2)+')';
    case 'operator_join': return 'join('+lit(b.inputs.STRING1)+', '+lit(b.inputs.STRING2)+')';
    case 'data_itemoflist': return 'item('+lit(b.inputs.LIST)+', '+lit(b.inputs.INDEX)+')';
    default: { let s=b.opcode+'('; const parts=[]; for(const [k,v] of Object.entries(b.inputs||{})){ if(k==='SUBSTACK'||k==='SUBSTACK2')continue; parts.push(k+'='+lit(v)); } return s+parts.join(', ')+')'; }
  }
}
const proc=process.argv[2];
const def=defIdOf(proc);
const all=reach(def);
const rows=[];
for(const id of all){ const b=BL[id]; if(b.opcode!=='control_if'&&b.opcode!=='control_if_else') continue;
  const c=b.inputs.CONDITION; if(!c||typeof c[1]!=='string') continue;
  // substack call summary
  const calls=[];
  for(const sid of reach(b.inputs.SUBSTACK?b.inputs.SUBSTACK:[ ])){ const sb=BL[sid]; if(sb&&sb.opcode==='procedures_call') calls.push(sb.mutation.proccode); }
  rows.push(desc(c[1])+'   ==> ['+calls.join(' ; ')+']');
}
console.log(rows.join('\n'));
