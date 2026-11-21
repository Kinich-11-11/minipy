
import fs from 'fs';
import { performance } from 'perf_hooks';
import VM from 'file:///D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const vm = new VM();
const t0 = performance.now();
await vm.loadProject(fs.readFileSync(projectPath));
const loadMs = performance.now() - t0;
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find(v => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(n); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const ids = new Map(); const frames = [];
runtime.profiler = { records: [], counters: [], increments: [],
  idByName(n){ if(!ids.has(n)) ids.set(n, ids.size); return ids.get(n); },
  frame(id,name){ const f={id,name,count:0,depth:0,totalTime:0}; frames.push(f); return f; },
  start(){}, stop(){}, reportFrames(){}, increment(){} };
const blocks = () => { let b=0; for(const f of frames) b+=f.count; return b; };

const PROG = process.argv[3].split('|');
const code = sl('Code'); code.value.length = 0; for (const l of PROG) code.value.push(l);
sv('mode').value = 0; sv('ticket').value = 1; sv('stopreq').value = 0; sv('running').value = 1; sv('speed').value = 1;
const b0 = blocks(), w0 = performance.now();
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let steps = 0;
while (Number(gv('running')) !== 0 && steps < 5000) { runtime._step(); steps++; }
const wall = (performance.now()-w0)/1000;
const used = blocks()-b0;
const res = { project: projectPath.split(/[\\/]/).pop(), program: PROG.join(' ; '), loadMs: Math.round(loadMs),
  steps, wall: +wall.toFixed(3), blocks: used, blocksPerSec: Math.round(used/wall),
  blocksPerStep: Math.round(used/steps), out: gl('Output').map(String), status: String(gv('status')), err: String(gv('error')||'') };
console.log(JSON.stringify(res));
process.exit(0);
