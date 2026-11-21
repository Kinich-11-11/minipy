
import fs from 'fs';
import VM from 'scratch-vm';
const out = []; const say = (...a) => out.push(a.join(' '));
let pass = 0, fail = 0;
const chk = (n, got, want) => { const ok = String(got) === String(want); if (ok) pass++; else fail++; say((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : '  got=' + got + ' want=' + want)); };
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const runtime = vm.runtime;
const stage = runtime.getTargetForStage();
const all = (t) => Object.values(t.variables || {});
const gv = (n) => { const v = all(stage).find(v => v.name === n && v.type !== 'list'); return v ? v.value : undefined; };
const setG = (n, val) => { all(stage).find(v => v.name === n).value = val; };
const step = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const mouseTo = (sx, sy) => vm.postIOData('mouse', { x: sx + 240, y: 180 - sy, canvasWidth: 480, canvasHeight: 360 });
async function hover(sx, sy) { mouseTo(sx, sy); await sleep(40); step(3); }
const K = (k) => vm.postIOData('keyboard', { key: k, isDown: true });
const KU = (k) => vm.postIOData('keyboard', { key: k, isDown: false });
// held key: many repeats WITHOUT releasing (this is what a real keyboard sends)
async function held(k, repeats) { for (let i = 0; i < repeats; i++) { K(k); await sleep(15); step(2); } KU(k); step(2); }
async function tap(k, times, gap) { for (let i = 0; i < times; i++) { K(k); await sleep(gap); step(2); KU(k); await sleep(gap); step(2); } }
vm.start(); vm.greenFlag(); step(20);
const code = [];
for (const v of ['a = 1','b = 2','c = 3','d = 4','e = 5','f = 6','g = 7','h = 8']) code.push(v);
for (let i = 1; i <= 30; i++) code.push('print(' + i + ')');
const codeVar = all(stage).find(v => v.name === 'Code');
codeVar.value.length = 0; for (const l of code) codeVar.value.push(l);
setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1);
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
for (let i = 0; i < 400; i++) { runtime._step(); if (gv('running') === 0 && i > 3) break; }
const snap = () => gv('outpage') + '|' + gv('varpage') + '|' + gv('page') + '|' + gv('selected');

// ---------- 1. pointer in the CONSOLE, 60 held repeats up then 60 down ----------
setG('outpage', 20); setG('varpage', 3); setG('page', 10); setG('selected', 20);
await hover(148, -60);
await held('ArrowUp', 60);
chk('console: 60 held UP -> outpage at top, nothing else moves', snap(), '1|3|10|20');
await held('ArrowDown', 60);
chk('console: 60 held DOWN -> outpage at bottom, nothing else moves', snap(), '22|3|10|20');

// ---------- 2. pointer in the VARIABLES panel ----------
setG('outpage', 20); setG('varpage', 3); setG('page', 10); setG('selected', 20);
await hover(148, 100);
await held('ArrowDown', 60);
chk('variables: 60 held DOWN -> varpage at max, nothing else moves', snap(), '20|5|10|20');
await held('ArrowUp', 60);
chk('variables: 60 held UP -> varpage at 1, nothing else moves', snap(), '20|1|10|20');

// ---------- 3. pointer in the GUTTER ----------
setG('outpage', 20); setG('varpage', 3); setG('page', 10); setG('selected', 20);
await hover(-218, 0);
await held('ArrowUp', 60);
chk('gutter: 60 held UP -> page at 1, nothing else moves', snap(), '20|3|1|20');
await held('ArrowDown', 60);
chk('gutter: 60 held DOWN -> page at max, nothing else moves', snap(), '20|3|23|20');

// ---------- 4. both arrow keys held at once (the old shared-variable race) ----------
setG('outpage', 20); setG('varpage', 3); setG('page', 10); setG('selected', 20);
await hover(148, -60);
K('ArrowUp'); K('ArrowDown');
for (let i = 0; i < 40; i++) step(2);
KU('ArrowUp'); KU('ArrowDown'); step(2);
const s4 = snap().split('|');
chk('console: both keys at once stays inside the console', s4[1] === '3' && s4[2] === '10' && s4[3] === '20', true);

// ---------- 5. pointer moves between panels while the key stays held ----------
setG('outpage', 20); setG('varpage', 1); setG('page', 10); setG('selected', 20);
await hover(148, -60);                       // console
K('ArrowUp');
for (let i = 0; i < 10; i++) step(2);
mouseTo(148, 100);                           // slide into the variables panel, key still down
for (let i = 0; i < 10; i++) step(2);
KU('ArrowUp'); step(2);
say('  (pointer slid from console to variables while held): ' + snap());
chk('sliding while held never touches the code page or the selection', snap().split('|')[2] === '10' && snap().split('|')[3] === '20', true);

// ---------- 6. rapid alternation console <-> variables ----------
setG('outpage', 10); setG('varpage', 3); setG('page', 10); setG('selected', 20);
for (let i = 0; i < 6; i++) {
  await hover(148, -60);
  await tap('ArrowUp', 3, 5);
  await hover(148, 100);
  await tap('ArrowDown', 3, 5);
}
say('  (after alternating) ' + snap());
chk('alternating panels never touches the code page or selection', snap().split('|')[2] === '10' && snap().split('|')[3] === '20', true);
chk('alternating panels: console moved', Number(snap().split('|')[0]) < 10, true);
chk('alternating panels: variables moved', Number(snap().split('|')[1]) > 3, true);
console.log(out.join('\n'));
console.log('passed ' + pass + ' / ' + (pass + fail));
process.exit(0);