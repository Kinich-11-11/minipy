// node _work/v41/dbgindent.mjs <sb3> <json-lines>
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const code = sl(stage, 'Code'); code.value.length = 0; for (const l of lines) code.value.push(l);
const watch = (n) => {
  const v = sv(interp, n) || sv(stage, n);
  if (!v) return;
  let cur = v.value;
  Object.defineProperty(v, 'value', {
    get() { return cur; },
    set(x) { if (x !== cur) console.log('WATCH ' + n + ' -> ' + JSON.stringify(x)); cur = x; }
  });
};
watch('prevhead'); watch('indent'); watch('previndent');
const set = (n, v) => { const x = sv(stage, n); if (x) x.value = v; };
set('mode', 0); set('ticket', 1); set('stopreq', 0); set('running', 1); set('speed', 1); set('error', '');
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
for (let i = 0; i < 3000; i++) {
  runtime._step();
  const r = sv(stage, 'running').value;
  if (Number(r) === 0 && i > 3) break;
}
const g = (n) => { const v = sv(interp, n) || sv(stage, n); return v ? v.value : undefined; };
const L = (n) => { const v = sl(interp, n) || sl(stage, n); return v ? v.value.map(String) : undefined; };
console.log('error=' + JSON.stringify(g('error')) + ' pc=' + g('pc'));
console.log('Code=' + JSON.stringify(L('Code')));
console.log('Indents=' + JSON.stringify(L('Indents')));
console.log('Ends=' + JSON.stringify(L('Ends')));
console.log('Elses=' + JSON.stringify(L('Elses')));
console.log('prevhead=' + JSON.stringify(g('prevhead')) + ' previndent=' + JSON.stringify(g('previndent')) + ' backline=' + g('backline'));
process.exit(0);
