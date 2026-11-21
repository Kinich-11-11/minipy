// _probe_steps.mjs <sb3> — 统计通过用例的步数分布（决定挂起检测上限能否安全压低）
import fs from 'fs';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const sb3 = process.argv[2];
const expected = JSON.parse(fs.readFileSync('C:/Personal/个人/编程/scratch/ai/minipython/_work/v41/_curve/expected.json', 'utf8'));
const vm = new VM();
await vm.loadProject(fs.readFileSync(sb3));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find(tg => tg.getName() === 'Interpreter') || stage;
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).concat(vals(interp.variables)).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).concat(vals(interp.variables)).find(v => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(n); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();
const ADDR = (s) => s.replace(/0x[0-9a-fA-F]+/g, '0xADDR');
const cat = (a) => ADDR(a.join(''));
const stepsPass = [];
for (const c of expected) {
  const code = sl('Code'); code.value.length = 0;
  for (const l of String(c.code).replace(/\r/g, '').split('\n')) code.value.push(l);
  setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
  const answers = (c.inputs || []).slice();
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps = 0, lastAnswer = null, waitSteps = 0;
  while (steps < 4000) {
    const st = String(gv('status'));
    if (c.proto === 'iso') {
      if (answers.length && st === 'Waiting for input') { lastAnswer = answers.shift(); setG('stdin', lastAnswer); waitSteps = 0; }
      else if (lastAnswer !== null && st === 'Waiting for input') { if (++waitSteps > 3) { runtime.emit('ANSWER', lastAnswer); waitSteps = 0; } }
    } else if (answers.length && st === 'Waiting for input') runtime.emit('ANSWER', answers.shift());
    runtime._step(); steps++;
    if (Number(gv('running')) === 0 && steps > 3) break;
  }
  const mp = { out: gl('Output').map(String), err: String(gv('error') || '') };
  setG('stopreq', 1); setG('running', 0);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i = 0; i < 8; i++) runtime._step();
  setG('busy', 0); setG('stopreq', 0); setG('error', '');
  const same = c.expectError ? (mp.out.length === 0 || !!mp.err) : cat(mp.out) === cat(c.exp);
  if (same) stepsPass.push(steps);
}
stepsPass.sort((a, b) => b - a);
console.log(sb3.split(/[\\/]/).pop() + '  pass=' + stepsPass.length + '  max=' + stepsPass[0] + '  p99=' + stepsPass[Math.floor(stepsPass.length * 0.01)] + '  top10=' + stepsPass.slice(0, 10).join(','));
process.exit(0);
