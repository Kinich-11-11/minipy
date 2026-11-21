const fs = require('fs');
const p = '_work/v41/p244.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    IF(EQ(VAR('tc2c'), num(1)), [";
const to = "    IF(AND(EQ(VAR('tc2c'), num(1)), NOT(EQ(item('Tok', argOf('lo')), txt('lambda')))), [";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
