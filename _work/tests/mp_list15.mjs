
import fs from 'fs';
import VM from 'scratch-vm';
const project = process.argv[2];
const cases = [
  { name: 'assign first', code: ['a = [1, 2, 3]', 'a[0] = 9', 'print(a)'], expect: '[9, 2, 3]' },
  { name: 'assign last (negative)', code: ['a = [1, 2, 3]', 'a[-1] = 7', 'print(a)'], expect: '[1, 2, 7]' },
  { name: 'assign from own element', code: ['a = [1, 2, 3]', 'a[1] = a[1] + 10', 'print(a)'], expect: '[1, 12, 3]' },
  { name: 'assign middle', code: ['a = [1, 2, 3, 4]', 'a[2] = 0', 'print(a)'], expect: '[1, 2, 0, 4]' },
  { name: 'assign keeps strings', code: ['b = ["x", "y"]', 'b[1] = "z"', 'print(b)', 'print(len(b))'], expect: '[x, z]|2' },
  { name: 'assign in loop', code: ['a = [1, 2, 3]', 'for i in range(3):', '    a[i] = i * i', 'print(a)', 'print(sum(a))'], expect: '[0, 1, 4]|5' },
  { name: 'assign then append', code: ['a = [5]', 'a[0] = 6', 'a.append(7)', 'print(a)'], expect: '[6, 7]' },
  { name: 'out of range', code: ['a = [1, 2]', 'a[5] = 1'], expect: 'IndexError: list assignment index out of range', contains: true },
  { name: 'not a list', code: ['c = 5', 'c[0] = 1'], expect: 'TypeError: index assignment needs a list', contains: true },
  { name: 'nested refused', code: ['a = [1]', 'a[0] = [2]'], expect: 'TypeError: nested lists are not supported', contains: true },
  { name: 'non integer index', code: ['a = [1]', 'a["x"] = 2'], expect: 'TypeError: list index must be an integer', contains: true },
  { name: 'old rules intact', code: ['a = 1', 'b = 2', 'a, b = b, a', 'print(a, b)'], expect: '2 1' },
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
console.log('index assign tests passed ' + pass + ' / ' + (pass + fail));
process.exit(0);
