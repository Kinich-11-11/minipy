
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const tname=process.argv[3];
const t=p.targets.find(x=>x.name===tname);
const blocks=t.blocks;
const IND='  ';
function field(b,n){ const f=b.fields&&b.fields[n]; return f?f[0]:null; }
function fmtInput(b,inp,ind){
  if(!inp) return '?';
  const v=inp[1];
  if(Array.isArray(v)){
    // shadow block or literal
    return JSON.stringify(v[1]);
  }
  if(typeof v==='string'){
    const sb=blocks[v];
    if(!sb) return '?'+v;
    return expr(sb,ind);
  }
  return '?';
}
function expr(b,ind){
  if(!b) return '?';
  const o=b.opcode;
  const A=(n)=>fmtInput(b,b.inputs&&b.inputs[n],ind);
  switch(o){
    case 'data_variable': return field(b,'VARIABLE');
    case 'data_listcontents': return '['+field(b,'LIST')+']';
    case 'looks_costume': return 'costume '+field(b,'COSTUME');
    case 'looks_backdrops': return 'backdrop '+field(b,'BACKDROP');
    case 'sensing_keyoptions': return 'key '+field(b,'KEY_OPTION');
    case 'sensing_of_object_menu': return field(b,'OBJECT');
    case 'control_create_clone_of_menu': return field(b,'CLONE_OPTION');
    case 'motion_goto_menu': return field(b,'TO');
    case 'motion_glideto_menu': return field(b,'TO');
    case 'motion_pointtowards_menu': return field(b,'TOWARDS');
    case 'event_broadcast_menu': return '"'+field(b,'BROADCAST_OPTION')+'"';
    case 'procedures_call': return (b.mutation&&b.mutation.proccode)+'('+Object.keys(b.inputs||{}).map(k=>A(k)).join(', ')+')';
    case 'argument_reporter_string_number': return field(b,'VALUE');
    case 'argument_reporter_boolean': return field(b,'VALUE');
    case 'operator_join': return '('+A('STRING1')+' + '+A('STRING2')+')';
    case 'operator_add': return '('+A('NUM1')+' + '+A('NUM2')+')';
    case 'operator_subtract': return '('+A('NUM1')+' - '+A('NUM2')+')';
    case 'operator_multiply': return '('+A('NUM1')+' * '+A('NUM2')+')';
    case 'operator_divide': return '('+A('NUM1')+' / '+A('NUM2')+')';
    case 'operator_mod': return '('+A('NUM1')+' mod '+A('NUM2')+')';
    case 'operator_round': return 'round('+A('NUM')+')';
    case 'operator_mathop': return field(b,'OPERATOR')+'('+A('NUM')+')';
    case 'operator_lt': return '('+A('OPERAND1')+' < '+A('OPERAND2')+')';
    case 'operator_gt': return '('+A('OPERAND1')+' > '+A('OPERAND2')+')';
    case 'operator_equals': return '('+A('OPERAND1')+' = '+A('OPERAND2')+')';
    case 'operator_and': return '('+A('OPERAND1')+' and '+A('OPERAND2')+')';
    case 'operator_or': return '('+A('OPERAND1')+' or '+A('OPERAND2')+')';
    case 'operator_not': return 'not('+A('OPERAND')+')';
    case 'operator_letter_of': return 'letter '+A('LETTER')+' of '+A('STRING');
    case 'operator_length': return 'len('+A('STRING')+')';
    case 'operator_contains': return '('+A('STRING1')+' contains '+A('STRING2')+')';
    case 'data_itemoflist': return 'item '+A('INDEX')+' of ['+field(b,'LIST')+']';
    case 'data_itemnumoflist': return 'itemnum '+A('ITEM')+' in '+A('LIST');
    case 'data_lengthoflist': return 'len(['+field(b,'LIST')+'])';
    case 'data_listcontainsitem': return '(['+field(b,'LIST')+'] contains '+A('ITEM')+')';
    case 'sensing_keypressed': return 'key '+A('KEY_OPTION')+' pressed?';
    case 'sensing_mousedown': return 'mouse down?';
    case 'sensing_mousex': return 'mouse x'; case 'sensing_mousey': return 'mouse y';
    case 'sensing_timer': return 'timer'; case 'sensing_dayssince2000': return 'days since 2000';
    case 'sensing_current': return 'current '+field(b,'CURRENTMENU');
    case 'looks_size': return 'size'; case 'motion_xposition': return 'x position'; case 'motion_yposition': return 'y position';
    default: return o+'('+Object.keys(b.inputs||{}).map(k=>k+':'+A(k)).join(', ')+')';
  }
}
function stmt(b,ind,depth){
  const out=[];
  let cur=b;
  while(cur){
    const o=cur.opcode;
    const A=(n)=>fmtInput(cur,cur.inputs&&cur.inputs[n],ind);
    const sub=(n)=>{ const inp=cur.inputs&&cur.inputs[n]; return inp&&typeof inp[1]==='string'?[inp[1]]:null; };
    let line=o;
    switch(o){
      case 'data_setvariableto': line='set '+field(cur,'VARIABLE')+' = '+A('VALUE'); break;
      case 'data_changevariableby': line='set '+field(cur,'VARIABLE')+' += '+A('VALUE'); break;
      case 'data_addtolist': line='add '+A('ITEM')+' to ['+field(cur,'LIST')+']'; break;
      case 'data_deleteoflist': line='delete '+A('INDEX')+' of ['+field(cur,'LIST')+']'; break;
      case 'data_deletealloflist': line='clear ['+field(cur,'LIST')+']'; break;
      case 'data_replaceitemoflist': line='['+field(cur,'LIST')+']['+A('INDEX')+'] = '+A('ITEM'); break;
      case 'data_insertatlist': line='insert '+A('ITEM')+' at '+A('INDEX')+' of ['+field(cur,'LIST')+']'; break;
      case 'event_broadcast': line='broadcast '+A('BROADCAST_INPUT'); break;
      case 'event_broadcastandwait': line='broadcast '+A('BROADCAST_INPUT')+' and wait'; break;
      case 'control_wait': line='wait '+A('DURATION')+'s'; break;
      case 'control_stop': line='stop '+field(cur,'STOP_OPTION'); break;
      case 'looks_switchcostumeto': line='switch costume to '+A('COSTUME'); break;
      case 'looks_setsizeto': line='set size '+A('SIZE'); break;
      case 'motion_gotoxy': line='go to ('+A('X')+', '+A('Y')+')'; break;
      case 'motion_setx': line='set x '+A('X'); break;
      case 'motion_sety': line='set y '+A('Y'); break;
      case 'procedures_call': line='call '+expr(cur,ind); break;
      case 'control_if': line='if '+A('CONDITION')+':'; break;
      case 'control_if_else': line='if '+A('CONDITION')+':'; break;
      case 'control_repeat': line='repeat '+A('TIMES')+':'; break;
      case 'control_repeat_until': line='repeat until '+A('CONDITION')+':'; break;
      case 'control_forever': line='forever:'; break;
      case 'control_wait_until': line='wait until '+A('CONDITION'); break;
      case 'control_create_clone_of': line='create clone of '+A('CLONE_OPTION'); break;
      case 'control_delete_this_clone': line='delete this clone'; break;
      case 'sensing_askandwait': line='ask '+A('QUESTION')+' and wait'; break;
      case 'sensing_resettimer': line='reset timer'; break;
      case 'pen_clear': line='clear'; break;
      default: break;
    }
    out.push(IND.repeat(depth)+line);
    if(o==='control_if'||o==='control_if_else'||o==='control_repeat'||o==='control_repeat_until'||o==='control_forever'){
      const s=sub('SUBSTACK');
      if(s) out.push(...(function(){const r=[];let c=blocks[s[0]];while(c){const sub2=stmt(c,ind,depth+1);r.push(...sub2);c=c.next?blocks[c.next]:null;}return r;})());
      if(o==='control_if_else'){ out.push(IND.repeat(depth)+'else:'); const s2=sub('SUBSTACK2'); if(s2) out.push(...(function(){const r=[];let c=blocks[s2[0]];while(c){r.push(...stmt(c,ind,depth+1));c=c.next?blocks[c.next]:null;}return r;})()); }
    }
    cur = cur.next?blocks[cur.next]:null;
  }
  return out;
}
const tops=Object.entries(blocks).filter(([,b])=>b.topLevel&&!b.shadow);
for(const [id,b] of tops){
  let head=b.opcode;
  if(b.opcode==='event_whenflagclicked') head='WHEN flag clicked:';
  else if(b.opcode==='event_whenbroadcastreceived') head='WHEN I receive "'+field(b,'BROADCAST_OPTION')+'":';
  else if(b.opcode==='event_whenkeypressed') head='WHEN key '+field(b,'KEY_OPTION')+' pressed:';
  else if(b.opcode==='event_whenthisspriteclicked') head='WHEN this sprite clicked:';
  else if(b.opcode==='procedures_definition'){ const pid=b.inputs.custom_block[1]; const pr=blocks[pid]; head='DEFINE '+(pr.mutation?pr.mutation.proccode:b.opcode); }
  else if(b.opcode==='control_start_as_clone') head='WHEN I start as a clone:';
  console.log(head);
  const s=b.next?blocks[b.next]:null;
  if(s) console.log(stmt(s,IND,1).join('\n'));
  console.log('');
}