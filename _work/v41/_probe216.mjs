// probe216.mjs <sb3> <cases.json> [vars] [lists] — run cases, dump vars/lists per case
import fs from 'fs';
import { execFileSync } from 'child_process';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';
const projectPath = process.argv[2], casesPath = process.argv[3];
const wantVars = (process.argv[4]||'').split(',').filter(Boolean);
const wantLists = (process.argv[5]||'').split(',').filter(Boolean);
const cases = JSON.parse(fs.readFileSync(casesPath,'utf8'));
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find(tg => tg.getName() === "Interpreter") || stage;
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).concat(vals(interp.variables)).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).concat(vals(interp.variables)).find(v => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(n); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
for (const c of cases) {
  const code = sl('Code'); code.value.length = 0;
  for (const l of String(c.code).replace(/\r/g,'').split('\n')) code.value.push(l);
  setG('mode',0); setG('ticket',1); setG('stopreq',0); setG('running',1); setG('speed',1); setG('error','');
  const answers = (c.inputs||[]).slice();
  const t0 = Date.now();
  runtime.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'RUN'});
  let steps = 0;
  while (steps < 4000) {
    if (answers.length && String(gv('status'))==='Waiting for input') runtime.emit('ANSWER', answers.shift());
    runtime._step(); steps++;
    if (Number(gv('running'))===0 && steps>3) break;
    if (Date.now()-t0>20000) break;
  }
  console.log('### ' + c.name + '  status=' + gv('status') + ' err=' + gv('error'));
  console.log('out: ' + JSON.stringify(gl('Output')));
  for (const v of wantVars) console.log('  var '+v+' = '+JSON.stringify(gv(v)));
  for (const l of wantLists) console.log('  list '+l+' = '+JSON.stringify(gl(l)).slice(0,400));
  setG('stopreq',1); setG('running',0);
  runtime.startHats('event_whenbroadcastreceived',{BROADCAST_OPTION:'HALT'});
  for (let i=0;i<8;i++) runtime._step();
  setG('busy',0); setG('stopreq',0); setG('error','');
}
