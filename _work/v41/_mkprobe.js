const fs = require('fs');
const cases = JSON.parse(fs.readFileSync('_cov8cases.json', 'utf8'));
const body = [
  "def rle(s):",
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
  { name: 'w1 two calls', code: body.join('\n') + "\nprint(rle('aaabbc'), rle('abc'))" },
  { name: 'w2 two stmts', code: body.join('\n') + "\nprint(rle('aaabbc'))\nprint(rle('abc'))" },
  { name: 'w3 one call var', code: body.join('\n') + "\nr = rle('aaabbc')\nprint(r)" },
  { name: 'w4 two calls var', code: body.join('\n') + "\nr = rle('aaabbc')\nq = rle('abc')\nprint(r, q)" },
  { name: 'w5 call plus str', code: body.join('\n') + "\nprint(rle('aaabbc') + '!')" },
  { name: 'w6 nested call', code: body.join('\n') + "\nprint(len(rle('aaabbc')))" },
  { name: 'w7 three calls', code: body.join('\n') + "\nprint(rle('aaabbc'), rle('abc'), rle('abcd'))" },
  { name: 'w8 global i leak check', code: body.join('\n') + "\nprint(rle('aaabbc'))\nprint(i)" },
];
fs.writeFileSync('_bisect.json', JSON.stringify([cases[3], ...vs], null, 1));
console.log('ok');
