import fs from 'fs';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const demos = JSON.parse(fs.readFileSync('_work/v41/demos.json', 'utf8'))
  .concat(JSON.parse(fs.readFileSync('_work/v41/demos_input.json', 'utf8')));
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const allv = () => vals(stage.variables);
const sv = (n) => allv().find(v => v.name === n && v.type !== 'list');
const sl = (n) => allv().find(v => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
let bad = 0;
for (let n = 1; n <= demos.length; n++) {
  sl('Code').value.length = 0;            // clear leftover so a no-op INIT is detectable
  sv('demo').value = n;                    // number, matching native type
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'INIT' });
  for (let i = 0; i < 80; i++) runtime._step();
  const code = sl('Code').value.map(String);
  const want = demos[n - 1].code.replace(/\r/g, '').split('\n');
  const ok = JSON.stringify(code) === JSON.stringify(want);
  if (!ok) bad++;
  console.log((ok ? 'PASS' : 'FAIL') + ' demo' + n + ' status=' + JSON.stringify(String(sv('status').value)) + ' demo_now=' + JSON.stringify(sv('demo').value) + ' codeLines=' + code.length);
}
console.log(bad === 0 ? 'ALL ' + demos.length + ' OK' : bad + ' FAILURES');
process.exit(bad ? 1 : 0);
