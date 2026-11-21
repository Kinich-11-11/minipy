
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
const it=p.targets.find(t=>t.name==='Interpreter'); const B=it.blocks;
const stage=p.targets.find(t=>t.isStage);
const gIds=new Set(Object.keys(stage.variables));
// where are globals referenced in Interpreter
const refs=[];
for(const id in B){ const b=B[id]; if(!b||!b.opcode)continue;
  for(const k in (b.fields||{})){ const f=b.fields[k]; if(f&&gIds.has(f[1])&&k==='VARIABLE') refs.push({name:f[0],id,opcode:b.opcode}); } }
const byName={}; for(const r of refs){ byName[r.name]=byName[r.name]||[]; byName[r.name].push(r.opcode); }
for(const k of Object.keys(byName)) console.log(k+': '+byName[k].length+'  '+JSON.stringify(byName[k].slice(0,8)));
// decompile around control_wait
function slot(id,n){const b=B[id];const i=b.inputs&&b.inputs[n];if(!i)return null;const v=i[1];
  if(typeof v==='string'&&B[v])return{kind:'block',id:v};
  if(Array.isArray(v)&&PRIM.has(v[0]))return{kind:'lit',val:v[1]};return null;}
function inpBlock(id,n){const s=slot(id,n);return s&&s.kind==='block'?s.id:null;}
function expr(id){ if(!id)return ''; const b=B[id]; if(!b)return '?';
  const f=(n)=>{const s=slot(id,n); if(!s)return ''; return s.kind==='lit'?JSON.stringify(s.val):expr(s.id);};
  switch(b.opcode){ case 'data_variable': return b.fields.VARIABLE[0];
   case 'data_itemoflist': return b.fields.LIST[0]+'['+f('INDEX')+']';
   case 'operator_equals': return '('+f('OPERAND1')+'=='+f('OPERAND2')+')';
   case 'operator_join': return 'join('+f('STRING1')+','+f('STRING2')+')';
   case 'sensing_answer': return 'answer'; 
   default: return b.opcode+'{'+Object.keys(b.inputs||{}).map(k=>k+'='+f(k)).join(',')+'}'; } }
function stmt(id,d,out,max){ if(!id||out.length>max)return; const b=B[id]; if(!b)return;
  const pad='  '.repeat(d);
  const f=(n)=>{const s=slot(id,n); if(!s)return ''; return s.kind==='lit'?JSON.stringify(s.val):expr(s.id);};
  switch(b.opcode){
    case 'data_setvariableto': out.push(pad+b.fields.VARIABLE[0]+' = '+f('VALUE')); break;
    case 'data_replaceitemoflist': out.push(pad+b.fields.LIST[0]+'['+f('INDEX')+'] = '+f('ITEM')); break;
    case 'data_addtolist': out.push(pad+'add '+f('ITEM')+' to '+b.fields.LIST[0]); break;
    case 'control_if': case 'control_if_else': { out.push(pad+'if '+f('CONDITION')+' {'); stmt(inpBlock(id,'SUBSTACK'),d+1,out,max);
      if(b.opcode==='control_if_else'){ out.push(pad+'} else {'); stmt(inpBlock(id,'SUBSTACK2'),d+1,out,max); } out.push(pad+'}'); break; }
    case 'control_repeat': out.push(pad+'repeat '+f('TIMES')+' {'); stmt(inpBlock(id,'SUBSTACK'),d+1,out,max); out.push(pad+'}'); break;
    case 'control_repeat_until': out.push(pad+'until '+f('CONDITION')+' {'); stmt(inpBlock(id,'SUBSTACK'),d+1,out,max); out.push(pad+'}'); break;
    case 'control_wait': out.push(pad+'>>> WAIT '+f('DURATION')); break;
    case 'control_wait_until': out.push(pad+'>>> WAIT UNTIL '+f('CONDITION')); break;
    case 'procedures_call': out.push(pad+b.mutation.proccode); break;
    default: out.push(pad+b.opcode+' {'+Object.keys(b.inputs||{}).map(k=>k+'='+f(k)).join(',')+'}'); }
  stmt(b.next,d,out,max);
}
// walk up to the enclosing if/repeat chain: print from grandparent chain
let w=null; for(const id in B){ if(B[id].opcode==='control_wait') w=id; }
console.log('wait id', w);
// print parent chain
let c=w; const chain=[]; while(c && B[c]){ chain.push(B[c].opcode); const pb=B[c].parent; if(!pb)break; 
  // find a block whose SUBSTACK contains c: just print parent opcode
  c=pb; if(chain.length>8)break; }
console.log('ancestor chain:', chain.join(' <- '));
const anc=B[w].parent;
for(let i=0;i<6 && anc;i++){ const b=B[anc]; console.log('  anc', b.opcode, 'inputs', Object.keys(b.inputs||{}), 'fields', JSON.stringify(Object.fromEntries(Object.entries(b.fields||{}).map(([k,v])=>[k,v[0]])))); anc=b.parent; if(!anc)break; }
// find the enclosing control_if whose SUBSTACK contains the wait (walk up until we find a control_if_else with SUBSTACK)
