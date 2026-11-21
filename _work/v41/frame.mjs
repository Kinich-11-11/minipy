import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const mode = Number(process.argv[4] || 0);   // 1 = step mode (mode=1)
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sl(stage, 'Code'); code.value.length = 0; for (const l of lines) code.value.push(l);
for (const n of ['mode','ticket','stopreq']) { const v = sv(stage, n); if (v) v.value = 0; }
{ const v = sv(stage, 'running'); if (v) v.value = 1; }
const snap = () => ({ pc: String(sv(stage,'pc').value), sel: String(sv(stage,'selected').value), page: String(sv(stage,'page').value),
  names: sl(stage,'Names').value.map(String), values: sl(stage,'Values').value.map(String), types: sl(stage,'Types').value.map(String), show: (sl(stage,'Show')||{value:[]}).value.map(String),
  status: String(sv(stage,'status').value), steps: String(sv(stage,'steps').value) });
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let last = '';
const events = [];
for (let i = 0; i < 4000; i++) {
  runtime._step();
  const s = snap();
  const key = s.pc + '|' + s.sel + '|' + s.names.join(',') + '|' + s.values.join(',');
  if (key !== last) {
    last = key;
    const line = lines[Number(s.pc) - 1];
    events.push('pc=' + s.pc + ' sel=' + s.sel + ' line=' + JSON.stringify(line === undefined ? '' : line) + ' panel=' + s.names.map((n,k)=>n+'='+s.values[k]).join(' ') + ' status=' + s.status);
  }
  if (Number(sv(stage,'running').value) === 0 && i > 3) break;
}
console.log('Output=' + JSON.stringify(sl(stage, 'Output').value.map(String)));
console.log('EVENTS:'); for (const e of events) console.log('  ' + e);
const f = snap(); console.log('final panel(raw)=' + JSON.stringify(f.names.map((n,k)=>n+'='+f.values[k]))); console.log('final show=' + JSON.stringify(f.names.map((n,k)=>n+'='+f.show[k])));
process.exit(0);
