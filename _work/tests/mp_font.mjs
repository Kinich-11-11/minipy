// checks the 26-column wrap and the help screen on a font build
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
const gl = (n) => { const l = sl(n); return l ? [...l.value].map(String) : []; };
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
const step = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
const at = (x, y, d) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, canvasWidth: 480, canvasHeight: 360, isDown: d });
const click = (x, y) => { at(x, y, true); step(4); at(x, y, false); step(6); };
vm.start(); vm.greenFlag(); step(30);

// --- console wrap: print 40 chars, expect rows of 26 + 14
const code = sl('Code'); code.value.length = 0;
code.value.push("print('0123456789' * 4)");
setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
for (let i = 0; i < 400; i++) { runtime._step(); if (Number(gv('running')) === 0 && i > 3) break; }
const out = gl('Output');
console.log('=== 输出折行（应为 26 + 14）===');
out.forEach((l, i) => console.log('  行' + (i + 1) + ' len=' + l.length + '  ' + JSON.stringify(l)));
console.log('  拼接长度 = ' + out.join('').length + '（原文 40）');

// --- help screen
setG('busy', 0); setG('running', 0); step(2);
click(27.5, -134.5);
const help = gl('Output');
const expected = JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/help.json', 'utf8'));
console.log('=== HELP ===');
console.log('  行数=' + help.length + '（help.json=' + expected.length + '） 一致=' + (JSON.stringify(help) === JSON.stringify(expected)));
console.log('  最长=' + Math.max(...help.map((l) => l.length)) + '（上限 26）  空行=' + help.filter((l) => l === '').length);
process.exit(0);
