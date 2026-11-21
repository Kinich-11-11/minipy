'use strict';
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log','warn','error','info','debug','trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');
(async () => {
  const vm = new VM();
  await vm.loadProject(fs.readFileSync(process.argv[2]));
  const runtime = vm.runtime;
  const stage = runtime.getTargetForStage();
  const interp = runtime.targets.find(t => t.getName() === 'Interpreter');
  const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
  const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
  const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
  const setList = (t, n, arr) => { const l = sl(t, n); l.value.length = 0; for (const x of arr) l.value.push(x); };
  vm.start(); vm.greenFlag();
  for (let i = 0; i < 10; i++) runtime._step();
  const lines = fs.readFileSync(process.argv[3], 'utf8').replace(/\r/g, '').split('\n');
  setList(stage, 'Code', lines); setList(stage, 'Output', []);
  for (const n of ['mode','ticket','stopreq','running']) sv(stage, n).value = 0;
  sv(stage, 'ticket').value = 1; sv(stage, 'running').value = 1; sv(stage, 'speed').value = 1;
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let frames = 0, lastLen = -1, stable = 0;
  for (; frames < 2000; frames++) {
    runtime._step();
    const L = sl(stage, 'Output').value.length;
    if (frames > 2 && String(sv(stage, 'running').value) === '0') break;
    if (L === lastLen) { stable++; if (stable > 500) break; } else { stable = 0; lastLen = L; }
  }
  const fl = sl(interp, 'FnFlags').value;
  realLog('fTop=' + sv(interp, 'fTop').value + ' gTop=' + sv(interp, 'gTop').value);
  realLog('FnFlags len=' + fl.length);
  realLog('FnFlags tail=' + JSON.stringify(fl.slice(Math.max(0, fl.length - 6))));
  realLog('FnName tail=' + JSON.stringify(sl(interp, 'FnName').value.slice(Math.max(0, sl(interp,'FnName').value.length - 4))));
  realLog('output=' + JSON.stringify(sl(stage, 'Output').value.slice(0, 6)));
})();