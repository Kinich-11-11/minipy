// PCLIP: the re-cut button row -- 6 letter buttons (42px) + 7 keypad keys
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const sb3 = process.argv[2];
const vm = new VM();
await vm.loadProject(fs.readFileSync(sb3));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
const gl = (n) => { const l = sl(n); return l ? [...l.value].map(String) : []; };
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
const step = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
const K = (k, down) => vm.postIOData('keyboard', { key: k, isDown: down });
const tap = (k) => { K(k, true); step(4); K(k, false); step(3); };
const at = (x, y, down) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, canvasWidth: 480, canvasHeight: 360, isDown: down });
const click = (x, y) => { at(x, y, true); step(4); at(x, y, false); step(4); };
const reset = () => { const C = sl('Code'); C.value.length = 0; C.value.push(''); setG('cursor', 0); setG('hscroll', 0); setG('selected', 1); setG('busy', 0); setG('running', 0); step(2); };
const code = () => gl('Code').join('|');

vm.start(); vm.greenFlag(); step(30);
const R = {};
// keypad centres after the re-cut: TAB 43.5 ENTER 68 BACKSPACE 103 CASE 136 SPEED 162 COPY 188 PASTE 214
reset(); click(52, -129.5); R['TAB'] = code();
reset(); click(95, -129.5); R['ENTER'] = code();
reset(); tap('x'); click(151, -129.5); R['BACKSPACE after x'] = code();
reset(); click(205.5, -129.5); R['CASE'] = 'status=' + gv('status') + ' caps=' + gv('caps');
reset(); click(65.5, -151.5); R['SPEED'] = 'speed=' + gv('speed');
reset(); tap('a'); R['typing still works'] = code();
reset(); click(130.5, -151.5); R['COPY (row 2)'] = 'clip=' + JSON.stringify(gl('ClipL'));
reset(); click(195.5, -151.5); R['PASTE (row 2)'] = 'status=' + gv('status');
// letter buttons: IMPORT EXPORT DEMO NEW UNDO HELP at -209 -165 -121 -77 -33 11
reset(); click(-33, -129.5); R['UNDO button'] = 'status=' + gv('status');
reset(); click(11, -129.5); R['HELP button'] = 'lines=' + gl('Output').length;
reset(); click(-77, -129.5); R['NEW button (asks first)'] = 'busy=' + gv('busy');
// dead zones
reset(); click(240, -151.5); R['right of PASTE (dead)'] = JSON.stringify(code());
reset(); click(33, -129.5); R['letters/keypad seam (dead)'] = JSON.stringify(code());
reset(); click(150, -163); R['below the row (dead)'] = JSON.stringify(code());
reset(); click(150, -60); R['above the row (dead)'] = JSON.stringify(code());

console.log('=== keyboard row ===');
for (const [k, v] of Object.entries(R)) console.log('  ' + k.padEnd(26) + ' => ' + JSON.stringify(v));
vm.stopAll();
process.exit(0);
