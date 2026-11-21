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
const clickSTEP = () => click(143, 146);
const clickOUT = () => click(22, 146);
const paused = () => String(sv(stage, 'status').value).indexOf('Paused') === 0;
const waitPause = (max) => { for (let i = 0; i < (max || 600); i++) { runtime._step(); if (paused()) return true; if (Number(sv(stage, 'running').value) === 0) return false; } return false; };
vm.start(); vm.greenFlag();
frame(30);
const lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const c = sL(stage, 'Code'); c.value.length = 0; for (const l of lines) c.value.push(l);
sv(stage, 'stopreq').value = 0; sv(stage, 'running').value = 1; sv(stage, 'speed').value = 1; sv(stage, 'error').value = '';
sv(stage, 'mode').value = 1; sv(stage, 'ticket').value = 0;
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
waitPause();
console.log('start pc=' + sv(stage, 'pc').value);
const seq = [];
for (let i = 0; i < 16; i++) {
  const before = String(sv(stage, 'pc').value);
  clickSTEP();
  const ok = waitPause();
  const after = String(sv(stage, 'pc').value);
  const line = lines[Number(after) - 1];
  seq.push({ click: i + 1, before, after, line, moved: before !== after, stopped: !ok });
  if (!ok) break;

}
for (const s of seq) console.log('click' + String(s.click).padStart(2) + ': pc ' + s.before.padStart(2) + ' -> ' + s.after.padStart(2) + '  ' + (s.moved ? 'moved' : '**did not move**').padEnd(18) + '  ' + JSON.stringify(s.line));
console.log('output=' + JSON.stringify(sL(stage, 'Output').value.map(String)));
process.exit(0);
