import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName()));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sL = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const c = sL(stage, 'Code'); c.value.length = 0; for (const l of lines) c.value.push(l);
sv(stage, 'stopreq').value = 0; sv(stage, 'running').value = 1; sv(stage, 'speed').value = 1; sv(stage, 'error').value = '';
sv(stage, 'mode').value = 0; sv(stage, 'ticket').value = 0;
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
runtime._step(); runtime._step();      // fast, mid recursion (frames saved with mode=0)
const st = () => 'cdepth=' + String(sv(interp, 'cdepth').value).padStart(2) + ' pc=' + String(sv(stage, 'pc').value).padStart(2) + ' mode=' + sv(stage, 'mode').value + ' sodep=' + (sv(stage, 'sodep') ? String(sv(stage, 'sodep').value).padStart(3) : ' - ') + ' running=' + sv(stage, 'running').value;
console.log('mid-run      ' + st());
const paused = () => String(sv(stage, 'status').value).indexOf('Paused') === 0;
const press = (mode) => { sv(stage, 'mode').value = mode; sv(stage, 'ticket').value = Number(sv(stage, 'ticket').value) + 1; };
const advance = () => { for (let i = 0; i < 80; i++) { runtime._step(); if (paused()) return true; if (Number(sv(stage, 'running').value) === 0) return false; } return false; };
press(1);                                   // STEP
console.log((advance() ? 'STEP  pause  ' : 'STEP  none   ') + st());
for (let k = 1; k <= 4; k++) {
  press(3);                                 // OUT
  const ok = advance();
  console.log('OUT' + k + '  ' + (ok ? 'pause  ' : 'NO PAUSE') + ' ' + st() + (ok ? '' : '   <-- stepping lost'));
  if (!ok) break;
}
console.log('output=' + JSON.stringify(sL(stage, 'Output').value.map(String)));
process.exit(0);
