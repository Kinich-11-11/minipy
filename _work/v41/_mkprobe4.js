const fs = require('fs');
const cases = JSON.parse(fs.readFileSync('_cov8cases.json', 'utf8'));
const bodyP = [
  "def rle(s):",
  "    if not s:",
  "        return ''",
  "    out = ''",
  "    prev = s[0]",
  "    n = 1",
  "    i = 1",
  "    while i < len(s):",
  "        print('cmp', i, s[i], prev, s[i] == prev)",
  "        if s[i] == prev:",
  "            n += 1",
  "        else:",
  "            out += prev + str(n)",
  "            prev = s[i]",
  "            n = 1",
  "        i += 1",
  "    return out + prev + str(n)",
];
const bodyU = bodyP.filter(l => !l.includes("print('cmp'"));
const vs = [
  { name: 'y1 printed', code: bodyP.join('\n') + "\nprint(rle('aab'))" },
  { name: 'y2 unprinted', code: bodyU.join('\n') + "\nprint(rle('aab'))" },
];
fs.writeFileSync('_bisect.json', JSON.stringify([cases[2], cases[3], ...vs], null, 1));
console.log('ok');
