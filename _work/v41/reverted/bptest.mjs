// MiniPy v4.34 breakpoint test: real mouse clicks on the line-number gutter,
// the CONTINUE button, STOP while held, and the STEP path with a breakpoint set.
//   node _work/v41/bptest.mjs <sb3>
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const sb3 = process.argv[2] || 'MiniPy_v4.34.sb3';
console.warn = () => {};
console.log = ((c) => (...a) => c(...a))(console.log);
const vm = new VM();
await vm.loadProject(fs.readFileSync(sb3));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName()));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sL = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
const gv = (n) => sv(stage, n) ? sv(stage, n).value : undefined;
const setG = (n, v) => { const x = sv(stage, n); if (x) x.value = v; };
const gl = (n) => (sL(stage, n) ? sL(stage, n).value.map(String) : []);
const scr = (sx, sy) => ({ x: 240 + sx, y: 180 - sy, canvasWidth: 480, canvasHeight: 360 });
const frame = (n) => { for (let i = 0; i < (n || 1); i++) runtime._step(); };
// The Controller polls the mouse in a forever loop with "wait 0.02": the harness steps
// far faster than wall clock, so a click has to *last* a few real milliseconds or the
// loop never sees it (this is a harness artefact, not a product bug -- at 30fps a real
// 100ms click is always caught).
const nap = (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { /* spin */ } };
const click = (sx, sy) => {
  nap(25); frame(3);
  runtime.ioDevices.mouse.postData(Object.assign({ isDown: true }, scr(sx, sy)));
  nap(25); frame(3);
  runtime.ioDevices.mouse.postData(Object.assign({ isDown: false }, scr(sx, sy)));
  nap(20); frame(3);
};
const gutter = (line) => click(-228, 102 - ((line - 1) * 14) - 7);      // the row band of that code line
const RUNBTN = () => click(83, 146);
const STEPBTN = () => click(143, 146);
const STOPBTN = () => click(215, 146);
const CONTBTN = () => click(-35, 150);
const held = () => Number(gv('bwait')) === 1;
const paused = () => String(gv('status')).indexOf('Paused') === 0 || String(gv('status')).indexOf('BP hit') === 0;
let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra === undefined ? '' : '   [' + extra + ']')); }
};
function setCode(lines) {
  const c = sL(stage, 'Code'); c.value.length = 0;
  for (const l of lines) c.value.push(l);
  setG('running', 0); setG('busy', 0); setG('error', ''); setG('stopreq', 0);
  setG('status', 'Ready'); setG('dirty', 1);
  sL(stage, 'Bps').value.length = 0;      // a fresh program has no flags (loadCode/NEW do this)
  setG('bwait', 0); setG('bpOn', 0);
}
function awaitHeld(max) {
  const t0 = Date.now();
  for (let i = 0; i < (max || 400); i++) { runtime._step(); if (held()) return { ok: true, ms: Date.now() - t0, frames: i + 1 }; }
  return { ok: false, ms: Date.now() - t0, frames: max || 400 };
}
function awaitDone(max) {
  for (let i = 0; i < (max || 800); i++) { runtime._step(); if (Number(gv('running')) === 0) return true; }
  return false;
}
vm.start(); vm.greenFlag();
frame(30);

