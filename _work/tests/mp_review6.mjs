
import fs from 'fs';
import VM from 'scratch-vm';
const out = []; const say = (...a) => out.push(a.join(' '));
let pass = 0, fail = 0;
const chk = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (ok) pass++; else fail++; say((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : '  got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want))); };
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const runtime = vm.runtime;
const stage = runtime.getTargetForStage();
const all = (t) => Object.values(t.variables || {});
const gv = (n) => { const v = all(stage).find(v => v.name === n && v.type !== 'list'); return v ? v.value : undefined; };
const num = (n) => Number(gv(n));
const setG = (n, val) => { all(stage).find(v => v.name === n).value = val; };
const gl = (n) => { const l = all(stage).find(v => v.name === n && v.type === 'list'); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
const step = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const mouseTo = (sx, sy) => vm.postIOData('mouse', { x: sx + 240, y: 180 - sy, canvasWidth: 480, canvasHeight: 360 });
async function click(sx, sy, gap) {
  mouseTo(sx, sy); await sleep(gap || 45); step(3);
  vm.postIOData('mouse', { x: sx + 240, y: 180 - sy, canvasWidth: 480, canvasHeight: 360, isDown: true });
  await sleep(gap || 45); step(4);
  vm.postIOData('mouse', { x: sx + 240, y: 180 - sy, canvasWidth: 480, canvasHeight: 360, isDown: false });
  await sleep(gap || 45); step(4);
}
async function waitFor(pred, maxFrames) {
  for (let i = 0; i < (maxFrames || 300); i++) { runtime._step(); if (pred()) return true; await sleep(4); }
  return false;
}
// keep answering until the expected effect shows up (a stray ANSWER is harmless)
async function answerUntil(text, pred, maxFrames) {
  for (let i = 0; i < (maxFrames || 300); i++) {
    runtime.emit('ANSWER', text);
    runtime._step();
    if (pred()) return true;
    await sleep(6);
  }
  return false;
}
async function haltProgram() {
  setG('stopreq', 1); setG('running', 0);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  step(10); await sleep(20); step(10);
  setG('busy', 0); setG('stopreq', 0);
}
vm.start(); vm.greenFlag(); step(20);

// ---------- P2-4 console follow while paused at input() ----------
const prog = [];
for (let i = 1; i <= 30; i++) prog.push('print(' + i + ')');
prog.push("p1 = input('wait1')");
prog.push('print(31)');
const codeVar = all(stage).find(v => v.name === 'Code');
codeVar.value.length = 0; for (const l of prog) codeVar.value.push(l);
setG('speed', 1); setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1);
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
chk('program paused at input()', await waitFor(() => String(gv('status')) === 'Waiting for input', 300), true);
chk('console shows the last page while paused', num('outpage'), 22);
setG('outpage', 5);
await answerUntil('go', () => num('running') === 0, 300);
chk('program finished after the answer', num('running'), 0);
chk('reading up: the run does not pull the view back', num('outpage'), 5);
chk('all 31 lines were printed', gl('Output').length, 31);
await haltProgram();

// ---------- P2-1 line editor via double click ----------
setG('speed', 1);
const cv = all(stage).find(v => v.name === 'Code');
cv.value.length = 0; cv.value.push('a = 1'); cv.value.push('b = 2');
setG('selected', 2); setG('cursor', 0);
await click(-218, 5, 40);
await sleep(60);
await click(-218, 5, 40);
chk('double click on the line number opens the editor', await waitFor(() => num('busy') === 1, 300), true);
await answerUntil('b = 42', () => gl('Code')[1] === 'b = 42', 300);
chk('line editor replaced that line', gl('Code'), ['a = 1', 'b = 42']);
await haltProgram();

// ---------- P1-3 IMPORT pipe handling ----------
cv.value.length = 0; cv.value.push('a = 1');
setG('selected', 1); setG('cursor', 0);
await click(-214, -134, 60);
chk('IMPORT asks for text', await waitFor(() => num('busy') === 1, 300), true);
await answerUntil('x = 1|y = 2', () => gl('Code').length === 2, 300);
chk('IMPORT splits on a bare pipe', gl('Code'), ['x = 1', 'y = 2']);
await haltProgram();
await click(-214, -134, 60);
chk('IMPORT asks again', await waitFor(() => num('busy') === 1, 300), true);
await answerUntil('c = 3\\|d = 4', () => (gl('Code')[0] || '').indexOf('|') > 0, 300);
chk('IMPORT keeps an escaped pipe inside one line', gl('Code'), ['c = 3|d = 4']);
console.log(out.join('\n'));
console.log('passed ' + pass + ' / ' + (pass + fail));
process.exit(0);
