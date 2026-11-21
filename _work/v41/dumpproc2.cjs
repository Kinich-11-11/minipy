// linear pseudo-code dump of any proc in any target (follows next + substacks)
// node _work/v41/dumpproc2.cjs <project.json> <target> <proccode>
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const TN = process.argv[3], pc = process.argv[4];
const T = p.targets.find((t) => t.name === TN);
if (!T) throw new Error('no target ' + TN);
const B = T.blocks;
let def = null;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const q = B[b.inputs.custom_block[1]];
  if (q && q.mutation && q.mutation.proccode === pc) { def = id; break; }
}
if (!def) throw new Error('no def ' + pc);
const R = (d) => {
  if (d === undefined || d === null) return '<none>';
  if (Array.isArray(d) && (d[0] === 4 || d[0] === 10 || d[0] === 9)) return (d[0] === 4 ? String(d[1]) : JSON.stringify(d[1]));
  if (Array.isArray(d) && typeof d[1] === 'string') {
    const b = B[d[1]];
    if (!b) return '?' + d[1];
    const ar = (k) => R(b.inputs[k]);
    switch (b.opcode) {
      case 'operator_add': return '(' + ar('NUM1') + '+' + ar('NUM2') + ')';
      case 'operator_subtract': return '(' + ar('NUM1') + '-' + ar('NUM2') + ')';
      case 'operator_multiply': return '(' + ar('NUM1') + '*' + ar('NUM2') + ')';
      case 'operator_divide': return '(' + ar('NUM1') + '/' + ar('NUM2') + ')';
      case 'operator_mod': return '(' + ar('NUM1') + '%' + ar('NUM2') + ')';
      case 'operator_mathop': return b.fields.OPERATOR[0] + '(' + ar('NUM') + ')';
      case 'operator_join': return '(' + ar('STRING1') + '&' + ar('STRING2') + ')';
      case 'operator_equals': return '(' + ar('OPERAND1') + '==' + ar('OPERAND2') + ')';
      case 'operator_lt': return '(' + ar('OPERAND1') + '<' + ar('OPERAND2') + ')';
      case 'operator_gt': return '(' + ar('OPERAND1') + '>' + ar('OPERAND2') + ')';
      case 'operator_and': return '(' + ar('OPERAND1') + ' and ' + ar('OPERAND2') + ')';
      case 'operator_or': return '(' + ar('OPERAND1') + ' or ' + ar('OPERAND2') + ')';
      case 'operator_not': return 'not(' + ar('OPERAND') + ')';
      case 'data_variable': return '$' + b.fields.VARIABLE[0];
      case 'argument_reporter_string_number': return 'arg:' + b.fields.VALUE[0];
      case 'data_itemoflist': return b.fields.LIST[0] + '[' + ar('INDEX') + ']';
      case 'data_lengthoflist': return 'len(' + b.fields.LIST[0] + ')';
      case 'data_replaceitemoflist': return b.fields.LIST[0] + '[' + ar('INDEX') + '] = ' + ar('ITEM');
      case 'data_setvariableto': return 'set ' + b.fields.VARIABLE[0] + ' = ' + ar('VALUE');
      case 'data_changevariableby': return b.fields.VARIABLE[0] + ' += ' + ar('VALUE');
      case 'procedures_call': return 'CALL ' + b.mutation.proccode + '(' + Object.values(b.inputs).map(R).join(', ') + ')';
      case 'motion_gotoxy': return 'goto(' + ar('X') + ', ' + ar('Y') + ')';
      case 'pen_setPenSizeTo': return 'pensize(' + ar('SIZE') + ')';
      case 'sensing_keypressed': return 'key(' + ar('KEY_OPTION') + ')';
      case 'looks_switchcostumeto': return 'costume(' + ar('COSTUME') + ')';
      default: return b.opcode + '(' + Object.entries(b.inputs || {}).map(([k, v]) => k + '=' + R(v)).join(', ') + ')';
    }
  }
  if (Array.isArray(d) && d[0] === 2) return '[' + (d[1] === null ? '' : R(d[1])) + ']';
  if (Array.isArray(d) && d[0] === 3) return R(d[1]);
  return JSON.stringify(d);
};
const out = [];
const walk = (id, ind) => {
  let cur = id;
  while (cur) {
    const b = B[cur];
    if (!b) break;
    out.push('  '.repeat(ind) + b.opcode + '  ' + JSON.stringify(b.fields || {}) + (Object.keys(b.inputs || {}).length ? '  ' + R([3, cur]) : ''));
    for (const slot of Object.keys(b.inputs || {}).filter((k) => k.startsWith('SUBSTACK'))) {
      const v = b.inputs[slot];
      if (v && typeof v[1] === 'string') { out.push('  '.repeat(ind) + slot + ':'); walk(v[1], ind + 1); }
    }
    cur = b.next;
  }
};
walk(B[def].next, 0);
console.log(out.join('\n'));