console.log('== A: top level breakpoint, gutter click, CONTINUE ==');
setCode(['a = 1', 'b = 2', 'print(a + b)', "print('done')"]);
gutter(2);
check('gutter click sets Bps[2]', gl('Bps')[1] === '1', JSON.stringify(gl('Bps')));
check('bpOn = 1', Number(gv('bpOn')) === 1, gv('bpOn'));
check('status says BP on line 2', String(gv('status')) === 'BP on line 2', gv('status'));
gutter(2);
check('a quick second click is a debounce, not a toggle', gl('Bps')[1] === '1', JSON.stringify(gl('Bps')));
await new Promise((r) => setTimeout(r, 420));   // the debounce is wall-clock (sensing_timer)
gutter(2);
check('after the debounce the same line toggles off', gl('Bps')[1] === '0', JSON.stringify(gl('Bps')));
check('bpOn = 0 with no flag left', Number(gv('bpOn')) === 0, gv('bpOn'));
await new Promise((r) => setTimeout(r, 420));
gutter(2);
check('set again for the run', gl('Bps')[1] === '1', JSON.stringify(gl('Bps')));
RUNBTN();
const hA = awaitHeld(120);
check('the run stops at the breakpoint', hA.ok, JSON.stringify({ status: gv('status'), pc: gv('pc'), bwait: gv('bwait') }));
check('it stopped on line 2', Number(gv('pc')) === 2, gv('pc'));
check('status reports the hit', String(gv('status')).indexOf('BP hit line 2') === 0, gv('status'));
check('nothing has run yet', gl('Output').join('|') === '', gl('Output').join('|'));
CONTBTN();
check('CONTINUE clears bwait', !held(), gv('bwait'));
awaitDone(400);
check('the program finishes after CONTINUE', Number(gv('running')) === 0 && String(gv('status')) === 'Finished', String(gv('status')));
check('output is complete', gl('Output').join('') === '3done', gl('Output').join('|'));
check('the flag survives the run', gl('Bps').join(',') === '0,1,0,0', gl('Bps').join(','));

console.log('== B: breakpoint inside a function (no warp spin) ==');
setCode(['# Functions', 'def area(w, h):', '    return w * h', 'print(area(3, 4))']);
gutter(3);
check('bp on the return line', gl('Bps')[2] === '1', JSON.stringify(gl('Bps')));
RUNBTN();
const hB = awaitHeld(120);
check('the run stops inside the function', hB.ok && Number(gv('pc')) === 3, JSON.stringify({ status: gv('status'), pc: gv('pc') }));
check('the stop is inside a call', Number(sv(interp, 'cdepth').value) > 0, sv(interp, 'cdepth').value);
check('the stop did not burn a warp frame (<300ms)', hB.ms < 300, hB.ms + 'ms in ' + hB.frames + ' frames');
check('output still empty', gl('Output').join('') === '', gl('Output').join('|'));
CONTBTN();
awaitDone(400);
check('finishes with 12', gl('Output').join('') === '12', gl('Output').join('|'));

console.log('== C: STOP while held hides the button again ==');
setCode(['x = 1', 'x = 2', 'print(x)']);
gutter(2);
RUNBTN();
const hC = awaitHeld(120);
check('held again', hC.ok, gv('status'));
STOPBTN();
frame(6);
check('STOP clears bwait', !held(), gv('bwait'));
check('STOP stopped the run', Number(gv('running')) === 0 && String(gv('status')) === 'Stopped', String(gv('status')));

console.log('== D: STEP with a breakpoint set still advances one line per click ==');
setCode(['a = 1', 'b = 2', 'c = 3', 'print(a + b + c)']);
gutter(3);
STEPBTN();
const seq = [];
for (let i = 0; i < 3; i++) {
  let ok = false;
  for (let k = 0; k < 200; k++) { runtime._step(); if (paused()) { ok = true; break; } if (Number(gv('running')) === 0) break; }
  seq.push({ pc: gv('pc'), ok, status: gv('status') });
  if (Number(gv('running')) === 0) break;
  STEPBTN();
}
check('3 STEP clicks paused at pc 2,3,4 (one line each)', JSON.stringify(seq.map((s) => Number(s.pc))) === '[2,3,4]', JSON.stringify(seq.map((s) => s.pc)));
check('the pause on the flagged line says BP hit', String(seq[1].status).indexOf('BP hit line 3') === 0, seq[1].status);
check('STEP pauses never show the CONTINUE button', Number(gv('bwait')) === 0, gv('bwait'));

console.log('== E: the code area still selects, the gutter does not edit ==');
setCode(['print(1)', 'print(2)', 'print(3)']);
click(-100, 88);                            // code text, row 2
check('clicking the text selects line 2', Number(gv('selected')) === 2, gv('selected'));
click(-228, 88);                            // the same row on the gutter
check('clicking the gutter does not move the caret', Number(gv('selected')) === 2, gv('selected'));
check('no editor prompt was opened', String(gv('status')) !== 'Waiting for input' && String(gv('status')) !== 'Edited', gv('status'));
check('the code line is untouched', gl('Code')[1] === 'print(2)', gl('Code')[1]);

