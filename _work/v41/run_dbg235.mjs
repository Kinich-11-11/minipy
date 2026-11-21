// run_iso.mjs <sb3> <cases.json> <out.json> [tmpname]
// Same as run.mjs but uses a private CPython scratch file so parallel runs don't collide.
import fs from 'fs';
import { execFileSync } from 'child_process';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const casesPath = process.argv[3];
const outPath = process.argv[4];
const tmp = 'C:/Personal/个人/编程/scratch/ai/minipython/_work/v41/_tmp_' + (process.argv[5] || 'iso') + '.py';
const PY = process.env.PYEXE || 'python';
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

function cpython(code, inputs) {
  fs.writeFileSync(tmp, code + '\n');
  try {
    const out = execFileSync(PY, [tmp], { input: (inputs || []).join('\n') + (inputs && inputs.length ? '\n' : ''), encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PYTHONHASHSEED: process.env.PYTHONHASHSEED || '0' } });
    return { ok: true, out: out.replace(/\r/g, '').split('\n').filter((x, i, a) => !(i === a.length - 1 && x === '')) };
  } catch (e) {
    return { ok: false, out: (((e.stdout || '') + '')).replace(/\r/g, '').split('\n').filter((x, i, a) => !(i === a.length - 1 && x === '')), err: String(e.stderr || e.message).split('\n').filter(Boolean).pop() };
  }
}

const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
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

const rows = [];
for (const c of cases) {
  const code = sl('Code'); code.value.length = 0;
  for (const l of String(c.code).replace(/\r/g, '').split('\n')) code.value.push(l);
  setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
  const answers = (c.inputs || []).slice();
  const t0 = Date.now();
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps = 0;
  // v4.216: sensing 的 ANSWER 监听常驻但 ask 入队前收到的 ANSWER 只设 _answer
  // 不 resolve 队列——首次发射后若仍 Waiting，隔几步补发同值。
  let lastAnswer = null, waitSteps = 0;
  while (steps < 4000) {
    const st = String(gv('status'));
    if (answers.length && st === 'Waiting for input') { lastAnswer = answers.shift(); setG('stdin', lastAnswer); waitSteps = 0; }
    else if (lastAnswer !== null && st === 'Waiting for input') {
      if (++waitSteps > 3) { runtime.emit('ANSWER', lastAnswer); waitSteps = 0; }
    }
    runtime._step(); steps++;
    if (Number(gv('running')) === 0 && steps > 3) break;
    if (Date.now() - t0 > 20000) break;
  }
  if (process.env.STDIN_DBG) console.log('[dbg]', c.name, 'stdin_after=', JSON.stringify(sv('stdin') ? sv('stdin').value : '?'));
  const mp = { out: gl('Output').map(String), err: String(gv('error') || ''), status: String(gv('status')), ms: Date.now() - t0, dbg: gl('Dbg').map(String) };
  setG('stopreq', 1); setG('running', 0);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i = 0; i < 8; i++) runtime._step();
  setG('busy', 0); setG('stopreq', 0); setG('error', '');
  const py = cpython(c.code, c.inputs);
  const want = c.expectError ? null : py.out;
  // v4.214: 地址归一化（与 runall.mjs 同步）——CPython 默认 repr / 生成器 repr 的
  // 0x 地址每次运行都不同，两侧归一化后逐字节对比（MiniPy 侧格式由 P587 对齐）。
  const ADDR = (s) => s.replace(/0x[0-9a-fA-F]+/g, '0xADDR');
  const cat = (a) => ADDR(a.join(''));
  const same = c.expectError ? (mp.out.length === 0 || !!mp.err) : cat(mp.out) === cat(want);
  rows.push({ name: c.name, tag: c.tag || '', code: c.code, same, mini: mp, py: py.out, pyerr: py.err || null });
}
const fails = rows.filter(r => !r.same);
console.log('cases=' + rows.length + '  pass=' + (rows.length - fails.length) + '  fail=' + fails.length);
if (outPath) fs.writeFileSync(outPath, JSON.stringify(rows, null, 1));
process.exit(0);
