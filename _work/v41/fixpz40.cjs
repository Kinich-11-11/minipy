const fs = require('fs');
const p = '_work/v41/pz40.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "      callProc('fail %s', [VAR('dbg')])";
const to = "      IF(NOT(EQ(VAR('xgs'), txt(''))), [callProc('fail %s', [VAR('dbg')])])";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
