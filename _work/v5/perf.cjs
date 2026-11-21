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
  const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
  const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
  const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
  const setList = (n, arr) => { const l = sl(n); l.value.length = 0; for (const x of arr) l.value.push(x); };
  vm.start(); vm.greenFlag();
  for (let i = 0; i < 10; i++) runtime._step();
  const lines = fs.readFileSync(process.argv[3], 'utf8').replace(/\r/g, '').split('\n');
  setList('Code', lines); setList('Output', []);
  for (const n of ['mode','ticket','stopreq','running']) sv(n).value = 0;
  sv('ticket').value = 1;
  sv('speed').value = Number(process.env.PERF_SPEED || 1);
  const t0 = Date.now();
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let frames = 0, lastLen = -1, stable = 0;
  for (; frames < 500000; frames++) {
    runtime._step();
    const L = sl('Output').value.length;
    if (frames > 2 && String(sv('running').value) === '0') break;
    if (L === lastLen) { stable++; if (stable > 5000) break; } else { stable = 0; lastLen = L; }
  }
  const ms = Date.now() - t0;
  const instr = Number(sv('steps').value || 0);
  realLog('speed=' + sv('speed').value + ' frames=' + frames + ' vmInstr=' + instr + ' instr/frame=' + (frames ? Math.round(instr / frames) : 0) + ' wall=' + ms + 'ms  ' + Math.round(instr / Math.max(ms,1) * 1000) + ' instr/s');
  realLog('last output: ' + JSON.stringify(sl('Output').value.slice(-1)) + ' status=' + sv('status').value + ' error=' + sv('error').value);
})();