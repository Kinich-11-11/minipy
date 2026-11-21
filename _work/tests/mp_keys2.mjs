
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
const gl = (n) => { const l = all(stage).find(v => v.name === n && v.type === 'list'); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
const step = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const mouseTo = (sx, sy) => vm.postIOData('mouse', { x: sx + 240, y: 180 - sy, canvasWidth: 480, canvasHeight: 360 });
async function hover(sx, sy) { mouseTo(sx, sy); await sleep(40); step(3); }
const KEY = { up: 'ArrowUp', down: 'ArrowDown' };
async function key(name, times = 1) {
  for (let i = 0; i < times; i++) {
    vm.postIOData('keyboard', { key: KEY[name], isDown: true });
    await sleep(40); step(4);
    vm.postIOData('keyboard', { key: KEY[name], isDown: false });
    await sleep(40); step(4);
  }
}
vm.start(); vm.greenFlag(); step(20);
const code = [];
for (const v of ['a = 1','b = 2','c = 3','d = 4','e = 5','f = 6','g = 7','h = 8']) code.push(v);
for (let i = 1; i <= 30; i++) code.push('print(' + i + ')');
const codeVar = all(stage).find(v => v.name === 'Code');
codeVar.value.length = 0; for (const l of code) codeVar.value.push(l);
setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1);
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
for (let i = 0; i < 400; i++) { runtime._step(); if (gv('running') === 0 && i > 3) break; }

// ---------- 1. pointer movement alone never scrolls ----------
setG('outpage', 15); setG('varpage', 3); setG('page', 10);
await hover(148, 0); await hover(148, -60); await hover(148, 100); await hover(-218, 40); await hover(0, 0); await hover(-160, -134);
chk('moving the pointer alone: console unchanged', gv('outpage'), 15);
chk('moving the pointer alone: variables unchanged', gv('varpage'), 3);
chk('moving the pointer alone: code page unchanged', gv('page'), 10);

// ---------- 2. pointer over CONSOLE + arrow keys = scroll console one line per press ----------
setG('outpage', 15); setG('varpage', 3); setG('page', 10);
await hover(148, -60);
const sel0 = gv('selected');
await key('up', 3);
chk('console: 3 x up arrow = -3 lines', 15 - gv('outpage'), 3);
await key('down', 2);
chk('console: 2 x down arrow = +2 lines', gv('outpage'), 14);
chk('console: variables not scrolled', gv('varpage'), 3);
chk('console: code page not scrolled', gv('page'), 10);
chk('console: code selection untouched', gv('selected'), sel0);

// ---------- 3. pointer over VARIABLES panel ----------
setG('outpage', 15); setG('varpage', 3); setG('page', 10);
await hover(148, 100);
await key('down', 2);
chk('variables: 2 x down arrow = +2 lines', gv('varpage'), 5);
await key('up', 1);
chk('variables: 1 x up arrow = -1 line', gv('varpage'), 4);
chk('variables: console not scrolled', gv('outpage'), 15);
chk('variables: code selection untouched', gv('selected'), sel0);

// ---------- 4. pointer over the code gutter ----------
setG('outpage', 15); setG('varpage', 3); setG('page', 10);
await hover(-218, 0);
await key('up', 3);
chk('gutter: 3 x up arrow = -3 lines', gv('page'), 7);
await key('down', 1);
chk('gutter: 1 x down arrow = +1 line', gv('page'), 8);
chk('gutter: console not scrolled', gv('outpage'), 15);
chk('gutter: variables not scrolled', gv('varpage'), 3);
chk('gutter: code selection untouched', gv('selected'), sel0);

// ---------- 5. pointer outside every region: arrows keep editing, nothing scrolls ----------
setG('outpage', 15); setG('varpage', 3); setG('page', 10); setG('selected', 20);
await hover(0, 0);                       // code text area
await key('down', 1);
chk('code area: down arrow moves the line selection', gv('selected'), 21);
await key('up', 2);
chk('code area: up arrow moves the line selection', gv('selected'), 19);
chk('code area: nothing scrolled', gv('outpage') + '|' + gv('varpage') + '|' + gv('page'), '15|3|10');
setG('selected', 20);
await hover(-160, -134);                 // button row
await key('up', 5);
chk('button row: arrows do not scroll', gv('outpage') + '|' + gv('varpage') + '|' + gv('page'), '15|3|10');
chk('button row: arrows still edit the selection', gv('selected'), 15);

// ---------- 6. scrolling still works while a program is running ----------
await hover(148, -60);
setG('outpage', 10);
await key('up', 1);
chk('console scrolls while idle too', gv('outpage'), 9);
console.log(out.join('\n'));
console.log('passed ' + pass + ' / ' + (pass + fail));
process.exit(0);
