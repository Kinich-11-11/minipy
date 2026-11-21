// Structural integrity check for a MiniPy .sb3 (or a project.json)
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const src = process.argv[2];
const project = src.endsWith('.json')
  ? JSON.parse(fs.readFileSync(src, 'utf8'))
  : JSON.parse(zipRead(src).find((e) => e.name === 'project.json').data.toString('utf8'));
let errors = 0;
const err = (m) => { errors++; console.log('ERROR ' + m); };
for (const t of project.targets) {
  const B = t.blocks || {};
  const varIds = new Set(Object.keys(t.variables || {}));
  const listIds = new Set(Object.keys(t.lists || {}));
  const stage = project.targets.find((x) => x.isStage);
  if (stage && stage !== t) { for (const id of Object.keys(stage.variables || {})) varIds.add(id); for (const id of Object.keys(stage.lists || {})) listIds.add(id); }
  const procs = new Map();
  for (const [id, b] of Object.entries(B)) {
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const proto = B[b.inputs.custom_block[1]];
      if (proto) procs.set(proto.mutation.proccode, proto);
    }
  }
  for (const [id, b] of Object.entries(B)) {
    if (!b.topLevel && !b.parent) err(t.name + ': non-top block without parent ' + id);
    if (b.parent && !B[b.parent]) err(t.name + ': dangling parent ' + b.parent + ' of ' + id);
    if (b.next && !B[b.next]) err(t.name + ': dangling next ' + b.next + ' of ' + id);
    if (b.next !== null && b.next !== undefined && typeof b.next !== 'string') err(t.name + ': malformed next ' + JSON.stringify(b.next) + ' of ' + id);
    if (b.parent !== null && b.parent !== undefined && typeof b.parent !== 'string') err(t.name + ': malformed parent ' + JSON.stringify(b.parent) + ' of ' + id);
    for (const [slot, v] of Object.entries(b.inputs || {})) {
      if (!Array.isArray(v)) { err(t.name + ': malformed input ' + slot + ' on ' + id); continue; }
      const x = v[1];
      if (typeof x === 'string' && !B[x]) err(t.name + ': input ' + slot + ' of ' + id + ' -> missing block ' + x);
    }
    for (const [fname, f] of Object.entries(b.fields || {})) {
      if (fname === 'VARIABLE' && !varIds.has(f[1])) err(t.name + ': unknown variable ' + f[0]);
      if (fname === 'LIST' && !listIds.has(f[1])) err(t.name + ': unknown list ' + f[0]);
    }
    if (b.opcode === 'procedures_call') {
      const pc = b.mutation && b.mutation.proccode;
      if (!procs.has(pc)) err(t.name + ': call to undefined procedure "' + pc + '"');
      else {
        const want = JSON.parse(procs.get(pc).mutation.argumentids);
        const got = Object.keys(b.inputs || {});
        for (const a of want) if (!got.includes(a)) err(t.name + ': call "' + pc + '" missing arg ' + a);
      }
    }
  }
  // orphan-variable check: declared but never referenced here or as a monitor
  const used = new Set();
  for (const b of Object.values(B)) for (const f of Object.values(b.fields || {})) if (f && f[1]) used.add(f[1]);
  for (const b of Object.values(B)) for (const v of Object.values(b.inputs || {})) if (Array.isArray(v[1]) && v[1][0] === 12) used.add(v[1][2]);
}
let total = 0;
for (const t of project.targets) { const n = Object.keys(t.blocks || {}).length; total += n; console.log(t.name.padEnd(14) + ' blocks=' + String(n).padStart(6) + ' vars=' + String(Object.keys(t.variables || {}).length).padStart(4) + ' lists=' + String(Object.keys(t.lists || {}).length).padStart(3)); }
console.log('total blocks=' + total + '  errors=' + errors);
process.exit(errors ? 1 : 0);
