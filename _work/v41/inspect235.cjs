// Dump a procedure definition (recursive block tree) from a project.json.
// Usage: node inspect235.cjs <project.json> <proccode> [--depth N]
const fs = require('fs');
const [pj, pc, ...rest] = process.argv.slice(2);
const maxDepth = rest.includes('--depth') ? Number(rest[rest.indexOf('--depth') + 1]) : 6;
const project = JSON.parse(fs.readFileSync(pj, 'utf8'));
const IT = 'Interpreter';
const T = project.targets.find(t => t.name === IT);
const BL = T.blocks;

let defId = null;
for (const [id, b] of Object.entries(BL)) {
  if (b && b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
    const proto = BL[b.inputs.custom_block[1]];
    if (proto && proto.mutation && proto.mutation.proccode === pc) { defId = id; break; }
  }
}
if (!defId) { console.log('NOT FOUND: ' + pc); process.exit(1); }
const def = BL[defId];
const bodyId = def.next;

function val(d, depth) {
  if (d === undefined || d === null) return 'null';
  if (typeof d === 'string') return 'id(' + d + ')';
  return JSON.stringify(d);
}
function dumpExpr(d, depth) {
  if (d === undefined || d === null) return '·';
  if (Array.isArray(d)) {
    if (typeof d[1] === 'string' && BL[d[1]]) return dumpBlock(BL[d[1]], depth + 1, true);
    return JSON.stringify(d);
  }
  return String(d);
}
function dumpBlock(id, depth, inline) {
  const b = BL[id];
  if (!b) return 'MISSING ' + id;
  const pad = '  '.repeat(depth);
  let s = '';
  if (b.opcode === 'procedures_call') {
    s += pad + (inline ? '» ' : '') + 'CALL ' + b.mutation.proccode;
    const argIds = JSON.parse(b.mutation.argumentids || '[]');
    const argNames = JSON.parse(b.mutation.warp || '[]') && (JSON.parse(b.mutation.argumentnames || '[]'));
    if (argIds.length) s += '  args[' + argIds.map(aid => {
      const v = b.inputs[aid];
      if (!v) return 'null';
      if (typeof v[1] === 'string' && BL[v[1]]) return dumpBlock(v[1], depth + 2, true);
      return JSON.stringify(v);
    }).join(', ') + ']';
    return s + '\n';
  }
  s += pad + (inline ? '» ' : '') + b.opcode;
  if (b.fields && Object.keys(b.fields).length) s += ' fields=' + JSON.stringify(b.fields);
  for (const [k, v] of Object.entries(b.inputs || {})) {
    if (k === 'SUBSTACK' || k === 'SUBSTACK2') continue;
    s += ' ' + k + '=' + (typeof v[1] === 'string' && BL[v[1]] ? dumpBlock(v[1], depth + 2, true) : JSON.stringify(v));
  }
  s += '\n';
  if (depth > maxDepth) return s;
  for (const k of ['SUBSTACK', 'SUBSTACK2']) {
    if (b.inputs && b.inputs[k] && typeof b.inputs[k][1] === 'string') {
      s += pad + '  ' + k + ':\n';
      let c = b.inputs[k][1];
      let guard = 0;
      while (c && BL[c] && guard++ < 500) {
        s += dumpBlock(c, depth + 2);
        c = BL[c].next;
      }
    }
  }
  if (b.next && !inline) {
    let c = b.next, guard = 0;
    while (c && BL[c] && guard++ < 500) {
      s += dumpBlock(c, depth);
      c = BL[c].next;
    }
  }
  return s;
}
let out = '';
if (bodyId) {
  let c = bodyId, guard = 0;
  while (c && BL[c] && guard++ < 500) { out += dumpBlock(c, 0); c = BL[c].next; }
} else out = '(empty body)';
console.log(out);
