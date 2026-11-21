const fs = require('fs');
let s = fs.readFileSync('_work/v41/p345.txt', 'utf8');
const from = "  for (const n of ['p345fn']) if (taken.has(n)) throw new Error('[P345] var taken: ' + n);\n  newVar('p345fn', '');";
const to = [
  "  for (const n of ['p345fn', 'p344close', 'p344d', 'p344i', 'p344b', 'p344ok']) {",
  "    if (taken.has(n)) throw new Error('[P345] var taken: ' + n);",
  "  }",
  "  newVar('p345fn', '');",
  "  newVar('p344close', 0); newVar('p344d', 0); newVar('p344i', 0); newVar('p344b', ''); newVar('p344ok', 0);"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p345.txt', s.replace(from, to));
console.log('declared all vars');