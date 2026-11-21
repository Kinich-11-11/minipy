// multi-program state dumper: node dbgstate2.mjs <sb3> <json-array-of-programs> [maxSteps]
// each program is an array of source lines; programs run one after another on the same VM,
// exactly like run.mjs does.
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const progs = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const maxSteps = Number(process.argv[4] || 600);
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
const g = (n) => { const v = sv(interp, n) || sv(stage, n); return v ? v.value : undefined; };
const L = (n) => { const v = sl(interp, n) || sl(stage, n); return v ? v.value.map(String) : undefined; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const set = (n, v) => { const x = sv(stage, n); if (x) x.value = v; };
for (let pi = 0; pi < progs.length; pi++) {
  const code = sl(stage, 'Code'); code.value.length = 0; for (const l of progs[pi]) code.value.push(l);
  set('mode', 0); set('ticket', 1); set('stopreq', 0); set('running', 1); set('speed', 1); set('error', '');
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps = 0;
  while (steps < maxSteps) {
    runtime._step(); steps++;
    if (Number(sv(stage, 'running').value) === 0 && steps > 3) break;
  }
  console.log('--- program ' + pi + ' steps=' + steps + ' pc=' + g('pc') + ' error=' + JSON.stringify(g('error')));
  console.log('  Output=' + JSON.stringify(L('Output')));
  for (const n of ['LoopKind', 'LoopName', 'LoopValue', 'LoopStop', 'LoopText', 'AliasN', 'AliasT']) console.log('  L.' + n + '=' + JSON.stringify(L(n)));
  set('stopreq', 1); set('running', 0);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i = 0; i < 8; i++) runtime._step();
  set('busy', 0); set('stopreq', 0); set('error', '');
}
process.exit(0);
