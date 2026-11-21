
import fs from 'fs';
import VM from 'scratch-vm';
const project = process.argv[2];
const cases = [
  { name: 'literal print', code: ['a = [1, 2, 3]', 'print(a)'], expect: '[1, 2, 3]' },
  { name: 'len', code: ['a = [1, 2, 3]', 'print(len(a))'], expect: '3' },
  { name: 'index', code: ['a = [1, 2, 3]', 'print(a[0])', 'print(a[2])', 'print(a[-1])'], expect: '1|3|3' },
  { name: 'sum', code: ['print(sum([1, 2, 3, 4]))'], expect: '10' },
  { name: 'for in list', code: ['a = [10, 20]', 'for x in a:', '    print(x)'], expect: '10|20' },
  { name: 'for in list mixed', code: ['a = [1, "b", 3]', 'for x in a:', '    print(x)'], expect: '1|b|3' },
  { name: 'empty', code: ['a = []', 'print(a)', 'print(len(a))'], expect: '[]|0' },
  { name: 'strings', code: ['a = ["x", "y"]', 'print(a)'], expect: '[x, y]' },
  { name: 'nested print', code: ['a = [3, 1]', 'for x in a:', '    print(x, len(a))'], expect: '3 2|1 2' },
  { name: 'index error', code: ['a = [1, 2]', 'print(a[5])'], expect: 'IndexError', contains: true },
  { name: 'for in string regression', code: ['for c in "abc":', '    print(c)'], expect: 'a|b|c' },
  { name: 'assign copy', code: ['a = [1, 2]', 'b = a', 'print(b)'], expect: '[1, 2]' },
  { name: 'ten elements', code: ['a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]', 'print(len(a))', 'print(a[9])'], expect: '10|10' },
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
  const ok = c.contains ? got.includes(c.expect) : got === c.expect;
  if (ok) pass++; else { fail++; console.log('FAIL ' + c.name + '\n  want ' + JSON.stringify(c.expect) + '\n  got  ' + JSON.stringify(got)); }
}
console.log('list tests passed ' + pass + ' / ' + (pass + fail));
process.exit(0);
