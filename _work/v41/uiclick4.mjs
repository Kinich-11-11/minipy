import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName()));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sL = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
const scr = (sx, sy) => ({ x: 240 + sx, y: 180 - sy, canvasWidth: 480, canvasHeight: 360 });
const frame = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
const click = (sx, sy) => { runtime.ioDevices.mouse.postData(Object.assign({ isDown: true }, scr(sx, sy))); frame(2); runtime.ioDevices.mouse.postData(Object.assign({ isDown: false }, scr(sx, sy))); frame(2); };
const paused = () => String(sv(stage, 'status').value).indexOf('Paused') === 0;
const waitPause = (max) => { for (let i = 0; i < (max || 800); i++) { runtime._step(); if (paused()) return true; if (Number(sv(stage, 'running').value) === 0) return false; } return false; };
vm.start(); vm.greenFlag();
frame(30);
const lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const c = sL(stage, 'Code'); c.value.length = 0; for (const l of lines) c.value.push(l);
sv(stage, 'stopreq').value = 0; sv(stage, 'running').value = 1; sv(stage, 'speed').value = 1; sv(stage, 'error').value = '';
sv(stage, 'mode').value = 1; sv(stage, 'ticket').value = 0;
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
const log = (t) => console.log(t.padEnd(26) + ' pc=' + String(sv(stage, 'pc').value).padStart(2) + ' cdepth=' + String(sv(interp, 'cdepth').value).padStart(2) + ' mode=' + sv(stage, 'mode').value + ' status=' + JSON.stringify(String(sv(stage, 'status').value).slice(0, 22)) + ' ' + JSON.stringify(lines[Number(sv(stage, 'pc').value) - 1]));
waitPause(); log('start (STEP mode)');
click(143, 146); waitPause(); log('STEP -> call line');
click(143, 146); waitPause(); log('STEP -> into function');
console.log('--- switch to fast run, then click STEP while inside the recursion');
click(84, 146);                                  // RUN button
frame(1);
log('RUN pressed, 1 frame');
click(143, 146);                                 // STEP while running inside a call
const p1 = waitPause(); log(p1 ? 'STEP (mid-run) paused' : 'STEP (mid-run) never paused');
if (p1) {
  click(143, 146);
  const p2 = waitPause(); log(p2 ? 'STEP again paused' : 'STEP again never paused -> ran to the end');
  if (p2) { click(143, 146); const p3 = waitPause(); log(p3 ? 'STEP 3 paused' : 'STEP 3 never paused -> ran to the end'); }
}
console.log('running=' + sv(stage, 'running').value + ' output=' + JSON.stringify(sL(stage, 'Output').value.map(String)));
process.exit(0);
