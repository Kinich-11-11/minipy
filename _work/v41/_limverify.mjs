// temp: limit probe -- run each case and report steps / frames / ms / error / a console sample
//   node _work/v41/_limverify.mjs <sb3> <cases.json>
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const sb3 = process.argv[2];
const cases = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const FRAME_CAP = Number(process.env.LIMVERIFY_FRAMES || 6000000);
const vm = new VM();
await vm.loadProject(fs.readFileSync(sb3));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sl('Code'), out = sl('Output');
for (const c of cases) {
  code.value.length = 0;
  for (const l of c.code.split('\n')) code.value.push(l);
  out.value.length = 0;
  sv('mode').value = 0; sv('ticket').value = 1; sv('stopreq').value = 0;
  sv('running').value = 1; sv('speed').value = c.slow ? 0 : 1; sv('error').value = ''; sv('steps').value = 0;
  const t0 = Date.now();
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let frames = 0;
  while (frames < FRAME_CAP) {
    runtime._step(); frames++;
    if (Number(sv('running').value) === 0 && frames > 3) break;
    if (Date.now() - t0 > 600000) break;
  }
  const ms = Date.now() - t0;
  const o = out.value.map(String);
  const shown = (c.takeConsole === false || !o.length) ? '' : ' out=' + JSON.stringify(o.slice(0, 2)) + (o.length > 2 ? '..' + JSON.stringify(o[o.length - 1]) : '');
  console.log(c.name.padEnd(26) + ' steps=' + String(sv('steps').value).padStart(7) +
    ' frames=' + String(frames).padStart(8) + ' ms=' + String(ms).padStart(7) +
    ' olen=' + String(o.length).padStart(5) +
    ' err=' + JSON.stringify(String(sv('error').value)).slice(0, 44) + shown);
  sv('stopreq').value = 1; sv('running').value = 0;
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i = 0; i < 8; i++) runtime._step();
  sv('stopreq').value = 0; sv('error').value = '';
}
process.exit(0);
