// dump the structure of a procedure: node _work/v41/dumpproc.cjs <decomp-project.json> "<proccode>"
const fs = require('fs');
const project = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const want = process.argv[3];
const maxDepth = Number(process.argv[4] || 4);
const T = project.targets.find((t) => t.name === 'Interpreter');
const BL = T.blocks;
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
const lit = (d) => {
  if (!d) return null;
  if (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] !== 'object') return JSON.stringify(d[1]);
  if (Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) return JSON.stringify(d[1][1]);
  return null;
};
const desc = (d) => {
  if (d === undefined || d === null) return '?';
  if (typeof d === 'string') return 'blk:' + d;
  if (Array.isArray(d)) {
    const l = lit(d);
    if (l !== null) return 'lit' + l;
    if (d[0] === 2) return 'BOOL(' + d[1] + ')';
    if (d[0] === 3) {
      const v = d[1];
      if (Array.isArray(v) && v[0] === 12) return 'var:' + v[1];
      if (Array.isArray(v) && v[0] === 13) return 'list:' + v[1];
      return 'blk:' + v;
    }
    return JSON.stringify(d).slice(0, 60);
  }
  return String(d);
};
function walk(id, depth) {
  const seen = new Set();
  const stack = [[id, depth]];
  while (stack.length) {
    const [cur, d] = stack.pop();
    if (typeof cur !== 'string' || seen.has(cur + ':' + d)) continue;
    seen.add(cur + ':' + d);
    const b = BL[cur];
    if (!b) { console.log(' '.repeat(d * 2) + cur + ' <missing>'); continue; }
    const f = Object.entries(b.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(v[0])).join(',');
    const ins = Object.entries(b.inputs || {}).map(([k, v]) => k + '=' + desc(v)).join(' ');
    console.log(' '.repeat(d * 2) + (b.opcode === 'procedures_call' && b.mutation ? 'CALL ' + b.mutation.proccode : b.opcode) + (f ? ' {' + f + '}' : '') + (ins ? ' [' + ins + ']' : ''));
    if (b.next) stack.push([b.next, d]);
    if (b.opcode === 'control_repeat_until' || b.opcode === 'control_repeat' || b.opcode === 'control_if' || b.opcode === 'control_if_else') {
      if (d + 1 > maxDepth) continue;
      for (const [k, v] of Object.entries(b.inputs)) {
        if (v && typeof v[1] === 'string' && (k === 'SUBSTACK' || k === 'SUBSTACK2')) stack.push([v[1], d + 1]);
      }
    }
  }
}
const def = defIdOf(want);
console.log('DEF ' + want + ' -> ' + def);
// print the definition's chain, descending into substacks level by level
function dump(id, d) {
  let cur = id;
  let guard = 0;
  while (cur && guard++ < 4000) {
    const b = BL[cur];
    if (!b) break;
    const f = Object.entries(b.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(v[0])).join(',');
    const ins = Object.entries(b.inputs || {}).map(([k, v]) => k + '=' + desc(v)).join(' ');
    console.log(' '.repeat(d * 2) + cur + ' ' + (b.opcode === 'procedures_call' && b.mutation ? 'CALL ' + b.mutation.proccode : b.opcode) + (f ? ' {' + f + '}' : '') + (ins ? ' [' + ins + ']' : ''));
    if (d + 1 <= maxDepth) {
      for (const k of ['SUBSTACK', 'SUBSTACK2']) {
        const v = b.inputs && b.inputs[k];
        if (v && typeof v[1] === 'string') { console.log(' '.repeat(d * 2 + 1) + '--' + k + '--'); dump(v[1], d + 1); }
      }
    }
    cur = b.next;
  }
}
dump(BL[def].next, 0);
