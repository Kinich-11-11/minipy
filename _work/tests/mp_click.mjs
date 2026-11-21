// checks the editor's click -> column / row mapping after the pitch change (5.1 -> 5.87)
// and the hscroll window (49 -> 44).  The caret/bar *drawing* can't be read back from
// the pen layer, so this checks the two controller constants behaviourally; the drawn
// geometry is checked by _work/v41/uigeom.cjs against the built project.json.
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const sb3 = process.argv[2];
const vm = new VM();
await vm.loadProject(fs.readFileSync(sb3));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
const step = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
const K = (k, down) => vm.postIOData('keyboard', { key: k, isDown: down });
const tap = (k) => { K(k, true); step(4); K(k, false); step(3); };
const at = (x, y, down) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, canvasWidth: 480, canvasHeight: 360, isDown: down });
const click = (x, y) => { at(x, y, true); step(4); at(x, y, false); step(4); };
const LINE = '0123456789'.repeat(6);          // 60 chars
const LINES = 5;
// the runtime quantises the mouse to whole canvas pixels, so a click at x really
// arrives at round(x + 240) - 240
const quant = (x) => Math.round(x + 240) - 240;
const reset = (n) => {
  const C = sl('Code'); C.value.length = 0;
  for (let i = 0; i < LINES; i++) C.value.push(LINE.slice(0, n || 60));
  setG('cursor', 0); setG('hscroll', 0); setG('selected', 1); setG('page', 1); setG('busy', 0); setG('running', 0); setG('saved', 1); step(3);
};

vm.start(); vm.greenFlag(); step(30);
const PITCH = 5.87, OLD = 5.1, LEFT = -201;
let bad = 0;
const ck = (what, got, want) => { const ok = String(got) === String(want); if (!ok) bad++; console.log((ok ? '  OK   ' : '  FAIL ') + what.padEnd(34) + ' got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want)); };

console.log('=== click -> column (60-char line, hscroll 0) ===');
for (const raw of [-200, -195.2, -189.3, -180, -100, 0, 20, 34.4, 57]) {
  const ux = quant(raw);
  reset();
  click(raw, 100);
  const cur = Number(gv('cursor'));
  const want = Math.max(0, Math.min(60, Math.floor((ux - LEFT) / PITCH)));
  const old = Math.max(0, Math.min(60, Math.floor((ux - LEFT) / OLD)));
  // the caret must land on the clicked column: caretX <= ux < caretX + pitch
  const caretX = LEFT + cur * PITCH;
  const onCol = ux >= caretX - 1e-9 && ux < caretX + PITCH;
  console.log('  click x=' + String(raw).padStart(7) + ' (lands at ' + String(ux).padStart(4) + ')  cursor=' + String(cur).padStart(3) + '  want(new pitch)=' + String(want).padStart(3) + '  (old 5.1 would give ' + String(old).padStart(3) + ')  caretX=' + caretX.toFixed(2) + '  on-column=' + onCol);
  if (cur !== want || !onCol) bad++;
}

console.log('=== click -> row (cell = (92-14i, 106-14i], page 1) ===');
for (const uy of [105, 100, 92.5, 91, 90, 78, 77]) {
  const landed = 180 - Math.round(180 - uy);      // same canvas quantisation
  const want = Math.max(1, Math.min(LINES, 1 + Math.floor((106 - landed) / 14)));
  reset();
  click(0, uy);
  ck('uy=' + uy + ' (lands ' + landed + ') -> selected', gv('selected'), want);
}

console.log('=== hscroll window (44 columns) ===');
reset();
setG('cursor', 55); setG('hscroll', 0);
tap('ArrowLeft');
ck('cursor after ArrowLeft', gv('cursor'), 54);
ck('hscroll = cursor - 44', gv('hscroll'), 10);
reset();
setG('cursor', 45); setG('hscroll', 0);
click(0, 100);                                   // click sets cursor, then keepCursor
console.log('  click col 34 with cursor 45 -> cursor=' + gv('cursor') + ' hscroll=' + gv('hscroll'));
ck('hscroll for cursor 34', gv('hscroll'), 0);

console.log('=== dead zones ===');
reset(); click(59, 100); ck('ux=59 (outside hit test) leaves cursor', gv('cursor'), 0);
reset(); click(70, -100); ck('ux=70 (right panel) leaves cursor', gv('cursor'), 0);

console.log(bad === 0 ? '\nALL OK' : '\n' + bad + ' FAILURES');
vm.stopAll();
process.exit(bad === 0 ? 0 : 1);
