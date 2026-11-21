// linear dump with procedure_call proccodes shown
// node _work/v41/dumpproc3.cjs <project.json> <target> <proccode>
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const TN = process.argv[3], pc = process.argv[4];
const T = p.targets.find((t) => t.name === TN);
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
  if (d === undefined || d === null) return '';
  if (Array.isArray(d) && (d[0] === 4 || d[0] === 10)) return JSON.stringify(d[1]);
  if (Array.isArray(d) && typeof d[1] === 'string') {
    const b = B[d[1]];
    if (!b) return '?' + d[1];
    if (b.opcode === 'procedures_call') return 'CALL ' + b.mutation.proccode;
    const ar = (k) => R(b.inputs[k]);
    switch (b.opcode) {
      case 'operator_add': return '(' + ar('NUM1') + '+' + ar('NUM2') + ')';
      case 'operator_subtract': return '(' + ar('NUM1') + '-' + ar('NUM2') + ')';
      case 'operator_join': return '(' + ar('STRING1') + '&' + ar('STRING2') + ')';
      case 'operator_equals': return '(' + ar('OPERAND1') + '==' + ar('OPERAND2') + ')';
      case 'operator_lt': return '(' + ar('OPERAND1') + '<' + ar('OPERAND2') + ')';
      case 'operator_gt': return '(' + ar('OPERAND1') + '>' + ar('OPERAND2') + ')';
      case 'operator_and': return '(' + ar('OPERAND1') + '&' + ar('OPERAND2') + ')';
      case 'operator_not': return 'not(' + ar('OPERAND') + ')';
      case 'operator_length': return 'len(' + ar('STRING') + ')';
      case 'operator_letter_of': return 'letter[' + ar('LETTER') + ']of(' + ar('STRING') + ')';
      case 'operator_mathop': return b.fields.OPERATOR[0] + '(' + ar('NUM') + ')';
      case 'data_variable': return '$' + b.fields.VARIABLE[0];
      case 'data_itemoflist': return b.fields.LIST[0] + '[' + ar('INDEX') + ']';
      case 'data_lengthoflist': return 'len(' + b.fields.LIST[0] + ')';
      case 'data_setvariableto': return 'set ' + b.fields.VARIABLE[0] + '=' + ar('VALUE');
      case 'data_changevariableby': return b.fields.VARIABLE[0] + '+=' + ar('VALUE');
      case 'data_replaceitemoflist': return b.fields.LIST[0] + '[' + ar('INDEX') + ']=' + ar('ITEM');
      case 'data_addtolist': return 'add(' + b.fields.LIST[0] + ',' + ar('ITEM') + ')';
      case 'data_deleteoflist': return 'del(' + b.fields.LIST[0] + ',' + ar('INDEX') + ')';
      case 'data_deletealloflist': return 'clear(' + b.fields.LIST[0] + ')';
      case 'data_insertatlist': return 'insert(' + b.fields.LIST[0] + ',' + ar('INDEX') + ',' + ar('ITEM') + ')';
      case 'sensing_timer': return 'timer';
      case 'sensing_mousedown': return 'mouseDown';
      case 'sensing_mousex': return 'mouseX';
      case 'sensing_mousey': return 'mouseY';
      case 'sensing_keypressed': return 'key(' + ar('KEY_OPTION') + ')';
      default: return b.opcode + '(' + Object.entries(b.inputs || {}).map(([k, v]) => k + '=' + R(v)).join(',') + ')';
    }
  }
  if (Array.isArray(d) && d[0] === 2) return R(d[1]);
  if (Array.isArray(d) && d[0] === 3) return R(d[1]);
  return '';
};
const out = [];
const walk = (id, ind) => {
  let cur = id;
  while (cur) {
    const b = B[cur];
    if (!b) break;
    const body = b.opcode === 'procedures_call' ? 'CALL ' + b.mutation.proccode + '(' + Object.values(b.inputs || {}).map(R).join(',') + ')'
      : Object.keys(b.inputs || {}).filter((k) => !k.startsWith('SUBSTACK')).map((k) => k + '=' + R(b.inputs[k])).join('  ');
    out.push('  '.repeat(ind) + b.opcode + '  ' + JSON.stringify(b.fields || {}).replace(/\{[^}]*"([^"]*)"[^}]*\}/, '$1').slice(0, 40) + '  ' + body);
    for (const slot of ['SUBSTACK', 'SUBSTACK2']) {
      const v = b.inputs && b.inputs[slot];
      if (v && typeof v[1] === 'string') { out.push('  '.repeat(ind) + slot + ' ↓'); walk(v[1], ind + 1); }
    }
    cur = b.next;
  }
};
walk(B[def].next, 0);
console.log(out.join('\n'));
