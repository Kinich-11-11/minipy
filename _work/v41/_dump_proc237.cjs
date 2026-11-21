// dump_proc237.cjs <sb3> <procname-substring> [targetIndex]
// prints full block tree (statements + expression trees) for procs whose proccode contains the substring
const { zipRead } = require('../sb3lib.js');
const file = process.argv[2];
const needle = process.argv[3];
const tgtIdx = process.argv[4] ? parseInt(process.argv[4]) : 3;
const es = zipRead(file);
const p = JSON.parse(es.find(e => e.name === 'project.json').data.toString('utf8'));
const tg = p.targets[tgtIdx], B = tg.blocks;
const vars = {};
for (const [vid, v] of Object.entries(tg.variables || {})) vars[vid] = v.name;
const lists = {};
for (const [lid, l] of Object.entries(tg.lists || {})) lists[lid] = l.name;

function expr(v, depth) {
  // v: input descriptor
  if (v === undefined) return '?';
  if (Array.isArray(v)) {
    if (v.length === 2 && (v[0] === 4 || v[0] === 5 || v[0] === 6 || v[0] === 7 || v[0] === 8)) return JSON.stringify(v[1]);
    if (v.length === 2 && v[0] === 9) return 'MATH:' + JSON.stringify(v[1]);
    if (v.length === 2 && v[0] === 10) return JSON.stringify(v[1]);
    if (v.length === 2 && v[0] === 11) return 'BCAST:' + JSON.stringify(v[1]);
    if (v.length === 2 && v[0] === 12) return 'VAR[' + (vars[v[1]] || v[1]) + ']';
    if (v.length === 2 && v[0] === 13) return 'LIST[' + (lists[v[1]] || v[1]) + ']';
    if (typeof v[1] === 'string' && B[v[1]]) return ex(B[v[1]], depth);
    return JSON.stringify(v);
  }
  return JSON.stringify(v);
}

function ex(b, depth) {
  if (!b) return '(null)';
  const pad = depth > 99 ? '' : '';
  let op = b.opcode;
  if (op === 'procedures_call') op = 'CALL<' + (b.mutation ? b.mutation.proccode : '?') + '>';
  if (op === 'procedures_prototype') op = 'PROTO<' + (b.mutation ? b.mutation.proccode : '?') + '>';
  const parts = [];
  for (const [k, v] of Object.entries(b.inputs || {})) {
    if (k === 'SUBSTACK' || k === 'SUBSTACK2') continue;
    parts.push(k + '=' + expr(v, 0));
  }
  for (const [k, v] of Object.entries(b.fields || {})) {
    parts.push(k + ':' + JSON.stringify(v && v[0]));
  }
  return op + '(' + parts.join(', ') + ')';
}

function stmts(id, depth, seen) {
  seen = seen || new Set();
  let cur = id;
  while (cur && B[cur] && !seen.has(cur)) {
    seen.add(cur);
    const b = B[cur];
    let op = b.opcode;
    if (op === 'procedures_call') op = 'CALL<' + (b.mutation ? b.mutation.proccode : '?') + '>';
    const parts = [];
    for (const [k, v] of Object.entries(b.inputs || {})) {
      if (k === 'SUBSTACK' || k === 'SUBSTACK2') continue;
      parts.push(k + '=' + expr(v, 0));
    }
    for (const [k, v] of Object.entries(b.fields || {})) parts.push(k + ':' + JSON.stringify(v && v[0]));
    console.log(' '.repeat(depth * 2) + (cur || '?').slice(0, 8) + ' ' + op + '(' + parts.join(', ') + ')');
    for (const [k, v] of Object.entries(b.inputs || {})) {
      if (k === 'SUBSTACK' || k === 'SUBSTACK2') {
        const lbl = (b.opcode === 'control_if_else') ? (k === 'SUBSTACK' ? '[THEN]' : '[ELSE]') : '[' + k + ']';
        console.log(' '.repeat((depth + 1) * 2) + lbl);
        if (v && v[1]) stmts(v[1], depth + 2, seen);
      }
    }
    cur = b.next;
  }
}

let printed = 0;
for (const [id, b] of Object.entries(B)) {
  if (b.opcode === 'procedures_definition') {
    const protoIn = b.inputs.custom_block;
    const proto = protoIn && B[protoIn[1]];
    const pc = proto && proto.mutation && proto.mutation.proccode || '';
    if (pc.includes(needle)) {
      console.log('===== DEF ' + pc + ' (warp=' + ((proto && proto.mutation && proto.mutation.warp) !== undefined ? proto.mutation.warp : '?') + ') =====');
      if (b.next) stmts(b.next, 0);
      printed++;
    }
  }
}
if (!printed) console.log('(no proc matching ' + needle + ')');
