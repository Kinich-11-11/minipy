import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const arg = process.argv[3];
const lines = arg.endsWith('.json') ? JSON.parse(fs.readFileSync(arg, 'utf8')) : JSON.parse(arg);
const wantVars = (process.argv[4] || 'pc,error,ev,evtype,pvj,pvk,pvlo,pvhi,pvi,pvout,pvspec').split(',');
const wantLists = (process.argv[5] || 'Output,Tok,PVal,PTyp,PComm').split(',');
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName ? t.getName() : t.name));
console.log('targets=' + JSON.stringify(runtime.targets.map((t) => (t.getName ? t.getName() : t.name))));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sl(stage, 'Code'); code.value.length = 0; for (const l of lines) code.value.push(l);
for (const n of ['mode','ticket','stopreq']) { const v = sv(stage, n); if (v) v.value = 0; }
{ const v = sv(stage, 'running'); if (v) v.value = 1; }
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
for (let i = 0; i < 1500; i++) { runtime._step(); if (Number(sv(stage,'running').value) === 0 && i > 3) break; }
console.log('Output=' + JSON.stringify(sl(stage, 'Output').value.map(String)));
console.log('Tok=' + JSON.stringify(sl(interp, 'Tok').value.map(String)));
console.log('Kind=' + JSON.stringify(sl(interp, 'Kind').value.map(String)));
for (const n of wantVars) { const v = sv(interp, n) || sv(stage, n); if (v) console.log(n + '=' + JSON.stringify(v.value)); }
for (const n of wantLists) { const v = sl(interp, n) || sl(stage, n); if (v) console.log(n + '=' + JSON.stringify(v.value.map(String))); }
