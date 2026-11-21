// PCLIP: drag-select, copy, paste, double-click line select, replace-on-type
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const sb3 = process.argv[2];
const vm = new VM();
await vm.loadProject(fs.readFileSync(sb3));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(n); return l ? [...l.value].map(String) : []; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
const step = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
const K = (k, down) => vm.postIOData('keyboard', { key: k, isDown: down });
const tap = (k) => { K(k, true); step(4); K(k, false); step(3); };
const at = (x, y, down) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, canvasWidth: 480, canvasHeight: 360, isDown: down });
const click = (x, y) => { at(x, y, true); step(5); at(x, y, false); step(6); };
const drag = (x1, y1, x2, y2) => { at(x1, y1, true); step(5); at(x2, y2, true); step(6); at(x2, y2, false); step(6); };
const X = (col) => -201 + col * 5.87 + 1;      // stage x just inside column `col`
const Y = (row) => 106 - (row - 1) * 14 - 7;   // middle of row `row` (page 1)
const COPY = [130.5, -151.5], PASTE = [195.5, -151.5], BACKSPACE = [151, -129.5];   // COPY/PASTE moved to keypad row 2
const LINES = ['alpha = 1', 'beta = 2', 'gamma = 3', 'delta = 4', 'epsilon = 5', 'zeta = 6'];

// an independent model of what the selection means (0-based columns, half open)
const mSel = (a1, c1, a2, c2) => {
  const out = [];
  for (let L = a1; L <= a2; L++) {
    const s = LINES[L - 1];
    if (a1 === a2) out.push(s.slice(c1, c2));
    else if (L === a1) out.push(s.slice(c1));
    else if (L === a2) out.push(s.slice(0, c2));
    else out.push(s);
  }
  return out;
};
const mDel = (lines, a1, c1, a2, c2) => {
  const L = lines.slice();
  if (a1 === a2) L[a1 - 1] = L[a1 - 1].slice(0, c1) + L[a1 - 1].slice(c2);
  else { L[a1 - 1] = L[a1 - 1].slice(0, c1) + L[a2 - 1].slice(c2); L.splice(a1, a2 - a1); }
  return L;
};
const mPaste = (lines, ln, col, clip) => {
  const L = lines.slice();
  const pre = L[ln - 1].slice(0, col), post = L[ln - 1].slice(col);
  if (clip.length === 1) L[ln - 1] = pre + clip[0] + post;
  else {
    L[ln - 1] = pre + clip[0];
    L.splice(ln, 0, ...clip.slice(1, clip.length - 1));
    L.splice(ln + clip.length - 2, 0, clip[clip.length - 1] + post);
  }
  return L;
};

const reset = () => {
  const C = sl('Code'); C.value.length = 0; for (const l of LINES) C.value.push(l);
  setG('cursor', 0); setG('hscroll', 0); setG('selected', 1); setG('page', 1);
  setG('busy', 0); setG('running', 0); setG('saved', 1); setG('selOn', 0); setG('dragSel', 0);
  setG('clipN', 0); setG('csl', ''); setG('csi', 0); setG('csj', 0); setG('dblT', -99);
  const L = sl('ClipL'); if (L) L.value.length = 0;
  step(3);
};
const selStr = () => gv('selOn') + ' [' + gv('selL1') + ':' + gv('selC1') + '..' + gv('selL2') + ':' + gv('selC2') + ']';
let bad = 0;
const ck = (what, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? '  OK   ' : '  FAIL ') + what.padEnd(36) + ' got=' + JSON.stringify(got) + (ok ? '' : '\n         want=' + JSON.stringify(want))); };

vm.start(); vm.greenFlag(); step(30);

console.log('=== 1. drag (row1 col0 -> row2 col5) ===');
reset();
drag(X(0), Y(1), X(5), Y(2));
ck('selection', selStr(), '1 [1:0..2:5]');
ck('status', String(gv('status')), 'Selected lines 1-2');

console.log('=== 2. COPY copies exactly the selected text ===');
click(...COPY);
ck('clipboard', gl('ClipL'), mSel(1, 0, 2, 5));
ck('clipN', Number(gv('clipN')), 2);
ck('status (not clobbered by the button press)', String(gv('status')), 'Copied 2 line(s)');

