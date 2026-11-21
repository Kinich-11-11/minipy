'use strict';
/**
 * Reproduce the user's TurboWarp result under scratch-vm by making
 * `operator_equals` compare zero-ish strings numerically -- i.e. dropping the
 * `isWhiteSpace -> NaN` guard that stock scratch-vm applies in Cast.compare.
 * If MiniPy's output changes under that one edit, the bug is a VM-semantics
 * dependency in the kernel, not an interpreter logic error.
 *
 *   node _work/v6/tw_sim.cjs <sb3> [--strict]
 *      (default) numeric-collapse mode: '0' == ' ' is TRUE
 *      --strict  leave stock semantics, for an A/B baseline
 */
const fs = require('fs');
const realLog = console.log.bind(console);
for (const k of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[k] = () => {};

const VMPATH = 'D:/users/OneDrive/Desktop/scratch-vm-test/node_modules/scratch-vm';
const Cast = require(VMPATH + '/src/util/cast.js');
const STRICT = process.argv.includes('--strict');

if (!STRICT) {
  // TurboWarp-like: no whitespace exemption, both sides coerce and compare as numbers
  Cast.compare = function (v1, v2) {
    const n1 = Number(v1), n2 = Number(v2);
    if (isNaN(n1) || isNaN(n2)) {
      const s1 = String(v1).toLowerCase(), s2 = String(v2).toLowerCase();
      return s1 < s2 ? -1 : s1 > s2 ? 1 : 0;
    }
    if ((n1 === Infinity && n2 === Infinity) || (n1 === -Infinity && n2 === -Infinity)) return 0;
    return n1 - n2;
  };
}

const VM = require(VMPATH);
const sb3 = process.argv[2] || 'MiniPy_v6.sb3';
const demos = JSON.parse(fs.readFileSync('_work/v6/demo.json', 'utf8'));

(async () => {
  realLog('mode: ' + (STRICT ? 'stock scratch-vm' : 'numeric-collapse (TurboWarp-like)') +
    '   sanity: ' + JSON.stringify("'0'==' '") + ' -> ' + (Cast.compare('0', ' ') === 0));
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

  let pend = [], qp = false;
  rt.on('QUESTION', () => { qp = true; rt.emit('ANSWER', pend.length ? pend.shift() : ''); });
  vm.start(); vm.greenFlag();
  for (let i = 0; i < 10; i++) rt._step();

  for (const c of demos) {
    setList('Code', String(c.code).replace(/\r/g, '').split('\n'));
    setList('Output', []);
    pend = Array.isArray(c.inputs) ? c.inputs.slice() : [];
    for (const n of ['mode', 'stopreq']) { const v = sv(n); if (v) v.value = 0; }
    for (const n of ['ticket', 'running']) { const v = sv(n); if (v) v.value = 1; }
    const spv = sv('speed'); if (spv) spv.value = 1;
    rt.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
    for (let i = 0; i < 12000; i++) {
      rt._step();
      if (qp) { qp = false; await new Promise((r) => setImmediate(r)); }
      if (i > 2 && String(gv('running')) === '0') break;
    }
    realLog('  ' + c.name.padEnd(13) + ' err=' + JSON.stringify(String(gv('error'))).padEnd(4) +
      ' out=' + JSON.stringify(gl('Output')));
  }
})().catch((e) => realLog('ERR', e && e.stack || e));
