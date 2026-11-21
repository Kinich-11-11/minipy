
import fs from 'fs';
import { performance } from 'perf_hooks';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2];
const PROG = process.argv[3].split('|');
const REPS = Number(process.argv[4]||1);
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find(v => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(n); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const times = [];
let lastOut = null;
for (let r = 0; r < REPS; r++) {
  const code = sl('Code'); code.value.length = 0; for (const l of PROG) code.value.push(l);
  sv('mode').value = 0; sv('ticket').value = 1; sv('stopreq').value = 0; sv('running').value = 1; sv('speed').value = 1;
  const out = sl('Output'); if (out) out.value.length = 0;
  const w0 = performance.now();
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps = 0;
  while (Number(gv('running')) !== 0 && steps < 20000) { runtime._step(); steps++; }
  times.push(+(performance.now()-w0).toFixed(1));
  lastOut = gl('Output').map(String);
}
times.sort((a,b)=>a-b);
console.log(JSON.stringify({project:projectPath.split(/[\\/]/).pop(), times, median: times[Math.floor(times.length/2)], out: lastOut, status: String(gv('status'))}));
process.exit(0);
