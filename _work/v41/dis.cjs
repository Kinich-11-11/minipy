// dis.cjs <project.json> <proccode> [maxLines]
// Linear pseudocode dump of one MiniPy procedure: resolved variable names, argument
// names, nested CALL proccodes and full expression trees.
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const pc = process.argv[3];
const maxLines = Number(process.argv[4] || 0) || 1e9;
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
let def = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
    const q = B[b.inputs.custom_block[1]];
    if (q && q.mutation && q.mutation.proccode === pc) { def = id; break; }
  }
}
if (!def) throw new Error('no def ' + pc);

// proccode + argumentid -> argument name, so CALL sites read as name=value
const ARGNAME = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  if (!q || !q.mutation) continue;
  let ids = [], names = [];
  try { ids = JSON.parse(q.mutation.argumentids || '[]'); names = JSON.parse(q.mutation.argumentnames || '[]'); } catch (e) { }
  for (let i = 0; i < ids.length; i++) ARGNAME.set(q.mutation.proccode + '|' + ids[i], names[i] || '?');
}

function R(d, depth) {
  if (d === undefined || d === null) return '';
  if (typeof d === 'string') return renderBlock(d, depth);
  if (!Array.isArray(d)) return JSON.stringify(d).slice(0, 40);
  switch (d[0]) {
    case 4: case 10: return JSON.stringify(d[1]);
    case 12: return '$' + d[1];
    case 13: return '#' + d[1];
    case 11: return 'bcast:' + d[1];
    case 1: case 2: case 3: return R(d[1], depth);
    default: return JSON.stringify(d).slice(0, 40);
  }
}
function renderBlock(id, depth) {
  const b = B[id];
  if (!b) return '?' + id;
  if (depth > 14) return '…';
  const ar = (k) => R(b.inputs && b.inputs[k], depth + 1);
  const it = (k) => (b.inputs && typeof b.inputs[k] === 'string') ? b.inputs[k] : (b.inputs && b.inputs[k] ? b.inputs[k][1] : null);
  if (b.opcode === 'procedures_call') {
    const pk = b.mutation.proccode;
    return 'CALL ' + pk.replace(/%s/g, '~') + '(' + Object.entries(b.inputs || {})
      .map(([k, v]) => (ARGNAME.get(pk + '|' + k) || k) + '=' + R(v, depth + 1)).join(', ') + ')';
  }
  switch (b.opcode) {
    case 'argument_reporter_string_number': return b.fields.VALUE[0];
    case 'data_variable': return '$' + b.fields.VARIABLE[0];
    case 'operator_add': return '(' + ar('NUM1') + '+' + ar('NUM2') + ')';
    case 'operator_subtract': return '(' + ar('NUM1') + '-' + ar('NUM2') + ')';
    case 'operator_multiply': return '(' + ar('NUM1') + '*' + ar('NUM2') + ')';
    case 'operator_divide': return '(' + ar('NUM1') + '/' + ar('NUM2') + ')';
    case 'operator_mod': return '(' + ar('NUM1') + '%' + ar('NUM2') + ')';
    case 'operator_round': return 'round(' + ar('NUM') + ')';
    case 'operator_join': return '(' + ar('STRING1') + '&' + ar('STRING2') + ')';
    case 'operator_equals': return '(' + ar('OPERAND1') + '==' + ar('OPERAND2') + ')';
    case 'operator_lt': return '(' + ar('OPERAND1') + '<' + ar('OPERAND2') + ')';
    case 'operator_gt': return '(' + ar('OPERAND1') + '>' + ar('OPERAND2') + ')';
    case 'operator_and': return '(' + ar('OPERAND1') + ' AND ' + ar('OPERAND2') + ')';
    case 'operator_or': return '(' + ar('OPERAND1') + ' OR ' + ar('OPERAND2') + ')';
    case 'operator_not': return 'NOT(' + ar('OPERAND') + ')';
    case 'operator_length': return 'len(' + ar('STRING') + ')';
    case 'operator_letter_of': return 'letter(' + ar('LETTER') + ',' + ar('STRING') + ')';
    case 'operator_contains': return 'contains(' + ar('STRING1') + ',' + ar('STRING2') + ')';
    case 'operator_mathop': return b.fields.OPERATOR[0] + '(' + ar('NUM') + ')';
    case 'data_itemoflist': return b.fields.LIST[0] + '[' + ar('INDEX') + ']';
    case 'data_lengthoflist': return 'len(' + b.fields.LIST[0] + ')';
    case 'data_itemnumoflist': return 'numof(' + b.fields.LIST[0] + ',' + ar('ITEM') + ')';
    case 'data_listcontainsitem': return '(' + ar('ITEM') + ' in ' + b.fields.LIST[0] + ')';
    case 'data_setvariableto': return 'set $' + b.fields.VARIABLE[0] + '=' + ar('VALUE');
    case 'data_changevariableby': return '$' + b.fields.VARIABLE[0] + ' += ' + ar('VALUE');
    case 'data_replaceitemoflist': return b.fields.LIST[0] + '[' + ar('INDEX') + ']=' + ar('ITEM');
    case 'data_addtolist': return 'add(' + b.fields.LIST[0] + ',' + ar('ITEM') + ')';
    case 'data_deleteoflist': return 'del(' + b.fields.LIST[0] + ',' + ar('INDEX') + ')';
    case 'data_deletealloflist': return 'clear(' + b.fields.LIST[0] + ')';
    case 'data_insertatlist': return 'insert(' + b.fields.LIST[0] + ',' + ar('INDEX') + ',' + ar('ITEM') + ')';
    case 'control_stop': return 'STOP(' + b.fields.STOP_OPTION[0] + ')';
    default:
      return b.opcode.replace(/^operator_|^data_|^control_|^procedures_|^sensing_/, '') + '('
        + Object.entries(b.inputs || {}).map(([k, v]) => k + '=' + R(v, depth + 1)).join(', ')
        + Object.entries(b.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(v[0])).join(',') + ')';
  }
}
const out = [];
function walk(id, ind) {
  let cur = id;
  while (cur) {
    const b = B[cur];
    if (!b) break;
    const fld = Object.entries(b.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(Array.isArray(v) ? v[0] : v)).join(' ');
    let ins;
    if (b.opcode === 'procedures_call') {
      const pk = b.mutation.proccode;
      ins = Object.entries(b.inputs || {}).map(([k, v]) => (ARGNAME.get(pk + '|' + k) || k) + '=' + R(v, 0)).join(', ');
      out.push('  '.repeat(ind) + 'CALL ' + pk.replace(/%s/g, '~') + '(' + ins + ')');
    } else {
      ins = Object.keys(b.inputs || {}).filter((k) => !k.startsWith('SUBSTACK') && k !== 'custom_block')
        .map((k) => k + '=' + R(b.inputs[k], 0)).join('   ');
      out.push('  '.repeat(ind) + b.opcode.padEnd(26) + ' ' + (fld + ' ' + ins).trim());
    }
    for (const slot of ['SUBSTACK', 'SUBSTACK2']) {
      const v = b.inputs && b.inputs[slot];
      if (v && typeof v[1] === 'string') { out.push('  '.repeat(ind) + slot + ':'); walk(v[1], ind + 1); }
    }
    if (out.length > maxLines) { out.push('… truncated'); return; }
    cur = b.next;
  }
}
walk(B[def].next, 0);
console.log(out.slice(0, maxLines).join('\n'));
