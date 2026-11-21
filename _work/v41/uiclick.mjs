import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const sb3 = process.argv[2], lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const vm = new VM();
await vm.loadProject(fs.readFileSync(sb3));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName()));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
const scr = (sx, sy) => ({ x: 240 + sx, y: 180 - sy, canvasWidth: 480, canvasHeight: 360 });
const frame = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
const click = (sx, sy) => { runtime.ioDevices.mouse.postData(Object.assign({ isDown: true }, scr(sx, sy))); frame(3); runtime.ioDevices.mouse.postData(Object.assign({ isDown: false }, scr(sx, sy))); frame(3); };
vm.start(); vm.greenFlag();
frame(30);
const c = sl(stage, 'Code'); c.value.length = 0; for (const l of lines) c.value.push(l);
sv(stage, 'stopreq').value = 0; sv(stage, 'running').value = 1; sv(stage, 'speed').value = 1; sv(stage, 'error').value = '';
sv(stage, 'mode').value = 1; sv(stage, 'ticket').value = 1;
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
const waitPause = () => { for (let i = 0; i < 400; i++) { runtime._step(); if (String(sv(stage, 'status').value).indexOf('Paused') === 0) return true; if (Number(sv(stage, 'running').value) === 0) return false; } return false; };
const show = (tag) => console.log(tag + ' pc=' + String(sv(stage, 'pc').value) + ' cdepth=' + String(sv(interp, 'cdepth').value) + ' status=' + JSON.stringify(String(sv(stage, 'status').value)) + ' line=' + JSON.stringify(lines[Number(sv(stage, 'pc').value) - 1]));
waitPause(); show('pause1');
click(143, 146); waitPause(); show('after STEP button');      // step off the def line
click(143, 146); waitPause(); show('after STEP button');      // land on the call line
click(22, 146);  waitPause(); show('after OUT button');       // OUT: the whole call should run
console.log('sodep=' + String(sv(stage, 'sodep').value) + ' output=' + JSON.stringify(sl(stage, 'Output').value.map(String)));
process.exit(0);
