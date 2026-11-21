const fs=require('fs');
const {zipRead}=require('../sb3lib.js');
const P=JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e=>e.name==='project.json').data.toString('utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');const B=t.blocks;
function defIdOf(pc){for(const id in B){const b=B[id];if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const p=B[b.inputs.custom_block[1]];if(p&&p.mutation&&p.mutation.proccode===pc)return id;}}throw 0;}
function reach(roots){const s=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||s.has(id))continue;const b=B[id];if(!b)continue;s.add(id);for(const v of Object.values(b.inputs||{}))if(v&&typeof v[1]==='string')st.push(v[1]);if(b.next)st.push(b.next);}return s;}
const isTok1=(id,val)=>{const b=B[id];if(b.opcode!=='operator_equals')return false;if(!b.inputs.OPERAND2||!b.inputs.OPERAND2[1]||b.inputs.OPERAND2[1][1]!==val)return false;const l=b.inputs.OPERAND1&&b.inputs.OPERAND1[1];if(typeof l!=='string')return false;const lb=B[l];return lb&&lb.opcode==='data_itemoflist'&&lb.fields.LIST[0]==='Tok'&&lb.inputs.INDEX&&lb.inputs.INDEX[1]&&lb.inputs.INDEX[1][1]==='1';};
let n=0;
for(const id of reach(defIdOf('prepare %s'.replace(' %s','').trim()==='prepare'?'prepare':'prepare'))){}
const prep=defIdOf('prepare');
for(const id of reach(prep)){const b=B[id];
  if(b.opcode!=='control_if'||!b.inputs.CONDITION||typeof b.inputs.CONDITION[1]!=='string')continue;
  const c=b.inputs.CONDITION[1];
  if(B[c].opcode!=='operator_or')continue;
  const hasElif=[...reach(c)].some(i=>isTok1(i,'elif'));
  const hasElse=[...reach(c)].some(i=>isTok1(i,'else'));
  if(hasElif&&hasElse){n++;console.log('MATCH',id,JSON.stringify(B[c].inputs).slice(0,300));}
}
console.log('matches',n);
