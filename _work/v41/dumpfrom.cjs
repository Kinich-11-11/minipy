// dump one statement chain starting at a given block id: node _work/v41/dumpfrom.cjs <project.json> <blockId> [depth]
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const start = process.argv[3];
const maxDepth = Number(process.argv[4] || 3);
// proccode -> ordered parameter names (from each definition's prototype)
const ARGS = new Map();
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
  const proto = B[b.inputs.custom_block[1]];
  if (!proto) continue;
  const names = [];
  for (const v of Object.values(proto.inputs || {})) {
    const rep = (v && typeof v[1] === 'string') ? B[v[1]] : null;
    names.push(rep && rep.fields && rep.fields.VALUE ? rep.fields.VALUE[0] : '?');
  }
  ARGS.set(proto.mutation.proccode, names);
}
const callArgs = (b) => {
  const names = ARGS.get(b.mutation.proccode) || [];
  const ids = JSON.parse(b.mutation.argumentids || '[]');
  return ids.map((k, i) => (names[i] || '?') + '=' + R(b.inputs[k])).join(' ');
};
const chOf = (d) => {
  if (!d || typeof d !== 'object') return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') return String(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return String(d[1][1]);
  return null;
};
function R(d) {
  if (d === undefined || d === null) return '?';
  const t = chOf(d); if (t !== null) return JSON.stringify(t);
  if (Array.isArray(d) && d[1] && d[1][0] === 12) return '$' + d[1][1];
  if (Array.isArray(d) && d[1] && d[1][0] === 13) return '@' + d[1][1];
  if (Array.isArray(d) && d[0] === 2) return '[' + R([3, d[1]]) + ']';
  if (typeof d === 'string' || (Array.isArray(d) && typeof d[1] === 'string')) {
    const id = typeof d === 'string' ? d : d[1];
    const b = B[id];
    if (!b) return 'blk:' + id;
    const o = b.opcode;
    const ar = (k) => R(b.inputs[k]);
    switch (o) {
      case 'operator_equals': return '(' + ar('OPERAND1') + ' == ' + ar('OPERAND2') + ')';
      case 'operator_lt': return '(' + ar('OPERAND1') + ' < ' + ar('OPERAND2') + ')';
      case 'operator_gt': return '(' + ar('OPERAND1') + ' > ' + ar('OPERAND2') + ')';
      case 'operator_and': return '(' + ar('OPERAND1') + ' and ' + ar('OPERAND2') + ')';
      case 'operator_or': return '(' + ar('OPERAND1') + ' or ' + ar('OPERAND2') + ')';
      case 'operator_not': return '!' + ar('OPERAND');
      case 'operator_contains': return '(' + ar('STRING1') + ' in ' + ar('STRING2') + ')';
      case 'operator_join': return '(' + ar('STRING1') + '+' + ar('STRING2') + ')';
      case 'operator_add': return '(' + ar('NUM1') + '+' + ar('NUM2') + ')';
      case 'operator_subtract': return '(' + ar('NUM1') + '-' + ar('NUM2') + ')';
      case 'operator_multiply': return '(' + ar('NUM1') + '*' + ar('NUM2') + ')';
      case 'operator_divide': return '(' + ar('NUM1') + '/' + ar('NUM2') + ')';
      case 'operator_mod': return '(' + ar('NUM1') + '%' + ar('NUM2') + ')';
      case 'operator_mathop': return (b.fields.OPERATOR ? b.fields.OPERATOR[0] : '?') + '(' + ar('NUM') + ')';
      case 'operator_letter_of': return 'letter(' + ar('LETTER') + ',' + ar('STRING') + ')';
      case 'operator_length': return 'len(' + ar('STRING') + ')';
      case 'data_itemoflist': return (b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + ar('INDEX') + ']';
      case 'data_lengthoflist': return 'len@' + (b.fields.LIST ? b.fields.LIST[0] : '?');
      case 'data_variable': return '$' + b.fields.VARIABLE[0];
      case 'argument_reporter_string_number': return 'ARG:' + (b.fields.VALUE ? b.fields.VALUE[0] : '?');
      case 'data_listcontents': return 'contents@' + (b.fields.LIST ? b.fields.LIST[0] : '?');
      case 'procedures_call': return 'CALL ' + (b.mutation ? b.mutation.proccode : '?') + ' {' + callArgs(b) + '}';
      default: return o + '{' + Object.keys(b.inputs || {}).map((k) => k + '=' + R(b.inputs[k])).join(',') + '}';
    }
  }
  return JSON.stringify(d).slice(0, 40);
}
function chain(id, ind, d) {
  let cur = id, n = 0;
  while (cur && n++ < 400) {
    const b = B[cur];
    if (!b) break;
    const ctl = !!b.inputs.CONDITION;
    const extra = ctl ? '  IF ' + R(b.inputs.CONDITION) : '';
    const times = b.opcode === 'control_repeat' ? '  x' + R(b.inputs.TIMES) : '';
    const scal = Object.entries(b.inputs || {}).filter(([k]) => k !== 'SUBSTACK' && k !== 'SUBSTACK2' && k !== 'CONDITION').map(([k, v]) => k + '=' + R(v)).join(' ');
    const f = Object.entries(b.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(v[0])).join(',');
    console.log(ind + cur + ' ' + b.opcode + (f ? ' {' + f + '}' : '') + extra + times + (scal ? '  ' + scal : ''));
    if (ctl && d > 0) {
      for (const k of ['SUBSTACK', 'SUBSTACK2']) {
        const s = b.inputs[k];
        if (s && typeof s[1] === 'string') { console.log(ind + ' --' + k + '--'); chain(s[1], ind + '   ', d - 1); }
      }
    }
    cur = b.next;
  }
}
chain(start, '', maxDepth);
