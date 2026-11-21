import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find(v => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sl('Code'); code.value.length = 0; for (const l of lines) code.value.push(l);
for (const n of ['mode','ticket','stopreq']) { const v = sv(n); if (v) v.value = 0; }
sv('running').value = 1; sv('speed').value = 1; sv('error').value = '';
const t0 = Date.now();
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let steps = 0;
while (steps < 20000) { runtime._step(); steps++; if (Number(sv('running').value) === 0 && steps > 3) break; if (Date.now()-t0 > 30000) break; }
console.log(projectPath + ' steps=' + steps + ' ms=' + (Date.now()-t0) + ' interpSteps=' + sv('steps').value + ' out=' + JSON.stringify(sl('Output').value.map(String).slice(0,3)));
process.exit(0);
