// probe237.mjs <sb3> <cases.json> <out.json>
// runs each case then dumps Names/Values/Types + selected vars for diagnosis
import fs from 'fs';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const casesPath = process.argv[3];
const outPath = process.argv[4];

const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find(tg => tg.getName() === 'Interpreter') || stage;
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).concat(vals(interp.variables)).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).concat(vals(interp.variables)).find(v => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(n); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();

const DUMP_VARS = ['found', 'cmp', 'ubR', 'ubF', 'ubJ', 'ubO', 'ubK', 'cloFi', 'error', 'status', 'x9fn'];
const rows = [];
for (const c of cases) {
  const code = sl('Code'); code.value.length = 0;
  for (const l of String(c.code).replace(/\r/g, '').split('\n')) code.value.push(l);
  setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
  const t0 = Date.now();
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps = 0;
  while (steps < 4000) {
    runtime._step(); steps++;
    if (Number(gv('running')) === 0 && steps > 3) break;
    if (Date.now() - t0 > 20000) break;
  }
  const dump = {};
  for (const n of DUMP_VARS) { const v = sv(n); if (v) dump[n] = String(v.value); }
  dump.Names = gl('Names');
  dump.Values = gl('Values').map(x => { const s = String(x); return s.length > 40 ? s.slice(0, 40) + '…' : s; });
  dump.Types = gl('Types');
  dump.Output = gl('Output').map(String);
  dump.err = String(gv('error') || '');
  dump.ms = Date.now() - t0;
  rows.push({ name: c.name, dump });
  setG('stopreq', 1); setG('running', 0);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i = 0; i < 8; i++) runtime._step();
  setG('busy', 0); setG('stopreq', 0); setG('error', '');
}
fs.writeFileSync(outPath, JSON.stringify(rows, null, 1));
console.log('probed ' + rows.length + ' cases -> ' + outPath);
process.exit(0);
