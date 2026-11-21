
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const it=p.targets.find(t=>t.name==='Interpreter'); const B=it.blocks;
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function inpBlock(id,n){const b=B[id];const i=b.inputs&&b.inputs[n];if(!i)return null;
  for(let x=1;x<i.length;x++){const v=i[x];if(typeof v==='string'&&B[v])return v;if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string'&&B[v[1]])return v[1];}return null;}
function inpLiteral(id,n){const b=B[id];const i=b.inputs&&b.inputs[n];if(!i)return null;
  for(let x=1;x<i.length;x++){const v=i[x];if(Array.isArray(v)&&PRIM.has(v[0]))return v[1];}return null;}
function expr(id,d){ if(!id)return ''; const b=B[id]; if(!b)return '?';
  const f=(n)=>{const o=inpLiteral(id,n); return o!==null?JSON.stringify(o):expr(inpBlock(id,n),d+1);};
  switch(b.opcode){
    case 'data_variable': return b.fields.VARIABLE[0];
    case 'data_itemoflist': return b.fields.LIST[0]+'['+f('INDEX')+']';
    case 'data_lengthoflist': return 'len('+b.fields.LIST[0]+')';
    case 'data_itemnumoflist': return 'indexof('+f('ITEM')+','+b.fields.LIST[0]+')';
    case 'data_listcontainsitem': return f('ITEM')+' in '+b.fields.LIST[0];
    case 'operator_add': return '('+f('NUM1')+' + '+f('NUM2')+')';
    case 'operator_subtract': return '('+f('NUM1')+' - '+f('NUM2')+')';
    case 'operator_multiply': return '('+f('NUM1')+' * '+f('NUM2')+')';
    case 'operator_divide': return '('+f('NUM1')+' / '+f('NUM2')+')';
    case 'operator_mod': return '('+f('NUM1')+' % '+f('NUM2')+')';
    case 'operator_equals': return '('+f('OPERAND1')+' == '+f('OPERAND2')+')';
    case 'operator_lt': return '('+f('OPERAND1')+' < '+f('OPERAND2')+')';
    case 'operator_gt': return '('+f('OPERAND1')+' > '+f('OPERAND2')+')';
    case 'operator_and': return '('+f('OPERAND1')+' and '+f('OPERAND2')+')';
    case 'operator_or': return '('+f('OPERAND1')+' or '+f('OPERAND2')+')';
    case 'operator_not': return 'not '+f('OPERAND');
    case 'operator_join': return 'join('+f('STRING1')+','+f('STRING2')+')';
    case 'operator_letter_of': return 'letter('+f('LETTER')+','+f('STRING')+')';
    case 'operator_length': return 'length('+f('STRING')+')';
    case 'operator_contains': return '('+f('STRING1')+' contains '+f('STRING2')+')';
    case 'operator_mathop': return b.fields.OPERATOR[0]+'('+f('NUM')+')';
    case 'looks_costumenumbername': return 'costume'+b.fields.NUMBER_NAME[0];
    case 'argument_reporter_string_number': return b.fields.VALUE[0];
    default: return b.opcode+'('+Object.keys(b.inputs||{}).map(k=>k+'='+f(k)).join(',')+')';
  }
}
function stmt(id,d,out){ if(!id)return; const b=B[id]; if(!b)return;
  const pad='  '.repeat(d);
  const f=(n)=>{const o=inpLiteral(id,n); return o!==null?JSON.stringify(o):expr(inpBlock(id,n),d+1);};
  switch(b.opcode){
    case 'data_setvariableto': out.push(pad+b.fields.VARIABLE[0]+' = '+f('VALUE')); break;
    case 'data_changevariableby': out.push(pad+b.fields.VARIABLE[0]+' += '+f('VALUE')); break;
    case 'data_addtolist': out.push(pad+'add '+f('ITEM')+' to '+b.fields.LIST[0]); break;
    case 'data_replaceitemoflist': out.push(pad+b.fields.LIST[0]+'['+f('INDEX')+'] = '+f('ITEM')); break;
    case 'data_deleteoflist': out.push(pad+'delete '+f('INDEX')+' of '+b.fields.LIST[0]); break;
    case 'data_deletealloflist': out.push(pad+'delete all '+b.fields.LIST[0]); break;
    case 'procedures_call': out.push(pad+b.mutation.proccode); break;
    case 'looks_switchcostumeto': out.push(pad+'switch costume to '+f('COSTUME')); break;
    case 'control_if':
    case 'control_if_else': {
      out.push(pad+'if '+f('CONDITION')+' {');
      stmt(inpBlock(id,'SUBSTACK'),d+1,out);
      if(b.opcode==='control_if_else'){ out.push(pad+'} else {'); stmt(inpBlock(id,'SUBSTACK2'),d+1,out); }
      out.push(pad+'}'); break; }
    case 'control_repeat': out.push(pad+'repeat '+f('TIMES')+' {'); stmt(inpBlock(id,'SUBSTACK'),d+1,out); out.push(pad+'}'); break;
    case 'control_repeat_until': out.push(pad+'until '+f('CONDITION')+' {'); stmt(inpBlock(id,'SUBSTACK'),d+1,out); out.push(pad+'}'); break;
    case 'control_while': out.push(pad+'while '+f('CONDITION')+' {'); stmt(inpBlock(id,'SUBSTACK'),d+1,out); out.push(pad+'}'); break;
    case 'control_stop': out.push(pad+'stop '+b.fields.STOP_OPTION[0]); break;
    default: out.push(pad+b.opcode+' '+Object.keys(b.inputs||{}).map(k=>k+'='+f(k)).join(' '));
  }
  stmt(b.next,d,out);
}
// find a looks_switchcostumeto inside vm_run and print 60 statements of context
const root='v5def5d';
function kids(id){const b=B[id];const out=[];if(b.next)out.push(b.next);
 for(const k in (b.inputs||{})){const i=b.inputs[k];if(!i)continue;for(let x=1;x<i.length;x++){const v=i[x];
  if(typeof v==='string')out.push(v);else if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string')out.push(v[1]);}}
 return out.filter(x=>B[x]&&B[x].opcode);}
const s=new Set(); const st=[root]; while(st.length){const x=st.pop(); if(s.has(x))continue; s.add(x); for(const c of kids(x)) st.push(c);}
const hits=[...s].filter(id=>B[id].opcode==='looks_switchcostumeto');
console.log('switchcostume hits in vm_run:', hits.length);
for(const h of hits.slice(0,3)){
  console.log('--- hit '+h+' expr: switch costume to '+expr(inpBlock(h,'COSTUME'),0));
  // walk backwards is hard; print the enclosing chain from a parent
  const par=B[h].parent; console.log('   parent:', B[par]?B[par].opcode:'none');
  const out=[]; stmt(h,0,out); console.log(out.slice(0,20).join('\n'));
}
