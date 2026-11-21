// runall.mjs <sb3> <outdir> <txt...>
// Batch runner: converts each .txt suite to cases in-process, runs all cases on one VM,
// compares with CPython, writes <outdir>/<suite>.out.json
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const outDir = process.argv[3];
const txts = process.argv.slice(4);
const PY = process.env.PYEXE || 'python';

function parseTxt(file) {
  const tag = path.basename(file).replace(/\.[^.]+$/, '');
  const lines = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n');
  const cases = [];
  let cur = null;
  for (const ln of lines) {
    if (ln.startsWith('### ')) {
      if (cur) cases.push(cur);
      let name = ln.slice(4).trim();
      let expectError = false;
      if (name.startsWith('!')) { expectError = true; name = name.slice(1).trim(); }
      cur = { name, tag, code: [], expectError };
    } else if (cur) cur.code.push(ln);
  }
  if (cur) cases.push(cur);
  for (const c of cases) {
    while (c.code.length && c.code[c.code.length - 1] === '') c.code.pop();
    c.code = c.code.join('\n');
    if (!c.expectError) delete c.expectError;
  }
  return cases;
}

const TMPF = 'C:/Personal/个人/编程/scratch/ai/minipython/_work/v41/_tmp_all_' + path.basename(outDir) + '.py';
function cpython(code, inputs) {
  const f = TMPF;
  fs.writeFileSync(f, code + '\n');
  try {
    const out = execFileSync(PY, [f], { input: (inputs || []).join('\n') + (inputs && inputs.length ? '\n' : ''), encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PYTHONHASHSEED: process.env.PYTHONHASHSEED || '0' } });
    return { ok: true, out: out.replace(/\r/g, '').split('\n').filter((x, i, a) => !(i === a.length - 1 && x === '')) };
  } catch (e) {
    return { ok: false, out: (((e.stdout || '') + '')).replace(/\r/g, '').split('\n').filter((x, i, a) => !(i === a.length - 1 && x === '')), err: String(e.stderr || e.message).split('\n').filter(Boolean).pop() };
  }
}

const all = [];
for (const t of txts) { const cs = parseTxt(t); console.error('loaded ' + path.basename(t) + ' cases=' + cs.length); all.push(...cs); }

const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find(v => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const gl = (n) => { const l = sl(n); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();

const rows = [];
let done = 0;
for (const c of all) {
  const code = sl('Code'); code.value.length = 0;
  for (const l of String(c.code).replace(/\r/g, '').split('\n')) code.value.push(l);
  setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
  const answers = (c.inputs || []).slice();
  const t0 = Date.now();
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps = 0;
  while (steps < 4000) {
    if (answers.length && String(gv('status')) === 'Waiting for input') runtime.emit('ANSWER', answers.shift());
    runtime._step(); steps++;
    if (Number(gv('running')) === 0 && steps > 3) break;
    if (Date.now() - t0 > 20000) break;
  }
  // v4.214: CPython 的默认 repr / 生成器 repr 带 0x 内存地址（每次运行都不同），
  // 两侧归一化后逐字节对比——MiniPy 侧的地址格式由 P587 对齐。
  const ADDR = (s) => s.replace(/0x[0-9a-fA-F]+/g, '0xADDR');
  const mp = { out: gl('Output').map(String), err: String(gv('error') || ''), status: String(gv('status')), ms: Date.now() - t0 };
  setG('stopreq', 1); setG('running', 0);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i = 0; i < 8; i++) runtime._step();
  setG('busy', 0); setG('stopreq', 0); setG('error', '');
  const py = cpython(c.code, c.inputs);
  const want = c.expectError ? null : py.out;
  const cat = (a) => ADDR(a.join(''));
  const same = c.expectError ? (mp.out.length === 0 || !!mp.err) : cat(mp.out) === cat(want);
  rows.push({ name: c.name, tag: c.tag, code: c.code, same, mini: mp, py: py.out, pyerr: py.err || null });
  done++;
  if (done % 25 === 0) console.error('  ... ' + done + '/' + all.length);
}

// group by tag and write per-suite files
const byTag = {};
for (const r of rows) { (byTag[r.tag] = byTag[r.tag] || []).push(r); }
fs.mkdirSync(outDir, { recursive: true });
for (const [tag, rs] of Object.entries(byTag)) {
  fs.writeFileSync(path.join(outDir, tag + '.out.json'), JSON.stringify(rs, null, 1));
  const f = rs.filter(r => !r.same).length;
  console.log(tag + '  total=' + rs.length + '  fail=' + f);
}
const fails = rows.filter(r => !r.same);
console.log('TOTAL total=' + rows.length + ' pass=' + (rows.length - fails.length) + ' fail=' + fails.length);
process.exit(0);
