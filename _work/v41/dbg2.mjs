// debug runner based on run.mjs init + list dumps
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const wantVars = (process.argv[4] || 'error,ev,evtype').split(',');
const wantLists = (process.argv[5] || 'Output').split(',');
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find(t => /Interp/i.test(String(t.getName ? t.getName() : t.name)));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find(v => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find(v => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
{ const code = sl(stage, 'Code'); code.value.length = 0; for (const l of lines) code.value.push(l); }
for (const [n, v] of [['mode',0],['ticket',1],['stopreq',0],['running',1],['speed',1],['error','']]) { const x = sv(stage, n); if (x) x.value = v; }
const t0 = Date.now();
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let steps = 0;
while (steps < 6000) {
  runtime._step(); steps++;
  if (Number(sv(stage, 'running').value) === 0 && steps > 3) break;
  if (Date.now() - t0 > 25000) break;
}
console.log('steps=' + steps + ' status=' + sv(stage, 'status').value);
console.log('Output=' + JSON.stringify(sl(stage, 'Output').value.map(String)));
for (const n of wantVars) { const v = sv(interp, n) || sv(stage, n); if (v) console.log(n + '=' + JSON.stringify(v.value)); }
for (const n of wantLists) { const v = sl(interp, n) || sl(stage, n); if (v) console.log(n + '=' + JSON.stringify(v.value.map(String))); }
process.exit(0);
