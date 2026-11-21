'use strict';
/**
 * MiniPy micro benchmark: runs one program to completion and reports wall time plus the
 * number of bytecode instructions the VM executed (the kernel's "steps" counter).
 *   node _work/v6/bench.cjs <sb3> <program.txt> [reps]
 */
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');

(async () => {
  const sb3 = process.argv[2];
  const prog = fs.readFileSync(process.argv[3], 'utf8').replace(/\r/g, '').split('\n');
  const reps = Number(process.argv[4] || 3);
  const vm = new VM();
  await vm.loadProject(fs.readFileSync(sb3));
  const runtime = vm.runtime;
  const stage = runtime.getTargetForStage();
  const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
  const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
  const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
  const setList = (n, arr) => { const l = sl(n); l.value.length = 0; for (const x of arr) l.value.push(x); };
  vm.start();
  vm.greenFlag();
  for (let i = 0; i < 10; i++) runtime._step();
  const times = [];
  let instr = 0, out = [];
  for (let r = 0; r < reps; r++) {
    setList('Code', prog); setList('Output', []);
    for (const n of ['mode', 'ticket', 'stopreq', 'running']) sv(n).value = 0;
    sv('ticket').value = 1;
    sv('running').value = 1;
    sv('speed').value = 1;
    const t0 = Date.now();
    runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
    let n = 0;
    while (Number(sv('running').value) !== 0 && n < 400000) { runtime._step(); n++; }
    times.push(Date.now() - t0);
    instr = Number(sv('steps').value || 0);
    out = sl('Output').value.map(String);
  }
  times.sort((a, b) => a - b);
  const med = times[Math.floor(times.length / 2)];
  const best = times[0];
  realLog(JSON.stringify({ sb3: sb3.split(/[\\/]/).pop(), times, median: med, best, instr,
    instrPerSec: best ? Math.round(instr / best * 1000) : 0, out: out.slice(-3),
    status: String(sv('status').value), error: String(sv('error').value) }));
  process.exit(0);
})();
