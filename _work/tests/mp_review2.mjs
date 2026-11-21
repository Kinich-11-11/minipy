
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
async function runProgram(lines, cap) {
  const codeVar = all(stage).find(v => v.name === 'Code');
  codeVar.value.length = 0; for (const l of lines) codeVar.value.push(l);
  setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let frames = 0;
  for (let i = 0; i < (cap || 3000); i++) {
    runtime._step(); frames = i + 1;
    if (num('running') === 0 && i > 3) break;
  }
  return { out: gl('Output'), frames, status: gv('status'), error: gv('error') };
}
vm.start(); vm.greenFlag(); step(20);
const prog = []; for (let i = 1; i <= 60; i++) prog.push('print(' + i + ')');
setG('speed', 1);
const fast = await runProgram(prog);
setG('speed', 0);
const slow = await runProgram(prog);
say('  fast: ' + fast.frames + ' frames | slow: ' + slow.frames + ' frames (60 lines)');
chk('fast and slow produce the same output', fast.out, slow.out);
chk('fast mode finishes in far fewer frames', fast.frames * 3 < slow.frames, true);
setG('speed', 1);
chk('pow huge exponent refused', (await runProgram(['print(pow(2, 100000))'])).error, 'ValueError: pow() exponent too large');
chk('round huge ndigits refused', (await runProgram(['print(round(1.5, 999))'])).error, 'ValueError: round() ndigits out of range');
chk('pow still works', (await runProgram(['print(pow(2, 10))'])).out, ['1024']);
chk('round still works', (await runProgram(['print(round(3.14159, 3))'])).out, ['3.142']);
const terms = []; for (let i = 1; i <= 30; i++) terms.push(String(i));
chk('30 term sum works now', (await runProgram(['print(' + terms.join(' + ') + ')'])).out, ['465']);
const many = []; for (let i = 1; i <= 30; i++) many.push('print(' + i + ')');
await runProgram(many);
const codeVar = all(stage).find(v => v.name === 'Code');
setG('outpage', 5);
codeVar.value.push('print(31)');
setG('running', 1); setG('stopreq', 0); setG('ticket', 1); setG('mode', 0);
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
for (let i = 0; i < 60; i++) { runtime._step(); if (num('running') === 0 && i > 3) break; }
chk('reading up: console stays where the reader put it', num('outpage'), 5);
setG('outpage', 23);
codeVar.value.push('print(32)');
setG('running', 1); setG('stopreq', 0); setG('ticket', 1); setG('mode', 0);
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
for (let i = 0; i < 60; i++) { runtime._step(); if (num('running') === 0 && i > 3) break; }
chk('at the bottom: console follows new output', num('outpage') > 23, true);
const cv = all(stage).find(v => v.name === 'Code');
cv.value.length = 0; cv.value.push('a = 1'); cv.value.push('b = 2');
setG('selected', 2); setG('cursor', 0); setG('busy', 0); setG('running', 0); setG('speed', 1);
await click(-218, 5, 40);
await sleep(60);
await click(-218, 5, 40);
for (let i = 0; i < 60; i++) { runtime._step(); if (num('busy') === 1) break; }
chk('double click on the line number opens the editor', num('busy'), 1);
await sleep(30); step(4);
runtime.emit('ANSWER', 'b = 42');
for (let i = 0; i < 60; i++) { runtime._step(); if (num('busy') === 0 && i > 3) break; }
chk('line editor replaced that line', gl('Code'), ['a = 1', 'b = 42']);
setG('busy', 0); setG('running', 0);
await click(-214, -134, 60);
for (let i = 0; i < 60; i++) { runtime._step(); if (num('busy') === 1) break; }
await sleep(30); step(4);
runtime.emit('ANSWER', 'x = 1|y = 2');
for (let i = 0; i < 80; i++) { runtime._step(); if (num('busy') === 0 && i > 3) break; }
chk('IMPORT splits on a bare pipe', gl('Code'), ['x = 1', 'y = 2']);
setG('busy', 0); setG('running', 0);
await click(-214, -134, 60);
for (let i = 0; i < 60; i++) { runtime._step(); if (num('busy') === 1) break; }
await sleep(30); step(4);
runtime.emit('ANSWER', 'a = 1\\|b = 2');
for (let i = 0; i < 80; i++) { runtime._step(); if (num('busy') === 0 && i > 3) break; }
chk('IMPORT keeps an escaped pipe inside a line', gl('Code'), ['a = 1|b = 2']);
console.log(out.join('\n'));
console.log('passed ' + pass + ' / ' + (pass + fail));
process.exit(0);
