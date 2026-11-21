'use strict';
/**
 * MiniPy v5 battery runner.
 *   node run5.cjs <sb3> <cases.json> [--truth truth.json] [--max N] [--json out.json]
 */
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[k] = () => {};
// MINIPY_VM lets the same battery run against another vm build (e.g. TurboWarp's scratch-vm)
const VM = require(process.env.MINIPY_VM || 'D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');

const argv = process.argv.slice(2);
const projectPath = argv[0];
const casesPath = argv[1];
const getOpt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const truthPath = getOpt('--truth', casesPath.replace(/cases[^/\\]*\.json$/, 'truth.json'));
const MAXSTEPS = Number(getOpt('--max', 200000));
const outPath = getOpt('--json', null);

const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

(async () => {
  const vm = new VM();
  // TurboWarp compiles scripts to JS by default; MINIPY_NOCOMPILE=1 forces its interpreter
  if (process.env.MINIPY_NOCOMPILE && typeof vm.setCompilerOptions === 'function') {
    vm.setCompilerOptions({ enabled: false });
  }
  await vm.loadProject(fs.readFileSync(projectPath));
  const runtime = vm.runtime;
  let stage = runtime.getTargetForStage();
  const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
  const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
  const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
  const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
  const gl = (n) => { const l = sl(n); if (!l) return undefined; return Array.isArray(l.value) ? l.value.slice() : [...(l.value || [])]; };
  const setList = (n, arr) => { const l = sl(n); if (!l) return false; l.value.length = 0; for (const x of arr) l.value.push(x); return true; };

  // input() uses Scratch's ask box: answer every QUESTION with the next canned value
  let pendingAnswers = [];
  let questionPending = false;
  // run5's step loop is synchronous, so the answer must be emitted inline (the sensing
  // extension stores its resolver before emitting QUESTION)
  runtime.on('QUESTION', () => {
    questionPending = true;
    runtime.emit('ANSWER', pendingAnswers.length ? pendingAnswers.shift() : '');
  });

  vm.start();
  vm.greenFlag();
  for (let i = 0; i < 10; i++) runtime._step();

  const results = [];
  let totalSteps = 0, totalMs = 0;
  const FRESH = argv.includes('--fresh');
  for (const c of cases) {
    if (FRESH) {
      vm.stop();
      await vm.loadProject(fs.readFileSync(projectPath));
      stage = runtime.getTargetForStage();
      vm.start(); vm.greenFlag();
      for (let i = 0; i < 6; i++) runtime._step();
    }
    const lines = String(c.code).replace(/\r/g, '').split('\n');
    pendingAnswers = Array.isArray(c.inputs) ? c.inputs.slice() : [];
    let out = [], err = '', steps = 0, ms = 0, status = '';
    try {
      setList('Code', lines);
      setList('Output', []);
      setList('Names', []); setList('Values', []); setList('Types', []);
      for (const n of ['mode', 'ticket', 'stopreq', 'running']) { const v = sv(n); if (v) v.value = 0; }
      const tk = sv('ticket'); if (tk) tk.value = 1;
      const rn = sv('running'); if (rn) rn.value = 1;
      const sp = sv('speed'); if (sp) sp.value = 1;
      const t0 = Date.now();
      runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
      let stable = 0, lastLen = -1;
      for (; steps < MAXSTEPS; steps++) {
        runtime._step();
        // an ask/answer resolves a promise: the sequencer resumes the thread in a microtask,
        // which a purely synchronous step loop would never run
        if (questionPending) { questionPending = false; await new Promise((r) => setImmediate(r)); }
        const L = (gl('Output') || []).length;
        if (steps > 2 && String(gv('running')) === '0') break;
        if (L === lastLen) { stable++; if (stable > 500) break; } else { stable = 0; lastLen = L; }
      }
      ms = Date.now() - t0;
      out = (gl('Output') || []).map((x) => String(x));
      err = String(gv('error'));
      status = String(gv('status'));
    } catch (e) {
      err = 'HARNESS: ' + e.message;
    }
    totalSteps += steps; totalMs += ms;
    results.push({ name: c.name, out, status, err, steps, ms });
  }
  if (outPath) fs.writeFileSync(outPath, JSON.stringify({ project: projectPath, results }, null, 1));

  const norm = (a) => { const b = (a || []).map(String); while (b.length && b[b.length - 1] === '') b.pop(); return b; };
  let pass = 0, fail = 0;
  const fails = [];
  if (fs.existsSync(truthPath)) {
    const truth = JSON.parse(fs.readFileSync(truthPath, 'utf8'));
    for (const r of results) {
      const t = truth[r.name];
      if (!t) continue;
      const want = norm(t.out), got = norm(r.out);
      let ok = got.join('\n') === want.join('\n');
      if (!ok && got.join('').replace(/\s+/g, '') === want.join('').replace(/\s+/g, '')) ok = true;
      if (!ok && t.err && r.err.indexOf(t.err.split(':')[0]) >= 0) ok = true;
      if (ok) pass++; else { fail++; fails.push({ name: r.name, want, got, err: r.err }); }
    }
  }
  realLog('PASS ' + pass + '  FAIL ' + fail + '   steps=' + totalSteps + '  time=' + (totalMs / 1000).toFixed(1) + 's');
  for (const f of fails.slice(0, Number(getOpt('--show', 40)))) {
    realLog('  x ' + f.name.padEnd(17) + ' want=' + JSON.stringify(f.want).slice(0, 60) +
      ' got=' + JSON.stringify(f.got).slice(0, 60) + (f.err && f.err !== '0' && f.err !== '' ? (' ERR=' + f.err.slice(0, 50)) : ''));
  }
  process.exit(0);
})().catch((e) => { realLog('RUNNER ERROR', e && e.stack || e); process.exit(1); });