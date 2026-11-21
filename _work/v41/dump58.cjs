'use strict';
// dump a target's blocks in a readable pseudo-code tree
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const sb3 = process.argv[2], targetPat = process.argv[3], procPat = process.argv[4];
const entries = zipRead(sb3);
const j = JSON.parse(entries.find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
const t = j.targets.find(x => new RegExp(targetPat, 'i').test(x.name));
const B = t.blocks;
const varName = (id) => { for (const [vid, v] of Object.entries(t.variables || {})) if (vid === id) return v[0]; for (const tt of j.targets) for (const [vid, v] of Object.entries(tt.variables || {})) if (vid === id) return v[0] + '@' + tt.name; return id; };
const listName = (id) => { for (const [vid, v] of Object.entries(t.lists || {})) if (vid === id) return v[0]; for (const tt of j.targets) for (const [vid, v] of Object.entries(tt.lists || {})) if (vid === id) return v[0] + '@' + tt.name; return id; };
const brief = (d, depth) => {
  if (d === null || d === undefined) return String(d);
  if (typeof d === 'string') { const b = B[d]; return b ? '(' + b.opcode + '#' + d + ')' : '#' + d; }
  if (Array.isArray(d)) {
    const kind = d[0];
    const body = d[1];
    if (kind === 12 || kind === 13) { const b = B[body]; return b ? '{' + b.opcode + '#' + body + '}' : '{#' + body + '}'; }
    if (typeof body === 'string' && B[body]) return '{' + B[body].opcode + '#' + body + '}';
    return JSON.stringify(d);
  }
  return JSON.stringify(d);
};
const dump = (id, depth, out) => {
  let cur = id;
  while (cur) {
    const b = B[cur]; if (!b) break;
    const pad = '  '.repeat(depth);
    const f = Object.entries(b.fields || {}).map(([k, v]) => k + '=' + JSON.stringify(v)).join(' ');
    const inp = Object.entries(b.inputs || {}).map(([k, v]) => k + ':' + brief(v, depth)).join(' ');
    out.push(pad + cur + ' ' + b.opcode + ' ' + (f ? '[' + f + '] ' : '') + (inp ? '{' + inp + '}' : ''));
    for (const [k, v] of Object.entries(b.inputs || {})) {
      const sub = (Array.isArray(v) && v[0] === 2 && typeof v[1] === 'string') ? v[1] : null;
      if (sub) dump(sub, depth + 1, out);
    }
    cur = b.next;
  }
  return out;
};
const defs = Object.entries(B).filter(([id, b]) => b.opcode === 'procedures_definition');
for (const [id, b] of defs) {
  const proto = B[b.inputs.custom_block[1]];
  const pc = proto.mutation.proccode;
  if (!new RegExp(procPat).test(pc)) continue;
  console.log('==== PROC ' + pc + ' (def ' + id + ')');
  console.log(dump(b.next, 1, []).join('\n'));
}
console.log('== fields sample: replaceitemoflist blocks in target');
for (const [id, b] of Object.entries(B)) if (b.opcode === 'data_replaceitemoflist') console.log(id, JSON.stringify(b).slice(0, 400));
