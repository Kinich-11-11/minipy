'use strict';
/**
 * Drive MiniPy through the REAL UI: synthesized mouse clicks on the on-stage
 * buttons, exactly like a user. Nothing is poked into Code/Output directly.
 *   node _work/v6/uiclick.cjs <sb3> <demoNumber 1..9> [answers,comma,sep]
 */
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');

const sb3 = process.argv[2] || 'MiniPy_v6.sb3';
const demoNo = Number(process.argv[3] || 1);
const answers = (process.argv[4] || '').length ? process.argv[4].split(',') : [];

// on-stage button hit points, read off the `click` procedure
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

  let pend = answers.slice(), qp = false, asked = [];
  rt.on('QUESTION', (q) => {
    if (q === null) return;              // ask-box dismissal
    asked.push(q); qp = true;
    rt.emit('ANSWER', pend.length ? pend.shift() : '');
  });

  const post = (x, y, down) => vm.postIOData('mouse', {
    x: x + 240, y: 180 - y, isDown: down, canvasWidth: 480, canvasHeight: 360,
  });

  const spin = async (n) => {
    for (let i = 0; i < n; i++) {
      rt._step();
      if (qp) { qp = false; await new Promise((r) => setImmediate(r)); }
    }
  };
  const click = async (pt, settle = 60) => {
    post(pt[0], pt[1], true); await spin(3);
    post(pt[0], pt[1], false); await spin(settle);
  };

  vm.start(); vm.greenFlag(); await spin(30);
  realLog('boot: demo=' + gv('demo') + ' codeLen=' + (gl('Code') || []).length + ' speed=' + gv('speed'));

  // INIT auto-loads demo 1 and leaves demo=2. Click DEMO until the wanted one is up.
  let guard = 0;
  while (Number(gv('demo')) !== (demoNo % 9) + 1 && guard++ < 12) await click(BTN.DEMO);
  realLog('loaded: status=' + JSON.stringify(gv('status')) + ' codeLen=' + (gl('Code') || []).length);

  // now press RUN and let it finish
  await click(BTN.RUN, 5);
  realLog('after RUN click: running=' + gv('running') + ' ticket=' + gv('ticket') +
    ' mode=' + gv('mode') + ' threads=' + rt.threads.length);
  let steps = 0;
  const t0 = Date.now();
  for (; steps < 20000; steps++) {
    rt._step();
    if (qp) { qp = false; await new Promise((r) => setImmediate(r)); }
    if (steps % 2000 === 0 && steps) {
      realLog('  t+' + steps + ' running=' + gv('running') + ' out=' + (gl('Output') || []).length +
        ' threads=' + rt.threads.length + ' pc=' + gv('pc') + ' ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
    }
    if (steps > 5 && String(gv('running')) === '0' && (gl('Output') || []).length > 0) break;
  }
  realLog('threads still alive: ' + rt.threads.map((t) => {
    const b = t.target.blocks.getBlock(t.topBlock);
    return t.target.getName() + ':' + (b ? b.opcode : '?');
  }).join(', '));
  realLog('ran: steps=' + steps + ' running=' + gv('running') + ' status=' + JSON.stringify(gv('status')) +
    ' err=' + JSON.stringify(gv('error')));
  realLog('asked: ' + JSON.stringify(asked));
  realLog('OUT: ' + JSON.stringify(gl('Output')));
})().catch((e) => realLog('ERR', e && e.stack || e));
