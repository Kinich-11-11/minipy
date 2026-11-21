
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const it=p.targets.find(t=>t.name==='Interpreter'); const B=it.blocks;
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function slot(id,n){const b=B[id];const i=b.inputs&&b.inputs[n];if(!i)return null;const v=i[1];
  if(typeof v==='string'&&B[v])return{kind:'block',id:v};
  if(Array.isArray(v)&&PRIM.has(v[0]))return{kind:'lit',val:v[1]};return null;}
function inpBlock(id,n){const s=slot(id,n);return s&&s.kind==='block'?s.id:null;}
function expr(id){ if(!id)return ''; const b=B[id]; if(!b)return '?';
  const f=(n)=>{const s=slot(id,n); if(!s)return ''; return s.kind==='lit'?JSON.stringify(s.val):expr(s.id);};
  switch(b.opcode){
    case 'data_variable': return b.fields.VARIABLE[0];
    case 'data_itemoflist': return b.fields.LIST[0]+'['+f('INDEX')+']';
    case 'data_lengthoflist': return 'len('+b.fields.LIST[0]+')';
    case 'operator_add': return '('+f('NUM1')+'+'+f('NUM2')+')';
    case 'operator_subtract': return '('+f('NUM1')+'-'+f('NUM2')+')';
    case 'operator_multiply': return '('+f('NUM1')+'*'+f('NUM2')+')';
    case 'operator_equals': return '('+f('OPERAND1')+'=='+f('OPERAND2')+')';
    case 'operator_lt': return '('+f('OPERAND1')+'<'+f('OPERAND2')+')';
    case 'operator_gt': return '('+f('OPERAND1')+'>'+f('OPERAND2')+')';
    case 'operator_and': return '('+f('OPERAND1')+'&&'+f('OPERAND2')+')';
    case 'operator_or': return '('+f('OPERAND1')+'||'+f('OPERAND2')+')';
    case 'operator_not': return '!'+f('OPERAND');
    case 'operator_join': return 'join('+f('STRING1')+','+f('STRING2')+')';
    case 'operator_letter_of': return 'letter('+f('LETTER')+','+f('STRING')+')';
    case 'operator_length': return 'len('+f('STRING')+')';
    case 'operator_mod': return '('+f('NUM1')+'%'+f('NUM2')+')';
    case 'operator_mathop': return 'math.'+b.fields.OPERATOR[0]+'('+f('NUM')+')';
    case 'looks_costumenumbername': return 'costume#'+JSON.stringify(b.fields.NUMBER_NAME[0]);
    case 'sensing_dayssince2000': return 'days2000';
    case 'sensing_timer': return 'timer';
    default: return b.opcode+'{'+Object.keys(b.inputs||{}).map(k=>k+'='+f(k)).join(',')+'}';
  }
}
function stmt(id,d,out,max){ if(!id||out.length>max)return; const b=B[id]; if(!b)return;
  const pad='  '.repeat(d);
  const f=(n)=>{const s=slot(id,n); if(!s)return ''; return s.kind==='lit'?JSON.stringify(s.val):expr(s.id);};
  switch(b.opcode){
    case 'data_setvariableto': out.push(pad+b.fields.VARIABLE[0]+' = '+f('VALUE')); break;
    case 'data_changevariableby': out.push(pad+b.fields.VARIABLE[0]+' += '+f('VALUE')); break;
    case 'data_addtolist': out.push(pad+'add '+f('ITEM')+' to '+b.fields.LIST[0]); break;
    case 'data_replaceitemoflist': out.push(pad+b.fields.LIST[0]+'['+f('INDEX')+'] = '+f('ITEM')); break;
    case 'procedures_call': out.push(pad+b.mutation.proccode); break;
    case 'control_if': case 'control_if_else': {
      out.push(pad+'if '+f('CONDITION')+' {'); stmt(inpBlock(id,'SUBSTACK'),d+1,out,max);
      if(b.opcode==='control_if_else'){ out.push(pad+'} else {'); stmt(inpBlock(id,'SUBSTACK2'),d+1,out,max); }
      out.push(pad+'}'); break; }
    case 'control_repeat': out.push(pad+'repeat '+f('TIMES')+' {'); stmt(inpBlock(id,'SUBSTACK'),d+1,out,max); out.push(pad+'}'); break;
    case 'control_repeat_until': out.push(pad+'until '+f('CONDITION')+' {'); stmt(inpBlock(id,'SUBSTACK'),d+1,out,max); out.push(pad+'}'); break;
    case 'control_stop': out.push(pad+'stop '+b.fields.STOP_OPTION[0]); break;
    case 'control_wait': out.push(pad+'wait '+f('DURATION')); break;
    default: out.push(pad+b.opcode+' fields='+JSON.stringify(Object.fromEntries(Object.entries(b.fields||{}).map(([k,v])=>[k,v[0]])))+' {'+Object.keys(b.inputs||{}).map(k=>k+'='+f(k)).join(',')+'}');
  }
  stmt(b.next,d,out,max);
}
const out=[]; stmt('v5def5d',0,out,45);
console.log('=== vm_run prologue (first 45 statements) ===');
console.log(out.join('\n'));
// also the RUN hat body
const out2=[]; 
function hatBody(){ const h=B['v5even5n']; const o=[]; stmt(h.next,0,o,60); return o; }
console.log('=== RUN hat body ===');
console.log(hatBody().join('\n'));
