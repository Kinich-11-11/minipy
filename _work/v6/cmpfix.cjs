const fs=require('fs');
const {zipRead}=require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const realLog=console.log.bind(console);
const check=(file)=>{
  const raw=zipRead('D:/编程/scratch/ai/minipython/'+file).find(x=>x.name==='project.json').data.toString('utf8');
  const pj=JSON.parse(raw);
  const it=pj.targets.find(t=>t.name==='Interpreter');
  const blocks=it.blocks||{};
  const n=Object.keys(blocks).length;
  // count the old (buggy) tab comparison: operator_equals whose shadow is a TAB
  let tabEq=0, spaceContains=0;
  for (const b of Object.values(blocks)) {
    if (b.opcode==='operator_equals') {
      for (const v of Object.values(b.inputs||{})) {
        const walk=(a)=>{ if(Array.isArray(a)){ if(a.length>=2 && a[1]==='\t') tabEq++; a.forEach(walk);} };
        walk(v);
      }
    }
    if (b.opcode==='operator_contains') {
      for (const v of Object.values(b.inputs||{})) {
        const walk=(a)=>{ if(Array.isArray(a)){ if(a.length>=2 && typeof a[1]==='string' && a[1].indexOf('\t')>=0) spaceContains++; a.forEach(walk);} };
        walk(v);
      }
    }
  }
  realLog(file+': blocks='+n+'  equals-vs-TAB='+tabEq+'  contains-with-TAB='+spaceContains);
};
for (const f of ['MiniPy_v6.sb3','_work/v6/MiniPy_v7.sb3']) { try { check(f); } catch(e){ realLog(f+' -> '+e.message.slice(0,80)); } }