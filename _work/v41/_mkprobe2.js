const fs = require('fs');
const cases = JSON.parse(fs.readFileSync('_cov8cases.json', 'utf8'));
const body = [
  "def rle(s):",
  "    if not s:",
  "        return ''",
  "    out = ''",
  "    prev = s[0]",
  "    n = 1",
  "    i = 1",
  "    while i < len(s):",
  "        if s[i] == prev:",
  "            n += 1",
  "        else:",
  "            out += prev + str(n)",
  "            prev = s[i]",
  "            n = 1",
  "        i += 1",
  "    return out + prev + str(n)",
];
const vs = [
  { name: 'x1 empty only', code: body.join('\n') + "\nprint(rle(''))" },
  { name: 'x2 long only', code: body.join('\n') + "\nprint(rle('aaabbc'))" },
  { name: 'x3 empty then long', code: body.join('\n') + "\nprint(rle(''))\nprint(rle('aaabbc'))" },
  { name: 'x4 not empty', code: body.join('\n') + "\nprint(not '')" },
  { name: 'x5 long then empty', code: body.join('\n') + "\nprint(rle('aaabbc'))\nprint(rle(''))" },
  { name: 'x6 if not s stmt', code: "print(not '')" },
];
fs.writeFileSync('_bisect.json', JSON.stringify([cases[3], ...vs], null, 1));
console.log('ok');
