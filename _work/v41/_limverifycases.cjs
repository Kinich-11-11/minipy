// temp: write the limit-verification cases (boundaries of the new numbers)
const fs = require('fs');
const body = (n) => Array.from({ length: n }, (_, i) => (i === 0 ? 'x = 1' : 'x = x + 1')).join('\n') + '\nprint(x)';
const pad = (n, ch) => ch.repeat(n);
// a source line of exactly L characters:  print(len('<L-12 chars>'))  -> 'print(len(' + 1 + '))' overhead
const charLine = (L) => "print(len('" + pad(L - 13, 'a') + "'))";
const cases = [
  { name: 'lines 1000 (fit)', code: body(1000) },
  { name: 'lines 1001 (old 200 cap)', code: body(1001) },
  { name: 'line 2000 chars (fit)', code: charLine(2000) },
  { name: 'line 2001 chars', code: charLine(2001) },
  { name: 'value 16384 (fit)', code: "s = 'a' * 16384\nprint(len(s))" },
  { name: 'value 16385', code: "s = 'a' * 16385\nprint(len(s))" },
  { name: 'recursion 500 (fit)', code: ['def f(n):', '    if n == 0:', '        return 0', '    return f(n - 1)', 'print(f(500))'].join('\n') },
  { name: 'recursion 520 (over)', code: ['def f(n):', '    if n == 0:', '        return 0', '    return f(n - 1)', 'print(f(520))'].join('\n') },
  { name: 'body 25000 steps (old 20k)', code: ['def f():', '    t = 0', '    for i in range(12000):', '        t = t + i', '    return t', 'print(f())'].join('\n') },
  { name: 'console 2100 lines', code: 'for i in range(2100):\n    print(i)' },
  { name: 'steps 60000 fast (old 100k fit)', code: 'i = 0\nwhile i < 60000:\n    i = i + 1\nprint(i)' },
];
fs.writeFileSync('_work/v41/_limverify.json', JSON.stringify(cases, null, 1));
console.log('cases=' + cases.length);
