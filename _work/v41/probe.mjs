// probe.mjs <sb3> <program.txt> <listName> [targetName] : run and print an interpreter list
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const targetName = process.argv[5] || 'Interpreter';
const tgt = runtime.targets.find((t) => t.getName() === targetName);
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const find = (t, n, isList) => vals(t.variables).find((v) => v.name === n && (isList ? v.type === 'list' : v.type !== 'list'));
const sv = (n) => find(stage, n, false);
const sL = (n) => find(stage, n, true);
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sL('Code'); code.value.length = 0;
for (const l of fs.readFileSync(process.argv[3], 'utf8').replace(/\r/g, '').replace(/\n$/, '').split('\n')) code.value.push(l);
setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let n = 0;
while (n < 20000) { runtime._step(); n++; if (Number(gv('running')) === 0 && n > 3) break; }
console.log('output=' + JSON.stringify(sL('Output').value.map(String).join('')));
console.log('error=' + JSON.stringify(String(gv('error') || '')));
const dl = find(tgt, process.argv[4], true);
if (!dl) { console.log('no list ' + process.argv[4]); process.exit(0); }
const rows = Array.isArray(dl.value) ? dl.value : [...dl.value];
console.log('list ' + process.argv[4] + ' (' + rows.length + '):');
for (const r of rows) console.log('  ' + String(r).replace(/\u001f/g, '|').replace(/\u001e/g, '^'));
process.exit(0);
