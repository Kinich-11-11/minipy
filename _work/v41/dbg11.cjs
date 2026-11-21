const fs=require('fs');
const {zipRead}=require('../sb3lib.js');
const P=JSON.parse(zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.sb3').find(e=>e.name==='project.json').data.toString('utf8'));
const t=P.targets.find(x=>x.name==='Interpreter');const B=t.blocks;
function defIdOf(pc){for(const id in B){const b=B[id];if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const p=B[b.inputs.custom_block[1]];if(p&&p.mutation&&p.mutation.proccode===pc)return id;}}throw 0;}
function reach(roots){const s=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||s.has(id))continue;const b=B[id];if(!b)continue;s.add(id);for(const v of Object.values(b.inputs||{}))if(v&&typeof v[1]==='string')st.push(v[1]);if(b.next)st.push(b.next);}return s;}
const ex=defIdOf('execute');
for(const id of reach(ex)){const b=B[id];
  if(b.opcode==='control_if'&&b.inputs.CONDITION&&typeof b.inputs.CONDITION[1]==='string'){
    const c=B[b.inputs.CONDITION[1]];
    if(c.opcode==='operator_equals'&&c.inputs.OPERAND2&&c.inputs.OPERAND2[1]&&c.inputs.OPERAND2[1][1]==='else'){
      console.log('else-if',id);
      for(const d of reach(b.inputs.SUBSTACK[1])){
        const db=B[d];
        if(db.opcode==='data_setvariableto'&&db.fields.VARIABLE[0]==='dest'){
          const v=db.inputs.VALUE[1];
          const src=(typeof v==='string')?B[v].opcode+'/'+JSON.stringify(B[v].fields):JSON.stringify(v);
          console.log('   dest =',src,'parent=',B[db.parent]?B[db.parent].opcode:'-');
        }
      }
    }
  }
}
