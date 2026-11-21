// run several programs in ONE VM (like run.mjs) and dump interpreter state after each
// node _work/v41/dbgmulti.mjs <sb3> <suite.json> [vars...]
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const cases = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const extra = process.argv.slice(4);
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(stage, n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(stage, n); return l ? l.value.map(String) : []; };
const set = (n, x) => { const v = sv(stage, n); if (v) v.value = x; };
const ig = (n) => { const v = sv(interp, n) || sv(stage, n); return v ? v.value : undefined; };
const il = (n) => { const v = sl(interp, n) || sl(stage, n); return v ? v.value.map(String) : undefined; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const watch = process.env.DBG_WATCH;
if (watch) {
  for (const n of watch.split(',')) {
    const v = sv(interp, n) || sv(stage, n);
    if (!v) { console.log('no var ' + n); continue; }
    let cur = v.value;
    Object.defineProperty(v, 'value', {
      get() { return cur; },
      set(x) {
        if (String(x) !== String(cur)) console.log('  WATCH ' + n + ' ' + JSON.stringify(cur) + ' -> ' + JSON.stringify(x) + ' pc=' + gv('pc') + ' head=' + ig('head'));
        cur = x;
      }
    });
  }
}
for (const c of cases) {
  const code = sl(stage, 'Code'); code.value.length = 0;
  for (const l of String(c.code).replace(/\r/g, '').split('\n')) code.value.push(l);
  set('mode', 0); set('ticket', 1); set('stopreq', 0); set('running', 1); set('speed', 1); set('error', '');
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps = 0;
  while (steps < 4000) { runtime._step(); steps++; if (Number(gv('running')) === 0 && steps > 3) break; }
  set('stopreq', 1); set('running', 0);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i = 0; i < 8; i++) runtime._step();
  set('busy', 0); set('stopreq', 0); set('error', '');
  console.log('=== ' + c.name + ' -> out=' + JSON.stringify(gl('Output')) + ' err=' + JSON.stringify(gv('error')));
  for (const n of extra) console.log('    ' + n + '=' + JSON.stringify(ig(n)) + ' list=' + JSON.stringify(il(n)));
}
process.exit(0);
