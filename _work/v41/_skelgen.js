const project = JSON.parse(require('fs').readFileSync('_work/v41/project234.json','utf8'));
const T = project.targets.find(t=>t.name==='Interpreter');
const BL=T.blocks;
const condTxt=(id)=>{ const o=[]; const walk=(x,d)=>{ if(!x||d>12) return; const b=BL[x]; if(!b) return;
  if(b.opcode==='data_itemoflist') { o.push(b.fields.LIST[0]+'['); walk(b.inputs.INDEX&&b.inputs.INDEX[1],d+1); o.push(']'); return; }
  if(b.opcode==='operator_equals'){ o.push('('); walk(b.inputs.OPERAND1&&b.inputs.OPERAND1[1],d+1); o.push('=='); walk(b.inputs.OPERAND2&&b.inputs.OPERAND2[1],d+1); o.push(')'); return; }
  if(b.opcode==='operator_and'||b.opcode==='operator_or'){ o.push(b.opcode==='operator_and'?'&&':'||'); o.push('('); walk(b.inputs.OPERAND1&&b.inputs.OPERAND1[1],d+1); o.push(','); walk(b.inputs.OPERAND2&&b.inputs.OPERAND2[1],d+1); o.push(')'); return; }
  if(b.opcode==='operator_not'){ o.push('!('); walk(b.inputs.OPERAND&&b.inputs.OPERAND[1],d+1); o.push(')'); return; }
  if(b.opcode==='operator_gt'||b.opcode==='operator_lt'){ o.push(b.opcode==='operator_gt'?'>':'<'); o.push('('); walk(b.inputs.OPERAND1&&b.inputs.OPERAND1[1],d+1); o.push(','); walk(b.inputs.OPERAND2&&b.inputs.OPERAND2[1],d+1); o.push(')'); return; }
  if(b.opcode==='data_variable'){ o.push(b.fields.VARIABLE[0]); return; }
  if(b.opcode==='argument_reporter_string_number'){ o.push('a:'+b.fields.VALUE[0]); return; }
  if(b.opcode==='operator_join'){ o.push('J('); walk(b.inputs.STRING1&&b.inputs.STRING1[1],d+1); o.push(','); walk(b.inputs.STRING2&&b.inputs.STRING2[1],d+1); o.push(')'); return; }
  if(b.opcode==='operator_add'||b.opcode==='operator_subtract'||b.opcode==='operator_multiply'){ o.push(b.opcode==='operator_add'?'+':b.opcode==='operator_subtract'?'-':'*'); o.push('('); walk(b.inputs.NUM1&&b.inputs.NUM1[1],d+1); o.push(','); walk(b.inputs.NUM2&&b.inputs.NUM2[1],d+1); o.push(')'); return; }
  if(b.opcode==='operator_length'){ o.push('len('); walk(b.inputs.STRING&&b.inputs.STRING[1],d+1); o.push(')'); return; }
  if(b.opcode==='operator_letter_of'){ o.push('chr('); walk(b.inputs.LETTER&&b.inputs.LETTER[1],d+1); o.push(','); walk(b.inputs.STRING&&b.inputs.STRING[1],d+1); o.push(')'); return; }
  if(b.opcode==='procedures_call'){ o.push('CALL '+b.mutation.proccode); return; }
  if(b.opcode==='data_listcontainsitem'){ o.push(b.fields.LIST[0]+'~'); walk(b.inputs.ITEM&&b.inputs.ITEM[1],d+1); return; }
  o.push('<'+b.opcode+'>'); };
  walk(id,0); return o.join(''); };
const dump2=(id,ind)=>{ let c=id,g=0; while(c&&BL[c]&&g++<300){ const b=BL[c];
  if(b.opcode==='control_if'||b.opcode==='control_if_else'){ console.log(ind+'IF '+(condTxt(b.inputs.CONDITION[1])||'?')); if(b.inputs.SUBSTACK&&typeof b.inputs.SUBSTACK[1]==='string') dump2(b.inputs.SUBSTACK[1],ind+'  '); if(b.opcode==='control_if_else'&&b.inputs.SUBSTACK2&&typeof b.inputs.SUBSTACK2[1]==='string'){ console.log(ind+'ELSE'); dump2(b.inputs.SUBSTACK2[1],ind+'  '); } }
  else if(b.opcode==='procedures_call') console.log(ind+'CALL '+b.mutation.proccode);
  else if(b.opcode==='data_setvariableto') console.log(ind+b.fields.VARIABLE[0]+' <- '+condTxt(b.inputs.VALUE && typeof b.inputs.VALUE[1]==='string' ? b.inputs.VALUE[1] : null));
  else if(b.opcode==='control_repeat_until'){ console.log(ind+'REPEATU '+condTxt(b.inputs.CONDITION[1])); if(b.inputs.SUBSTACK&&typeof b.inputs.SUBSTACK[1]==='string') dump2(b.inputs.SUBSTACK[1],ind+'  '); }
  else if(b.opcode==='control_repeat'){ console.log(ind+'REPEAT '+condTxt(b.inputs.TIMES[1])); if(b.inputs.SUBSTACK&&typeof b.inputs.SUBSTACK[1]==='string') dump2(b.inputs.SUBSTACK[1],ind+'  '); }
  else console.log(ind+'<'+b.opcode+'>');
  c=b.next; } };
const pc = process.argv[2];
let defId=null;
for (const [id,b] of Object.entries(BL)) if (b && b.opcode==='procedures_definition' && b.inputs && b.inputs.custom_block) { const p=BL[b.inputs.custom_block[1]]; if (p.mutation && p.mutation.proccode===pc) { defId=id; break; } }
if(!defId){ console.log('NOT FOUND '+pc); process.exit(1); }
dump2(BL[defId].next,'');
