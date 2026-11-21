import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sl(stage, 'Code'); code.value.length = 0; for (const l of lines) code.value.push(l);
for (const n of ['mode','ticket','stopreq']) { const v = sv(stage, n); if (v) v.value = 0; }
{ const v = sv(stage, 'running'); if (v) v.value = 1; }
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
for (let i = 0; i < 2000; i++) { runtime._step(); const r = sv(stage,'running'); if (Number(r.value) === 0 && i > 3) break; }
const ev = sv(interp, 'error') || sv(stage, 'error');
console.log('error=' + JSON.stringify(ev ? String(ev.value) : '?'));
const out = sl(stage, 'Output');
console.log('Output=' + JSON.stringify(out ? out.value.map(String) : []));
const tr = sl(interp, 'Trace') || sl(stage, 'Trace');
if (tr) { const a = tr.value.map(String); console.log('trace(' + a.length + '):'); console.log(a.slice(-40).join('\n')); }
