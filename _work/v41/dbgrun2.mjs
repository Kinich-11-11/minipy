// dbgrun2.mjs <sb3> <txt-or-json-case-file> [vars] [lists]
// Single-case debug runner based on runall.mjs (fast in-process VM).
import fs from 'fs';
import path from 'path';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const arg = process.argv[3];
const wantVars = (process.argv[4] || 'error,ev,evtype').split(',');
const wantLists = (process.argv[5] || 'Output').split(',');
let code;
if (arg.endsWith('.txt')) {
  const lines = fs.readFileSync(arg, 'utf8').replace(/\r/g, '').split('\n').filter(l => !l.startsWith('### '));
  while (lines.length && lines[lines.length-1] === '') lines.pop();
  code = lines.join('\n');
} else code = JSON.parse(fs.readFileSync(arg, 'utf8')).code;
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find(t => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find(v => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find(v => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const cl = sl(stage, 'Code'); cl.value.length = 0;
for (const l of String(code).replace(/\r/g, '').split('\n')) cl.value.push(l);
for (const n of ['mode','ticket','stopreq']) { const v = sv(stage, n); if (v) v.value = 0; }
{ const v = sv(stage, 'running'); if (v) v.value = 1; }
const t0 = Date.now();
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let steps = 0;
while (steps < 6000) {
  runtime._step(); steps++;
  if (Number(sv(stage, 'running').value) === 0 && steps > 3) break;
  if (Date.now() - t0 > 30000) break;
}
const out = sl(stage, 'Output');
console.log('Output=' + JSON.stringify(out ? out.value.map(String) : null));
for (const n of wantVars) { const v = sv(interp, n) || sv(stage, n); if (v) console.log(n + '=' + JSON.stringify(v.value)); }
for (const n of wantLists) { const l = sl(interp, n) || sl(stage, n); if (l) console.log(n + '=' + JSON.stringify(l.value.map(String))); }
