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
runtime._step(); runtime._step();      // mid recursion, fast mode
console.log('mid-run: cdepth=' + sv(interp, 'cdepth').value + ' mode=' + sv(stage, 'mode').value + ' ticket=' + sv(stage, 'ticket').value);
// what the STEP button does while running
sv(stage, 'mode').value = 1;
sv(stage, 'ticket').value = Number(sv(stage, 'ticket').value) + 1;
const paused = () => String(sv(stage, 'status').value).indexOf('Paused') === 0;
for (let k = 1; k <= 8; k++) {
  for (let i = 0; i < 60; i++) { runtime._step(); if (paused()) break; if (Number(sv(stage, 'running').value) === 0) break; }
  console.log('pause' + k + ': cdepth=' + String(sv(interp, 'cdepth').value).padStart(2) + ' pc=' + String(sv(stage, 'pc').value).padStart(2) + ' mode=' + sv(stage, 'mode').value + ' ticket=' + sv(stage, 'ticket').value + ' running=' + sv(stage, 'running').value + ' status=' + JSON.stringify(String(sv(stage, 'status').value).slice(0, 22)));
  if (Number(sv(stage, 'running').value) === 0) { console.log('   (program finished - no more pauses)'); break; }
  if (!paused()) { console.log('   (no pause: stepping was lost, program ran on)'); }
  sv(stage, 'mode').value = 1;                     // each click sets mode 1 again (as the button does)
  sv(stage, 'ticket').value = Number(sv(stage, 'ticket').value) + 1;
}
console.log('output=' + JSON.stringify(sL(stage, 'Output').value.map(String)));
process.exit(0);
