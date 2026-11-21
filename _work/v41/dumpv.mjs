import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync('MiniPy_v4.16.sb3'));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = vals(stage.variables).find((v) => v.name === 'Code');
code.value.length = 0;
for (const l of ["t = (1,)", "u = (1, 2)", "w = [1,]"]) code.value.push(l);
for (const n of ['mode','ticket','stopreq']) { const v = vals(stage.variables).find((x) => x.name === n); if (v) v.value = 0; }
{ const v = vals(stage.variables).find((x) => x.name === 'running'); if (v) v.value = 1; }
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
for (let i = 0; i < 1500; i++) { runtime._step(); const r = vals(stage.variables).find((x) => x.name === 'running'); if (Number(r.value) === 0 && i > 3) break; }
for (const t of runtime.targets) {
  for (const v of vals(t.variables)) {
    if (['t','u','w','error'].includes(v.name)) console.log((t.getName?t.getName():t.name) + '.' + v.name + '=' + JSON.stringify(String(v.value)));
  }
}
