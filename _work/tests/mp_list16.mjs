
import fs from 'fs';
import VM from 'scratch-vm';
const project = process.argv[2];
const cases = [
  { name: 'del first', code: ['a = [1, 2, 3]', 'del a[0]', 'print(a)'], expect: '[2, 3]' },
  { name: 'del last', code: ['a = [1, 2, 3]', 'del a[2]', 'print(a)'], expect: '[1, 2]' },
  { name: 'del negative', code: ['a = [1, 2, 3]', 'del a[-1]', 'print(a)'], expect: '[1, 2]' },
  { name: 'del middle', code: ['a = [1, 2, 3, 4]', 'del a[1]', 'print(a)'], expect: '[1, 3, 4]' },
  { name: 'del only element', code: ['a = [7]', 'del a[0]', 'print(a)', 'print(len(a))'], expect: '[]|0' },
  { name: 'del in loop', code: ['a = [1, 2, 3]', 'for i in range(2):', '    del a[0]', 'print(a)'], expect: '[3]' },
  { name: 'del then append', code: ['a = [1, 2]', 'del a[1]', 'a.append(3)', 'print(a)'], expect: '[1, 3]' },
  { name: 'del out of range', code: ['a = [1, 2]', 'del a[5]'], expect: 'IndexError: list index out of range', contains: true },
  { name: 'del not a list', code: ['c = 5', 'del c[0]'], expect: 'TypeError: del needs a list', contains: true },
  { name: 'plain del still works', code: ['x = 1', 'del x', 'print(2)'], expect: '2' },
  { name: 'assignment still works', code: ['a = [1, 2]', 'a[0] = 9', 'print(a)'], expect: '[9, 2]' },
];
let pass = 0, fail = 0;
for (const c of cases) {
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
  const code = sl('Code'); code.value.length = 0;
  for (const l of c.code) code.value.push(l);
  sv('mode').value = 0; sv('ticket').value = 1; sv('stopreq').value = 0; sv('running').value = 1;
  runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' });
  for (let i = 0; i < 400; i++) { runtime._step(); if (Number(gv('running')) === 0 && i > 3) break; }
  const got = gl('Output').join('|');
  const ok = c.contains ? String(gv('error') || '').includes(c.expect) : got === c.expect;
  if (ok) pass++; else { fail++; console.log('FAIL ' + c.name + '\n  want ' + JSON.stringify(c.expect) + '\n  got  ' + JSON.stringify(got) + '\n  err  ' + JSON.stringify(gv('error'))); }
}
console.log('del tests passed ' + pass + ' / ' + (pass + fail));
process.exit(0);
