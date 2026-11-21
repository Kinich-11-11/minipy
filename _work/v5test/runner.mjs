
import fs from 'fs';
import { performance } from 'perf_hooks';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const casesPath = process.argv[3];
const vm = new VM();
const t0 = performance.now();
await vm.loadProject(fs.readFileSync(projectPath));
const loadMs = performance.now() - t0;
const runtime = vm.runtime;
const stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find(v => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(n); if (!l) return []; return Array.isArray(l.value) ? l.value.slice() : [...(l.value||[])]; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };

vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();

// profiler stub to count executed blocks
const ids = new Map(); const frames = [];
runtime.profiler = { records: [], counters: [], increments: [],
  idByName(n){ if(!ids.has(n)) ids.set(n, ids.size); return ids.get(n); },
  frame(id,name){ const f={id,name,count:0,depth:0,totalTime:0}; frames.push(f); return f; },
  start(){}, stop(){}, reportFrames(){}, increment(){} };
const blocks = () => { let b=0; for(const f of frames) b+=f.count; return b; };

const cases = JSON.parse(fs.readFileSync(casesPath,'utf8'));
const results = [];
for (const c of cases) {
  const code = sl('Code'); code.value.length = 0;
  for (const l of c.code.replace(/\r/g,'').split('\n')) code.value.push(l);
  setG('mode',0); setG('ticket',1); setG('stopreq',0); setG('running',1); setG('speed',1);
  const answers = (c.inputs||[]).slice();
  const b0 = blocks(); const w0 = performance.now();
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps=0, answered=0, timedOut=false;
  const MAXSTEPS = c.maxSteps || 3000;
  const WALLCAP = c.wallCap || 60000;
  for (; steps < MAXSTEPS; steps++) {
    if (answers.length && String(gv('status')) === 'Waiting for input') { runtime.emit('ANSWER', answers.shift()); answered++; }
    runtime._step();
    if (Number(gv('running')) === 0 && steps > 5) break;
    if ((performance.now()-w0) > WALLCAP) { timedOut = true; break; }
  }
  if (steps >= MAXSTEPS) timedOut = true;
  const wall = (performance.now()-w0)/1000;
  results.push({ name: c.name, out: gl('Output').map(String), err: String(gv('error')||''), status: String(gv('status')),
                 steps, blocks: blocks()-b0, wall: +wall.toFixed(3), timedOut,
                 vars: (gl('Names')||[]).map((n,i)=>n+'='+gl('Values')[i]), types: gl('Types') });
  // reset for next
  setG('stopreq',1); setG('running',0);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i=0;i<10;i++) runtime._step();
  setG('busy',0); setG('stopreq',0); setG('error','');
}
const summary = { project: projectPath, loadMs: Math.round(loadMs), results };
console.log(JSON.stringify(summary, null, 1));
