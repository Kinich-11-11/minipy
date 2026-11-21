import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync('_trace.sb3'));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const itarget = runtime.targets.find(t => t.getName() === 'Interpreter');
const sl = (n) => vals(itarget.variables).find(v => v.name === n && v.type === 'list') || vals(stage.variables).find(v => v.name === n && v.type === 'list');
const gv = (n) => { const v = vals(stage.variables).find(v => v.name === n && v.type !== 'list'); return v ? v.value : undefined; };
const setG = (n, val) => { const v = vals(stage.variables).find(v => v.name === n && v.type !== 'list'); if (v) v.value = val; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sl('Code'); code.value.length = 0;
for (const l of "def f():\n    return 2\nprint(f())".split('\n')) code.value.push(l);
setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 0); setG('error', '');
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let steps = 0;
const t0 = Date.now();
while (steps < 4000 && Date.now() - t0 < 25000) { runtime._step(); steps++; if (Number(gv('running')) === 0 && steps > 3) break; }
const tr = sl('Trace');
console.log('vm steps:', steps, 'status:', gv('status'), 'err:', gv('error'));
if (tr) { const tv = tr.value; console.log('trace len:', tv.length); console.log('--- last 30:'); for (const t of tv.slice(-30)) console.log(String(t)); }
const frb = sl('FrBndC'); console.log('FrBndC:', frb ? JSON.stringify(frb.value) : 'none');
const frb2 = sl('FrBnd'); console.log('FrBnd:', frb2 ? JSON.stringify(frb2.value) : 'none');
process.exit(0);
