// dump the top-level chain of a procedure, with each control_* condition rendered as a compact tree
// node _work/v41/dumpcondtree.cjs <project.json> "<proccode>" [maxRoleDepth]
const fs = require('fs');
const project = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = project.targets.find((t) => t.name === 'Interpreter');
const BL = T.blocks;
const want = process.argv[3];
const depth = Number(process.argv[4] || 2);
function defIdOf(pc) {
  for (const id of Object.keys(BL)) {
    const b = BL[id];
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const p = BL[b.inputs.custom_block[1]];
      if (p && p.mutation && p.mutation.proccode === pc) return id;
    }
  }
  throw new Error('no def ' + pc);
}
const txt = (d) => {
  if (!d) return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return '"' + d[1] + '"';
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return '"' + d[1][1] + '"';
  return null;
};
const varName = (d) => (d && Array.isArray(d[1]) && d[1][0] === 12) ? d[1][1] : null;
const listName = (d) => (d && Array.isArray(d[1]) && d[1][0] === 13) ? d[1][1] : null;
function R(d) {
  if (d === undefined || d === null) return '?';
  const t = txt(d); if (t !== null) return t;
  const v = varName(d); if (v) return '$' + v;
  const l = listName(d); if (l) return '@' + l;
  if (Array.isArray(d) && d[0] === 2) return '[' + R([3, d[1]]) + ']';
  if (typeof d === 'string' || (Array.isArray(d) && typeof d[1] === 'string')) {
    const id = typeof d === 'string' ? d : d[1];
    const b = BL[id];
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
      case 'operator_join': return '(' + ar('STRING1') + ' + ' + ar('STRING2') + ')';
      case 'operator_add': return '(' + ar('NUM1') + ' + ' + ar('NUM2') + ')';
      case 'operator_subtract': return '(' + ar('NUM1') + ' - ' + ar('NUM2') + ')';
      case 'operator_multiply': return '(' + ar('NUM1') + ' * ' + ar('NUM2') + ')';
      case 'operator_mod': return '(' + ar('NUM1') + ' % ' + ar('NUM2') + ')';
      case 'operator_length': return 'len(' + ar('STRING') + ')';
      case 'operator_letter_of': return 'letter(' + ar('LETTER') + ',' + ar('STRING') + ')';
      case 'data_itemoflist': return (b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + ar('INDEX') + ']';
      case 'data_lengthoflist': return 'len@' + (b.fields.LIST ? b.fields.LIST[0] : '?');
      case 'data_listcontainsitem': return '(' + ar('ITEM') + ' in@' + (b.fields.LIST ? b.fields.LIST[0] : '?') + ')';
      case 'data_variable': return '$' + b.fields.VARIABLE[0];
      case 'procedures_call': return 'CALL ' + (b.mutation ? b.mutation.proccode : '?');
      default: return o + '{' + Object.keys(b.inputs || {}).map((k) => k + '=' + R(b.inputs[k])).join(',') + '}';
    }
  }
  return JSON.stringify(d).slice(0, 40);
}
const def = defIdOf(want);
console.log('DEF ' + want);
function chain(id, ind, d) {
  let cur = id, n = 0;
  while (cur && n++ < 3000) {
    const b = BL[cur];
    if (!b) break;
    const c = b.inputs && b.inputs.CONDITION;
    const ctl = ['control_repeat_until', 'control_if', 'control_if_else', 'control_repeat', 'control_while'].includes(b.opcode);
    const extra = ctl ? '  IF ' + R(c) : '';
    const times = b.opcode === 'control_repeat' ? '  x' + R(b.inputs.TIMES) : '';
    const fields = Object.entries(b.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(v[0])).join(',');
    const scal = Object.entries(b.inputs || {}).filter(([k, v]) => k !== 'SUBSTACK' && k !== 'SUBSTACK2' && k !== 'CONDITION').map(([k, v]) => k + '=' + R(v)).join(' ');
    console.log(ind + b.opcode + (fields ? ' {' + fields + '}' : '') + extra + times + (scal ? '  ' + scal : '') + (b.opcode === 'procedures_call' && b.mutation ? ' <' + b.mutation.proccode + '>' : ''));
    if (ctl && d > 0) {
      for (const k of ['SUBSTACK', 'SUBSTACK2']) {
        const s = b.inputs && b.inputs[k];
        if (s && typeof s[1] === 'string') { console.log(ind + ' --' + k + '--'); chain(s[1], ind + '   ', d - 1); }
      }
    }
    cur = b.next;
  }
}
chain(BL[def].next, '', Number(process.argv[4] === undefined ? 1 : process.argv[4]));
