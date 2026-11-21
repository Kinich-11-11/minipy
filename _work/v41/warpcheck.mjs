import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const vm = new VM();
await vm.loadProject(fs.readFileSync(process.argv[2]));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = vm.runtime.getTargetForStage && runtime.targets.find((t) => /Interp/i.test(t.getName()));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
const sL = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const lines = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const c = sL(stage, 'Code'); c.value.length = 0; for (const l of lines) c.value.push(l);
sv(stage, 'stopreq').value = 0; sv(stage, 'running').value = 1; sv(stage, 'speed').value = 1; sv(stage, 'error').value = '';
sv(stage, 'mode').value = 1; sv(stage, 'ticket').value = 0;
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
const paused = () => String(sv(stage, 'status').value).indexOf('Paused') === 0;
const dumpThreads = (tag) => {
  console.log('--- ' + tag + '  (interp cdepth=' + sv(interp, 'cdepth').value + ')');
  console.log('   threads=' + runtime.threads.length + ' kinds=' + runtime.threads.map((t) => (t && t.constructor ? t.constructor.name : typeof t)).join(','));
  for (const t of runtime.threads) {
    const name = t.target && t.target.getName ? t.target.getName() : '?';
    const keys = Object.keys(t).slice(0, 14).join(',');
    let sf = null;
    try { sf = t.stackFrame; } catch (e) { sf = 'threw'; }
    console.log('   ' + name.padEnd(14) + ' status=' + t.status + ' isCompiled=' + t.isCompiled + ' stackLen=' + (t.stack ? t.stack.length : '?') + ' sfType=' + (sf && typeof sf === 'object' ? (Array.isArray(sf) ? 'array(' + sf.length + ')' : 'obj') : String(sf)) + ' keys=' + keys);
    if (Array.isArray(sf)) console.log('      warp=' + JSON.stringify(sf.map(f => !!f.warpMode)) + ' loop=' + JSON.stringify(sf.map(f => !!f.isLoop)) + ' procs=' + JSON.stringify(sf.map(f => f.procedure || null)));
  }
};
for (let i = 0; i < 60; i++) { runtime._step(); if (paused()) break; }
dumpThreads('paused at top level');
sv(stage, 'mode').value = 1; sv(stage, 'ticket').value = Number(sv(stage, 'ticket').value) + 1;   // step off line 1
for (let i = 0; i < 60; i++) { runtime._step(); if (paused()) break; }
dumpThreads('paused at the call line');
sv(stage, 'mode').value = 1; sv(stage, 'ticket').value = Number(sv(stage, 'ticket').value) + 1;   // step into the function
for (let i = 0; i < 60; i++) { runtime._step(); if (paused()) break; }
dumpThreads('paused INSIDE the function');
const t0 = Date.now(); for (let i = 0; i < 5; i++) runtime._step(); console.log('5 idle frames while paused inside: ' + (Date.now() - t0) + 'ms');
process.exit(0);
