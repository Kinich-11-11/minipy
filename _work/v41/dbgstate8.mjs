// single-program state dumper using run.mjs's exact setup
//   node _work/v41/dbgstate.mjs <sb3> <json-array-of-lines> [maxSteps]
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const maxSteps = Number(process.argv[4] || 600);
const vm = new VM();
process.stderr.write('loading...\n');
await vm.loadProject(fs.readFileSync(projectPath));
process.stderr.write('loaded\n');
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
process.stderr.write('booted\n');
const code = sl(stage, 'Code'); code.value.length = 0; for (const l of lines) code.value.push(l);
const set = (n, v) => { const x = sv(stage, n); if (x) x.value = v; };
set('mode', 0); set('ticket', 1); set('stopreq', 0); set('running', 1); set('speed', 1); set('error', '');
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let steps = 0;
while (steps < maxSteps) {
  runtime._step(); steps++;
  process.stderr.write('step ' + steps + ' running=' + sv(stage, 'running').value + '\n');
  if (Number(sv(stage, 'running').value) === 0 && steps > 3) break;
}
const g = (n) => { const v = sv(interp, n) || sv(stage, n); return v ? v.value : undefined; };
const L = (n) => { const v = sl(interp, n) || sl(stage, n); return v ? v.value.map(String) : undefined; };
console.log('steps=' + steps + ' running=' + g('running') + ' pc=' + g('pc') + ' error=' + JSON.stringify(g('error')) + ' status=' + JSON.stringify(g('status')));
console.log('Output=' + JSON.stringify(L('Output')));
console.log('DbgT=' + JSON.stringify((L('DbgT')||[]).slice(0,24)) + ' ...TAIL... ' + JSON.stringify((L('DbgT')||[]).slice(-12)));
console.log('Code=' + JSON.stringify(L('Code')));
console.log('Tok=' + JSON.stringify(L('Tok')));
console.log('Kind=' + JSON.stringify(L('Kind')));
for (const n of ['LoopKind', 'LoopName', 'LoopValue', 'LoopStop', 'LoopStep', 'LoopHead', 'LoopText']) console.log('L.' + n + '=' + JSON.stringify(L(n)));
for (const n of ['fnames', 'ln', 'ltmp', 'un', 'uncnt']) console.log('V.' + n + '=' + JSON.stringify(g(n)));
for (const n of ['head', 'count', 'ev', 'evtype', 'found', 'pending', 'nres', 'nbase', 'bstr', 'bacc', 'bdig', 'pch0', 'pch1', 'pchx', 'pch9', 'pcha', 'pchb', 'pchc', 'pchd', 'pche', 'pchf', 'mthname', 'hasmath', 'lo', 'hi', 'mdot', 'ev']) console.log(n + '=' + JSON.stringify(g(n)));
for (const n of ['UArgN','UArgV','UArgT','UComma','FnPar','FnPN','FnPO','FnDef']) console.log('L.' + n + '=' + JSON.stringify(L(n)));
console.log('allpch=' + JSON.stringify(vals(interp.variables).filter((v) => /^pch/.test(v.name)).map((v) => v.name + ':' + JSON.stringify(v.value))));
process.exit(0);







