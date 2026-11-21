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
sv(stage, 'mode').value = 1; sv(stage, 'ticket').value = 0;
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
const paused = () => String(sv(stage, 'status').value).indexOf('Paused') === 0;
const clickStep = () => { sv(stage, 'mode').value = 1; sv(stage, 'ticket').value = Number(sv(stage, 'ticket').value) + 1; };
for (let i = 0; i < 40; i++) { runtime._step(); if (paused()) break; }
for (let k = 1; k <= 14; k++) {
  const pc0 = String(sv(stage, 'pc').value);
  clickStep();
  const t0 = Date.now();
  let frames = 0;
  while (frames < 400) { runtime._step(); frames++; if (paused()) break; if (Number(sv(stage, 'running').value) === 0) break; }
  const ms = Date.now() - t0;
  const dep = Number(sv(interp, 'cdepth').value);
  console.log('step' + String(k).padStart(2) + ' pc ' + pc0.padStart(2) + '->' + String(sv(stage, 'pc').value).padStart(2) +
    ' cdepth=' + dep + '  frames=' + String(frames).padStart(3) + '  ms=' + String(ms).padStart(4) +
    '  ' + (dep > 0 ? 'IN ' : 'top') + '  ' + JSON.stringify(lines[Number(sv(stage, 'pc').value) - 1]));
  if (Number(sv(stage, 'running').value) === 0) break;
}
process.exit(0);
