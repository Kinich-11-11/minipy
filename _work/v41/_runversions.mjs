// _runversions.mjs [--force] [--jobs N] [--maxsteps N] [--outdir DIR] [--reuse-old] <sb3...>
// --reuse-old：旧结果（_curve/results，931 例口径）里 _new*/_cov* 与现行套件同文件同用例，
// 直接复用其失败清单；只补跑新增用例（_cov8_trunc + _reg232 全部 tag，617 例）。
// 旧 gap131 结果弃用（reg232 内含维护版 _gap131.v222.json 变体）。
// 逐版本跑全套件（MiniPy 侧），与 _curve/expected.json 对比，结果存 _curve/results/<ver>.json。
// 可断点续跑：已有结果文件的版本自动跳过（--force 重跑）。
import fs from 'fs';
import path from 'path';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const HERE = 'C:/Personal/个人/编程/scratch/ai/minipython/_work/v41';
let jobs = 3, outDir = path.join(HERE, '_curve/results'), force = false, maxSteps = 4000;
let shardK = 0, shardN = 1, reuseOld = false;
const sb3s = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--jobs') jobs = Number(argv[++i]);
  else if (argv[i] === '--outdir') outDir = argv[++i];
  else if (argv[i] === '--force') force = true;
  else if (argv[i] === '--maxsteps') maxSteps = Number(argv[++i]);
  else if (argv[i] === '--shard') { shardK = Number(argv[++i]); shardN = Number(argv[++i]); }
  else if (argv[i] === '--reuse-old') reuseOld = true;
  else sb3s.push(argv[i]);
}
// 旧 931 口径的 tag 集合（12 _new + 21 _cov + gap131）；不在集合内 = 补跑用例
const OLD_TAGS = new Set(['_new1_alias','_new1add','_new2_algo','_new3_str','_new4_oop','_new5_func',
  '_new6_edge','_new7_probe','_new7add','_new8_probe2','_new9_probe3','_new10_probe4',
  '_cov1','_cov2','_cov3','_cov4','_cov5','_cov6','_cov7','_cov8','_cov9','_cov10',
  '_cov205a','_cov205b','_cov205c','_cov205d','_cov205e','_covC','_covD','_covX','_covY','_covZ','_covheap','gap131']);
if (shardN > 1) {
  const all = sb3s.slice();
  sb3s.length = 0;
  for (let i = shardK; i < all.length; i += shardN) sb3s.push(all[i]);
}
// 实测通过用例最大步数 226（v4.219）/ 74（v4.12），maxSteps 压到 1000 仍有 4 倍余量，
// 挂死用例（老版本大多数失败用例）的判定耗时按比例缩短。
// 自适应：跑批顺手记录每个版本"通过用例"的实际步数，每完成一版就把上限调成
// 1.8 × 历史最大合法步数（棘轮式只升不降，钳位 400–4000），无需专门探测轮。
let cap = maxSteps;
let globalMaxPassSteps = 0;
function adjustCap(verMax) {
  if (verMax > globalMaxPassSteps) globalMaxPassSteps = verMax;
  const nc = Math.min(4000, Math.max(400, Math.round(globalMaxPassSteps * 1.8)));
  if (nc !== cap) { console.log('[cap] global-max-pass-steps=' + globalMaxPassSteps + ' cap ' + cap + ' -> ' + nc); cap = nc; }
}
console.error('jobs=' + jobs + ' maxSteps=' + maxSteps + ' (自适应: 每版后调为 1.8×历史最大合法步数, 棘轮, 钳位400-4000)');
fs.mkdirSync(outDir, { recursive: true });
const expected = JSON.parse(fs.readFileSync(path.join(HERE, '_curve/expected.json'), 'utf8'));

const verLabel = (p) => path.basename(p, '.sb3').replace(/^MiniPy_/, '');

