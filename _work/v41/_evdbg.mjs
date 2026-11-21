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
const run = (lines) => {
  const code = sl('Code'); code.value.length = 0;
  for (const l of lines) code.value.push(l);
  setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  for (let steps = 0; steps < 2000; steps++) {
    runtime._step();
    if (Number(gv('running')) === 0 && steps > 3) break;
  }
};
run(["class Foo: pass", "x = Foo.__name__", "print('R', x, len(x))"]);
console.log('out=', JSON.stringify(gl('Output')));
console.log('ev=', JSON.stringify(gv('ev')), 'evtype=', gv('evtype'), 'error=', gv('error'));
run(["class Foo: pass", "print(Foo.__name__)"]);
console.log('out2=', JSON.stringify(gl('Output')), 'ev=', JSON.stringify(gv('ev')), 'evtype=', gv('evtype'));
