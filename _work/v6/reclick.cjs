'use strict';
/**
 * Press RUN a second time while the first run is still going (or press RUN on a
 * demo, then immediately DEMO+RUN) and see whether Output ends up interleaved.
 *   node _work/v6/reclick.cjs <sb3> <demo> <delaySteps>
 */
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');

const sb3 = process.argv[2] || 'MiniPy_v6.sb3';
const demoNo = Number(process.argv[3] || 1);
const delay = Number(process.argv[4] || 1);
const BTN = { RUN: [80, 150], DEMO: [-115, -134] };

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

  let qp = false;
  rt.on('QUESTION', (q) => { if (q === null) return; qp = true; rt.emit('ANSWER', ''); });
  const post = (x, y, d) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, isDown: d, canvasWidth: 480, canvasHeight: 360 });
  const spin = async (n) => { for (let i = 0; i < n; i++) { rt._step(); if (qp) { qp = false; await new Promise((r) => setImmediate(r)); } } };
  const clickDown = async (pt) => { post(pt[0], pt[1], true); await spin(2); };
  const clickUp = async (pt, s = 2) => { post(pt[0], pt[1], false); await spin(s); };

  vm.start(); vm.greenFlag(); await spin(30);
  let guard = 0;
  while (Number(gv('demo')) !== (demoNo % 9) + 1 && guard++ < 12) { await clickDown(BTN.DEMO); await clickUp(BTN.DEMO, 70); }
  realLog('demo ' + demoNo + ' loaded, codeLen=' + (gl('Code') || []).length);

  // first RUN
  await clickDown(BTN.RUN); await clickUp(BTN.RUN, delay);
  realLog('after 1st RUN +' + delay + ' steps: running=' + gv('running') + ' out=' + (gl('Output') || []).length +
    ' ticket=' + gv('ticket'));
  // second RUN while the first may still be live
  await clickDown(BTN.RUN); await clickUp(BTN.RUN, 2);
  realLog('after 2nd RUN: running=' + gv('running') + ' ticket=' + gv('ticket'));

  for (let i = 0; i < 30000; i++) {
    rt._step();
    if (qp) { qp = false; await new Promise((r) => setImmediate(r)); }
    if (i > 5 && String(gv('running')) === '0') break;
  }
  await spin(20);
  realLog('final status=' + JSON.stringify(gv('status')) + ' ticket=' + gv('ticket'));
  realLog('OUT (' + (gl('Output') || []).length + '): ' + JSON.stringify(gl('Output')));
})().catch((e) => realLog('ERR', e && e.stack || e));
