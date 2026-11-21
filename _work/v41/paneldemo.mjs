import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync('MiniPy_v4.31.sb3'));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const tr = runtime.targets.find((t) => /text/i.test(t.getName()));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const idx = Number(process.argv[2] || 4) - 1;
const demo = JSON.parse(fs.readFileSync('_work/v41/demos.json', 'utf8'))[idx];
console.log('--- demo' + (idx + 1) + ' ' + demo.name);
const lines = demo.code.split('\n');
const code = sl(stage, 'Code'); code.value.length = 0; for (const l of lines) code.value.push(l);
sv(stage, 'stopreq').value = 0; sv(stage, 'running').value = 1; sv(stage, 'speed').value = 1; sv(stage, 'error').value = '';
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
for (let i = 0; i < 1500; i++) { runtime._step(); if (Number(sv(stage, 'running').value) === 0 && i > 3) break; }
console.log('Output rows=' + JSON.stringify(sl(stage, 'Output').value.map(String)));
const names = sl(stage, 'Names').value.map(String);
const show = sl(stage, 'Show').value.map(String);
console.log('panel rows=' + JSON.stringify(names.map((n, k) => n + ' = ' + show[k])));
// let the TextRenderer actually draw the panel and read back what it drew
sv(stage, 'varpage').value = 1; sv(stage, 'dirty').value = 1;
let drawn = [];
for (let i = 0; i < 8; i++) { runtime._step(); drawn.push(String(sv(tr, 'vtxt').value)); }
console.log('drawn last row=' + JSON.stringify(drawn[drawn.length - 1]));
process.exit(0);
