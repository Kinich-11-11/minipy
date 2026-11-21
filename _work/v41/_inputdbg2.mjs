import fs from 'fs';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync('../../MiniPy_v4.216.sb3'));
const runtime = vm.runtime;
const stage = runtime.getTargetForStage();
const interp = runtime.targets.find(tg => tg.getName() === 'Interpreter') || stage;
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const gvAll = (n) => { for (const tg of [stage, interp]) { const v = vals(tg.variables).find(v => v.name === n && v.type !== 'list'); if (v) return v.value; } return undefined; };
const glAll = (n) => { for (const tg of [stage, interp]) { const v = vals(tg.variables).find(v => v.name === n && v.type === 'list'); if (v) return [...v.value]; } return []; };
const setG = (n, val) => { for (const tg of [stage, interp]) { const v = vals(tg.variables).find(v => v.name === n && v.type !== 'list'); if (v) { v.value = val; return; } } };
const codeList = vals(stage.variables).concat(vals(interp.variables)).find(v => v.name === 'Code' && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
codeList.value.length = 0;
for (const l of ["x = input()", "print('got', x)"]) codeList.value.push(l);
setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
let emits = 0;
runtime.on('QUESTION', (q) => console.log('QUESTION event:', JSON.stringify(q)));
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
for (let steps = 0; steps < 600; steps++) {
  const st = String(gvAll('status'));
  if (st === 'Waiting for input' && emits < 5 && steps > 5) { runtime.emit('ANSWER', 'hello'); emits++; console.log('step', steps, 'emit ANSWER'); }
  runtime._step();
  if (Number(gvAll('running')) === 0 && steps > 3) break;
}
console.log('status=', gvAll('status'), 'err=', gvAll('error'), 'out=', JSON.stringify(glAll('Output')), 'emits=', emits);
process.exit(0);
