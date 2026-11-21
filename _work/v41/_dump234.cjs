// Dump a procedure (or several) as readable pseudocode.
//   node _dump_proc.cjs "callmeth %s %s %s %s" [maxdepth]
const p = require('./project234.json');
const it = p.targets.find(t => t.name === 'Interpreter');
const BL = it.blocks;

const defs = {}; // proccode -> defId
for (const [id, b] of Object.entries(BL)) {
  if (b.opcode === 'procedures_definition' && b.inputs.custom_block) {
    const proto = BL[b.inputs.custom_block[1]];
    if (proto && proto.mutation) defs[proto.mutation.proccode] = id;
  }
}
const wanted = process.argv.slice(2);
let maxd = 100;
const out = [];
const procNames = {}; // proccode -> [argnames]
for (const [id, b] of Object.entries(BL)) {
  if (b.opcode === 'procedures_prototype' && b.mutation) {
    procNames[b.mutation.proccode] = JSON.parse(b.mutation.argumentnames || '[]');
  }
}
function argsOf(callId) {
  const b = BL[callId];
  const mut = b.mutation;
  if (!mut) return '?';
  const names = procNames[mut.proccode] || JSON.parse(mut.argumentnames || '[]');
  const ids = JSON.parse(mut.argumentids || '[]');
  return names.map((n, i) => {
    const v = b.inputs[ids[i]];
    if (!v) return n + '=?';
    if (typeof v[1] === 'string' && BL[v[1]]) return n + '=' + expr(v[1]);
    if (Array.isArray(v[1])) return n + '=' + JSON.stringify(v[1]);
    if (typeof v[1] === 'string') return n + '="' + v[1] + '"';
    return n + '=?';
  }).join(', ');
}
function expr(id, d) {
  if (d > 40) return '…';
  const b = BL[id];
  if (!b) return '?' + id;
  const sub = (slot) => {
    const v = b.inputs[slot];
    if (!v) return null;
    if (typeof v[1] === 'string') return BL[v[1]] ? expr(v[1], d + 1) : v[1];
    return v[1] !== undefined && typeof v[1] !== 'string' ? JSON.stringify(v[1]) : String(v[1]);
  };
  switch (b.opcode) {
    case 'operator_add': return `(${sub('NUM1')} + ${sub('NUM2')})`;
    case 'operator_subtract': return `(${sub('NUM1')} - ${sub('NUM2')})`;
    case 'operator_multiply': return `(${sub('NUM1')} * ${sub('NUM2')})`;
    case 'operator_divide': return `(${sub('NUM1')} / ${sub('NUM2')})`;
    case 'operator_mod': return `(${sub('NUM1')} % ${sub('NUM2')})`;
    case 'operator_equals': return `(${sub('OPERAND1')} == ${sub('OPERAND2')})`;
    case 'operator_lt': return `(${sub('OPERAND1')} < ${sub('OPERAND2')})`;
    case 'operator_gt': return `(${sub('OPERAND1')} > ${sub('OPERAND2')})`;
    case 'operator_and': return `(${sub('OPERAND1')} and ${sub('OPERAND2')})`;
    case 'operator_or': return `(${sub('OPERAND1')} or ${sub('OPERAND2')})`;
    case 'operator_not': return `(not ${sub('OPERAND')})`;
    case 'operator_join': return `join(${sub('STRING1')}, ${sub('STRING2')})`;
    case 'operator_length': return `len(${sub('STRING')})`;
    case 'operator_letter_of': return `letterOf(${sub('LETTER')}, ${sub('STRING')})`;
    case 'operator_round': return `round(${sub('NUM')})`;
    case 'operator_mathop': return `${b.fields.OPERATOR[0]}(${sub('NUM')})`;
    case 'data_variable': return b.fields.VARIABLE[0];
    case 'data_itemoflist': return `${b.fields.LIST[0]}[${sub('INDEX')}]`;
    case 'data_lengthoflist': return `len(${b.fields.LIST[0]})`;
    case 'data_addtolist': return `add(${b.fields.LIST[0]}, ${sub('ITEM')})`;
    case 'data_deletealloflist': return `clear(${b.fields.LIST[0]})`;
    case 'data_setvariableto': return `set ${b.fields.VARIABLE[0]} = ${sub('VALUE')}`;
    case 'data_changevariableby': return `chg ${b.fields.VARIABLE[0]} += ${sub('VALUE')}`;
    case 'argument_reporter_string_number': return `arg:${b.fields.VALUE[0]}`;
    case 'argument_reporter_boolean': return `argb:${b.fields.VALUE[0]}`;
    case 'procedures_call': return `call ${b.mutation.proccode}(${argsOf(id)})`;
    case 'control_if': return null; // handled in stmt
    default: return `<${b.opcode}${b.fields ? ' ' + JSON.stringify(b.fields) : ''}>`;
  }
}
function cond(id, d) {
  const e = expr(id, d);
  return e === null ? '<if?>' : e;
}
function stmt(id, d, prefix) {
  if (d > maxd) { out.push(prefix + '…'); return; }
  let cur = id;
  let guard = 0;
  while (cur && guard++ < 500) {
    const b = BL[cur];
    if (!b) break;
    switch (b.opcode) {
      case 'control_if': {
        out.push(`${prefix}if ${cond(b.inputs.CONDITION[1], d)}:`);
        stmt(b.inputs.SUBSTACK && b.inputs.SUBSTACK[1], d + 1, prefix + '  ');
        cur = b.next; continue;
      }
      case 'control_if_else': {
        out.push(`${prefix}if ${cond(b.inputs.CONDITION[1], d)}:`);
        stmt(b.inputs.SUBSTACK && b.inputs.SUBSTACK[1], d + 1, prefix + '  ');
        out.push(`${prefix}else:`);
        stmt(b.inputs.SUBSTACK2 && b.inputs.SUBSTACK2[1], d + 1, prefix + '  ');
        cur = b.next; continue;
      }
      case 'control_repeat': {
        out.push(`${prefix}repeat ${expr(b.inputs.TIMES[1], d)}:`);
        stmt(b.inputs.SUBSTACK && b.inputs.SUBSTACK[1], d + 1, prefix + '  ');
        cur = b.next; continue;
      }
      case 'control_repeat_until': {
        out.push(`${prefix}until ${cond(b.inputs.CONDITION[1], d)}:`);
        stmt(b.inputs.SUBSTACK && b.inputs.SUBSTACK[1], d + 1, prefix + '  ');
        cur = b.next; continue;
      }
      case 'control_forever': {
        out.push(`${prefix}forever:`);
        stmt(b.inputs.SUBSTACK && b.inputs.SUBSTACK[1], d + 1, prefix + '  ');
        cur = b.next; continue;
      }
      case 'procedures_definition': {
        cur = b.next; continue;
      }
      default: {
        const e = expr(cur, d);
        out.push(prefix + (e === null ? `<${b.opcode}>` : e));
        cur = b.next;
      }
    }
  }
}
for (const w of wanted) {
  if (w === '-maxd') { continue; }
}
const args = wanted.filter(x => !/^\d+$/.test(x));
const dArg = wanted.find(x => /^\d+$/.test(x));
if (dArg) maxd = parseInt(dArg);
for (const w of args) {
  const defId = defs[w];
  if (!defId) { out.push('!! not found: ' + w); continue; }
  out.push(`===== def ${w}`);
  stmt(BL[defId].next, 0, '');
}
console.log(out.join('\n'));
