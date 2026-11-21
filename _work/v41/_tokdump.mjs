// Debug: run one snippet, dump Tok/Kind/count + Output.
//   node _tokdump.mjs <sb3> "code line 1\nline2"
import fs from 'fs';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const code = process.argv[3];
const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const allT = () => [stage, ...runtime.targets].filter(t => t && t.variables);
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => { for (const t of allT()) { const v = vals(t.variables).find(v => v.name === n && v.type !== 'list'); if (v) return v; } };
const sl = (n) => { for (const t of allT()) { const v = vals(t.variables).find(v => v.name === n && v.type === 'list'); if (v) return v; } };
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(n); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
const setG = (n, val) => { for (const t of allT()) { const v = vals(t.variables).find(v => v.name === n && v.type !== 'list'); if (v) { v.value = val; return; } } };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();

const codeL = sl('Code'); codeL.value.length = 0;
for (const l of String(code).replace(/\r/g, '').split('\n')) codeL.value.push(l);
setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
const t0 = Date.now();
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
let steps = 0;
while (steps < 4000) {
  runtime._step(); steps++;
  if (Number(gv('running')) === 0 && steps > 3) break;
  if (Date.now() - t0 > 20000) break;
}
console.log('Output:', JSON.stringify(gl('Output')));
console.log('error:', JSON.stringify(gv('error')));
console.log('count:', gv('count'));
console.log('Tok:', JSON.stringify(gl('Tok')));
console.log('Kind:', JSON.stringify(gl('Kind')));
setG('stopreq', 1); setG('running', 0);
runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
for (let i = 0; i < 8; i++) runtime._step();
process.exit(0);