console.log('== F: typing keeps the flags aligned with the code ==');
setCode(['a = 1', 'b = 2', 'c = 3']);
gutter(3);
check('flag on line 3', gl('Bps').join(',') === '0,0,1', gl('Bps').join(','));
click(-100, 74);                              // caret on line 3 (row 3)
runtime.startHats('event_whenkeypressed', { KEY_OPTION: 'enter' });
frame(6);
check('ENTER adds a line', gl('Code').length === 4, JSON.stringify(gl('Code')));
check('the flags grew with the code', gl('Bps').join(',') === '0,0,1,0', gl('Bps').join(','));
runtime.startHats('event_whenkeypressed', { KEY_OPTION: 'backspace' });
frame(6);
check('BACKSPACE merges the lines back', gl('Code').length === 3, JSON.stringify(gl('Code')));
check('the flags shrank with the code', gl('Bps').join(',') === '0,0,1', gl('Bps').join(','));

console.log('== G: a breakpoint on a one-liner body (lines are split at run start) ==');
setCode(['a = 1', "if a > 0: print('hi')", "print('end')"]);
gutter(2);
RUNBTN();
const hG = awaitHeld(120);
check('stops on the split head line', hG.ok && Number(gv('pc')) === 2, JSON.stringify({ status: gv('status'), pc: gv('pc') }));
check('the panel shows the split code', gl('Code')[1] === 'if a > 0:' && gl('Code')[2] === "    print('hi')", JSON.stringify(gl('Code')));
check('the flag stayed on the first half', gl('Bps').join(',') === '0,1,0,0', gl('Bps').join(','));
CONTBTN();
awaitDone(400);
check('finishes after CONTINUE', gl('Output').join('') === 'hiend', gl('Output').join('|'));
check('flags and code still have the same length', gl('Bps').length === gl('Code').length, gl('Bps').length + '/' + gl('Code').length);

console.log('== H: breakpoint inside a class method ==');
setCode(['class Point:', '    def __init__(self, x, y):', '        self.x = x', '        self.y = y', '    def norm2(self):', '        return self.x * self.x + self.y * self.y', 'p = Point(3, 4)', 'print(p.norm2())']);
gutter(6);
RUNBTN();
const hH = awaitHeld(120);
check('stops inside the method', hH.ok && Number(gv('pc')) === 6, JSON.stringify({ status: gv('status'), pc: gv('pc'), cdepth: sv(interp, 'cdepth').value }));
CONTBTN();
awaitDone(400);
check('the method ran (25)', gl('Output').join('') === '25', gl('Output').join('|'));

console.log('== I: breakpoint inside a generator ==');
setCode(['def squares(n):', '    for i in range(n):', '        yield i * i', 'print(list(squares(3)))']);
gutter(3);
RUNBTN();
const hI = awaitHeld(120);
check('stops inside the generator', hI.ok && Number(gv('pc')) === 3, JSON.stringify({ status: gv('status'), pc: gv('pc') }));
// the breakpoint sits on the yield line, so a loop hits it once per iteration:
// CONTINUE has to be pressed until the run really ends.
let shots = 0;
while (Number(gv('running')) === 1 && shots < 10) { CONTBTN(); awaitDone(200); shots++; }
// NOTE: the *output* of this shape is wrong on v4.33 as well ([0] instead of [0, 1, 4]):
// a "for" loop inside a generator only yields the first value -- a pre-existing engine
// limit, unrelated to breakpoints (verified by running the same case on MiniPy_v4.33.sb3).
// What this scenario checks is only that a breakpoint inside a generator body stops the
// run and that CONTINUE resumes it.
check('the run ended after resuming', Number(gv('running')) === 0, String(gv('status')));
check('one CONTINUE resumed it to the end', shots === 1, shots);
check('pre-existing generator loop limit is unchanged', gl('Output').join('') === '[0]', gl('Output').join('|'));

console.log('');
console.log('pass=' + pass + '  fail=' + fail);
process.exit(fail ? 1 : 0);


