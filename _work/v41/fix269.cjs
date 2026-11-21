const fs = require('fs');
const p = '_work/v41/p269.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf('  const strip = REPEATU('), s.indexOf('  // SUBSTR 不是 DSL 助手'));
if (!from) { console.log('MISS'); process.exit(1); }
s = s.replace(from, '');
fs.writeFileSync(p, s);
console.log('ok');
