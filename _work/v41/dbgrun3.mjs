// dbgrun3.mjs <sb3> <txt> [vars] [lists]
// 基于 runall.mjs 的加载/运行路径的单例 dump（dbgrun2 在本机加载会挂）。
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const txtFile = process.argv[3];
const wantVars = (process.argv[4] || 'error,ev,evtype').split(',');
const wantLists = (process.argv[5] || 'Output').split(',');
const PY = process.env.PYEXE || 'python';

const lines = fs.readFileSync(txtFile, 'utf8').replace(/\r/g, '').split('\n').filter(l => !l.startsWith('### '));
while (lines.length && lines[lines.length - 1] === '') lines.pop();
const code = lines.join('\n');

const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find(t => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find(v => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find(v => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(stage, n); return v ? v.value : undefined; };
const setG = (n, val) => { const v = sv(stage, n); if (v) v.value = val; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const cl = sl(stage, 'Code'); cl.value.length = 0;
for (const l of String(code).split('\n')) cl.value.push(l);
setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
const t0 = Date.now();
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let steps = 0;
while (steps < 4000) {
  runtime._step(); steps++;
  if (Number(gv('running')) === 0 && steps > 3) break;
  if (Date.now() - t0 > 30000) break;
}
setG('stopreq', 1); setG('running', 0);
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
for (let i = 0; i < 8; i++) runtime._step();
const out = sl(stage, 'Output');
console.log('Output=' + JSON.stringify(out ? out.value.map(String) : null));
for (const n of wantVars) { const v = sv(interp, n) || sv(stage, n); if (v) console.log(n + '=' + JSON.stringify(v.value)); }
for (const n of wantLists) { const l = sl(interp, n) || sl(stage, n); if (l) console.log(n + '=' + JSON.stringify(l.value.map(String))); }
process.exit(0);
