// MiniPy v4.1x headless runner: runs cases against a .sb3 with real scratch-vm 5.0.300
// and compares stdout with CPython ground truth.
//   node _work/v41/run.mjs <sb3> <cases.json> [out.json] [--verbose]
import fs from 'fs';
import { execFileSync } from 'child_process';
import VM from 'file:///D:/users/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const casesPath = process.argv[3];
const outPath = process.argv[4] && !process.argv[4].startsWith('--') ? process.argv[4] : null;
const verbose = process.argv.includes('--verbose');
const PY = process.env.PYEXE || 'C:/Users/69241/AppData/Local/Programs/Python/Python314/python.exe';
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

function cpython(code, inputs) {
  const f = 'D:/编程/scratch/ai/minipython/_work/v41/_tmpB.py';
  fs.writeFileSync(f, code + '\n');
  try {
    const out = execFileSync(PY, [f], { input: (inputs || []).join('\n') + (inputs && inputs.length ? '\n' : ''), encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PYTHONHASHSEED: process.env.PYTHONHASHSEED || '0' } });
    return { ok: true, out: out.replace(/\r/g, '').split('\n').filter((x, i, a) => !(i === a.length - 1 && x === '')) };
  } catch (e) {
    return { ok: false, out: (((e.stdout || '') + '')).replace(/\r/g, '').split('\n').filter((x, i, a) => !(i === a.length - 1 && x === '')), err: String(e.stderr || e.message).split('\n').filter(Boolean).pop() };
  }
}

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
for (const c of cases) {
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
  const mp = { out: gl('Output').map(String), err: String(gv('error') || ''), status: String(gv('status')), ms: Date.now() - t0 };
  setG('stopreq', 1); setG('running', 0);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i = 0; i < 8; i++) runtime._step();
  setG('busy', 0); setG('stopreq', 0); setG('error', '');
  const py = cpython(c.code, c.inputs);
  const want = c.expectError ? null : py.out;
  // the console is a 30x9 grid: compare the concatenated text (rows wrap at 30 chars)
  const cat = (a) => a.join('');
  const same = c.expectError ? (mp.out.length === 0 || !!mp.err) : cat(mp.out) === cat(want);
  rows.push({ name: c.name, tag: c.tag || '', code: c.code, same, mini: mp, py: py.out, pyerr: py.err || null });
}
const fails = rows.filter(r => !r.same);
console.log('cases=' + rows.length + '  pass=' + (rows.length - fails.length) + '  fail=' + fails.length);
const byTag = {};
for (const r of rows) { byTag[r.tag] = byTag[r.tag] || [0, 0]; byTag[r.tag][1]++; if (r.same) byTag[r.tag][0]++; }
console.log('by tag: ' + Object.entries(byTag).map(([k, v]) => k + ' ' + v[0] + '/' + v[1]).join('  '));
for (const r of (verbose ? rows : fails)) {
  if (r.same && !verbose) continue;
  console.log((r.same ? 'PASS ' : 'FAIL ') + '[' + r.tag + '] ' + r.name);
  if (!r.same) {
    console.log('   code: ' + JSON.stringify(r.code));
    console.log('   mini: ' + JSON.stringify(r.mini.out) + (r.mini.err ? ' err=' + JSON.stringify(r.mini.err) : ''));
    console.log('   cpy : ' + JSON.stringify(r.py) + (r.pyerr ? ' err=' + r.pyerr : ''));
  }
}
if (outPath) fs.writeFileSync(outPath, JSON.stringify(rows, null, 1));
process.exit(0);
