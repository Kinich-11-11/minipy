const fs = require('fs');
const cases = JSON.parse(fs.readFileSync('_cov8cases.json', 'utf8'));
const vs = [
  { name: 'z1 fn if ret', code: "def f(x):\n    if x == 1:\n        return 'A'\n    return 'B'\nprint(f(1), f(2))" },
  { name: 'z2 top while ifelse', code: "i = 0\nout = ''\nwhile i < 3:\n    if i == 1:\n        out += 'Y'\n    else:\n        out += 'N'\n    i += 1\nprint(out)" },
  { name: 'z3 fn while ifelse', code: "def g():\n    i = 0\n    out = ''\n    while i < 3:\n        if i == 1:\n            out += 'Y'\n        else:\n            out += 'N'\n        i += 1\n    return out\nprint(g())" },
  { name: 'z4 fn if only', code: "def h(s):\n    out = ''\n    if s:\n        out = 'has'\n    else:\n        out = 'no'\n    return out\nprint(h(''), h('x'))" },
];
fs.writeFileSync('_bisect.json', JSON.stringify([cases[2], cases[3], ...vs], null, 1));
console.log('ok');
