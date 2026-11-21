'use strict';
const fs = require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const e = zipRead(process.argv[2]);
const pj = JSON.parse(e.find((x) => x.name === 'project.json').data.toString('utf8'));
const target = pj.targets.find((t) => t.name === process.argv[3]);
const blocks = target.blocks;
const field = (b, k) => (b.fields && b.fields[k]) ? b.fields[k][0] : undefined;
const proccodeOf = (b) => {
  const cb = (b.inputs || {}).custom_block;
  if (!cb) return '?';
  const sh = blocks[cb[1]];
  if (!sh) return '?';
  return (sh.fields && sh.fields.proccode) ? sh.fields.proccode[0] : (String(sh.mutation && sh.mutation.proccode || '?'));
};
const printScript = (id, depth, maxDepth, out) => {
  let cur = id, guard = 0;
  while (cur && guard++ < 400) {
    const b = blocks[cur];
    if (!b) break;
    const f = [];
    for (const k of ['VARIABLE','LIST','BROADCAST_OPTION','KEY_OPTION','STOP_OPTION','OPERATOR','NUMBER_NAME','COSTUME','CLONE_OPTION','TOUCHINGOBJECTMENU','PROPERTY']) {
      const v = field(b, k); if (v !== undefined) f.push(k + '=' + JSON.stringify(v));
    }
    const ins = [];
    for (const [k, v] of Object.entries(b.inputs || {})) {
      let lit;
      if (Array.isArray(v[1])) lit = JSON.stringify(v[1][1]);
      else if (typeof v[1] === 'string') lit = '(block:' + (blocks[v[1]] ? blocks[v[1]].opcode : v[1]) + ')';
      if (lit !== undefined) ins.push(k + '=' + lit);
    }
    out.push('  '.repeat(depth) + b.opcode + (f.length ? ' {' + f.join(', ') + '}' : '') + (ins.length ? ' (' + ins.join(', ') + ')' : ''));
    if (b.inputs && b.inputs.SUBSTACK && b.inputs.SUBSTACK[1] && depth < maxDepth)
      printScript(b.inputs.SUBSTACK[1], depth + 1, maxDepth, out);
    if (b.inputs && b.inputs.SUBSTACK2 && b.inputs.SUBSTACK2[1] && depth < maxDepth)
      printScript(b.inputs.SUBSTACK2[1], depth + 1, maxDepth, out);
    cur = b.next;
  }
};
const want = process.argv[4];
for (const [id, b] of Object.entries(blocks)) {
  if (!b.topLevel) continue;
  let head = b.opcode;
  if (b.opcode === 'procedures_definition') head = 'PROC ' + proccodeOf(b);
  else if (field(b, 'KEY_OPTION')) head += ' [' + field(b, 'KEY_OPTION') + ']';
  else if (field(b, 'BROADCAST_OPTION')) head += ' (' + field(b, 'BROADCAST_OPTION') + ')';
  if (want && head.indexOf(want) < 0 && !(want === 'PROC' && head.indexOf('PROC ') === 0)) continue;
  console.log('==== ' + head + '  id=' + id);
  const out = [];
  printScript(b.opcode === 'procedures_definition' ? b.next : id, 0, 3, out);
  console.log(out.join('\n'));
}