async function runOne(sb3) {
  const ver = verLabel(sb3);
  const outFile = path.join(outDir, ver + '.json');
  if (!force && fs.existsSync(outFile)) return 'skip ' + ver;
  // --reuse-old：有旧 931 口径结果则只补跑新增用例
  let oldRes = null;
  if (reuseOld) {
    const of = path.join(HERE, '_curve/results', ver + '.json');
    if (fs.existsSync(of)) {
      try { oldRes = JSON.parse(fs.readFileSync(of, 'utf8')); } catch (_) { oldRes = null; }
    }
  }
  const cases = oldRes ? expected.filter(c => !OLD_TAGS.has(c.tag)) : expected;
  const t0 = Date.now();
  let maxPassSteps = 0;
  const vm = new VM();
  let rows = [], supported = true, err = null;
  try {
    await vm.loadProject(fs.readFileSync(sb3));
    const runtime = vm.runtime, stage = runtime.getTargetForStage();
    const interp = runtime.targets.find(tg => tg.getName() === 'Interpreter') || stage;
    const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
    const sv = (n) => vals(stage.variables).concat(vals(interp.variables)).find(v => v.name === n && v.type !== 'list');
    const sl = (n) => vals(stage.variables).concat(vals(interp.variables)).find(v => v.name === n && v.type === 'list');
    const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
    const gl = (n) => { const l = sl(n); return l ? (Array.isArray(l.value) ? l.value.slice() : [...l.value]) : []; };
    const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
    vm.start(); vm.greenFlag();
    for (let i = 0; i < 30; i++) runtime._step();
    // 协议检测：无 Code/Output 列表或 running 变量 → 该版本不支持套件协议
    if (!sl('Code') || !sl('Output') || sv('running') === undefined) {
      supported = false;
    } else {
      const ADDR = (s) => s.replace(/0x[0-9a-fA-F]+/g, '0xADDR');
      const cat = (a) => ADDR(a.join(''));
      for (const c of cases) {
        const code = sl('Code'); code.value.length = 0;
        for (const l of String(c.code).replace(/\r/g, '').split('\n')) code.value.push(l);
        setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
        const answers = (c.inputs || []).slice();
        const ct0 = Date.now();
        runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
        let steps = 0, lastAnswer = null, waitSteps = 0;
        while (steps < cap) {
          const st = String(gv('status'));
          if (c.proto === 'iso') {
            if (answers.length && st === 'Waiting for input') { lastAnswer = answers.shift(); setG('stdin', lastAnswer); waitSteps = 0; }
            else if (lastAnswer !== null && st === 'Waiting for input') {
              if (++waitSteps > 3) { runtime.emit('ANSWER', lastAnswer); waitSteps = 0; }
            }
          } else if (answers.length && st === 'Waiting for input') runtime.emit('ANSWER', answers.shift());
          runtime._step(); steps++;
          if (Number(gv('running')) === 0 && steps > 3) break;
          if (Date.now() - ct0 > 20000) break;
        }
        const mp = { out: gl('Output').map(String), err: String(gv('error') || '') };
        setG('stopreq', 1); setG('running', 0);
        runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
        for (let i = 0; i < 8; i++) runtime._step();
        setG('busy', 0); setG('stopreq', 0); setG('error', '');
        const same = c.expectError ? (mp.out.length === 0 || !!mp.err) : cat(mp.out) === cat(c.exp);
        if (same && steps > maxPassSteps) maxPassSteps = steps;
        if (!same) rows.push(c.tag + '/' + c.name);
      }
    }
  } catch (e) {
    err = String(e && e.message || e).slice(0, 300);
    supported = false;
  }
  try { vm.dispose(); } catch (_) {}
  // 合并：旧结果失败清单（去掉被 v222 变体取代的 gap131）+ 本次补跑失败
  const oldFails = oldRes ? (oldRes.fails || []).filter(f => !f.startsWith('gap131/')) : [];
  const fails = oldFails.concat(rows);
  const res = {
    ver, sb3: path.basename(sb3), supported,
    total: supported ? expected.length : 0,
    pass: supported ? expected.length - fails.length : 0,
    fails, ms: Date.now() - t0,
    capUsed: cap, maxPassSteps,
    reusedOld: !!oldRes, deltaCases: oldRes ? cases.length : expected.length,
  };
  if (err) res.err = err;
  fs.writeFileSync(outFile, JSON.stringify(res));
  adjustCap(maxPassSteps);
  return (supported
    ? ver + '  pass=' + res.pass + '/' + res.total + '  fail=' + fails.length + '  ' + Math.round(res.ms / 1000) + 's' +
      (oldRes ? '  [复用931+补跑' + cases.length + ']' : '')
    : ver + '  不支持套件协议' + (err ? ' (' + err + ')' : '')) + (force ? '  [force]' : '');
}

// 简单 worker 池
let idx = 0;
async function worker(wid) {
  while (true) {
    const i = idx++;
    if (i >= sb3s.length) return;
    const line = await runOne(sb3s[i]);
    console.log('[w' + wid + '] ' + line);
  }
}
await Promise.all(Array.from({ length: jobs }, (_, w) => worker(w)));
console.log('ALL DONE ' + sb3s.length + ' versions (shard ' + shardK + '/' + shardN + ')');
process.exit(0); // scratch-vm 的定时器会挂住进程，显式退出
