'use strict';
/**
 * Ask the TextRenderer to draw a known string and report which costume it
 * actually selects per character. Catches glyph mismapping independent of
 * the interpreter.
 *   node _work/v6/glyph.cjs <sb3> "<string to draw>"
 */
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[k] = () => {};
const VM = require('D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm');
const sb3 = process.argv[2] || 'MiniPy_v6.sb3';
const sample = process.argv[3] !== undefined ? process.argv[3] : 'Pn 5 14 Done';

(async () => {
  const vm = new VM();
  await vm.loadProject(fs.readFileSync(sb3));
  const rt = vm.runtime;
  const tr = rt.targets.find((t) => !t.isStage && t.sprite && t.sprite.name === 'TextRenderer');
  const stage = rt.getTargetForStage();
  const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
  const sl = (n) => vals(stage.variables).find((v) => v.name === n && v.type === 'list');
  const setList = (n, a) => { const l = sl(n); if (!l) return; l.value.length = 0; for (const x of a) l.value.push(x); };

  vm.start(); vm.greenFlag();
  for (let i = 0; i < 20; i++) rt._step();

  // record every stamp: costume active at stamp time
  const stamped = [];
  const origStamp = tr.runtime.ext_pen && null;
  const penBlocks = Object.values(rt._blockInfo || {});
  // hook the target's setCostume to observe selection order
  const seen = [];
  const orig = tr.setCostume.bind(tr);
  tr.setCostume = (i) => { seen.push(i); return orig(i); };

  // drive `text` directly through the procedure by pushing output and letting draw run
  const sv = (n) => vals(stage.variables).find((v) => v.name === n && v.type !== 'list');
  setList('Output', [sample]);
  setList('Code', ['']);
  for (const [n, val] of [['outpage', 1], ['running', 0], ['busy', 0], ['selected', 1], ['page', 1]]) {
    const v = sv(n); if (v) v.value = val;
  }
  const before = seen.length;
  const d = sv('dirty'); if (d) d.value = 1;
  for (let i = 0; i < 40 && seen.length === before; i++) rt._step();
  for (let i = 0; i < 6; i++) rt._step();

  const names = tr.sprite.costumes.map((c) => c.name);
  realLog('sample: ' + JSON.stringify(sample));
  // pairs: [32-workaround, actual char]; report every 2nd selection
  const picks = seen.slice(before).filter((_, i) => i % 2 === 1);
  realLog('costume picks (0-based): ' + JSON.stringify(seen.slice(before)));
  realLog('rendered: ' + JSON.stringify(picks.map((i) => names[i] !== undefined ? names[i] : '?<' + i + '>').join('')));
  realLog('expected: ' + JSON.stringify(sample));
})().catch((e) => realLog('ERR', e && e.stack || e));