console.log('=== 3. PASTE inserts at the caret (no selection) ===');
click(X(0), Y(5));
ck('caret', selStr(), '0 [5:0..5:0]');
click(...PASTE);
ck('code', gl('Code'), mPaste(LINES, 5, 0, mSel(1, 0, 2, 5)));
ck('caret after paste', Number(gv('selected')) + ':' + Number(gv('cursor')), '6:5');
ck('status', String(gv('status')), 'Pasted 2 line(s)');

console.log('=== 4. PASTE replaces an active selection ===');
reset();
drag(X(0), Y(1), X(4), Y(1));            // "alph"
click(...COPY);
ck('clipboard', gl('ClipL'), ['alph']);
drag(X(2), Y(3), X(7), Y(3));            // "mma = 3" -> "mma = "
ck('selection', selStr(), '1 [3:2..3:7]');
click(...PASTE);
ck('code', gl('Code'), mPaste(mDel(LINES, 3, 2, 3, 7), 3, 2, ['alph']));

console.log('=== 5. double click inside the text selects the whole line ===');
reset();
click(X(3), Y(2));
click(X(3), Y(2));
ck('selection', selStr(), '1 [2:0..2:' + LINES[1].length + ']');
ck('status', String(gv('status')), 'Selected line 2');

console.log('=== 6. typing replaces the selection ===');
reset();
drag(X(0), Y(2), X(4), Y(2));            // "beta"
ck('selection', selStr(), '1 [2:0..2:4]');
tap('z');
ck('code[2]', gl('Code')[1], 'z' + LINES[1].slice(4));
ck('selection gone', String(gv('selOn')), '0');
ck('caret', Number(gv('cursor')), 1);

console.log('=== 7. BACKSPACE deletes only the selection ===');
reset();
drag(X(0), Y(3), X(7), Y(3));            // "gamma ="
ck('selection', selStr(), '1 [3:0..3:7]');
click(...BACKSPACE);
ck('code[3]', gl('Code')[2], LINES[2].slice(7));
ck('selection gone', String(gv('selOn')), '0');
ck('caret', Number(gv('cursor')), 0);
click(...BACKSPACE);                     // now it eats one more char, as usual
ck('joined line after a 2nd backspace', gl('Code')[1], LINES[1] + LINES[2].slice(7));
ck('one line fewer', gl('Code').length, LINES.length - 1);

console.log('=== 8. COPY with no selection takes the whole line ===');
reset();
click(X(3), Y(4));
click(...COPY);
ck('clipboard', gl('ClipL'), [LINES[3]]);
ck('status', String(gv('status')), 'Copied line 4');

console.log('=== 9. arrows and plain clicks collapse the selection ===');
reset();
drag(X(0), Y(1), X(5), Y(2));
ck('before', String(gv('selOn')), '1');
tap('ArrowRight');
ck('after ArrowRight', String(gv('selOn')), '0');
drag(X(0), Y(1), X(5), Y(2));
click(X(2), Y(3));
ck('after a click elsewhere', String(gv('selOn')), '0');

console.log('=== 10. copy/paste are inert while the program runs ===');
reset();
setG('running', 1);
click(...COPY); click(...PASTE);
ck('clipboard', gl('ClipL'), []);
ck('code untouched', gl('Code'), LINES);
setG('running', 0);

console.log('=== 11. round trip: copy 3 lines, paste them further down ===');
reset();
drag(X(1), Y(1), X(6), Y(3));
click(...COPY);
const round = gl('ClipL');
ck('copied 3 lines', round, mSel(1, 1, 3, 6));
// restore the document but KEEP the clipboard
{ const C = sl('Code'); C.value.length = 0; for (const l of LINES) C.value.push(l); }
setG('selected', 6); setG('cursor', 0); setG('page', 1); setG('selOn', 0); setG('hscroll', 0); step(3);
click(...PASTE);
ck('code', gl('Code'), mPaste(LINES, 6, 0, round));

console.log(bad === 0 ? '\nALL OK' : '\n' + bad + ' FAILURES');
vm.stopAll();
process.exit(bad === 0 ? 0 : 1);


