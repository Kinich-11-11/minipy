'use strict';
/**
 * Does `draw` finish inside one VM frame, or does the warp budget cut it off
 * after pen_clear (leaving a half-painted screen)?
 *   node _work/v6/tear.cjs <sb3> <demo>
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
  await spin(40);

  // count glyphs painted per VM frame during a single redraw
  let perFrame = [];
  let n = 0;
  const orig = tr.setCostume.bind(tr);
  tr.setCostume = (i) => { n++; return orig(i); };
  const d = sv('dirty'); if (d) d.value = 1;
  realLog('stepTime=' + rt.currentStepTime + 'ms  warp work limit=' + (0.75 * rt.currentStepTime).toFixed(1) + 'ms');
  for (let f = 0; f < 12; f++) {
    n = 0;
    const t0 = process.hrtime.bigint();
    rt._step();
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    perFrame.push({ glyphs: n / 2, ms: ms.toFixed(1), dirty: String(gv('dirty')) });
    if (String(gv('dirty')) === '0' && f > 0) break;
  }
  realLog('glyphs painted per VM frame during ONE redraw:');
  perFrame.forEach((p, i) => realLog('  frame ' + (i + 1) + ': ' + String(p.glyphs).padStart(4) +
    ' glyphs  ' + p.ms.padStart(6) + 'ms  dirty=' + p.dirty));
  const frames = perFrame.filter((p) => p.glyphs > 0).length;
  realLog('');
  if (frames > 1) {
    realLog('=> the redraw is SPLIT across ' + frames + ' frames. pen_clear happens in frame 1,');
    realLog('   so the stage is displayed PARTIALLY PAINTED until the last frame lands.');
  } else {
    realLog('=> redraw completed inside a single frame (no tearing).');
  }
})().catch((e) => realLog('ERR', e && e.stack || e));
