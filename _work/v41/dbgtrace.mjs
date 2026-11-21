// trace the interpreter's pc/head/Fin* state, one line per change
// node _work/v41/dbgtrace.mjs <sb3> <case.json> [maxSteps]
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const cases = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const maxSteps = Number(process.argv[4] || 4000);
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(stage, n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(stage, n); return l ? l.value.map(String) : []; };
const set = (n, x) => { const v = sv(stage, n); if (v) v.value = x; };
const ig = (n) => { const v = sv(interp, n) || sv(stage, n); return v ? v.value : undefined; };
const il = (n) => { const v = sl(interp, n) || sl(stage, n); return v ? v.value.map(String) : []; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const LISTS = ['FinStart', 'FinEnd', 'FinMsg', 'FinC', 'FinRet', 'FinDest', 'LoopHead'];
const VARS = ['pc', 'cdepth', 'error', 'retflag', 'dest', 'head', 'running', 'fret', 'fdef', 'fdest', 'wpval', 'fvt', 'tfm', 'ev', 'evtype'];
const snap = () => VARS.map((n) => n + '=' + JSON.stringify(ig(n))).join(' ')
  + ' | ' + LISTS.map((n) => n + '=' + JSON.stringify(il(n))).join(' ');
for (const c of cases) {
  const code = sl(stage, 'Code'); code.value.length = 0;
  for (const l of String(c.code).replace(/\r/g, '').split('\n')) code.value.push(l);
  set('mode', 0); set('ticket', 1); set('stopreq', 0); set('running', 1); set('speed', 1); set('error', '');
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps = 0, prev = '';
  while (steps < maxSteps) {
    runtime._step(); steps++;
    const s = snap();
    if (s !== prev) { console.log(String(steps).padStart(5) + ' ' + s); prev = s; }
    if (Number(gv('running')) === 0 && steps > 3) break;
  }
  console.log('=== ' + c.name + ' out=' + JSON.stringify(gl('Output')) + ' err=' + JSON.stringify(gv('error')));
}
process.exit(0);
