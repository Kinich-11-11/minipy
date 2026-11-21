import fs from 'fs';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync('../../MiniPy_v4.216.sb3'));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find(v => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(n); return l ? [...l.value] : []; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sl('Code'); code.value.length = 0;
for (const l of ["x = input()", "print('got', x)"]) code.value.push(l);
setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let answered = 0;
for (let steps = 0; steps < 300; steps++) {
  const st = String(gv('status'));
  if (st === 'Waiting for input' && answered < 3 && steps > 10) { runtime.emit('ANSWER', 'hello'); answered++; console.log('step', steps, 'emit ANSWER'); }
  runtime._step();
  if (Number(gv('running')) === 0 && steps > 3) break;
}
console.log('status=', gv('status'), 'err=', gv('error'), 'out=', JSON.stringify(gl('Output')), 'emits=', answered);
