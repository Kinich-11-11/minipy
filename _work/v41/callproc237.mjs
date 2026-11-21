// callproc237.mjs <sb3>
// directly invoke the `lookup %s` proc with controlled Names/Values/Types, watch found/cmp
import fs from 'fs';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find(tg => tg.getName() === 'Interpreter');
const B = interp.blocks._blocks;
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).concat(vals(interp.variables)).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).concat(vals(interp.variables)).find(v => v.name === n && v.type === 'list');
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
const setL = (n, arr) => { const l = sl(n); l.value.length = 0; for (const x of arr) l.value.push(x); };

vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();

// find lookup proto + its argumentids
let argIds = null, callMutation = null;
for (const [id, b] of Object.entries(B)) {
  if (b.opcode === 'procedures_prototype' && b.mutation && b.mutation.proccode === 'lookup %s') {
    argIds = JSON.parse(b.mutation.argumentids);
    callMutation = { tagName: 'mutation', children: [], proccode: b.mutation.proccode, argumentids: b.mutation.argumentids, warp: 'true' };
  }
}
if (!argIds) { console.log('no lookup proto at runtime'); process.exit(1); }
console.log('argIds:', JSON.stringify(argIds));

const scenarios = [
  { names: ['c', 'b', 'a'], vals: ['1', '2', '3'], probes: ['a', 'b', 'c', 'd'] },
  { names: ['a', 'A'], vals: ['4', '9'], probes: ['A', 'a', 'B'] },
];

let out = [];
for (const sc of scenarios) {
  setL('Names', sc.names); setL('Values', sc.vals);
  setL('Types', sc.names.map(() => 'N'));
  for (const probe of sc.probes) {
    const callId = 'zzcall_' + Math.random().toString(36).slice(2, 8);
    B[callId] = {
      opcode: 'procedures_call', next: null, parent: null, shadow: false, topLevel: true,
      inputs: { [argIds[0]]: { name: argIds[0], block: callId + '_s', shadow: callId + '_s' } },
      fields: {},
      mutation: callMutation,
    };
    B[callId + '_s'] = {
      opcode: 'data_text', next: null, parent: callId, shadow: true, topLevel: false,
      inputs: {}, fields: { TEXT: probe },
    };
    interp.blocks._blocks[callId] = B[callId];
    interp.blocks._blocks[callId + '_s'] = B[callId + '_s'];
    setG('found', '999'); setG('cmp', '999');
    const th = runtime._pushThread(callId, interp);
    let steps = 0;
    while (steps < 500 && th.status !== 4) { runtime._step(); steps++; }
    for (let i = 0; i < 3; i++) runtime._step();
    const found = sv('found').value, cmp = sv('cmp').value;
    const rowName = Number(found) >= 1 && Number(found) <= sc.names.length ? sc.names[Number(found) - 1] : '(none)';
    out.push({ names: sc.names, probe, found: String(found), cmp: String(cmp), pointsAt: rowName, steps });
    delete interp.blocks._blocks[callId];
    delete interp.blocks._blocks[callId + '_s'];
    runtime.threads = runtime.threads.filter(t => t.target !== interp);
  }
}
console.log(JSON.stringify(out, null, 1));
process.exit(0);
