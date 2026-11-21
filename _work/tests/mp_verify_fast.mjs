
import fs from 'fs';
import VM from 'scratch-vm';
const cases = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const project = process.argv[2];
let pass = 0, fail = 0;
for (const c of cases) {
  const t0 = Date.now();
  const vm = new VM();
  await vm.loadProject(fs.readFileSync(project));
  const runtime = vm.runtime;
  const stage = runtime.getTargetForStage();
  const all = (t) => Object.values(t.variables || {});
  const sv = (n) => all(stage).find(v => v.name === n && v.type !== 'list');
  const sl = (n) => all(stage).find(v => v.name === n && v.type === 'list');
  const gv = (n) => { const v = sv(n); return v ? v.value : undefined; };
  const gl = (n) => { const l = sl(n); if (!l) return []; return Array.isArray(l.value) ? l.value.slice() : [...l.value]; };
  vm.start(); vm.greenFlag();
  for (let i = 0; i < 20; i++) runtime._step();
  const lines = fs.readFileSync(c.file, 'utf8').replace(/\r/g, '').split('\n');
  const code = sl('Code'); code.value.length = 0;
  for (const l of lines) code.value.push(l);
  sv('mode').value = 0; sv('ticket').value = 1; sv('stopreq').value = 0; sv('running').value = 1;
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  for (let i = 0; i < 120; i++) { runtime._step(); if (Number(gv('running')) === 0 && i > 3) break; }
  const got = gl('Output').join('\n');
  const want = c.expect.join('\n');
  let ok = got === want;
  if (!ok && c.expectError && gl('Output').join('').includes(c.expectError)) ok = true;
  if (ok) pass++; else { fail++; console.log('FAIL ' + c.name + '\n  want ' + JSON.stringify(want) + '\n  got  ' + JSON.stringify(got)); }
  console.log('   ' + c.name + ' took ' + (Date.now() - t0) + ' ms');
  process.exit && null;
}
console.log('passed ' + pass + ' / ' + (pass + fail));
process.exit(0);
