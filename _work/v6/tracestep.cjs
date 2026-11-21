'use strict';
/**
 * Watch Reg[39] (stepgo) and pc across successive STEP clicks.
 *   node _work/v6/tracestep.cjs <sb3> <demo> <clicks> [regSlot]
 */
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');
const sb3 = process.argv[2], demoNo = Number(process.argv[3] || 1), clicks = Number(process.argv[4] || 6);
const SLOT = Number(process.argv[5] || 39);
const BTN = { RUN: [80, 150], STEP: [140, 150], DEMO: [-115, -134] };

(async () => {
  const vm = new VM();
  await vm.loadProject(fs.readFileSync(sb3));
  const rt = vm.runtime;
  const stage = rt.getTargetForStage();
  const I = rt.targets.find((t) => !t.isStage && t.sprite && t.sprite.name === 'Interpreter');
  const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
  const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
  const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
  const gl = (n) => { const l = vals(stage.variables).find((v) => v.name === n && v.type === 'list'); return l ? [...(l.value || [])].map(String) : undefined; };
  const reg = () => { const l = vals(I.variables).find((v) => v.name === 'Reg'); return l ? l.value : null; };

  let qp = false;
  rt.on('QUESTION', (q) => { if (q === null) return; qp = true; rt.emit('ANSWER', ''); });
  const post = (x, y, d) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, isDown: d, canvasWidth: 480, canvasHeight: 360 });
  const spin = async (n) => { for (let i = 0; i < n; i++) { rt._step(); if (qp) { qp = false; await new Promise((r) => setImmediate(r)); } } };
  const click = async (pt, s = 70) => { post(pt[0], pt[1], true); await spin(3); post(pt[0], pt[1], false); await spin(s); };

  vm.start(); vm.greenFlag(); await spin(30);
  let g = 0;
  while (Number(gv('demo')) !== (demoNo % 9) + 1 && g++ < 12) await click(BTN.DEMO);
  realLog('Reg len=' + (reg() ? reg().length : 'n/a'));
  for (let k = 1; k <= clicks; k++) {
    await click(BTN.STEP, 5);
    for (let i = 0; i < 6000; i++) {
      rt._step();
      if (qp) { qp = false; await new Promise((r) => setImmediate(r)); }
      if (i > 3 && String(gv('running')) === '0') break;
    }
    const R = reg();
    realLog('STEP ' + String(k).padStart(2) + ' mode=' + gv('mode') + ' pc=' + String(gv('pc')).padStart(3) +
      ' Reg[' + SLOT + ']=' + (R ? JSON.stringify(R[SLOT - 1]) : '?') +
      ' status=' + JSON.stringify(gv('status')).padEnd(18) + ' out=' + JSON.stringify(gl('Output')));
  }
})().catch((e) => realLog('ERR', e && e.stack || e));
