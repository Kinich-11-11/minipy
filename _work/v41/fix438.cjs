const fs = require('fs');
let s = fs.readFileSync('_work/v41/p438.txt', 'utf8');
const from = "        setV('cmp', IFELSE(EQ(VAR('ev'), num(1)), [num(-1)], [num(1)])),";
const to = "        setV('cmp', num(1)),\n        IF(EQ(VAR('ev'), num(1)), [setV('cmp', num(-1))]),";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p438.txt', s.replace(from, to));
console.log('cmp assignment fixed');