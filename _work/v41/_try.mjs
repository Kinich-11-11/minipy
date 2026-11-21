// Batch-run small programs against a built sb3 via dbgrun-equivalent, print Output.
// Usage: node _try.mjs <sb3> <json-cases-file>
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const cases = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const codeList = sl(stage, 'Code');
for (const c of cases) {
  codeList.value.length = 0; for (const l of c.code.split('\n')) codeList.value.push(l);
  for (const n of ['mode', 'ticket', 'stopreq']) { const v = sv(stage, n); if (v) v.value = 0; }
  const rv = sv(stage, 'running'); if (rv) rv.value = 1;
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let ran = 0;
  for (let i = 0; i < 6000; i++) { runtime._step(); ran = i; if (Number(sv(stage, 'running').value) === 0 && i > 3) break; }
  const out = sl(stage, 'Output').value.map(String);
  const err = String(sv(interp, 'error')?.value ?? '');
  console.log('== ' + c.name + (err ? '  [err=' + JSON.stringify(err) + ']' : ''));
  console.log('   out=' + JSON.stringify(out));
}
process.exit(0);
