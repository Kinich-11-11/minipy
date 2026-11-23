const {zipRead}=require('../sb3lib.js');
const p=JSON.parse(zipRead('MiniPy_v4.250.sb3').find(e=>e.name==='project.json').data.toString());
const B=p.targets.find(t=>t.name==='Interpreter').blocks;
function procDef(name){
  for(const [id,b] of Object.entries(B)){
    if(b.opcode==='procedures_definition'){
      const pr=B[b.inputs.custom_block[1]];
      if(pr.mutation.proccode===name) return {id,body:b.next};
    }
  }
}
function val(v){
  if(!Array.isArray(v)) return JSON.stringify(v);
  if(typeof v[1]==='string'&&B[v[1]]) return '<'+valBlock(v[1])+'>';
  return JSON.stringify(v);
}
function valBlock(id){
  const b=B[id]; if(!b) return id;
  if(b.opcode==='argument_reporter_string_number'||b.opcode==='argument_reporter_boolean') return 'ARG('+b.fields.VALUE?.[0]+')';
  if(b.opcode==='data_variable') return 'VAR('+b.fields.VARIABLE?.[0]+')';
  if(b.opcode==='data_itemoflist') return 'ITEM('+b.fields.LIST?.[0]+','+val(b.inputs.INDEX)+')';
  if(b.opcode==='text') return b.fields.TEXT?.[0]||'';
  if(b.opcode==='math_number') return b.fields.NUM?.[0]||'';
  if(b.opcode==='operator_equals') return '('+val(b.inputs.OPERAND1)+'=='+val(b.inputs.OPERAND2)+')';
  if(b.opcode==='operator_and') return '('+val(b.inputs.OPERAND1)+'&&'+val(b.inputs.OPERAND2)+')';
  return b.opcode;
}
function walk(start,ind=0){
  let id=start, n=0, seen=new Set();
  while(id && n++<500){
    if(seen.has(id)){console.log(' '.repeat(ind)+'LOOP '+id);break;}
    seen.add(id); const b=B[id]; if(!b){console.log(' '.repeat(ind)+'MISSING '+id);break;}
    let s=b.opcode; const fs=b.fields||{};
    if(fs.VARIABLE) s+=' '+fs.VARIABLE[0]; if(fs.LIST) s+=' LIST='+fs.LIST[0];
    if(b.opcode.startsWith('procedures_')) s+=' '+(b.mutation?.proccode||'');
    const ins=Object.entries(b.inputs||{}).map(([k,v])=>k+'='+val(v)).join(' '); if(ins)s+=' '+ins;
    console.log(' '.repeat(ind)+id+' '+s);
    for(const k of ['SUBSTACK','SUBSTACK2']){
      const v=b.inputs?.[k];
      if(v&&typeof v[1]==='string'){console.log(' '.repeat(ind)+'{'+k);walk(v[1],ind+2);}
    }
    id=b.next;
  }
}
for(const name of ['send777 %s %s %s','genResumeException783 %s %s %s','genExceptionMeth783 %s %s %s %s']){
  const d=procDef(name); console.log('\n=== '+name+' def '+d?.id+' ==='); if(d) walk(d.body,0);
}


