'use strict';
/**
 * Count pen stamps per draw frame and time the frame. This is the cost the
 * real editor pays every time `dirty` is set.
 *   node _work/v6/stamps.cjs <sb3> <demo>
 */
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');

const sb3 = process.argv[2] || 'MiniPy_v6.sb3';
const demoNo = Number(process.argv[3] || 1);
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

  const tr = rt.targets.find((t) => !t.isStage && t.sprite && t.sprite.name === 'TextRenderer');
  let stamps = 0, switches = 0;
  const origSet = tr.setCostume.bind(tr);
  tr.setCostume = (i) => { switches++; return origSet(i); };
  // pen stamp goes through the pen extension's blocks; count via costume switches/2
  let qp = false;
  rt.on('QUESTION', (q) => { if (q === null) return; qp = true; rt.emit('ANSWER', ''); });
  const post = (x, y, d) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, isDown: d, canvasWidth: 480, canvasHeight: 360 });
  const spin = async (n) => { for (let i = 0; i < n; i++) { rt._step(); if (qp) { qp = false; await new Promise((r) => setImmediate(r)); } } };
  const click = async (pt, s = 70) => { post(pt[0], pt[1], true); await spin(3); post(pt[0], pt[1], false); await spin(s); };

  vm.start(); vm.greenFlag(); await spin(30);
  let guard = 0;
  while (Number(gv('demo')) !== (demoNo % 9) + 1 && guard++ < 12) await click(BTN.DEMO);
  await click(BTN.RUN, 5);
  for (let i = 0; i < 20000; i++) {
    rt._step();
    if (qp) { qp = false; await new Promise((r) => setImmediate(r)); }
    if (i > 5 && String(gv('running')) === '0' && (gl('Output') || []).length) break;
  }
  await spin(30);

  // measure one clean redraw
  switches = 0;
  const d = sv('dirty'); if (d) d.value = 1;
  const t0 = process.hrtime.bigint();
  let frames = 0;
  while (String(gv('dirty')) === '1' && frames < 200) { rt._step(); frames++; }
  rt._step(); frames++;
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  realLog('one full redraw of the editor:');
  realLog('  glyphs stamped : ' + (switches / 2));
  realLog('  costume switches: ' + switches + '  (2 per glyph)');
  realLog('  VM frames taken : ' + frames);
  realLog('  wall time       : ' + ms.toFixed(1) + ' ms  (30fps budget = 33ms/frame)');
  realLog('  => a redraw costs ' + (ms / 33).toFixed(1) + ' frame-budgets, and every keystroke/print sets dirty=1');
})().catch((e) => realLog('ERR', e && e.stack || e));
