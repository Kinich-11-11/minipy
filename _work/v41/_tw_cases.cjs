// _tw_cases.cjs <sb3> <cases.json> [tag] : run cases under the LOCAL TurboWarp VM,
// compare with CPython exactly like run_iso.mjs does. 用于兜底验证 P709。
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');
const ROOT = 'C:/Personal/个人/编程/scratch/ai/minipython';
const VirtualMachine = require(ROOT + '/scratch-vm-develop/scratch-vm-develop/src/index.js');
const sb3 = process.argv[2];
const casesPath = process.argv[3];
const tmpPy = ROOT + '/_work/v41/_tmp_tw.py';
const PY = process.env.PYEXE || 'python';

function cpython(code, inputs) {
  fs.writeFileSync(tmpPy, code + '\n');
  try {
    const out = execFileSync(PY, [tmpPy], { input: (inputs || []).join('\n') + (inputs && inputs.length ? '\n' : ''), encoding: 'utf8', timeout: 20000, env: { ...process.env, PYTHONHASHSEED: '0' } });
    return { ok: true, out: out.replace(/\r/g, '').split('\n').filter((x, i, a) => !(i === a.length - 1 && x === '')) };
  } catch (e) {
    return { ok: false, out: String(e.stdout || '').replace(/\r/g, '').split('\n').filter(Boolean), err: String(e.stderr || e.message).split('\n').filter(Boolean).pop() };
  }
}

(async () => {
  const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
  const vm = new VirtualMachine();
  await vm.loadProject(fs.readFileSync(sb3));
  const runtime = vm.runtime;
  const find = (n) => {
    for (const t of runtime.targets) {
      for (const v of Object.values(t.variables)) if (v.name === n && v.type !== 'list') return v;
    }
  };
  const findL = (n) => {
    for (const t of runtime.targets) {
      for (const v of Object.values(t.variables)) if (v.name === n && v.type === 'list') return v;
    }
  };
  vm.start();
  vm.greenFlag();
  for (let i = 0; i < 30; i++) runtime._step();
  const rows = [];
  for (const c of cases) {
    findL('Code').value = String(c.code).replace(/\r/g, '').split('\n');
    find('mode').value = 0;
    find('ticket').value = (Number(find('ticket').value) || 0) + 1;
    find('stopreq').value = 0;
    find('running').value = 1;
    find('speed').value = 1;
    find('error').value = '';
    findL('Output').value.length = 0;
    const answers = (c.inputs || []).slice();
    runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
    let steps = 0;
    let lastAnswer = null, waitSteps = 0;
    for (let i = 0; i < 12000; i++) {
      const st = String(find('status').value);
      if (answers.length && st === 'Waiting for input') { lastAnswer = answers.shift(); find('stdin').value = lastAnswer; waitSteps = 0; }
      else if (lastAnswer !== null && st === 'Waiting for input') {
        if (++waitSteps > 40) { waitSteps = 0; } // TW 无 ANSWER 事件可补发，靠 stdin 轮询
      }
      runtime._step();
      steps++;
      if (Number(find('running').value) === 0 && steps > 30) break;
    }
    const mini = { out: findL('Output').value.map(String), err: String(find('error').value || ''), status: String(find('status').value) };
    find('stopreq').value = 1;
    find('running').value = 0;
    runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
    for (let i = 0; i < 10; i++) runtime._step();
    find('busy').value = 0;
    find('stopreq').value = 0;
    find('error').value = '';
    const py = cpython(c.code, c.inputs);
    const ADDR = (s) => s.replace(/0x[0-9a-fA-F]+/g, '0xADDR');
    const same = c.expectError ? (mini.out.length === 0 || !!mini.err) : ADDR(mini.out.join('')) === ADDR(py.out.join(''));
    rows.push({ name: c.name, same, mini, py: py.out, pyerr: py.err || null });
  }
  const fails = rows.filter((r) => !r.same);
  console.log('cases=' + rows.length + ' pass=' + (rows.length - fails.length) + ' fail=' + fails.length);
  for (const r of fails.slice(0, 10)) {
    console.log('FAIL ' + r.name);
    console.log('   mini: ' + JSON.stringify(r.mini.out) + (r.mini.err ? ' err=' + JSON.stringify(r.mini.err) : ' status=' + r.mini.status));
    console.log('   cpy : ' + JSON.stringify(r.py) + (r.pyerr ? ' err=' + r.pyerr : ''));
  }
  if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(rows, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
