
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function dumpTarget(name,maxLines){
  const t=p.targets.find(x=>x.name===name); const B=t.blocks;
  const stage=p.targets.find(x=>x.isStage); const gId={}; for(const [id,v] of Object.entries(stage.variables||{})) gId[id]=v[0];
  const vId={}; for(const [id,v] of Object.entries(t.variables||{})) vId[id]=v[0];
  const lId={}; for(const [id,v] of Object.entries(t.lists||{})) lId[id]=v[0];
  const sgId={}; for(const [id,v] of Object.entries(stage.lists||{})) sgId[id]=v[0];
  function slot(id,n){const b=B[id];const i=b.inputs&&b.inputs[n];if(!i)return null;const v=i[1];
    if(typeof v==='string'&&B[v])return{kind:'block',id:v}; if(Array.isArray(v)&&PRIM.has(v[0]))return{kind:'lit',val:v[1]};return null;}
  const ib=(id,n)=>{const s=slot(id,n);return s&&s.kind==='block'?s.id:null;};
  function expr(id){ if(!id)return ''; const b=B[id]; if(!b)return '?';
    const f=(n)=>{const s=slot(id,n); if(!s)return ''; return s.kind==='lit'?JSON.stringify(s.val):expr(s.id);};
    switch(b.opcode){ case 'data_variable': return vId[b.fields.VARIABLE[1]]||gId[b.fields.VARIABLE[1]]||b.fields.VARIABLE[0];
     case 'data_itemoflist': return (lId[b.fields.LIST[1]]||sgId[b.fields.LIST[1]]||b.fields.LIST[0])+'['+f('INDEX')+']';
     case 'data_lengthoflist': return 'len('+(lId[b.fields.LIST[1]]||sgId[b.fields.LIST[1]]||b.fields.LIST[0])+')';
     case 'operator_add': return '('+f('NUM1')+'+'+f('NUM2')+')';
     case 'operator_subtract': return '('+f('NUM1')+'-'+f('NUM2')+')';
     case 'operator_divide': return '('+f('NUM1')+'/'+f('NUM2')+')';
     case 'operator_mathop': return 'math.'+b.fields.OPERATOR[0]+'('+f('NUM')+')';
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
     case 'sensing_mousex': return 'mouseX'; case 'sensing_mousey': return 'mouseY';
     case 'sensing_mousedown': return 'mouseDown'; case 'sensing_timer': return 'timer';
     case 'sensing_answer': return 'answer';
     case 'argument_reporter_string_number': return b.fields.VALUE[0];
     default: return b.opcode+'{'+Object.keys(b.inputs||{}).map(k=>k+'='+f(k)).join(',')+'}'; } }
  const out=[];
  function stmt(id,d){ if(!id||out.length>maxLines)return; const b=B[id]; if(!b)return;
    const pad='  '.repeat(d);
    const f=(n)=>{const s=slot(id,n); if(!s)return ''; return s.kind==='lit'?JSON.stringify(s.val):expr(s.id);};
    switch(b.opcode){
      case 'data_setvariableto': out.push(pad+(vId[b.fields.VARIABLE[1]]||gId[b.fields.VARIABLE[1]]||b.fields.VARIABLE[0])+' = '+f('VALUE')); break;
      case 'data_changevariableby': out.push(pad+(vId[b.fields.VARIABLE[1]]||b.fields.VARIABLE[0])+' += '+f('VALUE')); break;
      case 'data_addtolist': out.push(pad+'add '+f('ITEM')+' to '+(lId[b.fields.LIST[1]]||sgId[b.fields.LIST[1]]||b.fields.LIST[0])); break;
      case 'data_hidelist': out.push(pad+'hide list'); break;
      case 'data_deletealloflist': out.push(pad+'delete all '+(lId[b.fields.LIST[1]]||sgId[b.fields.LIST[1]]||b.fields.LIST[0])); break;
      case 'data_showlist': out.push(pad+'show list'); break;
      case 'procedures_call': out.push(pad+b.mutation.proccode); break;
      case 'sensing_askandwait': out.push(pad+'ask '+f('QUESTION')+' and wait'); break;
      case 'event_broadcast': out.push(pad+'broadcast '+expr(ib(id,'BROADCAST_INPUT'))); break;
      case 'control_wait': out.push(pad+'wait '+f('DURATION')); break;
      case 'control_wait_until': out.push(pad+'wait until '+f('CONDITION')); break;
      case 'looks_hide': out.push(pad+'hide'); break;
      case 'control_forever': out.push(pad+'forever {'); stmt(ib(id,'SUBSTACK'),d+1); out.push(pad+'}'); return;
      case 'control_if': case 'control_if_else': { out.push(pad+'if '+f('CONDITION')+' {'); stmt(ib(id,'SUBSTACK'),d+1);
        if(b.opcode==='control_if_else'){ out.push(pad+'} else {'); stmt(ib(id,'SUBSTACK2'),d+1); } out.push(pad+'}'); break; }
      case 'control_repeat': out.push(pad+'repeat '+f('TIMES')+' {'); stmt(ib(id,'SUBSTACK'),d+1); out.push(pad+'}'); break;
      case 'control_repeat_until': out.push(pad+'until '+f('CONDITION')+' {'); stmt(ib(id,'SUBSTACK'),d+1); out.push(pad+'}'); break;
      case 'procedures_definition': { const pr=B[ib(id,'custom_block')]; out.push('DEFINE '+pr.mutation.proccode); break; }
      case 'event_whenflagclicked': out.push('WHEN flag clicked'); break;
      case 'event_whenkeypressed': out.push('WHEN '+b.fields.KEY_OPTION[0]+' key'); break;
      case 'event_whenbroadcastreceived': out.push('WHEN I receive '+b.fields.BROADCAST_OPTION[0]); break;
      default: out.push(pad+b.opcode+' {'+Object.keys(b.inputs||{}).map(k=>k+'='+f(k)).join(',')+'}'); }
    stmt(b.next,d);
  }
  for(const id of Object.keys(B).filter(x=>B[x].topLevel)){ if(B[id].opcode==='procedures_definition') continue; out.push('--- '+id); stmt(id,0); }
  return out.join('\n');
}
console.log('### Stage non-def scripts'); 
console.log(dumpTarget('Stage',200));
console.log('### Controller script heads');
console.log(dumpTarget('Controller',400).slice(0,4000));
