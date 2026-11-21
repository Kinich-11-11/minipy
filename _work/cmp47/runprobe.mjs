
import fs from 'fs';
import { performance } from 'perf_hooks';
const realLog = console.log.bind(console);
for (const k of ['log','warn','error','info','debug','trace']) console[k] = () => {};
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2], casesPath = process.argv[3], outPath = process.argv[4];
const MAXSTEPS = Number(process.argv[5] || 400);
const only = process.argv[6] ? process.argv[6].split(',') : null;
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8')).filter(c => !only || only.includes(c.name));
const vm = new VM();
const t0 = performance.now();
await vm.loadProject(fs.readFileSync(projectPath));
const loadMs = performance.now() - t0;
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find(v => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(n); if (!l) return []; return Array.isArray(l.value) ? l.value.slice() : [...(l.value || [])]; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
const res = [];
const flush = () => fs.writeFileSync(outPath, JSON.stringify({ loadMs: Math.round(loadMs), results: res }, null, 1));

let pendingAnswers = [];
runtime.on('QUESTION', () => { if (pendingAnswers.length) runtime.emit('ANSWER', pendingAnswers.shift()); });
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
realLog('LOAD ms=' + Math.round(loadMs) + ' :: ' + projectPath.split(/[\\/]/).pop() + ' :: cases=' + cases.length);

for (const c of cases) {
  const code = sl('Code'); code.value.length = 0;
  for (const l of c.code.replace(/\r/g, '').split('\n')) code.value.push(l);
  const out = sl('Output'); if (out) out.value.length = 0;
  setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1);
  setG('error', ''); setG('busy', 0); setG('pc', 0); setG('steps', 0);
  const answers = (c.inputs || []).slice();
  pendingAnswers = answers;
  const t = performance.now();
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps = 0;
  while (steps < MAXSTEPS) {
    if (answers.length && String(gv('status')) === 'Waiting for input') runtime.emit('ANSWER', answers.shift());
    runtime._step(); steps++;
    if (Number(gv('running')) === 0 && steps > 5) break;
  }
  const r = { name: c.name, out: gl('Output').map(String), err: String(gv('error') || ''),
    status: String(gv('status') || ''), steps, ms: Math.round(performance.now() - t), unset: Number(gv('running')) !== 0 };
  res.push(r); flush();
  realLog(c.name + ' | steps=' + r.steps + ' ms=' + r.ms + (r.unset ? ' UNSET' : '') +
    ' | out=' + JSON.stringify(r.out).slice(0, 220) + ' | err=' + JSON.stringify(r.err).slice(0, 150) + ' | st=' + JSON.stringify(r.status).slice(0, 40));
  setG('stopreq', 1); setG('running', 0);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i = 0; i < 10; i++) runtime._step();
  setG('busy', 0); setG('stopreq', 0); setG('error', '');
}
realLog('DONE ' + outPath);
process.exit(0);
