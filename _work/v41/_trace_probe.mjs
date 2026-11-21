import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync('_trace.sb3'));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sl = (n) => vals(stage.variables).find(v => v.name === n && v.type === 'list');
const setG = (n, val) => { const v = vals(stage.variables).find(v => v.name === n && v.type !== 'list'); if (v) v.value = val; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sl('Code'); code.value.length = 0;
for (const l of "g = 1\ndef f():\n    global g\n    g = 5\nf()\nprint(g)".split('\n')) code.value.push(l);
setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let steps = 0;
while (steps < 3000) { runtime._step(); steps++; if (Number(setG0()) === 0 && steps > 3) break; }
function setG0(){ const v = vals(stage.variables).find(v => v.name === 'running'); return v ? v.value : 1; }
const tr = sl('Trace');
const out = sl('Output');
console.log('steps:', steps, 'status:', vals(stage.variables).find(v=>v.name==='status')?.value);
console.log('--- last 40 trace entries:');
const tv = tr ? tr.value.slice(-40) : [];
for (const t of tv) console.log(String(t));
console.log('--- Output:', out ? JSON.stringify(out.value) : 'none');
process.exit(0);
