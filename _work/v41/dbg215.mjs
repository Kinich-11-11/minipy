// dbg215.mjs <sb3> <txt...> — serial runner like runall, dumps generator state after each case
import fs from 'fs';
import path from 'path';
import VM from 'file:///C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js';

const projectPath = process.argv[2];
const txts = process.argv.slice(3);
const DUMPV = ['gcur', 'gmy', 'gkeep', 'gnew', 'gyld', 'grez', 'glz', 'ggid', 'gyldpc', 'ghb', 'ghc', 'error', 'pc', 'fi'];
const DUMPL = ['GHFn', 'GHpc', 'GHdead', 'GHStart', 'GHCnt', 'GYield', 'ItSrc'];

function parseTxt(file) {
  const lines = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n');
  const cases = [];
  let cur = null;
  for (const ln of lines) {
    if (ln.startsWith('### ')) {
      if (cur) cases.push(cur);
      let name = ln.slice(4).trim();
      let expectError = false;
      if (name.startsWith('!')) { expectError = true; name = name.slice(1).trim(); }
      cur = { name, tag: path.basename(file).replace(/\.[^.]+$/, ''), code: [], expectError };
    } else if (cur) cur.code.push(ln);
  }
  if (cur) cases.push(cur);
  for (const c of cases) {
    while (c.code.length && c.code[c.code.length - 1] === '') c.code.pop();
    c.code = c.code.join('\n');
  }
  return cases;
}

const all = [];
for (const t of txts) all.push(...parseTxt(t));

const vm = new VM();
await vm.loadProject(fs.readFileSync(projectPath));
const runtime = vm.runtime, stage = runtime.getTargetForStage();
const interp = runtime.targets.find((t) => /Interp/i.test(t.getName ? t.getName() : t.name));
const vals = (m) => (m && typeof m.values === 'function') ? [...m.values()] : Object.values(m || {});
const sv = (n) => vals(stage.variables).find(v => v.name === n && v.type !== 'list');
const sl = (n) => vals(stage.variables).find(v => v.name === n && v.type === 'list');
const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
const setG = (n, val) => { const v = sv(n); if (v) v.value = val; };
const iv = (n) => { const v = vals(interp.variables).find(x => x.name === n && x.type !== 'list'); return v ? v.value : undefined; };
const il = (n) => { const v = vals(interp.variables).find(x => x.name === n && x.type === 'list'); return v ? [...v.value] : undefined; };

vm.start(); vm.greenFlag();
for (let i = 0; i < 30; i++) runtime._step();

let idx = 0;
for (const c of all) {
  const code = sl('Code'); code.value.length = 0;
  for (const l of String(c.code).replace(/\r/g, '').split('\n')) code.value.push(l);
  setG('mode', 0); setG('ticket', 1); setG('stopreq', 0); setG('running', 1); setG('speed', 1); setG('error', '');
  const t0 = Date.now();
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  let steps = 0;
  while (steps < 4000) {
    runtime._step(); steps++;
    if (Number(gv('running')) === 0 && steps > 3) break;
    if (Date.now() - t0 > 20000) break;
  }
  const out = (sl('Output').value.map(String)).join('|');
  console.log(`[${idx}] ${c.name} -> out="${out.slice(0, 120)}" err="${String(gv('error') || '')}" steps=${steps}`);
  const vs = DUMPV.map(n => n + '=' + JSON.stringify(String(iv(n) ?? gv(n) ?? '?'))).join(' ');
  console.log('    ' + vs);
  const ls = DUMPL.map(n => { const v = il(n); return v ? n + '[' + v.length + ']=' + JSON.stringify(v.map(String).slice(0, 8)) : n + '=N/A'; }).join('\n    ');
  console.log('    ' + ls);
  setG('stopreq', 1); setG('running', 0);
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' });
  for (let i = 0; i < 8; i++) runtime._step();
  setG('busy', 0); setG('stopreq', 0); setG('error', '');
  idx++;
}
process.exit(0);
