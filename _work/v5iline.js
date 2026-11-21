
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const it=p.targets.find(x=>x.name==='Interpreter'); const B=it.blocks;
const names={}; for(const [id,v] of Object.entries(it.lists)) names[id]=v[0];
const use={};
for(const id in B){ const b=B[id]; if(!b||!b.opcode)continue;
  for(const k in (b.fields||{})){ const f=b.fields[k]; if(!f)continue;
    if(/^(LIST|VARIABLE)$/.test(k)){ const nm=names[f[1]]; if(nm) use[nm+':'+b.opcode]=(use[nm+':'+b.opcode]||0)+1; } } }
for(const key of Object.keys(use).filter(k=>/^Iline|^Iop|^Ia:|^Ib:|^Kval|^Reg:/.test(k)).sort()) console.log(key+' = '+use[key]);
console.log('--- Iline any usage:', Object.keys(use).filter(k=>k.startsWith('Iline')).join(',')||'NONE');
// Reg list ops
console.log('--- Reg ops:', Object.keys(use).filter(k=>k.startsWith('Reg:')).map(k=>k+'='+use[k]).join(' '));
// check TokL usage (lexer token lines)
console.log('--- TokL ops:', Object.keys(use).filter(k=>k.startsWith('TokL:')).map(k=>k+'='+use[k]).join(' '));
