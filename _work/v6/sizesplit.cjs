const fs=require('fs');
const {zipRead}=require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const realLog=console.log.bind(console);
const entries=zipRead('D:/编程/scratch/ai/minipython/MiniPy_v6.sb3');
const pjE=entries.find(x=>x.name==='project.json');
const pj=JSON.parse(pjE.data.toString('utf8'));
const total=pjE.data.length;
let sum=0;
for (const t of pj.targets) {
  const n=Buffer.byteLength(JSON.stringify(t),'utf8');
  sum+=n;
  realLog(('  '+t.name).padEnd(16)+' '+(n/1048576).toFixed(2)+' MB   ('+(100*n/total).toFixed(1)+'%)');
}
realLog('  total          '+(total/1048576).toFixed(2)+' MB');
realLog('  Scratch 官网共享上限: project.json < 5 MB  →  需要压缩到 '+((5*1048576)/total*100).toFixed(0)+'% 以下');
// how much of the interpreter is bytecode vs. blocks?
const it=pj.targets.find(t=>t.name==='Interpreter');
const cnt=(k)=>{let n=0;for(const b of Object.values(it.blocks)) if(b.opcode===k) n++; return n;};
realLog('  Interpreter: if='+cnt('control_if')+' if_else='+cnt('control_if_else')+' repeat='+cnt('control_repeat')+
  ' repeat_until='+cnt('control_repeat_until')+' join='+cnt('operator_join')+' equal='+cnt('operator_equals')+
  ' list_item='+cnt('data_itemoflist')+' list_replace='+cnt('data_replaceitemoflist')+' list_add='+cnt('data_addtolist')+
  ' list_len='+cnt('data_lengthoflist')+' var_read='+cnt('data_variable')+' var_set='+cnt('data_setvariableto'));