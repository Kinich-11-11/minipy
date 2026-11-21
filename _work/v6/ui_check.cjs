'use strict';
// Drives MiniPy through its own UI (mouse only): clicks EXAMPLE, then RUN, and reports
// Code / Output / status exactly like a user would see.
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log','warn','error','info','debug','trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const vm = new VM();
  await vm.loadProject(fs.readFileSync(process.argv[2]));
  const runtime = vm.runtime;
  const stage = runtime.getTargetForStage();
  const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
  const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
  const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
  const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
  const gl = (n) => { const l = sl(n); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
  const step = (n) => { for (let i = 0; i < n; i++) runtime._step(); };
  const mouseTo = (x, y, down) => vm.postIOData('mouse', { x: x + 240, y: 180 - y, canvasWidth: 480, canvasHeight: 360, isDown: !!down });
  async function click(x, y) {
    mouseTo(x, y, false); await sleep(40); step(3);
    mouseTo(x, y, true); await sleep(40); step(5);
    mouseTo(x, y, false); await sleep(40); step(6);
  }
  vm.start(); vm.greenFlag(); step(25);
  const demoClicks = Number(process.argv[3] || 0);
  realLog('CODE at start: ' + JSON.stringify(gl('Code')));
  for (let i = 0; i < demoClicks; i++) { await click(-113, -134); step(5); }
  if (demoClicks) realLog('CODE after ' + demoClicks + ' DEMO click(s): ' + JSON.stringify(gl('Code')));
  await click(80, 150);   // RUN button (hit test: 51 < ux < 116 and uy > 126)
  for (let i = 0; i < 4000; i++) {
    runtime._step();
    if (i > 4 && String(gv('running')) === '0') break;
  }
  realLog('OUTPUT: ' + JSON.stringify(gl('Output')));
  realLog('status=' + JSON.stringify(gv('status')) + ' error=' + JSON.stringify(gv('error')) + ' demo=' + gv('demo'));
  process.exit(0);
})();