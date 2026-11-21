// _dbg230run.mjs <sb3> <cases.json> <logfile>  -- run cases, dump DbgL per case
import fs from 'fs';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const casesPath = process.argv[3];
const logPath = process.argv[4];
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

let out = '';
for (const c of cases) {
  const code = sl('Code'); code.value.length = 0;
  for (const l of String(c.code).replace(/\r/g, '').split('\n')) code.value.push(l);
  setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
  const dbg = sl('DbgL'); if (dbg) dbg.value.length = 0;
  const gy = sl('GYield'); const gyBefore = gy ? gy.value.length : -1;
  const t0 = Date.now();
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps = 0;
  while (steps < 8000) {
    runtime._step(); steps++;
    if (Number(gv('running')) === 0 && steps > 3) break;
    if (Date.now() - t0 > 30000) break;
  }
  out += '======== ' + c.name + ' ========\n';
  out += 'Output: ' + JSON.stringify(gl('Output')) + '\n';
  out += 'error: ' + String(gv('error') || '') + '\n';
  out += 'GYield(after): ' + JSON.stringify(gy ? gy.value.slice(gyBefore) : null) + '\n';
  out += 'DbgL (' + (dbg ? dbg.value.length : 0) + '):\n';
  if (dbg) for (const row of dbg.value) out += '  ' + row + '\n';
  setG('stopreq', 1); setG('running', 0);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i = 0; i < 8; i++) runtime._step();
  setG('busy', 0); setG('stopreq', 0); setG('error', '');
}
fs.writeFileSync(logPath, out);
console.log('written ' + logPath + '  cases=' + cases.length);
process.exit(0);
