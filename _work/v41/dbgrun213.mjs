// dbgrun213.mjs <sb3> <codefile> — run one program, dump Output/error + chosen lists
import fs from 'fs';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const codeFile = process.argv[3];
const lists = (process.argv[4] || 'Trace,Output').split(',');
const vars = (process.argv[5] || 'error').split(',');

const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find(t => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find(v => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find(v => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const codeText = fs.readFileSync(codeFile, 'utf8').replace(/\r/g, '').replace(/\n+$/, '');
const code = sl(stage, 'Code'); code.value.length = 0;
for (const l of codeText.split('\n')) code.value.push(l);
for (const n of ['mode', 'ticket', 'stopreq']) { const v = sv(stage, n); if (v) v.value = 0; }
{ const v = sv(stage, 'running'); if (v) v.value = 1; }
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let steps = 0;
for (let i = 0; i < 8000; i++) { runtime._step(); steps++; if (Number(sv(stage, 'running').value) === 0 && steps > 3) break; }
const err = sv(stage, 'error');
console.log('error=' + (err ? JSON.stringify(err.value) : '?'));
console.log('Output=' + JSON.stringify(sl(stage, 'Output').value.map(String)));
for (const n of lists) { const l = sl(interp, n) || sl(stage, n); if (l) console.log(n + '=' + JSON.stringify(l.value.map(String))); }
for (const n of vars) { const v = sv(interp, n) || sv(stage, n); if (v) console.log(n + '=' + JSON.stringify(v.value)); }
process.exit(0);
