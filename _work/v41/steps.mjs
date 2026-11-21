// steps.mjs <sb3> <program.txt> : run the program in fast mode and report the interpreter step count
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
const sL = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sL('Code'); code.value.length = 0;
for (const l of fs.readFileSync(process.argv[3], 'utf8').replace(/\r/g, '').replace(/\n$/, '').split('\n')) code.value.push(l);
setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
const names = ['steps', 'Steps', 'interpSteps', 'step'];
const t0 = Date.now();
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let n = 0;
while (n < 200000) {
  runtime._step(); n++;
  if (Number(gv('running')) === 0 && n > 3) break;
  if (Date.now() - t0 > 600000) break;
}
const found = names.map((x) => x + '=' + gv(x)).join(' ');
console.log('vmSteps=' + n + '  ms=' + (Date.now() - t0) + '  ' + found);
console.log('output=' + JSON.stringify(sL('Output').value.map(String).join('')));
process.exit(0);
