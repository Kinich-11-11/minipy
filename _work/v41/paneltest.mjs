import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const tr = runtime.targets.find((t) => /text/i.test(t.getName()));
console.log('targets=' + JSON.stringify(runtime.targets.map((t) => t.getName())));
if (!tr) { console.log('no TextRenderer target'); process.exit(1); }
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 40; i++) runtime._step();
const set = (list, arr) => { const l = sl(stage, list); if (!l) { console.log('MISSING list ' + list); return; } l.value.length = 0; for (const v of arr) l.value.push(v); };
const rows = (show) => {
  set('Names', ['a', 'b']);
  set('Values', ['\u001fN1\u001fN2', 'plain']);
  set('Show', show);
  sv(stage, 'varpage').value = 1;
  sv(stage, 'dirty').value = 1;
  for (let i = 0; i < 6; i++) runtime._step();
  return String(sv(tr, 'vtxt').value);
};
console.log('short  vtxt=' + JSON.stringify(rows(['[1, 2, 3]', 'hello'])));
console.log('long   vtxt=' + JSON.stringify(rows(['[1, 2, 3]', '<a very long string value that needs trimming>'])));
console.log('cat    vtxt=' + JSON.stringify(rows(['[1, 2, 3]', '0123456789012345678901234567890123456789'])));
process.exit(0);
