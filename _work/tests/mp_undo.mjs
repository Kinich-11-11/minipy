// PUNDO verification (fixed): DOM key names for multi-char keys, real bottom-bar coords
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
const K = (k, d) => vm.postIOData('keyboard', { key: k, isDown: d });
const tap = (k) => { K(k, true); step(4); K(k, false); step(3); };
const at = (x, y, d) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, canvasWidth: 480, canvasHeight: 360, isDown: d });
const click = (x, y) => { at(x, y, true); step(4); at(x, y, false); step(4); };
const UNDO = [-19.5, -134.5], DEMO = [-113.5, -134.5], NEW = [-66.5, -134.5];
const reset = () => {
  const C = sl('Code'); C.value.length = 0; C.value.push('');
  sl('Undo').value.length = 0; sl('UndoLen').value.length = 0;
  setG('saved', 0); setG('cursor', 0); setG('hscroll', 0); setG('selected', 1); setG('busy', 0); setG('running', 0);
  step(2);
};
const L = () => [...sl('UndoLen').value].map(String).join(',');
vm.start(); vm.greenFlag(); step(30);

console.log('=== 1. 连续打字算一步，回车结束这一步 ===');
reset();
tap('a'); tap('b');
console.log('  "ab"        Code=' + JSON.stringify(gl('Code')) + '  frames=[' + L() + ']');
tap('Enter');
tap('c');
console.log('  Enter+"c"   Code=' + JSON.stringify(gl('Code')) + '  frames=[' + L() + ']');
for (let i = 1; i <= 3; i++) {
  click(UNDO[0], UNDO[1]);
  console.log('  UNDO#' + i + '      Code=' + JSON.stringify(gl('Code')) + '  frames=[' + L() + ']  status=' + JSON.stringify(gv('status')));
}

console.log('\n=== 2. 退格与移光标也开新的一步 ===');
reset();
tap('x'); tap('y'); click(147, -134.5); tap('z');   // 屏幕上的 BACKSPACE（这个 VM 副本不跟踪物理 Backspace 键）
console.log('  "xy"+BS+"z" Code=' + JSON.stringify(gl('Code')) + '  frames=[' + L() + ']');
click(UNDO[0], UNDO[1]);
console.log('  UNDO        Code=' + JSON.stringify(gl('Code')) + '  frames=[' + L() + ']');

console.log('\n=== 3. 深度上限 = 50 ===');
reset();
for (let i = 0; i < 60; i++) { tap('a'); tap('ArrowRight'); }
console.log('  60 步后      frames=' + sl('UndoLen').value.length + '  Undo 项数=' + sl('Undo').value.length + '  Code[0] 长度=' + gl('Code')[0].length);
let back = 0;
for (let i = 0; i < 60; i++) { const b = JSON.stringify(gl('Code')); click(UNDO[0], UNDO[1]); if (JSON.stringify(gl('Code')) !== b) back++; else break; }
console.log('  连续撤销 ' + back + ' 步（应=50）  最终 Code=' + JSON.stringify(gl('Code')) + '  status=' + JSON.stringify(gv('status')));

console.log('\n=== 3b. 字符数上限：连打 25 个字符不再是一步 ===');
reset();
for (let i = 0; i < 25; i++) tap('a');
console.log('  连打 25 字符  frames=[' + [...sl('UndoLen').value].map(String).join(',') + ']  Code[0] 长度=' + gl('Code')[0].length);
for (let i = 1; i <= 4; i++) {
  click(UNDO[0], UNDO[1]);
  console.log('  UNDO#' + i + '        Code[0] 长度=' + (gl('Code')[0] || '').length + '  frames=[' + [...sl('UndoLen').value].map(String).join(',') + ']');
}

console.log('\n=== 3c. 刚好 10 个字符内不切断 ===');
reset();
for (let i = 0; i < 10; i++) tap('a');
console.log('  10 字符       frames=[' + [...sl('UndoLen').value].map(String).join(',') + ']  (只应有开头那一帧)');

console.log('\n=== 3d. 静置超过 2 秒后下一击开新一步 ===');
reset();
tap('a'); tap('b');
console.log('  连打 ab       Code=' + JSON.stringify(gl('Code')) + '  frames=[' + [...sl('UndoLen').value].map(String).join(',') + ']');
setG('utime', 0);                       // 假装上次编辑是很久以前
tap('c');
console.log('  停顿后打 c    Code=' + JSON.stringify(gl('Code')) + '  frames=[' + [...sl('UndoLen').value].map(String).join(',') + ']');
click(UNDO[0], UNDO[1]);
console.log('  UNDO          Code=' + JSON.stringify(gl('Code')) + '  frames=[' + [...sl('UndoLen').value].map(String).join(',') + ']  status=' + JSON.stringify(gv('status')));
setG('utime', 0);
tap('d');
console.log('  再停顿打 d    Code=' + JSON.stringify(gl('Code')) + '  frames=[' + [...sl('UndoLen').value].map(String).join(',') + ']');

console.log('\n=== 5. 0 行保护（Code 空列表是死状态）===');
reset();
sl('Code').value.length = 0;                       // Code = 0 行
sl('Undo').value.length = 0;
sl('UndoLen').value.length = 0; sl('UndoLen').value.push(0);   // 一帧，帧长 0
click(UNDO[0], UNDO[1]);
console.log('  注入 0 行帧后 UNDO   Code=' + JSON.stringify(gl('Code')) + ' (' + gl('Code').length + ' 行) status=' + JSON.stringify(gv('status')));
tap('a');
console.log('  再打 a               Code=' + JSON.stringify(gl('Code')));
reset();
sl('Code').value.length = 0;                       // 打字前就是 0 行、且没有帧
tap('a');
console.log('  0 行时直接打 a       Code=' + JSON.stringify(gl('Code')));
click(UNDO[0], UNDO[1]);
console.log('  UNDO                 Code=' + JSON.stringify(gl('Code')) + ' (' + gl('Code').length + ' 行)');

console.log('\n=== 4. DEMO / NEW 也可撤销 ===');
reset();
click(DEMO[0], DEMO[1]);
const n = gl('Code').length;
click(UNDO[0], UNDO[1]);
console.log('  DEMO 载入 ' + n + ' 行 -> UNDO 后 ' + JSON.stringify(gl('Code')) + '  status=' + JSON.stringify(gv('status')));
vm.stopAll();
process.exit(0);
