// PCLIP: EXPORT/IMPORT round trip (separator `\n`, doubled backslash, legacy `|`)
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
const at = (x, y, down) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, canvasWidth: 480, canvasHeight: 360, isDown: down });
const click = (x, y) => { at(x, y, true); step(5); at(x, y, false); step(6); };
const EXPORT = [-165, -129.5], IMPORT = [-209, -129.5];
const setCode = (lines) => { const C = sl('Code'); C.value.length = 0; for (const l of lines) C.value.push(l); setG('selected', 1); setG('cursor', 0); setG('page', 1); setG('busy', 0); setG('running', 0); step(3); };
let bad = 0;
const ck = (what, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log((ok ? '  OK   ' : '  FAIL ') + what.padEnd(34) + ' got=' + JSON.stringify(got) + (ok ? '' : '\n         want=' + JSON.stringify(want))); };
const exportText = () => { setG('exportShown', 0); click(...EXPORT); return gl('Export')[0]; };  // EXPORT toggles the list
const tick = () => new Promise((r) => setTimeout(r, 0));
const importText = async (text) => { at(IMPORT[0], IMPORT[1], true); step(5); at(IMPORT[0], IMPORT[1], false); step(3); let w = 0; while (w++ < 80 && Number(gv('busy')) !== 1) step(1); runtime.emit('ANSWER', text); await tick(); step(10); await tick(); let n = 0; while (n++ < 400 && Number(gv('busy')) !== 0) step(1); step(4); };

vm.start(); vm.greenFlag(); step(30);

const HARD = ['a = 1 | 2', "print('a\\nb')", 'x = [1, 2]', "s = 'p|q'", 'y = 3 \\\\ 4'];

console.log('=== 1. EXPORT escapes backslashes and joins with \\n ===');
setCode(HARD);
const txt = exportText();
ck('export text', txt, HARD.map((l) => l.replace(/\\/g, '\\\\')).join('\\n'));
ck('no bare | left as a separator', txt.split('|').length > 1, true);   // the | are still there, they just are not separators

console.log('=== 2. IMPORT of that text is lossless ===');
setCode(['placeholder']);
await importText(txt);
ck('round trip', gl('Code'), HARD);

console.log('=== 3. a plain program still round trips ===');
const PLAIN = ['x = 1', 'if x:', '    print(x)'];
setCode(PLAIN);
await importText(exportText());
ck('round trip', gl('Code'), PLAIN);

console.log('=== 4. legacy | exports still import ===');
setCode(['placeholder']);
await importText('a = 1|b = 2|c = 3');
ck('legacy split', gl('Code'), ['a = 1', 'b = 2', 'c = 3']);

console.log('=== 5. legacy \\| escape still works ===');
setCode(['placeholder']);
await importText('a = 1\\|2|b = 3');
ck('legacy escape', gl('Code'), ['a = 1|2', 'b = 3']);

console.log('=== 6. empty import keeps one line ===');
setCode(['placeholder']);
await importText('');
ck('one empty line', gl('Code'), ['']);

console.log(bad === 0 ? '\nALL OK' : '\n' + bad + ' FAILURES');
vm.stopAll();
process.exit(bad === 0 ? 0 : 1);

