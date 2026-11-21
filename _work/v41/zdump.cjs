// readable procedure dump: node zdump.cjs <project.json> "<proccode>" [maxdepth]
const fs = require('fs');
const project = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const want = process.argv[3];
const maxDepth = Number(process.argv[4] || 99);
const T = project.targets.find((t) => t.name === 'Interpreter');
const BL = T.blocks;
const vars = T.variables, lists = T.lists;
function nameOf(d) {
  if (!Array.isArray(d)) return null;
  if (d[0] === 12) return d[1];
  if (d[0] === 13) return d[1];
  return null;
}
function expr(id, ind) {
  const b = BL[id];
  if (!b) return '<?' + id + '>';
  const pad = ' '.repeat(ind);
  const nm = (d) => {
    if (typeof d === 'string') return expr(d, ind);
    if (Array.isArray(d)) {
      if (d[0] === 12) return '`' + d[1] + '`';
      if (d[0] === 13) return '@' + d[1] + '@';
      if (d[0] === 10 || d[0] === 4) return JSON.stringify(d[1]);
      if (d[0] === 2 || d[0] === 3) return nm(d[1]);
      return JSON.stringify(d[1]);
    }
    return String(d);
  };
  const ins = {};
  for (const [k, v] of Object.entries(b.inputs || {})) ins[k] = nm(v);
  const fld = b.fields ? Object.entries(b.fields).map(([k, v]) => k + '=' + (Array.isArray(v) ? v[0] : v)).join(',') : '';
  switch (b.opcode) {
    case 'operator_equals': return '(' + ins.OPERAND1 + ' == ' + ins.OPERAND2 + ')';
    case 'operator_lt': return '(' + ins.OPERAND1 + ' < ' + ins.OPERAND2 + ')';
    case 'operator_gt': return '(' + ins.OPERAND1 + ' > ' + ins.OPERAND2 + ')';
    case 'operator_add': return '(' + ins.NUM1 + ' + ' + ins.NUM2 + ')';
    case 'operator_subtract': return '(' + ins.NUM1 + ' - ' + ins.NUM2 + ')';
    case 'operator_multiply': return '(' + ins.NUM1 + ' * ' + ins.NUM2 + ')';
    case 'operator_divide': return '(' + ins.NUM1 + ' / ' + ins.NUM2 + ')';
    case 'operator_mod': return '(' + ins.NUM1 + ' % ' + ins.NUM2 + ')';
    case 'operator_and': return '(' + ins.OPERAND1 + ' and ' + ins.OPERAND2 + ')';
    case 'operator_or': return '(' + ins.OPERAND1 + ' or ' + ins.OPERAND2 + ')';
    case 'operator_not': return '!' + ins.OPERAND;
    case 'operator_join': return ins.STRING1 + ' .. ' + ins.STRING2;
    case 'operator_length': return 'len(' + ins.STRING + ')';
    case 'operator_letter_of': return 'letterOf(' + ins.LETTER + ',' + ins.STRING + ')';
    case 'operator_contains': return 'contains(' + ins.STRING1 + ',' + ins.STRING2 + ')';
    case 'operator_round': return 'round(' + ins.NUM + ')';
    case 'operator_mathop': return (b.fields.OPERATOR ? b.fields.OPERATOR[0] : '?') + '(' + ins.NUM + ')';
    case 'data_variable': return '`' + (b.fields.VARIABLE ? b.fields.VARIABLE[0] : '?') + '`';
    case 'data_listcontents': return '@' + (b.fields.LIST ? b.fields.LIST[0] : '?') + '@';
    case 'data_itemoflist': return (b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + ins.INDEX + ']';
    case 'data_lengthoflist': return 'lenL(' + (b.fields.LIST ? b.fields.LIST[0] : '?') + ')';
    case 'data_listcontainsitem': return (b.fields.LIST ? b.fields.LIST[0] : '?') + ' contains ' + ins.ITEM;
    case 'data_setvariableto': return '`' + (b.fields.VARIABLE ? b.fields.VARIABLE[0] : '?') + '` = ' + ins.VALUE;
    case 'data_changevariableby': return '`' + (b.fields.VARIABLE ? b.fields.VARIABLE[0] : '?') + '` += ' + ins.VALUE;
    case 'data_addtolist': return 'add ' + (b.fields.LIST ? b.fields.LIST[0] : '?') + ' <- ' + ins.ITEM;
    case 'data_deleteoflist': return 'del ' + (b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + ins.INDEX + ']';
    case 'data_deletealloflist': return 'clear ' + (b.fields.LIST ? b.fields.LIST[0] : '?');
    case 'data_insertatlist': return 'ins ' + (b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + ins.INDEX + '] <- ' + ins.ITEM;
    case 'data_replaceitemoflist': return 'set ' + (b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + ins.INDEX + '] <- ' + ins.ITEM;
    case 'procedures_call': {
      const args = Object.entries(b.inputs || {}).map(([k, v]) => nm(v)).join(', ');
      return 'CALL ' + b.mutation.proccode + '(' + args + ')';
    }
    case 'argument_reporter_string_number': return 'ARG(' + (b.fields.VALUE ? b.fields.VALUE[0] : '?') + ')';
    case 'argument_reporter_boolean': return 'ARGb(' + (b.fields.VALUE ? b.fields.VALUE[0] : '?') + ')';
    case 'control_stop': return 'STOP(' + (b.fields.STOP_OPTION ? b.fields.STOP_OPTION[0] : '?') + ')';
    default: {
      let s = b.opcode;
      const parts = Object.entries(ins).map(([k, v]) => k + '=' + v);
      if (fld) parts.push(fld);
      return s + (parts.length ? '{' + parts.join(', ') + '}' : '');
    }
  }
}
function walk(id, ind) {
  let guard = 0;
  while (id && guard++ < 500) {
    const b = BL[id];
    if (!b) { console.log(' '.repeat(ind) + '??' + id); return; }
    const pad = ' '.repeat(ind);
    switch (b.opcode) {
      case 'control_if':
        console.log(pad + 'IF ' + expr(b.inputs.CONDITION[1], 0) + ':');
        walk(b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null, ind + 2);
        break;
      case 'control_if_else':
        console.log(pad + 'IF ' + expr(b.inputs.CONDITION[1], 0) + ':');
        walk(b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null, ind + 2);
        console.log(pad + 'ELSE:');
        walk(b.inputs.SUBSTACK2 ? b.inputs.SUBSTACK2[1] : null, ind + 2);
        break;
      case 'control_repeat':
        console.log(pad + 'REPEAT ' + expr(b.inputs.TIMES[1], 0) + ':');
        walk(b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null, ind + 2);
        break;
      case 'control_repeat_until':
        console.log(pad + 'REPEAT_UNTIL ' + expr(b.inputs.CONDITION[1], 0) + ':');
        walk(b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null, ind + 2);
        break;
      case 'control_forever':
        console.log(pad + 'FOREVER:');
        walk(b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null, ind + 2);
        break;
      default:
        console.log(pad + expr(id, 0));
    }
    id = b.next;
    if (id) console.log('');
  }
}
let def = null;
if (want === '#RUN' || want === '#FLAG' || want === '#HALT') {
  const bc = want === '#RUN' ? 'RUN' : want === '#HALT' ? 'HALT' : null;
  def = Object.keys(BL).find((id) => BL[id].topLevel && (bc
    ? BL[id].opcode === 'event_whenbroadcastreceived' && BL[id].fields.BROADCAST_OPTION[0] === bc
    : BL[id].opcode === 'event_whenflagclicked'));
  if (def) { console.log('=== TOP ' + want + ' ==='); walk(BL[def].next, 0); process.exit(0); }
}
for (const id of Object.keys(BL)) {
  const b = BL[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const p = BL[b.inputs.custom_block[1]];
  if (p && p.mutation && p.mutation.proccode === want) { def = id; break; }
}
if (!def) throw new Error('no def: ' + want);
const proto = BL[BL[def].inputs.custom_block[1]];
const argNames = JSON.parse(proto.mutation.argumentnames || '[]');
const argIds = JSON.parse(proto.mutation.argumentids || '[]');
console.log('DEF ' + want + '   args: ' + argNames.map((n, i) => argIds[i] + '=>' + n).join(', '));
walk(BL[def].next, 0);
