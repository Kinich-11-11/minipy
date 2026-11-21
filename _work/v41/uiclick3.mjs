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
const log = (tag) => console.log(tag.padEnd(22) + ' pc=' + String(sv(stage, 'pc').value).padStart(2) + ' cdepth=' + sv(interp, 'cdepth').value + ' sodep=' + (sv(stage, 'sodep') ? String(sv(stage, 'sodep').value).padStart(3) : ' - ') + ' ' + JSON.stringify(lines[Number(sv(stage, 'pc').value) - 1]));
waitPause(); log('pause (start)');
for (const t of ['STEP', 'STEP', 'STEP']) { click(t === 'STEP' ? 143 : 22, 146); waitPause(); log('after ' + t); }
console.log('--- now OUT, then STEP again');
click(22, 146); waitPause(); log('after OUT');
click(143, 146); waitPause(); log('after STEP');
click(143, 146); waitPause(); log('after STEP');
console.log('--- start fast, then STEP mid-run');
sv(stage, 'mode').value = 0;   // emulate the RUN button
frame(3);
click(143, 146);
const pausedOk = waitPause();
log(pausedOk ? 'after STEP (from RUN)' : 'STEP never paused');
if (pausedOk) { click(143, 146); waitPause(); log('after STEP'); }
console.log('output=' + JSON.stringify(sL(stage, 'Output').value.map(String)));
process.exit(0);
