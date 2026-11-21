'use strict';
/**
 * Load a slow program, press RUN, then press RUN again WHILE it is still
 * running. Before the shell fix this bumped a dead `ticket` and did nothing;
 * it should now restart cleanly (no doubled output, no stuck `busy`).
 *   node _work/v6/restart.cjs <sb3> <midRunSteps>
 */
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');

const sb3 = process.argv[2];
const mid = Number(process.argv[3] || 40);
const BTN = { RUN: [80, 150] };
const SLOW = "t = 0\nfor i in range(1, 400):\n    t = t + i\nprint('done')\nprint(t)";

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
  const setList = (n, a) => { const l = sl(n); if (!l) return; l.value.length = 0; for (const x of a) l.value.push(x); };

  let qp = false;
  rt.on('QUESTION', (q) => { if (q === null) return; qp = true; rt.emit('ANSWER', ''); });
  const post = (x, y, d) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, isDown: d, canvasWidth: 480, canvasHeight: 360 });
  // The Controller's mouse loop ends with `wait 0.02`, a REAL-time timer. Stepping
  // in a tight loop advances frames far faster than wall clock, so that wait almost
  // never expires and clicks get dropped. Pace the steps against real time instead.
  const spin = async (n) => {
    for (let i = 0; i < n; i++) {
      rt._step();
      if (qp) { qp = false; await new Promise((r) => setImmediate(r)); }
      await new Promise((r) => setTimeout(r, 4));
    }
  };
  const fastSpin = async (n) => { for (let i = 0; i < n; i++) { rt._step(); if (qp) { qp = false; await new Promise((r) => setImmediate(r)); } } };

  vm.start(); vm.greenFlag(); await spin(30);
  // INIT auto-loads demo 1; wait for that to settle before overwriting Code, or the
  // loader clobbers it and the RUN click arrives while busy is still set.
  for (let i = 0; i < 2000; i++) {
    await spin(1);
    if (String(gv('busy')) === '0' && String(gv('running')) === '0' && (gl('Code') || []).length) break;
  }
  setList('Code', SLOW.split('\n'));
  const spd = sv('speed'); if (spd) spd.value = 0;   // slow mode, so the run lasts
  await spin(4);
  realLog('setup: codeLen=' + (gl('Code') || []).length + ' busy=' + gv('busy') +
    ' running=' + gv('running') + ' speed=' + gv('speed'));

  // click 1, then wait until a run is genuinely in flight (otherwise the second
  // click tests nothing -- it would just be a normal first run)
  post(BTN.RUN[0], BTN.RUN[1], true); await spin(3);
  post(BTN.RUN[0], BTN.RUN[1], false);
  let armed = false;
  for (let i = 0; i < 4000; i++) {
    await spin(1);
    if (String(gv('running')) === '1') { armed = true; break; }
  }
  if (!armed) { realLog('SETUP FAIL: first RUN click never started a run'); return; }
  await spin(mid);
  realLog('mid-run: running=' + gv('running') + ' busy=' + gv('busy') +
    ' out=' + JSON.stringify(gl('Output')) + ' status=' + JSON.stringify(gv('status')));
  if (String(gv('running')) !== '1') { realLog('SETUP FAIL: run ended before 2nd click'); return; }

  // Count RUN-hat starts so we can tell a real restart from a silently ignored
  // click: ignoring leaves the count at 1, restarting bumps it to 2.
  let runStarts = 0;
  const origStartHats = rt.startHats.bind(rt);
  rt.startHats = function (op, fields, target) {
    if (op === 'event_whenbroadcastreceived' && fields && /RUN/.test(String(fields.BROADCAST_OPTION))) runStarts++;
    return origStartHats(op, fields, target);
  };
  const stepsBefore = gv('steps');

  // click 2 while running
  post(BTN.RUN[0], BTN.RUN[1], true); await spin(3);
  post(BTN.RUN[0], BTN.RUN[1], false); await spin(6);
  realLog('after 2nd click: running=' + gv('running') + ' busy=' + gv('busy') +
    ' RUN-hat starts since click=' + runStarts + ' (stepsBefore=' + stepsBefore + ')');

  for (let i = 0; i < 60000; i++) {
    rt._step();
    if (qp) { qp = false; await new Promise((r) => setImmediate(r)); }
    if (i > 8 && String(gv('running')) === '0' && rt.threads.length <= 2) break;
  }
  await fastSpin(20);
  const out = gl('Output') || [];
  realLog('final: running=' + gv('running') + ' busy=' + gv('busy') +
    ' status=' + JSON.stringify(gv('status')));
  realLog('OUT (' + out.length + '): ' + JSON.stringify(out));
  const want = ['done', '79800'];
  realLog(out.join('\n') === want.join('\n')
    ? 'PASS: restarted cleanly, output correct and not doubled'
    : 'FAIL: expected ' + JSON.stringify(want));
})().catch((e) => realLog('ERR', e && e.stack || e));
