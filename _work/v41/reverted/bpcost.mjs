// Does a run with a breakpoint set take the slow (non-warp) path?
//   node _work/v41/bpcost.mjs <sb3>
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const sb3 = process.argv[2] || 'MiniPy_v4.34.sb3';
const LINES = ['def fib(n):', '    if n < 2:', '        return n', '    return fib(n - 1) + fib(n - 2)', 'print(fib(16))', '# marked, never runs'];
const vm = new VM();
await vm.loadProject(fs.readFileSync(sb3));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
async function run(flagLast) {
  const code = sl('Code'); code.value.length = 0; for (const l of LINES) code.value.push(l);
  const bps = sl('Bps'); bps.value.length = 0;
  for (let i = 0; i < LINES.length; i++) bps.value.push(flagLast && i === LINES.length - 1 ? 1 : 0);
  sv('mode').value = 0; sv('ticket').value = 0; sv('stopreq').value = 0;
  sv('running').value = 1; sv('speed').value = 1; sv('error').value = '';
  sv('bwait').value = 0;
  const t0 = Date.now();
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps = 0;
  while (steps < 40000) { runtime._step(); steps++; if (Number(sv('running').value) === 0 && steps > 3) break; if (Date.now() - t0 > 60000) break; }
  return { steps, ms: Date.now() - t0, out: sl('Output').value.map(String).join(''), bpOn: sv('bpOn').value };
}
const fast = await run(false);
console.log('no breakpoint : steps=' + fast.steps + ' ms=' + fast.ms + ' bpOn=' + fast.bpOn + ' out=' + JSON.stringify(fast.out));
const slow = await run(true);
console.log('bp set (unhit): steps=' + slow.steps + ' ms=' + slow.ms + ' bpOn=' + slow.bpOn + ' out=' + JSON.stringify(slow.out));
process.exit(0);
