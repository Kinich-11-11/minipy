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
  for (; frames < 5000; frames++) {
    runtime._step();
    const L = sl(stage, 'Output').value.length;
    if (frames > 2 && String(sv(stage, 'running').value) === '0') break;
    if (L === lastLen) { stable++; if (stable > 800) break; } else { stable = 0; lastLen = L; }
  }
  const iop = sl(interp, 'Iop').value, ia = sl(interp, 'Ia').value;
  realLog('=== Output ===');
  for (const line of sl(stage, 'Output').value.slice(0, Number(process.argv[4] || 80))) realLog('  ' + line);
  realLog('=== bytecode (' + iop.length + ' ops) ===');
  for (let i = 0; i < iop.length; i++) {
    const op = iop[i];
    if (/LCBEGIN|LCEND|BUILD|DELV|STOREV|ITER|NEXT|PUSHV|SUBSSET/.test(op)) realLog('  ' + (i+1) + ': ' + op + ' ' + ia[i]);
  }
})();
