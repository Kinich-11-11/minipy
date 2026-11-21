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
  const interp = runtime.targets.find(t => t.sprite.name === 'Interpreter');
  const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
  const sv = (t, n) => vals(t.variables).find((v) => v.name === n && v.type !== 'list');
  const sl = (t, n) => vals(t.variables).find((v) => v.name === n && v.type === 'list');
  const setList = (t, n, arr) => { const l = sl(t, n); l.value.length = 0; for (const x of arr) l.value.push(x); };
  vm.start(); vm.greenFlag();
  for (let i = 0; i < 5; i++) runtime._step();
  setList(stage, 'Code', process.argv[3].split('|'));
  for (const n of ['mode','ticket','stopreq','running']) { const v = sv(stage, n); if (v) v.value = 0; }
  sv(stage,'ticket').value = 1; sv(stage,'running').value = 1; sv(stage,'speed').value = 1;
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  for (let i = 0; i < 5; i++) runtime._step();
  for (const n of ['NdK','NdA','NdS','NdN','NdC','BlN','BlS','BlK','SuN','LArr','LStart','LCount']) {
    const l = sl(interp, n);
    realLog(n.padEnd(7) + ' ' + JSON.stringify(l ? l.value : null));
  }
  for (const n of ['nTop','tp','blSp','suSp','stK','err']) {
    const v = sv(interp, n);
    realLog(n.padEnd(7) + ' = ' + JSON.stringify(v ? v.value : 'MISSING'));
  }
  realLog('Output = ' + JSON.stringify(sl(stage,'Output').value));
  process.exit(0);
})().catch((e) => realLog('ERR', e && e.stack || e));
