// print every call site of a procedure with its argument expressions rendered
// node _work/v41/callsites.cjs <project.json> "<proccode>"
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const T = p.targets.find((t) => t.name === 'Interpreter');
const B = T.blocks;
const want = process.argv[3];
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
const owner = (id) => {
  let c = id, d = 0;
  while (c && d++ < 90) {
    const b = B[c];
    if (b && b.opcode === 'procedures_definition') { const q = B[b.inputs.custom_block[1]]; return q.mutation.proccode; }
    c = b && b.parent;
  }
  return '?';
};
const R = (d) => {
  if (d === undefined || d === null) return '?';
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') return JSON.stringify(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return JSON.stringify(d[1][1]);
  if (Array.isArray(d) && d[1] && d[1][0] === 12) return '$' + d[1][1];
  if (Array.isArray(d) && d[1] && d[1][0] === 13) return '@' + d[1][1];
  if (Array.isArray(d) && d[0] === 2) return R([3, d[1]]);
  if (typeof d === 'string' || (Array.isArray(d) && typeof d[1] === 'string')) {
    const id = typeof d === 'string' ? d : d[1];
    const b = B[id];
    if (!b) return 'blk';
    const ar = (k) => R(b.inputs[k]);
    switch (b.opcode) {
      case 'operator_add': return '(' + ar('NUM1') + '+' + ar('NUM2') + ')';
      case 'operator_subtract': return '(' + ar('NUM1') + '-' + ar('NUM2') + ')';
      case 'data_variable': return '$' + b.fields.VARIABLE[0];
      case 'argument_reporter_string_number': return 'ARG:' + b.fields.VALUE[0];
      case 'data_itemoflist': return (b.fields.LIST ? b.fields.LIST[0] : '?') + '[' + ar('INDEX') + ']';
      default: return b.opcode + '{' + Object.keys(b.inputs || {}).map((k) => k + '=' + R(b.inputs[k])).join(',') + '}';
    }
  }
  return '?';
};
let n = 0;
for (const id of Object.keys(B)) {
  const b = B[id];
  if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== want) continue;
  const names = ARGS.get(want) || [];
  const ids = JSON.parse(b.mutation.argumentids || '[]');
  console.log(id + '  in ' + owner(id) + '  ' + ids.map((k, i) => (names[i] || '?') + '=' + R(b.inputs[k])).join(' '));
  n++;
}
console.log('call sites: ' + n);
