'use strict';
/**
 * Reproduce a real user session: ONE project load, then walk the demos with
 * the DEMO button and press RUN on each, exactly as a person clicking through.
 *   node _work/v6/seq.cjs <sb3> [firstDemo] [count]
 * Answers for input() demos are supplied automatically.
 */
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');

const sb3 = process.argv[2] || 'MiniPy_v6.sb3';
const first = Number(process.argv[3] || 1);
const count = Number(process.argv[4] || 9);
const BTN = { RUN: [80, 150], DEMO: [-115, -134] };
// demo N (1-based UI label) -> canned input answers
const ANS = { 2: ['Scratch', '7'], 6: ['5'] };
const WANT = {
  1: ['Hello, Scratch', '1', '3', '6', '10', '15', 'All checks passed'],
  2: ['Hello, Scratch', '49'],
  3: ['1', '2', '2', '4', '3', '6', '3', '2', '1', 'Done'],
  4: ['Pn', 'Pyt', '5', 'max=2', 'pow=256'],
  5: ['Mini', 'Py', '2', 'AZ'],
  6: ['sum=15', 'max=15', 'pow=125'],
  7: ['6', 'hello', 'world'],
  8: ['25', 'fedcba', 'bye'],
  9: ['[3, 1, 2]', '3', '3', '2', '6', '6', '2', '4', '[3, 1, 2, 4]'],
};

(async () => {
  const vm = new VM();
  await vm.loadProject(fs.readFileSync(sb3));
  const rt = vm.runtime;
  const stage = rt.getTargetForStage();
  const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
  const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
  const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
  const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
  const gl = (n) => { const l = sl(n); return l ? [...(l.value || [])].map(String) : undefined; };

  let pend = [], qp = false;
  rt.on('QUESTION', (q) => { if (q === null) return; qp = true; rt.emit('ANSWER', pend.length ? pend.shift() : ''); });
  const post = (x, y, d) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, isDown: d, canvasWidth: 480, canvasHeight: 360 });
  const spin = async (n) => { for (let i = 0; i < n; i++) { rt._step(); if (qp) { qp = false; await new Promise((r) => setImmediate(r)); } } };
  const click = async (pt, s = 70) => { post(pt[0], pt[1], true); await spin(3); post(pt[0], pt[1], false); await spin(s); };

  vm.start(); vm.greenFlag(); await spin(30);
  let bad = 0;
  for (let k = 0; k < count; k++) {
    const target = ((first - 1 + k) % 9) + 1;
    let guard = 0;
    while (Number(gv('demo')) !== (target % 9) + 1 && guard++ < 12) await click(BTN.DEMO);
    pend = (ANS[target] || []).slice();
    await click(BTN.RUN, 5);
    let st = 0;
    for (; st < 30000; st++) {
      rt._step();
      if (qp) { qp = false; await new Promise((r) => setImmediate(r)); }
      if (st > 5 && String(gv('running')) === '0' && rt.threads.filter((t) => t.target === rt.targets.find((x) => x.sprite && x.sprite.name === 'Interpreter')).length === 0) break;
    }
    const got = gl('Output') || [];
    const want = WANT[target] || [];
    const ok = got.join('\n') === want.join('\n');
    if (!ok) bad++;
    realLog('Demo ' + target + (ok ? '  OK  ' : '  ** WRONG ** ') + 'status=' + JSON.stringify(gv('status')) +
      ' steps=' + st + ' outpage=' + gv('outpage'));
    if (!ok) {
      realLog('    want: ' + JSON.stringify(want));
      realLog('    got : ' + JSON.stringify(got));
    }
  }
  realLog('');
  realLog(bad === 0 ? 'sequence clean' : bad + ' demo(s) wrong when run back-to-back in one session');
})().catch((e) => realLog('ERR', e && e.stack || e));
