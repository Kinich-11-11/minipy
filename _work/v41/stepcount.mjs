import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const sb3 = process.argv[2], lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const maxShots = Number(process.argv[4] || 60);
const modes = String(process.argv[5] || '1').split(',').map(Number);
const vm = new VM();
await vm.loadProject(fs.readFileSync(sb3));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName()));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const c = sl(stage, 'Code'); c.value.length = 0; for (const l of lines) c.value.push(l);
sv(stage, 'stopreq').value = 0; sv(stage, 'running').value = 1; sv(stage, 'speed').value = 1; sv(stage, 'error').value = '';
sv(stage, 'mode').value = 1; sv(stage, 'ticket').value = 0;
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
const seq = [];
for (let shots = 0; shots < maxShots; shots++) {
  let hit = false;
  for (let i = 0; i < 400; i++) { runtime._step(); if (String(sv(stage, 'status').value).indexOf('Paused') === 0) { hit = true; break; } if (Number(sv(stage, 'running').value) === 0) break; }
  if (Number(sv(stage, 'running').value) === 0) { seq.push('FINISHED'); break; }
  if (!hit) { seq.push('NOPAUSE(guard)'); break; }
  const pc = Number(sv(stage, 'pc').value), dep = Number(sv(interp, 'cdepth').value);
  seq.push((dep > 0 ? 'IN ' : 'top') + ' pc=' + pc + ' ' + JSON.stringify(lines[pc - 1]) + ' cdepth=' + dep);
  const clickMode = modes[Math.min(shots, modes.length - 1)];
  sv(stage, 'mode').value = clickMode;
  sv(stage, 'ticket').value = Number(sv(stage, 'ticket').value) + 1;
  seq[seq.length - 1] = seq[seq.length - 1] + ' [click ' + clickMode + ']';
}
console.log('--- ' + JSON.stringify(lines.join(' | ')));
seq.forEach((s, i) => console.log('  ' + (i + 1) + ': ' + s));
console.log('  inside-call pauses=' + seq.filter((s) => s.startsWith('IN')).length + ' total=' + seq.length);
process.exit(0);
