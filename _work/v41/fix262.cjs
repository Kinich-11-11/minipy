const fs = require('fs');
const p = '_work/v41/p262.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "      IF(EQ(VAR('mpisMap'), num(1)), [";
const to = "      IFELSE(EQ(VAR('mpisMap'), num(1)), [";
if (!s.includes(from)) { console.log('MISS1'); process.exit(1); }
s = s.replace(from, to);
const from2 = "        IF(EQ(VAR('mpkeep'), num(1)), [setV('mpout', enc(VAR('mpout'), VAR('evtype'), VAR('ev')))]),\n        chgV('mpi', num(0)) // 占位（下面统一 +1）\n      ]),";
const to2 = "        IF(EQ(VAR('mpkeep'), num(1)), [setV('mpout', enc(VAR('mpout'), VAR('evtype'), VAR('ev')))])\n      ]),";
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(from2, to2));
console.log('ok');
