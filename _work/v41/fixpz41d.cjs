const fs = require('fs');
const p = '_work/v41/pz41.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    callProc('fail %s', [VAR('dbg')])\n  ]);\n";
const to = "    IF(EQ(VAR('aui'), num(2)), [callProc('fail %s', [VAR('dbg')])])\n  ]);\n";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
