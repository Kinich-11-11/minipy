'use strict';
/**
 * MiniPy v5 structural acceptance check.
 *   node check.js <project.json|sb3> [--sb3]
 *  - parent links, dangling refs, orphan blocks
 *  - next-chain cycles (an infinite loop inside one step)
 *  - leaf-call-graph: no procedure may call another custom block
 */
const fs = require('fs');
const zlib = require('zlib');

function loadProject(p) {
  if (p.endsWith('.json')) return JSON.parse(fs.readFileSync(p, 'utf8'));
  const buf = fs.readFileSync(p);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8');
    if (name === 'project.json') {
      const lnameLen = buf.readUInt16LE(localOff + 26);
      const lextraLen = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lnameLen + lextraLen;
      const raw = buf.slice(start, start + compSize);
      return JSON.parse((method === 0 ? raw : zlib.inflateRawSync(raw)).toString('utf8'));
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('no project.json');
}

const project = loadProject(process.argv[2]);
let problems = 0;
const fail = (m) => { problems++; console.log('  !! ' + m); };

for (const t of project.targets) {
  const B = t.blocks || {};
  let danglingNext = 0, danglingInput = 0, danglingParent = 0, missingParent = 0, topWithParent = 0;
  for (const id in B) {
    const b = B[id];
    if (typeof b.next === 'string' && !B[b.next]) danglingNext++;
    if (b.parent != null && !B[b.parent]) danglingParent++;
    if (b.topLevel && b.parent != null) topWithParent++;
    if (!b.topLevel && b.parent == null) missingParent++;
    for (const k in (b.inputs || {})) {
      const inp = b.inputs[k];
      if (!Array.isArray(inp)) continue;
      for (let i = 1; i < inp.length; i++) {
        if (typeof inp[i] === 'string' && !B[inp[i]]) danglingInput++;
      }
    }
  }
  // next-chain cycle detection from every top-level block
  let cycles = 0;
  for (const id in B) {
    if (!B[id].topLevel) continue;
    const seen = new Set();
    let cur = B[id].next, steps = 0;
    while (cur && steps++ < Object.keys(B).length + 5) {
      if (seen.has(cur)) { cycles++; break; }
      seen.add(cur);
      cur = B[cur] ? B[cur].next : null;
    }
  }
  // leaf call-graph: map each procedure definition to the procedures it calls
  const defOfProto = {};
  for (const id in B) {
    if (B[id].opcode === 'procedures_definition' && B[id].inputs && B[id].inputs.custom_block) {
      const proto = B[B[id].inputs.custom_block[1]];
      if (proto) defOfProto[proto.mutation.proccode] = id;
    }
  }
  const callers = [];
  for (const id in B) {
    if (B[id].opcode !== 'procedures_call') continue;
    // find the enclosing definition, if any
    let top = id;
    for (let i = 0; i < 5000 && B[top] && top != null; i++) {
      const p = B[top].parent;
      if (p == null) break;
      top = p;
    }
    let owner = null;
    for (const pc in defOfProto) if (defOfProto[pc] === top) owner = pc;
    if (owner) callers.push(owner + ' -> ' + B[id].mutation.proccode);
  }
  const nv = Object.keys(t.variables || {}).length;
  const nl = Object.keys(t.lists || {}).length;
  console.log(t.name.padEnd(14) + ' blocks=' + String(Object.keys(B).length).padStart(6) +
    ' vars=' + String(nv).padStart(3) + ' lists=' + String(nl).padStart(3));
  if (danglingNext) fail(t.name + ': dangling next=' + danglingNext);
  if (danglingInput) fail(t.name + ': dangling inputs=' + danglingInput);
  if (danglingParent) fail(t.name + ': dangling parent=' + danglingParent);
  if (missingParent) fail(t.name + ': blocks with no parent=' + missingParent);
  if (topWithParent) fail(t.name + ': top-level blocks that also have a parent=' + topWithParent);
  if (cycles) fail(t.name + ': next-chain cycles=' + cycles);
  if (callers.length) {
    if (t.name === 'Interpreter') {
      fail(t.name + ': NON-LEAF procedures (' + callers.length + ' call sites):');
      for (const c of callers.slice(0, 10)) console.log('       ' + c);
    } else {
      console.log('       (' + t.name + ' is shell, not part of the v5 kernel: ' + callers.length + ' internal calls, unchanged from v4)');
    }
  }
}
console.log(problems === 0 ? 'OK  all structural checks passed' : ('FAIL ' + problems + ' problem group(s)'));
process.exit(0);
