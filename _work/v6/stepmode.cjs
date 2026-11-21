'use strict';
/**
 * Click STEP repeatedly (mode=1) and watch Output grow. STEP is the button
 * immediately right of RUN, easy to hit by accident.
 *   node _work/v6/stepmode.cjs <sb3> <demo> <numStepClicks>
 */
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');

const sb3 = process.argv[2] || 'MiniPy_v6.sb3';
const demoNo = Number(process.argv[3] || 1);
const nClicks = Number(process.argv[4] || 20);
const BTN = { RUN: [80, 150], STEP: [140, 150], DEMO: [-115, -134] };

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

  let pend = demoNo === 2 ? ['Scratch', '7'] : demoNo === 6 ? ['5'] : [];
  let qp = false;
  rt.on('QUESTION', (q) => { if (q === null) return; qp = true; rt.emit('ANSWER', pend.length ? pend.shift() : ''); });
  const post = (x, y, d) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, isDown: d, canvasWidth: 480, canvasHeight: 360 });
  const spin = async (n) => { for (let i = 0; i < n; i++) { rt._step(); if (qp) { qp = false; await new Promise((r) => setImmediate(r)); } } };
  const click = async (pt, s = 70) => { post(pt[0], pt[1], true); await spin(3); post(pt[0], pt[1], false); await spin(s); };

  vm.start(); vm.greenFlag(); await spin(30);
  let guard = 0;
  while (Number(gv('demo')) !== (demoNo % 9) + 1 && guard++ < 12) await click(BTN.DEMO);
  realLog('demo ' + demoNo + ' codeLen=' + (gl('Code') || []).length);

  for (let k = 1; k <= nClicks; k++) {
    await click(BTN.STEP, 5);
    for (let i = 0; i < 4000; i++) {
      rt._step();
      if (qp) { qp = false; await new Promise((r) => setImmediate(r)); }
      if (i > 3 && String(gv('running')) === '0') break;
    }
    realLog('STEP ' + String(k).padStart(2) + ': pc=' + String(gv('pc')).padStart(3) +
      ' status=' + JSON.stringify(gv('status')).padEnd(12) + ' out=' + JSON.stringify(gl('Output')));
  }
})().catch((e) => realLog('ERR', e && e.stack || e));
