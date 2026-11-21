'use strict';
/**
 * Capture what the OUTPUT PANE actually shows: intercept the TextRenderer
 * `text` procedure and log every string it draws into the output region,
 * after a real UI RUN click.
 *   node _work/v6/screen.cjs <sb3> <demoNumber> [answers]
 */
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');

const sb3 = process.argv[2] || 'MiniPy_v6.sb3';
const demoNo = Number(process.argv[3] || 1);
const answers = (process.argv[4] || '').length ? process.argv[4].split(',') : [];
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

  let pend = answers.slice(), qp = false;
  rt.on('QUESTION', (q) => { if (q === null) return; qp = true; rt.emit('ANSWER', pend.length ? pend.shift() : ''); });

  const post = (x, y, d) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, isDown: d, canvasWidth: 480, canvasHeight: 360 });
  const spin = async (n) => { for (let i = 0; i < n; i++) { rt._step(); if (qp) { qp = false; await new Promise((r) => setImmediate(r)); } } };
  const click = async (pt, s = 60) => { post(pt[0], pt[1], true); await spin(3); post(pt[0], pt[1], false); await spin(s); };

  vm.start(); vm.greenFlag(); await spin(30);
  let guard = 0;
  while (Number(gv('demo')) !== (demoNo % 9) + 1 && guard++ < 12) await click(BTN.DEMO);

  await click(BTN.RUN, 5);
  for (let i = 0; i < 20000; i++) {
    rt._step();
    if (qp) { qp = false; await new Promise((r) => setImmediate(r)); }
    if (i > 5 && String(gv('running')) === '0' && (gl('Output') || []).length > 0) break;
  }
  const outList = gl('Output') || [];

  // Now snapshot the pane: replicate the draw loop's own indexing.
  const outpage = Number(gv('outpage'));
  const pane = [];
  for (let ri = 0; ri < 9; ri++) {
    const idx = outpage + ri;
    pane.push(idx > outList.length ? null : outList[idx - 1]);
  }
  realLog('demo ' + demoNo + '  status=' + JSON.stringify(gv('status')));
  realLog('Output list (' + outList.length + '): ' + JSON.stringify(outList));
  realLog('outpage=' + outpage + '  pane rows=9');
  realLog('--- what the pane shows ---');
  pane.forEach((s, i) => realLog('  row' + (i + 1) + ': ' + (s === null ? '(blank)' : JSON.stringify(s))));
  const lastVisible = outpage + 8;
  if (lastVisible < outList.length) {
    realLog('!! newest line NOT visible: showing up to ' + lastVisible + ' of ' + outList.length);
  } else if (outpage > 1) {
    realLog('ok: newest line visible; ' + (outpage - 1) + ' older line(s) scrolled above (arrow keys to scroll back)');
  }
})().catch((e) => realLog('ERR', e && e.stack || e));
