
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const it=p.targets.find(x=>x.name==='Interpreter'); const B=it.blocks;
const stage=p.targets.find(x=>x.isStage); const gId={}; for(const [id,v] of Object.entries(stage.variables)) gId[id]=v[0];
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function slot(id,n){const b=B[id];const i=b.inputs&&b.inputs[n];if(!i)return null;const v=i[1];
  if(typeof v==='string'&&B[v])return{kind:'block',id:v}; if(Array.isArray(v)&&PRIM.has(v[0]))return{kind:'lit',val:v[1]};return null;}
function expr(id){ if(!id)return ''; const b=B[id]; if(!b)return '?';
  const f=(n)=>{const s=slot(id,n); if(!s)return ''; return s.kind==='lit'?JSON.stringify(s.val):expr(s.id);};
  switch(b.opcode){ case 'data_variable': return b.fields.VARIABLE[0];
   case 'data_itemoflist': return b.fields.LIST[0]+'['+f('INDEX')+']';
   case 'operator_add': return '('+f('NUM1')+'+'+f('NUM2')+')';
   case 'operator_join': return 'join('+f('STRING1')+','+f('STRING2')+')';
   case 'operator_equals': return '('+f('OPERAND1')+'=='+f('OPERAND2')+')';
   default: return b.opcode+'{'+Object.keys(b.inputs||{}).map(k=>k+'='+f(k)).join(',')+'}'; } }
const ctx={};
let n=0;
for(const id in B){ const b=B[id]; if(!b||b.opcode!=='data_setvariableto')continue; const f=b.fields.VARIABLE;
  if(f && gId[f[1]]==='pc'){ const e=expr(slot(id,'VALUE')?(slot(id,'VALUE').kind==='block'?slot(id,'VALUE').id:null):null);
    const lit=slot(id,'VALUE'); const s = lit&&lit.kind==='lit'? JSON.stringify(lit.val) : e;
    ctx[s]=(ctx[s]||0)+1; n++; } }
console.log('pc assignments:', n, JSON.stringify(ctx));
// how many set pc = Iline[...]
let iline=0;
for(const id in B){ const b=B[id]; if(!b||b.opcode!=='data_setvariableto')continue; const f=b.fields.VARIABLE;
  if(!f||gId[f[1]]!=='pc')continue; const s=slot(id,'VALUE'); if(s&&s.kind==='block'&&B[s.id].opcode==='data_itemoflist'&&B[s.id].fields.LIST[0]==='Iline') iline++; }
console.log('pc = Iline[..] count:', iline);
