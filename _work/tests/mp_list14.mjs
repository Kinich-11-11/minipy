
import fs from 'fs';
import VM from 'scratch-vm';
const project = process.argv[2];
const cases = [
  { name: 'append', code: ['a = [1, 2]', 'a.append(3)', 'print(a)'], expect: '[1, 2, 3]' },
  { name: 'append string', code: ['a = [1]', 'a.append("x")', 'print(a)'], expect: '[1, x]' },
  { name: 'pop returns and shrinks', code: ['a = [1, 2, 3]', 'print(a.pop())', 'print(a)'], expect: '3|[1, 2]' },
  { name: 'extend', code: ['a = [1]', 'a.extend([7, 8])', 'print(a)', 'print(len(a))'], expect: '[1, 7, 8]|3' },
  { name: 'clear', code: ['a = [1, 2]', 'a.clear()', 'print(a)', 'print(len(a))'], expect: '[]|0' },
  { name: 'bare call statement', code: ["len('ab')", 'print(1)'], expect: '1' },
  { name: 'append in print', code: ['a = [1]', 'print(a.append(2))', 'print(a)'], expect: '|[1, 2]' },
  { name: 'loop build', code: ['a = []', 'for i in range(1, 4):', '    a.append(i * i)', 'print(a)', 'print(sum(a))'], expect: '[1, 4, 9]|14' },
  { name: 'pop empty error', code: ['a = []', 'a.pop()'], expect: 'IndexError: pop from empty list', contains: true },
  { name: 'nested refused', code: ['a = [1]', 'a.append([2])'], expect: 'nested lists are not supported', contains: true },
  { name: 'non list method', code: ['b = 1', 'b.append(2)'], expect: 'AttributeError: only lists have methods', contains: true },
  { name: 'unknown method', code: ['a = [1]', 'a.foo(2)'], expect: 'AttributeError: list has no method foo', contains: true },
  { name: 'import still refused', code: ['import os'], expect: 'unsupported statement', contains: true },
  { name: 'class still refused', code: ['class A:'], expect: 'unsupported statement', contains: true },
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
console.log('method tests passed ' + pass + ' / ' + (pass + fail));
process.exit(0);
