
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
const setG = (n, val) => { all(stage).find(v => v.name === n).value = val; };
const gl = (n) => { const l = all(stage).find(v => v.name === n && v.type === 'list'); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
const step = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const mouseTo = (sx, sy) => vm.postIOData('mouse', { x: sx + 240, y: 180 - sy, canvasWidth: 480, canvasHeight: 360 });
async function click(sx, sy) {
  mouseTo(sx, sy); await sleep(50); step(3);
  vm.postIOData('mouse', { x: sx + 240, y: 180 - sy, canvasWidth: 480, canvasHeight: 360, isDown: true });
  await sleep(50); step(5);
  vm.postIOData('mouse', { x: sx + 240, y: 180 - sy, canvasWidth: 480, canvasHeight: 360, isDown: false });
  await sleep(50); step(5);
}
vm.start(); vm.greenFlag(); step(20);
const codeVar = all(stage).find(v => v.name === 'Code');
codeVar.value.length = 0; codeVar.value.push('ab');
setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 0); setG('busy', 0);
setG('selected', 1); setG('cursor', 2); setG('outpage', 10); setG('page', 5); setG('hscroll', 0);

// row 1 slot 4 = ':'  (scratch x ~114, y ~-130)
await click(114, -130);
chk('row-1 button still works (:)', gl('Code')[0], 'ab:');
// row 2 slot 1 = '*'  (scratch x ~74.6, y ~-144)
await click(75, -144);
chk('row-2 button still works (*)', gl('Code')[0], 'ab:*');
// former O- / O+ slots must do nothing
setG('outpage', 10);
const codeBefore = gl('Code')[0];
await click(207, -144);
chk('former O- slot no longer pages the console', gv('outpage'), 10);
await click(220, -144);
chk('former O+ slot no longer pages the console', gv('outpage'), 10);
chk('former O-/O+ slots insert nothing', gl('Code')[0], codeBefore);
// the remaining 10 row-2 buttons all still insert
const row2 = ['*','/','%','.','<','>','!','#','_','//'];
for (let i = 0; i < row2.length; i++) {
  const x = 68 + 13.25 * i + 6.6;
  codeVar.value[0] = 'x';
  setG('cursor', 1);
  await click(x, -144);
  chk('row-2 slot ' + (i + 1) + ' inserts ' + JSON.stringify(row2[i]), gl('Code')[0], 'x' + row2[i]);
}
console.log(out.join('\n'));
console.log('passed ' + pass + ' / ' + (pass + fail));
process.exit(0);
