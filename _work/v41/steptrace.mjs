import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const maxSteps = Number(process.argv[4] || 40);
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find(v => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sl('Code'); code.value.length = 0; for (const l of lines) code.value.push(l);
sv('stopreq').value = 0; sv('running').value = 1; sv('speed').value = 1; sv('error').value = '';
sv('mode').value = 1; sv('ticket').value = 0;
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
const paused = () => { const b = [sv('busy').value]; return String(sv('status').value).indexOf('Paused') === 0; };
const lineOf = (n) => (lines[Number(n) - 1] === undefined ? '' : lines[Number(n) - 1]);
let shots = 0;
for (let guard = 0; guard < 200 && shots < maxSteps; guard++) {
  let hit = false;
  for (let i = 0; i < 300; i++) { runtime._step(); if (paused()) { hit = true; break; } if (Number(sv('running').value) === 0) break; }
  if (Number(sv('running').value) === 0) { console.log('FINISHED output=' + JSON.stringify(sl('Output').value.map(String))); break; }
  shots++;
  const pc = String(sv('pc').value), sel = String(sv('selected').value);
  const names = sl('Names').value.map(String), show = (sl('Show') || { value: [] }).value.map(String);
  console.log('step' + shots + ' pc=' + pc + ' sel=' + sel + ' page=' + String(sv('page').value) + ' line=' + JSON.stringify(lineOf(pc)) +
    ' steps=' + String(sv('steps').value) + ' panel=' + names.map((n, k) => n + '=' + show[k]).join(' '));
  if (!hit && Number(sv('running').value) === 1) { console.log('  (no pause point seen)'); }
  sv('ticket').value = Number(sv('ticket').value) + 1;   // click STEP
}
console.log('status=' + String(sv('status').value) + ' error=' + JSON.stringify(String(sv('error').value)) + ' output=' + JSON.stringify(sl('Output').value.map(String)));
process.exit(0);
