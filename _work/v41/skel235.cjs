// Skeleton dump: control-structure tree of a proc with condition snippets + call/setV lines.
const fs = require('fs');
const [pj, pc] = process.argv.slice(2);
const project = JSON.parse(fs.readFileSync(pj, 'utf8'));
const T = project.targets.find(t => t.name === 'Interpreter');
const BL = T.blocks;
let defId = null;
for (const [id, b] of Object.entries(BL)) {
  if (b && b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
    const proto = BL[b.inputs.custom_block[1]];
    if (proto && proto.mutation && proto.mutation.proccode === pc) { defId = id; break; }
  }
}
if (!defId) { console.log('NOT FOUND'); process.exit(1); }
function condText(id) {
  const out = [];
  const walk = (x, d) => {
    if (!x || d > 8) return;
    const b = BL[x];
    if (!b) return;
    if (b.opcode === 'data_itemoflist') { const li = b.fields.LIST && b.fields.LIST[0]; out.push(li + '[' + skeleton(b.inputs.INDEX) + ']'); return; }
    if (b.opcode === 'operator_equals' || b.opcode === 'operator_lt' || b.opcode === 'operator_gt' || b.opcode === 'operator_contains') {
      out.push('(' + skeleton(b.inputs.OPERAND1 || b.inputs.STRING1) + (b.opcode === 'operator_equals' ? '==' : b.opcode === 'operator_lt' ? '<' : b.opcode === 'operator_gt' ? '>' : '~~') + skeleton(b.inputs.OPERAND2 || b.inputs.STRING2) + ')'); return;
    }
    if (b.opcode === 'data_variable' || b.opcode === 'data_setvariableto') { out.push(b.fields.VARIABLE[0]); return; }
    if (b.opcode === 'argument_reporter_string_number') { out.push('a:' + b.fields.VALUE[0]); return; }
    if (b.opcode === 'operator_add' || b.opcode === 'operator_subtract' || b.opcode === 'operator_multiply') { out.push('(' + skeleton(b.inputs.NUM1) + (b.opcode === 'operator_add' ? '+' : b.opcode === 'operator_subtract' ? '-' : '*') + skeleton(b.inputs.NUM2) + ')'); return; }
    if (b.opcode === 'operator_join') { out.push('J(' + skeleton(b.inputs.STRING1) + ',' + skeleton(b.inputs.STRING2) + ')'); return; }
    if (b.opcode === 'operator_not') { out.push('!' + skeleton(b.inputs.OPERAND)); return; }
    if (b.opcode === 'operator_and' || b.opcode === 'operator_or') { out.push((b.opcode === 'operator_and' ? '&' : '|') + '(' + skeleton(b.inputs.OPERAND1) + ',' + skeleton(b.inputs.OPERAND2) + ')'); return; }
    if (b.opcode === 'procedures_call') { out.push('CALL ' + b.mutation.proccode); return; }
    if (b.opcode === 'data_listcontainsitem') { out.push(b.fields.LIST[0] + '~' + skeleton(b.inputs.ITEM)); return; }
    if (b.opcode === 'operator_length' || b.opcode === 'operator_letter_of') { out.push('<' + b.opcode.split('_')[1] + ' ' + skeleton(b.inputs.STRING || b.inputs.LETTER) + '>'); return; }
    out.push('<' + b.opcode + (b.fields ? ' ' + JSON.stringify(b.fields) : '') + '>');
  };
  const skeleton = (x) => { const o = []; walk(x, 0); return o.join(''); };
  return skeleton(id);
}
function dump(id, depth) {
  const pad = '  '.repeat(depth);
  let c = id, guard = 0;
  while (c && BL[c] && guard++ < 400) {
    const b = BL[c];
    if (b.opcode === 'control_if' || b.opcode === 'control_if_else') {
      console.log(pad + 'IF: ' + condText(b.inputs.CONDITION[1]));
      if (b.inputs.SUBSTACK) dump(b.inputs.SUBSTACK[1], depth + 1);
      if (b.opcode === 'control_if_else') { console.log(pad + 'ELSE:'); if (b.inputs.SUBSTACK2) dump(b.inputs.SUBSTACK2[1], depth + 1); }
    } else if (b.opcode === 'control_repeat_until') {
      console.log(pad + 'REPEATU: ' + condText(b.inputs.CONDITION[1]));
      dump(b.inputs.SUBSTACK[1], depth + 1);
    } else if (b.opcode === 'control_repeat') {
      console.log(pad + 'REPEAT: ' + condText(b.inputs.TIMES[1]));
      dump(b.inputs.SUBSTACK[1], depth + 1);
    } else if (b.opcode === 'procedures_call') {
      const argIds = JSON.parse(b.mutation.argumentids || '[]');
      const args = argIds.map(a => {
        const v = b.inputs[a];
        if (typeof v[1] === 'string' && BL[v[1]]) return condText(v[1]);
        return JSON.stringify(v[1]);
      });
      console.log(pad + 'CALL ' + b.mutation.proccode + ' (' + args.join(', ') + ')');
    } else if (b.opcode === 'data_setvariableto') {
      console.log(pad + b.fields.VARIABLE[0] + ' <- ' + condText(b.inputs.VALUE[1] && typeof b.inputs.VALUE[1] === 'string' ? b.inputs.VALUE[1] : null));
    } else if (b.opcode === 'data_addtolist') {
      console.log(pad + '+ ' + b.fields.LIST[0] + ' <- ' + condText(b.inputs.ITEM[1] && typeof b.inputs.ITEM[1] === 'string' ? b.inputs.ITEM[1] : null));
    } else if (b.opcode === 'control_stop' || b.opcode === 'control_create_clone_of') {
      console.log(pad + '<' + b.opcode + '>');
    } else {
      console.log(pad + '<' + b.opcode + '>');
    }
    c = b.next;
  }
}
dump(BL[defId].next, 0);
