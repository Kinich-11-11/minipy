// dbg214.mjs <sb3> '<python code>' [vars] [lists] — single-shot debug runner
import fs from 'fs';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const lines = String(process.argv[3]).split('\n');
const wantVars = (process.argv[4] || 'ev,evtype,lt2,bgp,bgpv,bgma,bgmb,bge,bgc,bgq,bgr,fnlimit').split(',');
const wantLists = (process.argv[5] || 'Output,Tok,Kind').split(',');
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const svAll = (n) => { for (const t of runtime.targets) { const v = vals(t.variables).find((x) => x.name === n && x.type !== 'list'); if (v) return v; } };
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
const slAll = (n) => { for (const t of runtime.targets) { const v = vals(t.variables).find((x) => x.name === n && x.type === 'list'); if (v) return v; } };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sl(stage, 'Code'); code.value.length = 0; for (const l of lines) code.value.push(l);
for (const n of ['mode','ticket','stopreq']) { const v = sv(stage, n); if (v) v.value = 0; }
{ const v = sv(stage, 'running'); if (v) v.value = 1; }
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
for (let i = 0; i < 3000; i++) { runtime._step(); if (Number(sv(stage,'running').value) === 0 && i > 3) break; }
console.log('Output=' + JSON.stringify(sl(stage, 'Output').value.map(String)));
console.log('error=' + JSON.stringify(String((sv(stage,'error')||{}).value ?? '')));
console.log('Tok=' + JSON.stringify(sl(interp, 'Tok').value.map(String)));
console.log('Kind=' + JSON.stringify(sl(interp, 'Kind').value.map(String)));
for (const n of wantVars) { const v = svAll(n); if (v) console.log(n + '=' + JSON.stringify(v.value)); else console.log(n + '=MISSING'); }
for (const n of wantLists) { if (['Output','Tok','Kind'].includes(n)) continue; const v = slAll(n); if (v) console.log(n + '[' + v.value.length + ']=' + JSON.stringify(v.value.map(String).slice(0,20))); else console.log(n + '=MISSING'); }
process.exit(0);
