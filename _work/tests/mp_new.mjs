
import fs from 'fs';
import VM from 'scratch-vm';
const out = []; const say = (...a) => out.push(a.join(' '));
let pass = 0, fail = 0;
const chk = (n, got, want) => { const ok = String(got) === String(want); if (ok) pass++; else fail++; say((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : '  got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want))); };
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const runtime = vm.runtime;
const stage = runtime.getTargetForStage();
const all = (t) => Object.values(t.variables || {});
const gv = (n) => { const v = all(stage).find(v => v.name === n && v.type !== 'list'); return v ? v.value : undefined; };
const ctrl = runtime.targets.find(t => t.getName() === 'Controller');
const setG = (n, val) => { all(stage).find(v => v.name === n).value = val; };
const getC = (n) => { const v = all(ctrl).find(v => v.name === n); return v ? v.value : undefined; };
const setC = (n, val) => { const v = all(ctrl).find(v => v.name === n); if (v) v.value = val; };
const gl = (n) => { const l = all(stage).find(v => v.name === n && v.type === 'list'); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
const step = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const mouseTo = (sx, sy) => vm.postIOData('mouse', { x: sx + 240, y: 180 - sy, canvasWidth: 480, canvasHeight: 360 });
async function click(sx, sy) {
  mouseTo(sx, sy); await sleep(45); step(3);
  vm.postIOData('mouse', { x: sx + 240, y: 180 - sy, canvasWidth: 480, canvasHeight: 360, isDown: true });
  await sleep(45); step(5);
  vm.postIOData('mouse', { x: sx + 240, y: 180 - sy, canvasWidth: 480, canvasHeight: 360, isDown: false });
  await sleep(45); step(5);
}
async function keyOnce(k) {
  vm.postIOData('keyboard', { key: k, isDown: true }); await sleep(45); step(4);
  vm.postIOData('keyboard', { key: k, isDown: false }); await sleep(45); step(4);
}
async function runProgram(lines, answers) {
  const codeVar = all(stage).find(v => v.name === 'Code');
  codeVar.value.length = 0; for (const l of lines) codeVar.value.push(l);
  setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  const q = (answers || []).slice();
  for (let i = 0; i < 500; i++) {
    runtime._step();
    if (q.length && gv('status') === 'Waiting for input') { runtime.emit('ANSWER', q.shift()); await sleep(25); }
    if (gv('running') === 0 && i > 3) break;
  }
  return gl('Output');
}
vm.start(); vm.greenFlag(); step(20);

// ---------- HELP ----------
await click(27, -134);
const help = gl('Output');
chk('HELP has 121 lines', help.length, 121);
chk('HELP: no line was auto-wrapped (all <= 30 chars)', help.every(l => l.length <= 30), true);
chk('HELP title', help[0], 'QUICK HELP');
chk('HELP mentions the CASE switch', help.join('\n').includes('CASE=A/a'), true);
chk('HELP mentions 13 demos', help.join('\n').includes('13 samples'), true);
chk('HELP mentions the scroll rule', help.join('\n').includes('UP/DOWN'), true);
say('  help lines: ' + JSON.stringify(help));

// ---------- CASE (was "Aa") case switch ----------
// the button row was re-cut twice since this test was written: P199 dropped the
// on-screen symbol keys (punctuation now comes from the physical keyboard) and
// PCLIP split the row in two, so CASE sits at (205.5, -129.5) now.
setC('caps', 0);
let codeVar = all(stage).find(v => v.name === 'Code');
codeVar.value.length = 0; codeVar.value.push(''); setG('selected', 1); setG('cursor', 0);
await click(205.5, -129.5);                   // CASE
chk('CASE: first click turns upper case on', getC('caps'), 1);
chk('CASE: status shows upper', String(gv('status')).includes('UPPER'), true);
await keyOnce('a');
await keyOnce('b');
chk('CASE on: letter keys type capitals', gl('Code')[0], 'AB');
setG('cursor', 2);
await click(205.5, -129.5);                   // toggle back
chk('CASE: second click turns upper case off', getC('caps'), 0);
chk('CASE: status shows lower', String(gv('status')).includes('lower'), true);
await keyOnce('c');
chk('CASE off: letter keys type lower case again', gl('Code')[0], 'ABc');
setG('cursor', 3);
await keyOnce('*');                           // a symbol key still inserts symbols
chk('symbols unaffected by the case switch', gl('Code')[0], 'ABc*');

// ---------- DEMO: cycle through all 13 and run each ----------
// v4.56 P56 grew the sample set from 8 to 13; these outputs are the recorded
// behaviour of the shipped build (demo 13 is the one that calls input()).
const expected = [
  ['12', 'Hello, MiniPy', 'Yo, Py'],
  ['120', '13', '14'],
  ['HELLO MINIPY', 'hello minipy', 'Hello World', 'True', '2', '12', 'MiniPy'],
  ['[1, 2, 3, 4]', '1 4 4 10', '[2, 3]', '[0, 1, 4, 9, 16, 25]', '[0, 4, 16]'],
  ['2 1', '7', '(3, 1)', '2 1'],
  ['3', '6', '1 2 3'],
  ['caught divide by zero', 'caught raise'],
  ['25', '2'],
  ['[0, 1, 4, 9, 16]', '14'],
  ['[0, 4, 16]', '5', 'Py v7', 'cat -> 4', '3.5 3 1 32'],
  ['3 4', '4.0', '1024.0', '4 2 5', '3.5 0.3333333333333333'],
  ['8 14 6 24 3', '-13 2', 'True True', 'True True', 'a wins'],
  ['Hello, Scratch', '49 8']
];
setG('demo', 1);
const statuses = [];
for (let n = 1; n <= 13; n++) {
  await click(-113, -134);                    // DEMO button
  const lines = gl('Code');
  if (n === 1) chk('status shows the loaded demo number', String(gv('status')), 'Demo 1');
  const got = await runProgram(lines, n === 13 ? ['Scratch', '7'] : []);
  const want = expected[n - 1];
  chk('DEMO ' + n + ' loads and runs correctly', JSON.stringify(got), JSON.stringify(want));
  statuses.push(String(gv('status')));
}
say('  demo status line (last): ' + statuses[statuses.length - 1]);
chk('DEMO wraps back to 1 after 13', gv('demo'), 1);
chk('DEMO wrap loads demo 1 again', gl('Code')[0], '# Input and conversion');
await click(-113, -134);                      // and on to demo 2
chk('DEMO continues to 2 after the wrap', gv('demo'), 2);
console.log(out.join('\n'));
console.log('passed ' + pass + ' / ' + (pass + fail));
process.exit(0);
