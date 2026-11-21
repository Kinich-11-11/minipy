
const fs=require('fs');
const P=JSON.parse(fs.readFileSync(process.argv[2] || '_work/build/project.json','utf8'));

function lit(v){
  if(Array.isArray(v)){
    if(v[0]===12)return 'V('+v[1]+')';
    if(v[0]===13)return 'L('+v[1]+')';
    if(v[0]===11)return 'BC('+v[1]+')';
    if(v[0]===10)return JSON.stringify(v[1]);
    if(v[0]===4||v[0]===5||v[0]===6||v[0]===7||v[0]===8)return JSON.stringify(v[1]);
    if(v[0]===9)return v[1];
    return JSON.stringify(v);
  }
  return JSON.stringify(v);
}
function decompile(P){
  const LINES=[];
  const out=LINES;
  for(const t of P.targets){
    const B=t.blocks;
    out.push('######## TARGET: '+t.name+' ('+(t.isStage?'stage':'sprite')+') blocks='+Object.keys(B).length);
    const idOf=b=>b;
    function expr(id){
      const b=B[id]; if(!b)return '??'+id;
      const o=b.opcode; const f=b.fields||{}; const inp=b.inputs||{};
      const iv=k=>{const v=inp[k]; if(!v)return '()'; const x=v[1]; if(typeof x==='string')return expr(x); if(Array.isArray(x))return lit(x); if(x&&typeof x==='object'&&x.id)return expr(x.id); return lit(x);};
      const fv=k=>f[k]?JSON.stringify(f[k][0]):'?';
      switch(o){
        case 'data_variable': return fv('VARIABLE');
        case 'data_listcontents': return 'list:'+fv('LIST');
        case 'data_itemoflist': return 'item '+iv('INDEX')+' of '+fv('LIST');
        case 'data_lengthoflist': return 'length of '+fv('LIST');
        case 'data_itemnumoflist': return 'itemnum of '+iv('ITEM')+' in '+fv('LIST');
        case 'data_listcontainsitem': return iv('ITEM')+' in '+fv('LIST');
        case 'argument_reporter_string_number': return 'arg:'+fv('VALUE');
        case 'operator_join': return '('+iv('STRING1')+' + '+iv('STRING2')+')';
        case 'operator_letter_of': return 'letter '+iv('LETTER')+' of '+iv('STRING');
        case 'operator_length': return 'len('+iv('STRING')+')';
        case 'operator_contains': return '('+iv('STRING2')+' in '+iv('STRING1')+')';
        case 'operator_add': return '('+iv('NUM1')+'+'+iv('NUM2')+')';
        case 'operator_subtract': return '('+iv('NUM1')+'-'+iv('NUM2')+')';
        case 'operator_multiply': return '('+iv('NUM1')+'*'+iv('NUM2')+')';
        case 'operator_divide': return '('+iv('NUM1')+'/'+iv('NUM2')+')';
        case 'operator_mod': return '('+iv('NUM1')+'%'+iv('NUM2')+')';
        case 'operator_round': return 'round('+iv('NUM')+')';
        case 'operator_mathop': return fv('OPERATOR')+'('+iv('NUM')+')';
        case 'operator_lt': return '('+iv('OPERAND1')+'<'+iv('OPERAND2')+')';
        case 'operator_gt': return '('+iv('OPERAND1')+'>'+iv('OPERAND2')+')';
        case 'operator_equals': return '('+iv('OPERAND1')+'=='+iv('OPERAND2')+')';
        case 'operator_and': return '('+iv('OPERAND1')+' and '+iv('OPERAND2')+')';
        case 'operator_or': return '('+iv('OPERAND1')+' or '+iv('OPERAND2')+')';
        case 'operator_not': return 'not('+iv('OPERAND')+')';
        case 'procedures_call': return 'CALL '+b.mutation.proccode+'('+argsOf(b).join(', ')+')';
        case 'sensing_keypressed': return 'keypressed('+iv('KEY_OPTION')+')';
        case 'sensing_mousedown': return 'mousedown';
        case 'sensing_mousex': return 'mousex';
        case 'sensing_mousey': return 'mousey';
        case 'sensing_answer': return 'answer';
        case 'sensing_timer': return 'timer';
        case 'looks_costume': return 'costume';
        case 'looks_costumenumbername': return 'costumenum';
        case 'control_get_counter': return 'counter';
        default: {
          const parts=[];
          for(const k in inp)parts.push(k+'='+iv(k));
          for(const k in f)parts.push(k+':'+fv(k));
          return o+'['+parts.join(' ')+']';
        }
      }
    }
    function argsOf(b){
      const ids=(b.mutation&&b.mutation.argumentids)?JSON.parse(b.mutation.argumentids):[];
      return ids.map(id=>{const v=b.inputs[id]; if(!v)return '()'; const x=v[1]; if(typeof x==='string')return expr(x); if(Array.isArray(x))return lit(x); return '?';});
    }
    function stmt(id,ind){
      let out=[];let cur=id;let guard=0;
      while(cur&&B[cur]&&guard++<2000){
        const b=B[cur];const o=b.opcode;const inp=b.inputs||{};const f=b.fields||{};
        const p=' '.repeat(ind);
        switch(o){
          case 'data_setvariableto': out.push(p+f.VARIABLE[0]+' = '+expr(inp.VALUE[1])); break;
          case 'data_changevariableby': out.push(p+f.VARIABLE[0]+' += '+expr(inp.VALUE[1])); break;
          case 'data_addtolist': out.push(p+'append('+f.LIST[0]+', '+expr(inp.ITEM[1])+')'); break;
          case 'data_deletealloflist': out.push(p+'clear('+f.LIST[0]+')'); break;
          case 'data_deleteoflist': out.push(p+'del '+f.LIST[0]+'['+expr(inp.INDEX[1])+']'); break;
          case 'data_insertatlist': out.push(p+'insert '+f.LIST[0]+'['+expr(inp.INDEX[1])+'] = '+expr(inp.ITEM[1])); break;
          case 'data_replaceitemoflist': out.push(p+f.LIST[0]+'['+expr(inp.INDEX[1])+'] = '+expr(inp.ITEM[1])); break;
          case 'data_showvariable': out.push(p+'show '+f.VARIABLE[0]); break;
          case 'data_hidevariable': out.push(p+'hide '+f.VARIABLE[0]); break;
          case 'data_showlist': out.push(p+'showlist '+f.LIST[0]); break;
          case 'data_hidelist': out.push(p+'hidelist '+f.LIST[0]); break;
          case 'control_if': out.push(p+'if '+expr(inp.CONDITION[1])+':'); out=out.concat(sub(inp.SUBSTACK,ind+2)); break;
          case 'control_if_else': out.push(p+'if '+expr(inp.CONDITION[1])+':'); out=out.concat(sub(inp.SUBSTACK,ind+2)); out.push(p+'else:'); out=out.concat(sub(inp.SUBSTACK2,ind+2)); break;
          case 'control_repeat': out.push(p+'repeat '+expr(inp.TIMES[1])+':'); out=out.concat(sub(inp.SUBSTACK,ind+2)); break;
          case 'control_forever': out.push(p+'forever:'); out=out.concat(sub(inp.SUBSTACK,ind+2)); break;
          case 'control_repeat_until': out.push(p+'until '+expr(inp.CONDITION[1])+':'); out=out.concat(sub(inp.SUBSTACK,ind+2)); break;
          case 'control_wait_until': out.push(p+'wait_until '+expr(inp.CONDITION[1])); break;
          case 'control_wait': out.push(p+'wait '+expr(inp.DURATION[1])); break;
          case 'control_stop': out.push(p+'stop '+f.STOP_OPTION[0]); break;
          case 'control_create_clone_of': out.push(p+'clone'); break;
          case 'procedures_call': out.push(p+'CALL '+b.mutation.proccode+'('+argsOf(b).join(', ')+')'); break;
          case 'event_broadcast': out.push(p+'broadcast '+expr(inp.BROADCAST_INPUT?inp.BROADCAST_INPUT[1]:null)); break;
          case 'event_broadcastandwait': out.push(p+'broadcast_and_wait'); break;
          case 'looks_switchcostumeto': out.push(p+'costume = '+expr(inp.COSTUME[1])); break;
          case 'looks_nextcostume': out.push(p+'nextcostume'); break;
          case 'looks_say': out.push(p+'say'); break;
          case 'motion_gotoxy': out.push(p+'goto('+expr(inp.X[1])+','+expr(inp.Y[1])+')'); break;
          case 'motion_setx': out.push(p+'x = '+expr(inp.X[1])); break;
          case 'motion_sety': out.push(p+'y = '+expr(inp.Y[1])); break;
          case 'motion_changexby': out.push(p+'x += '+expr(inp.DX[1])); break;
          case 'motion_changeyby': out.push(p+'y += '+expr(inp.DY[1])); break;
          case 'pen_clear': out.push(p+'pen_clear'); break;
          case 'pen_stamp': out.push(p+'stamp'); break;
          case 'pen_penDown': out.push(p+'pendown'); break;
          case 'pen_penUp': out.push(p+'penup'); break;
          case 'pen_setPenColorToColor': out.push(p+'pencolor('+expr(inp.COLOR[1])+')'); break;
          case 'pen_setPenSizeTo': out.push(p+'pensize('+expr(inp.SIZE[1])+')'); break;
          case 'sensing_askandwait': out.push(p+'ask '+expr(inp.QUESTION[1])); break;
          case 'sensing_resettimer': out.push(p+'resettimer'); break;
          default: out.push(p+'??? '+o+' '+JSON.stringify(inp)+' '+JSON.stringify(f));
        }
        cur=b.next;
      }
      return out;
    }
    function sub(inpArr,ind){ if(!inpArr)return []; const x=inpArr[1]; let id = typeof x==='string'?x:(x&&x.id); if(!id)return []; return stmt(id,ind); }
    const tops=Object.keys(B).filter(i=>B[i].topLevel);
    for(const id of tops){
      const b=B[id];
      if(b.opcode==='procedures_definition'){
        const proto=B[b.inputs.custom_block[1]];
        out.push('');
        out.push('PROC '+proto.mutation.proccode+'  [warp='+proto.mutation.warp+'] args='+proto.mutation.argumentnames);
        LINES.push(...stmt(b.next,2));
      } else {
        let head=b.opcode;
        if(b.opcode==='event_whenkeypressed')head+=' '+b.fields.KEY_OPTION[0];
        if(b.opcode==='event_whenbroadcastreceived')head+=' '+b.fields.BROADCAST_OPTION[0];
        out.push('');
        out.push('WHEN '+head);
        LINES.push(...stmt(b.next,2));
      }
    }
  }
  return LINES.join('\n');
}
const OUT = process.argv[3] || '_work/decomp.txt';
fs.writeFileSync(OUT,decompile(P));
console.log('written '+OUT+', lines=',decompile(P).split('\n').length);