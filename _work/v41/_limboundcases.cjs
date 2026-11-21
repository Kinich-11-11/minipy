// temp: exact-boundary cases for the raised limits
const fs = require('fs');
// exactly n lines: n-1 assignments + the final print
const body = (n) => Array.from({ length: n - 1 }, (_, i) => (i === 0 ? 'x = 1' : 'x = x + 1')).join('\n') + '\nprint(x)';
// exactly L characters: "print(len('" (11) + content + "'))" (3)  -> content = L - 14
const charLine = (L) => "print(len('" + 'a'.repeat(L - 14) + "'))";
const cases = [
  { name: 'lines 1000 exactly (fit)', code: body(1000) },
  { name: 'lines 1001 (over)', code: body(1001) },
  { name: 'line 2000 exactly (fit)', code: charLine(2000) },
  { name: 'line 2001 (over)', code: charLine(2001) },
  { name: 'func body 25000 (old 20k)', code: ['def f():', '    t = 0', '    for i in range(25000):', '        t = t + i', '    return t', 'print(f())'].join('\n') },
];
for (const c of cases) {
  const ls = c.code.split('\n');
  console.log('  [' + c.name + '] lines=' + ls.length + ' maxLineLen=' + Math.max(...ls.map((l) => l.length)));
}
fs.writeFileSync('_work/v41/_limbound.json', JSON.stringify(cases, null, 1));
